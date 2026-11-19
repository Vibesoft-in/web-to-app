<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Enums\UserRole;
use App\Models\App;
use App\Models\Build;
use App\Models\Order;
use App\Models\Subscription;
use App\Models\User;
use App\Services\Security\ImpersonationService;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Infolists;
use Filament\Infolists\Infolist;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Support\Enums\MaxWidth;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Hash;

class UserResource extends Resource
{
    protected static ?string $model = User::class;
    protected static ?string $navigationIcon = 'heroicon-o-users';
    protected static ?string $navigationGroup = 'Tenant Management';
    protected static ?string $modelLabel = 'Customer / User';
    protected static ?string $pluralModelLabel = 'Customers & Users';
    protected static ?string $navigationLabel = 'Customers & Users';
    protected static ?int $navigationSort = 1;
    protected static ?string $recordTitleAttribute = 'name';

    public static function getGloballySearchableAttributes(): array
    {
        return ['name', 'email', 'phone', 'tenant.name'];
    }

    public static function getGlobalSearchResultDetails(\Illuminate\Database\Eloquent\Model $record): array
    {
        return [
            'Email' => $record->email,
            'Tenant' => $record->tenant?->name ?? 'None',
            'Phone' => $record->phone ?? 'N/A',
        ];
    }

    public static function getEloquentQuery(): \Illuminate\Database\Eloquent\Builder
    {
        return parent::getEloquentQuery()->withoutGlobalScopes();
    }

    public static function form(Form $form): Form
    {
        return $form
            ->columns(['default' => 1, 'sm' => 2])
            ->schema([
                Forms\Components\TextInput::make('name')
                    ->label('Full Name')
                    ->required()
                    ->maxLength(255),
                Forms\Components\TextInput::make('email')
                    ->label('Email Address')
                    ->email()
                    ->required()
                    ->maxLength(255)
                    ->unique(ignoreRecord: true),
                Forms\Components\TextInput::make('phone')
                    ->label('Phone Number / Username')
                    ->tel()
                    ->maxLength(20),
                Forms\Components\Select::make('tenant_id')
                    ->label('Tenant Account')
                    ->relationship('tenant', 'name')
                    ->searchable()
                    ->preload()
                    ->required(),
                Forms\Components\Select::make('role')
                    ->label('Role')
                    ->options([
                        'owner'  => 'Owner',
                        'editor' => 'Editor',
                        'viewer' => 'Viewer',
                    ])
                    ->default('owner')
                    ->required(),
                Forms\Components\TextInput::make('password')
                    ->password()
                    ->dehydrateStateUsing(fn ($state) => ! empty($state) ? Hash::make($state) : null)
                    ->dehydrated(fn ($state) => filled($state))
                    ->required(fn (string $context): bool => $context === 'create'),
                Forms\Components\DateTimePicker::make('email_verified_at')
                    ->label('Email Verified At')
                    ->default(now()),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')->sortable(),
                Tables\Columns\TextColumn::make('name')
                    ->label('Customer Name')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),
                Tables\Columns\TextColumn::make('email')
                    ->label('Email Address')
                    ->searchable()
                    ->sortable()
                    ->copyable()
                    ->wrap(),
                Tables\Columns\TextColumn::make('phone')
                    ->label('Phone Number')
                    ->searchable()
                    ->copyable()
                    ->placeholder('Not provided'),
                Tables\Columns\TextColumn::make('account_status')
                    ->label('Account Status')
                    ->badge()
                    ->state(function (User $record): string {
                        if ($record->trashed()) return 'Suspended';
                        if ($record->email_verified_at) return 'Active';
                        return 'Pending Verification';
                    })
                    ->color(fn (string $state): string => match ($state) {
                        'Active' => 'success',
                        'Pending Verification' => 'warning',
                        'Suspended' => 'danger',
                        default => 'gray',
                    }),
                Tables\Columns\TextColumn::make('health_score')
                    ->label('Health Score')
                    ->badge()
                    ->state(function (User $record): string {
                        if ($record->trashed()) {
                            return 'Inactive';
                        }
                        $tenantId = $record->tenant_id;
                        $hasFailedBuild = Build::withoutGlobalScopes()
                            ->where('tenant_id', $tenantId)
                            ->where('status', 'failed')
                            ->exists();
                        if ($hasFailedBuild) {
                            return 'At Risk';
                        }

                        $now = now();
                        $hasExpiringSub = Subscription::withoutGlobalScopes()
                            ->where('tenant_id', $tenantId)
                            ->where('status', 'active')
                            ->whereBetween('current_period_ends_at', [$now, $now->copy()->addDays(7)])
                            ->exists();
                        if ($hasExpiringSub) {
                            return 'At Risk';
                        }

                        if (! $record->email_verified_at && $record->created_at->diffInDays($now) > 7) {
                            return 'Needs Attention';
                        }

                        $appCount = App::withoutGlobalScopes()->where('tenant_id', $tenantId)->count();
                        if ($appCount === 0 && $record->created_at->diffInDays($now) > 14) {
                            return 'Inactive';
                        }

                        if ($appCount === 0) {
                            return 'Needs Attention';
                        }

                        return 'Healthy';
                    })
                    ->color(fn (string $state): string => match ($state) {
                        'Healthy' => 'success',
                        'Needs Attention' => 'warning',
                        'At Risk' => 'danger',
                        'Inactive' => 'gray',
                        default => 'gray',
                    }),
                Tables\Columns\TextColumn::make('ltv')
                    ->label('Customer LTV')
                    ->state(function (User $record): string {
                        $totalPaise = Order::withoutGlobalScopes()
                            ->where('tenant_id', $record->tenant_id)
                            ->whereIn('status', ['paid', 'completed'])
                            ->sum('total_amount') ?? 0;
                        return '₹' . number_format($totalPaise / 100, 2);
                    })
                    ->badge()
                    ->color('success'),
                Tables\Columns\TextColumn::make('apps_count')
                    ->label('Apps Created')
                    ->state(fn (User $record): int => App::withoutGlobalScopes()->where('tenant_id', $record->tenant_id)->count())
                    ->badge()
                    ->color(fn ($state): string => $state > 0 ? 'success' : 'gray'),
                Tables\Columns\TextColumn::make('tenant.name')
                    ->label('Tenant Account')
                    ->formatStateUsing(fn ($record) => "#{$record->tenant_id} {$record->tenant?->name}")
                    ->wrap()
                    ->sortable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Registration Date')
                    ->dateTime('M d, Y h:i A')
                    ->sortable(),
            ])
            ->actions([
                Tables\Actions\ViewAction::make()
                    ->label('View')
                    ->icon('heroicon-o-eye')
                    ->color('info')
                    ->modalHeading(fn (User $record): string => "User Dossier: {$record->name} (#{$record->id})")
                    ->modalWidth(MaxWidth::SevenExtraLarge),
                Tables\Actions\Action::make('verify_now')
                    ->label('Verify Email')
                    ->icon('heroicon-o-check-badge')
                    ->color('success')
                    ->visible(fn (User $record): bool => $record->email_verified_at === null)
                    ->action(function (User $record) {
                        $record->markEmailAsVerified();
                        Notification::make()
                            ->title('Email verified successfully')
                            ->success()
                            ->send();
                    }),
                Tables\Actions\Action::make('impersonate')
                    ->label('Impersonate')
                    ->icon('heroicon-o-arrows-right-left')
                    ->color('warning')
                    ->requiresConfirmation()
                    ->modalHeading(fn (User $record): string => "Impersonate Tenant: {$record->tenant?->name}")
                    ->modalDescription('Super Admin session will switch to this customer tenant. You will have full access as this tenant.')
                    ->action(function (User $record, ImpersonationService $impersonation) {
                        if (! $record->tenant) {
                            Notification::make()->title('User has no associated tenant')->danger()->send();
                            return;
                        }
                        $impersonation->startImpersonation(auth()->user(), $record->tenant);
                        Notification::make()
                            ->title("Now impersonating {$record->tenant->name}")
                            ->warning()
                            ->send();
                    }),
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make()
                    ->requiresConfirmation()
                    ->modalHeading('Delete Customer Account')
                    ->modalDescription('Are you certain you want to delete this customer account? This sensitive action is irreversible.'),
            ]);
    }

    public static function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                Infolists\Components\Tabs::make('User Details Dossier')
                    ->tabs([
                        Infolists\Components\Tabs\Tab::make('Profile & Account')
                            ->icon('heroicon-o-user')
                            ->schema([
                                Infolists\Components\ViewEntry::make('profile_overview')
                                    ->view('filament.infolists.user-profile-overview'),
                            ]),

                        Infolists\Components\Tabs\Tab::make('Apps Created')
                            ->icon('heroicon-o-device-phone-mobile')
                            ->badge(fn (User $record) => App::withoutGlobalScopes()->where('tenant_id', $record->tenant_id)->count())
                            ->schema([
                                Infolists\Components\ViewEntry::make('apps_table')
                                    ->view('filament.infolists.user-apps-table'),
                            ]),

                        Infolists\Components\Tabs\Tab::make('Builds & Artifacts')
                            ->icon('heroicon-o-cpu-chip')
                            ->badge(fn (User $record) => Build::withoutGlobalScopes()->where('tenant_id', $record->tenant_id)->count())
                            ->schema([
                                Infolists\Components\ViewEntry::make('builds_table')
                                    ->view('filament.infolists.user-builds-table'),
                            ]),

                        Infolists\Components\Tabs\Tab::make('Payments & Subscriptions')
                            ->icon('heroicon-o-credit-card')
                            ->badge(fn (User $record) => Subscription::withoutGlobalScopes()->where('tenant_id', $record->tenant_id)->count())
                            ->schema([
                                Infolists\Components\ViewEntry::make('subscriptions_table')
                                    ->view('filament.infolists.user-subscriptions-table'),
                            ]),
                    ])
                    ->columnSpanFull(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => UserResource\Pages\ListUsers::route('/'),
        ];
    }
}
