<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\ConnectionStatus;
use App\Enums\SetupStep;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Connection\VerifyConnectionRequest;
use App\Http\Resources\ConnectionResource;
use App\Models\App;
use App\Models\AuditLog;
use App\Models\Connection;
use App\Services\Connectors\ConnectorFactory;
use App\Services\Security\CredentialVault;
use App\Services\Security\UrlGuard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ConnectionController extends Controller
{
    public function __construct(
        private readonly CredentialVault $vault = new CredentialVault(),
        private readonly UrlGuard $urlGuard = new UrlGuard()
    ) {}

    /**
     * Show connection status for an app.
     */
    public function show(string $ulid): JsonResponse
    {
        $app = App::withoutGlobalScopes()->where('ulid', $ulid)->firstOrFail();
        $connection = $app->connection;

        if (! $connection) {
            return response()->json([
                'status' => 'not_started',
            ]);
        }

        return response()->json([
            'connection' => new ConnectionResource($connection),
        ]);
    }

    /**
     * Normalize URL for strict matching and comparison.
     */
    private function normalizeHost(string $url): string
    {
        $url = trim($url);
        if (! str_starts_with($url, 'http://') && ! str_starts_with($url, 'https://')) {
            $url = "https://{$url}";
        }
        $host = parse_url($url, PHP_URL_HOST);
        if (! $host) {
            return strtolower(trim($url, '/'));
        }
        $host = strtolower($host);
        if (str_starts_with($host, 'www.')) {
            $host = substr($host, 4);
        }

        return $host;
    }

    /**
     * Verify store connection and credentials.
     *
     * POST /api/apps/{ulid}/connection/verify
     */
    public function verify(VerifyConnectionRequest $request, string $ulid): JsonResponse
    {
        $app = App::withoutGlobalScopes()->where('ulid', $ulid)->firstOrFail();
        $data = method_exists($request, 'validated') && isset($request->validator) ? $request->validated() : $request->all();

        $rawSiteUrl = trim($data['site_url']);
        if (! str_starts_with($rawSiteUrl, 'http://') && ! str_starts_with($rawSiteUrl, 'https://')) {
            $rawSiteUrl = "https://{$rawSiteUrl}";
        }
        $siteUrl = rtrim($rawSiteUrl, '/');
        $consumerKey = trim($data['consumer_key']);
        $consumerSecret = trim($data['consumer_secret'] ?? '');

        // 1. Cross-validate that entered URL matches the registered app website
        $appRegisteredUrl = $app->connection?->site_url ?: ($app->website_url ?: '');
        if (! empty($appRegisteredUrl)) {
            $enteredHost = $this->normalizeHost($siteUrl);
            $registeredHost = $this->normalizeHost($appRegisteredUrl);

            // Allow matching root domains (e.g. store.myshopify.com vs custom domain or exact host)
            if ($enteredHost !== $registeredHost && ! str_contains($enteredHost, $registeredHost) && ! str_contains($registeredHost, $enteredHost)) {
                return response()->json([
                    'error' => [
                        'code'    => 'CREDENTIAL_MISMATCH',
                        'message' => "The entered website URL ('{$enteredHost}') does not match the app's registered website ('{$registeredHost}'). Credentials must authenticate against the registered store.",
                    ],
                ], 422);
            }
        }

        // 2. Check platform compatibility
        $platformStr = strtolower((string) ($app->platform instanceof \BackedEnum ? $app->platform->value : $app->platform));
        $isWoo = in_array($platformStr, ['woo', 'woocommerce', 'wordpress', 'wp'], true);
        $isShopify = ($platformStr === 'shopify');

        if ($isWoo) {
            // Reject Shopify credentials on WooCommerce
            if (str_starts_with($consumerKey, 'shpat_') || str_starts_with($consumerKey, 'shpca_') || str_contains($siteUrl, 'myshopify.com')) {
                return response()->json([
                    'error' => [
                        'code'    => 'PLATFORM_MISMATCH',
                        'message' => 'Shopify credentials were provided for a WooCommerce store. Please provide WooCommerce REST API keys (ck_... and cs_...).',
                    ],
                ], 422);
            }
            if (! str_starts_with($consumerKey, 'ck_')) {
                return response()->json([
                    'error' => [
                        'code'    => 'INVALID_KEYS',
                        'message' => 'WooCommerce Consumer Key must start with "ck_". Please generate valid REST API keys in WooCommerce Settings -> Advanced -> REST API.',
                    ],
                ], 422);
            }
        } elseif ($isShopify) {
            // Reject WooCommerce credentials on Shopify
            if (str_starts_with($consumerKey, 'ck_') || str_starts_with($consumerSecret, 'cs_')) {
                return response()->json([
                    'error' => [
                        'code'    => 'PLATFORM_MISMATCH',
                        'message' => 'WooCommerce credentials were provided for a Shopify store. Please provide a Shopify Admin API Access Token (shpat_...) or Custom App API key.',
                    ],
                ], 422);
            }
        }

        // 3. Resolve connector using ConnectorFactory
        $connectorFactory = new ConnectorFactory($this->vault, $this->urlGuard);
        try {
            $connector = $connectorFactory->makeForPlatform(
                platform: $platformStr,
                siteUrl: $siteUrl,
                credentials: [
                    'consumer_key'    => $consumerKey,
                    'consumer_secret' => $consumerSecret,
                    'access_token'    => $consumerKey,
                ]
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => [
                    'code'    => 'UNSUPPORTED_PLATFORM',
                    'message' => $e->getMessage(),
                ],
            ], 422);
        }

        // 4. Execute verification against actual remote website endpoint
        $result = $connector->verify();

        if (! $result->success) {
            if ($app->connection) {
                $app->connection->update([
                    'status'          => ConnectionStatus::Failed,
                    'last_error_code' => $result->errorCode,
                ]);
            }

            return response()->json([
                'error' => [
                    'code'    => $result->errorCode ?? 'VERIFICATION_FAILED',
                    'message' => $result->errorMessage ?? 'Store connection verification failed.',
                    'details' => $result->details,
                ],
            ], 422);
        }

        // 5. Verification succeeded: securely store credentials and update status
        $connection = DB::transaction(function () use ($app, $siteUrl, $consumerKey, $consumerSecret) {
            $connection = Connection::updateOrCreate(
                [
                    'app_id'    => $app->id,
                    'tenant_id' => $app->tenant_id,
                ],
                [
                    'platform'         => $app->platform,
                    'site_url'         => $siteUrl,
                    'credentials'      => [
                        'consumer_key'    => $consumerKey,
                        'consumer_secret' => $consumerSecret,
                    ],
                    'status'           => ConnectionStatus::Verified,
                    'last_verified_at' => now(),
                    'last_error_code'  => null,
                ]
            );

            // Advance setup step to analysis if at connect or platform step
            if ($app->setup_step === SetupStep::Platform || $app->setup_step === SetupStep::Connect) {
                $app->update([
                    'setup_step' => SetupStep::Analysis,
                ]);
            }

            return $connection;
        });

        AuditLog::create([
            'tenant_id'  => $app->tenant_id,
            'actor_id'   => $request->user()?->id,
            'action'     => 'connection.verified',
            'target'     => "app:{$app->ulid}",
            'ip'         => $request->ip(),
            'user_agent' => $request->userAgent(),
            'meta'       => [
                'site_url'       => $siteUrl,
                'store_name'     => $result->storeName,
                'products_count' => $result->productsCount,
            ],
        ]);

        return response()->json([
            'message'    => 'Connection verified successfully.',
            'store'      => [
                'name'           => $result->storeName,
                'products_count' => $result->productsCount,
                'currency'       => $result->currency,
                'wc_version'     => $result->wcVersion,
                'details'        => $result->details,
            ],
            'connection' => new ConnectionResource($connection),
        ]);
    }
}
