<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Models\Discount;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class DiscountResource extends Resource
{
    protected static ?string $model = Discount::class;
    protected static ?string $navigationIcon = 'heroicon-o-ticket';
    protected static ?string $navigationGroup = 'Billing & Subscriptions';
    protected static ?string $modelLabel = 'Discount & Coupon';
    protected static ?string $pluralModelLabel = 'Discounts & Coupons';
    protected static ?int $navigationSort = 4;
    protected static ?string $recordTitleAttribute = 'code';

    public static function getGloballySearchableAttributes(): array
    {
        return ['code', 'discount_category', 'customer_email'];
    }

    public static function getGlobalSearchResultDetails(\Illuminate\Database\Eloquent\Model $record): array
    {
        return [
            'Category' => ucfirst(str_replace('_', ' ', (string) $record->discount_category)),
            'Value' => $record->type === 'percentage' ? "{$record->value}%" : "₹{$record->value}",
            'Active' => $record->is_active ? 'Yes' : 'No',
        ];
    }

    public static function form(Form $form): Form
    {
        return $form
            ->columns(['default' => 1, 'sm' => 2])
            ->schema([
                Forms\Components\Section::make('Coupon Details')
                    ->columns(2)
                    ->schema([
                        Forms\Components\TextInput::make('code')
                            ->label('Coupon Code')
                            ->required()
                            ->maxLength(50)
                            ->unique(ignoreRecord: true)
                            ->extraInputAttributes(['style' => 'text-transform: uppercase'])
                            ->dehydrateStateUsing(fn ($state) => strtoupper(trim((string) $state))),

                        Forms\Components\Select::make('discount_category')
                            ->label('Discount Category')
                            ->options([
                                'general'           => 'General Public Offer',
                                'first_purchase'    => 'First-Purchase Welcome Offer',
                                'renewal'           => 'Subscription Renewal Incentive',
                                'customer_specific' => 'Customer-Specific Exclusive Offer',
                            ])
                            ->default('general')
                            ->reactive()
                            ->required(),

                        Forms\Components\Select::make('type')
                            ->label('Discount Type')
                            ->options([
                                'percentage' => 'Percentage Discount (%)',
                                'fixed'      => 'Fixed Cash Discount (₹)',
                            ])
                            ->default('percentage')
                            ->required(),

                        Forms\Components\TextInput::make('value')
                            ->label('Discount Value')
                            ->numeric()
                            ->required()
                            ->helperText('Enter percentage (e.g. 20 for 20%) or fixed rupee amount (e.g. 500 for ₹500)'),

                        Forms\Components\TextInput::make('customer_email')
                            ->label('Restricted Customer Email')
                            ->email()
                            ->visible(fn (Forms\Get $get): bool => $get('discount_category') === 'customer_specific')
                            ->required(fn (Forms\Get $get): bool => $get('discount_category') === 'customer_specific')
                            ->placeholder('customer@domain.com'),

                        Forms\Components\Toggle::make('is_active')
                            ->label('Active / Redeemable')
                            ->default(true),
                    ]),

                Forms\Components\Section::make('Redemption Limits & Validity')
                    ->columns(2)
                    ->schema([
                        Forms\Components\TextInput::make('min_order_amount')
                            ->label('Minimum Order Amount (₹)')
                            ->numeric()
                            ->default(0)
                            ->helperText('0 = No minimum purchase threshold'),

                        Forms\Components\TextInput::make('max_discount_amount')
                            ->label('Maximum Discount Cap (₹)')
                            ->numeric()
                            ->placeholder('Optional cap (e.g. ₹2,000 max savings)'),

                        Forms\Components\TextInput::make('max_uses')
                            ->label('Total Usage Limit')
                            ->numeric()
                            ->placeholder('Unlimited if left empty'),

                        Forms\Components\TextInput::make('uses_count')
                            ->label('Current Redemptions')
                            ->numeric()
                            ->default(0)
                            ->disabled(),

                        Forms\Components\DateTimePicker::make('starts_at')
                            ->label('Start Date & Time')
                            ->default(now()),

                        Forms\Components\DateTimePicker::make('expires_at')
                            ->label('Expiry Date & Time')
                            ->helperText('Leave empty for indefinite duration'),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('code')
                    ->label('Coupon Code')
                    ->searchable()
                    ->sortable()
                    ->copyable()
                    ->weight('bold'),

                Tables\Columns\TextColumn::make('type')
                    ->badge()
                    ->color(fn ($state) => $state === 'percentage' ? 'primary' : 'success')
                    ->formatStateUsing(fn ($state) => ucfirst((string) $state)),

                Tables\Columns\TextColumn::make('value')
                    ->label('Discount')
                    ->state(fn (Discount $record) => $record->type === 'percentage' ? "{$record->value}%" : "₹" . number_format($record->value, 2))
                    ->weight('bold'),

                Tables\Columns\TextColumn::make('discount_category')
                    ->label('Category')
                    ->badge()
                    ->formatStateUsing(fn ($state) => match ($state) {
                        'first_purchase'    => 'First Purchase',
                        'renewal'           => 'Renewal',
                        'customer_specific' => 'Customer Exclusive',
                        default             => 'General',
                    })
                    ->color(fn ($state) => match ($state) {
                        'first_purchase'    => 'warning',
                        'renewal'           => 'info',
                        'customer_specific' => 'purple',
                        default             => 'gray',
                    }),

                Tables\Columns\TextColumn::make('redemptions')
                    ->label('Redemptions')
                    ->state(fn (Discount $record) => $record->max_uses ? "{$record->uses_count} / {$record->max_uses}" : "{$record->uses_count} (Uncapped)")
                    ->badge(),

                Tables\Columns\TextColumn::make('customer_email')
                    ->label('Customer')
                    ->placeholder('Open to all')
                    ->toggleable(isToggledHiddenByDefault: true),

                Tables\Columns\TextColumn::make('expires_at')
                    ->label('Expiry')
                    ->dateTime('M d, Y')
                    ->placeholder('No expiry')
                    ->sortable(),

                Tables\Columns\IconColumn::make('is_active')
                    ->label('Active')
                    ->boolean()
                    ->sortable(),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make()
                    ->requiresConfirmation()
                    ->modalHeading('Delete Discount Coupon')
                    ->modalDescription('Are you sure you want to remove this coupon code? Customers will no longer be able to redeem it.'),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => DiscountResource\Pages\ListDiscounts::route('/'),
        ];
    }
}
