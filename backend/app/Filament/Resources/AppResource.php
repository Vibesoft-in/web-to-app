<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Models\App;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class AppResource extends Resource
{
    protected static ?string $model = App::class;
    protected static ?string $navigationIcon = 'heroicon-o-device-phone-mobile';
    protected static ?string $navigationGroup = 'Apps & Builds';

    public static function getEloquentQuery(): \Illuminate\Database\Eloquent\Builder
    {
        return parent::getEloquentQuery()->withoutGlobalScopes();
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')->sortable(),
                Tables\Columns\TextColumn::make('name')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('tenant.name')
                    ->label('Tenant Account')
                    ->formatStateUsing(function ($record) {
                        $userEmail = $record->tenant?->users?->first()?->email;
                        return "#{$record->tenant_id} {$record->tenant?->name}" . ($userEmail ? " ({$userEmail})" : "");
                    })
                    ->wrap()
                    ->sortable(),
                Tables\Columns\TextColumn::make('platform')->badge(),
                Tables\Columns\TextColumn::make('assigned_theme_key')
                    ->label('Assigned Theme')
                    ->badge()
                    ->color('info')
                    ->formatStateUsing(fn ($state) => match ($state) {
                        'theme_a' => 'Modern Retail (Free Admin Theme)',
                        'theme_b' => 'Luxury Boutique',
                        'theme_c' => 'Vibrant Lifestyle',
                        'theme_d' => 'Elite Dark Luxe',
                        default   => $state ?? 'Modern Retail (Free Admin Theme)',
                    }),
                Tables\Columns\TextColumn::make('setup_step')->label('Step')->badge(),
                Tables\Columns\TextColumn::make('status')->badge(),
                Tables\Columns\TextColumn::make('package_name')->searchable()->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('created_at')->dateTime()->sortable()->toggleable(isToggledHiddenByDefault: true),
            ])
            ->actions([
                Tables\Actions\Action::make('assign_theme')
                    ->label('Give Theme')
                    ->icon('heroicon-o-paint-brush')
                    ->color('warning')
                    ->form([
                        \Filament\Forms\Components\Select::make('assigned_theme_key')
                            ->label('Select Theme to Give to App')
                            ->helperText('This theme will be locked for the user. Free/standard users cannot change this theme.')
                            ->options([
                                'theme_a' => 'Modern Retail (Standard Free Theme)',
                                'theme_b' => 'Luxury Boutique Theme',
                                'theme_c' => 'Vibrant Lifestyle Theme',
                                'theme_d' => 'Elite Dark Luxe Theme (Premium Exclusive)',
                            ])
                            ->required()
                            ->default(fn ($record) => $record->assigned_theme_key ?? 'theme_a'),
                    ])
                    ->action(function (App $record, array $data) {
                        $themeKey = $data['assigned_theme_key'];
                        $record->update(['assigned_theme_key' => $themeKey]);

                        $theme = \App\Models\Theme::where('key', $themeKey)->first();
                        if ($theme) {
                            $draft = $record->configs()->where('state', 'draft')->latest()->first();
                            if ($draft) {
                                $config = $draft->config ?? [];
                                $config['theme'] = $theme->defaults;
                                $config['theme']['layout'] = $theme->key;
                                $draft->update(['config' => $config]);
                            }
                        }

                        \Filament\Notifications\Notification::make()
                            ->title('Theme Assigned Successfully')
                            ->body("Admin has assigned {$themeKey} to {$record->name}. The user will be locked to this theme.")
                            ->success()
                            ->send();
                    }),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => AppResource\Pages\ListApps::route('/'),
        ];
    }
}
