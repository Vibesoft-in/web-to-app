<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AppStatus;
use App\Enums\Platform;
use App\Enums\SetupStep;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class App extends Model
{
    use BelongsToTenant;
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'ulid',
        'tenant_id',
        'name',
        'platform',
        'package_name',
        'app_key',
        'setup_step',
        'status',
        'firebase_project_id',
        'firebase_app_id',
        'assigned_theme_key',
    ];

    protected $casts = [
        'platform'   => Platform::class,
        'setup_step' => SetupStep::class,
        'status'     => AppStatus::class,
    ];

    protected $appends = [
        'active_plan',
        'can_apk',
        'can_aab',
        'has_admin_panel',
        'assigned_theme_key',
        'is_completed',
        'is_draft',
    ];

    public function getIsCompletedAttribute(): bool
    {
        return $this->isCompleted();
    }

    public function getIsDraftAttribute(): bool
    {
        return ! $this->isCompleted();
    }

    public function isCompleted(): bool
    {
        return in_array($this->status?->value ?? (string) $this->status, ['completed', 'live', 'active'], true)
            || $this->builds()->where('status', \App\Enums\BuildStatus::Ready)->exists();
    }

    public function markCompleted(): void
    {
        $this->update([
            'status'     => AppStatus::Completed,
            'setup_step' => SetupStep::Build,
        ]);
    }

    public function getActivePlanAttribute(): ?Plan
    {
        return $this->getActivePlan();
    }

    public function getCanApkAttribute(): bool
    {
        return $this->canDownloadApk();
    }

    public function getCanAabAttribute(): bool
    {
        return $this->canDownloadAab();
    }

    public function getHasAdminPanelAttribute(): bool
    {
        return $this->hasAdminPanelAccess();
    }

    public function getAssignedThemeKeyAttribute(): ?string
    {
        return $this->attributes['assigned_theme_key'] ?? null;
    }

    protected static function booted(): void
    {
        static::creating(function (App $app) {
            if (empty($app->ulid)) {
                $app->ulid = (string) \Illuminate\Support\Str::ulid();
            }
        });
    }

    // ── Relationships ──────────────────────────────────────────────────────────

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function connection(): HasOne
    {
        return $this->hasOne(Connection::class);
    }

    public function configs(): HasMany
    {
        return $this->hasMany(AppConfig::class);
    }

    public function builds(): HasMany
    {
        return $this->hasMany(Build::class);
    }

    public function integrations(): HasMany
    {
        return $this->hasMany(Integration::class);
    }

    public function keystore(): HasOne
    {
        return $this->hasOne(Keystore::class);
    }

    public function appUsers(): HasMany
    {
        return $this->hasMany(AppUser::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function notificationCampaigns(): HasMany
    {
        return $this->hasMany(NotificationCampaign::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function upgrades(): HasMany
    {
        return $this->hasMany(PackageUpgrade::class);
    }

    public function customFeatures(): HasMany
    {
        return $this->hasMany(CustomFeatureRequest::class);
    }

    public function getActivePlan(): ?Plan
    {
        $sub = $this->subscriptions()
            ->where('status', 'active')
            ->latest('id')
            ->with('plan')
            ->first();

        if ($sub?->plan) {
            return $sub->plan;
        }

        if (\Illuminate\Support\Facades\Schema::hasTable('orders')) {
            $order = $this->orders()
                ->where('status', 'paid')
                ->whereNotNull('package_id')
                ->latest('id')
                ->with('package')
                ->first();

            return $order?->package;
        }

        return null;
    }

    public function canDownloadApk(): bool
    {
        $plan = $this->getActivePlan();
        if (! $plan) {
            return false;
        }

        return (bool) ($plan->can_apk ?? true);
    }

    public function canDownloadAab(): bool
    {
        $plan = $this->getActivePlan();
        if ($plan && ($plan->can_aab ?? ($plan->name === 'Pro' || $plan->name === 'Premium' || $plan->name === 'Enterprise Suite' || $plan->name === 'Pro Combo'))) {
            return true;
        }

        if (! \Illuminate\Support\Facades\Schema::hasTable('orders')) {
            return false;
        }

        // Also check if Play Store build/publish addon was purchased as an order item for this app
        return $this->orders()
            ->where('status', 'paid')
            ->whereHas('items', function ($q) {
                $q->where('item_type', 'addon')
                  ->where(function ($subQ) {
                      $subQ->where('meta->slug', 'play_store_publish')
                           ->orWhere('meta->slug', 'play_store_build')
                           ->orWhere('meta->slug', 'aab_bundle');
                  });
            })
            ->exists();
    }

    public function canDownloadIpa(): bool
    {
        $plan = $this->getActivePlan();
        if ($plan) {
            $name = strtolower((string) $plan->name);
            if (in_array($name, ['pro', 'pro combo', 'pro growth', 'premium', 'enterprise', 'enterprise suite'], true)
                || ($plan->features['ipa_download'] ?? false)
                || ($plan->features['ipa'] ?? false)
                || ($plan->can_ipa ?? false)) {
                return true;
            }
        }

        if (! \Illuminate\Support\Facades\Schema::hasTable('orders')) {
            return false;
        }

        // Also check if iOS bundle add-on was purchased as an order item for this app
        return $this->orders()
            ->where('status', 'paid')
            ->whereHas('items', function ($q) {
                $q->where('item_type', 'addon')
                  ->where(function ($subQ) {
                      $subQ->where('meta->slug', 'ios_bundle')
                           ->orWhere('meta->slug', 'apple_store')
                           ->orWhere('meta->slug', 'apple_store_publish')
                           ->orWhere('meta->slug', 'ios_package')
                           ->orWhere('meta->name', 'like', '%iOS%')
                           ->orWhere('meta->name', 'like', '%Apple%');
                  });
            })
            ->exists();
    }

    public function hasAdminPanelAccess(): bool
    {
        $plan = $this->getActivePlan();
        if ($plan) {
            $name = strtolower((string) $plan->name);
            if (in_array($name, ['premium', 'enterprise', 'enterprise suite'], true)
                || ($plan->features['admin_panel'] ?? false)
                || ($plan->has_admin_panel ?? false)) {
                return true;
            }
        }

        if (! \Illuminate\Support\Facades\Schema::hasTable('orders')) {
            return false;
        }

        // Also check if admin_panel_addon was purchased as an order item for this app
        return $this->orders()
            ->where('status', 'paid')
            ->whereHas('items', function ($q) {
                $q->where('item_type', 'addon')
                  ->where(function ($subQ) {
                      $subQ->where('meta->slug', 'admin_panel_addon')
                           ->orWhere('meta->slug', 'admin_panel')
                           ->orWhere('meta->name', 'like', '%Admin Panel%');
                  });
            })
            ->exists();
    }

    /**
     * Get the theme assigned by website admin or default free theme.
     */
    public function getAssignedTheme(): Theme
    {
        $themeKey = $this->assigned_theme_key ?: 'theme_a';
        return Theme::where('key', $themeKey)->first()
            ?? Theme::where('is_free_theme', true)->first()
            ?? Theme::first()
            ?? Theme::create([
                'key'           => 'theme_a',
                'name'          => 'Modern Retail',
                'is_free_theme' => true,
                'price'         => 0,
                'defaults'      => [],
            ]);
    }

    /**
     * Users cannot change themes on free/standard plans — themes are assigned by the website admin.
     * Only Premium tier unlocks theme switching / exclusive themes.
     */
    public function canUserChangeTheme(): bool
    {
        $plan = $this->getActivePlan();
        if ($plan && in_array(strtolower($plan->name), ['premium', 'enterprise', 'enterprise suite'], true)) {
            return true;
        }

        return false;
    }

    /**
     * Returns list of add-on IDs purchased for this application from paid orders.
     */
    public function getPurchasedAddonIds(): array
    {
        return OrderItem::whereHas('order', function ($q) {
            $q->where('app_id', $this->id)->where('status', 'paid');
        })
        ->where('item_type', 'addon')
        ->pluck('item_id')
        ->map(fn ($id) => (int) $id)
        ->unique()
        ->values()
        ->toArray();
    }

    /**
     * Returns list of add-on slugs purchased for this application from paid orders.
     */
    public function getPurchasedAddonSlugs(): array
    {
        $items = OrderItem::whereHas('order', function ($q) {
            $q->where('app_id', $this->id)->where('status', 'paid');
        })
        ->where('item_type', 'addon')
        ->get();

        $slugs = [];
        foreach ($items as $item) {
            if (! empty($item->meta['slug'])) {
                $slugs[] = $item->meta['slug'];
            }
        }

        return array_values(array_unique($slugs));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Determines if a new build can be triggered.
     * All conditions must pass (rule from docs §6).
     */
    public function isBuildAllowed(): bool
    {
        $connection = $this->connection()->first();

        return $connection !== null
            && $connection->status === \App\Enums\ConnectionStatus::Verified
            && $this->hasPublishedConfig()
            && $this->hasActiveSubscription();
    }

    public function hasPublishedConfig(): bool
    {
        return $this->configs()
            ->where('state', 'published')
            ->exists();
    }

    public function hasActiveSubscription(): bool
    {
        return $this->subscriptions()
            ->where('status', 'active')
            ->where('current_period_end', '>', now())
            ->exists();
    }

    /**
     * @return array<string> List of blockers preventing app build
     */
    public function getBuildBlockers(): array
    {
        $blockers = [];
        $connection = $this->connection()->first();

        if (! $connection || $connection->status !== \App\Enums\ConnectionStatus::Verified) {
            $blockers[] = 'CONNECTION_NOT_VERIFIED';
        }

        if (! $this->hasPublishedConfig()) {
            $blockers[] = 'CONFIG_NOT_PUBLISHED';
        }

        if (! $this->hasActiveSubscription()) {
            $blockers[] = 'SUBSCRIPTION_NOT_ACTIVE';
        }

        return $blockers;
    }
}
