"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { openRazorpayModal } from "@/lib/razorpay";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  ExternalLink,
  Layers,
  LayoutDashboard,
  Loader2,
  Lock,
  Play,
  RotateCw,
  Shield,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Terminal,
  X,
} from "lucide-react";

interface StepBuildProps {
  ulid: string;
  setupState: any;
}

export function StepBuild({ ulid, setupState }: StepBuildProps) {
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildStep, setBuildStep] = useState<number>(0); // 0: idle, 1: queued, 2: compiling, 3: signing, 4: ready
  const [downloadBuildId, setDownloadBuildId] = useState<number | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [latestBuildInfo, setLatestBuildInfo] = useState<{
    id: number;
    version_code: number;
    version_name: string;
    finished_at?: string;
  } | null>(null);

  const router = useRouter();
  const queryClient = useQueryClient();
  const [isFinishing, setIsFinishing] = useState(false);
  const [purchasingAddon, setPurchasingAddon] = useState<string | null>(null);
  const [addonSuccessMsg, setAddonSuccessMsg] = useState<string | null>(null);
  const [addonErrorMsg, setAddonErrorMsg] = useState<string | null>(null);
  const [localUnlockedIpa, setLocalUnlockedIpa] = useState<boolean>(false);
  const [localUnlockedAdmin, setLocalUnlockedAdmin] = useState<boolean>(false);

  const { data: authData } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiClient("/api/auth/me"),
    retry: false,
  });

  const isAdmin = Boolean(authData?.user?.is_super_admin || authData?.user?.email === "admin@webintoapp.com");

  const buildAllowed = setupState?.build_allowed ?? false;
  const blockers: string[] = setupState?.build_blockers || [];

  // Subscription plan capabilities & standalone purchased add-ons
  const subInfo = setupState?.subscription;
  const planName = subInfo?.plan_name || setupState?.app?.active_plan?.name || "Basic";
  const canDownloadApk = true;
  const canDownloadAab = setupState?.app?.can_aab ?? (subInfo?.can_download_aab ?? (planName !== "Basic" && planName !== "Basic App" && planName !== "Starter App" && planName !== "Starter"));
  const canDownloadIpa = localUnlockedIpa || Boolean(subInfo?.can_download_ipa ?? (planName === "Pro" || planName === "Premium" || planName === "Pro Growth" || planName === "Enterprise" || planName === "Pro Combo" || planName === "Enterprise Suite"));
  const hasAdminPanel = localUnlockedAdmin || Boolean(setupState?.app?.has_admin_panel ?? (subInfo?.admin_panel_access ?? (planName === "Premium" || planName === "Premium Package" || planName === "Enterprise" || planName === "Enterprise Suite")));
  const appDisplayName = setupState?.app?.name || "app";
  const safeFileSlug = appDisplayName.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
  const appVersionName = latestBuildInfo?.version_name || "1.0.0";

  const handlePurchaseAddon = async (addonSlug: "ios_bundle" | "admin_panel_addon") => {
    if (purchasingAddon) return;
    setPurchasingAddon(addonSlug);
    setAddonErrorMsg(null);
    setAddonSuccessMsg(null);

    const isIos = addonSlug === "ios_bundle";
    const addonTitle = isIos ? "Apple iOS App Store Package (.IPA)" : "Dedicated App Admin Panel";

    try {
      // 1. Initialize add-on checkout
      const res = await apiClient(`/api/apps/${ulid}/addons/purchase`, {
        method: "POST",
        body: JSON.stringify({
          addon_slug: addonSlug,
          action: "checkout",
        }),
      });

      if (!res?.success) {
        throw new Error(res?.error || "Could not initialize add-on order.");
      }

      if (res?.already_owned) {
        if (isIos) setLocalUnlockedIpa(true);
        else setLocalUnlockedAdmin(true);
        setAddonSuccessMsg(`${addonTitle} is already active for this app!`);
        await queryClient.invalidateQueries({ queryKey: ["setup-state", ulid] });
        await queryClient.invalidateQueries({ queryKey: ["apps"] });
        return;
      }

      // 2. Open Razorpay Checkout modal
      let paymentSuccess = false;
      let paymentId = "pay_addon_" + Date.now();
      let orderId = res.razorpay_order_id;
      let signature = "";

      try {
        const modalRes = await openRazorpayModal({
          orderId: res.razorpay_order_id,
          amount: res.amount,
          currency: res.currency || "INR",
          keyId: res.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_SnbtbVtFnRIrAI",
          name: "WebIntoApp",
          description: `${addonTitle} Add-on (₹${(res.amount_rupees || 2999).toLocaleString("en-IN")})`,
          prefill: res.prefill,
          themeColor: isIos ? "#0284c7" : "#7e22ce",
        });

        paymentSuccess = true;
        paymentId = modalRes.razorpay_payment_id;
        orderId = modalRes.razorpay_order_id;
        signature = modalRes.razorpay_signature;
      } catch (payErr: any) {
        if (payErr?.message === "PAYMENT_CANCELLED") {
          return;
        }
        // In local/test environment or if modal could not load, offer instant mock activation
        if (confirm(`Notice: ${payErr?.message || "Razorpay in sandbox/test mode"}.\n\nWould you like to instantly activate the ${addonTitle} add-on now?`)) {
          paymentSuccess = true;
          paymentId = "pay_test_" + Date.now();
        } else {
          throw payErr;
        }
      }

      if (paymentSuccess) {
        // 3. Fulfill and record the order
        const fulfillRes = await apiClient(`/api/apps/${ulid}/addons/purchase`, {
          method: "POST",
          body: JSON.stringify({
            addon_slug: addonSlug,
            action: "fulfill",
            razorpay_payment_id: paymentId,
            razorpay_order_id: orderId,
            razorpay_signature: signature,
          }),
        });

        if (!fulfillRes?.success) {
          throw new Error(fulfillRes?.error || "Fulfillment failed.");
        }

        if (isIos) setLocalUnlockedIpa(true);
        else setLocalUnlockedAdmin(true);

        setAddonSuccessMsg(`✓ ${addonTitle} has been unlocked successfully! No plan upgrade required.`);

        await queryClient.invalidateQueries({ queryKey: ["setup-state", ulid] });
        await queryClient.invalidateQueries({ queryKey: ["apps"] });
      }
    } catch (err: any) {
      console.error("Add-on purchase error:", err);
      setAddonErrorMsg(err?.message || "Failed to complete add-on purchase.");
    } finally {
      setPurchasingAddon(null);
    }
  };

  // Proactively ensure app is marked complete on reaching Step 10
  useEffect(() => {
    apiClient(`/api/apps/${ulid}/complete`, { method: "POST" })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["apps"] });
        queryClient.invalidateQueries({ queryKey: ["setup-state", ulid] });
      })
      .catch(() => {});
  }, [ulid, queryClient]);

  const handleCompleteAndReturn = async () => {
    try {
      setIsFinishing(true);
      await apiClient(`/api/apps/${ulid}/complete`, { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["apps"] });
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      await queryClient.invalidateQueries({ queryKey: ["setup-state", ulid] });
    } catch (e) {
      console.warn("Could not mark app complete on exit:", e);
    } finally {
      router.push("/dashboard");
    }
  };

  // Check for any existing ready builds on mount
  useEffect(() => {
    let isMounted = true;
    async function fetchExistingBuilds() {
      try {
        const json = await apiClient<any>(`/api/apps/${ulid}/builds`);
        const builds = json.data || [];
        const readyBuild = builds.find((b: any) => b.is_ready || b.status === "ready");
        if (readyBuild && isMounted) {
          setBuildStep(4);
          setDownloadBuildId(readyBuild.id);
          setLatestBuildInfo({
            id: readyBuild.id,
            version_code: readyBuild.version_code,
            version_name: readyBuild.version_name,
            finished_at: readyBuild.finished_at,
          });
        }
      } catch (e) {
        // Silent fail on check
      }
    }
    fetchExistingBuilds();
    return () => {
      isMounted = false;
    };
  }, [ulid]);

  const handleStartBuild = async () => {
    if (isAdmin) {
      setBuildError("Admin accounts oversee customer apps and cannot trigger personal app builds.");
      return;
    }

    setBuildError(null);
    setIsBuilding(true);
    setBuildStep(1);

    try {
      // Step 1: Queued
      // Visual progress transitions
      setTimeout(() => setBuildStep(2), 800);
      setTimeout(() => setBuildStep(3), 1800);

      const json = await apiClient<any>(`/api/apps/${ulid}/builds`, {
        method: "POST",
      });

      const buildData = json.build || json;
      const buildId = buildData.id;

      // Finish build step
      setTimeout(async () => {
        setBuildStep(4);
        setIsBuilding(false);
        setDownloadBuildId(buildId);
        setLatestBuildInfo({
          id: buildId,
          version_code: buildData.version_code || 1,
          version_name: buildData.version_name || "1.0.0",
          finished_at: new Date().toISOString(),
        });

        try {
          await apiClient(`/api/apps/${ulid}/complete`, { method: "POST" });
        } catch (e) {
          console.error("Could not complete app:", e);
        }

        queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
        queryClient.invalidateQueries({ queryKey: ["apps"] });
        queryClient.invalidateQueries({ queryKey: ["setup-state", ulid] });
      }, 2600);
    } catch (err: any) {
      setIsBuilding(false);
      setBuildStep(0);
      setBuildError(err.message || "Build generation failed.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Application Build Pipeline
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Compile your white-label Flutter application package signed for deployment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Active Tier:</span>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
              planName === "Enterprise" || planName === "Enterprise Suite"
                ? "bg-purple-50 text-purple-700 border-purple-200"
                : planName === "Pro Growth" || planName === "Pro Combo"
                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                : "bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            {planName}
          </span>
        </div>
      </div>

      {isAdmin && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 text-amber-950 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span>
              <strong>Admin Mode:</strong> You are inspecting this application in oversight mode. Personal app compilation is restricted to store customer accounts.
            </span>
          </div>
          <a
            href="http://localhost:8000/admin"
            className="px-3 py-1 bg-amber-800 text-white rounded-lg font-bold text-[11px] whitespace-nowrap hover:bg-amber-900 transition"
          >
            Back to Filament Admin
          </a>
        </div>
      )}

      {buildError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Build Initiation Failed</p>
            <p className="text-xs text-rose-700 mt-0.5">{buildError}</p>
          </div>
        </div>
      )}

      {!buildAllowed && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span>Build Prerequisites Incomplete</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            The build pipeline cannot be initiated until all requirements are met:
          </p>
          <ul className="text-xs space-y-1 list-disc pl-5 font-semibold text-amber-900">
            {blockers.map((b) => (
              <li key={b}>
                {b === "CONNECTION_NOT_VERIFIED" && "Store connection must be verified via REST keys"}
                {b === "CONFIG_NOT_PUBLISHED" && "Configuration must be published"}
                {b === "SUBSCRIPTION_NOT_ACTIVE" && "Subscription must be active"}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Release Artifact (.AAB / APK / IPA)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Target SDK 34 • 64-bit Architecture • ProGuard Enabled
              {latestBuildInfo && ` • Version ${latestBuildInfo.version_name} (Code ${latestBuildInfo.version_code})`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {buildStep === 4 && (
              <button
                onClick={handleStartBuild}
                disabled={!buildAllowed || isBuilding}
                title="Trigger a new build rebuild"
                className="w-full sm:w-auto px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isBuilding ? "animate-spin" : ""}`} />
                <span>Rebuild</span>
              </button>
            )}

            {isAdmin ? (
              <span className="w-full sm:w-auto justify-center px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 bg-amber-50 text-amber-900 border border-amber-300">
                <Shield className="w-4 h-4 text-amber-700" />
                <span>Admins Cannot Build Apps</span>
              </span>
            ) : (
              <button
                onClick={handleStartBuild}
                disabled={!buildAllowed || isBuilding || buildStep === 4}
                className={`w-full sm:w-auto justify-center px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                  buildAllowed && !isBuilding && buildStep !== 4
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
                    : buildStep === 4
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                }`}
              >
                {isBuilding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span className="text-slate-700">Building Package...</span>
                  </>
                ) : buildStep === 4 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Build Ready</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Generate Production App</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Live Build Progression Timeline */}
        <div className="pt-6 space-y-4">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Build Progress Log
          </span>

          <div className="space-y-3 text-xs">
            {[
              { step: 1, label: "Job Queued & Snapshot Version Ingested" },
              { step: 2, label: "Injecting Package Name, Brand Tokens, and Public APP_KEY" },
              { step: 3, label: "Signing with Tenant Dedicated Keystore (SHA-256)" },
              { step: 4, label: "Packages (APK / AAB / IPA) Generated & Encrypted" },
            ].map((s) => {
              const isDone = buildStep > s.step || buildStep === 4;
              const isCurrent = buildStep === s.step && isBuilding;

              return (
                <div
                  key={s.step}
                  className={`p-3 rounded-xl border flex items-center justify-between transition ${
                    isDone
                      ? "bg-emerald-50/50 border-emerald-200 text-emerald-900"
                      : isCurrent
                      ? "bg-indigo-50/50 border-indigo-200 text-indigo-900 animate-pulse"
                      : "bg-slate-50 border-slate-200 text-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-[11px] w-5">0{s.step}</span>
                    <span className="font-medium">{s.label}</span>
                  </div>

                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-indigo-600 animate-spin flex-shrink-0" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tier-Specific Download & Access Grid */}
        {downloadBuildId && (
          <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-900 text-base">Download Artifacts & Plan Deliverables</h4>
                <p className="text-xs text-slate-500">
                  Select your package format based on your active <span className="font-semibold text-slate-800">{planName}</span> subscription.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCompleteAndReturn}
                disabled={isFinishing}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto shadow-sm cursor-pointer disabled:opacity-70"
              >
                {isFinishing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LayoutDashboard className="w-3.5 h-3.5" />
                )}
                <span>Go to App Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {addonSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="font-semibold">{addonSuccessMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAddonSuccessMsg(null)}
                  className="text-emerald-700 hover:text-emerald-900 text-xs font-bold p-1 rounded-md hover:bg-emerald-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {addonErrorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{addonErrorMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAddonErrorMsg(null)}
                  className="text-rose-700 hover:text-rose-900 text-xs font-bold p-1 rounded-md hover:bg-rose-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Android APK (Available for all plans) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-emerald-500/30 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-sm text-slate-900">Android Package (.APK)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      All Plans
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Direct installation file for Android phones and tablets. Share with testers or clients without Google Play review.
                  </p>
                </div>

                <a
                  href={`/api/apps/${ulid}/builds/${downloadBuildId}/download-file?format=apk&app_name=${encodeURIComponent(appDisplayName)}&version=${appVersionName}`}
                  download={`${safeFileSlug}-v${appVersionName}.apk`}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .APK</span>
                </a>
              </div>

              {/* 2. Google Play Bundle (.AAB) (Pro Growth & Enterprise) */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border-2 flex flex-col justify-between ${
                  canDownloadAab
                    ? "bg-white border-indigo-500/30 shadow-sm"
                    : "bg-slate-50/70 border-dashed border-slate-200"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <Layers className={`w-4 h-4 ${canDownloadAab ? "text-indigo-600" : "text-slate-400"}`} />
                      <span className={`font-bold text-sm ${canDownloadAab ? "text-slate-900" : "text-slate-500"}`}>
                        Google Play Bundle (.AAB)
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      All Plans
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Signed production bundle optimized for Google Play Console submission with Dynamic Feature Delivery.
                  </p>
                </div>

                {canDownloadAab ? (
                  <a
                    href={`/api/apps/${ulid}/builds/${downloadBuildId}/download-file?format=aab&app_name=${encodeURIComponent(appDisplayName)}&version=${appVersionName}`}
                    download={`${safeFileSlug}-v${appVersionName}.aab`}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download .AAB</span>
                  </a>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Lock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      <span>Starter includes APK only</span>
                    </div>
                    <Link
                      href={`/dashboard/apps/${ulid}/setup/payment`}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 self-start sm:self-auto"
                    >
                      <span>Upgrade Plan</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>

              {/* 3. Apple iOS Package (.IPA) */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border-2 flex flex-col justify-between transition-all ${
                  canDownloadIpa
                    ? "bg-white border-sky-500/40 shadow-sm"
                    : "bg-gradient-to-br from-sky-50/40 via-white to-slate-50 border-sky-200/80 shadow-xs"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className={`w-4 h-4 ${canDownloadIpa ? "text-sky-600" : "text-sky-500"}`} />
                      <span className="font-bold text-sm text-slate-900">
                        Apple iOS Package (.IPA)
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        canDownloadIpa
                          ? "bg-sky-50 text-sky-700 border border-sky-200"
                          : "bg-sky-100 text-sky-800 border border-sky-300"
                      }`}
                    >
                      {canDownloadIpa ? "Active & Ready" : "Add-on • ₹2,999 One-Time"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-3">
                    Production binary ready for TestFlight distribution and Apple App Store Connect publishing.
                  </p>

                  {!canDownloadIpa && (
                    <div className="space-y-1.5 mb-4 p-2.5 rounded-xl bg-sky-50/60 border border-sky-100 text-[11px] text-slate-600">
                      <div className="flex items-center gap-1.5 font-medium text-sky-900">
                        <Check className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                        <span>Signed .IPA ready for App Store Connect</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-medium text-sky-900">
                        <Check className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                        <span>No plan upgrade required • Lifetime access</span>
                      </div>
                    </div>
                  )}
                </div>

                {canDownloadIpa ? (
                  <a
                    href={`/api/apps/${ulid}/builds/${downloadBuildId}/download-file?format=ipa&app_name=${encodeURIComponent(appDisplayName)}&version=${appVersionName}`}
                    download={`${safeFileSlug}-v${appVersionName}.ipa`}
                    className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-sky-600/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download .IPA</span>
                  </a>
                ) : (
                  <div className="space-y-2 pt-2 border-t border-sky-100">
                    <button
                      type="button"
                      onClick={() => handlePurchaseAddon("ios_bundle")}
                      disabled={purchasingAddon !== null}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-sky-600/20 disabled:opacity-50 cursor-pointer"
                    >
                      {purchasingAddon === "ios_bundle" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-sky-200" />
                      )}
                      <span>{purchasingAddon === "ios_bundle" ? "Unlocking iOS Bundle..." : "Add iOS Bundle (+₹2,999)"}</span>
                    </button>
                    <p className="text-[10px] text-center text-slate-400">
                      One-time add-on • Instant unlock for this app
                    </p>
                  </div>
                )}
              </div>

              {/* 4. Dedicated App Admin Panel */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border-2 flex flex-col justify-between transition-all ${
                  hasAdminPanel
                    ? "bg-white border-purple-500/40 shadow-sm"
                    : "bg-gradient-to-br from-purple-50/40 via-white to-slate-50 border-purple-200/80 shadow-xs"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <LayoutDashboard className={`w-4 h-4 ${hasAdminPanel ? "text-purple-600" : "text-purple-500"}`} />
                      <span className="font-bold text-sm text-slate-900">
                        Dedicated App Admin Panel
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        hasAdminPanel
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : "bg-purple-100 text-purple-800 border border-purple-300"
                      }`}
                    >
                      {hasAdminPanel ? "Active & Ready" : "Add-on • ₹2,999 One-Time"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-3">
                    Direct mobile app management console with push broadcasts, real-time store catalog sync, analytics, and live remote customization.
                  </p>

                  {!hasAdminPanel && (
                    <div className="space-y-1.5 mb-4 p-2.5 rounded-xl bg-purple-50/60 border border-purple-100 text-[11px] text-slate-600">
                      <div className="flex items-center gap-1.5 font-medium text-purple-900">
                        <Check className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                        <span>Live catalog sync trigger & push broadcasts</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-medium text-purple-900">
                        <Check className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                        <span>No plan upgrade required • Lifetime access</span>
                      </div>
                    </div>
                  )}
                </div>

                {hasAdminPanel ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Link
                      href={`/dashboard/apps/${ulid}/admin`}
                      className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-purple-600/20"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Open App Admin Panel</span>
                    </Link>
                    <a
                      href={`/api/apps/${ulid}/builds/${downloadBuildId}/download-file?format=admin&app_name=${encodeURIComponent(appDisplayName)}`}
                      download={`${safeFileSlug}-admin-portal.json`}
                      className="py-2.5 px-3 bg-purple-50 hover:bg-purple-100 active:scale-95 text-purple-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 border border-purple-200"
                      title="Download Admin Package"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Panel</span>
                    </a>
                  </div>
                ) : (
                  <div className="space-y-2 pt-2 border-t border-purple-100">
                    <button
                      type="button"
                      onClick={() => handlePurchaseAddon("admin_panel_addon")}
                      disabled={purchasingAddon !== null}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-purple-600/20 disabled:opacity-50 cursor-pointer"
                    >
                      {purchasingAddon === "admin_panel_addon" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-purple-200" />
                      )}
                      <span>{purchasingAddon === "admin_panel_addon" ? "Unlocking Admin Panel..." : "Add Admin Panel (+₹2,999)"}</span>
                    </button>
                    <p className="text-[10px] text-center text-slate-400">
                      One-time add-on • Instant unlock for this app
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      
      {/* ── FINISH & DASHBOARD NAVIGATION BAR ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200 mt-8">
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Setup wizard complete! You can download your app build files anytime from your dashboard.</span>
        </div>

        <button
          type="button"
          onClick={handleCompleteAndReturn}
          disabled={isFinishing}
          className="w-full sm:w-auto justify-center px-7 py-3 bg-slate-900 hover:bg-black text-white rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-md shadow-slate-900/10 cursor-pointer active:scale-98 disabled:opacity-70"
        >
          {isFinishing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Completing Setup...</span>
            </>
          ) : (
            <>
              <span>Complete &amp; Return to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  </div>
  );
}
