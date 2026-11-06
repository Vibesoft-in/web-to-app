"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient } from "@/lib/api-client";
import { getUserData, saveUserData } from "@/lib/user-data-store";
import { normalizeWebsiteUrl } from "@/lib/url-utils";
import { DeleteAppModal } from "@/components/dashboard/delete-app-modal";
import {
  ArrowRight,
  Check,
  Globe,
  Loader2,
  Palette,
  Rocket,
  Shield,
  Sparkles,
  Store,
  Trash2,
} from "lucide-react";

const newAppSchema = z.object({
  name: z.string().min(2, "App name must be at least 2 characters").max(50),
  website_url: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || !val.trim()) return true;
        const trimmed = val.trim();
        return trimmed.includes(".") && trimmed.length >= 4;
      },
      { message: "Please enter a valid website URL (e.g. https://yourstore.com)" }
    ),
  platform: z.enum(["woo", "shopify", "wordpress"]),
});

type NewAppForm = z.infer<typeof newAppSchema>;

export default function NewAppPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedThemeInfo, setSelectedThemeInfo] = useState<{ name: string; price?: string } | null>(null);
  const [selectedPlanInfo, setSelectedPlanInfo] = useState<{
    id?: number | string;
    name: string;
    price?: string;
  } | null>(null);

  // Live URL Platform Verification State
  const [checkingPlatform, setCheckingPlatform] = useState(false);
  const [platformFeedback, setPlatformFeedback] = useState<{
    type: "checking" | "matched" | "unsupported" | "invalid" | null;
    title?: string;
    message?: string;
    detectedPlatform?: string | null;
  }>({ type: null });
  const activeAbortController = useRef<AbortController | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const [draftToDelete, setDraftToDelete] = useState<any | null>(null);
  const queryClient = useQueryClient();

  const { data: authData, refetch: refetchAuth } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiClient("/api/auth/me"),
    retry: false,
  });

  const isAdmin = Boolean(authData?.user?.is_super_admin || authData?.user?.email === "admin@webintoapp.com");

  const { data: appsData, refetch: refetchApps } = useQuery({
    queryKey: ["apps"],
    queryFn: async () => {
      try {
        const res = await apiClient("/api/apps");
        return Array.isArray(res) ? res : res.apps || [];
      } catch {
        return [];
      }
    },
    enabled: Boolean(authData?.user && !isAdmin),
  });

  const isAppDraft = (appItem: any) => {
    if (!appItem) return false;
    const statusStr = (typeof appItem.status === "string" ? appItem.status : appItem.status?.value || "").toLowerCase();
    const stepStr = (typeof appItem.setup_step === "string" ? appItem.setup_step : appItem.setup_step?.value || "").toLowerCase();
    if (Boolean(appItem.is_completed) || statusStr === "completed" || statusStr === "live" || statusStr === "active") return false;
    if (stepStr === "build" || stepStr === "completed" || stepStr === "finish") return false;
    const builds = appItem.builds || [];
    if (builds.length > 0) return false;
    return true;
  };

  const draftApps = (appsData || []).filter((a: any) => isAppDraft(a));
  const latestDraft = authData?.user?.latest_draft;
  const unfinishedProjects: any[] = draftApps.length > 0
    ? draftApps
    : (latestDraft && isAppDraft(latestDraft) ? [latestDraft] : []);

  // Explicit parameters from URL searchParams (e.g. from homepage selection)
  const queryUrl = searchParams.get("url") || "";
  const queryPlatform = (searchParams.get("platform") || "").toLowerCase();
  const initialPlatform: "woo" | "shopify" | "wordpress" =
    queryPlatform === "shopify"
      ? "shopify"
      : queryPlatform === "wordpress" || queryPlatform === "wp"
      ? "wordpress"
      : "woo";

  const queryName = searchParams.get("name") || "";

  const [prefilledUrl, setPrefilledUrl] = useState(queryUrl);
  const [prefilledName, setPrefilledName] = useState(queryName);

  useEffect(() => {
    try {
      const planParam = searchParams.get("plan");

      // ONLY display a selected package if explicitly passed via query parameter (e.g. from homepage selection or explicit choice)
      if (!planParam) {
        setSelectedPlanInfo(null);
        try {
          localStorage.removeItem("appifyhub_selected_plan_info");
          localStorage.removeItem("appifyhub_selected_plan");
          localStorage.removeItem("appifyhub_selected_plan_id");
        } catch {}
        return;
      }

      const normalized = planParam.toLowerCase();
      let planName = "Pro Package";
      let planPrice = "₹7,999";
      let planId: number | string = 2;

      if (normalized.includes("starter") || normalized.includes("basic")) {
        planName = "Starter (Basic) Package";
        planPrice = "₹2,999";
        planId = 1;
      } else if (normalized.includes("enterprise") || normalized.includes("premium")) {
        planName = "Enterprise Suite";
        planPrice = "₹14,999";
        planId = 3;
      } else if (normalized.includes("pro")) {
        planName = "Pro Combo";
        planPrice = "₹7,999";
        planId = 2;
      } else {
        const cap = planParam.charAt(0).toUpperCase() + planParam.slice(1);
        planName = `${cap} Package`;
      }

      // Check if we also have saved full plan info from commercial packages API matching this plan
      const saved = localStorage.getItem("appifyhub_selected_plan_info");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.name && (parsed.slug === normalized || String(parsed.id) === normalized)) {
            planName = parsed.name;
            if (parsed.price_monthly) {
              planPrice = `₹${(parsed.price_monthly / 100).toLocaleString("en-IN")}`;
            }
            if (parsed.id) planId = parsed.id;
          }
        } catch {}
      }

      setSelectedPlanInfo({
        id: planId,
        name: planName,
        price: planPrice,
      });

      // Keep localStorage in sync with the explicitly selected plan
      try {
        localStorage.setItem("appifyhub_selected_plan", normalized);
        localStorage.setItem("appifyhub_selected_plan_id", String(planId));
      } catch {}
    } catch {
      setSelectedPlanInfo(null);
    }
  }, [searchParams]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("appifyhub_selected_theme");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.selectedByUser && parsed.name) {
          setSelectedThemeInfo({ name: parsed.name, price: parsed.price });
        } else {
          localStorage.removeItem("appifyhub_selected_theme");
          setSelectedThemeInfo(null);
        }
      } else {
        setSelectedThemeInfo(null);
      }
    } catch {
      setSelectedThemeInfo(null);
    }
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<NewAppForm>({
    resolver: zodResolver(newAppSchema),
    defaultValues: {
      platform: initialPlatform,
      name: queryName,
      website_url: queryUrl,
    },
  });

  // Keep form in sync when authData or storedData resolves
  useEffect(() => {
    if (queryName) {
      setValue("name", queryName);
      setPrefilledName(queryName);
    }
    if (initialPlatform) {
      setValue("platform", initialPlatform);
    }
    if (queryUrl) {
      setValue("website_url", queryUrl);
      setPrefilledUrl(queryUrl);
    }
  }, [queryName, initialPlatform, queryUrl, setValue]);

  const selectedPlatform = watch("platform");
  const watchedUrl = watch("website_url");

  // Live platform check as the user types website URL
  useEffect(() => {
    const clean = normalizeWebsiteUrl(watchedUrl || "");
    if (!clean || clean.length < 4 || !clean.includes(".")) {
      setPlatformFeedback({ type: null });
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      if (activeAbortController.current) {
        activeAbortController.current.abort();
      }
      const controller = new AbortController();
      activeAbortController.current = controller;

      setCheckingPlatform(true);
      setPlatformFeedback({
        type: "checking",
        title: "Scanning store platform...",
      });

      try {
        const res = await fetch("/api/check-platform-match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            url: clean,
            platform:
              selectedPlatform === "shopify"
                ? "shopify"
                : selectedPlatform === "wordpress"
                ? "wordpress"
                : "woocommerce",
            manual: false,
          }),
        });

        const data = await res.json();
        setCheckingPlatform(false);

        if (data.is_invalid || data.detected_platform === "invalid" || (!data.success && data.is_invalid)) {
          setPlatformFeedback({
            type: "invalid",
            title: data.title || "Invalid Website Entry",
            message:
              data.message ||
              "Invalid Website Entry: This website could not be found or reached. Please verify the URL.",
          });
        } else if (data.is_custom || data.detected_platform === "custom" || data.is_supported === false) {
          setPlatformFeedback({
            type: "unsupported",
            title: "Custom Platform Detected",
            message:
              data.message ||
              "This website appears to be built on a custom platform. AppifyHub only converts websites built on WooCommerce, Shopify, or WordPress.",
          });
        } else if (data.auto_platform || data.detected_platform) {
          const detected = data.auto_platform || data.detected_platform;
          if (detected === "shopify") {
            setValue("platform", "shopify");
            setPlatformFeedback({
              type: "matched",
              title: "Shopify Store Detected",
              message: "Website verified: Automatically configured for Shopify.",
              detectedPlatform: "shopify",
            });
          } else if (detected === "wordpress") {
            setValue("platform", "wordpress");
            setPlatformFeedback({
              type: "matched",
              title: "WordPress Site Detected",
              message: "Website verified: Automatically configured for WordPress.",
              detectedPlatform: "wordpress",
            });
          } else if (detected === "woocommerce") {
            setValue("platform", "woo");
            setPlatformFeedback({
              type: "matched",
              title: "WooCommerce Store Detected",
              message: "Website verified: Automatically configured for WooCommerce.",
              detectedPlatform: "woocommerce",
            });
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setCheckingPlatform(false);
          setPlatformFeedback({ type: null });
        }
      }
    }, 450);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [watchedUrl, selectedPlatform, setValue]);

  if (isAdmin) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-lg space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center mx-auto">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Admin Oversight Mode</h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
            As a Super Admin, you have system-wide oversight to inspect customer applications, store syncs, and subscriptions. Personal app creation and builds are disabled for admin profiles.
          </p>
          <div className="pt-2">
            <a
              href="http://localhost:8000/admin"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <span>Go to Filament Admin Panel</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: NewAppForm) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorMsg(null);

    const rawUrl = data.website_url?.trim() || prefilledUrl?.trim() || "";
    const cleanUrl = normalizeWebsiteUrl(rawUrl);

    if (cleanUrl && platformFeedback.type === "invalid") {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setErrorMsg(platformFeedback.message || "Invalid Website Entry: Please enter a live, accessible website URL.");
      return;
    }

    if (cleanUrl && platformFeedback.type === "unsupported") {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setErrorMsg("Custom Platform Detected: Please enter a website built on WooCommerce, Shopify, or WordPress.");
      return;
    }

    try {
      const res = await apiClient("/api/apps", {
        method: "POST",
        body: JSON.stringify({
          name: data.name.trim(),
          platform: data.platform,
          website_url: cleanUrl || undefined,
          site_url: cleanUrl || undefined,
        }),
      });

      // Save user store data with chosen configuration
      saveUserData({
        store_name: data.name.trim(),
        platform: data.platform,
        website_url: cleanUrl || undefined,
      });

      if (cleanUrl) {
        try {
          localStorage.setItem("appifyhub_temp_store_url", cleanUrl);
        } catch {}
      }

      // Clear the one-time selected theme and plan after application initialization
      try {
        localStorage.removeItem("appifyhub_selected_theme");
        localStorage.removeItem("appifyhub_selected_plan_info");
        localStorage.removeItem("appifyhub_selected_plan");
        localStorage.removeItem("appifyhub_selected_plan_id");
      } catch {}

      const ulid = res.ulid || res.app?.ulid;
      if (ulid) {
        if (cleanUrl) {
          try {
            localStorage.setItem(
              `appifyhub_connect_${ulid}`,
              JSON.stringify({
                site_url: cleanUrl,
                consumer_key: "",
                consumer_secret: "",
              })
            );
          } catch {}
        }
        // Direct directly to connect step because platform is already selected!
        router.push(`/dashboard/apps/${ulid}/setup/connect`);
      } else {
        router.push("/dashboard");
      }
      // Keep isSubmitting = true during the navigation transition to prevent accidental duplicate submission
    } catch (err: any) {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setErrorMsg(err.message || "Failed to initialize application.");
    }
  };

  const getPlatformLabel = (plat: string) => {
    if (plat === "shopify") return "Shopify";
    if (plat === "wordpress") return "WordPress";
    return "WooCommerce";
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        <div className="mb-8">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Create New Mobile Application
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Let's start by naming your app and choosing your website platform.
          </p>
        </div>

        {selectedPlanInfo && (
          <div className="mb-6 p-4 rounded-2xl bg-[#F7F5F0] border border-[#78593D]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#78593D] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <Rocket className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#1C1917] flex items-center gap-2">
                  <span>Selected Package:</span>
                  <span className="text-[#78593D] font-black">{selectedPlanInfo.name}</span>
                  {selectedPlanInfo.price && (
                    <span className="text-[#7E756B] font-medium">({selectedPlanInfo.price} / lifetime)</span>
                  )}
                </div>
                <p className="text-[11px] text-[#7E756B] mt-0.5">
                  Your new app will be configured with this package. Pre-selected for checkout.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-center">
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-[#EFEAE2] text-[#78593D] border border-[#78593D]/25">
                Active Choice
              </span>
              <Link
                href="/plans"
                className="text-xs text-[#78593D] hover:underline font-bold"
              >
                Change Plan
              </Link>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem("appifyhub_selected_plan_info");
                    localStorage.removeItem("appifyhub_selected_plan");
                    localStorage.removeItem("appifyhub_selected_plan_id");
                  } catch {}
                  setSelectedPlanInfo(null);
                }}
                className="text-slate-400 hover:text-slate-700 px-1.5 py-0.5 rounded transition text-xs font-bold leading-none"
                title="Remove selected package"
                aria-label="Remove selected package"
              >
                &times;
              </button>
            </div>
          </div>
        )}

        {selectedThemeInfo && (
          <div className="mb-6 p-3 rounded-xl bg-amber-50/70 border border-amber-200/90 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-amber-800 flex-shrink-0" />
              <span className="text-slate-700">
                Active Theme: <strong className="text-amber-950">{selectedThemeInfo.name}</strong>{" "}
                {selectedThemeInfo.price && <span className="text-amber-900">({selectedThemeInfo.price})</span>}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                Ready to apply
              </span>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem("appifyhub_selected_theme");
                  } catch {}
                  setSelectedThemeInfo(null);
                }}
                className="text-slate-400 hover:text-slate-700 px-1 py-0.5 rounded transition text-xs font-bold leading-none"
                title="Remove pre-selected theme"
                aria-label="Remove pre-selected theme"
              >
                &times;
              </button>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Application Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Application Name <span className="text-rose-500">*</span>
            </label>
            <input
              {...register("name")}
              type="text"
              placeholder="e.g. Glow Beauty Store"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
            />
            {errors.name && (
              <p className="text-xs text-rose-600 mt-1.5">{errors.name.message}</p>
            )}
          </div>

          {/* Website / Store URL Field */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Website / Store URL
              </label>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
                Reflected in Setup
              </span>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Globe className="w-4 h-4" />
              </span>
              <input
                {...register("website_url")}
                type="text"
                onBlur={(e) => {
                  const raw = e.target.value;
                  if (raw && raw.trim() && !/^https?:\/\//i.test(raw.trim())) {
                    const normalized = normalizeWebsiteUrl(raw);
                    setValue("website_url", normalized, { shouldValidate: true });
                  }
                }}
                placeholder="https://yourstore.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
              />
            </div>
            {errors.website_url && (
              <p className="text-xs text-rose-600 mt-1.5">{errors.website_url.message}</p>
            )}
            <p className="text-xs text-slate-400 mt-1.5">
              Enter your live website URL. We will pre-configure and reflect this in your store connection and preview steps.
            </p>

            {/* Platform Scanning & Feedback */}
            {platformFeedback.type === "checking" && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs text-slate-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>{platformFeedback.title}</span>
              </div>
            )}

            {platformFeedback.type === "matched" && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <div>
                  <strong className="block font-bold">{platformFeedback.title}</strong>
                  <span>{platformFeedback.message}</span>
                </div>
              </div>
            )}

            {platformFeedback.type === "invalid" && (
              <div className="mt-2.5 p-3 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-900 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <span className="text-sm">⚠</span>
                  <span>{platformFeedback.title || "Invalid Website Entry"}</span>
                </div>
                <p className="leading-relaxed text-amber-800/90">{platformFeedback.message}</p>
              </div>
            )}

            {platformFeedback.type === "unsupported" && (
              <div className="mt-2.5 p-3 rounded-xl bg-[#FDF3F1] border border-[#F2B9B0] text-[#8C2517] text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="text-sm">✕</span>
                  <span>{platformFeedback.title}</span>
                </div>
                <p className="leading-relaxed">{platformFeedback.message}</p>
              </div>
            )}
          </div>

          {/* Website Platform Selector (WooCommerce, Shopify, WordPress) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
              Website Platform <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* WooCommerce */}
              <button
                type="button"
                onClick={() => setValue("platform", "woo")}
                className={`p-4 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                  selectedPlatform === "woo"
                    ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/15 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                      WOO
                    </span>
                    <span
                      className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                        selectedPlatform === "woo"
                          ? "border-indigo-600 bg-indigo-600"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {selectedPlatform === "woo" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm">WooCommerce</div>
                  <div className="text-xs text-slate-500 mt-0.5">WordPress Store</div>
                </div>
                <div className="mt-4 text-[11px] font-bold text-indigo-600">Recommended</div>
              </button>

              {/* Shopify */}
              <button
                type="button"
                onClick={() => setValue("platform", "shopify")}
                className={`p-4 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                  selectedPlatform === "shopify"
                    ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/15 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                      SHOPIFY
                    </span>
                    <span
                      className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                        selectedPlatform === "shopify"
                          ? "border-indigo-600 bg-indigo-600"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {selectedPlatform === "shopify" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm">Shopify</div>
                  <div className="text-xs text-slate-500 mt-0.5">Cloud eCommerce</div>
                </div>
                <div className="mt-4 text-[11px] font-bold text-slate-500">Available</div>
              </button>

              {/* WordPress */}
              <button
                type="button"
                onClick={() => setValue("platform", "wordpress")}
                className={`p-4 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                  selectedPlatform === "wordpress"
                    ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/15 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-200">
                      WORDPRESS
                    </span>
                    <span
                      className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                        selectedPlatform === "wordpress"
                          ? "border-indigo-600 bg-indigo-600"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {selectedPlatform === "wordpress" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm">WordPress</div>
                  <div className="text-xs text-slate-500 mt-0.5">Content &amp; Blog CMS</div>
                </div>
                <div className="mt-4 text-[11px] font-bold text-slate-500">Available</div>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Initializing App...</span>
              </>
            ) : (
              <>
                <span>Continue to Wizard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    
      {/* ── 3-STEP POPUP APPLICATION DELETION MODAL ── */}
      <DeleteAppModal
        isOpen={Boolean(draftToDelete)}
        onClose={() => setDraftToDelete(null)}
        app={draftToDelete}
        onDeleted={() => {
          setDraftToDelete(null);
          refetchAuth();
          refetchApps();
          queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
          queryClient.invalidateQueries({ queryKey: ["apps"] });
        }}
      />
</div>
  );
}
