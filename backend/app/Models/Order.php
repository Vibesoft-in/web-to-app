<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    use BelongsToTenant;
    use HasFactory;

    protected $fillable = [
        'order_number',
        'tenant_id',
        'user_id',
        'app_id',
        'package_id',
        'order_type', // 'new_purchase', 'upgrade', 'addon', 'custom_quote'
        'status',     // 'pending_payment', 'payment_processing', 'paid', 'failed', 'cancelled', 'refund_pending', 'refunded'
        'currency',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'total_amount',
        'billing_name',
        'billing_email',
        'billing_phone',
        'billing_address',
        'notes',
        'paid_at',
    ];

    protected $casts = [
        'subtotal'        => 'integer',
        'discount_amount' => 'integer',
        'tax_amount'      => 'integer',
        'total_amount'    => 'integer',
        'paid_at'         => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function app(): BelongsTo
    {
        return $this->belongsTo(App::class);
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'package_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(PaymentTransaction::class);
    }

    public function upgrade(): HasOne
    {
        return $this->hasOne(PackageUpgrade::class);
    }

    public function customFeature(): HasOne
    {
        return $this->hasOne(CustomFeatureRequest::class);
    }

    public function isPaid(): bool
    {
        return $this->status === 'paid' && ! empty($this->paid_at);
    }

    public function getFormattedTotalAttribute(): string
    {
        return '₹' . number_format($this->total_amount / 100);
    }
}
