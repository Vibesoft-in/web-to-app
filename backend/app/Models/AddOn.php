<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AddOn extends Model
{
    use HasFactory;

    protected $table = 'add_ons';

    protected $fillable = [
        'name',
        'slug',
        'price',
        'billing_type',
        'category',
        'description',
        'badge',
        'features',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'price'      => 'integer',
        'features'   => 'array',
        'is_active'  => 'boolean',
        'sort_order' => 'integer',
    ];

    public function getFormattedPriceAttribute(): string
    {
        return '₹' . number_format($this->price / 100);
    }
}
