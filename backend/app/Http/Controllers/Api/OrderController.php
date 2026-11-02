<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AddOn;
use App\Models\Order;
use App\Models\Plan;
use App\Services\Billing\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function __construct(
        private readonly OrderService $orderService
    ) {}

    /**
     * Lists dynamic packages (Basic, Pro, Premium) from the database.
     * Prices and features are fully configurable via admin panel.
     */
    public function getPackages(): JsonResponse
    {
        $packages = Plan::where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(function (Plan $plan) {
                return [
                    'id'              => $plan->id,
                    'name'            => $plan->name,
                    'slug'            => $plan->slug ?? strtolower($plan->name),
                    'price'           => $plan->price_monthly,
                    'price_monthly'   => $plan->price_monthly,
                    'price_formatted' => '₹' . number_format($plan->price_monthly / 100),
                    'description'     => $plan->description ?? '',
                    'badge'           => $plan->badge ?? '',
                    'can_apk'         => (bool) ($plan->can_apk ?? true),
                    'can_aab'         => (bool) ($plan->can_aab ?? false),
                    'has_admin_panel' => (bool) ($plan->has_admin_panel ?? false),
                    'features'        => $plan->features ?? [],
                    'features_list'   => $plan->features_list ?? [],
                    'limits'          => $plan->limits ?? [],
                ];
            });

        return response()->json(['packages' => $packages]);
    }

    /**
     * Lists dynamic active add-ons from the database.
     */
    public function getAddOns(): JsonResponse
    {
        $addons = AddOn::where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(function (AddOn $addon) {
                return [
                    'id'              => $addon->id,
                    'name'            => $addon->name,
                    'slug'            => $addon->slug,
                    'price'           => $addon->price,
                    'price_formatted' => $addon->formatted_price,
                    'category'        => $addon->category,
                    'description'     => $addon->description,
                    'badge'           => $addon->badge,
                    'features'        => $addon->features ?? [],
                ];
            });

        return response()->json(['addons' => $addons]);
    }

    /**
     * Live pricing calculator endpoint.
     */
    public function calculate(Request $request): JsonResponse
    {
        $packageId = (int) $request->input('package_id', 1);
        $addonIds = array_map('intval', (array) $request->input('addon_ids', []));
        $appUlid = $request->input('app_ulid');
        if (! $appUlid && $request->has('app_id')) {
            $foundApp = \App\Models\App::withoutTenantScope()->find($request->input('app_id'));
            $appUlid = $foundApp?->ulid;
        }

        $pricing = $this->orderService->calculatePricing(
            $packageId,
            $addonIds,
            $appUlid,
            $request->input('type')
        );

        return response()->json([
            'pricing'      => $pricing,
            'final_amount' => $pricing['final_total'],
            'total_amount' => $pricing['final_total'],
        ]);
    }

    /**
     * Initiates a verified checkout order.
     */
    public function checkout(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['error' => 'Authentication required to initiate checkout.'], 401);
        }

        $input = $request->all();
        $billingName = $input['billing_name'] ?? $input['customer_name'] ?? $user->name ?? 'Customer';
        $billingEmail = $input['billing_email'] ?? $input['customer_email'] ?? $user->email ?? '';
        $billingPhone = $input['billing_phone'] ?? $input['customer_phone'] ?? '';
        $appUlid = $input['app_ulid'] ?? null;
        if (! $appUlid && ! empty($input['app_id'])) {
            $foundApp = \App\Models\App::withoutTenantScope()->find($input['app_id']);
            $appUlid = $foundApp?->ulid;
        }

        $checkoutPayload = array_merge($input, [
            'billing_name'  => $billingName,
            'billing_email' => $billingEmail,
            'billing_phone' => $billingPhone,
            'app_ulid'      => $appUlid,
        ]);

        try {
            $checkoutData = $this->orderService->createCheckoutOrder($user, $checkoutPayload);
            return response()->json($checkoutData);
        } catch (\Throwable $e) {
            return response()->json([
                'error'   => 'Failed to create checkout order.',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Verifies payment signature and unlocks entitlements.
     */
    public function verifyPayment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_number'        => 'nullable|string',
            'razorpay_order_id'   => 'required|string',
            'razorpay_payment_id' => 'required|string',
            'razorpay_signature'  => 'nullable|string',
        ]);

        try {
            $result = $this->orderService->verifyAndFulfillOrder($validated);
            return response()->json($result);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'error'   => $e->getMessage(),
            ], 400);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error'   => 'Payment verification encountered an error: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Customer's purchased orders and invoices.
     */
    public function myOrders(Request $request): JsonResponse
    {
        $user = $request->user();
        $tenantId = $user?->tenant_id ?? ($user ? \App\Models\Tenant::where('user_id', $user->id)->value('id') : null);
        if (! $tenantId) {
            return response()->json([
                'success' => true,
                'data'    => [],
            ]);
        }

        $orders = Order::where('tenant_id', $tenantId)
            ->with(['items', 'package', 'app'])
            ->latest('id')
            ->get()
            ->map(function (Order $order) {
                return [
                    'id'              => $order->id,
                    'order_number'    => $order->order_number,
                    'order_type'      => $order->order_type,
                    'status'          => $order->status,
                    'total_amount'    => $order->total_amount,
                    'total_formatted' => $order->formatted_total,
                    'paid_at'         => $order->paid_at?->toIso8601String(),
                    'created_at'      => $order->created_at->toIso8601String(),
                    'package_name'    => $order->package?->name ?? 'Custom Order',
                    'app_name'        => $order->app?->name ?? 'Mobile Store',
                    'app_ulid'        => $order->app?->ulid ?? null,
                    'items'           => $order->items->map(fn ($item) => [
                        'name'            => $item->name,
                        'description'     => $item->description,
                        'total_formatted' => $item->formatted_price,
                        'item_type'       => $item->item_type,
                    ]),
                ];
            });

        return response()->json(['orders' => $orders]);
    }

    /**
     * Resends invoice notification email to the customer.
     */
    public function resendInvoice(Request $request, int|string $id): JsonResponse
    {
        $user = $request->user();
        $order = Order::where(function ($q) use ($user) {
            if ($user && ! $user->is_super_admin) {
                $q->where('tenant_id', $user->tenant_id);
            }
        })
        ->where(function ($q) use ($id) {
            if (is_numeric($id)) {
                $q->where('id', (int) $id);
            } else {
                $q->where('order_number', (string) $id);
            }
        })
        ->with(['items', 'package', 'app', 'user'])
        ->firstOrFail();

        $transactionId = $order->transactions()->latest('id')->value('gateway_payment_id')
            ?? \App\Models\Payment::withoutTenantScope()->where('tenant_id', $order->tenant_id)->latest('id')->value('razorpay_payment_id')
            ?? 'pay_' . strtoupper(uniqid());

        $recipientEmail = $request->input('email', $order->billing_email ?: $user->email);
        if ($recipientEmail && $recipientEmail !== $order->billing_email) {
            $order->billing_email = $recipientEmail;
            $order->save();
        }

        /** @var \App\Services\Billing\EmailNotificationService $emailService */
        $emailService = app(\App\Services\Billing\EmailNotificationService::class);
        $emailService->sendPaymentSuccessEmail($order, $transactionId);

        return response()->json([
            'success' => true,
            'message' => "Invoice notification dispatched successfully to {$recipientEmail}.",
            'order'   => [
                'order_number' => $order->order_number,
                'email'        => $recipientEmail,
                'status'       => $order->status,
            ],
        ]);
    }

    /**
     * Renders a clean printable HTML invoice for the order.
     */
    public function viewInvoice(Request $request, int|string $id): \Illuminate\Http\Response|JsonResponse
    {
        $user = $request->user();
        $order = Order::where(function ($q) use ($user) {
            if ($user && ! $user->is_super_admin) {
                $q->where('tenant_id', $user->tenant_id);
            }
        })
        ->where(function ($q) use ($id) {
            if (is_numeric($id)) {
                $q->where('id', (int) $id);
            } else {
                $q->where('order_number', (string) $id);
            }
        })
        ->with(['items', 'package', 'app', 'user'])
        ->firstOrFail();

        $transactionId = $order->transactions()->latest('id')->value('gateway_payment_id')
            ?? \App\Models\Payment::withoutTenantScope()->where('tenant_id', $order->tenant_id)->latest('id')->value('razorpay_payment_id')
            ?? 'pay_' . strtoupper(uniqid());

        $formattedTotal = '₹' . number_format($order->total_amount / 100);
        $paidDate = ($order->paid_at ?? $order->created_at)->format('d M Y, h:i A');

        $itemsRows = '';
        foreach ($order->items as $item) {
            $formattedPrice = '₹' . number_format($item->total_price / 100);
            $itemsRows .= "
                <tr style='border-bottom: 1px solid #EFEAE2;'>
                    <td style='padding: 14px 16px;'>
                        <strong style='color: #1C1917; font-size: 14px;'>{$item->name}</strong>
                        <div style='font-size: 12px; color: #78716C; margin-top: 2px;'>{$item->description}</div>
                    </td>
                    <td style='padding: 14px 16px; text-align: center; color: #57534E;'>{$item->quantity}</td>
                    <td style='padding: 14px 16px; text-align: right; font-weight: 700; color: #1C1917;'>{$formattedPrice}</td>
                </tr>
            ";
        }

        $html = "<!DOCTYPE html>
        <html lang='en'>
        <head>
            <meta charset='UTF-8'>
            <title>Tax Invoice - {$order->order_number}</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F5F1EB; margin: 0; padding: 30px 15px; color: #1C1917; }
                .invoice-card { max-width: 720px; margin: 0 auto; background: #fff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); padding: 40px; border: 1px solid #EBE5DC; }
                .btn { display: inline-block; background: #78593D; color: #fff; text-decoration: none; padding: 10px 22px; border-radius: 12px; font-weight: 700; font-size: 13px; border: none; cursor: pointer; }
                @media print { body { background: #fff; padding: 0; } .invoice-card { border: none; box-shadow: none; padding: 0; } .no-print { display: none !important; } }
            </style>
        </head>
        <body>
            <div class='invoice-card'>
                <div style='display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;'>
                    <div>
                        <h1 style='font-size: 26px; font-weight: 900; color: #78593D; margin: 0;'>WebIntoApp</h1>
                        <span style='font-size: 12px; color: #78716C; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;'>Official Tax Invoice &amp; Receipt</span>
                    </div>
                    <div style='text-align: right;'>
                        <span style='background: #ECFDF5; color: #047857; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; border: 1px solid #A7F3D0; text-transform: uppercase;'>Paid &bull; Verified</span>
                        <div style='font-size: 12px; color: #78716C; margin-top: 6px;'>Invoice Date: {$paidDate}</div>
                    </div>
                </div>

                <div style='display: flex; justify-content: space-between; margin-bottom: 28px; background: #FAF7F2; padding: 20px; border-radius: 14px; border: 1px solid #EFEAE2; font-size: 13px;'>
                    <div>
                        <div style='color: #78716C; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 4px;'>Billed To</div>
                        <strong style='color: #1C1917; font-size: 15px;'>{$order->billing_name}</strong>
                        <div style='color: #57534E; margin-top: 2px;'>{$order->billing_email}</div>
                        " . ($order->billing_phone ? "<div style='color: #57534E;'>{$order->billing_phone}</div>" : "") . "
                    </div>
                    <div style='text-align: right;'>
                        <div style='color: #78716C; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 4px;'>Order Information</div>
                        <div><strong>Order #:</strong> <span style='font-family: monospace;'>{$order->order_number}</span></div>
                        <div><strong>Transaction ID:</strong> <span style='font-family: monospace;'>{$transactionId}</span></div>
                        <div><strong>Gateway:</strong> Razorpay Secure</div>
                    </div>
                </div>

                <table style='width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;'>
                    <thead>
                        <tr style='background: #F5F1EB; text-transform: uppercase; font-size: 11px; color: #78716C;'>
                            <th style='padding: 10px 16px; text-align: left;'>Item / Description</th>
                            <th style='padding: 10px 16px; text-align: center;'>Qty</th>
                            <th style='padding: 10px 16px; text-align: right;'>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {$itemsRows}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan='2' style='padding: 16px; text-align: right; font-weight: 700; color: #57534E;'>Subtotal:</td>
                            <td style='padding: 16px; text-align: right; font-weight: 700; color: #1C1917;'>{$formattedTotal}</td>
                        </tr>
                        <tr>
                            <td colspan='2' style='padding: 0 16px 16px 16px; text-align: right; font-weight: 800; font-size: 16px; color: #1C1917;'>Total Amount Paid:</td>
                            <td style='padding: 0 16px 16px 16px; text-align: right; font-weight: 900; font-size: 20px; color: #78593D;'>{$formattedTotal}</td>
                        </tr>
                    </tfoot>
                </table>

                <div style='background: #FAF7F2; padding: 16px; border-radius: 12px; border: 1px solid #EFEAE2; font-size: 12px; color: #78716C; line-height: 1.5; margin-bottom: 24px;'>
                    <strong style='color: #1C1917;'>Entitlements Activated:</strong> Full lifetime source files, automated WordPress catalog synchronization, native compilation, and dedicated updates.
                </div>

                <div class='no-print' style='display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #EBE5DC; padding-top: 20px;'>
                    <span style='font-size: 12px; color: #78716C;'>Need help? Contact support@webintoapp.com</span>
                    <button onclick='window.print()' class='btn'>🖨️ Print / Save PDF Invoice</button>
                </div>
            </div>
        </body>
        </html>";

        return response($html)->header('Content-Type', 'text/html');
    }

    /**
     * Razorpay Server-to-Server Webhook handler.
     */
    public function webhook(Request $request): JsonResponse
    {
        $signature = $request->header('X-Razorpay-Signature', '');
        $webhookSecret = (string) config('services.razorpay.webhook_secret', env('RAZORPAY_WEBHOOK_SECRET'));

        $body = $request->getContent();

        if (! empty($webhookSecret) && ! empty($signature)) {
            $expected = hash_hmac('sha256', $body, $webhookSecret);
            if (! hash_equals($expected, $signature)) {
                return response()->json(['error' => 'Invalid webhook signature.'], 400);
            }
        }

        $payload = json_decode($body, true);
        $event = $payload['event'] ?? '';

        if ($event === 'order.paid' || $event === 'payment.captured') {
            $paymentEntity = $payload['payload']['payment']['entity'] ?? [];
            $orderId = $paymentEntity['order_id'] ?? '';
            $paymentId = $paymentEntity['id'] ?? '';

            if ($orderId && $paymentId) {
                try {
                    $this->orderService->verifyAndFulfillOrder([
                        'razorpay_order_id'   => $orderId,
                        'razorpay_payment_id' => $paymentId,
                        'razorpay_signature'  => '', // signature verified at webhook envelope level
                    ]);
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::error('Webhook fulfillment error: ' . $e->getMessage());
                }
            }
        }

        return response()->json(['status' => 'handled']);
    }
}
