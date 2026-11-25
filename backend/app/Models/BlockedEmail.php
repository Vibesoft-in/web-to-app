<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BlockedEmail extends Model
{
    use HasFactory;

    protected $fillable = [
        'email',
        'reason',
        'blocked_by_user_id',
    ];

    public function blockedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'blocked_by_user_id');
    }

    /**
     * Determine if an email address is blocked.
     */
    public static function isBlocked(string $email): bool
    {
        $normalized = strtolower(trim($email));
        return static::where('email', $normalized)->exists()
            || User::withoutGlobalScopes()->whereRaw('LOWER(email) = ?', [$normalized])->where('is_blocked', true)->exists();
    }

    /**
     * Retrieve the block reason if any.
     */
    public static function getReason(string $email): ?string
    {
        $normalized = strtolower(trim($email));
        $record = static::where('email', $normalized)->first();
        if ($record && !empty($record->reason)) {
            return $record->reason;
        }

        $user = User::withoutGlobalScopes()->whereRaw('LOWER(email) = ?', [$normalized])->where('is_blocked', true)->first();
        return $user?->blocked_reason;
    }

    /**
     * Block an email address.
     */
    public static function blockEmail(string $email, ?string $reason = null, ?int $blockedBy = null): self
    {
        $normalized = strtolower(trim($email));

        $record = static::updateOrCreate(
            ['email' => $normalized],
            [
                'reason'             => $reason,
                'blocked_by_user_id' => $blockedBy,
            ]
        );

        // Also sync user record if exists
        $user = User::withoutGlobalScopes()->whereRaw('LOWER(email) = ?', [$normalized])->first();
        if ($user) {
            $user->is_blocked = true;
            $user->blocked_at = now();
            $user->blocked_reason = $reason;
            $user->save();

            // Invalidate any active Sanctum tokens
            $user->tokens()->delete();
        }

        return $record;
    }

    /**
     * Unblock an email address.
     */
    public static function unblockEmail(string $email): bool
    {
        $normalized = strtolower(trim($email));

        static::where('email', $normalized)->delete();

        $user = User::withoutGlobalScopes()->whereRaw('LOWER(email) = ?', [$normalized])->first();
        if ($user) {
            $user->is_blocked = false;
            $user->blocked_at = null;
            $user->blocked_reason = null;
            $user->save();
        }

        return true;
    }
}
