<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PackageUpgrade extends Model
{
    use BelongsToTenant;
    use HasFactory;

    protected $fillable = [
        'order_id',
        'tenant_id',
        'app_id',
        'from_package_id',
        'to_package_id',
        'original_paid_amount',
        'new_package_amount',
        'difference_paid',
        'status', // 'pending', 'completed', 'failed'
    ];

    protected $casts = [
        'original_paid_amount' => 'integer',
        'new_package_amount'   => 'integer',
        'difference_paid'      => 'integer',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function app(): BelongsTo
    {
        return $this->belongsTo(App::class);
    }

    public function fromPackage(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'from_package_id');
    }

    public function toPackage(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'to_package_id');
    }
}
