<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Discount extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'type',
        'value',
        'discount_category',
        'customer_email',
        'min_order_amount',
        'max_discount_amount',
        'max_uses',
        'uses_count',
        'starts_at',
        'expires_at',
        'is_active',
    ];

    protected $casts = [
        'value'               => 'float',
        'min_order_amount'    => 'float',
        'max_discount_amount' => 'float',
        'max_uses'            => 'integer',
        'uses_count'          => 'integer',
        'starts_at'           => 'datetime',
        'expires_at'          => 'datetime',
        'is_active'           => 'boolean',
    ];

    public function isValidFor(?User $user = null, float $orderAmount = 0): bool
    {
        if (! $this->is_active) {
            return false;
        }

        $now = now();
        if ($this->starts_at && $now->lt($this->starts_at)) {
            return false;
        }
        if ($this->expires_at && $now->gt($this->expires_at)) {
            return false;
        }

        if ($this->max_uses && $this->uses_count >= $this->max_uses) {
            return false;
        }

        if ($this->min_order_amount > 0 && $orderAmount < $this->min_order_amount) {
            return false;
        }

        if ($this->discount_category === 'customer_specific' && $this->customer_email) {
            if (! $user || strtolower($user->email) !== strtolower($this->customer_email)) {
                return false;
            }
        }

        return true;
    }

    public function calculateDiscount(float $amount): float
    {
        $discount = $this->type === 'percentage'
            ? ($amount * ($this->value / 100))
            : $this->value;

        if ($this->max_discount_amount && $discount > $this->max_discount_amount) {
            $discount = $this->max_discount_amount;
        }

        return min($discount, $amount);
    }
}
