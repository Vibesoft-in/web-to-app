"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { StepPlatform } from "@/components/wizard/step-platform";
import { StepConnect } from "@/components/wizard/step-connect";
import { StepAnalysis } from "@/components/wizard/step-analysis";
import { StepDataCollection } from "@/components/wizard/step-data-collection";
import { StepTheme } from "@/components/wizard/step-theme";
import { StepBranding } from "@/components/wizard/step-branding";
import { StepPreview } from "@/components/wizard/step-preview";
import { StepIntegrations } from "@/components/wizard/step-integrations";
import { StepPayment } from "@/components/wizard/step-payment";
import { StepBuild } from "@/components/wizard/step-build";
import { ArrowLeft, Check, Loader2 } from "lucide-react";

const STEPS = [
  { key: "platform", label: "Platform" },
  { key: "connect", label: "Connect" },
  { key: "analysis", label: "Score" },
  { key: "data-collection", label: "Data Collection" },
  { key: "theme", label: "Theme" },
  { key: "branding", label: "Branding" },
  { key: "preview", label: "Preview" },
  { key: "integrations", label: "Integrations" },
  { key: "payment", label: "Plan" },
  { key: "build", label: "Build" },
];

export default function WizardStepPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const ulid = params.ulid as string;
  const currentStepParam = params.step as string;
  const [isAdvancing, setIsAdvancing] = useState(false);

  const { data: state, isLoading, isError, refetch } = useQuery({
    queryKey: ["setup-state", ulid],
    queryFn: () => apiClient(`/api/apps/${ulid}/setup-state`),
    refetchOnWindowFocus: false,
    retry: 1,
  });

  useEffect(() => {
    if (ulid) {
      queryClient.prefetchQuery({
        queryKey: ["website-data", ulid],
        queryFn: () => apiClient(`/api/apps/${ulid}/website-data`),
      });
    }
  }, [ulid, queryClient]);

  const { data: appsData } = useQuery({
    queryKey: ["apps"],
    queryFn: async () => {
      try {
        const res = await apiClient("/api/apps");
        return Array.isArray(res) ? res : res.apps || [];
      } catch {
        return [];
      }
    },
  });

  const apps = appsData || [];
  const hasPreviouslyBuiltApps = Boolean(
    apps.length > 0 &&
    apps.some((a: any) => {
      const bList = a.builds || [];
      return (
        a.is_completed ||
        a.status === "completed" ||
        a.status === "live" ||
        a.status === "active" ||
        a.setup_step === "build" ||
        bList.length > 0
      );
    })
  );

  // RECOVERY GUARD:
  // If the app ULID does not exist, was soft-deleted, or fails with error,
  // automatically redirect to user's valid active draft or apps/new
  useEffect(() => {
    if (!isLoading && (isError || !state)) {
      apiClient("/api/auth/me")
        .then((res) => {
          const user = res?.user;
          if (user?.latest_draft?.ulid && user.latest_draft.ulid !== ulid) {
            router.replace(`/dashboard/apps/${user.latest_draft.ulid}/setup/${user.latest_draft.setup_step || "platform"}`);
          } else if (user?.has_built_apps) {
            router.replace("/dashboard");
          } else {
            router.replace("/dashboard/apps/new");
          }
        })
        .catch(() => {
          router.replace("/dashboard/apps/new");
        });
    }
  }, [isLoading, isError, state, ulid, router]);

  // Fallback: If URL is at /features (legacy step), redirect to /theme
  useEffect(() => {
    if (currentStepParam === "features") {
      router.replace(`/dashboard/apps/${ulid}/setup/theme`);
    }
  }, [currentStepParam, ulid, router]);

  // URL STEP GUARD: Strict sequential workflow enforcement (Requirement 3)
  useEffect(() => {
    if (isAdvancing) return;
    if (state && state.allowed_steps && Array.isArray(state.allowed_steps) && state.allowed_steps.length > 0) {
      const isAllowed = state.allowed_steps.includes(currentStepParam);
      if (!isAllowed && state.current_step && state.current_step !== currentStepParam) {
        router.replace(`/dashboard/apps/${ulid}/setup/${state.current_step}`);
      }
    }
  }, [state, currentStepParam, ulid, router, isAdvancing]);

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="text-xs font-semibold text-slate-500">Loading wizard state...</span>
        </div>
      </div>
    );
  }

  if (isError || !state) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Project Not Found</h3>
            <p className="text-xs text-slate-500">
              This app draft is no longer available. Redirecting to your active project...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const navigateNext = () => {
    const currentIndex = STEPS.findIndex((s) => s.key === currentStepParam);
    if (currentIndex < STEPS.length - 1) {
      const nextStepKey = STEPS[currentIndex + 1].key;
      setIsAdvancing(true);

      // Optimistically unlock all steps up to nextStepKey
      const unlockedSteps = STEPS.slice(0, currentIndex + 2).map((s) => s.key);

      queryClient.setQueryData(["setup-state", ulid], (old: any) => {
        if (!old) return old;
        const oldAllowed = old.allowed_steps || [];
        const newAllowed = Array.from(new Set([...oldAllowed, ...unlockedSteps]));
        return {
          ...old,
          current_step: nextStepKey,
          allowed_steps: newAllowed,
        };
      });

      // 🚀 INSTANT NAVIGATION ON VERY FIRST CLICK
      router.push(`/dashboard/apps/${ulid}/setup/${nextStepKey}`);

      // Persist advance-step in background
      apiClient(`/api/apps/${ulid}/advance-step`, {
        method: "POST",
        body: JSON.stringify({ step: nextStepKey }),
      })
        .then((res) => {
          if (res && res.allowed_steps) {
            queryClient.setQueryData(["setup-state", ulid], (prev: any) => ({
              ...prev,
              ...res,
              allowed_steps: Array.from(new Set([...(prev?.allowed_steps || []), ...(res.allowed_steps || [])])),
            }));
          }
        })
        .catch((err) => {
          console.warn("Background step advance note:", err);
        })
        .finally(() => {
          queryClient.invalidateQueries({ queryKey: ["apps"] });
          setTimeout(() => {
            setIsAdvancing(false);
          }, 800);
        });
    }
  };

  const furthestStepKey = state?.current_step || "platform";
  const furthestStepIndex = Math.max(0, STEPS.findIndex((s) => s.key === furthestStepKey));
  const currentStepIndex = Math.max(0, STEPS.findIndex((s) => s.key === currentStepParam));
  const currentStep = STEPS[currentStepIndex] || STEPS[0];

  const handleStepClick = (stepKey: string) => {
    const targetIndex = STEPS.findIndex((s) => s.key === stepKey);
    // User can only view completed steps or the furthest reached step (travelled steps)
    const isAllowed =
      targetIndex >= 0 &&
      targetIndex <= furthestStepIndex &&
      (state?.allowed_steps ? state.allowed_steps.includes(stepKey) : targetIndex <= furthestStepIndex);

    if (isAllowed) {
      router.push(`/dashboard/apps/${ulid}/setup/${stepKey}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── TOP HEADER WITH BACK TO DASHBOARD BUTTON ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {hasPreviouslyBuiltApps ? (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-bold text-xs shadow-xs transition group w-fit"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:-translate-x-1 transition-transform" />
            <span>Exit to Dashboard</span>
          </Link>
        ) : (
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-bold text-xs shadow-xs transition group w-fit"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:-translate-x-1 transition-transform" />
            <span>Save &amp; Exit</span>
          </Link>
        )}

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Editing Step {currentStepIndex + 1} of {STEPS.length}:</span>
          <span className="font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 rounded-full">
            {currentStep.label}
          </span>
        </div>
      </div>

      {/* 10-Step Progress Stepper Header - Fully visible without scroll effect */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm">
        {/* Desktop & Laptops: Single continuous bar with all 11 steps visible */}
        <div className="hidden md:flex items-center justify-between w-full">
          {STEPS.map((s, index) => {
            const isCurrent = currentStepParam === s.key;
            // Travelled steps can be visited and viewed again
            const isTravelled =
              index <= furthestStepIndex &&
              (state?.allowed_steps ? state.allowed_steps.includes(s.key) : index <= furthestStepIndex);
            const isAllowed = isTravelled;
            // Completed steps show green checkmark
            const isCompleted = isTravelled && !isCurrent && index < Math.max(currentStepIndex, furthestStepIndex);

            return (
              <div key={s.key} className="flex items-center flex-1 last:flex-none">
                <button
                  type="button"
                  onClick={() => handleStepClick(s.key)}
                  disabled={!isAllowed}
                  title={!isAllowed ? "Complete previous steps first" : undefined}
                  className={`flex items-center gap-1.5 select-none transition group text-left ${
                    isAllowed ? "cursor-pointer" : "cursor-not-allowed opacity-35 pointer-events-none"
                  }`}
                >
                  <div
                    className={`w-6 h-6 lg:w-7 lg:h-7 rounded-full flex items-center justify-center text-[11px] lg:text-xs font-bold flex-shrink-0 transition ${
                      isCurrent
                        ? "bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-sm"
                        : isCompleted
                        ? "bg-emerald-500 text-white shadow-xs"
                        : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : index + 1}
                  </div>
                  <span
                    className={`text-[11px] lg:text-xs font-semibold whitespace-nowrap ${
                      isCurrent
                        ? "text-indigo-600 font-bold"
                        : isCompleted
                        ? "text-slate-800"
                        : "text-slate-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>

                {index < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1.5 transition-colors ${
                      index < currentStepIndex && index < furthestStepIndex
                        ? "bg-emerald-300"
                        : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile & Tablets: 2 neat rows of 5 steps - All 10 visible at once without scroll */}
        <div className="md:hidden">
          <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
            {STEPS.map((s, index) => {
              const isCurrent = currentStepParam === s.key;
              const isTravelled =
                index <= furthestStepIndex &&
                (state?.allowed_steps ? state.allowed_steps.includes(s.key) : index <= furthestStepIndex);
              const isAllowed = isTravelled;
              const isCompleted = isTravelled && !isCurrent && index < Math.max(currentStepIndex, furthestStepIndex);

              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => handleStepClick(s.key)}
                  disabled={!isAllowed}
                  title={!isAllowed ? "Complete previous steps first" : undefined}
                  className={`min-w-0 p-1 sm:p-1.5 rounded-xl flex flex-col items-center justify-center text-center transition ${
                    isCurrent
                      ? "bg-indigo-50 border border-indigo-300 ring-1 ring-indigo-500 shadow-sm"
                      : isCompleted
                      ? "bg-emerald-50/70 border border-emerald-200"
                      : "bg-slate-50 border border-slate-100"
                  } ${!isAllowed ? "cursor-not-allowed opacity-35 pointer-events-none" : "cursor-pointer"}`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mb-0.5 sm:mb-1 transition flex-shrink-0 ${
                      isCurrent
                        ? "bg-indigo-600 text-white"
                        : isCompleted
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : index + 1}
                  </div>
                  <span
                    className={`text-[9px] sm:text-[10px] leading-tight font-semibold truncate w-full block ${
                      isCurrent
                        ? "text-indigo-700 font-bold"
                        : isCompleted
                        ? "text-slate-800"
                        : "text-slate-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Step Indicator Banner for Mobile */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs px-1">
            <span className="text-slate-500 font-medium">
              Step {currentStepIndex + 1} of {STEPS.length}
            </span>
            <span className="font-bold text-indigo-600">
              {currentStep?.label}
            </span>
          </div>
        </div>
      </div>

      {/* Wizard Step Body */}
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-3.5 sm:p-10 shadow-sm">
        {currentStepParam === "platform" && (
          <StepPlatform ulid={ulid} app={state?.app} onNext={navigateNext} />
        )}
        {currentStepParam === "connect" && (
          <StepConnect ulid={ulid} app={state?.app} setupState={state} onNext={navigateNext} />
        )}
        {currentStepParam === "analysis" && (
          <StepAnalysis ulid={ulid} app={state?.app} setupState={state} onNext={navigateNext} />
        )}
        {currentStepParam === "data-collection" && (
          <StepDataCollection ulid={ulid} app={state?.app} setupState={state} onNext={navigateNext} />
        )}
        {currentStepParam === "theme" && (
          <StepTheme ulid={ulid} onNext={navigateNext} />
        )}
        {currentStepParam === "branding" && (
          <StepBranding ulid={ulid} app={state?.app} setupState={state} onNext={navigateNext} />
        )}
        {currentStepParam === "preview" && (
          <StepPreview ulid={ulid} onNext={navigateNext} />
        )}
        {currentStepParam === "integrations" && (
          <StepIntegrations onNext={navigateNext} />
        )}
        {currentStepParam === "payment" && (
          <StepPayment ulid={ulid} setupState={state} onNext={navigateNext} />
        )}
        {currentStepParam === "build" && (
          <StepBuild ulid={ulid} setupState={state} />
        )}
      </div>
    </div>
  );
}
