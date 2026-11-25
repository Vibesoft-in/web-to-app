<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Models\Subscription;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class SubscriptionResource extends Resource
{
    protected static ?string $model = Subscription::class;
    protected static ?string $navigationIcon = 'heroicon-o-arrow-path';
    protected static ?string $navigationGroup = 'Billing & Subscriptions';
    protected static ?string $recordTitleAttribute = 'id';

    public static function getGloballySearchableAttributes(): array
    {
        return ['id', 'tenant.name', 'app.name', 'razorpay_subscription_id'];
    }

    public static function getGlobalSearchResultDetails(\Illuminate\Database\Eloquent\Model $record): array
    {
        return [
            'Tenant' => $record->tenant?->name ?? 'None',
            'Plan' => $record->plan?->name ?? 'Custom',
            'Status' => ucfirst((string) $record->status),
        ];
    }

    public static function form(Forms\Form $form): Forms\Form
    {
        return $form
            ->columns(['default' => 1, 'sm' => 2])
            ->schema([
            Forms\Components\Select::make('tenant_id')
                ->label('Tenant / Client Account')
                ->options(function () {
                    return \App\Models\Tenant::with('users')->get()->mapWithKeys(function ($tenant) {
                        $userEmails = $tenant->users->pluck('email')->implode(', ');
                        $label = "Tenant #{$tenant->id} - {$tenant->name}" . ($userEmails ? " ({$userEmails})" : "");
                        return [$tenant->id => $label];
                    });
                })
                ->searchable()
                ->preload()
                ->required()
                ->live()
                ->afterStateUpdated(fn (Forms\Set $set) => $set('app_id', null)),
            Forms\Components\Select::make('app_id')
                ->label('Mobile App')
                ->options(function (Forms\Get $get) {
                    $tenantId = $get('tenant_id');
                    $query = \App\Models\App::withoutGlobalScopes();
                    if ($tenantId) {
                        $query->where('tenant_id', $tenantId);
                    }
                    return $query->get()->mapWithKeys(function ($app) {
                        return [$app->id => "App #{$app->id} - {$app->name} (ULID: {$app->ulid})"];
                    });
                })
                ->searchable()
                ->preload()
                ->required(),
            Forms\Components\Select::make('plan_id')
                ->label('Subscription Plan')
                ->relationship('plan', 'name')
                ->searchable()
                ->preload()
                ->required(),
            Forms\Components\Select::make('status')
                ->options([
                    'active'    => 'Active',
                    'pending'   => 'Pending',
                    'cancelled' => 'Cancelled',
                    'past_due'  => 'Past Due',
                ])
                ->default('active')
                ->required(),
            Forms\Components\TextInput::make('razorpay_sub_id')
                ->label('Subscription / Transaction ID')
                ->placeholder('e.g. sub_manual_1001 or rzp_sub_...')
                ->default(fn () => 'sub_manual_' . uniqid())
                ->maxLength(100),
            Forms\Components\DateTimePicker::make('current_period_end')
                ->label('Expires At / Renewal Date')
                ->default(now()->addMonth())
                ->required(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')->sortable(),
                Tables\Columns\TextColumn::make('tenant.name')
                    ->label('Tenant Account')
                    ->formatStateUsing(function ($record) {
                        $userEmail = $record->tenant?->users?->first()?->email;
                        return "#{$record->tenant_id} {$record->tenant?->name}" . ($userEmail ? " ({$userEmail})" : "");
                    })
                    ->wrap()
                    ->sortable(),
                Tables\Columns\TextColumn::make('app.name')
                    ->label('App')
                    ->formatStateUsing(fn ($record) => "#{$record->app_id} {$record->app?->name}")
                    ->sortable(),
                Tables\Columns\TextColumn::make('plan.name')->label('Plan')->badge(),
                Tables\Columns\TextColumn::make('status')
                    ->badge()
                    ->color(fn ($state): string => match ((string) ($state?->value ?? $state)) {
                        'active'    => 'success',
                        'cancelled' => 'danger',
                        default     => 'warning',
                    }),
                Tables\Columns\TextColumn::make('razorpay_sub_id')->label('Razorpay Sub ID')->searchable()->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('current_period_end')->dateTime()->sortable()->toggleable(isToggledHiddenByDefault: true),
            ])
            ->actions([
                Tables\Actions\Action::make('revoke_now')
                    ->label('Revoke Immediately')
                    ->icon('heroicon-o-no-symbol')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->modalHeading('Revoke Subscription Immediately?')
                    ->modalDescription('This will terminate the active subscription immediately, even if remaining time is left. The plan status will change to cancelled and expire now.')
                    ->visible(fn (Subscription $record): bool => $record->status === 'active')
                    ->action(function (Subscription $record) {
                        $record->revoke();
                        \Filament\Notifications\Notification::make()
                            ->title("Subscription #{$record->id} revoked immediately")
                            ->warning()
                            ->send();
                    }),
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ]);
    }

    public static function getEloquentQuery(): \Illuminate\Database\Eloquent\Builder
    {
        return parent::getEloquentQuery()->withoutGlobalScopes();
    }

    public static function getPages(): array
    {
        return [
            'index' => SubscriptionResource\Pages\ListSubscriptions::route('/'),
        ];
    }
}
