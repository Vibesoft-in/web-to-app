<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Add blocked fields to users table if not exists
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'is_blocked')) {
                $table->boolean('is_blocked')->default(false)->after('role');
            }
            if (! Schema::hasColumn('users', 'blocked_at')) {
                $table->timestamp('blocked_at')->nullable()->after('is_blocked');
            }
            if (! Schema::hasColumn('users', 'blocked_reason')) {
                $table->string('blocked_reason', 500)->nullable()->after('blocked_at');
            }
        });

        // 2. Create dedicated blocked_emails table for tracking standalone blocked email addresses
        if (! Schema::hasTable('blocked_emails')) {
            Schema::create('blocked_emails', function (Blueprint $table) {
                $table->id();
                $table->string('email')->unique();
                $table->string('reason', 500)->nullable();
                $table->foreignId('blocked_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index('email');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('blocked_emails');

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'blocked_reason')) {
                $table->dropColumn('blocked_reason');
            }
            if (Schema::hasColumn('users', 'blocked_at')) {
                $table->dropColumn('blocked_at');
            }
            if (Schema::hasColumn('users', 'is_blocked')) {
                $table->dropColumn('is_blocked');
            }
        });
    }
};
