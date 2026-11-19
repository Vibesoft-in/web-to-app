<?php

declare(strict_types=1);

namespace App\Filament\Widgets;

use App\Models\App;
use App\Models\Build;
use App\Models\Order;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class PlatformOverviewWidget extends BaseWidget
{
    protected static ?int $sort = 1;
    protected int | string | array $columnSpan = 'full';

    protected function getStats(): array
    {
        // 1. Customers & Tenants
        $totalCustomers = User::withoutGlobalScopes()->count();
        $totalTenants = Tenant::withoutGlobalScopes()->count();

        // 2. Applications
        $totalApps = App::withoutGlobalScopes()->count();
        $publishedApps = App::withoutGlobalScopes()->whereIn('status', ['published', 'live', 'completed', 'active'])->count();
        $devApps = App::withoutGlobalScopes()->whereNotIn('status', ['published', 'live', 'completed', 'active'])->count();

        // 3. Subscriptions & Commercials
        $activeSubscriptions = Subscription::withoutGlobalScopes()->where('status', 'active')->count();
        $lifetimePurchases = Order::withoutGlobalScopes()->where('status', 'paid')->count();
        $totalRevenuePaise = Order::withoutGlobalScopes()->where('status', 'paid')->sum('total_amount');
        $totalRevenueInr = number_format($totalRevenuePaise / 100, 2);

        // 4. MRR & ARR calculation
        $mrrPaise = Order::withoutGlobalScopes()
            ->where('status', 'paid')
            ->where('created_at', '>=', now()->startOfMonth())
            ->sum('total_amount');
        $mrrInr = number_format($mrrPaise / 100, 2);
        $arrInr = number_format(($mrrPaise / 100) * 12, 2);

        // 5. Operations & Health
        $pendingPayments = Order::withoutGlobalScopes()
            ->whereIn('status', ['pending_payment', 'payment_processing'])
            ->count();
        $failedBuilds = Build::withoutGlobalScopes()->where('status', 'failed')->count();

        return [
            Stat::make('Total Registered Customers', (string) $totalCustomers)
                ->description('Platform-wide accounts')
                ->descriptionIcon('heroicon-m-user-group')
                ->color('primary')
                ->chart([3, 5, 8, 12, 18, 25, $totalCustomers]),

            Stat::make('Total Active Tenants', (string) $totalTenants)
                ->description('Active multi-tenant stores')
                ->descriptionIcon('heroicon-m-building-office-2')
                ->color('success'),

            Stat::make('Total Applications Created', (string) $totalApps)
                ->description('All mobile apps started')
                ->descriptionIcon('heroicon-m-device-phone-mobile')
                ->color('info')
                ->chart([1, 2, 4, 7, 10, 15, $totalApps]),

            Stat::make('Total Published Applications', (string) $publishedApps)
                ->description('Live & store published')
                ->descriptionIcon('heroicon-m-check-badge')
                ->color('success'),

            Stat::make('Total Applications in Development', (string) $devApps)
                ->description('Drafts & configuring')
                ->descriptionIcon('heroicon-m-wrench-screwdriver')
                ->color('warning'),

            Stat::make('Total Active Subscriptions', (string) $activeSubscriptions)
                ->description('Recurring paying clients')
                ->descriptionIcon('heroicon-m-arrow-path')
                ->color('success'),

            Stat::make('Total Lifetime Purchases', (string) $lifetimePurchases)
                ->description('Completed platform orders')
                ->descriptionIcon('heroicon-m-shopping-bag')
                ->color('success'),

            Stat::make('Total Revenue', '₹' . $totalRevenueInr)
                ->description('Gross lifetime settled')
                ->descriptionIcon('heroicon-m-banknotes')
                ->color('success')
                ->chart([10, 25, 45, 80, 120, 190, (int) ($totalRevenuePaise / 100)]),

            Stat::make('Monthly Recurring Revenue (MRR)', '₹' . $mrrInr)
                ->description('Current month revenue')
                ->descriptionIcon('heroicon-m-chart-bar')
                ->color('primary'),

            Stat::make('Annual Recurring Revenue (ARR)', '₹' . $arrInr)
                ->description('Annualized run rate')
                ->descriptionIcon('heroicon-m-presentation-chart-line')
                ->color('warning'),

            Stat::make('Pending Payments', (string) $pendingPayments)
                ->description($pendingPayments > 0 ? 'Requires attention' : 'All transactions clear')
                ->descriptionIcon('heroicon-m-clock')
                ->color($pendingPayments > 0 ? 'warning' : 'gray'),

            Stat::make('Failed Builds', (string) $failedBuilds)
                ->description($failedBuilds > 0 ? 'Action required in Build manager' : 'Zero build errors')
                ->descriptionIcon('heroicon-m-exclamation-triangle')
                ->color($failedBuilds > 0 ? 'danger' : 'success'),
        ];
    }
}
