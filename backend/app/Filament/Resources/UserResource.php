<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Enums\UserRole;
use App\Models\App;
use App\Models\Build;
use App\Models\Subscription;
use App\Models\User;
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
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
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
