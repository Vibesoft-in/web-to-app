<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Jobs\RunBuildJob;
use App\Models\Build;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Storage;

class BuildResource extends Resource
{
    protected static ?string $model = Build::class;
    protected static ?string $navigationIcon = 'heroicon-o-cpu-chip';
    protected static ?string $navigationGroup = 'Apps & Builds';
    protected static ?string $recordTitleAttribute = 'id';

    public static function getGloballySearchableAttributes(): array
    {
        return ['id', 'version_name', 'version_code', 'app.name'];
    }

    public static function getGlobalSearchResultDetails(\Illuminate\Database\Eloquent\Model $record): array
    {
        return [
            'App' => $record->app?->name ?? 'N/A',
            'Version' => "v{$record->version_name} ({$record->version_code})",
            'Status' => ucfirst((string) ($record->status?->value ?? $record->status)),
        ];
    }

    public static function getEloquentQuery(): \Illuminate\Database\Eloquent\Builder
    {
        return parent::getEloquentQuery()->withoutGlobalScopes();
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')->sortable(),
                Tables\Columns\TextColumn::make('app.name')->label('App')->sortable(),
                Tables\Columns\TextColumn::make('status')
                    ->badge()
                    ->color(fn ($state): string => match ($state instanceof \App\Enums\BuildStatus ? $state->value : (string) ($state?->value ?? $state)) {
                        'ready'     => 'success',
                        'failed', 'timed_out' => 'danger',
                        'building', 'signing', 'preparing', 'queued' => 'warning',
                        default     => 'gray',
                    }),
                Tables\Columns\TextColumn::make('version_code')->label('Code'),
                Tables\Columns\TextColumn::make('version_name')->label('Version'),
                Tables\Columns\TextColumn::make('started_at')->dateTime()->sortable()->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('finished_at')->dateTime()->sortable()->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('error')->limit(30)->tooltip(fn ($record) => $record->error)->toggleable(isToggledHiddenByDefault: true),
            ])
            ->actions([
                Tables\Actions\Action::make('retry')
                    ->label('Retry Build')
                    ->icon('heroicon-o-arrow-path')
                    ->color('warning')
                    ->requiresConfirmation()
                    ->visible(fn (Build $record) => ($record->status instanceof \App\Enums\BuildStatus ? $record->status->value : (string) ($record->status?->value ?? $record->status)) === 'failed')
                    ->action(function (Build $record) {
                        $record->update(['status' => 'queued', 'error' => null]);
                        RunBuildJob::dispatch($record->id);

                        Notification::make()
                            ->title('Build re-queued')
                            ->success()
                            ->send();
                    }),

                Tables\Actions\Action::make('view_logs')
                    ->label('Logs')
                    ->icon('heroicon-o-document-text')
                    ->color('gray')
                    ->modalHeading(fn (Build $record) => "Build #{$record->id} Logs")
                    ->modalDescription(function (Build $record) {
                        if (empty($record->logs_path) || ! Storage::disk('local')->exists($record->logs_path)) {
                            return 'No logs recorded for this build.';
                        }
                        return Storage::disk('local')->get($record->logs_path);
                    })
                    ->modalSubmitAction(false),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => BuildResource\Pages\ListBuilds::route('/'),
        ];
    }
}
