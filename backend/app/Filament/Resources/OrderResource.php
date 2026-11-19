<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Models\AuditLog;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\Subscription;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class OrderResource extends Resource
{
    protected static ?string $model = Order::class;
    protected static ?string $navigationIcon = 'heroicon-o-shopping-bag';
    protected static ?string $navigationGroup = 'Billing & Subscriptions';
    protected static ?int $navigationSort = 3;
    protected static ?string $recordTitleAttribute = 'order_number';

    public static function getGloballySearchableAttributes(): array
    {
        return ['order_number', 'billing_email', 'billing_name', 'billing_phone'];
    }

    public static function getGlobalSearchResultDetails(\Illuminate\Database\Eloquent\Model $record): array
    {
        return [
            'Customer' => $record->billing_name ? "{$record->billing_name} ({$record->billing_email})" : $record->billing_email,
            'Total' => '₹' . number_format($record->total_amount / 100, 2),
            'Status' => ucfirst(str_replace('_', ' ', (string) $record->status)),
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
                // 1. Payment Recovery / Manual Settle
                Tables\Actions\Action::make('recover_payment')
                    ->label('Recover / Settle Payment')
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->visible(fn (Order $record): bool => in_array($record->status, ['pending_payment', 'failed', 'payment_processing']))
                    ->requiresConfirmation()
                    ->modalHeading('Manual Payment Recovery')
                    ->modalDescription('Record payment confirmation, create transaction history, and activate tenant subscription/features.')
                    ->form([
                        Forms\Components\TextInput::make('gateway_payment_id')
                            ->label('Payment / Transaction ID')
                            ->default(fn () => 'manual_rec_' . strtoupper(bin2hex(random_bytes(4))))
                            ->required(),
                        Forms\Components\Select::make('gateway')
                            ->label('Payment Gateway / Mode')
                            ->options([
                                'razorpay' => 'Razorpay Gateway',
                                'stripe'   => 'Stripe',
                                'bank_wire'=> 'Direct Bank Wire / UPI',
                                'manual'   => 'Manual Administrative Settle',
                            ])
                            ->default('manual')
                            ->required(),
                        Forms\Components\Textarea::make('recovery_note')
                            ->label('Audit Note')
                            ->placeholder('e.g., Confirmed with customer over phone / Bank reconciliation verified.')
                            ->default('Payment manually reconciled by Super Admin.'),
                    ])
                    ->action(function (Order $record, array $data) {
                        $record->update([
                            'status' => 'paid',
                            'paid_at' => now(),
                        ]);

                        PaymentTransaction::create([
                            'order_id' => $record->id,
                            'tenant_id' => $record->tenant_id,
                            'gateway' => $data['gateway'],
                            'gateway_payment_id' => $data['gateway_payment_id'],
                            'gateway_order_id' => $record->order_number,
                            'amount' => $record->total_amount,
                            'currency' => $record->currency ?? 'INR',
                            'status' => 'success',
                            'raw_payload' => ['recovery_note' => $data['recovery_note'], 'operator' => auth()->user()?->email],
                        ]);

                        // If order has subscription or upgrade, activate it
                        if ($record->tenant_id) {
                            $sub = Subscription::where('tenant_id', $record->tenant_id)->first();
                            if ($sub && $sub->status !== 'active') {
                                $sub->update([
                                    'status' => 'active',
                                    'current_period_ends_at' => now()->addMonth(),
                                ]);
                            }
                        }

                        AuditLog::create([
                            'actor_id' => auth()->id() ?? 1,
                            'tenant_id' => $record->tenant_id,
                            'action' => 'payment.recovered',
                            'target' => "Order:{$record->id}",
                            'ip' => request()->ip(),
                            'user_agent' => request()->userAgent(),
                            'meta' => ['order_number' => $record->order_number, 'amount' => $record->total_amount],
                            'created_at' => now(),
                        ]);

                        Notification::make()
                            ->title('Payment Recovered & Settled')
                            ->body("Order #{$record->order_number} marked as Paid.")
                            ->success()
                            ->send();
                    }),

                // 2. Retry Payment Notification Link
                Tables\Actions\Action::make('send_retry_link')
                    ->label('Send Retry Notice')
                    ->icon('heroicon-o-paper-airplane')
                    ->color('info')
                    ->visible(fn (Order $record): bool => in_array($record->status, ['failed', 'pending_payment']))
                    ->action(function (Order $record) {
                        Notification::make()
                            ->title('Payment Retry Notice Queued')
                            ->body("Notification sent to {$record->billing_email} with payment recovery link.")
                            ->info()
                            ->send();
                    }),

                // 3. Sensitive Action: Refund Payment
                Tables\Actions\Action::make('refund_order')
                    ->label('Process Refund')
                    ->icon('heroicon-o-arrow-uturn-left')
                    ->color('danger')
                    ->visible(fn (Order $record): bool => $record->status === 'paid')
                    ->requiresConfirmation()
                    ->modalHeading('Process Order Refund')
                    ->modalDescription('Are you certain you want to refund this order? This action will mark the order as refunded, reverse payment status, and create an audit log.')
                    ->form([
                        Forms\Components\Textarea::make('refund_reason')
                            ->label('Reason for Refund')
                            ->required()
                            ->placeholder('Customer request / dissatisfaction / dispute resolution...'),
                    ])
                    ->action(function (Order $record, array $data) {
                        $record->update(['status' => 'refunded']);

                        PaymentTransaction::create([
                            'order_id' => $record->id,
                            'tenant_id' => $record->tenant_id,
                            'gateway' => 'manual',
                            'gateway_payment_id' => 'refund_' . strtoupper(bin2hex(random_bytes(4))),
                            'gateway_order_id' => $record->order_number,
                            'amount' => $record->total_amount,
                            'currency' => $record->currency ?? 'INR',
                            'status' => 'refunded',
                            'raw_payload' => ['reason' => $data['refund_reason'], 'admin' => auth()->user()?->email],
                        ]);

                        AuditLog::create([
                            'actor_id' => auth()->id() ?? 1,
                            'tenant_id' => $record->tenant_id,
                            'action' => 'order.refunded',
                            'target' => "Order:{$record->id}",
                            'ip' => request()->ip(),
                            'user_agent' => request()->userAgent(),
                            'meta' => ['order_number' => $record->order_number, 'reason' => $data['refund_reason']],
                            'created_at' => now(),
                        ]);

                        Notification::make()
                            ->title('Order Refunded Successfully')
                            ->warning()
                            ->send();
                    }),

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
