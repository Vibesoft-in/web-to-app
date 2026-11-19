<?php

declare(strict_types=1);

namespace App\Providers\Filament;

use App\Filament\Widgets\CriticalAlertsWidget;
use App\Filament\Widgets\CustomerBehaviourWidget;
use App\Filament\Widgets\CustomerRegistrationsChartWidget;
use App\Filament\Widgets\ImpersonationBanner;
use App\Filament\Widgets\PlanRevenueDistributionChartWidget;
use App\Filament\Widgets\PlatformOverviewWidget;
use App\Filament\Widgets\RevenueGrowthChartWidget;
use Filament\Http\Middleware\Authenticate;
use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Panel;
use Filament\PanelProvider;
use Filament\Support\Colors\Color;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\AuthenticateSession;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;

class AdminPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->default()
            ->id('admin')
            ->path('admin')
            ->login()
            ->colors([
                'primary' => Color::Red,
            ])
            ->sidebarCollapsibleOnDesktop()
            ->maxContentWidth('full')
            ->globalSearchKeyBindings(['command+k', 'ctrl+k'])
            ->discoverResources(in: app_path('Filament/Resources'), for: 'App\\Filament\\Resources')
            ->discoverPages(in: app_path('Filament/Pages'), for: 'App\\Filament\\Pages')
            ->discoverWidgets(in: app_path('Filament/Widgets'), for: 'App\\Filament\\Widgets')
            ->widgets([
                ImpersonationBanner::class,
                PlatformOverviewWidget::class,
                CriticalAlertsWidget::class,
                RevenueGrowthChartWidget::class,
                CustomerRegistrationsChartWidget::class,
                PlanRevenueDistributionChartWidget::class,
                CustomerBehaviourWidget::class,
            ])
            ->middleware([
                EncryptCookies::class,
                AddQueuedCookiesToResponse::class,
                StartSession::class,
                AuthenticateSession::class,
                ShareErrorsFromSession::class,
                SubstituteBindings::class,
                DisableBladeIconComponents::class,
                DispatchServingFilamentEvent::class,
            ])
            ->authMiddleware([
                Authenticate::class,
            ]);
    }
}
