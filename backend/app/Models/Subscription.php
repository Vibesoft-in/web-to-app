<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Subscription extends Model
{
    use BelongsToTenant;
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'app_id',
        'plan_id',
        'status',
        'razorpay_sub_id',
        'current_period_end',
    ];

    protected $casts = [
        'current_period_end' => 'datetime',
    ];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function app(): BelongsTo
    {
        return $this->belongsTo(App::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active'
            && $this->current_period_end
            && $this->current_period_end->isFuture();
    }

    public function revoke(?string $reason = null): void
    {
        $this->update([
            'status'             => 'cancelled',
            'current_period_end' => now(),
        ]);
    }
}
