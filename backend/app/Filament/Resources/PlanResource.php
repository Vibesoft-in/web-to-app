<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Models\Plan;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class PlanResource extends Resource
{
    protected static ?string $model = Plan::class;
    protected static ?string $navigationIcon = 'heroicon-o-credit-card';
    protected static ?string $navigationGroup = 'Billing & Subscriptions';
    protected static ?int $navigationSort = 1;

    public static function form(Form $form): Form
    {
        return $form
            ->columns(['default' => 1, 'sm' => 2])
            ->schema([
                Forms\Components\TextInput::make('name')
                    ->label('Package Name')
                    ->required()
                    ->maxLength(255),
                Forms\Components\TextInput::make('slug')
                    ->label('Slug Identifier')
                    ->helperText('e.g. basic, pro, premium')
                    ->required()
                    ->maxLength(255),
                Forms\Components\TextInput::make('price_monthly')
                    ->label('Package Price (in Paise)')
                    ->helperText('100 Paise = ₹1 (e.g. 299900 = ₹2,999, 799900 = ₹7,999, 1499900 = ₹14,999)')
                    ->numeric()
                    ->required(),
                Forms\Components\TextInput::make('badge')
                    ->label('Display Badge')
                    ->placeholder('e.g. Starter, Most Popular, VIP Suite')
                    ->maxLength(50),
                Forms\Components\Textarea::make('description')
                    ->label('Short Description')
                    ->columnSpanFull()
                    ->rows(2),
                Forms\Components\TagsInput::make('features_list')
                    ->label('Included Features List')
                    ->placeholder('Add a feature and press Enter')
                    ->columnSpanFull(),
                Forms\Components\Section::make('Entitlement Permissions')
                    ->columns(3)
                    ->schema([
                        Forms\Components\Toggle::make('can_apk')
                            ->label('APK Download')
                            ->default(true),
                        Forms\Components\Toggle::make('can_aab')
                            ->label('AAB (Google Play) Download')
                            ->helperText('Included in Pro & Premium')
                            ->default(false),
                        Forms\Components\Toggle::make('has_admin_panel')
                            ->label('Dedicated App Admin Panel')
                            ->helperText('Included in Premium')
                            ->default(false),
                    ]),
                Forms\Components\Toggle::make('is_active')
                    ->label('Package Active')
                    ->default(true),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')->sortable(),
                Tables\Columns\TextColumn::make('name')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('slug')->badge()->color('gray'),
                Tables\Columns\TextColumn::make('price_monthly')
                    ->label('Price')
                    ->formatStateUsing(fn (int $state): string => '₹' . number_format($state / 100, 2))
                    ->sortable(),
                Tables\Columns\IconColumn::make('can_apk')->label('APK')->boolean(),
                Tables\Columns\IconColumn::make('can_aab')->label('AAB')->boolean(),
                Tables\Columns\IconColumn::make('has_admin_panel')->label('Admin Panel')->boolean(),
                Tables\Columns\IconColumn::make('is_active')->label('Active')->boolean(),
                Tables\Columns\TextColumn::make('created_at')->dateTime()->sortable()->toggleable(isToggledHiddenByDefault: true),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => PlanResource\Pages\ListPlans::route('/'),
        ];
    }
}
