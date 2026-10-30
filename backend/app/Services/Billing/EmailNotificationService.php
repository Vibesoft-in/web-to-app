<?php

declare(strict_types=1);

namespace App\Services\Billing;

use App\Models\CustomFeatureRequest;
use App\Models\EmailLog;
use App\Models\Order;
use App\Models\PackageUpgrade;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class EmailNotificationService
{
    private string $adminEmail;
    private string $fromAddress;
    private string $fromName;

    public function __construct()
    {
        $this->adminEmail = config('services.admin_notification_email', env('ADMIN_NOTIFICATION_EMAIL', 'admin@webintoapp.com'));
        $this->fromAddress = config('mail.from.address', 'noreply@webintoapp.com');
        $this->fromName = config('mail.from.name', 'AppifyHub');
    }

    /**
     * A. Payment Successful Email
     */
    public function sendPaymentSuccessEmail(Order $order, string $transactionId): void
    {
        $user = $order->user;
        if (! $user && ! $order->billing_email) {
            return;
        }

        $recipientEmail = $order->billing_email ?: $user->email;
        $recipientName = $order->billing_name ?: ($user?->name ?? 'Valued Customer');
        $subject = "Payment Confirmed! Your Order #{$order->order_number} is Complete - AppifyHub";

        $itemsHtml = '';
        foreach ($order->items as $item) {
            $formattedPrice = '₹' . number_format($item->total_price / 100);
            $itemsHtml .= "
                <tr>
                    <td style='padding: 10px 0; border-bottom: 1px solid #F0EAE1;'>
                        <strong style='color: #2D241E;'>{$item->name}</strong>
                        <div style='font-size: 12px; color: #8A7A6D;'>{$item->description}</div>
                    </td>
                    <td style='padding: 10px 0; border-bottom: 1px solid #F0EAE1; text-align: right; font-weight: bold; color: #2D241E;'>
                        {$formattedPrice}
                    </td>
                </tr>";
        }

        $formattedTotal = '₹' . number_format($order->total_amount / 100);
        $dateFormatted = ($order->paid_at ?? now())->format('d M Y, h:i A T');
        $dashboardUrl = url('/dashboard');

        $html = $this->wrapLayout("
            <h2 style='color: #2D241E; margin-top: 0; font-size: 22px;'>Thank You for Your Order!</h2>
            <p style='color: #5A4A3E; font-size: 15px; line-height: 1.5;'>
                Hi <strong>{$recipientName}</strong>,<br>
                Your payment has been successfully processed and verified. Your mobile application package and features are now fully unlocked!
            </p>

            <div style='background-color: #FAF7F2; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #EFE8DC;'>
                <table style='width: 100%; border-collapse: collapse; font-size: 14px;'>
                    <tr>
                        <td style='color: #8A7A6D; padding-bottom: 8px;'>Order Number:</td>
                        <td style='text-align: right; font-weight: bold; color: #2D241E; font-family: monospace;'>{$order->order_number}</td>
                    </tr>
                    <tr>
                        <td style='color: #8A7A6D; padding-bottom: 8px;'>Transaction ID:</td>
                        <td style='text-align: right; font-weight: bold; color: #2D241E; font-family: monospace;'>{$transactionId}</td>
                    </tr>
                    <tr>
                        <td style='color: #8A7A6D; padding-bottom: 8px;'>Payment Date:</td>
                        <td style='text-align: right; color: #2D241E;'>{$dateFormatted}</td>
                    </tr>
                    <tr>
                        <td style='color: #8A7A6D; padding-bottom: 8px;'>Payment Status:</td>
                        <td style='text-align: right; font-weight: bold; color: #16A34A;'>Successful &bull; Verified</td>
                    </tr>
                </table>
            </div>

            <h3 style='color: #2D241E; font-size: 16px; margin-bottom: 12px;'>Order Summary</h3>
            <table style='width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;'>
                {$itemsHtml}
                <tr>
                    <td style='padding: 16px 0 8px 0; font-weight: bold; font-size: 16px; color: #2D241E;'>Total Amount Paid:</td>
                    <td style='padding: 16px 0 8px 0; text-align: right; font-weight: 800; font-size: 18px; color: #78593D;'>{$formattedTotal}</td>
                </tr>
            </table>

            <div style='text-align: center; margin: 32px 0;'>
                <a href='{$dashboardUrl}' style='display: inline-block; background-color: #78593D; color: #FFFFFF; padding: 14px 28px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 14px; box-shadow: 0 4px 12px rgba(120, 89, 61, 0.25);'>
                    Access Your Dashboard &amp; App &rarr;
                </a>
            </div>

            <p style='color: #8A7A6D; font-size: 13px; line-height: 1.5;'>
                You can download your compiled mobile APK/AAB builds, manage store product sync, and customize branding anytime directly from your dashboard.
            </p>
        ");

        $this->dispatchEmail($recipientEmail, $recipientName, $subject, 'payment_success', $html, $order->id);

        // Also trigger Admin Notification
        $this->sendAdminNewOrderNotification($order, $transactionId);
    }

    /**
     * B. Payment Failed Email
     */
    public function sendPaymentFailedEmail(Order $order, string $reason = 'Payment was declined or cancelled by bank.'): void
    {
        $user = $order->user;
        $recipientEmail = $order->billing_email ?: ($user?->email ?? '');
        $recipientName = $order->billing_name ?: ($user?->name ?? 'Customer');
        if (! $recipientEmail) {
            return;
        }

        $subject = "Payment Failed for Order #{$order->order_number} - Action Required";
        $formattedTotal = '₹' . number_format($order->total_amount / 100);
        $retryUrl = url('/pricing?retry_order=' . $order->order_number);

        $html = $this->wrapLayout("
            <h2 style='color: #DC2626; margin-top: 0; font-size: 22px;'>Payment Unsuccessful</h2>
            <p style='color: #5A4A3E; font-size: 15px; line-height: 1.5;'>
                Hi <strong>{$recipientName}</strong>,<br>
                We were unable to process your payment of <strong>{$formattedTotal}</strong> for Order <strong>#{$order->order_number}</strong>.
            </p>

            <div style='background-color: #FEF2F2; border-radius: 12px; padding: 16px 20px; margin: 20px 0; border: 1px solid #FEE2E2;'>
                <strong style='color: #991B1B; font-size: 14px;'>Reason:</strong>
                <p style='color: #B91C1C; margin: 6px 0 0 0; font-size: 13px;'>{$reason}</p>
            </div>

            <p style='color: #5A4A3E; font-size: 14px;'>
                No funds were deducted from your account. If any amount was reserved, your issuing bank will automatically release it.
            </p>

            <div style='text-align: center; margin: 28px 0;'>
                <a href='{$retryUrl}' style='display: inline-block; background-color: #78593D; color: #FFFFFF; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 14px;'>
                    Retry Payment Securely &rarr;
                </a>
            </div>
        ");

        $this->dispatchEmail($recipientEmail, $recipientName, $subject, 'payment_failed', $html, $order->id);
    }

    /**
     * C. Pending Payment Notification
     */
    public function sendPendingPaymentNotification(Order $order): void
    {
        $user = $order->user;
        $recipientEmail = $order->billing_email ?: ($user?->email ?? '');
        $recipientName = $order->billing_name ?: ($user?->name ?? 'Customer');
        if (! $recipientEmail) {
            return;
        }

        // Avoid duplicate pending emails
        $alreadySent = EmailLog::where('related_order_id', $order->id)
            ->where('type', 'pending_payment')
            ->exists();
        if ($alreadySent) {
            return;
        }

        $subject = "Your Order #{$order->order_number} is Awaiting Payment - AppifyHub";
        $formattedTotal = '₹' . number_format($order->total_amount / 100);
        $payUrl = url('/pricing?order=' . $order->order_number);

        $html = $this->wrapLayout("
            <h2 style='color: #D97706; margin-top: 0; font-size: 22px;'>Order Awaiting Payment</h2>
            <p style='color: #5A4A3E; font-size: 15px; line-height: 1.5;'>
                Hi <strong>{$recipientName}</strong>,<br>
                Your order <strong>#{$order->order_number}</strong> for <strong>{$formattedTotal}</strong> has been registered and is waiting for payment confirmation.
            </p>

            <div style='text-align: center; margin: 28px 0;'>
                <a href='{$payUrl}' style='display: inline-block; background-color: #78593D; color: #FFFFFF; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 14px;'>
                    Complete Your Purchase &rarr;
                </a>
            </div>
        ");

        $this->dispatchEmail($recipientEmail, $recipientName, $subject, 'pending_payment', $html, $order->id);
    }

    /**
     * D. Package Upgrade Email
     */
    public function sendPackageUpgradeEmail(PackageUpgrade $upgrade, Order $order, string $transactionId): void
    {
        $user = $order->user;
        $recipientEmail = $order->billing_email ?: ($user?->email ?? '');
        $recipientName = $order->billing_name ?: ($user?->name ?? 'Customer');
        if (! $recipientEmail) {
            return;
        }

        $fromPlan = $upgrade->fromPackage?->name ?? 'Basic';
        $toPlan = $upgrade->toPackage?->name ?? 'Pro';
        $diffPaidFormatted = '₹' . number_format($upgrade->difference_paid / 100);

        $subject = "Upgrade Confirmed: Welcome to {$toPlan}! - AppifyHub";

        $unlockedFeatures = match ($toPlan) {
            'Premium' => 'Google Play .AAB bundles, Dedicated Admin Panel Access, WhatsApp Automation, VIP 1-Year SLA.',
            'Pro'     => 'Google Play .AAB bundles, Pro customization engine, Wishlist, Priority Support.',
            default   => 'Additional compilation quota and advanced store features.',
        };

        $dashboardUrl = url('/dashboard');

        $html = $this->wrapLayout("
            <h2 style='color: #2D241E; margin-top: 0; font-size: 22px;'>Package Upgrade Successful!</h2>
            <p style='color: #5A4A3E; font-size: 15px; line-height: 1.5;'>
                Hi <strong>{$recipientName}</strong>,<br>
                You have successfully upgraded your mobile app from <strong>{$fromPlan}</strong> to <strong>{$toPlan}</strong>!
            </p>

            <div style='background-color: #FAF7F2; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #EFE8DC;'>
                <table style='width: 100%; border-collapse: collapse; font-size: 14px;'>
                    <tr>
                        <td style='color: #8A7A6D; padding-bottom: 6px;'>Previous Plan:</td>
                        <td style='text-align: right; color: #2D241E;'>{$fromPlan}</td>
                    </tr>
                    <tr>
                        <td style='color: #8A7A6D; padding-bottom: 6px;'>Upgraded Plan:</td>
                        <td style='text-align: right; font-weight: bold; color: #78593D;'>{$toPlan}</td>
                    </tr>
                    <tr>
                        <td style='color: #8A7A6D; padding-bottom: 6px;'>Price Difference Paid:</td>
                        <td style='text-align: right; font-weight: bold; color: #16A34A;'>{$diffPaidFormatted}</td>
                    </tr>
                    <tr>
                        <td style='color: #8A7A6D;'>Transaction ID:</td>
                        <td style='text-align: right; font-family: monospace; color: #2D241E;'>{$transactionId}</td>
                    </tr>
                </table>
            </div>

            <div style='background-color: #F0FDF4; border-radius: 12px; padding: 16px; margin-bottom: 24px; border: 1px solid #DCFCE7;'>
                <strong style='color: #166534; font-size: 14px;'>Newly Unlocked Entitlements:</strong>
                <p style='color: #15803D; font-size: 13px; margin: 4px 0 0 0;'>{$unlockedFeatures}</p>
            </div>

            <div style='text-align: center; margin: 28px 0;'>
                <a href='{$dashboardUrl}' style='display: inline-block; background-color: #78593D; color: #FFFFFF; padding: 12px 28px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 14px;'>
                    Open Upgraded App in Dashboard &rarr;
                </a>
            </div>
        ");

        $this->dispatchEmail($recipientEmail, $recipientName, $subject, 'package_upgrade', $html, $order->id);
    }

    /**
     * E1. Custom Feature Quote Sent Email
     */
    public function sendCustomQuoteEmail(CustomFeatureRequest $request): void
    {
        $user = $request->user;
        if (! $user) {
            return;
        }

        $formattedPrice = '₹' . number_format(($request->quoted_price ?? 0) / 100);
        $subject = "Quote Ready: Your Custom Feature Request #{$request->ticket_number} - AppifyHub";
        $reviewUrl = url('/dashboard?tab=addons&ticket=' . $request->ticket_number);

        $html = $this->wrapLayout("
            <h2 style='color: #2D241E; margin-top: 0; font-size: 22px;'>Custom Development Quote</h2>
            <p style='color: #5A4A3E; font-size: 15px; line-height: 1.5;'>
                Hi <strong>{$user->name}</strong>,<br>
                Our engineering team has reviewed your custom feature request <strong>&quot;{$request->feature_name}&quot;</strong> (Ticket #{$request->ticket_number}).
            </p>

            <div style='background-color: #FAF7F2; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #EFE8DC;'>
                <table style='width: 100%; border-collapse: collapse; font-size: 14px;'>
                    <tr>
                        <td style='color: #8A7A6D; padding-bottom: 8px;'>Feature Name:</td>
                        <td style='text-align: right; font-weight: bold; color: #2D241E;'>{$request->feature_name}</td>
                    </tr>
                    <tr>
                        <td style='color: #8A7A6D; padding-bottom: 8px;'>Estimated Price:</td>
                        <td style='text-align: right; font-weight: 800; font-size: 18px; color: #78593D;'>{$formattedPrice}</td>
                    </tr>
                    <tr>
                        <td style='color: #8A7A6D; padding-bottom: 8px;'>Admin Notes:</td>
                        <td style='text-align: right; color: #5A4A3E;'>{$request->admin_notes}</td>
                    </tr>
                </table>
            </div>

            <p style='color: #5A4A3E; font-size: 14px;'>
                You can review this quote, accept it, or request adjustments directly from your customer dashboard. You will not be charged until you approve and proceed to payment.
            </p>

            <div style='text-align: center; margin: 28px 0;'>
                <a href='{$reviewUrl}' style='display: inline-block; background-color: #78593D; color: #FFFFFF; padding: 12px 28px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 14px;'>
                    Review &amp; Accept Quote &rarr;
                </a>
            </div>
        ");

        $this->dispatchEmail($user->email, $user->name, $subject, 'custom_quote', $html, $request->order_id);
    }

    /**
     * F. Refund Notification Email
     */
    public function sendRefundEmail(Order $order, int $refundAmount, string $refundReference): void
    {
        $user = $order->user;
        $recipientEmail = $order->billing_email ?: ($user?->email ?? '');
        $recipientName = $order->billing_name ?: ($user?->name ?? 'Customer');
        if (! $recipientEmail) {
            return;
        }

        $formattedRefund = '₹' . number_format($refundAmount / 100);
        $subject = "Refund Issued for Order #{$order->order_number} - AppifyHub";

        $html = $this->wrapLayout("
            <h2 style='color: #2D241E; margin-top: 0; font-size: 22px;'>Refund Confirmation</h2>
            <p style='color: #5A4A3E; font-size: 15px; line-height: 1.5;'>
                Hi <strong>{$recipientName}</strong>,<br>
                A refund of <strong>{$formattedRefund}</strong> has been processed for Order <strong>#{$order->order_number}</strong>.
            </p>

            <div style='background-color: #FAF7F2; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #EFE8DC;'>
                <table style='width: 100%; font-size: 14px;'>
                    <tr>
                        <td style='color: #8A7A6D;'>Refund Reference:</td>
                        <td style='text-align: right; font-family: monospace; color: #2D241E;'>{$refundReference}</td>
                    </tr>
                    <tr>
                        <td style='color: #8A7A6D;'>Refund Amount:</td>
                        <td style='text-align: right; font-weight: bold; color: #16A34A;'>{$formattedRefund}</td>
                    </tr>
                </table>
            </div>

            <p style='color: #8A7A6D; font-size: 13px;'>
                The funds will reflect in your original payment method (bank account, card, or UPI) within 5-7 business days depending on your bank.
            </p>
        ");

        $this->dispatchEmail($recipientEmail, $recipientName, $subject, 'refund', $html, $order->id);
    }

    /**
     * G. Admin Notification: New Paid Order Alert
     */
    public function sendAdminNewOrderNotification(Order $order, string $transactionId): void
    {
        $subject = "[ADMIN ALERT] New Paid Order #{$order->order_number} ({$order->formatted_total})";
        $adminUrl = url('/dashboard/admin?tab=orders');

        $customerName = $order->billing_name ?: ($order->user?->name ?? 'Unknown');
        $customerEmail = $order->billing_email ?: ($order->user?->email ?? 'Unknown');

        $html = $this->wrapLayout("
            <h2 style='color: #78593D; margin-top: 0; font-size: 20px;'>New Order Paid Successfully</h2>
            <p style='font-size: 14px; color: #4B3B2F;'>
                A customer has completed payment for an order on the platform:
            </p>
            <ul style='font-size: 14px; color: #2D241E; line-height: 1.6;'>
                <li><strong>Order Number:</strong> {$order->order_number}</li>
                <li><strong>Customer:</strong> {$customerName} ({$customerEmail})</li>
                <li><strong>Order Type:</strong> {$order->order_type}</li>
                <li><strong>Total Amount:</strong> {$order->formatted_total}</li>
                <li><strong>Transaction ID:</strong> {$transactionId}</li>
                <li><strong>App:</strong> " . ($order->app?->name ?? 'Standalone') . "</li>
            </ul>

            <div style='margin-top: 24px;'>
                <a href='{$adminUrl}' style='display: inline-block; background-color: #2D241E; color: #FFFFFF; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: bold;'>
                    View in Admin Panel &rarr;
                </a>
            </div>
        ");

        $this->dispatchEmail($this->adminEmail, 'Super Admin', $subject, 'admin_alert', $html, $order->id);
    }

    /**
     * Core Dispatcher: sends email and creates audit log in email_logs
     */
    private function dispatchEmail(
        string $toEmail,
        string $toName,
        string $subject,
        string $type,
        string $htmlContent,
        ?int $orderId = null,
        array $meta = []
    ): void {
        try {
            Mail::html($htmlContent, function ($message) use ($toEmail, $toName, $subject) {
                $message->from($this->fromAddress, $this->fromName)
                    ->to($toEmail, $toName)
                    ->subject($subject);
            });

            EmailLog::create([
                'recipient_email'  => $toEmail,
                'recipient_name'   => $toName,
                'subject'          => $subject,
                'type'             => $type,
                'related_order_id' => $orderId,
                'status'           => 'sent',
                'meta'             => array_merge($meta, ['dispatched_at' => now()->toIso8601String()]),
            ]);

            Log::info("Email [{$type}] successfully sent to {$toEmail}");
        } catch (\Throwable $e) {
            Log::error("Failed to send [{$type}] email to {$toEmail}: " . $e->getMessage());

            EmailLog::create([
                'recipient_email'  => $toEmail,
                'recipient_name'   => $toName,
                'subject'          => $subject,
                'type'             => $type,
                'related_order_id' => $orderId,
                'status'           => 'failed',
                'error_message'    => $e->getMessage(),
                'meta'             => $meta,
            ]);
        }
    }

    /**
     * Wraps inner HTML in a modern, responsive email container.
     */
    private function wrapLayout(string $content): string
    {
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='utf-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>AppifyHub</title>
        </head>
        <body style='margin: 0; padding: 0; background-color: #F5F1EB; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif;'>
            <table width='100%' cellpadding='0' cellspacing='0' style='background-color: #F5F1EB; padding: 30px 15px;'>
                <tr>
                    <td align='center'>
                        <table width='100%' cellpadding='0' cellspacing='0' style='max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);'>
                            <!-- Header -->
                            <tr>
                                <td style='background-color: #2D241E; padding: 24px 32px; text-align: left;'>
                                    <table width='100%' cellpadding='0' cellspacing='0'>
                                        <tr>
                                            <td>
                                                <span style='color: #FFFFFF; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;'>AppifyHub</span>
                                                <span style='display: block; color: #C2A88F; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 2px;'>Website to Mobile App</span>
                                            </td>
                                            <td style='text-align: right;'>
                                                <span style='display: inline-block; background-color: rgba(255,255,255,0.1); color: #E8DFD8; font-size: 11px; padding: 4px 10px; border-radius: 9999px;'>Official Order Notice</span>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <!-- Body -->
                            <tr>
                                <td style='padding: 32px;'>
                                    {$content}
                                </td>
                            </tr>
                            <!-- Footer -->
                            <tr>
                                <td style='background-color: #FAF7F2; padding: 20px 32px; border-top: 1px solid #EFE8DC; text-align: center; color: #8A7A6D; font-size: 12px; line-height: 1.5;'>
                                    <p style='margin: 0 0 6px 0;'>&copy; " . date('Y') . " AppifyHub. All rights reserved.</p>
                                    <p style='margin: 0;'>Need help with your app or order? Contact our VIP support team at <a href='mailto:support@webintoapp.com' style='color: #78593D; text-decoration: none; font-weight: bold;'>support@webintoapp.com</a></p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>";
    }
}
