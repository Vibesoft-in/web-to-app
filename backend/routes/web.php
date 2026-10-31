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
        ], 500);
    }
});
