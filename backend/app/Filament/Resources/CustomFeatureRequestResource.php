<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Models\CustomFeatureRequest;
use App\Services\Billing\EmailNotificationService;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class CustomFeatureRequestResource extends Resource
{
    protected static ?string $model = CustomFeatureRequest::class;
    protected static ?string $navigationIcon = 'heroicon-o-chat-bubble-left-right';
    protected static ?string $navigationGroup = 'Billing & Subscriptions';
    protected static ?int $navigationSort = 4;

    public static function getEloquentQuery(): \Illuminate\Database\Eloquent\Builder
    {
        return parent::getEloquentQuery()->withoutGlobalScopes();
    }

    public static function form(Form $form): Form
    {
        return $form
            ->columns(['default' => 1, 'sm' => 2])
            ->schema([
                Forms\Components\TextInput::make('ticket_number')
                    ->label('Ticket #')
                    ->disabled(),
                Forms\Components\TextInput::make('feature_name')
                    ->label('Feature Name')
                    ->disabled(),
                Forms\Components\TextInput::make('reference_url')
                    ->label('Reference URL')
                    ->url()
                    ->disabled(),
                Forms\Components\Textarea::make('requirements')
                    ->label('Client Requirements')
                    ->columnSpanFull()
                    ->rows(3)
                    ->disabled(),
                Forms\Components\Textarea::make('expected_functionality')
                    ->label('Expected Functionality')
                    ->columnSpanFull()
                    ->rows(3)
                    ->disabled(),
                Forms\Components\Section::make('Admin Quote & Assessment')
                    ->columns(['default' => 1, 'sm' => 2])
                    ->schema([
                        Forms\Components\Select::make('status')
                            ->label('Request Status')
                            ->options([
                                'pending_review' => 'Pending Review',
                                'quoted'         => 'Quoted (Awaiting Customer Action)',
                                'accepted'       => 'Accepted by Customer',
                                'in_progress'    => 'In Development',
                                'completed'      => 'Completed & Deployed',
                                'rejected'       => 'Rejected',
                            ])
                            ->required(),
                        Forms\Components\TextInput::make('quoted_price')
                            ->label('Quoted Amount (in Paise)')
                            ->helperText('100 Paise = ₹1 (e.g. 500000 = ₹5,000, 1000000 = ₹10,000)')
                            ->numeric(),
                        Forms\Components\Textarea::make('admin_notes')
                            ->label('Quotation Notes / Terms for Customer')
                            ->columnSpanFull()
                            ->rows(3)
                            ->placeholder('Explain delivery timeline, scope of work, and integration details...'),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('ticket_number')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),
                Tables\Columns\TextColumn::make('feature_name')
                    ->searchable()
                    ->wrap(),
                Tables\Columns\TextColumn::make('user.email')
                    ->label('Customer')
                    ->searchable(),
                Tables\Columns\TextColumn::make('app.name')
                    ->label('App')
                    ->placeholder('N/A'),
                Tables\Columns\TextColumn::make('status')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'quoted'         => 'info',
                        'accepted'       => 'success',
                        'in_progress'    => 'primary',
                        'completed'      => 'success',
                        'rejected'       => 'danger',
                        default          => 'warning',
                    }),
                Tables\Columns\TextColumn::make('quoted_price')
                    ->label('Quoted Price')
                    ->formatStateUsing(fn ($state) => $state ? '₹' . number_format($state / 100, 2) : 'Pending Quote')
                    ->weight('bold'),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->actions([
                Tables\Actions\EditAction::make()
                    ->after(function (CustomFeatureRequest $record) {
                        if ($record->status === 'quoted' && $record->quoted_price > 0 && empty($record->quoted_at)) {
                            $record->update(['quoted_at' => now()]);
                            try {
                                app(EmailNotificationService::class)->sendCustomFeatureQuoteEmail($record);
                            } catch (\Throwable $e) {
                                // Silent fallback
                            }
                        }
                    }),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => CustomFeatureRequestResource\Pages\ListCustomFeatureRequests::route('/'),
        ];
    }
}
