<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Models\Tenant;
use App\Services\Security\ImpersonationService;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class TenantResource extends Resource
{
    protected static ?string $model = Tenant::class;
    protected static ?string $navigationIcon = 'heroicon-o-building-office-2';
    protected static ?string $navigationGroup = 'Tenant Management';
    protected static ?string $recordTitleAttribute = 'name';

    public static function getGloballySearchableAttributes(): array
    {
        return ['name', 'slug', 'domain', 'id'];
    }

    public static function getGlobalSearchResultDetails(\Illuminate\Database\Eloquent\Model $record): array
    {
        return [
            'ID' => "#{$record->id}",
            'Domain' => $record->domain ?? 'N/A',
            'Apps' => (string) $record->apps()->count(),
        ];
    }

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\TextInput::make('name')
                ->required()
                ->maxLength(255),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')->sortable(),
                Tables\Columns\TextColumn::make('name')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('apps_count')
                    ->counts('apps')
                    ->label('Apps'),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make()
                    ->requiresConfirmation()
                    ->modalHeading('Delete Tenant Organization')
                    ->modalDescription('Are you sure you want to permanently delete this tenant? All associated applications, configurations, and records will be affected.'),
                Tables\Actions\Action::make('impersonate')
                    ->label('Impersonate')
                    ->icon('heroicon-o-arrows-right-left')
                    ->color('warning')
                    ->requiresConfirmation()
                    ->action(function (Tenant $record, ImpersonationService $impersonation) {
                        /** @var \App\Models\User $user */
                        $user = auth()->user();
                        $impersonation->startImpersonation($user, $record);

                        Notification::make()
                            ->title("Now impersonating {$record->name}")
                            ->warning()
                            ->send();
                    }),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => TenantResource\Pages\ListTenants::route('/'),
        ];
    }
}
