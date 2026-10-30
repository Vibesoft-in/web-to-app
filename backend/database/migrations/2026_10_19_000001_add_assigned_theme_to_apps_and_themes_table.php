<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('themes', 'is_free_theme')) {
            Schema::table('themes', function (Blueprint $table) {
                $table->boolean('is_free_theme')->default(false)->after('is_active');
            });

            // Set theme_a as the default admin free theme
            DB::table('themes')->where('key', 'theme_a')->update(['is_free_theme' => true]);
        }

        if (! Schema::hasColumn('apps', 'assigned_theme_key')) {
            Schema::table('apps', function (Blueprint $table) {
                $table->string('assigned_theme_key', 50)->default('theme_a')->after('status');
            });

            DB::table('apps')->whereNull('assigned_theme_key')->update(['assigned_theme_key' => 'theme_a']);
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('themes', 'is_free_theme')) {
            Schema::table('themes', function (Blueprint $table) {
                $table->dropColumn('is_free_theme');
            });
        }

        if (Schema::hasColumn('apps', 'assigned_theme_key')) {
            Schema::table('apps', function (Blueprint $table) {
                $table->dropColumn('assigned_theme_key');
            });
        }
    }
};
