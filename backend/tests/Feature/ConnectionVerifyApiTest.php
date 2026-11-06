<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\ConnectionStatus;
use App\Enums\SetupStep;
use App\Models\App;
use App\Models\Connection;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Security\UrlGuard;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\Fixtures\WooFixtures;
use Tests\TestCase;

class ConnectionVerifyApiTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $user;
    protected App $appModel;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        UrlGuard::setDnsResolver(fn () => ['93.184.216.34']);

        $this->tenant = Tenant::factory()->create();
        $this->user = User::factory()->create([
            'tenant_id'         => $this->tenant->id,
            'email_verified_at' => now(),
            'role'              => 'owner',
        ]);

        $this->appModel = App::withoutTenantScope()->create([
            'tenant_id'    => $this->tenant->id,
            'name'         => 'Test Store App',
            'platform'     => 'woo',
            'package_name' => 'com.store.verifytest',
            'app_key'      => 'app_verify_test_key_123',
            'setup_step'   => 'connect',
            'status'       => 'draft',
        ]);

        $this->token = $this->user->createToken('dashboard')->plainTextToken;
    }

    protected function tearDown(): void
    {
        UrlGuard::resetDnsResolver();
        parent::tearDown();
    }

    public function test_verify_success_advances_setup_step_and_excludes_keys_from_response(): void
    {
        Http::fake([
            'https://acme-organics.com/wp-json/wc/v3/system_status' => Http::response(WooFixtures::systemStatus(), 200),
            'https://acme-organics.com/wp-json/wc/v3/products*' => Http::response(
                [WooFixtures::product(101)],
                200,
                ['X-WP-Total' => '50']
            ),
            'https://acme-organics.com/wp-json/wc/v3/webhooks*' => Http::response([], 200),
        ]);

        $payload = [
            'site_url'        => 'https://acme-organics.com',
            'consumer_key'    => 'ck_live_1234567890abcdef',
            'consumer_secret' => 'cs_secret_0987654321fedcba',
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->token)
            ->postJson("/api/apps/{$this->appModel->ulid}/connection/verify", $payload);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Connection verified successfully.',
                'store'   => [
                    'name'           => 'Acme Organic Botanicals',
                    'products_count' => 50,
                    'currency'       => 'INR',
                    'wc_version'     => '8.7.0',
                ],
                'connection' => [
                    'platform'             => 'woo',
                    'site_url'             => 'https://acme-organics.com',
                    'status'               => 'verified',
                    'consumer_key_preview' => 'ck_****cdef',
                ],
            ]);

        // CRITICAL: Ensure raw secrets are NEVER in the JSON response
        $responseContent = $response->getContent();
        $this->assertStringNotContainsString('cs_secret_0987654321fedcba', $responseContent);
        $this->assertStringNotContainsString('ck_live_1234567890abcdef', $responseContent);

        // Connection persisted in DB as verified
        $this->assertDatabaseHas('connections', [
            'app_id'    => $this->appModel->id,
            'tenant_id' => $this->tenant->id,
            'site_url'  => 'https://acme-organics.com',
            'status'    => 'verified',
        ]);

        // App setup_step advanced to analysis
        $this->appModel->refresh();
        $this->assertEquals(SetupStep::Analysis, $this->appModel->setup_step);
    }

    public function test_verify_returns_not_https_when_url_is_plain_http(): void
    {
        $payload = [
            'site_url'        => 'http://insecure-store.com',
            'consumer_key'    => 'ck_test_123',
            'consumer_secret' => 'cs_test_123',
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->token)
            ->postJson("/api/apps/{$this->appModel->ulid}/connection/verify", $payload);

        $response->assertStatus(422)
            ->assertJson([
                'error' => [
                    'code' => 'NOT_HTTPS',
                ],
            ]);
    }

    public function test_verify_returns_rest_blocked_when_ssrf_ip_is_targeted(): void
    {
        $payload = [
            'site_url'        => 'https://127.0.0.1',
            'consumer_key'    => 'ck_test_123',
            'consumer_secret' => 'cs_test_123',
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->token)
            ->postJson("/api/apps/{$this->appModel->ulid}/connection/verify", $payload);

        $response->assertStatus(422)
            ->assertJson([
                'error' => [
                    'code' => 'REST_BLOCKED',
                ],
            ]);
    }

    public function test_verify_returns_invalid_keys_when_credentials_rejected_401(): void
    {
        Http::fake([
            'https://acme-organics.com/wp-json/wc/v3/system_status' => Http::response([
                'code'    => 'woocommerce_rest_cannot_view',
                'message' => 'Unauthorized',
            ], 401),
        ]);

        $payload = [
            'site_url'        => 'https://acme-organics.com',
            'consumer_key'    => 'ck_wrong_key',
            'consumer_secret' => 'cs_wrong_secret',
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->token)
            ->postJson("/api/apps/{$this->appModel->ulid}/connection/verify", $payload);

        $response->assertStatus(422)
            ->assertJson([
                'error' => [
                    'code' => 'INVALID_KEYS',
                ],
            ]);
    }

    public function test_verify_returns_insufficient_permission_when_key_is_read_only(): void
    {
        Http::fake([
            'https://acme-organics.com/wp-json/wc/v3/system_status' => Http::response(WooFixtures::systemStatus(), 200),
            'https://acme-organics.com/wp-json/wc/v3/products?per_page=1' => Http::response([], 200),
            'https://acme-organics.com/wp-json/wc/v3/webhooks?per_page=1' => Http::response([
                'code' => 'woocommerce_rest_cannot_create',
            ], 403),
        ]);

        $payload = [
            'site_url'        => 'https://acme-organics.com',
            'consumer_key'    => 'ck_readonly_key',
            'consumer_secret' => 'cs_readonly_secret',
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->token)
            ->postJson("/api/apps/{$this->appModel->ulid}/connection/verify", $payload);

        $response->assertStatus(422)
            ->assertJson([
                'error' => [
                    'code' => 'INSUFFICIENT_PERMISSION',
                ],
            ]);
    }

    public function test_verify_returns_url_unreachable_when_host_unreachable_or_times_out(): void
    {
        Http::fake([
            'https://acme-organics.com/*' => function () {
                throw new \Illuminate\Http\Client\ConnectionException('Connection timed out');
            },
        ]);

        $payload = [
            'site_url'        => 'https://acme-organics.com',
            'consumer_key'    => 'ck_test_key',
            'consumer_secret' => 'cs_test_secret',
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->token)
            ->postJson("/api/apps/{$this->appModel->ulid}/connection/verify", $payload);

        $response->assertStatus(422)
            ->assertJson([
                'error' => [
                    'code' => 'URL_UNREACHABLE',
                ],
            ]);
    }

    public function test_tenant_a_cannot_verify_tenant_b_app(): void
    {
        $tenantB = Tenant::factory()->create();
        $appB = App::withoutTenantScope()->create([
            'tenant_id'    => $tenantB->id,
            'name'         => 'Tenant B Store',
            'platform'     => 'woo',
            'package_name' => 'com.store.beta',
            'app_key'      => 'app_beta_key',
            'setup_step'   => 'connect',
            'status'       => 'draft',
        ]);

        // Tenant A tries to post to Tenant B's app ULID
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->token)
            ->postJson("/api/apps/{$appB->ulid}/connection/verify", [
                'site_url'        => 'https://acme-organics.com',
                'consumer_key'    => 'ck_test',
                'consumer_secret' => 'cs_test',
            ]);

        // Must return 404 Model Not Found due to BelongsToTenant scope
        $response->assertStatus(404);
    }
}
