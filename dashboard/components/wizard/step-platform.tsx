"use client";

import { useState, useEffect } from "react";
import { ArrowRight, CheckCircle2, Loader2, Store } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { getUserData, saveUserData } from "@/lib/user-data-store";

interface StepPlatformProps {
  ulid: string;
  app: any;
  onNext: () => void;
}

export function StepPlatform({ ulid, app, onNext }: StepPlatformProps) {
  const storedData = typeof window !== "undefined" ? getUserData() : {};
  const initialPlatform: "woo" | "shopify" | "wordpress" =
    app?.platform ||
    (storedData.platform === "shopify"
      ? "shopify"
      : storedData.platform === "wordpress"
      ? "wordpress"
      : "woo");

  const [platform, setPlatform] = useState<"woo" | "shopify" | "wordpress">(initialPlatform);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (app?.platform) {
      setPlatform(app.platform);
    }
  }, [app?.platform]);

  const handleSave = () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    saveUserData({ platform });
    onNext();

    apiClient(`/api/apps/${ulid}/platform`, {
      method: "POST",
      body: JSON.stringify({ platform }),
    })
      .catch((err: any) => {
        console.warn("Platform background save:", err);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const getPlatformName = (p: string) => {
    if (p === "shopify") return "Shopify";
    if (p === "wordpress") return "WordPress";
    return "WooCommerce";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Select Your Website Platform
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Choose the platform that powers your catalog, content, or eCommerce store.
        </p>
      </div>

      {(app?.platform || storedData.platform) && (
        <div className="prefilled-details-banner">
          <div className="prefilled-banner-left">
            <div className="prefilled-icon-check">✓</div>
            <div className="prefilled-banner-text">
              <span className="prefilled-label">Platform Configured</span>
              <span className="prefilled-val">
                Your website platform is configured as <strong>{getPlatformName(platform)}</strong>.
              </span>
            </div>
          </div>
          <span className="prefilled-editable-badge">Pre-configured</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* WooCommerce */}
        <div
          onClick={() => setPlatform("woo")}
          className={`p-6 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
            platform === "woo"
              ? "border-indigo-600 bg-indigo-50/20 shadow-sm ring-2 ring-indigo-600/10"
              : "border-slate-200 hover:border-slate-300 bg-white"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                WOO
              </div>
              {platform === "woo" && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
            </div>
            <h3 className="font-bold text-slate-900 text-lg">WooCommerce</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Connect your WordPress WooCommerce store securely using official REST v3 keys with encrypted vault storage.
            </p>
          </div>
          <div className="mt-6 text-xs font-semibold text-indigo-600">
            Recommended • Fully Automated Sync
          </div>
        </div>

        {/* Shopify */}
        <div
          onClick={() => setPlatform("shopify")}
          className={`p-6 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
            platform === "shopify"
              ? "border-indigo-600 bg-indigo-50/20 shadow-sm ring-2 ring-indigo-600/10"
              : "border-slate-200 hover:border-slate-300 bg-white"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                SHOPIFY
              </div>
              {platform === "shopify" && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Shopify</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Connect using Storefront API for instant product sync and native checkout redirection.
            </p>
          </div>
          <div className="mt-6 text-xs font-semibold text-slate-500">
            Available • Custom App Tokens
          </div>
        </div>

        {/* WordPress */}
        <div
          onClick={() => setPlatform("wordpress")}
          className={`p-6 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
            platform === "wordpress"
              ? "border-indigo-600 bg-indigo-50/20 shadow-sm ring-2 ring-indigo-600/10"
              : "border-slate-200 hover:border-slate-300 bg-white"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
                WP
              </div>
              {platform === "wordpress" && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
            </div>
            <h3 className="font-bold text-slate-900 text-lg">WordPress</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Connect standard WordPress content, blogs, or custom post types via native REST API integration.
            </p>
          </div>
          <div className="mt-6 text-xs font-semibold text-slate-500">
            Available • Content &amp; Media API
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200 mt-6">
        <div className="text-xs text-slate-500">
          Selected platform: <strong className="text-slate-800 capitalize">{platform === "woo" ? "WooCommerce" : platform}</strong>. Proceed to connect store credentials.
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSubmitting}
          className="w-full sm:w-auto justify-center px-7 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition shadow-md shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-70 cursor-pointer active:scale-98"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Platform...</span>
            </>
          ) : (
            <>
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
