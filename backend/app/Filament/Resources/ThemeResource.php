<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Models\Theme;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class ThemeResource extends Resource
{
    protected static ?string $model = Theme::class;
    protected static ?string $navigationIcon = 'heroicon-o-paint-brush';
    protected static ?string $navigationGroup = 'Apps & Builds';
    protected static ?int $navigationSort = 3;

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')->sortable(),
                Tables\Columns\TextColumn::make('name')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('key')->badge()->color('gray'),
                Tables\Columns\IconColumn::make('is_free_theme')
                    ->label('Admin Free Theme')
                    ->boolean()
                    ->trueIcon('heroicon-o-check-badge')
                    ->falseIcon('heroicon-o-x-circle')
                    ->trueColor('success')
                    ->falseColor('gray'),
                Tables\Columns\IconColumn::make('is_active')
                    ->label('Active')
                    ->boolean(),
                Tables\Columns\TextColumn::make('created_at')->dateTime()->sortable()->toggleable(isToggledHiddenByDefault: true),
            ])
            ->actions([
                Tables\Actions\Action::make('set_as_free_theme')
                    ->label('Set as Website Free Theme')
                    ->icon('heroicon-o-star')
                    ->color('warning')
                    ->requiresConfirmation()
                    ->modalHeading('Set as Official Free Theme')
                    ->modalDescription('This theme will be automatically given to all standard and new mobile apps by default. Regular users will not be able to change this theme.')
                    ->action(function (Theme $record) {
                        Theme::query()->update(['is_free_theme' => false]);
                        $record->update(['is_free_theme' => true, 'is_active' => true]);

                        \Filament\Notifications\Notification::make()
                            ->title('Admin Free Theme Updated')
                            ->body("{$record->name} is now the official free theme given by the website admin to users.")
                            ->success()
                            ->send();
                    }),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ThemeResource\Pages\ListThemes::route('/'),
        ];
    }
}
