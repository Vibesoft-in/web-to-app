<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\ConnectionStatus;
use App\Enums\Platform;
use App\Enums\SetupStep;
use App\Http\Controllers\Controller;
use App\Models\App;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SetupStateController extends Controller
{
    private function resolveApp(Request $request, string $ulid): App
    {
        $user = auth('sanctum')->user() ?? $request->user();
        $query = $user ? App::where('tenant_id', $user->tenant_id) : App::withoutTenantScope();

        return $query->where('ulid', $ulid)->firstOrFail();
    }

    /**
     * Get the setup wizard state for an app.
     *
     * GET /api/apps/{ulid}/setup-state
     */
    public function show(Request $request, string $ulid): JsonResponse
    {
        $app = $this->resolveApp($request, $ulid);

        $currentStep = $app->setup_step;

        // Only real progress made by the user dictates the setup step.
        // No premature auto-advance during state retrieval.

        $allSteps = SetupStep::cases();

        $completedSteps = [];
        $allowedSteps = [];

        foreach ($allSteps as $step) {
            if ($step->order() < $currentStep->order()) {
                $completedSteps[] = $step->value;
                $allowedSteps[] = $step->value;
            } elseif ($step->order() === $currentStep->order()) {
                $allowedSteps[] = $step->value;
            }
        }

        $activePlan = $app->getActivePlan();
        $hasActive = ($activePlan !== null);
        $planName = $activePlan?->name ?? null;
        $paidAmountPaise = $activePlan ? (int) $activePlan->price_monthly : 0;
        $paidAmountRupees = (int) round($paidAmountPaise / 100);

        $canDownloadApk = true;
        $canDownloadAab = true;
        $canDownloadIpa = $app->canDownloadIpa();
        $hasAdminPanel = $app->hasAdminPanelAccess();

        return response()->json([
            'app' => [
                'ulid'         => $app->ulid,
                'name'         => $app->name,
                'platform'     => $app->platform,
                'package_name' => $app->package_name,
                'status'       => $app->status,
            ],
            'current_step'    => $currentStep->value,
            'completed_steps' => $completedSteps,
            'allowed_steps'   => $allowedSteps,
            'build_allowed'   => $app->isBuildAllowed(),
            'build_blockers'  => $app->getBuildBlockers(),
            'selected_theme'  => (function () use ($app) {
                $draft = $app->configs()->where('state', 'draft')->latest()->first();
                $themeKey = $draft?->config['selected_theme_key'] ?? $draft?->config['theme']['key'] ?? $app->assigned_theme_key ?? 'theme_a';
                $themeModel = \App\Models\Theme::where('key', $themeKey)->first();
                $price = (int) ($themeModel?->price ?? 0);

                return [
                    'key'             => $themeKey,
                    'name'            => $themeModel?->name ?? 'Modern Retail',
                    'price'           => $price,
                    'price_rupees'    => (int) round($price / 100),
                    'price_formatted' => $price > 0 ? ('₹' . number_format(round($price / 100))) : 'Free',
                    'is_free_theme'   => (bool) ($themeModel?->is_free_theme ?? ($themeKey === 'theme_a')),
                ];
            })(),
            'subscription'    => [
                'has_active'         => $hasActive,
                'plan_id'            => $activePlan?->id ?? null,
                'plan_name'          => $planName,
                'paid_amount'        => $paidAmountPaise,
                'paid_amount_rupees' => $paidAmountRupees,
                'can_download_apk'   => $canDownloadApk,
                'can_download_aab'   => $canDownloadAab,
                'can_download_ipa'   => $canDownloadIpa,
                'admin_panel_access' => $hasAdminPanel,
                'formats'            => $hasAdminPanel ? ['APK', 'AAB', 'IPA', 'Admin Panel'] : ($canDownloadAab ? ['APK', 'AAB', 'IPA'] : ['APK']),
            ],
        ]);
    }

    /**
     * Change or select store platform.
     *
     * Invariant: Changing platform invalidates all later steps and resets the connection.
     *
     * POST /api/apps/{ulid}/platform
     */
    public function setPlatform(Request $request, string $ulid): JsonResponse
    {
        $app = $this->resolveApp($request, $ulid);

        $validated = $request->validate([
            'platform' => ['required', 'string', 'in:woo,shopify'],
        ]);

        $newPlatform = Platform::from($validated['platform']);

        DB::transaction(function () use ($app, $newPlatform, $request) {
            $isPlatformChanged = $app->platform !== $newPlatform;

            if ($isPlatformChanged) {
                // Invalidate connection and subsequent step artifacts
                if ($app->connection) {
                    $app->connection->delete(); // delete connection credentials
                }

                // Invalidate unpublished draft configs
                $app->configs()->where('state', 'draft')->delete();

                // Roll back setup state to connect
                $app->update([
                    'platform'   => $newPlatform,
                    'setup_step' => SetupStep::Connect,
                ]);

                AuditLog::create([
                    'tenant_id'  => $app->tenant_id,
                    'actor_id'   => $request->user()?->id,
                    'action'     => 'app.platform_changed',
                    'target'     => "app:{$app->ulid}",
                    'ip'         => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'meta'       => ['new_platform' => $newPlatform->value],
                ]);
            } elseif ($app->setup_step === SetupStep::Platform) {
                $app->update([
                    'setup_step' => SetupStep::Connect,
                ]);
            }
        });

        $app->refresh();

        return response()->json([
            'message'      => 'Platform updated successfully.',
            'platform'     => $app->platform,
            'current_step' => $app->setup_step->value,
        ]);
    }

    /**
     * Roll back to an earlier wizard step.
     *
     * Invariant: Going back invalidates any dependent steps ahead of it.
     *
     * POST /api/apps/{ulid}/rollback
     */
    public function rollback(Request $request, string $ulid): JsonResponse
    {
        $app = $this->resolveApp($request, $ulid);

        $validated = $request->validate([
            'target_step' => ['required', 'string', 'in:platform,connect,theme,branding'],
        ]);

        $target = SetupStep::from($validated['target_step']);

        if ($target->order() >= $app->setup_step->order()) {
            return response()->json([
                'message'      => 'No rollback needed (target step is not behind current step).',
                'current_step' => $app->setup_step->value,
            ]);
        }

        DB::transaction(function () use ($app, $target, $request) {
            // If rolling back to platform or connect, invalidate connection status
            if ($target === SetupStep::Platform || $target === SetupStep::Connect) {
                if ($app->connection) {
                    $app->connection->update([
                        'status' => ConnectionStatus::NotStarted,
                    ]);
                }
            }

            // Invalidate draft config if rolling back before theme
            if ($target->order() < SetupStep::Theme->order()) {
                $app->configs()->where('state', 'draft')->delete();
            }

            $app->update([
                'setup_step' => $target,
            ]);

            AuditLog::create([
                'tenant_id'  => $app->tenant_id,
                'actor_id'   => $request->user()?->id,
                'action'     => 'app.setup_rollback',
                'target'     => "app:{$app->ulid}",
                'ip'         => $request->ip(),
                'user_agent' => $request->userAgent(),
                'meta'       => ['target_step' => $target->value],
            ]);
        });

        $app->refresh();

        return response()->json([
            'message'      => "Rolled back to step '{$target->value}'. Dependent steps have been invalidated.",
            'current_step' => $app->setup_step->value,
        ]);
    }

    /**
     * Advance setup wizard to the next or specified step as the user progresses.
     *
     * Invariant: Wizard steps are travelled strictly in forward sequence.
     * Users can revisit past completed steps without losing their furthest unlocked progress.
     *
     * POST /api/apps/{ulid}/advance-step
     */
    public function advanceStep(Request $request, string $ulid): JsonResponse
    {
        $app = $this->resolveApp($request, $ulid);

        $validated = $request->validate([
            'step' => ['required', 'string'],
        ]);

        $target = SetupStep::tryFrom($validated['step']);
        if (!$target) {
            return response()->json(['error' => 'Invalid step identifier.'], 422);
        }

        // Advance forward to the target step
        if ($target->order() > $app->setup_step->order()) {
            $app->update([
                'setup_step' => $target,
            ]);
        }

        $app->refresh();

        return $this->show($request, $ulid);
    }
}

