"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { getUserData, saveUserData } from "@/lib/user-data-store";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  HelpCircle,
  Key,
  Link as LinkIcon,
  Loader2,
  Lock,
  ShieldCheck,
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
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Consumer Key (ck_...)
            </label>
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

        {/* Help Banner */}
        <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-slate-800">How to generate WooCommerce API Keys:</span>
            <p className="mt-0.5">
              In WordPress Admin, go to <strong>WooCommerce</strong> &rarr; <strong>Settings</strong> &rarr; <strong>Advanced</strong> &rarr; <strong>REST API</strong> &rarr; Click <strong>Add Key</strong>. Set Permissions to <strong>Read/Write</strong>.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4">
          <button
            type="submit"
            disabled={isVerifying}
            className="w-full sm:w-auto justify-center px-6 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-sm disabled:opacity-70"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Store Connection...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>{verificationResult ? "Re-verify Connection" : "Verify Connection"}</span>
              </>
            )}
          </button>

          {verificationResult && (
            <button
              type="button"
              onClick={onNext}
              className="w-full sm:w-auto justify-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-md shadow-indigo-600/20"
            >
              <span>Continue to Next Step</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
