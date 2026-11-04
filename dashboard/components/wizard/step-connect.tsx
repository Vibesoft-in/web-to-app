"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { getUserData } from "@/lib/user-data-store";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
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
  Layers,
  Store,
} from "lucide-react";

const connectSchema = z.object({
  site_url: z
    .string()
    .url("Please enter a valid website URL")
    .startsWith("https://", "Site URL must use secure HTTPS protocol"),
  consumer_key: z.string().min(3, "API Key or Access Token is required"),
  consumer_secret: z.string().optional(),
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

  // Determine platform dynamically from app or setupState
  const rawPlatform = (
    app?.platform ||
    setupState?.app?.platform ||
    ""
  ).toLowerCase();

  const isShopify = rawPlatform === "shopify";
  const isWoo =
    rawPlatform === "woo" ||
    rawPlatform === "woocommerce" ||
    rawPlatform === "wordpress" ||
    rawPlatform === "wp";
  const isUndetected = !isShopify && !isWoo;

  // Active tab in guide modal: default to detected platform
  const [guidePlatformTab, setGuidePlatformTab] = useState<"woocommerce" | "shopify">(
    isShopify ? "shopify" : "woocommerce"
  );

  useEffect(() => {
    if (isShopify) setGuidePlatformTab("shopify");
    else if (isWoo) setGuidePlatformTab("woocommerce");
  }, [isShopify, isWoo]);

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
          wc_version: isShopify ? "Shopify API" : "Ready",
        },
      });
    }
  }, [ulid, connectionData, app, setupState, reset, isShopify]);

  // Keep saved connection data in sync when user edits fields
  // Invalidate verification if fields change
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
    // For WooCommerce, consumer_secret is required
    if (isWoo && (!data.consumer_secret || data.consumer_secret.trim().length < 3)) {
      setErrorDetails({
        code: "INVALID_KEYS",
        message: "WooCommerce Consumer Secret (cs_...) is required.",
      });
      return;
    }

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

  const isStepVerified = Boolean(
    verificationResult?.verified ||
    verificationResult?.store ||
    connectionData?.status === "verified" ||
    setupState?.verification?.connection_verified
  );

  const getErrorExplanation = (code: string) => {
    switch (code) {
      case "CREDENTIAL_MISMATCH":
        return "The credentials submitted do not belong to the website entered for this app. Credentials must authenticate against your registered store.";
      case "PLATFORM_MISMATCH":
        return isShopify
          ? "WooCommerce keys were entered for a Shopify store. Please enter a Shopify Admin API access token (shpat_...)."
          : "Shopify tokens were entered for a WooCommerce store. Please enter WooCommerce Consumer Key & Secret.";
      case "NOT_HTTPS":
        return "Your store requires an active SSL/HTTPS certificate to enable API access securely.";
      case "URL_UNREACHABLE":
        return "Our servers were unable to reach your site URL. Please ensure your domain is live and reachable.";
      case "INVALID_KEYS":
        return isShopify
          ? "The Shopify Admin API access token is invalid. Please check your Custom App token in Shopify Admin."
          : "The Consumer Key or Consumer Secret is incorrect. Please re-check in WooCommerce -> Settings -> Advanced -> REST API.";
      case "INSUFFICIENT_PERMISSION":
        return isShopify
          ? "The Custom App lacks required scopes. Enable read_products, read_orders, and read_customers in Shopify Admin."
          : "The API key must have Read/Write permissions. It currently only has Read permissions.";
      case "REST_BLOCKED":
        return "Access was blocked by a firewall, Cloudflare rule, or security plugin. Please allowlist our IP or enable REST API.";
      default:
        return "Please verify your store settings, URL, and API credentials.";
    }
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER ── */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          {isShopify
            ? "Connect Your Shopify Store"
            : isWoo
            ? "Connect Your WooCommerce Store"
            : "Connect Your Store"}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {isShopify
            ? "Provide your Shopify store domain and Admin API Access Token to sync live catalog and orders."
            : isWoo
            ? "Provide your store URL and WooCommerce REST API credentials."
            : "Provide your store URL and platform API credentials to synchronize your catalog."}
        </p>
      </div>

      {/* ── ERROR ALERT ── */}
      {errorDetails && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm space-y-1 animate-in fade-in">
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

      {/* ── VERIFIED STATUS CARD ── */}
      {verificationResult && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3 animate-in fade-in">
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
              <span className="text-slate-500 block">API Engine</span>
              <strong className="text-slate-900 font-bold block">
                {verificationResult.store?.wc_version || (isShopify ? "Shopify 2024-01" : "WooCommerce v3")}
              </strong>
            </div>
          </div>

          <div className="pt-2 text-xs text-emerald-700 flex items-center justify-between">
            <span>
              Key in Vault: <code>{verificationResult.connection?.consumer_key_preview || "••••••••"}</code>
            </span>
            <span className="italic">Secret safely encrypted at rest</span>
          </div>
        </div>
      )}

      {/* ── PREFILLED STORE URL BANNER ── */}
      {prefilledStoreUrl && prefilledStoreUrl !== "https://" && (
        <div className="prefilled-details-banner">
          <div className="prefilled-banner-left">
            <div className="prefilled-icon-check">✓</div>
            <div className="prefilled-banner-text">
              <span className="prefilled-label">Store URL Reflected From Setup</span>
              <span className="prefilled-val">
                Registered Store: <strong>{prefilledStoreUrl}</strong>
              </span>
            </div>
          </div>
          <span className="prefilled-editable-badge">Auto-populated</span>
        </div>
      )}

      {/* ── REQ 1: HORIZONTAL LEARN MORE / PLATFORM-SPECIFIC INSTRUCTIONS ABOVE INPUTS ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 text-xs text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 mt-0.5">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div className="leading-relaxed">
            {isShopify ? (
              <>
                <span className="font-bold text-indigo-900 block text-xs sm:text-sm">
                  How to generate Shopify Admin API credentials:
                </span>
                <p className="text-indigo-800/80 text-xs mt-0.5">
                  In Shopify Admin, go to <strong>Settings</strong> &rarr; <strong>Apps and sales channels</strong> &rarr; <strong>Develop apps</strong> &rarr; <strong>Create custom app</strong>. Configure Admin API scopes (<code className="font-mono text-indigo-900">read_products</code>, <code className="font-mono text-indigo-900">read_orders</code>, <code className="font-mono text-indigo-900">read_customers</code>) &rarr; Click <strong>Install app</strong> &rarr; Copy the <strong>Admin API access token</strong> (<code className="font-mono text-indigo-900">shpat_...</code>).
                </p>
              </>
            ) : isWoo ? (
              <>
                <span className="font-bold text-indigo-900 block text-xs sm:text-sm">
                  How to generate WooCommerce API Keys:
                </span>
                <p className="text-indigo-800/80 text-xs mt-0.5">
                  In WordPress Admin, go to <strong>WooCommerce</strong> &rarr; <strong>Settings</strong> &rarr; <strong>Advanced</strong> &rarr; <strong>REST API</strong> &rarr; Click <strong>Add Key</strong>. Set Permissions to <strong>Read/Write</strong> &rarr; Copy <strong>Consumer Key</strong> (<code className="font-mono text-indigo-900">ck_...</code>) &amp; <strong>Consumer Secret</strong> (<code className="font-mono text-indigo-900">cs_...</code>).
                </p>
              </>
            ) : (
              <>
                <span className="font-bold text-indigo-900 block text-xs sm:text-sm">
                  Verify Store Platform:
                </span>
                <p className="text-indigo-800/80 text-xs mt-0.5">
                  Please verify whether your store is built on <strong>WooCommerce</strong> or <strong>Shopify</strong> to view matching step-by-step API generation instructions.
                </p>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsGuideModalOpen(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/20 cursor-pointer flex-shrink-0 active:scale-95"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>{isShopify ? "Shopify Guide" : isWoo ? "WooCommerce Guide" : "View Guide"}</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* ── API CREDENTIAL INPUT FIELDS (BELOW LEARN MORE) ── */}
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
              placeholder={isShopify ? "https://your-store.myshopify.com" : "https://yourstore.com"}
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
                {isShopify
                  ? "Admin API Access Token (shpat_...)"
                  : "Consumer Key (ck_...)"}
              </label>
              <button
                type="button"
                onClick={() => setIsGuideModalOpen(true)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3 h-3" />
                <span>Instructions</span>
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
                placeholder={isShopify ? "shpat_1234567890abcdef..." : "ck_1234567890abcdef..."}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition font-mono"
              />
            </div>
            {errors.consumer_key && (
              <p className="text-xs text-rose-600 mt-1">{errors.consumer_key.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              {isShopify
                ? "API Secret Key (Optional if Access Token provided)"
                : "Consumer Secret (cs_...)"}
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                {...register("consumer_secret")}
                type={showSecret ? "text" : "password"}
                autoComplete="new-password"
                data-lpignore="true"
                data-form-type="other"
                placeholder={isShopify ? "shpss_0987654321fedcba... (optional)" : "cs_0987654321fedcba..."}
                className="w-full pl-11 pr-11 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700 transition cursor-pointer"
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

        {/* ── STEP ACTIONS: VERIFY BUTTON & NEXT BUTTON (STEP LOCK ENFORCED) ── */}
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
                <span>{isStepVerified ? "Re-verify Connection" : "Verify Store Connection"}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={!isStepVerified}
            title={!isStepVerified ? "Please verify store credentials before proceeding." : ""}
            className={`w-full sm:w-auto justify-center px-7 py-3 rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-md ${
              isStepVerified
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 cursor-pointer active:scale-98"
                : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
            }`}
          >
            <span>Next: Store Score</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {!isStepVerified && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/70 p-2.5 rounded-xl text-center">
            🔒 <strong>Step Locked:</strong> You must click &quot;Verify Store Connection&quot; and achieve successful authentication before unlocking the next step.
          </p>
        )}
      </form>

      {/* ── POPUP MODAL: PLATFORM-SPECIFIC STEP-BY-STEP API GUIDE ── */}
      {mounted &&
        isGuideModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
            <div
              className="fixed inset-0"
              onClick={() => setIsGuideModalOpen(false)}
            />

            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative z-10 border border-slate-200 my-auto max-h-[90vh] overflow-y-auto">
              <button
                type="button"
                onClick={() => setIsGuideModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Tabs: WooCommerce vs Shopify */}
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                <button
                  type="button"
                  onClick={() => setGuidePlatformTab("woocommerce")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                    guidePlatformTab === "woocommerce"
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>WooCommerce Guide</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGuidePlatformTab("shopify")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                    guidePlatformTab === "shopify"
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Shopify Custom App Guide</span>
                </button>
              </div>

              {guidePlatformTab === "woocommerce" ? (
                /* ── WOOCOMMERCE GUIDE ── */
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                      <Key className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">
                        Generate WooCommerce REST API Keys
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Follow these 4 simple steps in your WordPress Admin to create secure API credentials.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs mt-4">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                        1
                      </div>
                      <div className="space-y-1">
                        <strong className="text-slate-900 block">Log in to WordPress Admin</strong>
                        <p className="text-slate-600 leading-relaxed">
                          Navigate to your WordPress dashboard (e.g., <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700 font-mono">https://yourstore.com/wp-admin</code>).
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                        2
                      </div>
                      <div className="space-y-1">
                        <strong className="text-slate-900 block">Go to WooCommerce Settings &rarr; Advanced &rarr; REST API</strong>
                        <p className="text-slate-600 leading-relaxed">
                          In the sidebar, click <strong>WooCommerce</strong> &rarr; <strong>Settings</strong>. Click the <strong>Advanced</strong> tab at top, then select <strong>REST API</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                        3
                      </div>
                      <div className="space-y-1.5">
                        <strong className="text-slate-900 block">Click &quot;Add Key&quot; and configure Read/Write permissions</strong>
                        <p className="text-slate-600 leading-relaxed">
                          Set Description to <code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono">Mobile App</code> and change Permissions to <strong>Read/Write</strong>.
                        </p>
                        <span className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-block font-medium">
                          ✓ Read/Write is mandatory so customers can place orders and sync live cart.
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                        4
                      </div>
                      <div className="space-y-1">
                        <strong className="text-slate-900 block">Copy Consumer Key &amp; Consumer Secret</strong>
                        <p className="text-slate-600 leading-relaxed">
                          Click <strong>Generate API Key</strong>. Copy the <code>ck_...</code> and <code>cs_...</code> keys directly into the wizard input fields.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── SHOPIFY GUIDE ── */
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">
                        Create a Shopify Custom App &amp; Access Token
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Follow these steps in Shopify Admin to configure Admin API scopes and get your access token.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs mt-4">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                        1
                      </div>
                      <div className="space-y-1">
                        <strong className="text-slate-900 block">Go to Apps &amp; Sales Channels in Shopify Admin</strong>
                        <p className="text-slate-600 leading-relaxed">
                          In Shopify Admin, click <strong>Settings</strong> (bottom-left) &rarr; <strong>Apps and sales channels</strong> &rarr; click <strong>Develop apps</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                        2
                      </div>
                      <div className="space-y-1">
                        <strong className="text-slate-900 block">Create Custom App</strong>
                        <p className="text-slate-600 leading-relaxed">
                          Click <strong>Create an app</strong>. Enter App Name: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700 font-mono">Mobile App Converter</code>. Select yourself as App Developer.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                        3
                      </div>
                      <div className="space-y-1.5">
                        <strong className="text-slate-900 block">Configure Admin API Scopes</strong>
                        <p className="text-slate-600 leading-relaxed">
                          Click <strong>Configure Admin API scopes</strong>. Search and enable:
                        </p>
                        <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                          <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-indigo-700 font-bold">read_products</span>
                          <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-indigo-700 font-bold">read_orders</span>
                          <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-indigo-700 font-bold">read_customers</span>
                          <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-indigo-700 font-bold">write_customers</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                        4
                      </div>
                      <div className="space-y-1">
                        <strong className="text-slate-900 block">Install App &amp; Copy Access Token</strong>
                        <p className="text-slate-600 leading-relaxed">
                          Click <strong>Install app</strong> &rarr; click <strong>Reveal token once</strong> &rarr; Copy the token starting with <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700 font-mono">shpat_...</code> into the wizard.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end">
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
