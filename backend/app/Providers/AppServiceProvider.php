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
        // Ensure cache directory exists for file driver
        $cachePath = storage_path('framework/cache/data');
        if (! is_dir($cachePath)) {
            @mkdir($cachePath, 0775, true);
        }

        // On shared hosting environments where Redis daemon might not be running,
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
    }
}
