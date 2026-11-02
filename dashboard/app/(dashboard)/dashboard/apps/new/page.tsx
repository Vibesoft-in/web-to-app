"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient } from "@/lib/api-client";
import { getUserData, saveUserData } from "@/lib/user-data-store";
import { ArrowRight, Check, Loader2, Palette, Rocket, Shield, Sparkles, Store } from "lucide-react";

const newAppSchema = z.object({
  name: z.string().min(2, "App name must be at least 2 characters").max(50),
  platform: z.enum(["woo", "shopify"]),
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

  const { data: authData } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiClient("/api/auth/me"),
    retry: false,
  });

  const isAdmin = Boolean(authData?.user?.is_super_admin || authData?.user?.email === "admin@webintoapp.com");

  // Auto-fetch data from searchParams or user data store
  const storedData = typeof window !== "undefined" ? getUserData() : {};
  const queryUrl = searchParams.get("url") || storedData.website_url || "";
  const queryPlatform = (searchParams.get("platform") || storedData.platform || "").toLowerCase();
  const initialPlatform: "woo" | "shopify" = queryPlatform === "shopify" ? "shopify" : "woo";
  const queryName =
    searchParams.get("name") ||
    storedData.store_name ||
    authData?.user?.business_name ||
    "";

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
      setPrefilledUrl(queryUrl);
    }
  }, [queryName, initialPlatform, queryUrl, setValue]);

  const selectedPlatform = watch("platform");

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

    try {
      const res = await apiClient("/api/apps", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          website_url: prefilledUrl || undefined,
          site_url: prefilledUrl || undefined,
        }),
      });

      // Save user store data with chosen configuration
      saveUserData({
        store_name: data.name,
        platform: data.platform,
        website_url: prefilledUrl || undefined,
      });

      // Clear the one-time selected theme and plan after application initialization
      try {
        localStorage.removeItem("appifyhub_selected_theme");
        localStorage.removeItem("appifyhub_selected_plan_info");
        localStorage.removeItem("appifyhub_selected_plan");
        localStorage.removeItem("appifyhub_selected_plan_id");
      } catch {}

      const ulid = res.ulid || res.app?.ulid;
      if (ulid) {
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
            Let's start by naming your app and choosing your e-commerce platform.
          </p>
        </div>

        {(prefilledName || prefilledUrl) && (
          <div className="prefilled-details-banner">
            <div className="prefilled-banner-left">
              <div className="prefilled-icon-check">✓</div>
              <div className="prefilled-banner-text">
                <span className="prefilled-label">Auto-Fetched Configuration</span>
                <span className="prefilled-val">
                  Store: <strong>{prefilledName || "Your Store"}</strong> &bull; Platform:{" "}
                  <strong>{selectedPlatform === "shopify" ? "Shopify" : "WooCommerce"}</strong>
                  {prefilledUrl && (
                    <>
                      {" "}
                      &bull; URL: <strong>{prefilledUrl}</strong>
                    </>
                  )}
                </span>
              </div>
            </div>
            <span className="prefilled-editable-badge">Auto-populated</span>
          </div>
        )}

        {authData?.user?.latest_draft && (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-950">
                  Unfinished Project: <span className="font-extrabold text-indigo-700">{authData.user.latest_draft.name}</span>
                </p>
                <p className="text-[11px] text-indigo-600 mt-0.5">
                  Saved at Step: <span className="font-bold uppercase tracking-wider">{authData.user.latest_draft.setup_step}</span>
                </p>
              </div>
            </div>
            <Link
              href={`/dashboard/apps/${authData.user.latest_draft.ulid}/setup/${authData.user.latest_draft.setup_step || "platform"}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition self-start sm:self-auto"
            >
              <span>Resume Project</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

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
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Application Name
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
              Store Platform
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setValue("platform", "woo")}
                className={`p-4 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                  selectedPlatform === "woo"
                    ? "border-indigo-600 bg-indigo-50/30"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="font-bold text-slate-900">WooCommerce</div>
                  <div className="text-xs text-slate-500 mt-1">WordPress REST API</div>
                </div>
                <div className="mt-4 text-xs font-semibold text-indigo-600">Recommended</div>
              </button>

              <button
                type="button"
                onClick={() => setValue("platform", "shopify")}
                className={`p-4 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                  selectedPlatform === "shopify"
                    ? "border-indigo-600 bg-indigo-50/30"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="font-bold text-slate-900">Shopify</div>
                  <div className="text-xs text-slate-500 mt-1">Storefront & Admin API</div>
                </div>
                <div className="mt-4 text-xs font-semibold text-slate-400">Available</div>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-70"
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
    </div>
  );
}
