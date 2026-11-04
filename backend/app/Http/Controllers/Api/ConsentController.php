<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\App;
use App\Models\AuditLog;
use App\Models\UserConsent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConsentController extends Controller
{
    private function resolveApp(Request $request, string $ulid): App
    {
        $user = auth('sanctum')->user() ?? $request->user();
        $query = $user ? App::where('tenant_id', $user->tenant_id) : App::withoutTenantScope();

        return $query->where('ulid', $ulid)->firstOrFail();
    }

    /**
     * Get recorded consents for an app.
     *
     * GET /api/apps/{ulid}/consent
     */
    public function index(Request $request, string $ulid): JsonResponse
    {
        $app = $this->resolveApp($request, $ulid);

        $consents = UserConsent::where('app_id', $app->id)
            ->latest()
            ->get()
            ->keyBy('consent_type');

        return response()->json([
            'data_collection' => isset($consents['data_collection']) ? [
                'consented'      => true,
                'policy_version' => $consents['data_collection']->policy_version,
                'consented_at'   => $consents['data_collection']->consented_at?->toIso8601String(),
            ] : ['consented' => false],
            'payment_terms' => isset($consents['payment_terms']) ? [
                'consented'      => true,
                'policy_version' => $consents['payment_terms']->policy_version,
                'consented_at'   => $consents['payment_terms']->consented_at?->toIso8601String(),
            ] : ['consented' => false],
        ]);
    }

    /**
     * Record mandatory user consent.
     *
     * POST /api/apps/{ulid}/consent
     */
    public function store(Request $request, string $ulid): JsonResponse
    {
        $app = $this->resolveApp($request, $ulid);

        $validated = $request->validate([
            'consent_type'   => ['required', 'string', 'in:data_collection,payment_terms'],
            'agreed'         => ['required', 'boolean', 'accepted'],
            'policy_version' => ['nullable', 'string', 'max:20'],
            'metadata'       => ['nullable', 'array'],
        ]);

        $user = auth('sanctum')->user() ?? $request->user();

        $consent = UserConsent::create([
            'app_id'         => $app->id,
            'user_id'        => $user?->id,
            'consent_type'   => $validated['consent_type'],
            'policy_version' => $validated['policy_version'] ?? 'v1.0',
            'ip_address'     => $request->ip(),
            'user_agent'     => $request->userAgent(),
            'metadata'       => $validated['metadata'] ?? null,
            'consented_at'   => now(),
        ]);

        AuditLog::create([
            'tenant_id'  => $app->tenant_id,
            'actor_id'   => $user?->id,
            'action'     => "consent.recorded.{$validated['consent_type']}",
            'target'     => "app:{$app->ulid}",
            'ip'         => $request->ip(),
            'user_agent' => $request->userAgent(),
            'meta'       => [
                'consent_type'   => $validated['consent_type'],
                'policy_version' => $consent->policy_version,
                'consent_id'     => $consent->id,
            ],
        ]);

        return response()->json([
            'success'      => true,
            'message'      => 'Consent recorded successfully.',
            'consent_id'   => $consent->id,
            'consent_type' => $consent->consent_type,
            'consented_at' => $consent->consented_at->toIso8601String(),
        ], 201);
    }
}
