<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ConnectionStatus;
use App\Enums\Platform;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Connection extends Model
{
    use BelongsToTenant;
    use HasFactory;
    use SoftDeletes;

    protected $attributes = [
        'platform' => Platform::WooCommerce,
        'status'   => ConnectionStatus::NotStarted,
    ];

    protected $fillable = [
        'tenant_id',
        'app_id',
        'platform',
        'site_url',
        'credentials',       // encrypted json via cast
        'status',
        'last_verified_at',
        'last_error_code',
    ];

    protected $hidden = [
        'credentials',       // never expose raw credentials in serialization
    ];

    protected $appends = [
        'store_url',
    ];

    protected $casts = [
        'credentials'     => 'encrypted:array', // AES-256 encrypted JSON
        'platform'        => Platform::class,
        'status'          => ConnectionStatus::class,
        'last_verified_at' => 'datetime',
    ];

    public function getStoreUrlAttribute(): ?string
    {
        return $this->site_url;
    }

    public function app(): BelongsTo
    {
        return $this->belongsTo(App::class);
    }

    /** Return masked consumer key for display (never expose full key). */
    public function maskedKey(): ?string
    {
        $creds = $this->credentials;
        $key   = $creds['consumer_key'] ?? null;

        if ($key === null) {
            return null;
        }

        return substr($key, 0, 3).'****'.substr($key, -4);
    }
}
