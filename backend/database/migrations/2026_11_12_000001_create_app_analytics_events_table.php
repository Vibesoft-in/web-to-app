<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_analytics_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('app_id')->constrained('apps')->cascadeOnDelete();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->cascadeOnDelete();
            $table->string('event_type', 50)->index(); // install, session_start, screen_view, session_end, push_received, push_open, uninstall
            $table->string('session_id', 64)->nullable()->index();
            $table->string('device_id', 64)->nullable()->index();
            $table->string('platform', 20)->default('android'); // android, ios
            $table->string('screen_name', 100)->nullable()->index();
            $table->string('screen_id', 150)->nullable();
            $table->string('previous_screen', 150)->nullable();
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->string('device_model', 100)->nullable();
            $table->string('os_version', 50)->nullable();
            $table->string('app_version', 30)->nullable();
            $table->string('country', 10)->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['app_id', 'created_at']);
            $table->index(['app_id', 'event_type', 'created_at']);
            $table->index(['app_id', 'screen_name', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_analytics_events');
    }
};
