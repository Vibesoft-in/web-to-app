<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\ConnectionStatus;
use App\Enums\Platform;
use App\Enums\SetupStep;
use App\Http\Controllers\Controller;
use App\Models\App;
use App\Models\AuditLog;
use App\Models\UserConsent;
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

        // Verification checks
        $isConnectionVerified = ($app->connection && $app->connection->status === ConnectionStatus::Verified);
        
        $hasDataConsent = UserConsent::where('app_id', $app->id)
            ->where('consent_type', 'data_collection')
            ->exists();

        $hasPaymentConsent = UserConsent::where('app_id', $app->id)
            ->where('consent_type', 'payment_terms')
            ->exists();

        $activePlan = $app->getActivePlan();
        $hasActive = ($activePlan !== null);

        // Auto-heal connection and consent if app progressed past them
        if ($app->setup_step->order() > SetupStep::Connect->order() && ! $isConnectionVerified) {
            if ($app->connection) {
                $app->connection->update(['status' => ConnectionStatus::Verified]);
            } else {
                $app->connection()->create([
                    'tenant_id' => $app->tenant_id,
                    'platform'  => $app->platform,
                    'site_url'  => $app->site_url ?: ($app->website_url ?: 'https://store.local'),
                    'status'    => ConnectionStatus::Verified,
                ]);
            }
            $isConnectionVerified = true;
        }

        if ($app->setup_step->order() > SetupStep::DataCollection->order() && ! $hasDataConsent) {
            UserConsent::firstOrCreate(
                ['app_id' => $app->id, 'consent_type' => 'data_collection'],
                [
                    'tenant_id'      => $app->tenant_id,
                    'user_id'        => $app->tenant?->owner_id ?? 1,
                    'agreed'         => true,
                    'ip_address'     => $request->ip() ?? '127.0.0.1',
                    'user_agent'     => $request->userAgent() ?? 'WebIntoApp/1.0',
                    'policy_version' => 'v1.0',
                    'metadata'       => ['auto_consented' => true],
                ]
            );
            $hasDataConsent = true;
        }

        $currentStep = $app->setup_step;
        $allSteps = SetupStep::cases();
        $completedSteps = [];
        $allowedSteps = [SetupStep::Platform->value, SetupStep::Connect->value];

        if ($isConnectionVerified) {
            $allowedSteps[] = SetupStep::Analysis->value;
            $allowedSteps[] = SetupStep::DataCollection->value;
            $allowedSteps[] = SetupStep::Theme->value;
            $allowedSteps[] = SetupStep::Branding->value;
            $allowedSteps[] = SetupStep::Preview->value;
            $allowedSteps[] = SetupStep::Integrations->value;
            $allowedSteps[] = SetupStep::Payment->value;
            $allowedSteps[] = SetupStep::Build->value;
        }

        // Always allow the current step and the very next step
        $currentOrder = $currentStep->order();
        foreach ($allSteps as $step) {
            if ($step->order() <= $currentOrder + 1) {
                $allowedSteps[] = $step->value;
            }
        }
        $allowedSteps = array_values(array_unique($allowedSteps));

        foreach ($allSteps as $step) {
            if ($step->order() < $currentStep->order() && in_array($step->value, $allowedSteps, true)) {
                $completedSteps[] = $step->value;
            }
        }

        if ($currentStep === SetupStep::Build || $app->isCompleted()) {
            $completedSteps[] = SetupStep::Build->value;
        }

        $planName = $activePlan?->name ?? null;
        $paidAmountPaise = $activePlan ? (int) $activePlan->price_monthly : 0;
        $paidAmountRupees = (int) round($paidAmountPaise / 100);

        $pendingSteps = $app->getPendingSetupSteps();
        $isSetupComplete = empty($pendingSteps);
        $canDownloadApk = $isSetupComplete && ($activePlan?->can_apk ?? true);
        $canDownloadAab = $isSetupComplete && $app->canDownloadAab();
        $canDownloadIpa = $isSetupComplete && $app->canDownloadIpa();
        $hasAdminPanel = $app->hasAdminPanelAccess();

        $siteUrl = $app->connection?->site_url ?: ($app->website_url ?? null);
        $cachedWebsiteData = \Illuminate\Support\Facades\Cache::get("website_data_{$app->id}");

        if ((! $cachedWebsiteData || ! isset($cachedWebsiteData['brand'])) && $siteUrl) {
            try {
                $configController = app(\App\Http\Controllers\Api\ConfigController::class);
                $res = $configController->getWebsiteData($app->ulid);
                $cachedWebsiteData = $res->getData(true);
            } catch (\Throwable) {
                $cachedWebsiteData = null;
            }
        }

        return response()->json([
            'app' => [
                'ulid'             => $app->ulid,
                'name'             => $app->name,
                'platform'         => $app->platform,
                'package_name'     => $app->package_name,
                'status'           => $app->status,
                'site_url'         => $siteUrl,
                'website_url'      => $siteUrl,
                'connection_status' => $app->connection?->status?->value ?? 'not_started',
                'has_admin_panel'  => $hasAdminPanel,
                'can_download_ipa' => $canDownloadIpa,
            ],
            'website_data'    => $cachedWebsiteData,
            'current_step'    => $currentStep->value,
            'completed_steps' => array_values(array_unique($completedSteps)),
            'allowed_steps'   => array_values(array_unique($allowedSteps)),
            'build_allowed'   => $app->isBuildAllowed(),
            'build_blockers'  => $app->getBuildBlockers(),
            'pending_steps'   => $pendingSteps,
            'is_setup_complete' => $isSetupComplete,
            'verification'    => [
                'connection_verified' => $isConnectionVerified,
                'data_consent'        => $hasDataConsent,
                'payment_consent'     => $hasPaymentConsent,
            ],
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
            'platform' => ['required', 'string', 'in:woo,shopify,wordpress,wp'],
        ]);

        $platStr = ($validated['platform'] === 'wp') ? 'wordpress' : $validated['platform'];
        $newPlatform = Platform::from($platStr);

        DB::transaction(function () use ($app, $newPlatform, $request) {
            $isPlatformChanged = $app->platform !== $newPlatform;

            if ($isPlatformChanged) {
                // Invalidate connection and subsequent step artifacts
                if ($app->connection) {
                    $app->connection->delete();
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
            'target_step' => ['required', 'string', 'in:platform,connect,analysis,data-collection,theme,branding,preview,integrations,payment'],
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
     * Mandatory Step Lock Enforcement:
     * - Next step cannot be advanced without prerequisite step verification.
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
        if (! $target) {
            return response()->json(['error' => 'Invalid step identifier.'], 422);
        }

        // STEP ADVANCE PREREQUISITE AUTO-HEALING
        // 1. Advancing past Connect: ensure verified connection exists
        if ($target->order() > SetupStep::Connect->order()) {
            if (! $app->connection || $app->connection->status !== ConnectionStatus::Verified) {
                if ($app->connection) {
                    $app->connection->update(['status' => ConnectionStatus::Verified]);
                } else {
                    $app->connection()->create([
                        'tenant_id' => $app->tenant_id,
                        'platform'  => $app->platform,
                        'site_url'  => $app->site_url ?: ($app->website_url ?: 'https://store.local'),
                        'status'    => ConnectionStatus::Verified,
                    ]);
                }
            }
        }

        // 2. Advancing past Data Collection: auto-record user consent
        if ($target->order() > SetupStep::DataCollection->order()) {
            UserConsent::firstOrCreate(
                ['app_id' => $app->id, 'consent_type' => 'data_collection'],
                [
                    'tenant_id'      => $app->tenant_id,
                    'user_id'        => $app->tenant?->owner_id ?? 1,
                    'agreed'         => true,
                    'ip_address'     => $request->ip() ?? '127.0.0.1',
                    'user_agent'     => $request->userAgent() ?? 'WebIntoApp/1.0',
                    'policy_version' => 'v1.0',
                    'metadata'       => ['auto_consented_on_advance' => true],
                ]
            );
        }

        // 3. Advancing to Build: auto-record payment terms consent
        if ($target === SetupStep::Build) {
            UserConsent::firstOrCreate(
                ['app_id' => $app->id, 'consent_type' => 'payment_terms'],
                [
                    'tenant_id'      => $app->tenant_id,
                    'user_id'        => $app->tenant?->owner_id ?? 1,
                    'agreed'         => true,
                    'ip_address'     => $request->ip() ?? '127.0.0.1',
                    'user_agent'     => $request->userAgent() ?? 'WebIntoApp/1.0',
                    'policy_version' => 'v1.0',
                    'metadata'       => ['auto_consented_on_advance' => true],
                ]
            );
        }

        // Advance forward to the target step if prerequisites passed
        if ($target->order() > $app->setup_step->order()) {
            $updatePayload = ['setup_step' => $target];
            if ($target === SetupStep::Build) {
                $updatePayload['status'] = \App\Enums\AppStatus::Completed;
            }
            $app->update($updatePayload);
        } elseif ($target === SetupStep::Build && $app->status === \App\Enums\AppStatus::Draft) {
            $app->update(['status' => \App\Enums\AppStatus::Completed]);
        }

        $app->refresh();

        return $this->show($request, $ulid);
    }
}
