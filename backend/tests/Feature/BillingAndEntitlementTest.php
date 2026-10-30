<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\App;
use App\Models\AppConfig;
use App\Models\Connection;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Models\WebhookEvent;
use App\Services\Billing\EntitlementService;
use App\Services\Billing\PricingCalculator;
use App\Services\Build\BuildOrchestrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class BillingAndEntitlementTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $owner;
    private Plan $starterPlan;
    private Plan $proPlan;
    protected App $appModel;

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.razorpay.webhook_secret' => 'rzp_test_secret_key_12345']);

        $this->tenant = Tenant::factory()->create(['name' => 'Acme Commerce']);

        $this->owner = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name'      => 'Alice Acme',
            'email'     => 'alice@acme.com',
            'role'      => 'owner',
        ]);

        $this->starterPlan = Plan::create([
            'name'          => 'Starter',
            'price_monthly' => 99900,
            'features'      => ['wishlist' => true, 'whatsapp' => false],
            'limits'        => ['builds_per_month' => 3, 'max_apps' => 1],
            'is_active'     => true,
        ]);

        $this->proPlan = Plan::create([
            'name'          => 'Pro',
            'price_monthly' => 199900,
            'features'      => ['wishlist' => true, 'whatsapp' => true],
            'limits'        => ['builds_per_month' => 10, 'max_apps' => 3],
            'is_active'     => true,
        ]);

        $this->appModel = App::withoutTenantScope()->create([
            'tenant_id'    => $this->tenant->id,
            'name'         => 'Acme Store App',
            'platform'     => 'woo',
            'package_name' => 'com.acme.store',
            'app_key'      => 'app_key_acme_111',
            'setup_step'   => 'payment',
            'status'       => 'draft',
        ]);
    }

    /**
     * Test: Forged webhook with invalid signature is rejected (400 Bad Request).
     */
    public function test_forged_webhook_is_rejected(): void
    {
        $payload = json_encode(['event' => 'payment.captured', 'id' => 'evt_fake_001']);

        $response = $this->withHeaders([
            'X-Razorpay-Signature' => 'invalid_forged_hmac_signature',
        ])->postJson('/webhooks/razorpay', json_decode($payload, true));

        $response->assertStatus(400);
        $response->assertJson([
            'error' => [
                'code' => 'INVALID_SIGNATURE',
            ],
        ]);
    }

    /**
     * Test: Replayed webhook with identical event_id is handled idempotently without re-processing.
     */
    public function test_replayed_webhook_is_handled_idempotently(): void
    {
        $secret = 'rzp_test_secret_key_12345';
        $eventId = 'evt_test_unique_id_999';

        $payloadArray = [
            'event_id' => $eventId,
            'event'    => 'payment.captured',
            'payload'  => [
                'payment' => [
                    'entity' => [
                        'id'       => 'pay_test_001',
                        'amount'   => 199900,
                        'currency' => 'INR',
                        'notes'    => ['tenant_id' => $this->tenant->id],
                    ],
                ],
            ],
        ];

        $rawBody = json_encode($payloadArray);
        $signature = hash_hmac('sha256', $rawBody, $secret);

        $server = $this->transformHeadersToServerVars([
            'X-Razorpay-Signature' => $signature,
            'Content-Type'         => 'application/json',
        ]);

        // 1. First webhook transmission -> processed successfully
        $res1 = $this->call('POST', '/webhooks/razorpay', [], [], [], $server, $rawBody);

        $res1->assertOk();
        $res1->assertJson(['status' => 'success']);
        $this->assertEquals(1, WebhookEvent::where('event_id', $eventId)->count());

        // 2. Replay transmission of the exact same event
        $res2 = $this->call('POST', '/webhooks/razorpay', [], [], [], $server, $rawBody);

        $res2->assertOk();
        $res2->assertJson(['status' => 'ignored']);
        // Crucial: No duplicate record created in webhook_events table
        $this->assertEquals(1, WebhookEvent::where('event_id', $eventId)->count());
    }

    /**
     * Test: Double payment protection prevents double credit for the same payment ID.
     */
    public function test_double_payment_protection_prevents_duplicate_credit(): void
    {
        $secret = 'rzp_test_secret_key_12345';
        $paymentId = 'pay_duplicate_check_777';

        // Create subscription
        $sub = Subscription::withoutTenantScope()->create([
            'tenant_id'          => $this->tenant->id,
            'app_id'             => $this->appModel->id,
            'plan_id'            => $this->starterPlan->id,
            'status'             => 'pending',
            'razorpay_sub_id'    => 'sub_test_777',
            'current_period_end' => null,
        ]);

        $payloadArray1 = [
            'event_id' => 'evt_payment_first',
            'event'    => 'payment.captured',
            'payload'  => [
                'payment' => [
                    'entity' => [
                        'id'              => $paymentId,
                        'subscription_id' => 'sub_test_777',
                        'amount'          => 99900,
                        'currency'        => 'INR',
                        'notes'           => ['tenant_id' => $this->tenant->id],
                    ],
                ],
            ],
        ];

        $rawBody1 = json_encode($payloadArray1);
        $sig1 = hash_hmac('sha256', $rawBody1, $secret);

        $server1 = $this->transformHeadersToServerVars([
            'X-Razorpay-Signature' => $sig1,
            'Content-Type'         => 'application/json',
        ]);

        $this->call('POST', '/webhooks/razorpay', [], [], [], $server1, $rawBody1)
            ->assertOk();

        // Subscription activated and 1 Payment record created
        $this->assertEquals(1, Payment::where('razorpay_payment_id', $paymentId)->count());
        $sub->refresh();
        $this->assertEquals('active', $sub->status);
        $this->assertNotNull($sub->current_period_end);

        // Attempt second payment delivery carrying the same payment ID
        $payloadArray2 = $payloadArray1;
        $payloadArray2['event_id'] = 'evt_payment_second_duplicate';
        $rawBody2 = json_encode($payloadArray2);
        $sig2 = hash_hmac('sha256', $rawBody2, $secret);

        $server2 = $this->transformHeadersToServerVars([
            'X-Razorpay-Signature' => $sig2,
            'Content-Type'         => 'application/json',
        ]);

        $this->call('POST', '/webhooks/razorpay', [], [], [], $server2, $rawBody2)
            ->assertOk();

        // Exactly one payment record must exist (no double credit)
        $this->assertEquals(1, Payment::where('razorpay_payment_id', $paymentId)->count());
    }

    /**
     * Test: Build without payment is blocked until subscription is active.
     */
    public function test_build_without_payment_is_blocked(): void
    {
        Connection::withoutTenantScope()->create([
            'tenant_id'        => $this->tenant->id,
            'app_id'           => $this->appModel->id,
            'platform'         => 'woo',
            'site_url'         => 'https://acmestore.com',
            'status'           => 'verified',
            'last_verified_at' => now(),
            'credentials'      => ['webhook_secret' => 'alpha_secret'],
        ]);

        AppConfig::withoutTenantScope()->create([
            'tenant_id'   => $this->tenant->id,
            'app_id'      => $this->appModel->id,
            'version'     => 1,
            'state'       => 'published',
            'config'      => ['theme' => ['colors' => ['primary' => '#10B981']]],
            'published_at'=> now(),
        ]);

        $orchestrator = new BuildOrchestrator();

        // Attempting build without active payment must fail validation
        $this->expectException(ValidationException::class);
        $orchestrator->queueBuild($this->appModel);
    }

    /**
     * Test: EntitlementService checks features, limits, and grace period lockout.
     */
    public function test_entitlement_service_features_and_dunning_grace_period(): void
    {
        $entitlements = new EntitlementService();

        // 1. Active Pro subscription -> whatsapp feature allowed
        $sub = Subscription::withoutTenantScope()->create([
            'tenant_id'          => $this->tenant->id,
            'app_id'             => $this->appModel->id,
            'plan_id'            => $this->proPlan->id,
            'status'             => 'active',
            'current_period_end' => now()->addDays(15),
        ]);

        $this->assertTrue($entitlements->can($this->tenant, 'whatsapp'));
        $this->assertTrue($entitlements->hasRemainingLimit($this->tenant, 'max_apps'));

        // 2. Subscription enters 7-day grace period (expired 2 days ago)
        $sub->update(['current_period_end' => now()->subDays(2)]);

        // Basic features remain, premium features (whatsapp) locked during grace period
        $this->assertFalse($entitlements->can($this->tenant, 'whatsapp'));

        // 3. Subscription past 7-day grace period (expired 10 days ago) -> completely locked
        $sub->update(['current_period_end' => now()->subDays(10)]);
        $this->assertFalse($entitlements->can($this->tenant, 'wishlist'));
    }

    /**
     * Test: Server-side PricingCalculator applies annual discount and calculates add-ons.
     */
    public function test_pricing_calculator_computes_annual_discounts(): void
    {
        $calculator = new PricingCalculator();

        // Monthly Starter: 99900 paise
        $monthly = $calculator->calculate($this->starterPlan, 'monthly');
        $this->assertEquals(99900, $monthly['total']);
        $this->assertEquals(0, $monthly['discount']);

        // Annual Starter: 20% discount on 12 months (99900 * 12 * 0.8 = 959040 paise)
        $annual = $calculator->calculate($this->starterPlan, 'annual');
        $this->assertEquals(959040, $annual['total']);
        $this->assertGreaterThan(0, $annual['discount']);

        // With WhatsApp add-on (₹999/mo)
        $withAddon = $calculator->calculate($this->starterPlan, 'monthly', ['whatsapp' => 1]);
        $this->assertEquals(99900 + 99900, $withAddon['total']);
    }

    /**
     * Test: PricingCalculator accurately applies theme pricing and inclusions.
     */
    public function test_pricing_calculator_computes_theme_pricing(): void
    {
        $calculator = new PricingCalculator();

        // 1. Free theme (theme_a): ₹0 theme charge
        $freeCalc = $calculator->calculate($this->starterPlan, 'monthly', [], null, 'theme_a');
        $this->assertEquals(0, $freeCalc['theme_charge']);
        $this->assertEquals(99900, $freeCalc['total']);

        // 2. Paid theme (theme_b = ₹999 / 99900 paise)
        $paidCalc = $calculator->calculate($this->starterPlan, 'monthly', [], null, 'theme_b');
        $this->assertEquals(99900, $paidCalc['theme_charge']);
        $this->assertEquals(99900 + 99900, $paidCalc['total']);

        // 3. Paid theme (theme_c = ₹1,499 / 149900 paise)
        $trendyCalc = $calculator->calculate($this->starterPlan, 'monthly', [], null, 'theme_c');
        $this->assertEquals(149900, $trendyCalc['theme_charge']);
        $this->assertEquals(99900 + 149900, $trendyCalc['total']);

        // 4. Premium plan includes themes for free (₹0 theme charge)
        $premiumPlan = Plan::create([
            'name'          => 'Premium',
            'price_monthly' => 1499900,
            'features'      => [],
            'is_active'     => true,
        ]);
        $premiumCalc = $calculator->calculate($premiumPlan, 'monthly', [], null, 'theme_d');
        $this->assertEquals(0, $premiumCalc['theme_charge']);
        $this->assertTrue($premiumCalc['is_theme_included']);
    }
}
