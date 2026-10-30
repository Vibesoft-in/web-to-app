<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Models\AddOn;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class AddOnResource extends Resource
{
    protected static ?string $model = AddOn::class;
    protected static ?string $navigationIcon = 'heroicon-o-puzzle-piece';
    protected static ?string $navigationGroup = 'Billing & Subscriptions';
    protected static ?int $navigationSort = 2;

    public static function form(Form $form): Form
    {
        return $form
            ->columns(['default' => 1, 'sm' => 2])
            ->schema([
                Forms\Components\TextInput::make('name')
                    ->label('Add-on Name')
                    ->required()
                    ->maxLength(255),
                Forms\Components\TextInput::make('slug')
                    ->label('Slug Identifier')
                    ->helperText('e.g. push_notifications, admin_panel_addon, whatsapp_support')
                    ->required()
                    ->maxLength(255),
                Forms\Components\TextInput::make('price')
                    ->label('Price (in Paise)')
                    ->helperText('100 Paise = ₹1 (e.g. 99900 = ₹999, 149900 = ₹1,499)')
                    ->numeric()
                    ->required(),
                Forms\Components\Select::make('billing_type')
                    ->options([
                        'one_time' => 'One-time Payment',
                        'monthly'  => 'Monthly Subscription',
                        'yearly'   => 'Yearly Subscription',
                    ])
                    ->default('one_time')
                    ->required(),
                Forms\Components\TextInput::make('category')
                    ->label('Category')
                    ->placeholder('e.g. Engagement, Support, Analytics')
                    ->maxLength(100),
                Forms\Components\TextInput::make('badge')
                    ->label('Display Badge')
                    ->placeholder('e.g. Popular, Recommended')
                    ->maxLength(50),
                Forms\Components\Textarea::make('description')
                    ->label('Description')
                    ->columnSpanFull()
                    ->rows(3),
                Forms\Components\Toggle::make('is_active')
                    ->label('Add-on Active')
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
                Tables\Columns\TextColumn::make('price')
                    ->label('Price')
                    ->formatStateUsing(fn (int $state): string => '₹' . number_format($state / 100, 2))
                    ->sortable(),
                Tables\Columns\TextColumn::make('billing_type')->badge(),
                Tables\Columns\TextColumn::make('category')->badge()->color('info'),
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
            'index' => AddOnResource\Pages\ListAddOns::route('/'),
        ];
    }
}
