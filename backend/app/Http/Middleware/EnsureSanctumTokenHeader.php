<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ensures that Laravel Sanctum always receives a valid Bearer token header,
 * even when Apache, cPanel, or reverse proxies strip or rename the Authorization header.
 */
class EnsureSanctumTokenHeader
{
    public function handle(Request $request, Closure $next): Response
    {
        $hasValidBearer = ! empty($request->bearerToken());

        if (! $hasValidBearer) {
            $token = null;

            // 1. Check Apache / FastCGI environment variables
            $serverAuth = $request->server('HTTP_AUTHORIZATION')
                ?? $request->server('REDIRECT_HTTP_AUTHORIZATION')
                ?? $_SERVER['HTTP_AUTHORIZATION'] ?? null
                ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;

            if ($serverAuth && is_string($serverAuth)) {
                $serverAuth = trim($serverAuth);
                if (stripos($serverAuth, 'Bearer ') === 0) {
                    $token = substr($serverAuth, 7);
                } else {
                    $token = $serverAuth;
                }
            }

            // 2. Check Apache request headers if function exists
            if (! $token && function_exists('apache_request_headers')) {
                $apacheHeaders = apache_request_headers();
                $apacheAuth = $apacheHeaders['Authorization']
                    ?? $apacheHeaders['authorization']
                    ?? $apacheHeaders['HTTP_AUTHORIZATION']
                    ?? null;

                if ($apacheAuth && is_string($apacheAuth)) {
                    $apacheAuth = trim($apacheAuth);
                    if (stripos($apacheAuth, 'Bearer ') === 0) {
                        $token = substr($apacheAuth, 7);
                    } else {
                        $token = $apacheAuth;
                    }
                }
            }

            // 3. Check custom auth headers
            if (! $token) {
                $token = $request->header('X-Auth-Token')
                    ?? $request->header('X-Token')
                    ?? $request->header('X-Appify-Token');
            }

            // 4. Check cookies (both encrypted and raw headers/cookies)
            if (! $token) {
                $token = $request->cookie('auth_token')
                    ?? $request->cookies->get('auth_token')
                    ?? $_COOKIE['auth_token'] ?? null
                    ?? $request->cookie('appifyhub_auth_token')
                    ?? $request->cookies->get('appifyhub_auth_token')
                    ?? $_COOKIE['appifyhub_auth_token'] ?? null
                    ?? $request->cookie('token')
                    ?? $request->cookies->get('token')
                    ?? $_COOKIE['token'] ?? null
                    ?? $request->cookie('appifyhub_token')
                    ?? $request->cookies->get('appifyhub_token')
                    ?? $_COOKIE['appifyhub_token'] ?? null;
            }

            // 5. Check query parameter as safe fallback
            if (! $token && ($request->is('api/*') || $request->expectsJson())) {
                $token = $request->query('auth_token')
                    ?? $request->query('token')
                    ?? $request->query('api_token');
            }

            if (! empty($token) && is_string($token)) {
                $request->headers->set('Authorization', 'Bearer ' . trim($token));
            }
        }

        return $next($request);
    }
}
