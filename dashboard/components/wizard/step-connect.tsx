"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { getUserData, saveUserData } from "@/lib/user-data-store";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  HelpCircle,
  Key,
  Link as LinkIcon,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

const connectSchema = z.object({
  site_url: z
    .string()
    .url("Please enter a valid website URL")
    .startsWith("https://", "Site URL must use secure HTTPS protocol"),
  consumer_key: z.string().min(5, "Consumer Key is required"),
  consumer_secret: z.string().min(5, "Consumer Secret is required"),
});

type ConnectFormData = z.infer<typeof connectSchema>;

interface StepConnectProps {
  ulid: string;
  app?: any;
  setupState?: any;
  onNext: () => void;
}

export function StepConnect({ ulid, app, setupState, onNext }: StepConnectProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{ code: string; message: string } | null>(null);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [prefilledStoreUrl, setPrefilledStoreUrl] = useState<string>("");
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch verified connection if already exists on backend
  const { data: connectionData } = useQuery({
    queryKey: ["app-connection", ulid],
    queryFn: async () => {
      try {
        const res = await apiClient(`/api/apps/${ulid}/connection`);
        return res?.connection || null;
      } catch {
        return null;
      }
    },
    enabled: !!ulid,
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<ConnectFormData>({
    resolver: zodResolver(connectSchema),
    defaultValues: {
      site_url: "https://",
      consumer_key: "",
      consumer_secret: "",
    },
  });

  // Load and restore previous inputs on mount or when connection loads
  useEffect(() => {
    let saved: any = null;
    try {
      const stored = localStorage.getItem(`appifyhub_connect_${ulid}`);
      if (stored) saved = JSON.parse(stored);
    } catch {}

    const storedUserData = typeof window !== "undefined" ? getUserData() : {};

    const storeUrl =
      saved?.site_url ||
      connectionData?.site_url ||
      app?.site_url ||
      app?.website_url ||
      setupState?.app?.site_url ||
      setupState?.app?.website_url ||
      storedUserData.website_url ||
      "";

    const ck = saved?.consumer_key || "";
    const cs = saved?.consumer_secret || "";

    if (storeUrl || ck || cs) {
      const cleanUrl =
        storeUrl && storeUrl.startsWith("http")
          ? storeUrl
          : storeUrl
          ? `https://${storeUrl}`
          : "https://";

      reset({
        site_url: cleanUrl,
        consumer_key: ck,
        consumer_secret: cs,
      });

      if (cleanUrl && cleanUrl !== "https://") {
        setPrefilledStoreUrl(cleanUrl);
      }
    }

    // Check if previously verified
    let verifiedSaved = null;
    try {
      const vStored = localStorage.getItem(`appifyhub_connect_verified_${ulid}`);
      if (vStored) verifiedSaved = JSON.parse(vStored);
    } catch {}

    if (verifiedSaved) {
      setVerificationResult(verifiedSaved);
    } else if (connectionData?.status === "verified" || app?.connection_status === "verified") {
      setVerificationResult({
        verified: true,
        connection: connectionData,
        store: {
          name: app?.name || "Connected Store",
          products_count: setupState?.website_data?.catalog?.total_products ?? "Active",
          currency: setupState?.website_data?.catalog?.currency ?? "INR",
          wc_version: "Ready",
        },
      });
    }
  }, [ulid, connectionData, app, setupState, reset]);

  // Keep saved connection data in sync when user edits fields
  useEffect(() => {
    const subscription = watch((value) => {
      if (value.site_url || value.consumer_key || value.consumer_secret) {
        try {
          localStorage.setItem(`appifyhub_connect_${ulid}`, JSON.stringify(value));
          if (value.site_url && value.site_url !== "https://") {
            localStorage.setItem("appifyhub_temp_store_url", value.site_url);
          }
        } catch {}
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, ulid]);

  const onVerify = async (data: ConnectFormData) => {
    setIsVerifying(true);
    setErrorDetails(null);
    setVerificationResult(null);

    try {
      const res = await apiClient(`/api/apps/${ulid}/connection/verify`, {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`appifyhub_connect_${ulid}`, JSON.stringify(data));
          localStorage.setItem("appifyhub_temp_store_url", data.site_url);
          localStorage.setItem(`appifyhub_connect_verified_${ulid}`, JSON.stringify(res));
        } catch {}
      }

      setVerificationResult(res);
    } catch (err: any) {
      setErrorDetails({
        code: err.code || "VERIFICATION_FAILED",
        message: err.message || "Failed to verify connection to your store.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const getErrorExplanation = (code: string) => {
    switch (code) {
      case "NOT_HTTPS":
        return "WooCommerce requires an SSL/HTTPS certificate to enable API access securely.";
      case "URL_UNREACHABLE":
        return "Our servers were unable to reach your site URL. Please ensure your domain is live and reachable.";
      case "INVALID_KEYS":
        return "The Consumer Key or Consumer Secret is incorrect. Please re-check in WooCommerce -> Settings -> Advanced -> REST API.";
      case "INSUFFICIENT_PERMISSION":
        return "The API key must have Read/Write permissions. It currently only has Read permissions.";
      case "REST_BLOCKED":
        return "Access was blocked by a firewall, Cloudflare rule, or security plugin (Wordfence, iThemes). Please allowlist our IP or enable REST API.";
      default:
        return "Please verify your store settings and API credentials.";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Connect Your WooCommerce Store
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Provide your store URL and WooCommerce REST API credentials.
        </p>
      </div>

      {errorDetails && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm space-y-1">
          <div className="flex items-center gap-2 font-bold text-rose-900">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>Connection Error ({errorDetails.code})</span>
          </div>
          <p className="pl-7 text-xs">{errorDetails.message}</p>
          <p className="pl-7 text-xs text-rose-700 font-medium mt-1">
            Fix Tip: {getErrorExplanation(errorDetails.code)}
          </p>
        </div>
      )}

      {verificationResult && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Store Verified Successfully</span>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full">
              Connected
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
              <span className="text-slate-500 block">Store Name</span>
              <strong className="text-slate-900 font-bold truncate block">
                {verificationResult.store?.name}
              </strong>
            </div>
            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
              <span className="text-slate-500 block">Catalog Size</span>
              <strong className="text-slate-900 font-bold block">
                {verificationResult.store?.products_count} Products
              </strong>
            </div>
            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
              <span className="text-slate-500 block">Currency</span>
              <strong className="text-slate-900 font-bold block">
                {verificationResult.store?.currency}
              </strong>
            </div>
            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
              <span className="text-slate-500 block">WC Version</span>
              <strong className="text-slate-900 font-bold block">
                {verificationResult.store?.wc_version}
              </strong>
            </div>
          </div>

          <div className="pt-2 text-xs text-emerald-700 flex items-center justify-between">
            <span>
              Key in Vault: <code>{verificationResult.connection?.consumer_key_preview || "ck_••••••••"}</code>
            </span>
            <span className="italic">Secret safely encrypted at rest</span>
          </div>
        </div>
      )}

      {prefilledStoreUrl && prefilledStoreUrl !== "https://" && (
        <div className="prefilled-details-banner">
          <div className="prefilled-banner-left">
            <div className="prefilled-icon-check">✓</div>
            <div className="prefilled-banner-text">
              <span className="prefilled-label">Store URL Auto-Fetched</span>
              <span className="prefilled-val">
                Connected address: <strong>{prefilledStoreUrl}</strong>
              </span>
            </div>
          </div>
          <span className="prefilled-editable-badge">Auto-populated</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onVerify)} className="space-y-4" autoComplete="off">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Store URL (HTTPS required)
          </label>
          <div className="relative">
            <LinkIcon className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              {...register("site_url")}
              type="url"
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
              placeholder="https://yourstore.com"
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
            />
          </div>
          {errors.site_url && (
            <p className="text-xs text-rose-600 mt-1">{errors.site_url.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Consumer Key (ck_...)
              </label>
              <button
                type="button"
                onClick={() => setIsGuideModalOpen(true)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3 h-3" />
                <span>Learn to generate</span>
              </button>
            </div>
            <div className="relative">
              <Key className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                {...register("consumer_key")}
                type="text"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                autoCorrect="off"
                spellCheck={false}
                placeholder="ck_1234567890abcdef..."
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition font-mono"
              />
            </div>
            {errors.consumer_key && (
              <p className="text-xs text-rose-600 mt-1">{errors.consumer_key.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Consumer Secret (cs_...)
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                {...register("consumer_secret")}
                type={showSecret ? "text" : "password"}
                autoComplete="new-password"
                data-lpignore="true"
                data-form-type="other"
                placeholder="cs_0987654321fedcba..."
                className="w-full pl-11 pr-11 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700 transition"
                tabIndex={-1}
                aria-label={showSecret ? "Hide secret" : "Show secret"}
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.consumer_secret && (
              <p className="text-xs text-rose-600 mt-1">{errors.consumer_secret.message}</p>
            )}
          </div>
        </div>

        {/* Help Banner with Learn to Generate Button */}
        <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 text-xs text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 mt-0.5">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div className="leading-relaxed">
              <span className="font-bold text-indigo-900 block text-xs sm:text-sm">
                How to generate WooCommerce API Keys:
              </span>
              <p className="text-indigo-800/80 text-xs mt-0.5">
                In WordPress Admin, go to <strong>WooCommerce</strong> &rarr; <strong>Settings</strong> &rarr; <strong>Advanced</strong> &rarr; <strong>REST API</strong> &rarr; Click <strong>Add Key</strong>. Set Permissions to <strong>Read/Write</strong>.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsGuideModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/20 cursor-pointer flex-shrink-0 active:scale-95"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Learn to Generate</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-6 border-t border-slate-200 mt-6">
          <button
            type="submit"
            disabled={isVerifying}
            className="w-full sm:w-auto justify-center px-6 py-3 bg-slate-900 hover:bg-black text-white rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-70 cursor-pointer"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Store Connection...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>{verificationResult ? "Re-verify Connection" : "Verify Store Connection"}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onNext}
            className="w-full sm:w-auto justify-center px-7 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer active:scale-98"
          >
            <span>Next: Store Score</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
      {/* ── POPUP MODAL: LEARN HOW TO GENERATE API KEYS ── */}
      {mounted &&
        isGuideModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
            <div
              className="fixed inset-0"
              onClick={() => setIsGuideModalOpen(false)}
            />

            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative z-10 border border-slate-200 my-auto max-h-[90vh] overflow-y-auto">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsGuideModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      How to Generate WooCommerce API Keys
                    </h3>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Step-by-Step
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Follow these 4 simple steps in your WordPress Admin to create secure API credentials for your mobile app.
                  </p>
                </div>
              </div>

              {/* Direct Link Shortcut Banner */}
              {(() => {
                const siteUrlVal = watch("site_url") || prefilledStoreUrl || "";
                const cleanOrigin = siteUrlVal ? siteUrlVal.replace(/\/+$/, "") : "";
                const directUrl = cleanOrigin && cleanOrigin.startsWith("http")
                  ? `${cleanOrigin}/wp-admin/admin.php?page=wc-settings&tab=advanced&section=keys`
                  : null;

                if (!directUrl) return null;

                return (
                  <div className="mb-6 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-700 flex-shrink-0" />
                      <span>
                        Direct Shortcut for <strong>{cleanOrigin.replace(/^https?:\/\//, "")}</strong>:
                      </span>
                    </div>
                    <a
                      href={directUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-900 hover:bg-black text-white rounded-xl text-xs font-bold transition flex-shrink-0 shadow-xs"
                    >
                      <span>Open WP REST API Settings</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                );
              })()}

              {/* Step by Step Visual Guide Cards */}
              <div className="space-y-4 text-xs">
                {/* Step 1 */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                    1
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className="font-bold text-slate-900 text-sm">
                      Log in to your WordPress Dashboard
                    </h4>
                    <p className="text-slate-600 leading-relaxed">
                      Open your browser and navigate to your store admin panel (typically <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700 font-mono">https://yourstore.com/wp-admin</code>).
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                    2
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className="font-bold text-slate-900 text-sm">
                      Navigate to WooCommerce Settings &rarr; Advanced &rarr; REST API
                    </h4>
                    <p className="text-slate-600 leading-relaxed">
                      In the left sidebar, click on <strong>WooCommerce</strong> &rarr; <strong>Settings</strong>. In the top tabs, click on <strong>Advanced</strong>, and then select the <strong>REST API</strong> sub-menu tab.
                    </p>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 font-mono text-[11px] text-slate-700 flex items-center gap-2">
                      <span className="text-slate-400 font-sans">Path:</span>
                      <strong className="text-indigo-600">WooCommerce</strong> &rarr; <strong>Settings</strong> &rarr; <strong>Advanced</strong> &rarr; <strong>REST API</strong>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                    3
                  </div>
                  <div className="space-y-2 flex-1">
                    <h4 className="font-bold text-slate-900 text-sm">
                      Click &quot;Add Key&quot; and configure permissions
                    </h4>
                    <p className="text-slate-600 leading-relaxed">
                      Click the blue <strong>Add Key</strong> button and fill in the 3 fields:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Description</span>
                        <strong className="text-slate-900 font-bold block mt-0.5">Mobile App</strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">User</span>
                        <strong className="text-slate-900 font-bold block mt-0.5">Admin Account</strong>
                      </div>
                      <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                        <span className="text-[10px] text-emerald-800 uppercase font-bold block">Permissions *</span>
                        <strong className="text-emerald-900 font-bold block mt-0.5">Read / Write</strong>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-[11px] flex items-center gap-2 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Important: Permissions must be set to <strong>Read/Write</strong> so the mobile app can place orders, update cart, and sync live inventory.</span>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                    4
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <h4 className="font-bold text-slate-900 text-sm">
                      Generate &amp; Copy Keys to Wizard
                    </h4>
                    <p className="text-slate-600 leading-relaxed">
                      Click the blue <strong>Generate API Key</strong> button. WooCommerce will display:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-700 pl-1 font-mono text-[11px]">
                      <li><strong className="font-sans">Consumer Key:</strong> starts with <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700">ck_...</code></li>
                      <li><strong className="font-sans">Consumer Secret:</strong> starts with <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700">cs_...</code></li>
                    </ul>
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium mt-1">
                      ⚠️ Note: Copy the Consumer Secret immediately because WooCommerce hides it permanently once you leave that page!
                    </div>
                  </div>
                </div>
              </div>

              {/* Troubleshooting prerequisites */}
              <div className="mt-5 p-3.5 rounded-2xl bg-slate-100/80 border border-slate-200 text-xs text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 block">Prerequisites &amp; Tips:</span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  &bull; <strong>Permalinks:</strong> In WordPress Admin &rarr; <em>Settings &rarr; Permalinks</em>, ensure permalinks are set to <strong>Post name</strong> (or any format other than Plain).
                  <br />
                  &bull; <strong>HTTPS:</strong> WooCommerce REST API requires an active SSL certificate (<code className="font-mono text-indigo-700">https://</code>).
                </p>
              </div>

              {/* Modal Footer Actions */}
              <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsGuideModalOpen(false)}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm active:scale-95"
                >
                  Got It, Close Guide
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
