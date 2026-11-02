<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('orders')) {
            Schema::create('orders', function (Blueprint $table) {
                $table->id();
                $table->string('order_number')->unique();
                $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('app_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('package_id')->nullable()->constrained('plans')->nullOnDelete();
                $table->string('order_type')->default('new_purchase'); // 'new_purchase', 'upgrade', 'addon', 'custom_quote'
                $table->string('status')->default('paid'); // 'pending_payment', 'payment_processing', 'paid', 'failed', 'cancelled', 'refund_pending', 'refunded'
                $table->string('currency', 10)->default('INR');
                $table->unsignedBigInteger('subtotal')->default(0);
                $table->unsignedBigInteger('discount_amount')->default(0);
                $table->unsignedBigInteger('tax_amount')->default(0);
                $table->unsignedBigInteger('total_amount')->default(0);
                $table->string('billing_name')->nullable();
                $table->string('billing_email')->nullable();
                $table->string('billing_phone')->nullable();
                $table->text('billing_address')->nullable();
                $table->text('notes')->nullable();
                $table->timestamp('paid_at')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('order_items')) {
            Schema::create('order_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
                $table->string('item_type'); // 'package', 'addon', 'upgrade_difference', 'custom_quote', 'theme'
                $table->unsignedBigInteger('item_id')->nullable();
                $table->string('name');
                $table->text('description')->nullable();
                $table->unsignedBigInteger('unit_price')->default(0);
                $table->unsignedInteger('quantity')->default(1);
                $table->unsignedBigInteger('total_price')->default(0);
                $table->json('meta')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('payment_transactions')) {
            Schema::create('payment_transactions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
                $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
                $table->string('gateway')->default('razorpay');
                $table->string('gateway_order_id')->nullable();
                $table->string('gateway_payment_id')->nullable();
                $table->string('gateway_signature')->nullable();
                $table->unsignedBigInteger('amount')->default(0);
                $table->string('currency', 10)->default('INR');
                $table->string('status')->default('pending');
                $table->string('error_code')->nullable();
                $table->text('error_description')->nullable();
                $table->json('raw_payload')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('package_upgrades')) {
            Schema::create('package_upgrades', function (Blueprint $table) {
                $table->id();
                $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
                $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
                $table->foreignId('app_id')->constrained()->cascadeOnDelete();
                $table->foreignId('from_package_id')->constrained('plans')->cascadeOnDelete();
                $table->foreignId('to_package_id')->constrained('plans')->cascadeOnDelete();
                $table->unsignedBigInteger('original_paid_amount')->default(0);
                $table->unsignedBigInteger('new_package_amount')->default(0);
                $table->unsignedBigInteger('difference_paid')->default(0);
                $table->string('status')->default('completed');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('custom_feature_requests')) {
            Schema::create('custom_feature_requests', function (Blueprint $table) {
                $table->id();
                $table->string('ticket_number')->unique();
                $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('app_id')->constrained()->cascadeOnDelete();
                $table->string('feature_name');
                $table->text('requirements');
                $table->string('reference_url')->nullable();
                $table->text('expected_functionality')->nullable();
                $table->text('additional_notes')->nullable();
                $table->string('status')->default('pending_review');
                $table->unsignedBigInteger('quoted_price')->nullable();
                $table->text('admin_notes')->nullable();
                $table->timestamp('quoted_at')->nullable();
                $table->timestamp('customer_action_at')->nullable();
                $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('email_logs')) {
            Schema::create('email_logs', function (Blueprint $table) {
                $table->id();
                $table->string('recipient_email');
                $table->string('recipient_name')->nullable();
                $table->string('subject');
                $table->string('type');
                $table->foreignId('related_order_id')->nullable()->constrained('orders')->nullOnDelete();
                $table->string('status')->default('sent');
                $table->text('error_message')->nullable();
                $table->json('meta')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('email_logs');
        Schema::dropIfExists('custom_feature_requests');
        Schema::dropIfExists('package_upgrades');
        Schema::dropIfExists('payment_transactions');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
