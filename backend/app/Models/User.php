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
        'two_factor_secret'  => 'encrypted', // stored encrypted at rest
    ];

    protected $appends = [
        'is_super_admin',
        'has_apps',
        'apps_count',
        'has_built_apps',
        'latest_draft',
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

    public function canAccessPanel(Panel $panel): bool
    {
        return $this->isSuperAdmin() || $this->email === 'admin@webintoapp.com';
    }
}
