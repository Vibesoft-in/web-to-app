<?php

declare(strict_types=1);

namespace App\Services\Billing;

use App\Models\App;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class RazorpayService
{
    public function __construct(
        private readonly PricingCalculator $calculator
    ) {}

    /**
     * Initializes a subscription order for the tenant via Razorpay API.
     *
     * @param array<string, int> $addons
     * @return array{
     *     subscription_id: string,
     *     order_id: string,
     *     amount: int,
     *     currency: string,
     *     key_id: string
     * }
     */
    public function createSubscription(
        Tenant $tenant,
        Plan $plan,
        App $app,
        string $interval = 'monthly',
        array $addons = [],
        ?string $themeKey = null
    ): array {
        $calculation = $this->calculator->calculate($plan, $interval, $addons, $app, $themeKey);
        $amount = $calculation['total'];

        $keyId = (string) config('services.razorpay.key_id', 'rzp_test_public_key');
        $keySecret = (string) config('services.razorpay.key_secret', 'rzp_test_secret_key');

        $hasRealKeys = ! empty($keySecret) && ! empty($keyId) && $keySecret !== 'rzp_test_secret_key';
        $isLive = config('services.razorpay.live', true);

        if ($hasRealKeys && $isLive) {
            // Call Razorpay Orders API
            $response = Http::withBasicAuth($keyId, $keySecret)
                ->timeout(10)
                ->post('https://api.razorpay.com/v1/orders', [
                    'amount'   => $amount,
                    'currency' => 'INR',
                    'receipt'  => "rcpt_app_{$app->ulid}_".Str::random(6),
                    'notes'    => [
                        'tenant_id' => (string) $tenant->id,
                        'app_id'    => (string) $app->id,
                        'plan_id'   => (string) $plan->id,
                        'interval'  => $interval,
                    ],
                ]);

            if ($response->successful()) {
                $orderId = (string) $response->json('id');
                $subId = 'sub_'.$orderId;
            } else {
                throw new \RuntimeException("Razorpay API order creation failed: ".$response->body());
            }
        } else {
            // Local dev / test mock generation
            $orderId = 'order_mock_'.Str::random(14);
            $subId = 'sub_mock_'.Str::random(14);
        }

        // Store or update pending subscription
        Subscription::withoutTenantScope()->updateOrCreate([
            'tenant_id' => $tenant->id,
            'app_id'    => $app->id,
        ], [
            'plan_id'            => $plan->id,
            'status'             => 'pending',
            'razorpay_sub_id'    => $subId,
            'current_period_end' => null,
        ]);

        return [
            'subscription_id' => $subId,
            'order_id'        => $orderId,
            'amount'          => $amount,
            'currency'        => 'INR',
            'key_id'          => $keyId,
        ];
    }

    /**
     * Cryptographically verifies the HMAC SHA-256 signature returned by Razorpay Checkout.
     */
    public function verifyPaymentSignature(string $orderId, string $paymentId, string $signature): bool
    {
        $secret = (string) (config('services.razorpay.key_secret') ?: 'rzp_test_secret_key');
        if (empty($signature) || empty($secret)) {
            return false;
        }

        $expected = hash_hmac('sha256', $orderId . '|' . $paymentId, $secret);

        return hash_equals($expected, $signature);
    }

    /**
     * Cryptographically verifies the HMAC SHA-256 signature on an incoming Razorpay webhook.
     */
    public function verifyWebhookSignature(string $rawPayload, string $signature): bool
    {
        $secret = (string) (config('services.razorpay.webhook_secret') ?: 'rzp_test_webhook_secret_key');
        if (empty($signature)) {
            return false;
        }

        $expected = hash_hmac('sha256', $rawPayload, $secret);

        return hash_equals($expected, $signature);
    }
}
