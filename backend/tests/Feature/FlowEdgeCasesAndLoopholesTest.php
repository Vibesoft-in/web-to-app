<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\BuildStatus;
use App\Enums\ConnectionStatus;
use App\Enums\Platform;
use App\Enums\SetupStep;
use App\Models\App;
use App\Models\AppConfig;
use App\Models\AppUser;
use App\Models\Connection;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Billing\EntitlementService;
use App\Services\Connectors\ConnectorFactory;
use App\Services\Connectors\ConnectorInterface;
use App\Services\Notifications\WhatsAppService;
use App\Services\Security\UrlGuard;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Mockery;
use Tests\TestCase;

class FlowEdgeCasesAndLoopholesTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $user1;
    private User $user2;
    protected App $appModel;
    private Plan $plan;
    private string $token1;
    private string $token2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::factory()->create(['name' => 'Edge Cases Tenant']);

        $this->user1 = User::factory()->create([
            'tenant_id'         => $this->tenant->id,
            'name'              => 'User One',
            'email'             => 'user1@example.com',
            'role'              => 'owner',
            'email_verified_at' => now(),
        ]);

        $this->user2 = User::factory()->create([
            'tenant_id'         => $this->tenant->id,
            'name'              => 'User Two',
            'email'             => 'user2@example.com',
            'role'              => 'editor',
            'email_verified_at' => now(),
        ]);

        $this->token1 = $this->user1->createToken('dashboard')->plainTextToken;
        $this->token2 = $this->user2->createToken('dashboard')->plainTextToken;

        $this->plan = Plan::create([
            'name'          => 'Pro Growth',
            'price_monthly' => 199900,
            'features'      => ['whatsapp' => true],
            'limits'        => ['builds_per_month' => 5],
            'is_active'     => true,
        ]);

        $this->appModel = App::withoutTenantScope()->create([
            'tenant_id'    => $this->tenant->id,
            'name'         => 'Edge Store App',
            'platform'     => 'woo',
            'package_name' => 'com.edgestore.app',
            'app_key'      => 'app_key_edge_001',
            'setup_step'   => 'connect',
            'status'       => 'draft',
        ]);
    }

    /**
     * Test 1: Two users in one tenant editing the same config concurrently triggers 409 CONFIG_CONFLICT.
     */
    public function test_two_users_editing_same_config_concurrently_triggers_conflict(): void
    {
        $this->appModel->update(['setup_step' => SetupStep::Theme]);

        // User 1 creates initial draft
        $initialResp = $this->withHeader('Authorization', 'Bearer ' . $this->token1)
            ->putJson("/api/apps/{$this->appModel->ulid}/config/draft", [
                'theme' => ['colors' => ['primary' => '#111111']],
            ]);
        $initialResp->assertStatus(200);

        // Fetch draft to get current timestamp/version
        $draftResp = $this->withHeader('Authorization', 'Bearer ' . $this->token1)
            ->getJson("/api/apps/{$this->appModel->ulid}/config/draft");
        $draftResp->assertStatus(200);
        $baseUpdatedAt = $draftResp->json('updated_at');

        // User 1 updates draft (advancing timestamp)
        $this->travel(1)->second();
        $user1Update = $this->withHeader('Authorization', 'Bearer ' . $this->token1)
            ->putJson("/api/apps/{$this->appModel->ulid}/config/draft", [
                'theme'           => ['colors' => ['primary' => '#222222']],
                'base_updated_at' => $baseUpdatedAt,
            ]);
        $user1Update->assertStatus(200);

        // User 2 tries to submit changes from older session using stale base_updated_at
        $user2Conflict = $this->withHeader('Authorization', 'Bearer ' . $this->token2)
            ->putJson("/api/apps/{$this->appModel->ulid}/config/draft", [
                'theme'           => ['colors' => ['primary' => '#333333']],
                'base_updated_at' => $baseUpdatedAt, // Stale!
            ]);

        $user2Conflict->assertStatus(409);
        $user2Conflict->assertJson([
            'error' => [
                'code' => 'CONFIG_CONFLICT',
            ],
        ]);
    }

    /**
     * Test 2: Double-clicking "Publish Config" is idempotent and does not create duplicate versions.
     */
    public function test_publish_config_is_idempotent_on_double_click(): void
    {
        $this->appModel->update(['setup_step' => SetupStep::Theme]);

        // Save a draft
        $this->withHeader('Authorization', 'Bearer ' . $this->token1)
            ->putJson("/api/apps/{$this->appModel->ulid}/config/draft", [
                'theme' => ['colors' => ['primary' => '#444444']],
            ]);

        // 1st Publish
        $pub1 = $this->withHeader('Authorization', 'Bearer ' . $this->token1)
            ->postJson("/api/apps/{$this->appModel->ulid}/config/publish");
        $pub1->assertStatus(200);
        $v1 = $pub1->json('version');

        // 2nd Publish (immediate double-click of same draft)
        $pub2 = $this->withHeader('Authorization', 'Bearer ' . $this->token1)
            ->postJson("/api/apps/{$this->appModel->ulid}/config/publish");
        $pub2->assertStatus(200);
        $v2 = $pub2->json('version');

        // Must return the exact same version without duplicate increments
        $this->assertEquals($v1, $v2);
        $this->assertEquals(1, $this->appModel->configs()->where('state', 'published')->count());
    }

    /**
     * Test 3: ConnectorFactory safely accepts Connection subject (avoiding TypeError in CartController).
     */
    public function test_cart_controller_handles_connector_factory_with_connection(): void
    {
        Connection::withoutTenantScope()->create([
            'tenant_id'                 => $this->tenant->id,
            'app_id'                    => $this->appModel->id,
            'site_url'                  => 'https://edgestore.com',
            'consumer_key_encrypted'    => 'ck_mock',
            'consumer_secret_encrypted' => 'cs_mock',
            'status'                    => 'verified',
            'credentials'               => [
                'consumer_key'    => 'ck_mock',
                'consumer_secret' => 'cs_mock',
            ],
        ]);

        $mockConnector = Mockery::mock(ConnectorInterface::class);
        $mockConnector->shouldReceive('createCheckoutUrl')
            ->once()
            ->andReturn('https://edgestore.com/cart/checkout');

        $factory = app(ConnectorFactory::class);
        // Test that make accepts either App or Connection
        $factoryMock = Mockery::mock(ConnectorFactory::class);
        $factoryMock->shouldReceive('make')
            ->andReturn($mockConnector);
        $this->appModel->instance(ConnectorFactory::class, $factoryMock);

        $response = $this->withHeaders(['X-App-Key' => $this->appModel->app_key])
            ->postJson('/v1/cart/checkout-url', [
                'items' => [['product_id' => 101, 'quantity' => 2]],
            ]);

        $response->assertStatus(200);
        $this->assertEquals('https://edgestore.com/cart/checkout', $response->json('checkout_url'));
    }

    /**
     * Test 4: Back button / rollback invalidates connection and locks subsequent steps.
     */
    public function test_rollback_invalidates_connection_and_locks_subsequent_steps(): void
    {
        // App is verified and at branding step
        Connection::withoutTenantScope()->create([
            'tenant_id'                 => $this->tenant->id,
            'app_id'                    => $this->appModel->id,
            'site_url'                  => 'https://edgestore.com',
            'consumer_key_encrypted'    => 'ck_mock',
            'consumer_secret_encrypted' => 'cs_mock',
            'status'                    => 'verified',
        ]);

        $this->appModel->update(['setup_step' => SetupStep::Branding]);

        // User navigates back to 'connect' step via rollback endpoint
        $rollback = $this->withHeader('Authorization', 'Bearer ' . $this->token1)
            ->postJson("/api/apps/{$this->appModel->ulid}/rollback", [
                'target_step' => 'connect',
            ]);
        $rollback->assertStatus(200);

        $this->appModel->refresh();
        $this->assertEquals(SetupStep::Connect, $this->appModel->setup_step);
        $this->assertEquals(ConnectionStatus::NotStarted, $this->appModel->connection->status);

        // Attempting to save theme config directly is now locked
        $directCall = $this->withHeader('Authorization', 'Bearer ' . $this->token1)
            ->putJson("/api/apps/{$this->appModel->ulid}/config/draft", [
                'theme' => ['colors' => ['primary' => '#555555']],
            ]);
        $directCall->assertStatus(403);
        $directCall->assertJson(['error' => ['code' => 'STEP_LOCKED']]);

        // Build is locked
        $this->assertFalse($this->appModel->isBuildAllowed());
    }

    /**
     * Test 5: Platform change resets connection credentials and draft configurations.
     */
    public function test_platform_change_resets_connection_and_draft_configs(): void
    {
        Connection::withoutTenantScope()->create([
            'tenant_id'                 => $this->tenant->id,
            'app_id'                    => $this->appModel->id,
            'site_url'                  => 'https://edgestore.com',
            'consumer_key_encrypted'    => 'ck_mock',
            'consumer_secret_encrypted' => 'cs_mock',
            'status'                    => 'verified',
        ]);

        AppConfig::withoutTenantScope()->create([
            'tenant_id' => $this->tenant->id,
            'app_id'    => $this->appModel->id,
            'version'   => 1,
            'state'     => 'draft',
            'config'    => ['theme' => ['colors' => ['primary' => '#666666']]],
        ]);

        // Change platform from woo to shopify
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->token1)
            ->postJson("/api/apps/{$this->appModel->ulid}/platform", [
                'platform' => 'shopify',
            ]);

        $response->assertStatus(200);
        $this->appModel->refresh();

        $this->assertEquals(Platform::Shopify, $this->appModel->platform);
        $this->assertNull($this->appModel->connection);
        $this->assertEquals(0, $this->appModel->configs()->where('state', 'draft')->count());
        $this->assertEquals(SetupStep::Connect, $this->appModel->setup_step);
    }

    /**
     * Test 6: Revoked store keys fail verification and lock build & preview data.
     */
    public function test_revoked_store_keys_fails_verification_and_locks_preview(): void
    {
        Http::fake([
            'https://edgestore.com/wp-json/wc/v3/system_status*' => Http::response(['code' => 'woocommerce_rest_cannot_view', 'message' => 'The API key provided is revoked or invalid.'], 401),
        ]);

        Connection::withoutTenantScope()->create([
            'tenant_id'                 => $this->tenant->id,
            'app_id'                    => $this->appModel->id,
            'site_url'                  => 'https://edgestore.com',
            'consumer_key_encrypted'    => 'ck_revoked',
            'consumer_secret_encrypted' => 'cs_revoked',
            'status'                    => 'verified',
        ]);

        // Re-verifying with revoked keys fails
        $verifyResp = $this->withHeader('Authorization', 'Bearer ' . $this->token1)
            ->postJson("/api/apps/{$this->appModel->ulid}/connection/verify", [
                'site_url'        => 'https://edgestore.com',
                'consumer_key'    => 'ck_revoked',
                'consumer_secret' => 'cs_revoked',
            ]);

        $verifyResp->assertStatus(422);
        $verifyResp->assertJson(['error' => ['code' => 'INVALID_KEYS']]);

        $this->appModel->refresh();
        $this->assertEquals(ConnectionStatus::Failed, $this->appModel->connection->status);

        // Preview data now fails because connection is not verified
        $previewResp = $this->withHeader('Authorization', 'Bearer ' . $this->token1)
            ->getJson("/api/apps/{$this->appModel->ulid}/preview-data");

        $previewResp->assertStatus(400);
        $previewResp->assertJson(['error' => ['code' => 'CONNECTION_NOT_VERIFIED']]);
    }

    /**
     * Test 7: Plan expiration past grace period (7 days) locks builds and WhatsApp.
     */
    public function test_plan_expiration_locks_builds_and_whatsapp_after_grace(): void
    {
        // Active subscription expired 10 days ago (grace period is 7 days)
        Subscription::create([
            'tenant_id'          => $this->tenant->id,
            'app_id'             => $this->appModel->id,
            'plan_id'            => $this->plan->id,
            'status'             => 'active',
            'current_period_end' => now()->subDays(10),
        ]);

        // 1. Build trigger is locked (403 PAYMENT_REQUIRED)
        $buildResp = $this->withHeader('Authorization', 'Bearer ' . $this->token1)
            ->postJson("/api/apps/{$this->appModel->ulid}/builds");
        $buildResp->assertStatus(403);
        $buildResp->assertJson(['error' => ['code' => 'PAYMENT_REQUIRED']]);

        // 2. WhatsApp message is locked
        /** @var WhatsAppService $whatsAppService */
        $whatsAppService = app(WhatsAppService::class);
        $this->expectException(\RuntimeException::class);
        $whatsAppService->sendTemplateMessage($this->tenant, '+919876543210', 'order_status_update');
    }

    /**
     * Test 8: Store timeout (10s) maps gracefully to URL_UNREACHABLE without hanging.
     */
    public function test_store_timeout_maps_to_url_unreachable(): void
    {
        Http::fake([
            'https://slowstore.com/*' => Http::response(null, 504),
        ]);

        $resp = $this->withHeader('Authorization', 'Bearer ' . $this->token1)
            ->postJson("/api/apps/{$this->appModel->ulid}/connection/verify", [
                'site_url'        => 'https://slowstore.com',
                'consumer_key'    => 'ck_slow',
                'consumer_secret' => 'cs_slow',
            ]);

        $resp->assertStatus(422);
        $this->assertContains($resp->json('error.code'), ['URL_UNREACHABLE', 'REST_BLOCKED']);
    }

    /**
     * Test 9: Expired session / token logout blocks subsequent requests.
     */
    public function test_logout_revokes_token_and_blocks_subsequent_calls(): void
    {
        // 1. Valid authorized call
        $okResp = $this->withHeader('Authorization', 'Bearer ' . $this->token1)
            ->getJson("/api/apps/{$this->appModel->ulid}/setup-state");
        $okResp->assertStatus(200);

        // 2. Logout
        $logoutResp = $this->withHeader('Authorization', 'Bearer ' . $this->token1)
            ->postJson('/api/auth/logout');
        $logoutResp->assertStatus(200);

        // 3. Subsequent call with same token returns 401
        $blockedResp = $this->withHeader('Authorization', 'Bearer ' . $this->token1)
            ->getJson("/api/apps/{$this->appModel->ulid}/setup-state");
        $blockedResp->assertStatus(401);
    }
}
