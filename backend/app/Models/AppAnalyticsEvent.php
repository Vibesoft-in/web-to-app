<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppAnalyticsEvent extends Model
{
    use HasFactory;

    protected $table = 'app_analytics_events';

    protected $fillable = [
        'app_id',
        'tenant_id',
        'event_type',
        'session_id',
        'device_id',
        'platform',
        'screen_name',
        'screen_id',
        'previous_screen',
        'duration_seconds',
        'device_model',
        'os_version',
        'app_version',
        'country',
        'meta',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'meta'             => 'array',
        'duration_seconds' => 'integer',
        'created_at'       => 'datetime',
        'updated_at'       => 'datetime',
    ];

    public function app(): BelongsTo
    {
        return $this->belongsTo(App::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
