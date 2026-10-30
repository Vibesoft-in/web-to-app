<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'item_type', // 'package', 'addon', 'upgrade_difference', 'custom_quote'
        'item_id',
        'name',
        'description',
        'unit_price',
        'quantity',
        'total_price',
        'meta',
    ];

    protected $casts = [
        'unit_price'  => 'integer',
        'quantity'    => 'integer',
        'total_price' => 'integer',
        'meta'        => 'array',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function getFormattedPriceAttribute(): string
    {
        return '₹' . number_format($this->total_price / 100);
    }
}
