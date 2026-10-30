<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Models\Order;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class OrderResource extends Resource
{
    protected static ?string $model = Order::class;
    protected static ?string $navigationIcon = 'heroicon-o-shopping-bag';
    protected static ?string $navigationGroup = 'Billing & Subscriptions';
    protected static ?int $navigationSort = 3;

    public static function getEloquentQuery(): \Illuminate\Database\Eloquent\Builder
    {
        return parent::getEloquentQuery()->withoutGlobalScopes();
    }

    public static function form(Form $form): Form
    {
        return $form
            ->columns(['default' => 1, 'sm' => 2])
            ->schema([
                Forms\Components\TextInput::make('order_number')
                    ->disabled(),
                Forms\Components\TextInput::make('billing_email')
                    ->label('Customer Email')
                    ->disabled(),
                Forms\Components\TextInput::make('billing_name')
                    ->label('Customer Name')
                    ->disabled(),
                Forms\Components\TextInput::make('billing_phone')
                    ->label('Customer Phone')
                    ->disabled(),
                Forms\Components\Select::make('status')
                    ->options([
                        'pending_payment'    => 'Pending Payment',
                        'payment_processing' => 'Payment Processing',
                        'paid'               => 'Paid',
                        'failed'             => 'Failed',
                        'cancelled'          => 'Cancelled',
                        'refunded'           => 'Refunded',
                    ])
                    ->required(),
                Forms\Components\TextInput::make('total_amount')
                    ->label('Total Amount (in Paise)')
                    ->numeric()
                    ->disabled(),
                Forms\Components\TextInput::make('order_type')
                    ->label('Order Type')
                    ->disabled(),
                Forms\Components\DateTimePicker::make('paid_at')
                    ->label('Paid At')
                    ->disabled(),
                Forms\Components\Textarea::make('notes')
                    ->columnSpanFull(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('order_number')
                    ->searchable()
                    ->sortable()
                    ->copyable()
                    ->weight('bold'),
                Tables\Columns\TextColumn::make('billing_email')
                    ->label('Customer')
                    ->searchable()
                    ->formatStateUsing(fn ($record) => $record->billing_name ? "{$record->billing_name} ({$record->billing_email})" : $record->billing_email)
                    ->wrap(),
                Tables\Columns\TextColumn::make('app.name')
                    ->label('App')
                    ->placeholder('N/A')
                    ->searchable(),
                Tables\Columns\TextColumn::make('order_type')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'new_purchase' => 'primary',
                        'upgrade'      => 'warning',
                        'addon'        => 'info',
                        'custom_quote' => 'success',
                        default        => 'gray',
                    }),
                Tables\Columns\TextColumn::make('total_amount')
                    ->label('Total Amount')
                    ->formatStateUsing(fn (int $state): string => '₹' . number_format($state / 100, 2))
                    ->sortable()
                    ->weight('bold'),
                Tables\Columns\TextColumn::make('status')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'paid'               => 'success',
                        'pending_payment'    => 'warning',
                        'payment_processing' => 'info',
                        'failed'             => 'danger',
                        'refunded'           => 'danger',
                        default              => 'gray',
                    }),
                Tables\Columns\TextColumn::make('transactions.gateway_payment_id')
                    ->label('Payment ID')
                    ->copyable()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->actions([
                Tables\Actions\EditAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => OrderResource\Pages\ListOrders::route('/'),
        ];
    }
}
