<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class HealthCheckController extends Controller
{
    /**
     * Production healthcheck endpoint probing Database, Redis, and Storage.
     * Returns 200 OK when all subsystems are operational, or 503 on service degradation.
     */
    public function probe(): JsonResponse
    {
        $checks = [
            'database' => 'ok',
            'redis'    => 'ok',
            'storage'  => 'ok',
        ];

        $isHealthy = true;

        // 1. Database check
        try {
            DB::connection()->getPdo();
            if (! Schema::hasTable('users')) {
                $checks['database'] = 'connected_but_tables_missing (open /migrate-db in browser)';
                $isHealthy = false;
            } else {
                $checks['database'] = 'ok';
            }
        } catch (\Throwable $e) {
            $checks['database'] = 'fail: ' . $e->getMessage();
            $isHealthy = false;
        }

        // 2. Redis check (only probe if Redis is active driver)
        $cacheDriver = config('cache.default');
        $queueDriver = config('queue.default');
        $usesRedis = ($cacheDriver === 'redis' || $queueDriver === 'redis');

        if ($usesRedis) {
            try {
                $pong = Redis::connection()->ping();
                $redisOk = ($pong === true || $pong === '+PONG' || $pong === 'PONG');
                $checks['redis'] = $redisOk ? 'ok' : 'fail';
                if (! $redisOk && ! app()->environment(['testing', 'local'])) {
                    $isHealthy = false;
                }
            } catch (\Throwable $e) {
                if (app()->environment(['testing', 'local'])) {
                    $checks['redis'] = 'ok (dev skipped)';
                } else {
                    $checks['redis'] = 'fail: ' . $e->getMessage();
                    $isHealthy = false;
                }
            }
        } else {
            // File/Database/Array cache driver active (e.g. Hostinger Shared hosting), Redis not needed
            $checks['redis'] = 'ok (cache driver: ' . $cacheDriver . ')';
        }

        // 3. Storage check
        try {
            $testFile = 'healthcheck_probe_' . uniqid() . '.tmp';
            Storage::disk('local')->put($testFile, 'ok');
            $read = Storage::disk('local')->get($testFile);
            Storage::disk('local')->delete($testFile);
            if ($read === 'ok') {
                $checks['storage'] = 'ok';
            } else {
                $checks['storage'] = 'fail';
                $isHealthy = false;
            }
        } catch (\Throwable $e) {
            $checks['storage'] = 'fail: ' . $e->getMessage();
            $isHealthy = false;
        }

        return response()->json([
            'status'    => $isHealthy ? 'healthy' : 'degraded',
            'timestamp' => now()->toIso8601String(),
            'version'   => config('app.version', '1.0.0'),
            'checks'    => $checks,
        ], $isHealthy ? 200 : 503);
    }
}
