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

        // Clamp current_step if prerequisites are invalidated
        $currentStep = $app->setup_step;
        if (! $isConnectionVerified && $currentStep->order() > SetupStep::Connect->order()) {
            $currentStep = SetupStep::Connect;
            $app->update(['setup_step' => SetupStep::Connect]);
        } elseif (! $hasDataConsent && $currentStep->order() > SetupStep::DataCollection->order()) {
            $currentStep = SetupStep::DataCollection;
            $app->update(['setup_step' => SetupStep::DataCollection]);
        }

        $allSteps = SetupStep::cases();
        $completedSteps = [];
        $allowedSteps = [SetupStep::Platform->value, SetupStep::Connect->value];

        if ($isConnectionVerified) {
            $allowedSteps[] = SetupStep::Analysis->value;
            $allowedSteps[] = SetupStep::DataCollection->value;
        }

        if ($isConnectionVerified && $hasDataConsent) {
            $allowedSteps[] = SetupStep::Theme->value;
            $allowedSteps[] = SetupStep::Branding->value;
            $allowedSteps[] = SetupStep::Preview->value;
            $allowedSteps[] = SetupStep::Integrations->value;
            $allowedSteps[] = SetupStep::Payment->value;
        }

        if ($isConnectionVerified && $hasDataConsent && ($hasActive || $hasPaymentConsent)) {
            $allowedSteps[] = SetupStep::Build->value;
        }

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

        $canDownloadApk = true;
        $canDownloadAab = true;
        $canDownloadIpa = $app->canDownloadIpa();
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

        // STEP LOCK VALIDATION
        // 1. Advancing past Connect requires verified store connection
        if ($target->order() > SetupStep::Connect->order()) {
            $isVerified = ($app->connection && $app->connection->status === ConnectionStatus::Verified);
            if (! $isVerified) {
                return response()->json([
                    'error' => [
                        'code'    => 'STEP_LOCKED',
                        'message' => 'Store connection must be successfully verified before proceeding to diagnostics and subsequent steps.',
                    ],
                ], 422);
            }
        }

        // 2. Advancing past Data Collection requires mandatory data collection consent
        if ($target->order() > SetupStep::DataCollection->order()) {
            $hasDataConsent = UserConsent::where('app_id', $app->id)
                ->where('consent_type', 'data_collection')
                ->exists();

            if (! $hasDataConsent) {
                return response()->json([
                    'error' => [
                        'code'    => 'CONSENT_REQUIRED',
                        'message' => 'Mandatory Data Collection consent must be accepted before continuing to theme selection.',
                    ],
                ], 422);
            }
        }

        // 3. Advancing to Build step requires active plan or payment terms consent
        if ($target === SetupStep::Build) {
            $hasPaymentConsent = UserConsent::where('app_id', $app->id)
                ->where('consent_type', 'payment_terms')
                ->exists();
            $hasActivePlan = ($app->getActivePlan() !== null);

            if (! $hasPaymentConsent && ! $hasActivePlan) {
                return response()->json([
                    'error' => [
                        'code'    => 'PAYMENT_CONSENT_REQUIRED',
                        'message' => 'Payment terms and conditions must be accepted before compiling the application build.',
                    ],
                ], 422);
            }
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
