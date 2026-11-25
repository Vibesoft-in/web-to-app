<?php

declare(strict_types=1);

namespace App\Services\Billing;

use App\Models\App;
use App\Models\Build;
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
        $this->fromAddress = config('mail.from.address', 'noreply@livaan.in');
        $this->fromName = config('mail.from.name', 'WebIntoApp');
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
     * H. Registration OTP Email
     */
    public function sendRegistrationOtpEmail(string $recipientEmail, string $recipientName, string $otp): void
    {
        if (empty($recipientEmail)) {
            return;
        }

        $subject = "Your WebIntoApp Verification Code: {$otp}";

        $html = $this->wrapLayout("
            <h2 style='color: #2D241E; margin-top: 0; font-size: 22px; font-weight: 800;'>Verify Your Email Address</h2>
            <p style='color: #5A4A3E; font-size: 15px; line-height: 1.6;'>
                Hi <strong>{$recipientName}</strong>,<br>
                Thank you for signing up with <strong>WebIntoApp</strong>! To verify your email and activate your account, please enter the one-time verification code below:
            </p>

            <div style='background-color: #FAF7F2; border: 2px dashed #78593D; border-radius: 14px; padding: 24px; text-align: center; margin: 28px 0;'>
                <div style='font-size: 12px; color: #8A7A6D; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 8px;'>
                    Your 6-Digit One-Time Password (OTP)
                </div>
                <div style='font-size: 40px; font-weight: 900; letter-spacing: 10px; color: #78593D; font-family: -apple-system, BlinkMacSystemFont, \"SF Mono\", Monaco, monospace;'>
                    {$otp}
                </div>
                <div style='font-size: 12px; color: #8A7A6D; margin-top: 10px;'>
                    ⏱ Valid for <strong>15 minutes</strong> &bull; Please do not share this code with anyone.
                </div>
            </div>

            <p style='color: #5A4A3E; font-size: 14px; line-height: 1.5;'>
                Once verified, you will immediately have full access to convert your store or website into high-performance native Android &amp; iOS mobile applications.
            </p>

            <p style='color: #8A7A6D; font-size: 12px; line-height: 1.5; margin-top: 24px;'>
                If you did not request this verification code, you can safely disregard this email.
            </p>
        ");

        $this->dispatchEmail($recipientEmail, $recipientName, $subject, 'registration_otp', $html);
    }

    /**
     * Password Reset Notification Email
     */
    public function sendPasswordResetEmail(string $recipientEmail, string $recipientName, string $resetUrl, ?string $otp = null): void
    {
        if (empty($recipientEmail)) {
            return;
        }

        $subject = $otp ? "Your WebIntoApp Password Reset Code: {$otp}" : "Reset Your WebIntoApp Password";

        $otpBlock = $otp ? "
            <div style='background-color: #FAF7F2; border: 2px dashed #78593D; border-radius: 14px; padding: 24px; text-align: center; margin: 28px 0;'>
                <div style='font-size: 12px; color: #8A7A6D; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 8px;'>
                    Your 6-Digit Password Reset Code (OTP)
                </div>
                <div style='font-size: 40px; font-weight: 900; letter-spacing: 10px; color: #78593D; font-family: -apple-system, BlinkMacSystemFont, \"SF Mono\", Monaco, monospace;'>
                    {$otp}
                </div>
                <div style='font-size: 12px; color: #8A7A6D; margin-top: 10px;'>
                    ⏱ Valid for <strong>15 minutes</strong> &bull; Enter this code or click the button below.
                </div>
            </div>
        " : "";

        $html = $this->wrapLayout("
            <h2 style='color: #2D241E; margin-top: 0; font-size: 22px; font-weight: 800;'>Password Reset Request</h2>
            <p style='color: #5A4A3E; font-size: 15px; line-height: 1.6;'>
                Hi <strong>{$recipientName}</strong>,<br>
                We received a request to reset your password for your <strong>WebIntoApp</strong> account. Enter the 6-digit verification code below or click the button to set a new password:
            </p>

            {$otpBlock}

            <div style='text-align: center; margin: 32px 0;'>
                <a href='{$resetUrl}' style='display: inline-block; background-color: #78593D; color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(120, 89, 61, 0.25);'>
                    Reset My Password Directly
                </a>
            </div>

            <div style='background-color: #FAF7F2; border-left: 4px solid #78593D; border-radius: 8px; padding: 16px; margin: 24px 0;'>
                <div style='font-size: 12px; color: #5A4A3E; line-height: 1.5;'>
                    ⏱ This link and code are valid for <strong>15 minutes</strong>.<br>
                    If the button above does not work, copy and paste this URL into your browser:<br>
                    <a href='{$resetUrl}' style='color: #78593D; word-break: break-all; font-size: 11px;'>{$resetUrl}</a>
                </div>
            </div>

            <p style='color: #8A7A6D; font-size: 12px; line-height: 1.5; margin-top: 24px;'>
                If you did not request a password reset, no further action is required. Your account remains completely secure.
            </p>
        ");

        $this->dispatchEmail($recipientEmail, $recipientName, $subject, 'password_reset', $html);
    }

    /**
     * I. Build Succeeded Notification Email
     */
    public function sendBuildSuccessEmail(App $app, Build $build): void
    {
        $tenant = $app->tenant;
        $user = $tenant?->owner ?? $tenant?->users()->first();
        $recipientEmail = $user?->email;
        $recipientName = $user?->name ?? 'Valued Customer';

        if (! $recipientEmail) {
            return;
        }

        $versionStr = $build->version_name ? "v{$build->version_name}" : "v1.0.{$build->version_code}";
        $subject = "🎉 Your Mobile App is Ready! {$app->name} ({$versionStr}) - WebIntoApp";

        $appUrl = url("/dashboard/apps/{$app->ulid}");
        $apkDownloadUrl = url("/api/apps/{$app->ulid}/builds/{$build->id}/download?format=apk");
        $aabDownloadUrl = url("/api/apps/{$app->ulid}/builds/{$build->id}/download?format=aab");
        $finishedDate = ($build->finished_at ?? now())->format('d M Y, h:i A T');
        $platformName = $app->platform instanceof \BackedEnum ? $app->platform->value : (string) $app->platform;

        $html = $this->wrapLayout("
            <div style='text-align: center; margin-bottom: 20px;'>
                <span style='background-color: #ECFDF5; color: #047857; font-size: 12px; font-weight: 800; padding: 4px 14px; border-radius: 9999px; border: 1px solid #A7F3D0; text-transform: uppercase;'>
                    Build Succeeded &bull; Ready to Install
                </span>
            </div>

            <h2 style='color: #2D241E; margin-top: 0; font-size: 22px; font-weight: 800; text-align: center;'>
                Your Mobile App is Ready to Download!
            </h2>
            <p style='color: #5A4A3E; font-size: 15px; line-height: 1.6; text-align: center;'>
                Hi <strong>{$recipientName}</strong>,<br>
                Awesome news! The build runner has successfully compiled and cryptographically signed your mobile application <strong>{$app->name}</strong>.
            </p>

            <div style='background-color: #FAF7F2; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #EFE8DC;'>
                <table style='width: 100%; border-collapse: collapse; font-size: 14px;'>
                    <tr>
                        <td style='color: #8A7A6D; padding-bottom: 8px;'>App Name:</td>
                        <td style='text-align: right; font-weight: bold; color: #2D241E;'>{$app->name}</td>
                    </tr>
                    <tr>
                        <td style='color: #8A7A6D; padding-bottom: 8px;'>Package ID:</td>
                        <td style='text-align: right; font-family: monospace; color: #2D241E;'>{$app->package_name}</td>
                    </tr>
                    <tr>
                        <td style='color: #8A7A6D; padding-bottom: 8px;'>Version:</td>
                        <td style='text-align: right; font-weight: bold; color: #78593D;'>{$versionStr} (Build #{$build->version_code})</td>
                    </tr>
                    <tr>
                        <td style='color: #8A7A6D; padding-bottom: 8px;'>Platform Backend:</td>
                        <td style='text-align: right; color: #2D241E; text-transform: capitalize;'>{$platformName}</td>
                    </tr>
                    <tr>
                        <td style='color: #8A7A6D;'>Completed At:</td>
                        <td style='text-align: right; color: #2D241E;'>{$finishedDate}</td>
                    </tr>
                </table>
            </div>

            <h3 style='color: #2D241E; font-size: 15px; margin: 24px 0 12px 0;'>Download Packages:</h3>
            <table width='100%' cellpadding='0' cellspacing='0' style='margin-bottom: 24px;'>
                <tr>
                    <td style='padding: 6px;'>
                        <a href='{$apkDownloadUrl}' style='display: block; text-align: center; background-color: #78593D; color: #FFFFFF; padding: 12px 20px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 13px;'>
                            📥 Download Android APK (Direct Install)
                        </a>
                    </td>
                </tr>
                <tr>
                    <td style='padding: 6px;'>
                        <a href='{$aabDownloadUrl}' style='display: block; text-align: center; background-color: #2D241E; color: #FFFFFF; padding: 12px 20px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 13px;'>
                            📦 Download Google Play AAB (Store Bundle)
                        </a>
                    </td>
                </tr>
            </table>

            <div style='background-color: #EFF6FF; border-radius: 10px; padding: 14px 18px; border: 1px solid #DBEAFE; margin-bottom: 24px;'>
                <strong style='color: #1E40AF; font-size: 13px;'>💡 Quick Testing Tip:</strong>
                <p style='color: #1E3A8A; font-size: 12px; margin: 4px 0 0 0; line-height: 1.5;'>
                    Download the APK file directly onto your Android device, allow 'Install from Unknown Sources' in settings, and experience your native app live!
                </p>
            </div>

            <div style='text-align: center; margin: 28px 0;'>
                <a href='{$appUrl}' style='color: #78593D; font-weight: bold; text-decoration: underline; font-size: 14px;'>
                    Open in WebIntoApp Dashboard &rarr;
                </a>
            </div>
        ");

        $this->dispatchEmail($recipientEmail, $recipientName, $subject, 'build_success', $html, null, [
            'app_id'     => $app->id,
            'build_id'   => $build->id,
            'app_name'   => $app->name,
            'version'    => $versionStr,
        ]);
    }

    /**
     * J. Build Failed Notification Email
     */
    public function sendBuildFailedEmail(App $app, Build $build, string $errorMessage): void
    {
        $tenant = $app->tenant;
        $user = $tenant?->owner ?? $tenant?->users()->first();
        $recipientEmail = $user?->email;
        $recipientName = $user?->name ?? 'Valued Customer';

        if (! $recipientEmail) {
            return;
        }

        $versionStr = $build->version_name ? "v{$build->version_name}" : "v1.0.{$build->version_code}";
        $subject = "⚠️ Build Error: Compilation Issue for {$app->name} - WebIntoApp";

        $retryUrl = url("/dashboard/apps/{$app->ulid}/setup/build");
        $sanitizedError = htmlspecialchars(mb_strimwidth($errorMessage, 0, 800, '...'));

        $html = $this->wrapLayout("
            <div style='text-align: center; margin-bottom: 20px;'>
                <span style='background-color: #FEF2F2; color: #DC2626; font-size: 12px; font-weight: 800; padding: 4px 14px; border-radius: 9999px; border: 1px solid #FEE2E2; text-transform: uppercase;'>
                    Build Failed &bull; Action Required
                </span>
            </div>

            <h2 style='color: #DC2626; margin-top: 0; font-size: 22px; font-weight: 800; text-align: center;'>
                We Encountered a Problem Building Your App
            </h2>
            <p style='color: #5A4A3E; font-size: 15px; line-height: 1.6;'>
                Hi <strong>{$recipientName}</strong>,<br>
                During the automated compilation process for <strong>{$app->name}</strong> ({$versionStr}), the build engine reported an error:
            </p>

            <div style='background-color: #FEF2F2; border-radius: 12px; padding: 18px 20px; margin: 20px 0; border: 1px solid #FEE2E2;'>
                <strong style='color: #991B1B; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;'>Error Diagnostics:</strong>
                <pre style='color: #B91C1C; margin: 8px 0 0 0; font-size: 12px; white-space: pre-wrap; font-family: monospace; word-break: break-all;'>{$sanitizedError}</pre>
            </div>

            <h3 style='color: #2D241E; font-size: 15px; margin: 20px 0 10px 0;'>Recommended Troubleshooting Steps:</h3>
            <ul style='color: #5A4A3E; font-size: 14px; line-height: 1.6; padding-left: 20px; margin: 0 0 24px 0;'>
                <li>Verify your store website is accessible and WooCommerce / Shopify API credentials have read/write access.</li>
                <li>Ensure custom app icons and splash assets are square 512x512 PNG files without transparency issues.</li>
                <li>Check your app package identifier syntax (e.g. <code>com.yourstore.app</code>).</li>
            </ul>

            <div style='text-align: center; margin: 28px 0;'>
                <a href='{$retryUrl}' style='display: inline-block; background-color: #78593D; color: #FFFFFF; padding: 12px 28px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 14px; box-shadow: 0 4px 12px rgba(120, 89, 61, 0.25);'>
                    Retry Build Now in Dashboard &rarr;
                </a>
            </div>

            <p style='color: #8A7A6D; font-size: 13px; line-height: 1.5; text-align: center;'>
                Need assistance? Our engineering support team is here to help. You can reply directly to this email or reach us at <a href='mailto:seo.vibesoft@gmail.com' style='color: #78593D; font-weight: bold;'>seo.vibesoft@gmail.com</a>.
            </p>
        ");

        $this->dispatchEmail($recipientEmail, $recipientName, $subject, 'build_failed', $html, null, [
            'app_id'     => $app->id,
            'build_id'   => $build->id,
            'error'      => $errorMessage,
        ]);
    }

    /**
     * K. Account Blocked / Login Attempt on Suspended Account Email
     */
    public function sendAccountBlockedLoginAttemptEmail(
        string $recipientEmail,
        string $recipientName = 'User',
        ?string $reason = null,
        ?string $ip = null
    ): void {
        $subject = "Security Notice: Login Attempt on Suspended Account - WebIntoApp";
        $dateFormatted = now()->format('d M Y, h:i A T');
        $ipString = $ip ?: request()->ip() ?: 'Unknown IP';
        $reasonBlock = $reason
            ? "<div style='background-color: #FEF2F2; border-left: 4px solid #DC2626; padding: 12px 16px; margin: 16px 0; border-radius: 4px;'>
                <strong style='color: #991B1B; font-size: 13px; text-transform: uppercase;'>Administrative Reason:</strong>
                <p style='color: #B91C1C; margin: 6px 0 0 0; font-size: 14px;'>{$reason}</p>
               </div>"
            : "";

        $html = $this->wrapLayout("
            <div style='background-color: #FEE2E2; border-radius: 12px; padding: 16px; margin-bottom: 20px; border: 1px solid #FECACA; text-align: center;'>
                <span style='color: #DC2626; font-size: 24px; font-weight: bold;'>&#9888;</span>
                <h2 style='color: #991B1B; margin: 8px 0 4px 0; font-size: 20px; font-weight: 800;'>Account Access Suspended</h2>
                <p style='color: #B91C1C; margin: 0; font-size: 13px;'>A login attempt was detected and rejected by security policies.</p>
            </div>

            <p style='color: #5A4A3E; font-size: 15px; line-height: 1.6;'>
                Hi <strong>{$recipientName}</strong>,<br>
                A sign-in or authorization attempt was recently detected for your account (<strong>{$recipientEmail}</strong>).
            </p>

            <p style='color: #5A4A3E; font-size: 14px; line-height: 1.6;'>
                Your email address and user account have been <strong>suspended by the Super Administrator</strong>. While suspended, login sessions are blocked and access to mobile app builds, store synchronizations, and API credentials is disabled.
            </p>

            {$reasonBlock}

            <div style='background-color: #FAF7F2; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #EFE8DC;'>
                <table style='width: 100%; border-collapse: collapse; font-size: 13px;'>
                    <tr>
                        <td style='color: #8A7A6D; padding-bottom: 6px;'>Attempted Action:</td>
                        <td style='text-align: right; font-weight: bold; color: #DC2626;'>User Sign-In / Authentication</td>
                    </tr>
                    <tr>
                        <td style='color: #8A7A6D; padding-bottom: 6px;'>Date &amp; Time:</td>
                        <td style='text-align: right; color: #2D241E;'>{$dateFormatted}</td>
                    </tr>
                    <tr>
                        <td style='color: #8A7A6D;'>IP Address:</td>
                        <td style='text-align: right; font-family: monospace; color: #2D241E;'>{$ipString}</td>
                    </tr>
                </table>
            </div>

            <p style='color: #5A4A3E; font-size: 14px; line-height: 1.6;'>
                If you believe this suspension was made in error or wish to appeal the decision, please contact our administrative team directly at <a href='mailto:seo.vibesoft@gmail.com' style='color: #78593D; font-weight: bold;'>seo.vibesoft@gmail.com</a>.
            </p>
        ");

        $this->dispatchEmail($recipientEmail, $recipientName, $subject, 'account_blocked_login_attempt', $html, null, [
            'reason' => $reason,
            'ip'     => $ipString,
        ]);
    }

    /**
     * L. Subscription Revoked by Super Admin Email
     */
    public function sendSubscriptionRevokedEmail(
        string $recipientEmail,
        string $recipientName = 'Customer',
        string $planName = 'Active Plan',
        ?string $reason = null
    ): void {
        $subject = "Subscription Notice: {$planName} Plan Revoked - WebIntoApp";
        $dateFormatted = now()->format('d M Y, h:i A T');
        $reasonBlock = $reason
            ? "<div style='background-color: #FFFBEB; border-left: 4px solid #F59E0B; padding: 12px 16px; margin: 16px 0; border-radius: 4px;'>
                <strong style='color: #92400E; font-size: 13px;'>Administrative Reason:</strong>
                <p style='color: #B45309; margin: 6px 0 0 0; font-size: 14px;'>{$reason}</p>
               </div>"
            : "";

        $html = $this->wrapLayout("
            <h2 style='color: #2D241E; margin-top: 0; font-size: 20px;'>Subscription Access Update</h2>
            <p style='color: #5A4A3E; font-size: 15px; line-height: 1.6;'>
                Hi <strong>{$recipientName}</strong>,<br>
                This notice confirms that your <strong>{$planName}</strong> subscription has been <strong>revoked</strong> by the platform administrator as of <strong>{$dateFormatted}</strong>.
            </p>

            {$reasonBlock}

            <p style='color: #5A4A3E; font-size: 14px; line-height: 1.6;'>
                Remaining time and paid entitlements associated with this plan (including APK/AAB builds and active feature licenses) have been concluded. Your account applications have been reverted to the standard free tier.
            </p>

            <p style='color: #8A7A6D; font-size: 13px; line-height: 1.5;'>
                For billing inquiries, questions regarding refunds, or to upgrade to a new package, please visit your account dashboard or contact <a href='mailto:seo.vibesoft@gmail.com' style='color: #78593D; font-weight: bold;'>seo.vibesoft@gmail.com</a>.
            </p>
        ");

        $this->dispatchEmail($recipientEmail, $recipientName, $subject, 'subscription_revoked', $html, null, [
            'plan_name' => $planName,
            'reason'    => $reason,
        ]);
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
            <title>WebIntoApp</title>
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
                                                <span style='color: #FFFFFF; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;'>WebIntoApp</span>
                                                <span style='display: block; color: #C2A88F; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 2px;'>Website to Mobile App</span>
                                            </td>
                                            <td style='text-align: right;'>
                                                <span style='display: inline-block; background-color: rgba(255,255,255,0.1); color: #E8DFD8; font-size: 11px; padding: 4px 10px; border-radius: 9999px;'>Official Notification</span>
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
                                    <p style='margin: 0 0 6px 0;'>&copy; " . date('Y') . " WebIntoApp. All rights reserved.</p>
                                    <p style='margin: 0;'>Need help with your app or account? Contact our team at <a href='mailto:seo.vibesoft@gmail.com' style='color: #78593D; text-decoration: none; font-weight: bold;'>seo.vibesoft@gmail.com</a></p>
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
