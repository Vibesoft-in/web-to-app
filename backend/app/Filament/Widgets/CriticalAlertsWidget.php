<?php

declare(strict_types=1);

namespace App\Filament\Widgets;

use App\Models\Build;
use App\Models\CustomFeatureRequest;
use App\Models\PaymentTransaction;
use App\Models\Subscription;
use App\Models\User;
use Filament\Widgets\Widget;

class CriticalAlertsWidget extends Widget
{
    protected static string $view = 'filament.widgets.critical-alerts';
    protected static ?int $sort = 2;
    protected int | string | array $columnSpan = 'full';

    public function getAlerts(): array
    {
        $alerts = [];

        // 1. Failed Builds
        $failedBuildsCount = Build::withoutGlobalScopes()->where('status', 'failed')->count();
        if ($failedBuildsCount > 0) {
            $alerts[] = [
                'type' => 'danger',
                'title' => "Failed Android Builds ({$failedBuildsCount})",
                'message' => 'Recent app compilation or packaging jobs have failed. Check build logs and artifacts to resolve developer/keystore issues.',
                'action_label' => 'View Failed Builds',
                'action_url' => '/admin/builds?tableFilters[status][value]=failed',
                'icon' => 'heroicon-m-x-circle',
            ];
        }

        // 2. Payment Gateway Failures
        $failedTxCount = PaymentTransaction::where('status', 'failed')->count();
        if ($failedTxCount > 0) {
            $alerts[] = [
                'type' => 'danger',
                'title' => "Payment Gateway Failures ({$failedTxCount})",
                'message' => 'Customers encountered Razorpay transaction drops or signature errors. Review retry queue.',
                'action_label' => 'Review Orders',
                'action_url' => '/admin/orders?tableFilters[status][value]=failed',
                'icon' => 'heroicon-m-credit-card',
            ];
        }

        // 3. Expired Subscriptions
        $expiredSubsCount = Subscription::withoutGlobalScopes()
            ->where('status', 'expired')
            ->orWhere(function ($q) {
                $q->where('status', 'active')->where('ends_at', '<', now());
            })
            ->count();
        if ($expiredSubsCount > 0) {
            $alerts[] = [
                'type' => 'warning',
                'title' => "Expired Subscriptions ({$expiredSubsCount})",
                'message' => 'Tenant subscriptions have expired without automatic renewal. App builds may be restricted.',
                'action_label' => 'Manage Subscriptions',
                'action_url' => '/admin/subscriptions',
                'icon' => 'heroicon-m-clock',
            ];
        }

        // 4. Pending Feature Requests
        $pendingFeaturesCount = CustomFeatureRequest::withoutGlobalScopes()->where('status', 'pending')->count();
        if ($pendingFeaturesCount > 0) {
            $alerts[] = [
                'type' => 'info',
                'title' => "Pending Custom Feature Requests ({$pendingFeaturesCount})",
                'message' => 'Customers submitted custom module or design requests waiting for Super Admin quote approval.',
                'action_label' => 'Review Requests',
                'action_url' => '/admin/custom-feature-requests',
                'icon' => 'heroicon-m-sparkles',
            ];
        }

        // 5. Unverified Customers
        $unverifiedUsersCount = User::withoutGlobalScopes()->whereNull('email_verified_at')->count();
        if ($unverifiedUsersCount > 0) {
            $alerts[] = [
                'type' => 'warning',
                'title' => "Customers Pending Verification ({$unverifiedUsersCount})",
                'message' => 'Users have registered but not verified their email addresses yet.',
                'action_label' => 'View Users',
                'action_url' => '/admin/users',
                'icon' => 'heroicon-m-user-minus',
            ];
        }

        // 6. Server Health & SQLite Database Info
        $sqlitePath = database_path('database.sqlite');
        $sizeMb = file_exists($sqlitePath) ? round(filesize($sqlitePath) / (1024 * 1024), 2) : 0;
        if ($sizeMb > 250) {
            $alerts[] = [
                'type' => 'warning',
                'title' => "Database Storage Notice ({$sizeMb} MB)",
                'message' => 'The local database size is growing. Ensure regular snapshots and backup routine.',
                'action_label' => 'Backup Database',
                'action_url' => '/admin/backup-recovery',
                'icon' => 'heroicon-m-circle-stack',
            ];
        }

        return $alerts;
    }
}
