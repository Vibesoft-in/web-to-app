"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Globe,
  HardDrive,
  Layers,
  Lock,
  Package,
  Palette,
  RefreshCw,
  Rocket,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sliders,
  Store,
  Tag,
  Zap,
} from "lucide-react";

interface AppDetailsViewProps {
  app: any;
  currentPlan: any;
  config: any;
  isLoadingConfig?: boolean;
  onBack: () => void;
  onNavigateToTab: (tab: "apps" | "builds" | "plans" | "payments" | "addons") => void;
  onRebuild: () => void;
  isRebuilding: boolean;
}

export function AppDetailsView({
  app,
  currentPlan,
  config,
  isLoadingConfig,
  onBack,
  onNavigateToTab,
  onRebuild,
  isRebuilding,
}: AppDetailsViewProps) {
  const readyBuild = app?.builds?.find((b: any) => b.status === "ready" || b.status?.value === "ready") || app?.builds?.[0];
  const latestBuild = readyBuild || app?.builds?.[0];
  const targetBuildId = latestBuild?.id;
  const appConfig = config?.config || config || app?.configs?.[0]?.config || {};

  // Extract branding tokens
  const appName = appConfig?.app?.name || app?.name || "Mobile Application";
  const logoUrl =
    appConfig?.app?.logo_url ||
    appConfig?.theme?.logo_url ||
    app?.connection?.site_url
      ? `${app?.connection?.site_url?.replace(/\/+$/, "")}/favicon.ico`
      : "";

  const primaryColor = appConfig?.theme?.colors?.primary || "#4F46E5";
  const secondaryColor = appConfig?.theme?.colors?.secondary || "#F59E0B";
  const backgroundColor = appConfig?.theme?.colors?.background || "#FFFFFF";
  const surfaceColor = appConfig?.theme?.colors?.surface || "#F8FAFC";
  const font = appConfig?.theme?.font || "Inter";
  const radius = appConfig?.theme?.radius ?? 12;
  const layoutScheme = appConfig?.theme?.layout || "theme_a";

  const storeUrl = app?.connection?.store_url || app?.connection?.site_url || "";
  const packageName = app?.package_name || "com.store.app";
  const platform = app?.platform === "woo" || app?.platform?.value === "woo" ? "WooCommerce (WordPress)" : "Shopify";

  const isStarter = currentPlan?.name === "Starter";
  const isEnterprise = currentPlan?.name === "Enterprise";

  const planFeatures = [
    {
      title: "Android Native APK (.apk)",
      desc: "Full production-signed Android package ready to install directly on mobile devices.",
      included: true,
      badge: "Ready & Active",
    },
    {
      title: "Automated WooCommerce Catalog Sync",
      desc: "Instant real-time synchronization of products, categories, images, and live prices.",
      included: true,
      badge: "Real-Time Sync",
    },
    {
      title: "Offline Wishlist & Cart Engine",
      desc: "Client-side saved products, shopping cart, and native checkout redirection.",
      included: true,
      badge: "Included Free",
    },
    {
      title: "FCM Push Notifications",
      desc: "Instant mobile push notification campaigns to engage store shoppers.",
      included: true,
      badge: "Active",
    },
    {
      title: "Google Play Store Bundle (.aab)",
      desc: "Google Play Console publishing format optimized with Android App Bundles.",
      included: !isStarter,
      badge: !isStarter ? "Included" : "Requires Pro Tier",
    },
    {
      title: "Apple iOS Package (.ipa)",
      desc: "Native iOS binary distribution for Apple TestFlight and the App Store.",
      included: isEnterprise,
      badge: isEnterprise ? "Included" : "Requires Enterprise",
    },
    {
      title: "Dedicated Web Admin Panel",
      desc: "Separate administrative portal for tenant analytics, live user management & push campaigns.",
      included: isEnterprise,
      badge: isEnterprise ? "Included" : "Enterprise Only",
    },
    {
      title: "Cryptographic Keystore Signing",
      desc: "2048-bit dedicated tenant RSA keystore with v1, v2, v3 Android signature verification.",
      included: true,
      badge: "Signed",
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-fadeIn">
      {/* ── TOP NAVIGATION & BACK BUTTON ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition shadow-xs group"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Dashboard</span>
          </button>
          <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Application Overview &amp; Specifications
            </h1>
            <p className="text-xs text-slate-500">
              Detailed breakdown of your selected plan, features, branding &amp; build deliverables.
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={`/api/apps/${app?.ulid}/builds/${targetBuildId}/download-file?format=apk`}
            download
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download APK (v{latestBuild?.version_code || 1})</span>
          </a>

          <Link
            href={`/dashboard/apps/${app?.ulid}/setup/branding`}
            className="px-4 py-2 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-white"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Edit Branding &amp; Settings</span>
          </Link>

          <button
            type="button"
            onClick={onRebuild}
            disabled={isRebuilding}
            className="p-2 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 transition bg-white"
            title="Sync Store Products & Rebuild APK"
          >
            <RefreshCw className={`w-4 h-4 ${isRebuilding ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── SECTION 1: APP HEADER & STORE SUMMARY ── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border border-slate-200 p-2 flex items-center justify-center shadow-md shadow-slate-200/50 flex-shrink-0">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={appName}
                  className="w-full h-full object-contain rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-full h-full rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-700 text-white font-extrabold text-2xl flex items-center justify-center">
                  {appName.charAt(0)}
                </div>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">{appName}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {app?.status || "Ready"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {platform}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1">{packageName}</p>
              {storeUrl && (
                <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Store Website:</span>
                  <a
                    href={storeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline font-bold inline-flex items-center gap-0.5"
                  >
                    {storeUrl}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-right">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-500 block">
                Current Plan
              </span>
              <span className="text-base font-black text-indigo-900 block">{currentPlan?.name || "Starter"}</span>
              <span className="text-[11px] font-bold text-indigo-600">
                {currentPlan?.price_monthly === 0
                  ? "Free Tier"
                  : `₹${(currentPlan?.price_monthly / 100).toLocaleString("en-IN")} Lifetime`}
              </span>
            </div>
          </div>
        </div>

        {/* Quick App Metadata Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">App ULID</span>
            <span className="text-xs font-mono font-bold text-slate-800 mt-1 block truncate">
              {app?.ulid || "01M4WVCV6T..."}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Public App Key</span>
            <span className="text-xs font-mono font-bold text-slate-800 mt-1 block truncate">
              {app?.app_key ? `${app.app_key.substring(0, 14)}...` : "app_key_••••••••"}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Catalog Sync</span>
            <span className="text-xs font-bold text-emerald-600 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Synced
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Version Status</span>
            <span className="text-xs font-bold text-indigo-600 mt-1 flex items-center gap-1">
              <Package className="w-3.5 h-3.5" /> v{latestBuild?.version_code || 1}.0.0 Production
            </span>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: PLAN & PURCHASED PACKAGE ("KYA KYA CHEEJE LI THI USER NE") ── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                Purchased Plan &amp; Included Package Deliverables
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Summary of all deliverables and platform capabilities active under your current subscription.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToTab("plans")}
            className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition flex items-center gap-2 border border-indigo-200/60"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Upgrade Plan or Add-ons</span>
          </button>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {planFeatures.map((f, i) => (
            <div
              key={i}
              className={`p-4 rounded-2xl border transition flex items-start justify-between gap-3 ${
                f.included
                  ? "bg-slate-50/70 border-slate-200"
                  : "bg-slate-50/30 border-slate-200/60 opacity-60"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    f.included ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {f.included ? <Check className="w-4 h-4 stroke-[3]" /> : <Lock className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{f.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>

              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap ${
                  f.included
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {f.badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 3: BRANDING IDENTITY & LOGO CONFIGURATION ── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                Brand Identity, Theme &amp; Selected Logo
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Customized visual appearance configured for your mobile application.
            </p>
          </div>

          <Link
            href={`/dashboard/apps/${app?.ulid}/setup/branding`}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold transition flex items-center gap-2"
          >
            <span>Change Logo &amp; Colors</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Logo Tile */}
          <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 flex flex-col items-center text-center justify-center space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Selected Mobile Logo
            </span>
            <div className="w-24 h-24 rounded-2xl bg-white border border-slate-200 p-2.5 flex items-center justify-center shadow-sm">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="App Logo"
                  className="w-full h-full object-contain rounded-xl"
                />
              ) : (
                <div className="w-full h-full rounded-xl bg-indigo-600 text-white font-black text-3xl flex items-center justify-center">
                  {appName.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block">{appName}</span>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                Embedded in Header &amp; Launch Screen
              </span>
            </div>
          </div>

          {/* Color Tokens */}
          <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Color Palette
            </span>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg border border-slate-300 shadow-xs"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Primary Brand Color</span>
                    <span className="text-[10px] text-slate-400 font-mono block">{primaryColor}</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Buttons &amp; Badges</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg border border-slate-300 shadow-xs"
                    style={{ backgroundColor: secondaryColor }}
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Secondary Accent Color</span>
                    <span className="text-[10px] text-slate-400 font-mono block">{secondaryColor}</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Wishlist &amp; Sales</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg border border-slate-300 shadow-xs"
                    style={{ backgroundColor: surfaceColor }}
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Surface &amp; Background</span>
                    <span className="text-[10px] text-slate-400 font-mono block">{surfaceColor}</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">App Canvas</span>
              </div>
            </div>
          </div>

          {/* Typography & Layout */}
          <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Typography &amp; Layout
            </span>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-white border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500">Font Family:</span>
                <span className="font-bold text-slate-900">{font}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500">Corner Radius:</span>
                <span className="font-bold text-slate-900">{radius}px rounded corners</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500">Navigation Style:</span>
                <span className="font-bold text-slate-900">Bottom Navigation Bar</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500">Theme Layout:</span>
                <span className="font-bold text-indigo-600 uppercase">{layoutScheme}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 4: STORE CAPABILITIES & MOBILE INTEGRATIONS ── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
              Active Mobile Store Capabilities
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Core eCommerce features bundled into your compiled mobile application.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 text-xs space-y-1.5">
            <span className="font-extrabold text-slate-900 block flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>WooCommerce Store Sync</span>
            </span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Real-time catalog synchronization pulling products, categories, images, and live pricing directly from your website.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 text-xs space-y-1.5">
            <span className="font-extrabold text-slate-900 block flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Interactive Wishlist</span>
            </span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Client-side persistent wishlist with real-time top bar badge counter and quick item add/remove actions.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 text-xs space-y-1.5">
            <span className="font-extrabold text-slate-900 block flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Cart &amp; Instant Checkout</span>
            </span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Cart quantity adjustments, discount calculations, and seamless pass-through to your WooCommerce payment gateways.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 text-xs space-y-1.5">
            <span className="font-extrabold text-slate-900 block flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Instant Search &amp; Categories</span>
            </span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Fast live filtering across products with responsive category badge navigation and multi-column grid layouts.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 text-xs space-y-1.5">
            <span className="font-extrabold text-slate-900 block flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Offline Product Cache</span>
            </span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Local device storage caching for sub-second page browsing even when mobile internet is slow or intermittent.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 text-xs space-y-1.5">
            <span className="font-extrabold text-slate-900 block flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Responsive Phone &amp; Tablet UI</span>
            </span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Fluid viewport auto-scaling optimized across Android devices from 5.5&quot; handhelds to large 11&quot; Android tablets.
            </p>
          </div>
        </div>
      </div>

      {/* ── SECTION 5: TECHNICAL BUILD & KEYSTORE SECURITY ── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
              Technical Build Engine &amp; Keystore Security
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Android native compilation parameters and security certificates.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs">
            <span className="text-slate-400 font-semibold block">Min Android SDK</span>
            <strong className="text-slate-900 font-bold mt-1 block">Android 7.0 (API 24)</strong>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Supports 98.7% of Android devices</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs">
            <span className="text-slate-400 font-semibold block">Target Android SDK</span>
            <strong className="text-slate-900 font-bold mt-1 block">Android 14 (API 34)</strong>
            <span className="text-[10px] text-emerald-600 mt-0.5 block font-semibold">Google Play 2026 Compliant</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs">
            <span className="text-slate-400 font-semibold block">Keystore &amp; Signatures</span>
            <strong className="text-slate-900 font-bold mt-1 block">v1, v2, v3 Cryptographic</strong>
            <span className="text-[10px] text-indigo-600 mt-0.5 block font-semibold">2048-bit RSA Dedicated</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs">
            <span className="text-slate-400 font-semibold block">Architecture</span>
            <strong className="text-slate-900 font-bold mt-1 block">Universal ARM64 / x86_64</strong>
            <span className="text-[10px] text-slate-400 mt-0.5 block">64-bit Optimized Bytecode</span>
          </div>
        </div>
      </div>

      {/* ── BOTTOM BACK TO DASHBOARD ACTION BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-indigo-50 border border-indigo-100">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md shadow-indigo-600/20 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Dashboard</span>
          </button>
          <span className="text-xs text-indigo-900 font-medium">
            Return to your main apps, builds, and billing overview.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/apps/${app?.ulid}/builds/${targetBuildId}/download-file?format=apk`}
            download
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download APK</span>
          </a>
        </div>
      </div>
    </div>
  );
}
