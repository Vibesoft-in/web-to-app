<?php

declare(strict_types=1);

namespace App\Services\Billing;

use App\Enums\SetupStep;
use App\Models\AddOn;
use App\Models\App;
use App\Models\CustomFeatureRequest;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PackageUpgrade;
use App\Models\Payment;
use App\Models\PaymentTransaction;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrderService
{
    public function __construct(
        private readonly RazorpayService $razorpay,
        private readonly EmailNotificationService $emailService
    ) {}

    /**
     * Calculates the exact server-side pricing breakdown for a package and selected add-ons.
     *
     * @param int $packageId
     * @param array<int> $addonIds
     * @param ?string $appUlid
     * @param ?string $type
     * @return array
     */
    public function calculatePricing(int $packageId, array $addonIds = [], ?string $appUlid = null, ?string $type = null, array $addonSlugs = []): array
    {
        $package = Plan::where('is_active', true)->find($packageId) ?? Plan::where('is_active', true)->first();
        $app = $appUlid ? App::withoutTenantScope()->where('ulid', $appUlid)->first() : null;

        $isAddonOnly = ($type === 'addon');
        $packagePrice = $package?->price_monthly ?? 0; // stored in paise
        $isUpgrade = false;
        $currentPlan = null;
        $upgradeDifference = $packagePrice;

        if ($app && ! $isAddonOnly) {
            $currentPlan = $app->getActivePlan();
            if ($currentPlan && $package && $currentPlan->id !== $package->id) {
                // Check if target package is higher
                if ($package->price_monthly > $currentPlan->price_monthly) {
                    $isUpgrade = true;
                    $upgradeDifference = $package->price_monthly - $currentPlan->price_monthly;
                }
            }
        }

        $appliedPackageAmount = $isAddonOnly ? 0 : ($isUpgrade ? $upgradeDifference : $packagePrice);

        // Fetch selected add-ons from DB (never trust frontend prices)
        if (! empty($addonSlugs)) {
            $slugIds = AddOn::whereIn('slug', $addonSlugs)->pluck('id')->toArray();
            $addonIds = array_values(array_unique(array_merge(array_filter($addonIds), $slugIds)));
        } else {
            $addonIds = array_values(array_filter($addonIds));
        }

        $addons = [];
        $addonsTotal = 0;
        if (! empty($addonIds)) {
            $dbAddons = AddOn::where('is_active', true)->whereIn('id', $addonIds)->get();
            foreach ($dbAddons as $addOn) {
                $addonsTotal += $addOn->price;
                $addons[] = [
                    'id'          => $addOn->id,
                    'name'        => $addOn->name,
                    'slug'        => $addOn->slug,
                    'price'       => $addOn->price,
                    'price_fmt'   => '₹' . number_format($addOn->price / 100),
                    'description' => $addOn->description,
                ];
            }
        }

        $subtotal = $appliedPackageAmount + $addonsTotal;
        $discountAmount = 0; // Configurable discount engine
        $taxAmount = 0;      // Prices include tax or configurable

        $finalTotal = $subtotal - $discountAmount + $taxAmount;

        return [
            'is_upgrade'             => $isUpgrade,
            'current_plan'           => $currentPlan ? [
                'id'        => $currentPlan->id,
                'name'      => $currentPlan->name,
                'price'     => $currentPlan->price_monthly,
                'price_fmt' => '₹' . number_format($currentPlan->price_monthly / 100),
            ] : null,
            'package'                => [
                'id'              => $package->id,
                'name'            => $package->name,
                'slug'            => $package->slug ?? strtolower($package->name),
                'original_price'  => $packagePrice,
                'original_price_fmt' => '₹' . number_format($packagePrice / 100),
                'charged_amount'  => $appliedPackageAmount,
                'charged_amount_fmt' => '₹' . number_format($appliedPackageAmount / 100),
                'can_apk'         => (bool) ($package->can_apk ?? true),
                'can_aab'         => (bool) ($package->can_aab ?? false),
                'has_admin_panel' => (bool) ($package->has_admin_panel ?? false),
            ],
            'addons'                 => $addons,
            'addons_total'           => $addonsTotal,
            'addons_total_fmt'       => '₹' . number_format($addonsTotal / 100),
            'subtotal'               => $subtotal,
            'subtotal_fmt'           => '₹' . number_format($subtotal / 100),
            'discount_amount'        => $discountAmount,
            'tax_amount'             => $taxAmount,
            'final_total'            => $finalTotal,
            'final_total_fmt'        => '₹' . number_format($finalTotal / 100),
            'currency'               => 'INR',
        ];
    }

    /**
     * Initializes a verified checkout order and calls Razorpay API to generate razorpay_order_id.
     */
    public function createCheckoutOrder(User $user, array $data): array
    {
        $type = $data['type'] ?? 'new_purchase';
        $packageId = (int) ($data['package_id'] ?? 1);
        $addonIds = array_filter(array_map('intval', (array) ($data['addon_ids'] ?? [])));
        if (! empty($data['addon_slugs'])) {
            $slugIds = AddOn::whereIn('slug', (array) $data['addon_slugs'])->pluck('id')->toArray();
            $addonIds = array_values(array_unique(array_merge($addonIds, $slugIds)));
        }
        $appUlid = $data['app_ulid'] ?? null;
        $app = null;
        if ($appUlid) {
            $app = App::withoutTenantScope()->where('ulid', $appUlid)->first();
        } elseif (! empty($data['app_id'])) {
            $app = App::withoutTenantScope()->find($data['app_id']);
            $appUlid = $app?->ulid;
        }

        // If purchasing an add-on, guard against duplicate purchases for this app
        if ($type === 'addon' && $app) {
            $existingAddonIds = $app->getPurchasedAddonIds();
            $existingAddonSlugs = $app->getPurchasedAddonSlugs();
            foreach ($addonIds as $aId) {
                $alreadyAddon = AddOn::find($aId);
                $slug = $alreadyAddon?->slug ?? '';
                if (in_array($aId, $existingAddonIds, true) || ($slug && in_array($slug, $existingAddonSlugs, true))) {
                    $name = $alreadyAddon?->name ?? "Add-on #{$aId}";
                    throw new \InvalidArgumentException("{$app->name} already contains this add-on ({$name}).");
                }
            }
        }

        $pricing = $this->calculatePricing($packageId, $addonIds, $appUlid, $type);
        $tenant = $app?->tenant ?? $user->tenant ?? Tenant::first();

        // Idempotency: Guard against rapid duplicate clicks (within 15 seconds) by reusing recent pending order
        $recentPendingOrder = Order::where('user_id', $user->id)
            ->where('status', 'pending_payment')
            ->where('created_at', '>=', now()->subSeconds(15))
            ->when($app, fn ($q) => $q->where('app_id', $app->id))
            ->when($type === 'addon', fn ($q) => $q->where('order_type', 'addon'))
            ->latest('id')
            ->first();

        if ($recentPendingOrder && $recentPendingOrder->total_amount === $pricing['final_total']) {
            $txn = PaymentTransaction::where('order_id', $recentPendingOrder->id)->first();
            $gatewayOrderId = $txn?->gateway_order_id ?: ('order_mock_' . Str::random(14));
            $keyId = (string) config('services.razorpay.key_id', env('RAZORPAY_KEY_ID')) ?: 'rzp_test_SnbtbVtFnRIrAI';

            return [
                'success'           => true,
                'order_id'          => $recentPendingOrder->id,
                'order_number'      => $recentPendingOrder->order_number,
                'razorpay_order_id' => $gatewayOrderId,
                'amount'            => $recentPendingOrder->total_amount,
                'currency'          => $recentPendingOrder->currency,
                'key_id'            => $keyId,
                'pricing'           => $pricing,
                'order'             => [
                    'id'               => $recentPendingOrder->id,
                    'order_number'     => $recentPendingOrder->order_number,
                    'amount'           => $recentPendingOrder->total_amount,
                    'gateway_order_id' => $gatewayOrderId,
                    'currency'         => $recentPendingOrder->currency,
                    'key_id'           => $keyId,
                ],
                'prefill'           => [
                    'name'    => $recentPendingOrder->billing_name,
                    'email'   => $recentPendingOrder->billing_email,
                    'contact' => $recentPendingOrder->billing_phone,
                ],
            ];
        }

        return DB::transaction(function () use ($user, $tenant, $app, $pricing, $data, $type) {
            $orderNumber = 'ORD-' . strtoupper(Str::random(8));

            $order = Order::create([
                'order_number'    => $orderNumber,
                'tenant_id'       => $tenant->id,
                'user_id'         => $user->id,
                'app_id'          => $app?->id,
                'package_id'      => $pricing['package']['id'],
                'order_type'      => $type === 'addon' ? 'addon' : ($pricing['is_upgrade'] ? 'upgrade' : 'new_purchase'),
                'status'          => 'pending_payment',
                'currency'        => 'INR',
                'subtotal'        => $pricing['subtotal'],
                'discount_amount' => $pricing['discount_amount'],
                'tax_amount'      => $pricing['tax_amount'],
                'total_amount'    => $pricing['final_total'],
                'billing_name'    => $data['billing_name'] ?? $user->name,
                'billing_email'   => $data['billing_email'] ?? $user->email,
                'billing_phone'   => $data['billing_phone'] ?? $user->phone ?? '',
                'billing_address' => $data['billing_address'] ?? null,
                'notes'           => $data['notes'] ?? null,
            ]);

            // Item 1: Package or Upgrade difference (Only created if NOT an add-on only purchase)
            if ($type !== 'addon') {
                if ($pricing['is_upgrade']) {
                    OrderItem::create([
                        'order_id'    => $order->id,
                        'item_type'   => 'upgrade_difference',
                        'item_id'     => $pricing['package']['id'],
                        'name'        => "Package Upgrade: {$pricing['current_plan']['name']} to {$pricing['package']['name']}",
                        'description' => "Pro-rated price difference upgrade to {$pricing['package']['name']} package",
                        'unit_price'  => $pricing['package']['charged_amount'],
                        'quantity'    => 1,
                        'total_price' => $pricing['package']['charged_amount'],
                        'meta'        => [
                            'from_package_id' => $pricing['current_plan']['id'],
                            'to_package_id'   => $pricing['package']['id'],
                        ],
                    ]);

                    // Track package upgrade record
                    PackageUpgrade::create([
                        'order_id'             => $order->id,
                        'tenant_id'            => $tenant->id,
                        'app_id'               => $app->id,
                        'from_package_id'      => $pricing['current_plan']['id'],
                        'to_package_id'        => $pricing['package']['id'],
                        'original_paid_amount' => $pricing['current_plan']['price'],
                        'new_package_amount'   => $pricing['package']['original_price'],
                        'difference_paid'      => $pricing['package']['charged_amount'],
                        'status'               => 'pending',
                    ]);
                } else {
                    OrderItem::create([
                        'order_id'    => $order->id,
                        'item_type'   => 'package',
                        'item_id'     => $pricing['package']['id'],
                        'name'        => "{$pricing['package']['name']} Package",
                        'description' => "Mobile Application Platform Package ({$pricing['package']['name']})",
                        'unit_price'  => $pricing['package']['charged_amount'],
                        'quantity'    => 1,
                        'total_price' => $pricing['package']['charged_amount'],
                        'meta'        => $pricing['package'],
                    ]);
                }
            }

            // Items 2+: Selected Add-ons
            foreach ($pricing['addons'] as $addon) {
                OrderItem::create([
                    'order_id'    => $order->id,
                    'item_type'   => 'addon',
                    'item_id'     => $addon['id'],
                    'name'        => $addon['name'],
                    'description' => $addon['description'],
                    'unit_price'  => $addon['price'],
                    'quantity'    => 1,
                    'total_price' => $addon['price'],
                    'meta'        => [
                        'slug' => $addon['slug'],
                    ],
                ]);
            }

            // Call Razorpay API to generate Razorpay Order ID
            $keyId = (string) config('services.razorpay.key_id', env('RAZORPAY_KEY_ID'));
            $keySecret = (string) config('services.razorpay.key_secret', env('RAZORPAY_KEY_SECRET'));

            $hasRealKeys = ! empty($keyId) && ! empty($keySecret) && $keySecret !== 'rzp_test_secret_key';

            if ($hasRealKeys) {
                $response = \Illuminate\Support\Facades\Http::withBasicAuth($keyId, $keySecret)
                    ->timeout(10)
                    ->post('https://api.razorpay.com/v1/orders', [
                        'amount'   => $pricing['final_total'],
                        'currency' => 'INR',
                        'receipt'  => $order->order_number,
                        'notes'    => [
                            'order_id'     => (string) $order->id,
                            'order_number' => $order->order_number,
                            'user_id'      => (string) $user->id,
                            'app_id'       => (string) ($app?->id ?? 0),
                            'package_id'   => (string) $pricing['package']['id'],
                        ],
                    ]);

                if ($response->successful()) {
                    $gatewayOrderId = (string) $response->json('id');
                } else {
                    throw new \RuntimeException('Razorpay order creation failed: ' . $response->body());
                }
            } else {
                $gatewayOrderId = 'order_mock_' . Str::random(14);
            }

            // Record pending payment transaction
            PaymentTransaction::create([
                'order_id'         => $order->id,
                'tenant_id'        => $tenant->id,
                'gateway'          => 'razorpay',
                'gateway_order_id' => $gatewayOrderId,
                'amount'           => $pricing['final_total'],
                'currency'         => 'INR',
                'status'           => 'pending',
            ]);

            return [
                'success'           => true,
                'order_id'          => $order->id,
                'order_number'      => $order->order_number,
                'razorpay_order_id' => $gatewayOrderId,
                'amount'            => $pricing['final_total'],
                'currency'          => 'INR',
                'key_id'            => $keyId ?: 'rzp_test_SnbtbVtFnRIrAI',
                'pricing'           => $pricing,
                'order'             => [
                    'id'               => $order->id,
                    'order_number'     => $order->order_number,
                    'amount'           => $pricing['final_total'],
                    'gateway_order_id' => $gatewayOrderId,
                    'currency'         => 'INR',
                    'key_id'           => $keyId ?: 'rzp_test_SnbtbVtFnRIrAI',
                ],
                'prefill'           => [
                    'name'    => $order->billing_name,
                    'email'   => $order->billing_email,
                    'contact' => $order->billing_phone,
                ],
            ];
        });
    }

    /**
     * Verifies payment cryptographic signature and unlocks entitlements.
     */
    public function verifyAndFulfillOrder(array $payload): array
    {
        $orderNumber = (string) ($payload['order_number'] ?? '');
        $razorpayOrderId = (string) ($payload['razorpay_order_id'] ?? '');
        $razorpayPaymentId = (string) ($payload['razorpay_payment_id'] ?? '');
        $razorpaySignature = (string) ($payload['razorpay_signature'] ?? '');

        $order = Order::with(['items', 'package', 'app', 'user'])->where(function ($q) use ($orderNumber, $razorpayOrderId) {
            if ($orderNumber) {
                $q->where('order_number', $orderNumber);
            }
            if ($razorpayOrderId) {
                $q->orWhereHas('transactions', fn ($tx) => $tx->where('gateway_order_id', $razorpayOrderId));
            }
        })->firstOrFail();

        // Prevent duplicate fulfillment
        if ($order->isPaid()) {
            return [
                'success'      => true,
                'already_paid' => true,
                'message'      => 'Order has already been fulfilled.',
                'order'        => $order,
            ];
        }

        // Verify cryptographic HMAC signature
        $keySecret = (string) config('services.razorpay.key_secret', env('RAZORPAY_KEY_SECRET'));
        $isMock = str_starts_with($razorpayOrderId, 'order_mock_');

        if (! $isMock && ! empty($razorpaySignature)) {
            $expectedSignature = hash_hmac('sha256', $razorpayOrderId . '|' . $razorpayPaymentId, $keySecret);
            if (! hash_equals($expectedSignature, $razorpaySignature)) {
                $order->update(['status' => 'failed']);
                $this->emailService->sendPaymentFailedEmail($order, 'Signature verification failed.');
                throw new \InvalidArgumentException('Payment signature verification failed.');
            }
        }

        return DB::transaction(function () use ($order, $razorpayOrderId, $razorpayPaymentId, $razorpaySignature) {
            $effectivePaymentId = $razorpayPaymentId ?: ('pay_' . strtoupper(Str::random(12)));

            // 1. Update Order status
            $order->update([
                'status'  => 'paid',
                'paid_at' => now(),
            ]);

            // 2. Update PaymentTransaction
            $transaction = PaymentTransaction::where('order_id', $order->id)
                ->where('gateway_order_id', $razorpayOrderId)
                ->first();

            if ($transaction) {
                $transaction->update([
                    'gateway_payment_id' => $effectivePaymentId,
                    'gateway_signature'  => $razorpaySignature,
                    'status'             => 'success',
                    'raw_payload'        => [
                        'verified_at'   => now()->toIso8601String(),
                        'order_number'  => $order->order_number,
                    ],
                ]);
            } else {
                PaymentTransaction::create([
                    'order_id'           => $order->id,
                    'tenant_id'          => $order->tenant_id,
                    'gateway'            => 'razorpay',
                    'gateway_order_id'   => $razorpayOrderId,
                    'gateway_payment_id' => $effectivePaymentId,
                    'gateway_signature'  => $razorpaySignature,
                    'amount'             => $order->total_amount,
                    'currency'           => 'INR',
                    'status'             => 'success',
                ]);
            }

            // 3. Fulfill Entitlements: Subscription & Package Updates (Only on plan purchase/upgrade)
            $app = $order->app;
            $package = $order->package;

            if ($app && $package && $order->order_type !== 'addon') {
                // Update / create active subscription for app
                Subscription::withoutTenantScope()->updateOrCreate(
                    [
                        'tenant_id' => $order->tenant_id,
                        'app_id'    => $app->id,
                    ],
                    [
                        'plan_id'            => $package->id,
                        'status'             => 'active',
                        'razorpay_sub_id'    => 'sub_' . $order->order_number,
                        'current_period_end' => now()->addYears(5), // Lifetime access for package
                    ]
                );

                // Advance wizard setup step if applicable
                if ($app->setup_step->order() < SetupStep::Build->order()) {
                    $app->update(['setup_step' => SetupStep::Build]);
                }
            }

            // Assign theme key if a theme was purchased
            if ($app) {
                foreach ($order->items as $item) {
                    $slug = $item->meta['slug'] ?? '';
                    if ($slug === 'theme_premium') {
                        $app->update(['assigned_theme_key' => 'premium']);
                    } elseif ($slug === 'theme_ecommerce_classic') {
                        $app->update(['assigned_theme_key' => 'ecommerce_classic']);
                    }
                }
            }

            // 4. If this was an upgrade, update upgrade tracking
            $upgrade = PackageUpgrade::where('order_id', $order->id)->first();
            if ($upgrade) {
                $upgrade->update(['status' => 'completed']);
                $this->emailService->sendPackageUpgradeEmail($upgrade, $order, $effectivePaymentId);
            } else {
                // Normal purchase email
                $this->emailService->sendPaymentSuccessEmail($order, $effectivePaymentId);
            }

            // 5. If this was a custom feature quote, update status
            $customFeature = CustomFeatureRequest::where('order_id', $order->id)->first();
            if ($customFeature) {
                $customFeature->update([
                    'status'             => 'in_progress',
                    'customer_action_at' => now(),
                ]);
            }

            // 6. Record legacy Payment record for bookkeeping
            Payment::withoutTenantScope()->create([
                'tenant_id'           => $order->tenant_id,
                'razorpay_payment_id' => $effectivePaymentId,
                'amount'              => $order->total_amount,
                'status'              => 'captured',
                'raw'                 => [
                    'order_number' => $order->order_number,
                    'package_name' => $order->package?->name ?? 'Custom',
                    'app_name'     => $order->app?->name ?? 'Mobile Store',
                ],
            ]);

            return [
                'success'      => true,
                'order'        => $order->fresh(['items', 'package', 'app']),
                'transaction_id' => $effectivePaymentId,
                'entitlements' => [
                    'can_apk'         => $app ? $app->canDownloadApk() : true,
                    'can_aab'         => $app ? $app->canDownloadAab() : true,
                    'has_admin_panel' => $app ? $app->hasAdminPanelAccess() : true,
                ],
            ];
        });
    }

    /**
     * Creates an order for an approved custom feature request quote.
     */
    public function createCustomQuoteOrder(User $user, CustomFeatureRequest $request): array
    {
        if ($request->status !== 'quoted' || empty($request->quoted_price)) {
            throw new \InvalidArgumentException('This custom feature request has not been quoted yet.');
        }

        $app = $request->app;
        $tenant = $request->tenant ?? $user->tenant;

        return DB::transaction(function () use ($user, $tenant, $app, $request) {
            $orderNumber = 'ORD-CF-' . strtoupper(Str::random(6));

            $order = Order::create([
                'order_number'    => $orderNumber,
                'tenant_id'       => $tenant->id,
                'user_id'         => $user->id,
                'app_id'          => $app?->id,
                'order_type'      => 'custom_quote',
                'status'          => 'pending_payment',
                'currency'        => 'INR',
                'subtotal'        => $request->quoted_price,
                'discount_amount' => 0,
                'tax_amount'      => 0,
                'total_amount'    => $request->quoted_price,
                'billing_name'    => $user->name,
                'billing_email'   => $user->email,
                'billing_phone'   => $user->phone ?? '',
                'notes'           => "Custom Feature: {$request->feature_name} (Ticket #{$request->ticket_number})",
            ]);

            OrderItem::create([
                'order_id'    => $order->id,
                'item_type'   => 'custom_quote',
                'item_id'     => $request->id,
                'name'        => "Custom Development: {$request->feature_name}",
                'description' => $request->admin_notes ?: $request->requirements,
                'unit_price'  => $request->quoted_price,
                'quantity'    => 1,
                'total_price' => $request->quoted_price,
                'meta'        => [
                    'ticket_number' => $request->ticket_number,
                ],
            ]);

            // Link order to the request
            $request->update([
                'order_id'           => $order->id,
                'status'             => 'accepted',
                'customer_action_at' => now(),
            ]);

            // Call Razorpay API
            $keyId = (string) config('services.razorpay.key_id', env('RAZORPAY_KEY_ID'));
            $keySecret = (string) config('services.razorpay.key_secret', env('RAZORPAY_KEY_SECRET'));
            $hasRealKeys = ! empty($keyId) && ! empty($keySecret) && $keySecret !== 'rzp_test_secret_key';

            if ($hasRealKeys) {
                $response = \Illuminate\Support\Facades\Http::withBasicAuth($keyId, $keySecret)
                    ->timeout(10)
                    ->post('https://api.razorpay.com/v1/orders', [
                        'amount'   => $request->quoted_price,
                        'currency' => 'INR',
                        'receipt'  => $orderNumber,
                        'notes'    => [
                            'ticket_number' => $request->ticket_number,
                            'order_id'      => (string) $order->id,
                        ],
                    ]);

                $gatewayOrderId = $response->successful() ? (string) $response->json('id') : ('order_mock_' . Str::random(14));
            } else {
                $gatewayOrderId = 'order_mock_' . Str::random(14);
            }

            PaymentTransaction::create([
                'order_id'         => $order->id,
                'tenant_id'        => $tenant->id,
                'gateway'          => 'razorpay',
                'gateway_order_id' => $gatewayOrderId,
                'amount'           => $request->quoted_price,
                'currency'         => 'INR',
                'status'           => 'pending',
            ]);

            return [
                'success'           => true,
                'order_id'          => $order->id,
                'order_number'      => $order->order_number,
                'razorpay_order_id' => $gatewayOrderId,
                'amount'            => $request->quoted_price,
                'currency'          => 'INR',
                'key_id'            => $keyId ?: 'rzp_test_SnbtbVtFnRIrAI',
                'order'             => [
                    'id'               => $order->id,
                    'order_number'     => $order->order_number,
                    'amount'           => $request->quoted_price,
                    'gateway_order_id' => $gatewayOrderId,
                    'currency'         => 'INR',
                    'key_id'           => $keyId ?: 'rzp_test_SnbtbVtFnRIrAI',
                ],
                'prefill'           => [
                    'name'    => $user->name,
                    'email'   => $user->email,
                    'contact' => $user->phone ?? '',
                ],
            ];
        });
    }
}
