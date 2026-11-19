<?php

declare(strict_types=1);

namespace App\Filament\Resources\UserResource\Pages;

use App\Filament\Resources\UserResource;
use App\Models\User;
use Filament\Actions;
use Filament\Resources\Components\Tab;
use Filament\Resources\Pages\ListRecords;

class ListUsers extends ListRecords
{
    protected static string $resource = UserResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }

    public function getTabs(): array
    {
        return [
            'all' => Tab::make('All Customers')
                ->badge(User::withoutGlobalScopes()->count()),
            'paid' => Tab::make('Paid Customers')
                ->modifyQueryUsing(fn ($query) => $query->whereHas('tenant.subscriptions', fn ($q) => $q->where('status', 'active')))
                ->badge(User::withoutGlobalScopes()->whereHas('tenant.subscriptions', fn ($q) => $q->where('status', 'active'))->count()),
            'free' => Tab::make('Free Customers')
                ->modifyQueryUsing(fn ($query) => $query->whereDoesntHave('tenant.subscriptions', fn ($q) => $q->where('status', 'active'))),
            'high_revenue' => Tab::make('High-Revenue')
                ->badgeColor('success')
                ->modifyQueryUsing(fn ($query) => $query->whereHas('tenant.orders', fn ($q) => $q->where('status', 'paid')->havingRaw('SUM(total_amount) >= ?', [500000]))),
            'multiple_apps' => Tab::make('Multiple Apps')
                ->modifyQueryUsing(fn ($query) => $query->has('tenant.apps', '>', 1)),
            'upcoming_renewals' => Tab::make('Upcoming Renewals')
                ->badgeColor('warning')
                ->modifyQueryUsing(fn ($query) => $query->whereHas('tenant.subscriptions', fn ($q) => $q->where('status', 'active')->whereBetween('current_period_ends_at', [now(), now()->addDays(14)]))),
            'failed_builds' => Tab::make('With Failed Builds')
                ->badgeColor('danger')
                ->modifyQueryUsing(fn ($query) => $query->whereHas('tenant.builds', fn ($q) => $q->where('status', 'failed'))),
            'inactive' => Tab::make('Inactive (30d)')
                ->modifyQueryUsing(fn ($query) => $query->where('updated_at', '<', now()->subDays(30))),
        ];
    }
}
