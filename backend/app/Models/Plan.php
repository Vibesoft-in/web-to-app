<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'price_monthly',
        'description',
        'can_apk',
        'can_aab',
        'has_admin_panel',
        'badge',
        'sort_order',
        'features_list',
        'features',
        'limits',
        'is_active',
    ];

    protected $casts = [
        'price_monthly'   => 'integer',
        'features'        => 'array',
        'features_list'   => 'array',
        'limits'          => 'array',
        'is_active'       => 'boolean',
        'can_apk'         => 'boolean',
        'can_aab'         => 'boolean',
        'has_admin_panel' => 'boolean',
        'sort_order'      => 'integer',
    ];

    public function getFormattedPriceAttribute(): string
    {
        return '₹' . number_format($this->price_monthly / 100);
    }
}
