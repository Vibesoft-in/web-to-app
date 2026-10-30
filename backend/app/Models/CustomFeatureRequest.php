<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomFeatureRequest extends Model
{
    use BelongsToTenant;
    use HasFactory;

    protected $fillable = [
        'ticket_number',
        'tenant_id',
        'user_id',
        'app_id',
        'feature_name',
        'requirements',
        'reference_url',
        'expected_functionality',
        'additional_notes',
        'status', // 'pending_review', 'quoted', 'accepted', 'in_progress', 'completed', 'rejected'
        'quoted_price',
        'admin_notes',
        'quoted_at',
        'customer_action_at',
        'order_id',
    ];

    protected $casts = [
        'quoted_price'        => 'integer',
        'quoted_at'           => 'datetime',
        'customer_action_at'  => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function app(): BelongsTo
    {
        return $this->belongsTo(App::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function getFormattedPriceAttribute(): ?string
    {
        return $this->quoted_price ? '₹' . number_format($this->quoted_price / 100) : null;
    }
}
