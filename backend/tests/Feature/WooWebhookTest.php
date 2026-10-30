<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Http\Controllers\Webhooks\WooWebhookController;
use App\Models\App;
use App\Models\Tenant;
use App\Models\WebhookEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WooWebhookTest extends TestCase
{
    use RefreshDatabase;

    protected App $appModel;
    private string $secret;

    protected function setUp(): void
    {
        parent::setUp();

        $tenant = Tenant::factory()->create();
        $this->appModel = App::withoutTenantScope()->create([
            'tenant_id'    => $tenant->id,
            'name'         => 'Webhook Store',
            'platform'     => 'woo',
            'package_name' => 'com.store.webhook',
            'app_key'      => 'app_wh_test_key_999',
            'setup_step'   => 'build',
            'status'       => 'live',
        ]);

        $controller = new WooWebhookController();
        $this->secret = $controller->resolveWebhookSecret($this->appModel);
    }

    public function test_valid_hmac_signature_processes_and_records_webhook(): void
    {
        $payload = [
            'id'     => 101,
            'name'   => 'Updated Rose Mist',
            'price'  => '999',
            'status' => 'publish',
        ];

        $rawBody = json_encode($payload);
        $signature = base64_encode(hash_hmac('sha256', (string) $rawBody, $this->secret, true));

        $response = $this->withHeaders([
            'X-WC-Webhook-Signature'   => $signature,
            'X-WC-Webhook-Topic'       => 'product.updated',
            'X-WC-Webhook-Delivery-ID' => 'delivery_abc_123',
            'Content-Type'             => 'application/json',
        ])->postJson("/webhooks/woo/{$this->appModel->ulid}", $payload);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'acknowledged',
                'topic'  => 'product.updated',
            ]);

        // Webhook event was persisted with unique event_id
        $this->assertDatabaseHas('webhook_events', [
            'source'   => 'woo',
            'event_id' => "woo_{$this->appModel->ulid}_delivery_abc_123",
        ]);
    }

    public function test_invalid_hmac_signature_is_rejected_with_401(): void
    {
        $payload = ['id' => 101];

        $response = $this->withHeaders([
            'X-WC-Webhook-Signature' => 'invalid_signature_base64',
            'X-WC-Webhook-Topic'     => 'product.updated',
        ])->postJson("/webhooks/woo/{$this->appModel->ulid}", $payload);

        $response->assertStatus(401)
            ->assertJson([
                'error' => [
                    'code' => 'INVALID_SIGNATURE',
                ],
            ]);

        $this->assertDatabaseCount('webhook_events', 0);
    }

    public function test_missing_signature_header_is_rejected_with_401(): void
    {
        $payload = ['id' => 101];

        $response = $this->postJson("/webhooks/woo/{$this->appModel->ulid}", $payload);

        $response->assertStatus(401)
            ->assertJson([
                'error' => [
                    'code' => 'MISSING_SIGNATURE',
                ],
            ]);
    }

    public function test_webhook_replay_is_idempotently_ignored(): void
    {
        $payload = ['id' => 101];
        $rawBody = json_encode($payload);
        $signature = base64_encode(hash_hmac('sha256', (string) $rawBody, $this->secret, true));

        // First delivery
        $res1 = $this->withHeaders([
            'X-WC-Webhook-Signature'   => $signature,
            'X-WC-Webhook-Delivery-ID' => 'delivery_replay_001',
        ])->postJson("/webhooks/woo/{$this->appModel->ulid}", $payload);
        $res1->assertStatus(200)->assertJson(['status' => 'acknowledged']);

        // Second delivery (replay attack)
        $res2 = $this->withHeaders([
            'X-WC-Webhook-Signature'   => $signature,
            'X-WC-Webhook-Delivery-ID' => 'delivery_replay_001',
        ])->postJson("/webhooks/woo/{$this->appModel->ulid}", $payload);

        $res2->assertStatus(200)->assertJson([
            'status'  => 'ignored',
            'message' => 'Webhook event has already been processed.',
        ]);

        // Still only 1 record in database
        $this->assertDatabaseCount('webhook_events', 1);
    }

    public function test_unknown_app_ulid_returns_404(): void
    {
        $response = $this->postJson("/webhooks/woo/non_existent_ulid", ['id' => 1]);
        $response->assertStatus(404);
    }
}
