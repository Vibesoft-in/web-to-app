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
        if (! Schema::hasColumn('themes', 'price')) {
            Schema::table('themes', function (Blueprint $table) {
                $table->unsignedInteger('price')->default(0)->after('defaults');
            });

            // Set standard theme prices (in paise)
            DB::table('themes')->where('key', 'theme_a')->update(['price' => 0]);
            DB::table('themes')->where('key', 'theme_b')->update(['price' => 99900]);
            DB::table('themes')->where('key', 'theme_c')->update(['price' => 149900]);
            DB::table('themes')->where('key', 'theme_d')->update(['price' => 199900]);
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('themes', 'price')) {
            Schema::table('themes', function (Blueprint $table) {
                $table->dropColumn('price');
            });
        }
    }
};
