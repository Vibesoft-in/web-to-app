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
use App\Services\Connectors\Woo\WooConnector;
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
        $app = App::where('ulid', $ulid)->firstOrFail();
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
     * Verify store connection and credentials.
     *
     * POST /api/apps/{ulid}/connection/verify
     */
    public function verify(VerifyConnectionRequest $request, string $ulid): JsonResponse
    {
        $app = App::where('ulid', $ulid)->firstOrFail();
        $data = $request->validated();

        $siteUrl = trim($data['site_url']);
        $consumerKey = trim($data['consumer_key']);
        $consumerSecret = trim($data['consumer_secret']);

        // Instantiate connector with UrlGuard
        $connector = new WooConnector(
            siteUrl: $siteUrl,
            consumerKey: $consumerKey,
            consumerSecret: $consumerSecret,
            urlGuard: $this->urlGuard
        );

        // Execute verification
        $result = $connector->verify();

        if (! $result->success) {
            // Update or record failed state on connection if exists
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

        // Verification succeeded: persist encrypted credentials and update status
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
            'tenant_id' => $app->tenant_id,
            'actor_id'  => $request->user()?->id,
            'action'    => 'connection.verified',
            'target'    => "app:{$app->ulid}",
            'ip'        => $request->ip(),
            'user_agent' => $request->userAgent(),
            'meta'      => [
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
