<?php

declare(strict_types=1);

namespace App\Providers;

use App\Services\Build\Firebase\FakeFirebaseProvisioner;
use App\Services\Build\Firebase\FirebaseManagementProvisioner;
use App\Services\Build\Firebase\FirebaseProvisionerInterface;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(FirebaseProvisionerInterface::class, function () {
            if (config('services.firebase.use_fake', true)) {
                return new FakeFirebaseProvisioner();
            }
            return new FirebaseManagementProvisioner(
                serviceAccountKeyPath: config('services.firebase.credentials_path'),
                defaultProjectId: config('services.firebase.project_id')
            );
        });
    }

    public function boot(): void
    {
        // 1. Ensure cache directory exists for file driver
        $cachePath = storage_path('framework/cache/data');
        if (! is_dir($cachePath)) {
            @mkdir($cachePath, 0775, true);
        }

        // 2. On shared hosting environments where Redis daemon might not be running,
        // automatically fallback cache to 'file' if configured redis is unreachable.
        if (config('cache.default') === 'redis') {
            try {
                $redisHost = config('database.redis.default.host', '127.0.0.1');
                $redisPort = (int) config('database.redis.default.port', 6379);
                $connection = @fsockopen($redisHost, $redisPort, $errno, $errstr, 0.4);
                if (is_resource($connection)) {
                    fclose($connection);
                } else {
                    config(['cache.default' => 'file']);
                }
            } catch (\Throwable) {
                config(['cache.default' => 'file']);
            }
        }

        if (config('queue.default') === 'redis') {
            config(['queue.default' => 'sync']);
        }

        // 3. Fallback to SQLite if dummy example MySQL credentials from .env.example are detected
        if (config('database.default') === 'mysql') {
            $mysqlUser = (string) config('database.connections.mysql.username');
            $mysqlDb = (string) config('database.connections.mysql.database');
            if (str_contains($mysqlUser, 'u123456789') || str_contains($mysqlDb, 'u123456789') || $mysqlUser === 'wia') {
                config(['database.default' => 'sqlite']);
                $sqlitePath = database_path('database.sqlite');
                config(['database.connections.sqlite.database' => $sqlitePath]);
                $sqliteDir = dirname($sqlitePath);
                if (! is_dir($sqliteDir)) {
                    @mkdir($sqliteDir, 0775, true);
                }
                if (! file_exists($sqlitePath)) {
                    @touch($sqlitePath);
                }
                @chmod($sqliteDir, 0777);
                @chmod($sqlitePath, 0666);
            }
        }
    }
}
