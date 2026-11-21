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

        // Strict Check: Has this application actually completed payment for a package/subscription?
        $hasPaid = $hasActive
            || $app->hasActiveSubscription()
            || $app->orders()->where('status', 'paid')->exists();

        if (! $hasPaid) {
            // Strict Step Validation: If connection is unverified, roll back any premature step progression
            if ($app->setup_step->order() > SetupStep::Connect->order() && ! $isConnectionVerified) {
                $app->update([
                    'setup_step' => SetupStep::Connect,
                    'status'     => \App\Enums\AppStatus::Draft,
                ]);
            }

            // Strict Step Validation: If data collection consent missing and past data collection, roll back
            if ($app->setup_step->order() > SetupStep::DataCollection->order() && ! $hasDataConsent) {
                $app->update([
                    'setup_step' => SetupStep::DataCollection,
                    'status'     => \App\Enums\AppStatus::Draft,
                ]);
            }
        } else {
            // Ensure connection and consents stay valid for paid apps
            if ($app->connection && $app->connection->status !== ConnectionStatus::Verified) {
                $app->connection->update(['status' => ConnectionStatus::Verified]);
                $isConnectionVerified = true;
            }
            if (! $hasDataConsent) {
                UserConsent::firstOrCreate(
                    ['app_id' => $app->id, 'consent_type' => 'data_collection'],
                    ['tenant_id' => $app->tenant_id, 'agreed' => true, 'agreed_at' => now()]
                );
                $hasDataConsent = true;
            }
            if (! $hasPaymentConsent) {
                UserConsent::firstOrCreate(
                    ['app_id' => $app->id, 'consent_type' => 'payment_terms'],
                    ['tenant_id' => $app->tenant_id, 'agreed' => true, 'agreed_at' => now()]
                );
                $hasPaymentConsent = true;
            }
        }

        $currentStep = $app->setup_step;
        $allSteps = SetupStep::cases();
        $completedSteps = [];
        
        // Strict Sequential Allowed Steps calculation (Requirement 1 & 2)
        if ($hasPaid) {
            // All 10 steps are unlocked for paid apps (Requirement: never block navigation)
            $allowedSteps = array_map(fn (SetupStep $s) => $s->value, $allSteps);
        } else {
            // 1. Platform is always allowed.
            $allowedSteps = [SetupStep::Platform->value];

            // 2. Connect is unlocked once app has a name/platform
            if (!empty($app->name)) {
                $allowedSteps[] = SetupStep::Connect->value;
            }

            // 3. Analysis & Data Collection are unlocked ONLY if store connection is verified
            if ($isConnectionVerified) {
                $allowedSteps[] = SetupStep::Analysis->value;
                $allowedSteps[] = SetupStep::DataCollection->value;

                // 4. Subsequent steps are unlocked ONLY if data collection consent has been explicitly granted
                if ($hasDataConsent) {
                    $allowedSteps[] = SetupStep::Theme->value;
                    $allowedSteps[] = SetupStep::Branding->value;
                    $allowedSteps[] = SetupStep::Preview->value;
                    $allowedSteps[] = SetupStep::Integrations->value;
                    $allowedSteps[] = SetupStep::Payment->value;

                    // 5. Build unlocked ONLY if active plan exists
                    if ($hasActive || $currentStep === SetupStep::Build) {
                        $allowedSteps[] = SetupStep::Build->value;
                    }
                }
            }
        }

        $allowedSteps = array_values(array_unique($allowedSteps));

        $hasReadyBuild = $app->builds()->where('status', \App\Enums\BuildStatus::Ready)->exists();

        foreach ($allSteps as $step) {
            if (! in_array($step->value, $allowedSteps, true)) {
                continue;
            }

            if ($step === SetupStep::Build) {
                // Step 10 (Build) is ONLY marked completed when there is an actual ready build! (Requirement 7)
                if ($hasReadyBuild) {
                    $completedSteps[] = SetupStep::Build->value;
                }
            } elseif ($step->order() < $currentStep->order()) {
                // Preceding step in sequence: must only be marked completed if strictly prior to current progress
                if ($step === SetupStep::Platform) {
                    if (! empty($app->name) && ! empty($app->platform)) {
                        $completedSteps[] = $step->value;
                    }
                } elseif ($step === SetupStep::Connect) {
                    if ($isConnectionVerified) {
                        $completedSteps[] = $step->value;
                    }
                } elseif ($step === SetupStep::Analysis) {
                    if ($isConnectionVerified) {
                        $completedSteps[] = $step->value;
                    }
                } elseif ($step === SetupStep::DataCollection) {
                    if ($hasDataConsent) {
                        $completedSteps[] = $step->value;
                    }
                } elseif ($step === SetupStep::Payment) {
                    if ($hasPaid) {
                        $completedSteps[] = $step->value;
                    }
                } else {
                    $completedSteps[] = $step->value;
                }
            }
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

        $draft = $app->configs()->where('state', 'draft')->latest()->first();
        $themeKey = $draft?->config['selected_theme_key'] ?? $draft?->config['theme']['key'] ?? $app->assigned_theme_key ?? 'theme_a';
        $themeModel = \App\Models\Theme::where('key', $themeKey)->first();
        $price = (int) ($themeModel?->price ?? 0);

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
            'shared_data' => [
                'app_name'         => $app->name,
                'store_name'       => $app->name,
                'website_url'      => $siteUrl,
                'site_url'         => $siteUrl,
                'platform'         => $app->platform?->value ?? (string) $app->platform,
                'package_name'     => $app->package_name,
                'is_verified'      => $isConnectionVerified,
                'logo_url'         => $draft?->config['app']['logo_url'] ?? $cachedWebsiteData['brand']['logo_url'] ?? null,
                'colors'           => $draft?->config['theme']['colors'] ?? $cachedWebsiteData['brand']['colors'] ?? [
                    'primary'    => '#E91E63',
                    'secondary'  => '#222222',
                    'accent'     => '#F59E0B',
                    'background' => '#FFFFFF',
                ],
                'fonts'            => [
                    'heading' => $draft?->config['theme']['font'] ?? $cachedWebsiteData['brand']['font_heading'] ?? 'Poppins',
                    'body'    => $cachedWebsiteData['brand']['font_body'] ?? 'Inter',
                ],
                'selected_theme'   => $themeKey,
                'has_data_consent' => $hasDataConsent,
                'has_active_plan'  => $hasActive,
                'plan_name'        => $planName,
            ],
            'draft_config'    => $draft?->config ?? [],
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
            'selected_theme'  => [
                'key'             => $themeKey,
                'name'            => $themeModel?->name ?? 'Modern Retail',
                'price'           => $price,
                'price_rupees'    => (int) round($price / 100),
                'price_formatted' => $price > 0 ? ('₹' . number_format(round($price / 100))) : 'Free',
                'is_free_theme'   => (bool) ($themeModel?->is_free_theme ?? ($themeKey === 'theme_a')),
            ],
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
            'platform'    => ['required', 'string', 'in:woo,shopify,wordpress,wp'],
            'name'        => ['nullable', 'string', 'min:2', 'max:50'],
            'website_url' => ['nullable', 'string', 'max:255'],
            'site_url'    => ['nullable', 'string', 'max:255'],
        ]);

        $platStr = ($validated['platform'] === 'wp') ? 'wordpress' : $validated['platform'];
        $newPlatform = Platform::from($platStr);

        DB::transaction(function () use ($app, $newPlatform, $validated, $request) {
            $isPlatformChanged = $app->platform !== $newPlatform;

            // Update App Name if provided
            if (!empty($validated['name'])) {
                $app->update(['name' => trim($validated['name'])]);
            }

            // Update or create Connection URL if provided
            $rawUrl = $validated['website_url'] ?? $validated['site_url'] ?? null;
            $isUrlChanged = false;
            if (!empty($rawUrl)) {
                $cleanUrl = trim((string) $rawUrl);
                if (!str_starts_with($cleanUrl, 'http://') && !str_starts_with($cleanUrl, 'https://')) {
                    $cleanUrl = 'https://' . $cleanUrl;
                }
                if ($app->connection) {
                    if ($app->connection->site_url !== $cleanUrl) {
                        $isUrlChanged = true;
                        $app->connection->update([
                            'site_url' => $cleanUrl,
                            'status'   => \App\Enums\ConnectionStatus::NotStarted, // Invalidate previous verification!
                        ]);
                    }
                } else {
                    \App\Models\Connection::create([
                        'tenant_id'   => $app->tenant_id,
                        'app_id'      => $app->id,
                        'platform'    => $newPlatform,
                        'site_url'    => $cleanUrl,
                        'credentials' => [],
                        'status'      => \App\Enums\ConnectionStatus::NotStarted,
                    ]);
                }
                $app->update(['website_url' => $cleanUrl]);
            }

            if ($isPlatformChanged || $isUrlChanged) {
                // Invalidate connection credentials and subsequent step artifacts if platform changed
                if ($app->connection && $isPlatformChanged) {
                    $app->connection->update(['credentials' => [], 'status' => \App\Enums\ConnectionStatus::NotStarted]);
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
                    'meta'       => [
                        'new_platform' => $newPlatform->value,
                        'url_changed'  => $isUrlChanged,
                    ],
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
            'name'         => $app->name,
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

        // STEP ADVANCE PREREQUISITE STRICT VALIDATION (Requirement 3)
        // 1. Advancing past Connect: strictly require verified connection
        if ($target->order() > SetupStep::Connect->order()) {
            if (! $app->connection || $app->connection->status !== ConnectionStatus::Verified) {
                return response()->json([
                    'error' => 'Store connection must be successfully verified before proceeding to subsequent steps.',
                    'code'  => 'CONNECTION_REQUIRED',
                ], 422);
            }
        }

        // 2. Advancing past Data Collection: strictly require explicit user consent
        if ($target->order() > SetupStep::DataCollection->order()) {
            $hasDataConsent = UserConsent::where('app_id', $app->id)
                ->where('consent_type', 'data_collection')
                ->where('agreed', true)
                ->exists();

            if (! $hasDataConsent) {
                return response()->json([
                    'error' => 'You must explicitly check and agree to the Data Collection and Privacy Policy before proceeding.',
                    'code'  => 'CONSENT_REQUIRED',
                ], 422);
            }
        }

        // 3. Advancing to Build: require active plan or completed payment
        $hasPaid = $app->getActivePlan() !== null
            || $app->hasActiveSubscription()
            || $app->orders()->where('status', 'paid')->exists();

        if ($target === SetupStep::Build) {
            if (! $hasPaid) {
                return response()->json([
                    'error' => 'An active subscription plan or package selection is required before building your application.',
                    'code'  => 'PLAN_REQUIRED',
                ], 422);
            }
        }

        // Prevent skipping ahead more than 1 step without sequential progression (unless already paid)
        if (! $hasPaid && $target->order() > $app->setup_step->order() + 1) {
            return response()->json([
                'error' => 'Sequential step progression is required. You cannot skip incomplete steps.',
                'code'  => 'STEP_SKIPPING_NOT_ALLOWED',
            ], 422);
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
