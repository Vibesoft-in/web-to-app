"use client";

import { useState, useEffect } from "react";
import { ArrowRight, CheckCircle2, Globe, Loader2, Sparkles, Store } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { getUserData, saveUserData } from "@/lib/user-data-store";
import { normalizeWebsiteUrl } from "@/lib/url-utils";

interface StepPlatformProps {
  ulid: string;
  app: any;
  onNext: () => void;
}

export function StepPlatform({ ulid, app, onNext }: StepPlatformProps) {
  const initialPlatform: "woo" | "shopify" | "wordpress" =
    app?.platform || "woo";

  const [platform, setPlatform] = useState<"woo" | "shopify" | "wordpress">(initialPlatform);
  const [appName, setAppName] = useState(app?.name || "");
  const [websiteUrl, setWebsiteUrl] = useState(app?.connection?.site_url || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (app?.platform) {
      setPlatform(app.platform);
    }
    if (app?.name && !appName) {
      setAppName(app.name);
    }
    if (app?.connection?.site_url && !websiteUrl) {
      setWebsiteUrl(app.connection.site_url);
    }
  }, [app]);

  const handleSave = () => {
    if (!appName.trim() || appName.trim().length < 2) {
      setErrorMsg("Application name must be at least 2 characters.");
      return;
    }

    const cleanUrl = websiteUrl.trim() ? normalizeWebsiteUrl(websiteUrl.trim()) : "";

    setIsSubmitting(true);
    setErrorMsg(null);
    saveUserData({
      platform,
      store_name: appName.trim(),
      website_url: cleanUrl || undefined,
    });

    onNext();

    apiClient(`/api/apps/${ulid}/platform`, {
      method: "POST",
      body: JSON.stringify({
        platform,
        name: appName.trim(),
        website_url: cleanUrl || undefined,
        site_url: cleanUrl || undefined,
      }),
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
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Create New Mobile Application
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Let&apos;s start by naming your app and choosing your website platform.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Application Name Field */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
          Application Name <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          value={appName}
          onChange={(e) => setAppName(e.target.value)}
          placeholder="e.g. Glow Beauty Store"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
        />
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
            type="text"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            onBlur={(e) => {
              const raw = e.target.value;
              if (raw && raw.trim() && !/^https?:\/\//i.test(raw.trim())) {
                setWebsiteUrl(normalizeWebsiteUrl(raw));
              }
            }}
            placeholder="https://yourstore.com"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
          />
        </div>
        <p className="text-xs text-slate-400 mt-1.5">
          Enter your live website URL. We will pre-configure and reflect this in your store connection and preview steps.
        </p>
      </div>

      {/* Website Platform Selector */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
          Website Platform <span className="text-rose-500">*</span>
        </label>
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
              Recommended &bull; Fully Automated Sync
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
              Available &bull; Custom App Tokens
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
              Available &bull; Content &amp; Media API
            </div>
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
