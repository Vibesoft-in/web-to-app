<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tenant extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'ulid',
        'name',
        'owner_user_id',
        'status',
    ];

    protected $casts = [
        'status' => \App\Enums\TenantStatus::class,
    ];

    // ── Relationships ──────────────────────────────────────────────────────────

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function apps(): HasMany
    {
        return $this->hasMany(App::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function builds(): HasMany
    {
        return $this->hasMany(Build::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
