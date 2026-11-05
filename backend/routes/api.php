<?php

declare(strict_types=1);

use App\Http\Controllers\Api\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Dashboard API Routes (/api/*)
|--------------------------------------------------------------------------
| Auth: Laravel Sanctum (httpOnly cookie or Bearer token)
| Tenant: derived from authenticated user — never from request input
*/

// ── Health Probe ─────────────────────────────────────────────────────────────
Route::get('/health', [\App\Http\Controllers\Api\HealthCheckController::class, 'probe'])
    ->name('api.health');

// ── Database Migration Trigger (Public helper for shared hosting) ─────────────
Route::get('/migrate-db', function () {
    try {
        $forceConn = request()->query('connection') ?: request()->query('db');
        if ($forceConn === 'sqlite') {
            config(['database.default' => 'sqlite']);
            $path = database_path('database.sqlite');
            config(['database.connections.sqlite.database' => $path]);
        }

        $dbConnection = config('database.default');

        if ($dbConnection === 'sqlite') {
            $path = config('database.connections.sqlite.database');
            if (empty($path) || $path === ':memory:') {
                $path = database_path('database.sqlite');
                config(['database.connections.sqlite.database' => $path]);
            }
            $dir = dirname($path);
            if (! is_dir($dir)) {
                @mkdir($dir, 0775, true);
            }
            if (! file_exists($path)) {
                @touch($path);
            }
            @chmod($dir, 0777);
            @chmod($path, 0666);
        }

        \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        $migrateOutput = \Illuminate\Support\Facades\Artisan::output();

        $seedOutput = '';
        try {
            \Illuminate\Support\Facades\Artisan::call('db:seed', ['--class' => 'AdminAndPlanSeeder', '--force' => true]);
            $seedOutput = \Illuminate\Support\Facades\Artisan::output();
        } catch (\Throwable $se) {
            $seedOutput = 'Plan seeder note: ' . $se->getMessage();
        }

        try {
            \Illuminate\Support\Facades\Artisan::call('db:seed', ['--class' => 'ThemeSeeder', '--force' => true]);
            $seedOutput .= "\n" . \Illuminate\Support\Facades\Artisan::output();
        } catch (\Throwable $te) {
            $seedOutput .= "\nTheme seeder note: " . $te->getMessage();
        }

        return response()->json([
            'status'         => 'success',
            'message'        => 'Migrations and seeders executed successfully.',
            'connection'     => $dbConnection,
            'database'       => config("database.connections.{$dbConnection}.database"),
            'migrate_output' => trim($migrateOutput),
            'seed_output'    => trim($seedOutput),
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'status'  => 'error',
            'message' => $e->getMessage(),
            'file'    => $e->getFile() . ':' . $e->getLine(),
        ], 500);
    }
});

// ── Public Plans & Dynamic Pricing ──────────────────────────────────────────
Route::get('/plans', function () {
    $planMetadata = [
        'Basic' => [
            'desc'           => 'Mobile app solution for eCommerce stores.',
            'features'       => [
                'Android (.apk/.aab)',
                'Automated Store Catalog Sync',
                'Push Notifications',
            ],
            'formats'        => ['APK', 'AAB'],
            'one_time_price' => 2999,
            'annual_price'   => 2399,
            'usd_equivalent' => 'Approx. $50 USD • Lifetime App Files',
            'admin_panel'    => false,
            'popular'        => false,
        ],
        'Pro' => [
            'desc'           => 'Complete mobile presence for Android and iOS devices.',
            'features'       => [
                'Android (.apk/.aab)',
                'Automated Store Catalog Sync',
                'Push Notifications',
                'iOS IPA Package Available',
                'Priority App Compilation',
            ],
            'formats'        => ['APK', 'AAB', 'IPA'],
            'one_time_price' => 7999,
            'annual_price'   => 6399,
            'usd_equivalent' => 'Approx. $90 USD • Lifetime App Files',
            'admin_panel'    => false,
            'popular'        => true,
        ],
        'Premium' => [
            'desc'           => 'High-scale commerce sites with dedicated app admin panel.',
            'features'       => [
                'Android (.apk/.aab)',
                'Automated Store Catalog Sync',
                'Push Notifications (Priority Engine)',
                'Dedicated App Admin Panel (Active Users, Banners & Sales)',
                'Exclusive 4th Theme (Elite Dark Luxe)',
                'Full White-Labeling & Priority Support',
            ],
            'formats'        => ['APK', 'AAB', 'IPA', 'Admin Panel'],
            'one_time_price' => 14999,
            'annual_price'   => 11999,
            'usd_equivalent' => 'Approx. $150 USD • Lifetime App Files',
            'admin_panel'    => true,
            'popular'        => false,
        ],
        'Starter App' => [
            'desc'           => 'Ideal for single Android store apps with standard features.',
            'features'       => [
                'Android App (.aab / .apk files)',
                'Standard Clean Theme Layout',
                'Push Notifications (Basic)',
                'Standard App Icon & Splash Screen',
                'Real-Time Product & Order Sync',
                '3 Months Technical Support',
            ],
            'formats'        => ['APK', 'AAB'],
            'one_time_price' => 2999,
            'annual_price'   => 2399,
            'usd_equivalent' => 'Approx. $50 USD • Lifetime App Files',
            'admin_panel'    => false,
            'popular'        => false,
        ],
        'Starter' => [
            'desc'           => 'Ideal for single Android store apps with standard features.',
            'features'       => [
                'Android App (.aab / .apk files)',
                'Standard Clean Theme Layout',
                'Push Notifications (Basic)',
                'Standard App Icon & Splash Screen',
                'Real-Time Product & Order Sync',
                '3 Months Technical Support',
            ],
            'formats'        => ['APK', 'AAB'],
            'one_time_price' => 4999,
            'annual_price'   => 3999,
            'usd_equivalent' => 'Approx. $50 USD • Lifetime App Files',
            'admin_panel'    => false,
            'popular'        => false,
        ],
        'Pro Combo' => [
            'desc'           => 'Complete mobile presence for Android and iOS devices.',
            'features'       => [
                'Both Android & iOS Apps',
                'All Premium Themes Included',
                'Native Push Notifications',
                'Payment Gateway Sync & 1-Tap Checkout',
                'Custom Branding & Full Color Palette',
                'WhatsApp & In-App Chat Integration',
                '6 Months Priority Support',
            ],
            'formats'        => ['APK', 'AAB', 'IPA'],
            'one_time_price' => 8999,
            'annual_price'   => 7199,
            'usd_equivalent' => 'Approx. $90 USD • Lifetime App Files',
            'admin_panel'    => false,
            'popular'        => true,
        ],
        'Pro Growth' => [
            'desc'           => 'Complete mobile presence for Android and iOS devices.',
            'features'       => [
                'Both Android & iOS Apps',
                'All Premium Themes Included',
                'Native Push Notifications',
                'Payment Gateway Sync & 1-Tap Checkout',
                'Custom Branding & Full Color Palette',
                'WhatsApp & In-App Chat Integration',
                '6 Months Priority Support',
            ],
            'formats'        => ['APK', 'AAB', 'IPA'],
            'one_time_price' => 8999,
            'annual_price'   => 7199,
            'usd_equivalent' => 'Approx. $90 USD • Lifetime App Files',
            'admin_panel'    => false,
            'popular'        => true,
        ],
        'Enterprise Suite' => [
            'desc'           => 'For high-scale commerce sites requiring full integration.',
            'features'       => [
                'Both Android & iOS Apps Included',
                'All Premium Add-ons & Themes Included',
                'Priority App Store & Play Store Publishing',
                'Dedicated Technical App Manager',
                'Custom ERP & API Integrations',
                '1 Year Dedicated Support & Updates',
            ],
            'formats'        => ['APK', 'AAB', 'IPA', 'Admin Panel'],
            'one_time_price' => 14999,
            'annual_price'   => 11999,
            'usd_equivalent' => 'Approx. $150 USD • Lifetime App Files',
            'admin_panel'    => true,
            'popular'        => false,
        ],
        'Enterprise' => [
            'desc'           => 'For high-scale commerce sites requiring full integration.',
            'features'       => [
                'Both Android & iOS Apps Included',
                'All Premium Add-ons & Themes Included',
                'Priority App Store & Play Store Publishing',
                'Dedicated Technical App Manager',
                'Custom ERP & API Integrations',
                '1 Year Dedicated Support & Updates',
            ],
            'formats'        => ['APK', 'AAB', 'IPA', 'Admin Panel'],
            'one_time_price' => 14999,
            'annual_price'   => 11999,
            'usd_equivalent' => 'Approx. $150 USD • Lifetime App Files',
            'admin_panel'    => true,
            'popular'        => false,
        ],
    ];

    return response()->json([
        'plans' => \App\Models\Plan::where('is_active', true)
            ->orderBy('id')
            ->get()
            ->map(function ($plan) use ($planMetadata) {
                $meta = $planMetadata[$plan->name] ?? [
                    'desc'           => 'Mobile app solution for eCommerce stores.',
                    'features'       => ['Android (.apk/.aab)', 'Automated Store Catalog Sync', 'Push Notifications'],
                    'formats'        => ['APK', 'AAB'],
                    'one_time_price' => (int) round($plan->price_monthly / 100),
                    'annual_price'   => (int) round(($plan->price_monthly * 0.8) / 100),
                    'usd_equivalent' => 'Approx. $50 USD • Lifetime App Files',
                    'admin_panel'    => false,
                    'popular'        => false,
                ];

                $oneTime = $meta['one_time_price'] ?? (int) round($plan->price_monthly / 100);
                $annual = $meta['annual_price'] ?? (int) round(($plan->price_monthly * 0.8) / 100);

                return [
                    'id'                       => $plan->id,
                    'key'                      => strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $plan->name)),
                    'name'                     => $plan->name,
                    'desc'                     => $meta['desc'],
                    'price_monthly'            => $plan->price_monthly,
                    'price_formatted'          => '₹' . number_format($oneTime),
                    'one_time_price'           => $oneTime,
                    'one_time_price_formatted' => '₹' . number_format($oneTime),
                    'annual_price'             => $annual,
                    'annual_price_formatted'   => '₹' . number_format($annual),
                    'period'                   => ' one-time',
                    'period_annual'            => '/ year',
                    'usd_equivalent'           => $meta['usd_equivalent'] ?? '',
                    'features'                 => $meta['features'],
                    'formats'                  => $meta['formats'] ?? ['APK', 'AAB'],
                    'admin_panel'              => $meta['admin_panel'] ?? false,
                    'popular'                  => $meta['popular'],
                    'limits'                   => $plan->limits,
                    'is_active'                => $plan->is_active,
                ];
            }),
    ]);
})->name('api.plans');

// ── Commercial & Pricing Engine (Dynamic Packages & Add-ons) ────────────────
Route::get('/commercial/packages', [\App\Http\Controllers\Api\OrderController::class, 'getPackages'])
    ->name('api.commercial.packages');
Route::get('/commercial/addons', [\App\Http\Controllers\Api\OrderController::class, 'getAddOns'])
    ->name('api.commercial.addons');
Route::match(['get', 'post'], '/commercial/calculate', [\App\Http\Controllers\Api\OrderController::class, 'calculate'])
    ->name('api.commercial.calculate');
Route::post('/payment/webhook', [\App\Http\Controllers\Api\OrderController::class, 'webhook'])
    ->name('api.payment.webhook');

// ── Customer Orders & Tax Invoices ───────────────────────────────────────────
Route::get('/orders/my-orders', [\App\Http\Controllers\Api\OrderController::class, 'myOrders'])
    ->name('api.orders.my-orders');
Route::post('/orders/{id}/resend-invoice', [\App\Http\Controllers\Api\OrderController::class, 'resendInvoice'])
    ->name('api.orders.resend-invoice');
Route::get('/orders/{id}/invoice', [\App\Http\Controllers\Api\OrderController::class, 'viewInvoice'])
    ->name('api.orders.view-invoice');

// ── App Asset Upload (Hero banners, logos, icons — scoped by secret app ULID) ─
Route::post('/apps/{ulid}/upload-asset', [\App\Http\Controllers\Api\ConfigController::class, 'uploadAsset'])
    ->name('api.apps.upload-asset');

Route::get('/login', function (\Illuminate\Http\Request $request) {
    if (! $request->expectsJson()) {
        return redirect('/admin/login');
    }
    return response()->json(['message' => 'Unauthenticated.'], 401);
});

// ── Public auth routes (rate-limited) ─────────────────────────────────────────
Route::prefix('auth')->name('api.auth.')->group(function () {
    // 5 register attempts per 10 minutes per IP
    Route::post('/register', [AuthController::class, 'register'])
        ->name('register')
        ->middleware('throttle:5,10');

    // 10 login attempts per 5 minutes per IP
    Route::post('/login', [AuthController::class, 'login'])
        ->name('login')
        ->middleware('throttle:10,5');

    // 3 reset requests per 15 minutes per IP
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])
        ->name('forgot')
        ->middleware('throttle:3,15');

    Route::post('/reset-password', [AuthController::class, 'resetPassword'])
        ->name('reset');
});

// ── Email Verification ────────────────────────────────────────────────────────
Route::get('/email/verify/{id}/{hash}', function (Request $request, $id, $hash) {
    $user = \App\Models\User::findOrFail($id);
    if (! hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
        return response()->json(['message' => 'Invalid verification link.'], 403);
    }
    if ($user->hasVerifiedEmail()) {
        return response()->json(['message' => 'Email already verified.']);
    }
    $user->markEmailAsVerified();
    return response()->json(['message' => 'Email successfully verified.']);
})->middleware(['signed', 'throttle:6,1'])->name('verification.verify');

// ── Protected routes (require Sanctum token) ──────────────────────────────────
Route::middleware(['auth:sanctum', 'tenant'])->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout'])
        ->name('api.auth.logout');

    Route::get('/user', fn (Request $request) => $request->user()->load(['tenant']))
        ->name('api.user');

    // ── Billing & Subscriptions ──────────────────────────────────────────────
    Route::get('/billing', function (Request $request) {
        $user = $request->user();
        $tenant = $user->tenant;
        if (! $tenant) {
            return response()->json([
                'tenant'        => null,
                'apps'          => [],
                'selected_app'  => null,
                'subscriptions' => [],
                'active_sub'    => null,
                'payments'      => [],
                'plans'         => [],
            ]);
        }

        $apps = \App\Models\App::where('tenant_id', $tenant->id)
            ->select('id', 'ulid', 'name', 'status', 'site_url', 'website_url', 'platform')
            ->latest('id')
            ->get();

        $appUlid = $request->query('app_ulid');
        $appId = $request->query('app_id');
        $targetApp = null;

        if ($appUlid) {
            $targetApp = $apps->firstWhere('ulid', $appUlid);
        } elseif ($appId) {
            $targetApp = $apps->firstWhere('id', (int) $appId);
        } elseif ($apps->count() === 1) {
            $targetApp = $apps->first();
        }

        $subsQuery = \App\Models\Subscription::where('tenant_id', $tenant->id)
            ->with(['plan', 'app'])
            ->latest();

        $paymentsQuery = \App\Models\Payment::where('tenant_id', $tenant->id)
            ->latest();

        if ($targetApp) {
            $subsQuery->where('app_id', $targetApp->id);
            $paymentsQuery->where(function ($q) use ($targetApp) {
                $q->where('app_id', $targetApp->id)
                  ->orWhere('meta->app_id', $targetApp->id)
                  ->orWhere('meta->app_ulid', $targetApp->ulid);
            });
        }

        $subscriptions = $subsQuery->get();
        $payments = $paymentsQuery->get();
        $plans = \App\Models\Plan::where('is_active', true)->orderBy('id')->get();

        return response()->json([
            'tenant'        => $tenant,
            'apps'          => $apps,
            'selected_app'  => $targetApp,
            'subscriptions' => $subscriptions,
            'active_sub'    => $subscriptions->where('status', 'active')->first(),
            'payments'      => $payments,
            'plans'         => $plans,
        ]);
    })->name('api.billing');

    // ── Orders & Checkout ────────────────────────────────────────────────────
    Route::post('/orders/checkout', [\App\Http\Controllers\Api\OrderController::class, 'checkout'])
        ->name('api.orders.checkout');
    Route::post('/orders/verify', [\App\Http\Controllers\Api\OrderController::class, 'verifyPayment'])
        ->name('api.orders.verify');
    Route::get('/orders/my-orders', [\App\Http\Controllers\Api\OrderController::class, 'myOrders'])
        ->name('api.orders.my-orders');

    // ── Custom Feature Requests ──────────────────────────────────────────────
    Route::post('/custom-features', [\App\Http\Controllers\Api\CustomFeatureController::class, 'store'])
        ->name('api.custom-features.store');
    Route::get('/custom-features', [\App\Http\Controllers\Api\CustomFeatureController::class, 'index'])
        ->name('api.custom-features.index');
    Route::post('/custom-features/{id}/accept', [\App\Http\Controllers\Api\CustomFeatureController::class, 'acceptQuote'])
        ->name('api.custom-features.accept');
    Route::post('/custom-features/{id}/reject', [\App\Http\Controllers\Api\CustomFeatureController::class, 'rejectQuote'])
        ->name('api.custom-features.reject');

    // ── Profile & Account Settings ───────────────────────────────────────────
    Route::put('/user/profile', function (Request $request) {
        $user = $request->user();
        $validated = $request->validate([
            'name'        => 'sometimes|string|max:255',
            'tenant_name' => 'sometimes|string|max:255',
        ]);

        if (isset($validated['name'])) {
            $user->update(['name' => $validated['name']]);
        }
        if (isset($validated['tenant_name']) && $user->tenant) {
            $user->tenant->update(['name' => $validated['tenant_name']]);
        }

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user'    => $user->fresh()->load('tenant'),
        ]);
    })->name('api.user.profile.update');

    Route::put('/user/password', function (Request $request) {
        $user = $request->user();
        $request->validate([
            'current_password' => 'required',
            'new_password'     => 'required|min:8|confirmed',
        ]);

        if (! \Illuminate\Support\Facades\Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'error' => [
                    'code'    => 'INVALID_PASSWORD',
                    'message' => 'Current password does not match.',
                ],
            ], 422);
        }

        $user->update(['password' => \Illuminate\Support\Facades\Hash::make($request->new_password)]);

        return response()->json(['message' => 'Password changed successfully.']);
    })->name('api.user.password.update');

    // ── Applications ─────────────────────────────────────────────────────────
    Route::get('/apps', [\App\Http\Controllers\Api\AppController::class, 'index'])
        ->name('api.apps.index');

    Route::post('/apps', [\App\Http\Controllers\Api\AppController::class, 'store'])
        ->name('api.apps.store');

    Route::get('/apps/{ulid}', [\App\Http\Controllers\Api\AppController::class, 'show'])
        ->name('api.apps.show');

    Route::delete('/apps/{ulid}', [\App\Http\Controllers\Api\AppController::class, 'destroy'])
        ->name('api.apps.destroy');

    Route::post('/apps/{ulid}/complete', [\App\Http\Controllers\Api\AppController::class, 'complete'])
        ->name('api.apps.complete');

    Route::get('/dashboard/access-check', function (Request $request) {
        $user = $request->user();
        if ($user->isSuperAdmin()) {
            return response()->json(['allowed' => true, 'is_admin' => true]);
        }

        if (! $user->has_built_apps) {
            return response()->json([
                'allowed'      => false,
                'reason'       => 'NO_BUILT_APPS',
                'latest_draft' => $user->latest_draft,
                'message'      => 'Dashboard is only accessible after building at least one app.',
            ], 403);
        }

        return response()->json(['allowed' => true, 'has_built_apps' => true]);
    })->name('api.dashboard.access-check');

    Route::get('/apps/{ulid}/admin-portal', [\App\Http\Controllers\Api\AppController::class, 'adminPortal'])
        ->name('api.apps.admin-portal');

    Route::post('/apps/{ulid}/admin-portal/sync-catalog', [\App\Http\Controllers\Api\AppController::class, 'syncCatalog'])
        ->name('api.apps.admin-portal.sync');

    Route::post('/apps/{ulid}/admin-portal/banners', [\App\Http\Controllers\Api\AppController::class, 'saveBanner'])
        ->name('api.apps.admin-portal.banners.save');

    Route::delete('/apps/{ulid}/admin-portal/banners/{bannerId}', [\App\Http\Controllers\Api\AppController::class, 'deleteBanner'])
        ->name('api.apps.admin-portal.banners.delete');

    Route::post('/apps/{ulid}/admin-portal/sales', [\App\Http\Controllers\Api\AppController::class, 'saveSale'])
        ->name('api.apps.admin-portal.sales.save');

    Route::delete('/apps/{ulid}/admin-portal/sales/{saleId}', [\App\Http\Controllers\Api\AppController::class, 'deleteSale'])
        ->name('api.apps.admin-portal.sales.delete');

    Route::post('/apps/{ulid}/admin-portal/categories', [\App\Http\Controllers\Api\AppController::class, 'saveCategory'])
        ->name('api.apps.admin-portal.categories.save');

    Route::post('/apps/{ulid}/admin-portal/products', [\App\Http\Controllers\Api\AppController::class, 'saveProduct'])
        ->name('api.apps.admin-portal.products.save');

    Route::post('/apps/{ulid}/admin-portal/products/{productId}/toggle-status', [\App\Http\Controllers\Api\AppController::class, 'toggleProductStatus'])
        ->name('api.apps.admin-portal.products.toggle-status');

    Route::post('/apps/{ulid}/admin-portal/coupons', [\App\Http\Controllers\Api\AppController::class, 'saveCoupon'])
        ->name('api.apps.admin-portal.coupons.save');

    Route::delete('/apps/{ulid}/admin-portal/coupons/{couponId}', [\App\Http\Controllers\Api\AppController::class, 'deleteCoupon'])
        ->name('api.apps.admin-portal.coupons.delete');

    Route::delete('/apps/{ulid}/admin-portal/products/{productId}', [\App\Http\Controllers\Api\AppController::class, 'deleteProduct'])
        ->name('api.apps.admin-portal.products.delete');

    Route::post('/apps/{ulid}/features/claim', [\App\Http\Controllers\Api\AppController::class, 'claimFeature'])
        ->name('api.apps.features.claim');

    // ── Wizard State Machine ─────────────────────────────────────────────────
    Route::get('/apps/{ulid}/setup-state', [\App\Http\Controllers\Api\SetupStateController::class, 'show'])
        ->name('api.apps.setup-state');

    Route::post('/apps/{ulid}/platform', [\App\Http\Controllers\Api\SetupStateController::class, 'setPlatform'])
        ->name('api.apps.platform');

    Route::post('/apps/{ulid}/advance-step', [\App\Http\Controllers\Api\SetupStateController::class, 'advanceStep'])
        ->name('api.apps.advance-step');

    Route::post('/apps/{ulid}/rollback', [\App\Http\Controllers\Api\SetupStateController::class, 'rollback'])
        ->name('api.apps.rollback');

    // ── User Consent (Mandatory Step-by-Step Compliance) ─────────────────────
    Route::get('/apps/{ulid}/consent', [\App\Http\Controllers\Api\ConsentController::class, 'index'])
        ->name('api.apps.consent.index');
    Route::post('/apps/{ulid}/consent', [\App\Http\Controllers\Api\ConsentController::class, 'store'])
        ->name('api.apps.consent.store');

    // ── Apps & Connections ───────────────────────────────────────────────────
    Route::get('/apps/{ulid}/connection', [\App\Http\Controllers\Api\ConnectionController::class, 'show'])
        ->name('api.apps.connection.show');

    Route::post('/apps/{ulid}/connection/verify', [\App\Http\Controllers\Api\ConnectionController::class, 'verify'])
        ->name('api.apps.connection.verify')
        ->middleware('throttle:10,1');

    // ── Themes & Config ───────────────────────────────────────────────────────
    Route::get('/apps/{ulid}/themes', [\App\Http\Controllers\Api\ConfigController::class, 'getThemes'])
        ->name('api.apps.themes');

    Route::get('/apps/{ulid}/config/draft', [\App\Http\Controllers\Api\ConfigController::class, 'getDraft'])
        ->name('api.apps.config.draft.show');

    // Enforce step:theme so users cannot configure themes if connection is not completed
    Route::put('/apps/{ulid}/config/draft', [\App\Http\Controllers\Api\ConfigController::class, 'saveDraft'])
        ->name('api.apps.config.draft.save')
        ->middleware('step:theme');

    Route::post('/apps/{ulid}/config/publish', [\App\Http\Controllers\Api\ConfigController::class, 'publish'])
        ->name('api.apps.config.publish')
        ->middleware('step:theme');

    // Live preview data (requires at least connect step completed)
    Route::get('/apps/{ulid}/preview-data', [\App\Http\Controllers\Api\ConfigController::class, 'previewData'])
        ->name('api.apps.preview-data')
        ->middleware('step:connect');

    // Website data calculation, brand extraction & auto-collection
    Route::get('/apps/{ulid}/website-data', [\App\Http\Controllers\Api\ConfigController::class, 'getWebsiteData'])
        ->name('api.apps.website-data')
        ->middleware('step:connect');

    Route::post('/apps/{ulid}/website-data/apply', [\App\Http\Controllers\Api\ConfigController::class, 'applyWebsiteData'])
        ->name('api.apps.website-data.apply')
        ->middleware('step:connect');

    Route::post('/apps/{ulid}/upload-asset', [\App\Http\Controllers\Api\ConfigController::class, 'uploadAsset'])
        ->name('api.apps.upload-asset');

    // ── Android Build Pipeline ───────────────────────────────────────────────
    Route::get('/apps/{ulid}/builds', [\App\Http\Controllers\Api\BuildController::class, 'index'])
        ->name('api.apps.builds.index');

    Route::post('/apps/{ulid}/builds', [\App\Http\Controllers\Api\BuildController::class, 'store'])
        ->name('api.apps.builds.store');

    Route::get('/apps/{ulid}/builds/{id}', [\App\Http\Controllers\Api\BuildController::class, 'show'])
        ->name('api.apps.builds.show');

    Route::get('/apps/{ulid}/builds/{id}/download', [\App\Http\Controllers\Api\BuildController::class, 'download'])
        ->name('api.apps.builds.download');

    // ── Push Notification Campaigns ───────────────────────────────────────────
    Route::get('/apps/{ulid}/notifications/campaigns', [\App\Http\Controllers\Api\NotificationCampaignController::class, 'index'])
        ->name('api.apps.campaigns.index');

    Route::post('/apps/{ulid}/notifications/campaigns', [\App\Http\Controllers\Api\NotificationCampaignController::class, 'store'])
        ->name('api.apps.campaigns.store');

    // ── WhatsApp Integrations ─────────────────────────────────────────────────
    Route::post('/apps/{ulid}/integrations/whatsapp/test', [\App\Http\Controllers\Api\WhatsAppController::class, 'sendTest'])
        ->name('api.apps.whatsapp.test')
        ->middleware('throttle:5,1');

    // ── Admin Panel Oversight Routes ─────────────────────────────────────────
    Route::prefix('admin')->group(function () {
        Route::get('/overview', function (Request $request) {
            $user = $request->user();
            if (! $user || ! $user->isSuperAdmin()) {
                return response()->json(['error' => 'Unauthorized. Super Admin access required.'], 403);
            }

            return response()->json([
                'stats' => [
                    'total_users'          => \App\Models\User::count(),
                    'total_apps'           => \App\Models\App::withoutGlobalScopes()->count(),
                    'active_subscriptions' => \App\Models\Subscription::withoutTenantScope()->where('status', 'active')->count(),
                    'total_builds'         => \App\Models\Build::withoutGlobalScopes()->count(),
                ],
                'recent_users' => \App\Models\User::with(['tenant', 'apps'])->latest()->take(5)->get(),
                'recent_apps'  => \App\Models\App::withoutGlobalScopes()
                    ->with(['tenant.users', 'connection', 'configs' => fn($q) => $q->latest('version'), 'builds' => fn($q) => $q->latest('id')])
                    ->latest()
                    ->take(5)
                    ->get(),
            ]);
        })->name('api.admin.overview');

        Route::get('/users', function (Request $request) {
            $user = $request->user();
            if (! $user || ! $user->isSuperAdmin()) {
                return response()->json(['error' => 'Unauthorized. Super Admin access required.'], 403);
            }

            $users = \App\Models\User::with([
                'tenant',
                'apps' => fn ($q) => $q->withoutGlobalScopes()->with([
                    'connection',
                    'configs' => fn ($cfg) => $cfg->latest('version'),
                    'subscriptions.plan',
                    'builds'  => fn ($b) => $b->latest('id'),
                ]),
            ])->latest()->get();

            return response()->json(['users' => $users]);
        })->name('api.admin.users');

        Route::get('/apps', function (Request $request) {
            $user = $request->user();
            if (! $user || ! $user->isSuperAdmin()) {
                return response()->json(['error' => 'Unauthorized. Super Admin access required.'], 403);
            }

            $apps = \App\Models\App::withoutGlobalScopes()
                ->with([
                    'tenant.users',
                    'connection',
                    'configs' => fn ($q) => $q->latest('version'),
                    'subscriptions.plan',
                    'builds'  => fn ($q) => $q->latest('id'),
                ])
                ->latest()
                ->get()
                ->map(function ($app) {
                    $owner = $app->tenant?->users?->first();
                    $activeSub = $app->subscriptions->firstWhere('status', 'active') ?? $app->subscriptions->first();
                    $latestBuild = $app->builds->first();
                    $latestConfig = $app->configs->first();

                    return [
                        'id'            => $app->id,
                        'ulid'          => $app->ulid,
                        'name'          => $app->name,
                        'platform'      => $app->platform,
                        'package_name'  => $app->package_name,
                        'status'        => $app->status,
                        'setup_step'    => $app->setup_step,
                        'created_at'    => $app->created_at,
                        'user'          => $owner ? [
                            'id'    => $owner->id,
                            'name'  => $owner->name,
                            'email' => $owner->email,
                            'role'  => $owner->role,
                        ] : null,
                        'store_url'         => $app->connection?->store_url ?? '',
                        'connection_status' => $app->connection?->status ?? 'disconnected',
                        'plan_name'         => $activeSub?->plan?->name ?? 'None',
                        'theme'             => $latestConfig?->config['theme']['name'] ?? $latestConfig?->config['theme'] ?? 'Minimal Clean',
                        'theme_slug'        => $latestConfig?->config['theme']['slug'] ?? 'minimal',
                        'colors'            => $latestConfig?->config['theme']['colors'] ?? null,
                        'latest_build'      => $latestBuild ? [
                            'id'         => $latestBuild->id,
                            'status'     => $latestBuild->status,
                            'created_at' => $latestBuild->created_at,
                            'apk_url'    => $latestBuild->apk_path ? url("/api/apps/{$app->ulid}/builds/{$latestBuild->id}/download-file?format=apk") : null,
                            'aab_url'    => $latestBuild->aab_path ? url("/api/apps/{$app->ulid}/builds/{$latestBuild->id}/download-file?format=aab") : null,
                        ] : null,
                        'builds_count'      => $app->builds->count(),
                        'raw_config'        => $latestConfig?->config ?? [],
                    ];
                });

            return response()->json(['apps' => $apps]);
        })->name('api.admin.apps');

        // ── Admin Commercial Management ─────────────────────────────────────
        Route::get('/commercial/overview', [\App\Http\Controllers\Api\CommercialAdminController::class, 'overview'])
            ->name('api.admin.commercial.overview');
        Route::get('/commercial/packages', [\App\Http\Controllers\Api\CommercialAdminController::class, 'getPackages'])
            ->name('api.admin.commercial.packages');
        Route::put('/commercial/packages/{id}', [\App\Http\Controllers\Api\CommercialAdminController::class, 'updatePackage'])
            ->name('api.admin.commercial.packages.update');
        Route::get('/commercial/addons', [\App\Http\Controllers\Api\CommercialAdminController::class, 'getAddOns'])
            ->name('api.admin.commercial.addons');
        Route::post('/commercial/addons', [\App\Http\Controllers\Api\CommercialAdminController::class, 'createAddOn'])
            ->name('api.admin.commercial.addons.create');
        Route::put('/commercial/addons/{id}', [\App\Http\Controllers\Api\CommercialAdminController::class, 'updateAddOn'])
            ->name('api.admin.commercial.addons.update');
        Route::get('/commercial/orders', [\App\Http\Controllers\Api\CommercialAdminController::class, 'getOrders'])
            ->name('api.admin.commercial.orders');
        Route::get('/commercial/custom-features', [\App\Http\Controllers\Api\CommercialAdminController::class, 'getCustomFeatures'])
            ->name('api.admin.commercial.custom-features');
        Route::post('/commercial/custom-features/{id}/quote', [\App\Http\Controllers\Api\CommercialAdminController::class, 'quoteCustomFeature'])
            ->name('api.admin.commercial.custom-features.quote');
        Route::post('/commercial/custom-features/{id}/status', [\App\Http\Controllers\Api\CommercialAdminController::class, 'updateCustomFeatureStatus'])
            ->name('api.admin.commercial.custom-features.status');
    });
});

// Direct file download stream
Route::get('/apps/{ulid}/builds/{id}/download-file', [\App\Http\Controllers\Api\BuildController::class, 'downloadFile'])
    ->name('api.apps.builds.download.file');

// Direct build pipeline management (guarded by active subscription requirement in controller)
Route::get('/apps/{ulid}/builds', [\App\Http\Controllers\Api\BuildController::class, 'index'])
    ->name('api.apps.builds.index.direct');

Route::post('/apps/{ulid}/builds', [\App\Http\Controllers\Api\BuildController::class, 'store'])
    ->name('api.apps.builds.store.direct');

Route::get('/apps/{ulid}/builds/{id}', [\App\Http\Controllers\Api\BuildController::class, 'show'])
    ->name('api.apps.builds.show.direct');

Route::get('/apps/{ulid}/builds/{id}/download', [\App\Http\Controllers\Api\BuildController::class, 'download'])
    ->name('api.apps.builds.download.direct');

// Direct setup-state query
Route::get('/apps/{ulid}/setup-state', [\App\Http\Controllers\Api\SetupStateController::class, 'show'])
    ->name('api.apps.setup-state');

Route::post('/apps/{ulid}/advance-step', [\App\Http\Controllers\Api\SetupStateController::class, 'advanceStep'])
    ->name('api.apps.advance-step.direct');

Route::get('/apps/{ulid}/consent', [\App\Http\Controllers\Api\ConsentController::class, 'index'])
    ->name('api.apps.consent.index.direct');

Route::post('/apps/{ulid}/consent', [\App\Http\Controllers\Api\ConsentController::class, 'store'])
    ->name('api.apps.consent.store.direct');

Route::get('/apps/{ulid}/admin-portal', [\App\Http\Controllers\Api\AppController::class, 'adminPortal'])
    ->name('api.apps.admin-portal.direct');

Route::post('/apps/{ulid}/admin-portal/sync-catalog', [\App\Http\Controllers\Api\AppController::class, 'syncCatalog'])
    ->name('api.apps.admin-portal.sync.direct');

Route::post('/apps/{ulid}/admin-portal/banners', [\App\Http\Controllers\Api\AppController::class, 'saveBanner'])
    ->name('api.apps.admin-portal.banners.save.direct');

Route::delete('/apps/{ulid}/admin-portal/banners/{bannerId}', [\App\Http\Controllers\Api\AppController::class, 'deleteBanner'])
    ->name('api.apps.admin-portal.banners.delete.direct');

Route::post('/apps/{ulid}/admin-portal/sales', [\App\Http\Controllers\Api\AppController::class, 'saveSale'])
    ->name('api.apps.admin-portal.sales.save.direct');

Route::delete('/apps/{ulid}/admin-portal/sales/{saleId}', [\App\Http\Controllers\Api\AppController::class, 'deleteSale'])
    ->name('api.apps.admin-portal.sales.delete.direct');

Route::post('/apps/{ulid}/admin-portal/categories', [\App\Http\Controllers\Api\AppController::class, 'saveCategory'])
    ->name('api.apps.admin-portal.categories.save.direct');

Route::post('/apps/{ulid}/admin-portal/products', [\App\Http\Controllers\Api\AppController::class, 'saveProduct'])
    ->name('api.apps.admin-portal.products.save.direct');

Route::post('/apps/{ulid}/admin-portal/products/{productId}/toggle-status', [\App\Http\Controllers\Api\AppController::class, 'toggleProductStatus'])
    ->name('api.apps.admin-portal.products.toggle-status.direct');

Route::delete('/apps/{ulid}/admin-portal/products/{productId}', [\App\Http\Controllers\Api\AppController::class, 'deleteProduct'])
    ->name('api.apps.admin-portal.products.delete.direct');

Route::post('/apps/{ulid}/admin-portal/coupons', [\App\Http\Controllers\Api\AppController::class, 'saveCoupon'])
    ->name('api.apps.admin-portal.coupons.save.direct');

Route::delete('/apps/{ulid}/admin-portal/coupons/{couponId}', [\App\Http\Controllers\Api\AppController::class, 'deleteCoupon'])
    ->name('api.apps.admin-portal.coupons.delete.direct');

Route::get('/apps/{ulid}/admin-portal/terawallet-status', [\App\Http\Controllers\Api\AppController::class, 'getTeraWalletStatus'])
    ->name('api.apps.admin-portal.terawallet-status.direct');

Route::post('/apps/{ulid}/admin-portal/terawallet-verify', [\App\Http\Controllers\Api\AppController::class, 'verifyTeraWallet'])
    ->name('api.apps.admin-portal.terawallet-verify.direct');

Route::post('/apps/{ulid}/admin-portal/refunds', [\App\Http\Controllers\Api\AppController::class, 'processRefund'])
    ->name('api.apps.admin-portal.refunds.direct');

Route::post('/apps/{ulid}/complete', [\App\Http\Controllers\Api\AppController::class, 'complete'])
    ->name('api.apps.complete.direct');

Route::delete('/apps/{ulid}', [\App\Http\Controllers\Api\AppController::class, 'destroy'])
    ->name('api.apps.destroy.direct');

// ── Razorpay Payment Gateway Endpoints ──────────────────────────────────────────
Route::post('/apps/{ulid}/payment/create-order', function (Request $request, string $ulid) {
    $app = \App\Models\App::withoutTenantScope()->where('ulid', $ulid)->firstOrFail();
    $tenant = $app->tenant ?? \App\Models\Tenant::first();

    $planId = (int) $request->input('plan_id', 1);
    $interval = (string) $request->input('billing_period', 'one_time');
    $addons = (array) $request->input('addons', []);
    $themeKey = (string) $request->input('theme_key', '');

    $plan = \App\Models\Plan::findOrFail($planId);

    /** @var \App\Services\Billing\RazorpayService $razorpayService */
    $razorpayService = app(\App\Services\Billing\RazorpayService::class);

    try {
        $orderData = $razorpayService->createSubscription($tenant, $plan, $app, $interval, $addons, $themeKey ?: null);
        $user = $tenant?->users()->first();

        return response()->json([
            'success' => true,
            'order'   => $orderData,
            'plan'    => $plan,
            'prefill' => [
                'name'    => $user?->name ?? $tenant?->name ?? '',
                'email'   => $user?->email ?? '',
                'contact' => $user?->phone ?? '',
            ],
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'success' => false,
            'error'   => $e->getMessage(),
        ], 500);
    }
})->name('api.apps.payment.create-order');

Route::post('/apps/{ulid}/payment/verify', function (Request $request, string $ulid) {
    $app = \App\Models\App::withoutTenantScope()->where('ulid', $ulid)->firstOrFail();
    $tenant = $app->tenant ?? \App\Models\Tenant::first();

    $orderId = (string) $request->input('razorpay_order_id', $request->input('order_id', ''));
    $paymentId = (string) $request->input('razorpay_payment_id', '');
    $signature = (string) $request->input('razorpay_signature', '');
    $planId = (int) $request->input('plan_id', 1);
    $interval = (string) $request->input('billing_period', 'one_time');

    $plan = \App\Models\Plan::findOrFail($planId);

    /** @var \App\Services\Billing\RazorpayService $razorpayService */
    $razorpayService = app(\App\Services\Billing\RazorpayService::class);

    $isMockOrder = str_starts_with($orderId, 'order_mock_');

    // Verify signature if not mock and signature provided
    if (! $isMockOrder && ! empty($signature)) {
        if (! $razorpayService->verifyPaymentSignature($orderId, $paymentId, $signature)) {
            return response()->json([
                'success' => false,
                'error'   => 'Payment verification failed: invalid signature.',
            ], 400);
        }
    }

    $currentPeriodEnd = match ($interval) {
        'annual'   => now()->addYear(),
        'one_time' => now()->addYears(10),
        default    => now()->addMonth(),
    };

    $subscription = \App\Models\Subscription::withoutTenantScope()->updateOrCreate(
        [
            'tenant_id' => $app->tenant_id,
            'app_id'    => $app->id,
        ],
        [
            'plan_id'            => $plan->id,
            'status'             => 'active',
            'razorpay_sub_id'    => 'sub_' . ($orderId ?: uniqid()),
            'current_period_end' => $currentPeriodEnd,
        ]
    );

    /** @var \App\Services\Billing\PricingCalculator $calculator */
    $calculator = app(\App\Services\Billing\PricingCalculator::class);
    $themeKey = (string) $request->input('theme_key', '');
    $calculation = $calculator->calculate($plan, $interval, (array) $request->input('addons', []), $app, $themeKey ?: null);

    // If a theme was selected/purchased, assign it to the app and update draft config
    if (! empty($themeKey)) {
        $app->update(['assigned_theme_key' => $themeKey]);
        $draft = $app->configs()->where('state', 'draft')->latest()->first();
        if ($draft && ! empty($draft->config)) {
            $cfg = $draft->config;
            $themeModel = \App\Models\Theme::where('key', $themeKey)->first();
            if ($themeModel && ! empty($themeModel->defaults)) {
                $cfg['theme'] = $themeModel->defaults;
            }
            $cfg['selected_theme_key'] = $themeKey;
            $draft->update(['config' => $cfg]);
        }
    }

    $effectivePaymentId = $paymentId ?: ('pay_' . strtoupper(uniqid()));
    \App\Models\Payment::withoutTenantScope()->updateOrCreate(
        ['razorpay_payment_id' => $effectivePaymentId],
        [
            'tenant_id' => $app->tenant_id,
            'amount'    => $calculation['total'],
            'status'    => 'captured',
            'raw'       => [
                'order_id'            => $orderId,
                'razorpay_payment_id' => $paymentId,
                'razorpay_signature'  => $signature,
                'plan_name'           => $plan->name,
                'app_name'            => $app->name,
                'is_upgrade'          => $calculation['is_upgrade'],
                'upgrade_credit'      => $calculation['upgrade_credit'],
                'description'         => $calculation['is_upgrade']
                    ? "Upgrade to {$plan->name} with credit of ₹" . number_format($calculation['upgrade_credit'] / 100) . " from {$calculation['current_plan']['name']}"
                    : "Payment for {$plan->name} ({$app->name}) via Razorpay",
            ],
        ]
    );

    // Save fulfilled Order & OrderItems for Plan and purchased Add-ons
    $addons = (array) $request->input('addons', []);
    $user = $tenant?->users()->first();
    if ($user) {
        $orderNumber = 'ORD-' . strtoupper(\Illuminate\Support\Str::random(8));
        $order = \App\Models\Order::create([
            'order_number'    => $orderNumber,
            'tenant_id'       => $tenant->id,
            'user_id'         => $user->id,
            'app_id'          => $app->id,
            'package_id'      => $plan->id,
            'order_type'      => $calculation['is_upgrade'] ? 'upgrade' : 'new_purchase',
            'status'          => 'paid',
            'currency'        => 'INR',
            'subtotal'        => $calculation['subtotal'],
            'discount_amount' => $calculation['upgrade_credit'],
            'tax_amount'      => 0,
            'total_amount'    => $calculation['total'],
            'billing_name'    => $user->name,
            'billing_email'   => $user->email,
            'billing_phone'   => $user->phone ?? '',
            'notes'           => $calculation['is_upgrade']
                ? "Package Upgrade to {$plan->name} with credit of ₹" . number_format($calculation['upgrade_credit'] / 100) . " from {$calculation['current_plan']['name']} (Razorpay {$effectivePaymentId})"
                : "Purchased via Setup Wizard (Razorpay {$effectivePaymentId})",
        ]);

        if ($calculation['is_upgrade']) {
            \App\Models\OrderItem::create([
                'order_id'    => $order->id,
                'item_type'   => 'upgrade_difference',
                'item_id'     => $plan->id,
                'name'        => "Package Upgrade: {$calculation['current_plan']['name']} to {$plan->name}",
                'description' => "Pro-rated price difference upgrade to {$plan->name} package (Deducted ₹" . number_format($calculation['upgrade_credit'] / 100) . " paid credit)",
                'unit_price'  => $calculation['plan_charge'],
                'quantity'    => 1,
                'total_price' => $calculation['plan_charge'],
                'meta'        => [
                    'from_package_id' => $calculation['current_plan']['id'],
                    'to_package_id'   => $plan->id,
                    'upgrade_credit'  => $calculation['upgrade_credit'],
                ],
            ]);

            \App\Models\PackageUpgrade::create([
                'order_id'             => $order->id,
                'tenant_id'            => $tenant->id,
                'app_id'               => $app->id,
                'from_package_id'      => $calculation['current_plan']['id'],
                'to_package_id'        => $plan->id,
                'original_paid_amount' => $calculation['upgrade_credit'],
                'new_package_amount'   => $calculation['subtotal'],
                'difference_paid'      => $calculation['plan_charge'],
                'status'               => 'completed',
            ]);
        } else {
            \App\Models\OrderItem::create([
                'order_id'    => $order->id,
                'item_type'   => 'package',
                'item_id'     => $plan->id,
                'name'        => "{$plan->name} Package",
                'description' => "Mobile Application Platform Package ({$plan->name})",
                'unit_price'  => $calculation['plan_charge'],
                'quantity'    => 1,
                'total_price' => $calculation['plan_charge'],
                'meta'        => ['plan_id' => $plan->id, 'plan_name' => $plan->name],
            ]);
        }

        foreach ($addons as $addonKey => $val) {
            $identifier = is_numeric($addonKey) && (is_string($val) || is_int($val)) ? $val : $addonKey;
            $addonModel = \App\Models\AddOn::where(function ($q) use ($identifier) {
                if (is_numeric($identifier)) {
                    $q->where('id', (int) $identifier);
                } else {
                    $q->where('slug', (string) $identifier);
                }
            })->first();

            if ($addonModel) {
                \App\Models\OrderItem::create([
                    'order_id'    => $order->id,
                    'item_type'   => 'addon',
                    'item_id'     => $addonModel->id,
                    'name'        => $addonModel->name,
                    'description' => $addonModel->description,
                    'unit_price'  => $addonModel->price,
                    'quantity'    => 1,
                    'total_price' => $addonModel->price,
                    'meta'        => ['slug' => $addonModel->slug],
                ]);
            }
        }

        // Save theme order item if a paid theme was purchased
        if (! empty($themeKey) && ($calculation['theme_charge'] ?? 0) > 0) {
            $themeModel = \App\Models\Theme::where('key', $themeKey)->first();
            \App\Models\OrderItem::create([
                'order_id'    => $order->id,
                'item_type'   => 'theme',
                'item_id'     => $themeModel?->id ?? 0,
                'name'        => ($themeModel?->name ?? 'Custom Mobile') . ' Theme License',
                'description' => "Selected custom mobile theme layout ({$themeKey})",
                'unit_price'  => $calculation['theme_charge'],
                'quantity'    => 1,
                'total_price' => $calculation['theme_charge'],
                'meta'        => ['theme_key' => $themeKey, 'name' => $themeModel?->name],
            ]);
        }

        // Trigger payment success & invoice email notification
        try {
            app(\App\Services\Billing\EmailNotificationService::class)->sendPaymentSuccessEmail($order, $effectivePaymentId);
        } catch (\Throwable $mailErr) {
            \Illuminate\Support\Facades\Log::error('Invoice email delivery error: ' . $mailErr->getMessage());
        }
    }

    if ($app->setup_step->order() < \App\Enums\SetupStep::Build->order()) {
        $app->update(['setup_step' => \App\Enums\SetupStep::Build]);
    }

    return response()->json([
        'success'      => true,
        'message'      => 'Payment verified and subscription activated successfully.',
        'subscription' => $subscription,
        'plan'         => $plan,
    ]);
})->name('api.apps.payment.verify');

// Direct plan activation stream
Route::post('/apps/{ulid}/subscribe', function (Request $request, string $ulid) {
    $app = \App\Models\App::withoutTenantScope()->where('ulid', $ulid)->firstOrFail();
    $planId = (int) $request->input('plan_id', 1);
    $plan = \App\Models\Plan::findOrFail($planId);

    $subscription = \App\Models\Subscription::withoutTenantScope()->updateOrCreate(
        [
            'tenant_id' => $app->tenant_id,
            'app_id'    => $app->id,
        ],
        [
            'plan_id'            => $plan->id,
            'status'             => 'active',
            'razorpay_sub_id'    => 'sub_' . $app->id . '_' . $plan->id . '_' . uniqid(),
            'current_period_end' => now()->addMonth(),
        ]
    );

    /** @var \App\Services\Billing\PricingCalculator $calculator */
    $calculator = app(\App\Services\Billing\PricingCalculator::class);
    $interval = (string) $request->input('billing_period', 'one_time');
    $addons = (array) $request->input('addons', []);
    $themeKey = (string) $request->input('theme_key', '');
    $calculation = $calculator->calculate($plan, $interval, $addons, $app, $themeKey ?: null);

    // If a theme was selected/purchased, assign it to the app and update draft config
    if (! empty($themeKey)) {
        $app->update(['assigned_theme_key' => $themeKey]);
        $draft = $app->configs()->where('state', 'draft')->latest()->first();
        if ($draft && ! empty($draft->config)) {
            $cfg = $draft->config;
            $themeModel = \App\Models\Theme::where('key', $themeKey)->first();
            if ($themeModel && ! empty($themeModel->defaults)) {
                $cfg['theme'] = $themeModel->defaults;
            }
            $cfg['selected_theme_key'] = $themeKey;
            $draft->update(['config' => $cfg]);
        }
    }

    // Record payment receipt
    \App\Models\Payment::withoutTenantScope()->create([
        'tenant_id'           => $app->tenant_id,
        'razorpay_payment_id' => 'pay_' . strtoupper(uniqid()),
        'amount'              => $calculation['total'],
        'status'              => 'captured',
        'raw'                 => [
            'plan_name'      => $plan->name,
            'app_name'       => $app->name,
            'is_upgrade'     => $calculation['is_upgrade'],
            'upgrade_credit' => $calculation['upgrade_credit'],
            'description'    => $calculation['is_upgrade']
                ? "Upgrade to {$plan->name} with credit of ₹" . number_format($calculation['upgrade_credit'] / 100) . " (Dev Mode)"
                : "Subscription for {$plan->name} ({$app->name}) (Dev Mode)",
        ],
    ]);

    // Record Order & OrderItem if user exists so add-ons are unlocked
    $tenant = $app->tenant ?? \App\Models\Tenant::first();
    $user = $tenant?->users()->first();
    if ($user) {
        $orderNumber = 'ORD-' . strtoupper(\Illuminate\Support\Str::random(8));
        $order = \App\Models\Order::create([
            'order_number'    => $orderNumber,
            'tenant_id'       => $tenant->id,
            'user_id'         => $user->id,
            'app_id'          => $app->id,
            'package_id'      => $plan->id,
            'order_type'      => $calculation['is_upgrade'] ? 'upgrade' : 'new_purchase',
            'status'          => 'paid',
            'currency'        => 'INR',
            'subtotal'        => $calculation['subtotal'],
            'discount_amount' => $calculation['upgrade_credit'],
            'tax_amount'      => 0,
            'total_amount'    => $calculation['total'],
            'billing_name'    => $user->name,
            'billing_email'   => $user->email,
            'billing_phone'   => $user->phone ?? '',
            'notes'           => $calculation['is_upgrade']
                ? "Package Upgrade to {$plan->name} with credit of ₹" . number_format($calculation['upgrade_credit'] / 100) . " from {$calculation['current_plan']['name']} (Dev Mode)"
                : 'Activated via Setup Wizard (Dev Mode)',
        ]);

        if ($calculation['is_upgrade']) {
            \App\Models\OrderItem::create([
                'order_id'    => $order->id,
                'item_type'   => 'upgrade_difference',
                'item_id'     => $plan->id,
                'name'        => "Package Upgrade: {$calculation['current_plan']['name']} to {$plan->name}",
                'description' => "Pro-rated price difference upgrade to {$plan->name} package (Deducted ₹" . number_format($calculation['upgrade_credit'] / 100) . " paid credit)",
                'unit_price'  => $calculation['plan_charge'],
                'quantity'    => 1,
                'total_price' => $calculation['plan_charge'],
                'meta'        => [
                    'from_package_id' => $calculation['current_plan']['id'],
                    'to_package_id'   => $plan->id,
                    'upgrade_credit'  => $calculation['upgrade_credit'],
                ],
            ]);

            \App\Models\PackageUpgrade::create([
                'order_id'             => $order->id,
                'tenant_id'            => $tenant->id,
                'app_id'               => $app->id,
                'from_package_id'      => $calculation['current_plan']['id'],
                'to_package_id'        => $plan->id,
                'original_paid_amount' => $calculation['upgrade_credit'],
                'new_package_amount'   => $calculation['subtotal'],
                'difference_paid'      => $calculation['plan_charge'],
                'status'               => 'completed',
            ]);
        } else {
            \App\Models\OrderItem::create([
                'order_id'    => $order->id,
                'item_type'   => 'package',
                'item_id'     => $plan->id,
                'name'        => "{$plan->name} Package",
                'description' => "Mobile Application Platform Package ({$plan->name})",
                'unit_price'  => $calculation['plan_charge'],
                'quantity'    => 1,
                'total_price' => $calculation['plan_charge'],
                'meta'        => ['plan_id' => $plan->id, 'plan_name' => $plan->name],
            ]);
        }

        foreach ($addons as $addonKey => $val) {
            $identifier = is_numeric($addonKey) && (is_string($val) || is_int($val)) ? $val : $addonKey;
            $addonModel = \App\Models\AddOn::where(function ($q) use ($identifier) {
                if (is_numeric($identifier)) {
                    $q->where('id', (int) $identifier);
                } else {
                    $q->where('slug', (string) $identifier);
                }
            })->first();

            if ($addonModel) {
                \App\Models\OrderItem::create([
                    'order_id'    => $order->id,
                    'item_type'   => 'addon',
                    'item_id'     => $addonModel->id,
                    'name'        => $addonModel->name,
                    'description' => $addonModel->description,
                    'unit_price'  => $addonModel->price,
                    'quantity'    => 1,
                    'total_price' => $addonModel->price,
                    'meta'        => ['slug' => $addonModel->slug],
                ]);
            }
        }

        // Save theme order item if a paid theme was purchased
        if (! empty($themeKey) && ($calculation['theme_charge'] ?? 0) > 0) {
            $themeModel = \App\Models\Theme::where('key', $themeKey)->first();
            \App\Models\OrderItem::create([
                'order_id'    => $order->id,
                'item_type'   => 'theme',
                'item_id'     => $themeModel?->id ?? 0,
                'name'        => ($themeModel?->name ?? 'Custom Mobile') . ' Theme License',
                'description' => "Selected custom mobile theme layout ({$themeKey})",
                'unit_price'  => $calculation['theme_charge'],
                'quantity'    => 1,
                'total_price' => $calculation['theme_charge'],
                'meta'        => ['theme_key' => $themeKey, 'name' => $themeModel?->name],
            ]);
        }

        // Trigger payment success & invoice email notification
        try {
            app(\App\Services\Billing\EmailNotificationService::class)->sendPaymentSuccessEmail($order, 'dev_activated');
        } catch (\Throwable $mailErr) {
            \Illuminate\Support\Facades\Log::error('Invoice email delivery error: ' . $mailErr->getMessage());
        }
    }

    if ($app->setup_step->order() < \App\Enums\SetupStep::Build->order()) {
        $app->update(['setup_step' => \App\Enums\SetupStep::Build]);
    }

    return response()->json([
        'message'      => 'Subscription activated successfully.',
        'subscription' => $subscription,
        'plan'         => $plan,
    ]);
})->name('api.apps.subscribe');

/**
 * Direct Standalone Add-on Purchase (iOS Bundle, Admin Panel, etc.)
 * Allows user on ANY plan to unlock deliverables without upgrading subscription plan.
 * POST /api/apps/{ulid}/addons/purchase
 */
Route::post('/apps/{ulid}/addons/purchase', function (Request $request, string $ulid) {
    $app = \App\Models\App::withoutTenantScope()->where('ulid', $ulid)->firstOrFail();
    $tenant = $app->tenant ?? \App\Models\Tenant::first();
    $user = $request->user() ?? $tenant?->users()->first();

    $addonSlug = (string) $request->input('addon_slug');
    $addonId = (int) $request->input('addon_id', 0);

    $addon = null;
    if ($addonSlug) {
        $addon = \App\Models\AddOn::where('slug', $addonSlug)->first();
    } elseif ($addonId > 0) {
        $addon = \App\Models\AddOn::find($addonId);
    }

    if (! $addon) {
        return response()->json([
            'success' => false,
            'error'   => 'Add-on not found.',
        ], 404);
    }

    $existingSlugs = $app->getPurchasedAddonSlugs();
    if (in_array($addon->slug, $existingSlugs, true)) {
        return response()->json([
            'success'            => true,
            'message'            => "{$addon->name} is already unlocked for this app.",
            'already_owned'      => true,
            'can_download_ipa'   => $app->canDownloadIpa(),
            'admin_panel_access' => $app->hasAdminPanelAccess(),
        ]);
    }

    $action = $request->input('action', 'checkout'); // 'checkout' or 'fulfill'

    if ($action === 'checkout') {
        $price = $addon->price; // in paise

        $keyId = (string) config('services.razorpay.key_id', env('RAZORPAY_KEY_ID'));
        $keySecret = (string) config('services.razorpay.key_secret', env('RAZORPAY_KEY_SECRET'));
        $hasRealKeys = ! empty($keyId) && ! empty($keySecret) && $keySecret !== 'rzp_test_secret_key';

        $razorpayOrderId = 'order_addon_' . strtolower(\Illuminate\Support\Str::random(14));
        if ($hasRealKeys) {
            try {
                $response = \Illuminate\Support\Facades\Http::withBasicAuth($keyId, $keySecret)
                    ->post('https://api.razorpay.com/v1/orders', [
                        'amount'          => $price,
                        'currency'        => 'INR',
                        'receipt'         => 'rcpt_' . strtoupper(\Illuminate\Support\Str::random(8)),
                        'notes'           => [
                            'type'        => 'addon',
                            'addon_slug'  => $addon->slug,
                            'app_ulid'    => $app->ulid,
                        ],
                    ]);

                if ($response->successful()) {
                    $razorpayOrderId = $response->json('id');
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Razorpay addon order creation fallback: ' . $e->getMessage());
            }
        }

        return response()->json([
            'success'           => true,
            'razorpay_order_id' => $razorpayOrderId,
            'amount'            => $price,
            'amount_rupees'     => (int) round($price / 100),
            'currency'          => 'INR',
            'key_id'            => $keyId ?: 'rzp_test_SnbtbVtFnRIrAI',
            'addon'             => [
                'id'          => $addon->id,
                'name'        => $addon->name,
                'slug'        => $addon->slug,
                'price'       => $price,
                'price_fmt'   => '₹' . number_format($price / 100),
                'description' => $addon->description,
            ],
            'prefill'           => [
                'name'    => $user?->name ?? '',
                'email'   => $user?->email ?? '',
                'contact' => $user?->phone ?? '',
            ],
        ]);
    }

    // Fulfill / Activate Add-on
    $paymentId = (string) $request->input('razorpay_payment_id', 'pay_' . strtoupper(uniqid()));
    $orderNumber = 'ORD-ADDON-' . strtoupper(\Illuminate\Support\Str::random(6));

    $order = \App\Models\Order::create([
        'order_number'    => $orderNumber,
        'tenant_id'       => $tenant->id,
        'user_id'         => $user?->id ?? 1,
        'app_id'          => $app->id,
        'package_id'      => $app->getActivePlan()?->id ?? 1,
        'order_type'      => 'addon',
        'status'          => 'paid',
        'currency'        => 'INR',
        'subtotal'        => $addon->price,
        'discount_amount' => 0,
        'tax_amount'      => 0,
        'total_amount'    => $addon->price,
        'billing_name'    => $user?->name ?? '',
        'billing_email'   => $user?->email ?? '',
        'billing_phone'   => $user?->phone ?? '',
        'paid_at'         => now(),
        'notes'           => "Standalone Add-on: {$addon->name} for {$app->name} (Payment {$paymentId})",
    ]);

    \App\Models\OrderItem::create([
        'order_id'    => $order->id,
        'item_type'   => 'addon',
        'item_id'     => $addon->id,
        'name'        => $addon->name,
        'description' => $addon->description,
        'unit_price'  => $addon->price,
        'quantity'    => 1,
        'total_price' => $addon->price,
        'meta'        => [
            'slug' => $addon->slug,
            'name' => $addon->name,
        ],
    ]);

    \App\Models\Payment::withoutTenantScope()->updateOrCreate(
        ['razorpay_payment_id' => $paymentId],
        [
            'tenant_id' => $tenant->id,
            'amount'    => $addon->price,
            'status'    => 'captured',
            'raw'       => [
                'order_number' => $orderNumber,
                'addon_slug'   => $addon->slug,
                'app_name'     => $app->name,
                'payment_id'   => $paymentId,
            ],
        ]
    );

    // Refresh app permissions
    $app->refresh();

    return response()->json([
        'success'            => true,
        'message'            => "{$addon->name} activated successfully for {$app->name}!",
        'can_download_ipa'   => $app->canDownloadIpa(),
        'admin_panel_access' => $app->hasAdminPanelAccess(),
    ]);
})->name('api.apps.addons.purchase');


