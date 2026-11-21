<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;

// Root redirect to Admin Dashboard
Route::get('/', function () {
    return redirect(env('FRONTEND_URL', 'http://localhost:3000') . '/admin');
});

// Redirect any legacy backend /admin visits to the new Super Admin panel
Route::get('/admin', function () {
    return redirect(env('FRONTEND_URL', 'http://localhost:3000') . '/admin');
});
Route::get('/admin/{any}', function () {
    return redirect(env('FRONTEND_URL', 'http://localhost:3000') . '/admin');
})->where('any', '.*');

// Fallback login route for web requests
Route::get('/login', function () {
    return redirect(env('FRONTEND_URL', 'http://localhost:3000') . '/login');
})->name('login');

// Password reset redirection route to Next.js frontend
Route::get('/reset-password/{token}', function (string $token) {
    $origin = request()->header('origin') ?: request()->header('referer');
    if ($origin) {
        $parsed = parse_url($origin);
        $frontendUrl = ($parsed['scheme'] ?? 'https') . '://' . ($parsed['host'] ?? 'localhost') . (!empty($parsed['port']) ? ':' . $parsed['port'] : '');
    } else {
        $frontendUrl = rtrim((string) env('FRONTEND_URL', env('APP_URL', 'http://localhost:3000')), '/');
        if (str_contains($frontendUrl, '8000')) {
            $frontendUrl = str_replace('8000', '3000', $frontendUrl);
        }
    }
    $email = request()->query('email');
    return redirect("{$frontendUrl}/reset-password?token={$token}&email=" . urlencode((string) $email));
})->name('password.reset');

// Admin SSO route to authenticate Super Admin
Route::get('/admin/sso', function (\Illuminate\Http\Request $request) {
    return redirect(env('FRONTEND_URL', 'http://localhost:3000') . '/admin');
});

// Safe web-based migration & initialization route for shared hosting
Route::get('/migrate-db', function () {
    try {
        $forceConn = request()->query('connection') ?: request()->query('db');
        if ($forceConn === 'sqlite') {
            config(['database.default' => 'sqlite']);
            $path = database_path('database.sqlite');
            config(['database.connections.sqlite.database' => $path]);
        }

        $dbConnection = config('database.default');

        // If SQLite, ensure database file and directory exist with write permissions
        if ($dbConnection === 'sqlite') {
            $path = config('database.connections.sqlite.database');
            if (empty($path) || $path === ':memory:' || ! file_exists($path)) {
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

        // Run migrations
        Artisan::call('migrate', ['--force' => true]);
        $migrateOutput = Artisan::output();

        // Seed initial plans and test data if seeder available
        $seedOutput = '';
        try {
            Artisan::call('db:seed', ['--class' => 'AdminAndPlanSeeder', '--force' => true]);
            $seedOutput = Artisan::output();
        } catch (\Throwable $se) {
            $seedOutput = 'Plan seeder note: ' . $se->getMessage();
        }

        try {
            Artisan::call('db:seed', ['--class' => 'ThemeSeeder', '--force' => true]);
            $seedOutput .= "\n" . Artisan::output();
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
            'hint'    => 'If using MySQL, update DB_DATABASE, DB_USERNAME, DB_PASSWORD in backend/.env on Hostinger with your real MySQL details. Or visit /migrate-db?connection=sqlite to initialize SQLite instantly.',
        ], 500);
    }
});

// Self-healing database repair & cache clearing endpoint for shared hosting/cPanel
Route::get('/fix-db', function () {
    try {
        $actions = [];

        // 1. Delete stale bootstrap cached config if present
        $cachedConfig = app()->bootstrapPath('cache/config.php');
        if (file_exists($cachedConfig)) {
            @unlink($cachedConfig);
            $actions[] = 'Removed stale bootstrap/cache/config.php';
        }
        $cachedRoutes = app()->bootstrapPath('cache/routes-v7.php');
        if (file_exists($cachedRoutes)) {
            @unlink($cachedRoutes);
            $actions[] = 'Removed stale bootstrap/cache/routes-v7.php';
        }

        // 2. Clear artisan config and application caches
        try {
            Artisan::call('config:clear');
            Artisan::call('cache:clear');
            $actions[] = 'Executed config:clear and cache:clear';
        } catch (\Throwable $ce) {
            $actions[] = 'Cache clear note: ' . $ce->getMessage();
        }

        // 3. Force SQLite path to canonical database_path
        $canonicalPath = database_path('database.sqlite');
        $dir = dirname($canonicalPath);
        if (! is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        if (! file_exists($canonicalPath)) {
            @touch($canonicalPath);
            $actions[] = 'Created database.sqlite at ' . $canonicalPath;
        }
        @chmod($dir, 0777);
        @chmod($canonicalPath, 0666);

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => $canonicalPath,
        ]);
        \Illuminate\Support\Facades\DB::purge('sqlite');

        // 4. Test connection and check schema
        \Illuminate\Support\Facades\DB::connection()->getPdo();
        $hasUsers = \Illuminate\Support\Facades\Schema::hasTable('users');
        if (! $hasUsers) {
            Artisan::call('migrate', ['--force' => true]);
            $actions[] = 'Ran database migrations';
            try {
                Artisan::call('db:seed', ['--class' => 'AdminAndPlanSeeder', '--force' => true]);
                Artisan::call('db:seed', ['--class' => 'ThemeSeeder', '--force' => true]);
                $actions[] = 'Executed initial seeders';
            } catch (\Throwable) {}
        }

        // 5. Auto-repair any builds stuck in Failed state due to server SDK absence
        try {
            $failedBuilds = \App\Models\Build::withoutTenantScope()
                ->where('status', \App\Enums\BuildStatus::Failed)
                ->where(function ($q) {
                    $q->where('error', 'like', '%Android SDK%')
                      ->orWhere('error', 'like', '%SDK%')
                      ->orWhere('error', 'like', '%generation failed%')
                      ->orWhere('error', 'like', '%compilation%')
                      ->orWhereNull('error');
                })
                ->get();

            foreach ($failedBuilds as $fb) {
                if ($fb->app) {
                    $apkPath = storage_path("app/tenants/{$fb->tenant_id}/artifacts/apps/{$fb->app->ulid}/app-release-v{$fb->version_code}.apk");
                    $aabPath = storage_path("app/tenants/{$fb->tenant_id}/artifacts/apps/{$fb->app->ulid}/app-release-v{$fb->version_code}.aab");
                    \App\Services\Build\NativeApkGenerator::generateStandalonePackage($fb->app, $fb, $apkPath, $aabPath);
                    $fb->update([
                        'status'        => \App\Enums\BuildStatus::Ready,
                        'artifact_path' => "tenants/{$fb->tenant_id}/artifacts/apps/{$fb->app->ulid}/app-release-v{$fb->version_code}.aab",
                        'error'         => null,
                        'finished_at'   => now(),
                    ]);
                    $fb->app->update([
                        'status'     => \App\Enums\AppStatus::Completed,
                        'setup_step' => \App\Enums\SetupStep::Build,
                    ]);
                    $actions[] = "Repaired failed build #{$fb->id} to Ready status for app {$fb->app->name}";
                }
            }
        } catch (\Throwable $be) {
            $actions[] = 'Build auto-repair note: ' . $be->getMessage();
        }

        // 6. Clean up any draft apps whose connection was prematurely forced to verified without credentials
        try {
            $resetDrafts = 0;
            \App\Models\App::withoutGlobalScopes()
                ->where('status', 'draft')
                ->whereDoesntHave('orders', fn ($q) => $q->where('status', 'paid'))
                ->whereDoesntHave('subscriptions', fn ($q) => $q->where('status', 'active'))
                ->each(function ($draftApp) use (&$resetDrafts) {
                    $changed = false;
                    if ($draftApp->connection) {
                        $creds = $draftApp->connection->credentials;
                        $hasCreds = is_array($creds) && (!empty($creds['consumer_key']) || !empty($creds['key']) || !empty($creds['api_key']));
                        if (! $hasCreds && $draftApp->connection->status === \App\Enums\ConnectionStatus::Verified) {
                            $draftApp->connection->update([
                                'status' => \App\Enums\ConnectionStatus::NotStarted,
                            ]);
                            $changed = true;
                        }
                    }
                    if ($draftApp->setup_step === \App\Enums\SetupStep::Build) {
                        $draftApp->update([
                            'setup_step' => \App\Enums\SetupStep::Connect,
                        ]);
                        $changed = true;
                    }
                    if ($changed) {
                        $resetDrafts++;
                    }
                });
            if ($resetDrafts > 0) {
                $actions[] = "Reset unverified connections for {$resetDrafts} draft apps back to initial state";
            }
        } catch (\Throwable $re) {
            $actions[] = 'Draft reset note: ' . $re->getMessage();
        }

        return response()->json([
            'status'        => 'success',
            'message'       => 'Database and cache resolved successfully.',
            'sqlite_path'   => $canonicalPath,
            'tables_ready'  => \Illuminate\Support\Facades\Schema::hasTable('users'),
            'actions_taken' => $actions,
            'health_check'  => url('/api/health'),
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'status'  => 'error',
            'message' => $e->getMessage(),
            'file'    => $e->getFile() . ':' . $e->getLine(),
        ], 500);
    }
});

Route::get('/clear-cache', function () {
    return redirect('/fix-db');
});

// Resilient direct storage file server for uploaded app assets
Route::get('/storage/{path}', function (string $path) {
    $filePath = storage_path('app/public/' . $path);
    if (! file_exists($filePath)) {
        abort(404);
    }
    return response()->file($filePath, [
        'Access-Control-Allow-Origin' => '*',
        'Access-Control-Allow-Methods' => 'GET, OPTIONS',
    ]);
})->where('path', '.*');
