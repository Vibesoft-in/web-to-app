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
  const initialPlatform: "woo" | "shopify" =
    app?.platform || (storedData.platform === "shopify" ? "shopify" : "woo");

  const [platform, setPlatform] = useState<"woo" | "shopify">(initialPlatform);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (app?.platform) {
      setPlatform(app.platform);
    }
  }, [app?.platform]);

  const handleSave = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await apiClient(`/api/apps/${ulid}/platform`, {
        method: "POST",
        body: JSON.stringify({ platform }),
      });
      saveUserData({ platform });
      onNext();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update platform.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Select Your Store Platform
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Choose the e-commerce engine that powers your catalog and orders.
        </p>
      </div>

      {(app?.platform || storedData.platform) && (
        <div className="prefilled-details-banner">
          <div className="prefilled-banner-left">
            <div className="prefilled-icon-check">✓</div>
            <div className="prefilled-banner-text">
              <span className="prefilled-label">Platform Auto-Selected</span>
              <span className="prefilled-val">
                Your store platform is configured as <strong>{platform === "shopify" ? "Shopify" : "WooCommerce"}</strong>.
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          onClick={() => setPlatform("woo")}
          className={`p-6 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
            platform === "woo"
              ? "border-indigo-600 bg-indigo-50/20 shadow-sm"
              : "border-slate-200 hover:border-slate-300 bg-white"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                W
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

        <div
          onClick={() => setPlatform("shopify")}
          className={`p-6 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
            platform === "shopify"
              ? "border-indigo-600 bg-indigo-50/20 shadow-sm"
              : "border-slate-200 hover:border-slate-300 bg-white"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                S
              </div>
              {platform === "shopify" && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Shopify</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Connect using Storefront API for instant product sync and native checkout redirection.
            </p>
          </div>
          <div className="mt-6 text-xs font-semibold text-slate-400">
            Custom App Access Tokens
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className="w-full sm:w-auto justify-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-70"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <span>Save & Continue</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
