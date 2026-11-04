"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  Globe,
  HardDrive,
  Layers,
  LayoutDashboard,
  Lock,
  MessageSquare,
  Package,
  Palette,
  Plus,
  RefreshCw,
  Rocket,
  Shield,
  ShieldCheck,
  Sliders,
  Smartphone,
  Sparkles,
  Store,
  Tag,
  X,
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
  addons?: any[];
  onPurchaseAddon?: (addon: any, targetApp?: any) => Promise<void>;
  isPurchasingAddon?: boolean;
  appHasAddon?: (targetApp: any, addon: any) => boolean;
  user?: any;
}

const fallbackCommercialAddons = [
  {
    id: 5,
    name: "Dedicated Admin Panel Access Module",
    slug: "admin_panel_addon",
    price: 299900,
    price_formatted: "₹2,999",
    category: "Management",
    badge: "Admin Panel",
    description:
      "Web-based admin portal for your app. Manage push notification campaigns, live store catalog sync, customer returns/refunds, user analytics, and app configuration.",
    features: [
      "Web management portal access",
      "Push notification composer & history",
      "Live catalog sync trigger",
      "TeraWallet store refunds & order management",
    ],
  },
  {
    id: 6,
    name: "Google Play Store Publishing Bundle (.aab)",
    slug: "play_store_addon",
    price: 199900,
    price_formatted: "₹1,999",
    category: "Publishing",
    badge: "Play Store Build",
    description:
      "Production-ready Google Play Android App Bundle (.aab), Google Play policy compliance guide, and Play Console release assets.",
    features: [
      "Optimized Android App Bundle (.aab)",
      "Google Play Console target SDK 34",
      "Fast-track Store submission review checklist",
      "Play Store listing graphics pack",
    ],
  },
  {
    id: 1,
    name: "Push Notifications Campaign Engine",
    slug: "push_notifications",
    price: 99900,
    price_formatted: "₹999",
    category: "Marketing",
    badge: "Sales Booster",
    description:
      "Send rich media push notifications to customer lock screens, automated abandoned cart recovery triggers, and flash deal deep links.",
    features: [
      "Instant lock-screen broadcasts",
      "Automated cart recovery triggers",
      "Custom product deep links",
      "Real-time delivery & click telemetry",
    ],
  },
  {
    id: 2,
    name: "WhatsApp Automated Order Sync & Chat",
    slug: "whatsapp_sync",
    price: 99900,
    price_formatted: "₹999",
    category: "Support",
    badge: "High Engagement",
    description:
      "Automated WhatsApp order confirmation alerts, live parcel tracking links, and 1-click in-app floating WhatsApp live chat support.",
    features: [
      "Instant order confirmation alerts",
      "Real-time courier tracking updates",
      "Floating in-app chat bubble",
      "Direct staff routing",
    ],
  },
  {
    id: 3,
    name: "Advanced In-App Analytics & Telemetry",
    slug: "analytics",
    price: 129900,
    price_formatted: "₹1,299",
    category: "Analytics",
    badge: "Data Driven",
    description:
      "Deep-dive user session telemetry, product heatmaps, drop-off funnels, and conversion rate optimization metrics.",
    features: [
      "User flow path tracing",
      "Conversion funnel tracking",
      "Product view counters",
      "Google Analytics 4 & Meta Pixel bridge",
    ],
  },
  {
    id: 4,
    name: "Custom App Navigation & Menu Builder",
    slug: "custom_nav",
    price: 149900,
    price_formatted: "₹1,499",
    category: "Customization",
    badge: "UX Polish",
    description:
      "Tailored bottom tab bar items, nested drawer categories, custom icon packs, and dedicated promotional banner carousels.",
    features: [
      "Dynamic bottom tab navigation",
      "Custom brand icon library",
      "Nested category accordions",
      "Promotional slider carousels",
    ],
  },
  {
    id: 7,
    name: "100% White-Label & Custom Splash Screen",
    slug: "white_label",
    price: 99900,
    price_formatted: "₹999",
    category: "Branding",
    badge: "Full Identity",
    description:
      "Completely remove all platform watermarks. Custom animated launch splash screen, custom brand typography, and custom package name.",
    features: [
      "Zero platform watermarks",
      "Custom splash screen animation",
      "Brand typography embedding",
      "Custom application ID / package",
    ],
  },
  {
    id: 8,
    name: "Additional API & ERP Custom Integrations",
    slug: "api_integration",
    price: 299900,
    price_formatted: "₹2,999",
    category: "Infrastructure",
    badge: "Enterprise Ready",
    description:
      "Connect custom warehouse inventory, custom CRM webhooks, private courier tracking endpoints, or specialized payment gateways.",
    features: [
      "Custom REST & webhook endpoints",
      "Warehouse inventory live sync",
      "Private courier tracking bridge",
      "Specialized gateway support",
    ],
  },
];

export function AppDetailsView({
  app,
  currentPlan,
  config,
  isLoadingConfig,
  onBack,
  onNavigateToTab,
  onRebuild,
  isRebuilding,
  addons = [],
  onPurchaseAddon,
  isPurchasingAddon = false,
  appHasAddon,
  user,
}: AppDetailsViewProps) {
  const [addonFilter, setAddonFilter] = useState<"all" | "available" | "active">("all");
  const [selectedAddonForModal, setSelectedAddonForModal] = useState<any | null>(null);
  const [localPurchasedSlugs, setLocalPurchasedSlugs] = useState<string[]>([]);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const readyBuild = app?.builds?.find((b: any) => b.status === "ready" || b.status?.value === "ready") || app?.builds?.[0];
  const latestBuild = readyBuild || app?.builds?.[0];
  const targetBuildId = latestBuild?.id;
  const appConfig = config?.config || config || app?.configs?.[0]?.config || {};

  // Extract branding tokens
  const appName = appConfig?.app?.name || app?.name || "Mobile Application";
  const logoUrl =
    appConfig?.app?.logo_url ||
    appConfig?.theme?.logo_url ||
    (app?.connection?.site_url
      ? `${app?.connection?.site_url?.replace(/\/+$/, "")}/favicon.ico`
      : "");

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
  const isEnterprise = currentPlan?.name === "Enterprise" || currentPlan?.name === "Enterprise Suite";
  const planSlug = (currentPlan?.slug || currentPlan?.name || "").toLowerCase();
  const isPremiumTier =
    planSlug.includes("premium") ||
    planSlug.includes("enterprise") ||
    Boolean(currentPlan?.has_admin_panel);

  const hasAdminPanel = Boolean(
    app?.has_admin_panel ||
    currentPlan?.has_admin_panel ||
    isPremiumTier ||
    localPurchasedSlugs.includes("admin_panel_addon") ||
    (Array.isArray(app?.purchased_addon_slugs) &&
      (app.purchased_addon_slugs.includes("admin_panel_addon") ||
        app.purchased_addon_slugs.includes("admin_panel")))
  );

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
      included: !isStarter || localPurchasedSlugs.includes("play_store_addon"),
      badge: (!isStarter || localPurchasedSlugs.includes("play_store_addon")) ? "Included" : "Requires Pro Tier",
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
      included: hasAdminPanel,
      badge: hasAdminPanel ? "Included & Active" : "Enterprise / Add-on",
    },
    {
      title: "Cryptographic Keystore Signing",
      desc: "2048-bit dedicated tenant RSA keystore with v1, v2, v3 Android signature verification.",
      included: true,
      badge: "Signed",
    },
  ];

  // Consolidate full active addons list
  const availableAddons = (addons && addons.length > 0 ? addons : fallbackCommercialAddons)
    .slice()
    .sort((a: any, b: any) => {
      const getPriority = (item: any) => {
        const slug = (item.slug || "").toLowerCase();
        const name = (item.name || "").toLowerCase();
        if (slug.includes("admin_panel") || name.includes("admin panel")) return 1;
        if (slug.includes("play_store") || name.includes("play store") || name.includes("aab")) return 2;
        return 3;
      };
      return getPriority(a) - getPriority(b);
    });

  const checkIsAddonActive = (addon: any): boolean => {
    if (!addon) return false;
    const slug = (addon.slug || "").toLowerCase();

    // Check local session purchased state
    if (slug && localPurchasedSlugs.includes(slug)) return true;

    // Check external checker
    if (appHasAddon && appHasAddon(app, addon)) return true;

    // Check purchased_addon_ids
    if (Array.isArray(app?.purchased_addon_ids) && app.purchased_addon_ids.includes(addon.id)) {
      return true;
    }

    // Check purchased_addon_slugs
    if (slug && Array.isArray(app?.purchased_addon_slugs) && app.purchased_addon_slugs.includes(slug)) {
      return true;
    }

    // Check inherent plan capabilities
    if (slug.includes("admin_panel") || (addon.badge || "").toLowerCase().includes("admin panel")) {
      if (hasAdminPanel || app?.has_admin_panel) return true;
    }

    if (slug.includes("play_store") || slug.includes("aab") || (addon.badge || "").toLowerCase().includes("play store")) {
      if (!isStarter || app?.can_aab) return true;
    }

    return false;
  };

  const formatPrice = (price: number | string) => {
    const num = typeof price === "string" ? parseFloat(price) : price;
    if (!num || isNaN(num)) return "₹0";
    const rupees = num > 10000 ? Math.round(num / 100) : num;
    return `₹${rupees.toLocaleString("en-IN")}`;
  };

  // Filtered addons
  const filteredAddons = availableAddons.filter((addon) => {
    const isActive = checkIsAddonActive(addon);
    if (addonFilter === "active") return isActive;
    if (addonFilter === "available") return !isActive;
    return true;
  });

  const activeCount = availableAddons.filter(checkIsAddonActive).length;
  const availableCount = availableAddons.length - activeCount;

  const handleExecutePurchase = async (addon: any) => {
    if (!addon) return;
    setIsProcessingCheckout(true);
    setCheckoutMessage(null);

    try {
      if (onPurchaseAddon) {
        await onPurchaseAddon(addon, app);
      }
      // Record locally so UI updates instantaneously
      if (addon.slug) {
        setLocalPurchasedSlugs((prev) => [...prev, addon.slug.toLowerCase()]);
      }
      setCheckoutMessage({
        text: `✓ Add-on "${addon.name}" successfully purchased and provisioned for ${appName}!`,
        type: "success",
      });
      setTimeout(() => {
        setSelectedAddonForModal(null);
      }, 1800);
    } catch (err: any) {
      if (err.message !== "PAYMENT_CANCELLED" && err.message !== "PAYMENT_ALREADY_IN_PROGRESS") {
        setCheckoutMessage({
          text: err.message || "Failed to process add-on purchase.",
          type: "error",
        });
      }
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-fadeIn font-sans">
      {/* ── TOP NAVIGATION & QUICK ACTIONS BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#EBE6DF] rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F7F5F0] hover:bg-[#EFEAE2] text-[#1C1917] text-xs font-bold transition shadow-xs group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#78593D] group-hover:-translate-x-1 transition-transform" />
            <span>Back to Dashboard</span>
          </button>
          <div className="h-6 w-[1px] bg-[#EBE6DF] hidden sm:block" />
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-[#1C1917] tracking-tight">
              Application Overview &amp; Specifications
            </h1>
            <p className="text-xs text-[#7E756B]">
              Detailed breakdown of your selected plan, features, branding, deliverables &amp; modular add-ons.
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* BUY ADD-ONS JUMP BUTTON */}
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("app-addons-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-extrabold transition shadow-sm flex items-center gap-2 cursor-pointer active:scale-98"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-100" />
            <span>Buy Add-ons ({availableCount} Available)</span>
          </button>

          <a
            href={`/api/apps/${app?.ulid}/builds/${targetBuildId}/download-file?format=apk`}
            download
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download APK (v{latestBuild?.version_code || 1})</span>
          </a>

          {hasAdminPanel && (
            <Link
              href={`/dashboard/apps/${app?.ulid}/admin`}
              className="px-4 py-2 bg-gradient-to-r from-[#4A3B32] to-[#2E241E] hover:from-[#3D2F27] hover:to-[#221A15] text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm border border-[#3D2F27]"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-amber-300" />
              <span>Open App Admin Panel</span>
            </Link>
          )}

          <Link
            href={`/dashboard/apps/${app?.ulid}/setup/branding`}
            className="px-4 py-2 border border-[#EBE6DF] hover:border-[#78593D]/30 text-[#1C1917] rounded-xl text-xs font-bold transition flex items-center gap-2 bg-white shadow-2xs"
          >
            <Sliders className="w-3.5 h-3.5 text-[#7E756B]" />
            <span>Edit Branding &amp; Settings</span>
          </Link>

          <button
            type="button"
            onClick={onRebuild}
            disabled={isRebuilding}
            className="p-2 rounded-xl border border-[#EBE6DF] hover:border-[#78593D]/30 text-[#7E756B] hover:text-[#1C1917] transition bg-white shadow-2xs cursor-pointer"
            title="Sync Store Products & Rebuild APK"
          >
            <RefreshCw className={`w-4 h-4 ${isRebuilding ? "animate-spin text-[#78593D]" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── SECTION 1: APP HEADER & STORE SUMMARY ── */}
      <div className="bg-white border border-[#EBE6DF] rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#EBE6DF]">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border border-[#EBE6DF] p-2 flex items-center justify-center shadow-sm flex-shrink-0">
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
                <div className="w-full h-full rounded-xl bg-gradient-to-tr from-[#78593D] to-[#3B2C1E] text-white font-extrabold text-2xl flex items-center justify-center">
                  {appName.charAt(0)}
                </div>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-[#1C1917]">{appName}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {app?.status || "Ready"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#EFEAE2] text-[#78593D] border border-[#78593D]/20">
                  {platform}
                </span>
                {hasAdminPanel && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1">
                    <LayoutDashboard className="w-3 h-3 text-amber-600" />
                    Admin Panel Unlocked
                  </span>
                )}
              </div>
              <p className="text-xs text-[#7E756B] font-mono mt-1">{packageName}</p>
              {storeUrl && (
                <p className="text-xs text-[#57514B] mt-1 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#78593D]" />
                  <span>Store Website:</span>
                  <a
                    href={storeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#78593D] hover:underline font-bold inline-flex items-center gap-0.5"
                  >
                    {storeUrl}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-3 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF] text-right">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#78593D] block">
                Current Plan
              </span>
              <span className="text-base font-black text-[#1C1917] block">{currentPlan?.name || "Pro Combo"}</span>
              <span className="text-[11px] font-bold text-[#78593D]">
                {currentPlan?.price_monthly === 0
                  ? "Free Tier"
                  : `₹${(currentPlan?.price_monthly / 100).toLocaleString("en-IN")} Lifetime`}
              </span>
            </div>
          </div>
        </div>

        {/* Quick App Metadata Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF]/80">
            <span className="text-[10px] font-bold text-[#7E756B] uppercase tracking-wider block">App ULID</span>
            <span className="text-xs font-mono font-bold text-[#1C1917] mt-1 block truncate">
              {app?.ulid || "01M4WVCV6T..."}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF]/80">
            <span className="text-[10px] font-bold text-[#7E756B] uppercase tracking-wider block">Public App Key</span>
            <span className="text-xs font-mono font-bold text-[#1C1917] mt-1 block truncate">
              {app?.app_key ? `${app.app_key.substring(0, 14)}...` : "app_key_••••••••"}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF]/80">
            <span className="text-[10px] font-bold text-[#7E756B] uppercase tracking-wider block">Catalog Sync</span>
            <span className="text-xs font-bold text-emerald-700 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 100% Live Synced
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF]/80">
            <span className="text-[10px] font-bold text-[#7E756B] uppercase tracking-wider block">Version Status</span>
            <span className="text-xs font-bold text-[#78593D] mt-1 flex items-center gap-1">
              <Package className="w-3.5 h-3.5" /> v{latestBuild?.version_code || 1}.0.0 Production
            </span>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: PLAN & PURCHASED PACKAGE DELIVERABLES ── */}
      <div className="bg-white border border-[#EBE6DF] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBE6DF]">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#78593D]" />
              <h3 className="text-base sm:text-lg font-extrabold text-[#1C1917]">
                Purchased Plan &amp; Included Package Deliverables
              </h3>
            </div>
            <p className="text-xs text-[#7E756B] mt-1">
              Summary of all deliverables and platform capabilities active under your current package subscription.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("app-addons-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="px-4 py-2 rounded-xl bg-[#EFEAE2] hover:bg-[#E5DFD5] text-[#78593D] text-xs font-bold transition flex items-center gap-2 border border-[#78593D]/20 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Explore Add-on Upgrades ➔</span>
          </button>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {planFeatures.map((f, i) => (
            <div
              key={i}
              className={`p-4 rounded-2xl border transition flex items-start justify-between gap-3 ${
                f.included
                  ? "bg-[#FDFCFB] border-[#EBE6DF]"
                  : "bg-slate-50/40 border-slate-200/60 opacity-60"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    f.included ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {f.included ? <Check className="w-4 h-4 stroke-[3]" /> : <Lock className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1C1917]">{f.title}</h4>
                  <p className="text-[11px] text-[#7E756B] mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>

              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap ${
                  f.included
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {f.badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 3: MODULAR ADD-ONS & AVAILABLE UPGRADES (OPTION TO BUY ADD-ONS) ── */}
      <div id="app-addons-section" className="bg-white border border-[#EBE6DF] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 scroll-mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBE6DF]">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <h3 className="text-base sm:text-lg font-extrabold text-[#1C1917]">
                Modular Add-ons &amp; Feature Upgrades for {appName}
              </h3>
            </div>
            <p className="text-xs text-[#7E756B] mt-1">
              Select and purchase dedicated add-on modules to empower <strong>{appName}</strong> with admin portal access, Play Store publishing, and customer engagement tools.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-[#F7F5F0] p-1 rounded-2xl border border-[#EBE6DF]">
            <button
              type="button"
              onClick={() => setAddonFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                addonFilter === "all"
                  ? "bg-white text-[#1C1917] shadow-xs"
                  : "text-[#7E756B] hover:text-[#1C1917]"
              }`}
            >
              All Add-ons ({availableAddons.length})
            </button>
            <button
              type="button"
              onClick={() => setAddonFilter("available")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                addonFilter === "available"
                  ? "bg-white text-[#78593D] shadow-xs"
                  : "text-[#7E756B] hover:text-[#1C1917]"
              }`}
            >
              Available to Buy ({availableCount})
            </button>
            <button
              type="button"
              onClick={() => setAddonFilter("active")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                addonFilter === "active"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-[#7E756B] hover:text-[#1C1917]"
              }`}
            >
              Active on App ({activeCount})
            </button>
          </div>
        </div>

        {/* Success / Error notification */}
        {checkoutMessage && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in ${
              checkoutMessage.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                : "bg-rose-50 text-rose-900 border-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{checkoutMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setCheckoutMessage(null)}
              className="text-xs hover:opacity-75 font-black"
            >
              &times;
            </button>
          </div>
        )}

        {/* Add-ons Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredAddons.map((addon: any) => {
            const isActive = checkIsAddonActive(addon);
            const isPlayStore =
              addon.slug?.includes("play_store") ||
              addon.badge?.toLowerCase().includes("play store") ||
              addon.name?.toLowerCase().includes("play store");
            const isAdminPanel =
              addon.slug?.includes("admin_panel") ||
              addon.badge?.toLowerCase().includes("admin panel") ||
              addon.name?.toLowerCase().includes("admin panel");
            const isWhatsApp =
              addon.slug?.includes("whatsapp") ||
              addon.badge?.toLowerCase().includes("whatsapp") ||
              addon.name?.toLowerCase().includes("whatsapp");

            return (
              <div
                key={addon.id}
                className={`bg-white rounded-3xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between border ${
                  isActive
                    ? "border-emerald-300 ring-1 ring-emerald-200 bg-gradient-to-b from-white to-emerald-50/20"
                    : isAdminPanel || isPlayStore
                    ? "border-[#78593D]/30 ring-1 ring-[#78593D]/10 bg-gradient-to-b from-white to-[#FDFCFB]"
                    : "border-[#EBE6DF] hover:border-[#78593D]/30"
                }`}
              >
                <div>
                  {/* Card Header Badges */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        isActive
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : isAdminPanel
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : isPlayStore
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-[#EFEAE2] text-[#78593D] border border-[#78593D]/20"
                      }`}
                    >
                      {isActive ? `✓ Active on ${appName}` : addon.badge || (isAdminPanel ? "Admin Panel" : isPlayStore ? "Play Store Build" : "Add-on Module")}
                    </span>

                    {isActive ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : isAdminPanel ? (
                      <LayoutDashboard className="w-4 h-4 text-amber-700 flex-shrink-0" />
                    ) : isPlayStore ? (
                      <Rocket className="w-4 h-4 text-[#78593D] flex-shrink-0" />
                    ) : isWhatsApp ? (
                      <MessageSquare className="w-4 h-4 text-[#78593D] flex-shrink-0" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-extrabold text-sm text-[#1C1917] leading-snug">
                    {addon.name}
                  </h3>
                  <p className="text-xs text-[#57514B] mt-2 line-clamp-3 leading-relaxed">
                    {addon.description}
                  </p>

                  {/* Key Features Preview */}
                  {Array.isArray(addon.features) && addon.features.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-[#EBE6DF]/70 space-y-1.5">
                      {addon.features.slice(0, 3).map((f: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[11px] text-[#57514B]">
                          <Check className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                          <span className="truncate">{f}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pricing & Purchase Button */}
                <div className="mt-5 pt-4 border-t border-[#EBE6DF] flex items-center justify-between gap-2">
                  <div>
                    <span className="text-base font-black text-[#1C1917] block">
                      {formatPrice(addon.price)}
                    </span>
                    <span className="text-[10px] text-[#7E756B] block">Lifetime License</span>
                  </div>

                  {isActive ? (
                    isAdminPanel ? (
                      <Link
                        href={`/dashboard/apps/${app?.ulid}/admin`}
                        className="px-3.5 py-2 rounded-xl bg-[#2E241E] hover:bg-[#1C1917] text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5 text-amber-300" />
                        <span>Open Panel</span>
                      </Link>
                    ) : (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold text-[11px] flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                        <span>Active</span>
                      </span>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAddonForModal(addon);
                        setCheckoutMessage(null);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#78593D] hover:bg-[#634932] text-white font-extrabold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-98"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                      <span>Buy Add-on</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 4: BRANDING IDENTITY & LOGO CONFIGURATION ── */}
      <div className="bg-white border border-[#EBE6DF] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBE6DF]">
          <div>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-[#78593D]" />
              <h3 className="text-base sm:text-lg font-extrabold text-[#1C1917]">
                Brand Identity, Theme &amp; Selected Logo
              </h3>
            </div>
            <p className="text-xs text-[#7E756B] mt-1">
              Customized visual appearance configured for your mobile application.
            </p>
          </div>

          <Link
            href={`/dashboard/apps/${app?.ulid}/setup/branding`}
            className="px-4 py-2 rounded-xl border border-[#EBE6DF] hover:border-[#78593D]/30 text-[#1C1917] text-xs font-bold transition flex items-center gap-2 bg-[#F7F5F0]"
          >
            <span>Change Logo &amp; Colors</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Logo Tile */}
          <div className="p-5 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF] flex flex-col items-center text-center justify-center space-y-3">
            <span className="text-[11px] font-bold text-[#7E756B] uppercase tracking-wider">
              Selected Mobile Logo
            </span>
            <div className="w-24 h-24 rounded-2xl bg-white border border-[#EBE6DF] p-2.5 flex items-center justify-center shadow-xs">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="App Logo"
                  className="w-full h-full object-contain rounded-xl"
                />
              ) : (
                <div className="w-full h-full rounded-xl bg-[#78593D] text-white font-black text-3xl flex items-center justify-center">
                  {appName.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <span className="text-xs font-bold text-[#1C1917] block">{appName}</span>
              <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                Embedded in Header &amp; Launch Screen
              </span>
            </div>
          </div>

          {/* Color Tokens */}
          <div className="p-5 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF] space-y-4">
            <span className="text-[11px] font-bold text-[#7E756B] uppercase tracking-wider block">
              Color Palette
            </span>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#EBE6DF]">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg border border-[#EBE6DF] shadow-xs"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <div>
                    <span className="text-xs font-bold text-[#1C1917] block">Primary Brand Color</span>
                    <span className="text-[10px] text-[#7E756B] font-mono block">{primaryColor}</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#78593D] uppercase">Buttons &amp; Badges</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#EBE6DF]">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg border border-[#EBE6DF] shadow-xs"
                    style={{ backgroundColor: secondaryColor }}
                  />
                  <div>
                    <span className="text-xs font-bold text-[#1C1917] block">Secondary Accent Color</span>
                    <span className="text-[10px] text-[#7E756B] font-mono block">{secondaryColor}</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#78593D] uppercase">Wishlist &amp; Sales</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#EBE6DF]">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg border border-[#EBE6DF] shadow-xs"
                    style={{ backgroundColor: surfaceColor }}
                  />
                  <div>
                    <span className="text-xs font-bold text-[#1C1917] block">Surface &amp; Background</span>
                    <span className="text-[10px] text-[#7E756B] font-mono block">{surfaceColor}</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#78593D] uppercase">App Canvas</span>
              </div>
            </div>
          </div>

          {/* Typography & Layout */}
          <div className="p-5 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF] space-y-4">
            <span className="text-[11px] font-bold text-[#7E756B] uppercase tracking-wider block">
              Typography &amp; Layout
            </span>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-white border border-[#EBE6DF] flex justify-between items-center">
                <span className="text-[#7E756B]">Font Family:</span>
                <span className="font-bold text-[#1C1917]">{font}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#EBE6DF] flex justify-between items-center">
                <span className="text-[#7E756B]">Corner Radius:</span>
                <span className="font-bold text-[#1C1917]">{radius}px rounded corners</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#EBE6DF] flex justify-between items-center">
                <span className="text-[#7E756B]">Navigation Style:</span>
                <span className="font-bold text-[#1C1917]">Bottom Navigation Bar</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#EBE6DF] flex justify-between items-center">
                <span className="text-[#7E756B]">Theme Layout:</span>
                <span className="font-bold text-[#78593D] uppercase">{layoutScheme}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 5: STORE CAPABILITIES & MOBILE INTEGRATIONS ── */}
      <div className="bg-white border border-[#EBE6DF] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-[#78593D]" />
            <h3 className="text-base sm:text-lg font-extrabold text-[#1C1917]">
              Active Mobile Store Capabilities
            </h3>
          </div>
          <p className="text-xs text-[#7E756B] mt-1">
            Core eCommerce features bundled into your compiled mobile application.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF] text-xs space-y-1.5">
            <span className="font-extrabold text-[#1C1917] block flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>WooCommerce Store Sync</span>
            </span>
            <p className="text-[11px] text-[#7E756B] leading-relaxed">
              Real-time catalog synchronization pulling products, categories, images, and live pricing directly from your website.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF] text-xs space-y-1.5">
            <span className="font-extrabold text-[#1C1917] block flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Interactive Wishlist</span>
            </span>
            <p className="text-[11px] text-[#7E756B] leading-relaxed">
              Client-side persistent wishlist with real-time top bar badge counter and quick item add/remove actions.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF] text-xs space-y-1.5">
            <span className="font-extrabold text-[#1C1917] block flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Cart &amp; Instant Checkout</span>
            </span>
            <p className="text-[11px] text-[#7E756B] leading-relaxed">
              Cart quantity adjustments, discount calculations, and seamless pass-through to your WooCommerce payment gateways.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF] text-xs space-y-1.5">
            <span className="font-extrabold text-[#1C1917] block flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Instant Search &amp; Categories</span>
            </span>
            <p className="text-[11px] text-[#7E756B] leading-relaxed">
              Fast live filtering across products with responsive category badge navigation and multi-column grid layouts.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF] text-xs space-y-1.5">
            <span className="font-extrabold text-[#1C1917] block flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Offline Product Cache</span>
            </span>
            <p className="text-[11px] text-[#7E756B] leading-relaxed">
              Local device storage caching for sub-second page browsing even when mobile internet is slow or intermittent.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF] text-xs space-y-1.5">
            <span className="font-extrabold text-[#1C1917] block flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Responsive Phone &amp; Tablet UI</span>
            </span>
            <p className="text-[11px] text-[#7E756B] leading-relaxed">
              Fluid viewport auto-scaling optimized across Android devices from 5.5&quot; handhelds to large 11&quot; Android tablets.
            </p>
          </div>
        </div>
      </div>

      {/* ── SECTION 6: TECHNICAL BUILD & KEYSTORE SECURITY ── */}
      <div className="bg-white border border-[#EBE6DF] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-[#78593D]" />
            <h3 className="text-base sm:text-lg font-extrabold text-[#1C1917]">
              Technical Build Engine &amp; Keystore Security
            </h3>
          </div>
          <p className="text-xs text-[#7E756B] mt-1">
            Android native compilation parameters and security certificates.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF] text-xs">
            <span className="text-[#7E756B] font-semibold block">Min Android SDK</span>
            <strong className="text-[#1C1917] font-bold mt-1 block">Android 7.0 (API 24)</strong>
            <span className="text-[10px] text-[#7E756B] mt-0.5 block">Supports 98.7% of Android devices</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF] text-xs">
            <span className="text-[#7E756B] font-semibold block">Target Android SDK</span>
            <strong className="text-[#1C1917] font-bold mt-1 block">Android 14 (API 34)</strong>
            <span className="text-[10px] text-emerald-700 mt-0.5 block font-semibold">Google Play 2026 Compliant</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF] text-xs">
            <span className="text-[#7E756B] font-semibold block">Keystore &amp; Signatures</span>
            <strong className="text-[#1C1917] font-bold mt-1 block">v1, v2, v3 Cryptographic</strong>
            <span className="text-[10px] text-[#78593D] mt-0.5 block font-semibold">2048-bit RSA Dedicated</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF] text-xs">
            <span className="text-[#7E756B] font-semibold block">Architecture</span>
            <strong className="text-[#1C1917] font-bold mt-1 block">Universal ARM64 / x86_64</strong>
            <span className="text-[10px] text-[#7E756B] mt-0.5 block">64-bit Optimized Bytecode</span>
          </div>
        </div>
      </div>

      {/* ── BOTTOM BACK TO DASHBOARD ACTION BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-[#F7F5F0] border border-[#EBE6DF]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#78593D] hover:bg-[#634932] text-white text-xs font-bold transition shadow-xs group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Dashboard</span>
          </button>
          <span className="text-xs text-[#57514B] font-medium">
            Return to your main apps, builds, and billing overview.
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* BUY ADD-ONS BOTTOM JUMP */}
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("app-addons-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-100" />
            <span>Buy Add-ons</span>
          </button>

          {hasAdminPanel && (
            <Link
              href={`/dashboard/apps/${app?.ulid}/admin`}
              className="px-4 py-2.5 bg-gradient-to-r from-[#4A3B32] to-[#2E241E] hover:from-[#3D2F27] hover:to-[#221A15] text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm border border-[#3D2F27]"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-amber-300" />
              <span>Open App Admin Panel</span>
            </Link>
          )}

          <a
            href={`/api/apps/${app?.ulid}/builds/${targetBuildId}/download-file?format=apk`}
            download
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download APK</span>
          </a>
        </div>
      </div>

      {/* ── ADD-ON PURCHASE CONFIRMATION MODAL ── */}
      {selectedAddonForModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            if (!isProcessingCheckout && !isPurchasingAddon) {
              setSelectedAddonForModal(null);
              setCheckoutMessage(null);
            }
          }}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white border border-[#EBE6DF] shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#EFEAE2] text-[#78593D] border border-[#78593D]/20">
                      {selectedAddonForModal.badge || "Add-on Module"}
                    </span>
                    <span className="text-[10px] font-bold text-[#7E756B]">Lifetime License</span>
                  </div>
                  <h3 className="font-black text-lg text-[#1C1917] mt-0.5">
                    {selectedAddonForModal.name}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedAddonForModal(null);
                  setCheckoutMessage(null);
                }}
                disabled={isProcessingCheckout || isPurchasingAddon}
                className="w-8 h-8 rounded-full border border-[#EBE6DF] hover:bg-[#F7F5F0] text-[#7E756B] flex items-center justify-center font-bold transition disabled:opacity-50 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-[#57514B] leading-relaxed">
              {selectedAddonForModal.description}
            </p>

            {/* Included Features */}
            {Array.isArray(selectedAddonForModal.features) && selectedAddonForModal.features.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-[#FDFCFB] border border-[#EBE6DF] space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#78593D] block">
                  Included Capabilities:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedAddonForModal.features.map((feat: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-[#1C1917] font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="truncate">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Target Application Confirmation */}
            <div className="p-3.5 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#EBE6DF] p-1.5 flex items-center justify-center flex-shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt={appName} className="w-full h-full object-contain rounded-lg" />
                ) : (
                  <span className="font-extrabold text-sm text-[#78593D]">{appName.charAt(0)}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-[#1C1917] truncate">{appName}</span>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Target App
                  </span>
                </div>
                <span className="text-[11px] text-[#7E756B] block truncate mt-0.5">
                  {storeUrl || packageName}
                </span>
              </div>
            </div>

            {/* Price & Billing Summary */}
            <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#7E756B] block">Total Payable Amount</span>
                <span className="text-xl font-black text-[#1C1917] block">
                  {formatPrice(selectedAddonForModal.price)}
                </span>
              </div>
              <span className="text-xs font-bold text-[#78593D] bg-white border border-[#EBE6DF] px-3 py-1.5 rounded-xl">
                One-Time Lifetime Fee
              </span>
            </div>

            {/* Checkout Feedback */}
            {checkoutMessage && (
              <div
                className={`p-3 rounded-xl border text-xs font-bold ${
                  checkoutMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                    : "bg-rose-50 text-rose-900 border-rose-300"
                }`}
              >
                {checkoutMessage.text}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedAddonForModal(null);
                  setCheckoutMessage(null);
                }}
                disabled={isProcessingCheckout || isPurchasingAddon}
                className="py-3 px-4 rounded-xl border border-[#EBE6DF] text-xs font-bold hover:bg-[#F7F5F0] text-[#1C1917] transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleExecutePurchase(selectedAddonForModal)}
                disabled={isProcessingCheckout || isPurchasingAddon}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#78593D] to-[#5A422D] hover:from-[#654A32] hover:to-[#4A3624] disabled:opacity-50 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer active:scale-98"
              >
                {isProcessingCheckout || isPurchasingAddon ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 text-amber-200" />
                    <span>Pay {formatPrice(selectedAddonForModal.price)} via Razorpay</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
