<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Enums\AppStatus;
use App\Models\App;
use App\Models\AppConfig;
use App\Models\AuditLog;
use App\Models\Build;
use App\Models\Theme;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Support\Enums\MaxWidth;
use Filament\Tables;
use Filament\Tables\Table;

class AppResource extends Resource
{
    protected static ?string $model = App::class;
    protected static ?string $navigationIcon = 'heroicon-o-device-phone-mobile';
    protected static ?string $navigationGroup = 'Apps & Builds';
    protected static ?string $recordTitleAttribute = 'name';

    public static function getGloballySearchableAttributes(): array
    {
        return ['name', 'package_name', 'ulid', 'app_key', 'tenant.name'];
    }

    public static function getGlobalSearchResultDetails(\Illuminate\Database\Eloquent\Model $record): array
    {
        return [
            'Tenant' => $record->tenant?->name ?? 'None',
            'Package' => $record->package_name ?? 'N/A',
            'Platform' => strtoupper((string) ($record->platform?->value ?? $record->platform)),
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
                Tables\Columns\TextColumn::make('name')
                    ->label('Application Name')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),
                Tables\Columns\TextColumn::make('tenant.name')
                    ->label('Tenant Account')
                    ->formatStateUsing(function ($record) {
                        $userEmail = $record->tenant?->users?->first()?->email;
                        return "#{$record->tenant_id} {$record->tenant?->name}" . ($userEmail ? " ({$userEmail})" : "");
                    })
                    ->wrap()
                    ->sortable(),
                Tables\Columns\TextColumn::make('platform')
                    ->badge()
                    ->color('primary'),
                Tables\Columns\TextColumn::make('assigned_theme_key')
                    ->label('Theme')
                    ->badge()
                    ->color('info')
                    ->formatStateUsing(fn ($state) => match ($state) {
                        'theme_a' => 'Modern Retail',
                        'theme_b' => 'Luxury Boutique',
                        'theme_c' => 'Vibrant Lifestyle',
                        'theme_d' => 'Elite Dark Luxe',
                        default   => $state ?? 'Modern Retail',
                    }),
                Tables\Columns\TextColumn::make('version_summary')
                    ->label('Current Version')
                    ->state(function (App $record): string {
                        $latestBuild = Build::withoutGlobalScopes()
                            ->where('app_id', $record->id)
                            ->latest()
                            ->first();
                        if ($latestBuild) {
                            return "v{$latestBuild->version_name} ({$latestBuild->version_code})";
                        }
                        $latestConfig = $record->configs()->latest()->first();
                        return $latestConfig ? "Config v{$latestConfig->version}" : '1.0.0 (Initial)';
                    })
                    ->badge()
                    ->color('gray'),
                Tables\Columns\TextColumn::make('status')
                    ->badge()
                    ->color(fn ($state): string => match ($state instanceof AppStatus ? $state->value : (string) ($state?->value ?? $state)) {
                        'active', 'live', 'completed' => 'success',
                        'building', 'configured', 'verified', 'draft' => 'info',
                        'maintenance', 'restricted' => 'warning',
                        'suspended', 'disabled' => 'danger',
                        default => 'gray',
                    }),
                Tables\Columns\TextColumn::make('package_name')
                    ->label('Package ID')
                    ->searchable()
                    ->copyable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->actions([
                // 1. Version History Action
                Tables\Actions\Action::make('version_history')
                    ->label('Version History')
                    ->icon('heroicon-o-clock')
                    ->color('info')
                    ->modalWidth(MaxWidth::FourExtraLarge)
                    ->modalHeading(fn (App $record): string => "App Version History: {$record->name}")
                    ->form([
                        Forms\Components\Placeholder::make('versions_list')
                            ->label('Build & Configuration History')
                            ->content(function (App $record) {
                                $builds = Build::withoutGlobalScopes()
                                    ->where('app_id', $record->id)
                                    ->latest()
                                    ->limit(10)
                                    ->get();

                                if ($builds->isEmpty()) {
                                    return new \Illuminate\Support\HtmlString('<p class="text-gray-500 italic">No builds have been generated yet for this application.</p>');
                                }

                                $html = '<div class="overflow-x-auto"><table class="w-full text-sm text-left border border-gray-200 dark:border-gray-700">';
                                $html .= '<thead class="bg-gray-100 dark:bg-gray-800 text-xs font-semibold uppercase"><tr>';
                                $html .= '<th class="px-4 py-2">Build ID</th><th class="px-4 py-2">Version Name</th><th class="px-4 py-2">Version Code</th><th class="px-4 py-2">Status</th><th class="px-4 py-2">Created At</th><th class="px-4 py-2">Artifact</th></tr></thead><tbody>';

                                foreach ($builds as $b) {
                                    $statusBadge = '<span class="px-2 py-0.5 rounded text-xs ' .
                                        (($b->status?->value ?? $b->status) === 'ready' ? 'bg-green-100 text-green-800' :
                                        ((($b->status?->value ?? $b->status) === 'failed') ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800')) .
                                        '">' . ucfirst((string) ($b->status?->value ?? $b->status)) . '</span>';

                                    $artifactLink = $b->artifact_path
                                        ? '<a href="/api/v1/builds/' . $b->id . '/download" target="_blank" class="text-primary-600 underline text-xs font-semibold">Download APK</a>'
                                        : '<span class="text-gray-400 text-xs">No artifact</span>';

                                    $html .= '<tr class="border-b border-gray-100 dark:border-gray-800">';
                                    $html .= '<td class="px-4 py-2 font-mono">#' . $b->id . '</td>';
                                    $html .= '<td class="px-4 py-2 font-medium">v' . ($b->version_name ?? '1.0.0') . '</td>';
                                    $html .= '<td class="px-4 py-2">' . ($b->version_code ?? '1') . '</td>';
                                    $html .= '<td class="px-4 py-2">' . $statusBadge . '</td>';
                                    $html .= '<td class="px-4 py-2 text-gray-500">' . ($b->created_at ? $b->created_at->format('M d, Y H:i') : '-') . '</td>';
                                    $html .= '<td class="px-4 py-2">' . $artifactLink . '</td>';
                                    $html .= '</tr>';
                                }
                                $html .= '</tbody></table></div>';

                                return new \Illuminate\Support\HtmlString($html);
                            }),
                    ]),

                // 2. Configuration Override Action
                Tables\Actions\Action::make('config_override')
                    ->label('Config Override')
                    ->icon('heroicon-o-adjustments-horizontal')
                    ->color('primary')
                    ->modalWidth(MaxWidth::ThreeExtraLarge)
                    ->modalHeading(fn (App $record): string => "Super Admin Config Override: {$record->name}")
                    ->fillForm(function (App $record): array {
                        $draft = $record->configs()->where('state', 'draft')->latest()->first()
                            ?? $record->configs()->latest()->first();
                        $cfg = $draft?->config ?? [];

                        return [
                            'name' => $record->name,
                            'package_name' => $record->package_name,
                            'assigned_theme_key' => $record->assigned_theme_key ?? 'theme_a',
                            'app_icon_url' => $cfg['assets']['icon_url'] ?? '',
                            'splash_screen_url' => $cfg['assets']['splash_screen_url'] ?? '',
                            'primary_color' => $cfg['theme']['primary_color'] ?? '#E53935',
                            'secondary_color' => $cfg['theme']['secondary_color'] ?? '#000000',
                            'typography_font' => $cfg['theme']['font_family'] ?? 'Inter',
                            'navigation_layout' => $cfg['navigation']['layout'] ?? 'bottom_tabs',
                            'feature_push_notifications' => (bool) ($cfg['features']['push_notifications'] ?? true),
                            'feature_biometrics' => (bool) ($cfg['features']['biometrics'] ?? false),
                            'feature_offline_mode' => (bool) ($cfg['features']['offline_mode'] ?? true),
                            'feature_dark_mode' => (bool) ($cfg['features']['dark_mode'] ?? true),
                        ];
                    })
                    ->form([
                        Forms\Components\Tabs::make('Configuration Tabs')
                            ->tabs([
                                Forms\Components\Tabs\Tab::make('General & Branding')
                                    ->schema([
                                        Forms\Components\TextInput::make('name')
                                            ->label('App Display Name')
                                            ->required(),
                                        Forms\Components\TextInput::make('package_name')
                                            ->label('Android Package Identifier')
                                            ->placeholder('com.example.app')
                                            ->required(),
                                        Forms\Components\TextInput::make('app_icon_url')
                                            ->label('App Icon URL')
                                            ->url()
                                            ->placeholder('https://.../icon.png'),
                                        Forms\Components\TextInput::make('splash_screen_url')
                                            ->label('Splash Screen Image / Banner URL')
                                            ->url()
                                            ->placeholder('https://.../splash.png'),
                                    ]),
                                Forms\Components\Tabs\Tab::make('Theme & Typography')
                                    ->schema([
                                        Forms\Components\Select::make('assigned_theme_key')
                                            ->label('Assigned Theme Template')
                                            ->options([
                                                'theme_a' => 'Modern Retail (Standard Theme)',
                                                'theme_b' => 'Luxury Boutique Theme',
                                                'theme_c' => 'Vibrant Lifestyle Theme',
                                                'theme_d' => 'Elite Dark Luxe Theme (Premium)',
                                            ])
                                            ->required(),
                                        Forms\Components\ColorPicker::make('primary_color')
                                            ->label('Primary Brand Color')
                                            ->default('#E53935'),
                                        Forms\Components\ColorPicker::make('secondary_color')
                                            ->label('Secondary / Background Color')
                                            ->default('#000000'),
                                        Forms\Components\Select::make('typography_font')
                                            ->label('Typography / Font Family')
                                            ->options([
                                                'Inter' => 'Inter (Modern Sans)',
                                                'Roboto' => 'Roboto (Material)',
                                                'Poppins' => 'Poppins (Contemporary)',
                                                'Playfair Display' => 'Playfair Display (Luxury Serif)',
                                            ])
                                            ->default('Inter'),
                                        Forms\Components\Select::make('navigation_layout')
                                            ->label('Navigation Layout')
                                            ->options([
                                                'bottom_tabs' => 'Bottom Navigation Bar (Tabs)',
                                                'drawer' => 'Slide-out Navigation Drawer',
                                                'minimal' => 'Minimal Header Navigation',
                                            ])
                                            ->default('bottom_tabs'),
                                    ]),
                                Forms\Components\Tabs\Tab::make('Feature Access Controls')
                                    ->schema([
                                        Forms\Components\Toggle::make('feature_push_notifications')
                                            ->label('Push Notifications')
                                            ->helperText('Allow app to receive FCM push alerts and campaigns')
                                            ->default(true),
                                        Forms\Components\Toggle::make('feature_biometrics')
                                            ->label('Biometric Authentication (Fingerprint / FaceID)')
                                            ->default(false),
                                        Forms\Components\Toggle::make('feature_offline_mode')
                                            ->label('Offline Product Caching & Browsing')
                                            ->default(true),
                                        Forms\Components\Toggle::make('feature_dark_mode')
                                            ->label('Dark Mode Support')
                                            ->default(true),
                                    ]),
                            ])
                            ->columnSpanFull(),
                    ])
                    ->action(function (App $record, array $data) {
                        $record->update([
                            'name' => $data['name'],
                            'package_name' => $data['package_name'],
                            'assigned_theme_key' => $data['assigned_theme_key'],
                        ]);

                        // Update or create draft config
                        $configRecord = $record->configs()->where('state', 'draft')->latest()->first()
                            ?? $record->configs()->latest()->first();

                        $cfg = $configRecord?->config ?? [];
                        $cfg['assets']['icon_url'] = $data['app_icon_url'];
                        $cfg['assets']['splash_screen_url'] = $data['splash_screen_url'];
                        $cfg['theme']['primary_color'] = $data['primary_color'];
                        $cfg['theme']['secondary_color'] = $data['secondary_color'];
                        $cfg['theme']['font_family'] = $data['typography_font'];
                        $cfg['theme']['layout'] = $data['assigned_theme_key'];
                        $cfg['navigation']['layout'] = $data['navigation_layout'];
                        $cfg['features']['push_notifications'] = $data['feature_push_notifications'];
                        $cfg['features']['biometrics'] = $data['feature_biometrics'];
                        $cfg['features']['offline_mode'] = $data['feature_offline_mode'];
                        $cfg['features']['dark_mode'] = $data['feature_dark_mode'];

                        if ($configRecord) {
                            $configRecord->update(['config' => $cfg]);
                        } else {
                            $record->configs()->create([
                                'tenant_id' => $record->tenant_id,
                                'version' => 1,
                                'state' => 'draft',
                                'config' => $cfg,
                            ]);
                        }

                        // Audit Log
                        AuditLog::create([
                            'actor_id' => auth()->id() ?? 1,
                            'tenant_id' => $record->tenant_id,
                            'action' => 'app.config_override',
                            'target' => "App:{$record->id}",
                            'ip' => request()->ip(),
                            'user_agent' => request()->userAgent(),
                            'meta' => ['app_id' => $record->id, 'changes' => $data],
                            'created_at' => now(),
                        ]);

                        Notification::make()
                            ->title('Configuration Overridden')
                            ->body("Super Admin overrides applied successfully to {$record->name}.")
                            ->success()
                            ->send();
                    }),

                // 3. Status Controls Action
                Tables\Actions\Action::make('status_controls')
                    ->label('Status Controls')
                    ->icon('heroicon-o-shield-exclamation')
                    ->color('warning')
                    ->requiresConfirmation()
                    ->modalHeading(fn (App $record): string => "Application Status & Access Controls: {$record->name}")
                    ->fillForm(fn (App $record): array => [
                        'status' => $record->status instanceof AppStatus ? $record->status->value : (string) ($record->status?->value ?? $record->status),
                        'suspension_reason' => '',
                        'notify_customer' => true,
                    ])
                    ->form([
                        Forms\Components\Select::make('status')
                            ->label('Application Operational Status')
                            ->options([
                                'active'      => 'Active (Normal Operations)',
                                'suspended'   => 'Suspended (All Operations Halted)',
                                'maintenance' => 'Under Maintenance',
                                'restricted'  => 'Build Restricted (Build generation blocked)',
                                'disabled'    => 'Temporarily Disabled',
                            ])
                            ->required(),
                        Forms\Components\Textarea::make('suspension_reason')
                            ->label('Reason for Status Change / Suspension')
                            ->placeholder('Provide internal rationale and information for the customer...')
                            ->rows(3),
                        Forms\Components\Toggle::make('notify_customer')
                            ->label('Notify Customer via Registered Email')
                            ->default(true),
                    ])
                    ->action(function (App $record, array $data) {
                        $newStatus = $data['status'];
                        $record->update(['status' => $newStatus]);

                        AuditLog::create([
                            'actor_id' => auth()->id() ?? 1,
                            'tenant_id' => $record->tenant_id,
                            'action' => "app.status_changed_to_{$newStatus}",
                            'target' => "App:{$record->id}",
                            'ip' => request()->ip(),
                            'user_agent' => request()->userAgent(),
                            'meta' => [
                                'app_id' => $record->id,
                                'new_status' => $newStatus,
                                'reason' => $data['suspension_reason'] ?? '',
                                'customer_notified' => $data['notify_customer'],
                            ],
                            'created_at' => now(),
                        ]);

                        Notification::make()
                            ->title("App Status Changed to {$newStatus}")
                            ->warning()
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
