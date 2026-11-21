<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            \Illuminate\Support\Facades\Route::get('/health', [\App\Http\Controllers\Api\HealthCheckController::class, 'probe'])
                ->name('health');

            \Illuminate\Support\Facades\Route::middleware('api')
                ->prefix('v1')
                ->name('v1.')
                ->group(base_path('routes/v1.php'));

            \Illuminate\Support\Facades\Route::middleware('api')
                ->prefix('webhooks')
                ->name('webhooks.')
                ->group(base_path('routes/webhooks.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->api(prepend: [
            \App\Http\Middleware\EnsureSanctumTokenHeader::class,
            \App\Http\Middleware\SecurityHeaders::class,
        ]);

        $middleware->alias([
            'tenant'       => \App\Http\Middleware\ResolveTenant::class,
            'step'         => \App\Http\Middleware\EnsureStepAllowed::class,
            'app.key'      => \App\Http\Middleware\ResolveAppKey::class,
            'app.user'     => \App\Http\Middleware\VerifyAppUserToken::class,
            'throttle.tenant' => \App\Http\Middleware\ThrottleByTenant::class,
        ]);

        // Exclude webhook routes from CSRF (they use HMAC instead)
        $middleware->validateCsrfTokens(except: [
            'webhooks/*',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Never expose stack traces in production responses
        $exceptions->render(function (\Throwable $e, Request $request) {
            if ($request->expectsJson() && ! config('app.debug')) {
                return null; // Let Laravel's default JSON handler deal with it
            }
            return null;
        });
    })
    ->create();
