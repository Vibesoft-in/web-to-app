<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;

// Root redirect to Admin Dashboard
Route::get('/', function () {
    return redirect('/admin');
});

// Fallback login route for web requests - redirects to Filament Admin login
Route::get('/login', function () {
    return redirect('/admin/login');
})->name('login');

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
