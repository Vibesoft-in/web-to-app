<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\UserRole;
use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail, FilamentUser
{
    use HasApiTokens;
    use HasFactory;
    use Notifiable;
    use SoftDeletes;

    /**
     * Mass-assignable attributes.
     * tenant_id is intentionally excluded — always set from auth context or explicitly.
     */
    protected $fillable = [
        'tenant_id',
        'name',
        'email',
        'avatar_url',
        'phone',
        'password',
        'role',
        'is_blocked',
        'blocked_at',
        'blocked_reason',
        'email_verified_at',
        'phone_verified_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
    ];

    protected $casts = [
        'email_verified_at'  => 'datetime',
        'phone_verified_at'  => 'datetime',
        'password'           => 'hashed',
        'role'               => UserRole::class,
        'is_blocked'         => 'boolean',
        'blocked_at'         => 'datetime',
        'two_factor_secret'  => 'encrypted', // stored encrypted at rest
    ];

    protected $appends = [
        'is_super_admin',
        'has_apps',
        'apps_count',
        'has_built_apps',
        'latest_draft',
        'is_blocked',
    ];

    // ── Relationships ──────────────────────────────────────────────────────────

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class, 'actor_id');
    }

    public function apps(): HasMany
    {
        return $this->hasMany(App::class, 'tenant_id', 'tenant_id');
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class, 'tenant_id', 'tenant_id');
    }

    public function getUsernameAttribute(): string
    {
        if (! empty($this->phone)) {
            return $this->phone;
        }

        return \Illuminate\Support\Str::before($this->email, '@');
    }

    public function getAppsCountAttribute(): int
    {
        return App::withoutTenantScope()->where('tenant_id', $this->tenant_id)->count();
    }

    public function getHasAppsAttribute(): bool
    {
        return $this->apps_count > 0;
    }

    public function getHasBuiltAppsAttribute(): bool
    {
        return App::withoutTenantScope()
            ->where('tenant_id', $this->tenant_id)
            ->where(function ($q) {
                $q->whereIn('status', ['completed', 'live', 'active'])
                  ->orWhereIn('setup_step', ['build', 'completed'])
                  ->orWhereHas('builds');
            })->exists();
    }

    public function getLatestDraftApp(): ?App
    {
        return App::withoutTenantScope()
            ->where('tenant_id', $this->tenant_id)
            ->whereNotIn('status', ['completed', 'live', 'active'])
            ->whereNotIn('setup_step', ['build', 'completed'])
            ->whereDoesntHave('builds')
            ->latest('updated_at')
            ->first();
    }

    public function getLatestDraftAttribute(): ?array
    {
        $draft = $this->getLatestDraftApp();
        if (! $draft) {
            return null;
        }

        return [
            'id'         => $draft->id,
            'ulid'       => $draft->ulid,
            'name'       => $draft->name,
            'platform'   => $draft->platform->value ?? (string) $draft->platform,
            'setup_step' => $draft->setup_step->value ?? (string) $draft->setup_step,
            'status'     => $draft->status->value ?? (string) $draft->status,
        ];
    }

    public function getIsSuperAdminAttribute(): bool
    {
        return $this->isSuperAdmin();
    }

    public function getBuildsCountAttribute(): int
    {
        return Build::withoutGlobalScopes()->where('tenant_id', $this->tenant_id)->count();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public function isOwner(): bool
    {
        return $this->role === UserRole::Owner;
    }

    public function isSuperAdmin(): bool
    {
        return $this->email === 'admin@webintoapp.com'
            || ($this->role === UserRole::Owner && $this->tenant_id === 1 && str_contains($this->email, 'admin'));
    }

    public function isEditor(): bool
    {
        return in_array($this->role, [UserRole::Owner, UserRole::Editor], strict: true);
    }

    public function isBlocked(): bool
    {
        return (bool) $this->is_blocked || BlockedEmail::where('email', strtolower($this->email))->exists();
    }

    public function block(?string $reason = null, ?int $adminId = null): void
    {
        $this->update([
            'is_blocked'     => true,
            'blocked_at'     => now(),
            'blocked_reason' => $reason,
        ]);

        BlockedEmail::updateOrCreate(
            ['email' => strtolower($this->email)],
            [
                'reason'             => $reason,
                'blocked_by_user_id' => $adminId,
            ]
        );

        $this->tokens()->delete();
    }

    public function unblock(): void
    {
        $this->update([
            'is_blocked'     => false,
            'blocked_at'     => null,
            'blocked_reason' => null,
        ]);

        BlockedEmail::where('email', strtolower($this->email))->delete();
    }

    /**
     * Revoke all active subscriptions and commercial plan entitlements for this user/tenant,
     * immediately cancelling access even if time remains.
     */
    public function revokeAllSubscriptions(?string $reason = null): int
    {
        $tenantId = $this->tenant_id;
        if (! $tenantId) {
            return 0;
        }

        $revokedCount = Subscription::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->update([
                'status'             => 'cancelled',
                'current_period_end' => now(),
            ]);

        // Revoke active commercial package orders for this tenant
        if (\Illuminate\Support\Facades\Schema::hasTable('orders')) {
            Order::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->whereNotNull('package_id')
                ->whereIn('status', ['paid', 'completed'])
                ->update(['status' => 'revoked']);
        }

        // Notify user via email
        try {
            app(\App\Services\Billing\EmailNotificationService::class)->sendSubscriptionRevokedEmail(
                $this->email,
                $this->name,
                'Commercial Package / Subscription',
                $reason
            );
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Revocation email notice: ' . $e->getMessage());
        }

        return $revokedCount;
    }

    public function canAccessPanel(Panel $panel): bool
    {
        if ($this->isBlocked()) {
            return false;
        }

        return $this->isSuperAdmin() || $this->email === 'admin@webintoapp.com';
    }
}
