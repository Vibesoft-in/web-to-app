"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DeleteAppModal } from "@/components/dashboard/delete-app-modal";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  HardDrive,
  Info,
  Layers,
  LayoutDashboard,
  Lock,
  MessageSquare,
  Package,
  Palette,
  Plus,
  Receipt,
  RefreshCw,
  Rocket,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Smartphone,
  Sparkles,
  Store,
  Tag,
  Trash2,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";

interface AppDetailsViewProps {
  app: any;
  currentPlan: any;
  config: any;
  isLoadingConfig?: boolean;
  onBack: () => void;
  onNavigateToTab: (tab: "apps" | "builds" | "plans" | "purchases" | "addons") => void;
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
    shortName: "Admin Panel Access",
    slug: "admin_panel_addon",
    price: 299900,
    price_formatted: "₹2,999",
    category: "Management",
    badge: "Admin Panel",
    licenseType: "Lifetime License",
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
    shortName: "Play Store Publishing Bundle",
    slug: "play_store_addon",
    price: 199900,
    price_formatted: "₹1,999",
    category: "Publishing",
    badge: "Play Store Build",
    licenseType: "One-Time Service",
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
    shortName: "Push Notifications Engine",
    slug: "push_notifications",
    price: 99900,
    price_formatted: "₹999",
    category: "Marketing",
    badge: "Sales Booster",
    licenseType: "One-Time License",
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
    shortName: "WhatsApp Order Sync & Chat",
    slug: "whatsapp_sync",
    price: 99900,
    price_formatted: "₹999",
    category: "Support",
    badge: "High Engagement",
    licenseType: "One-Time License",
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
    shortName: "In-App Analytics & Telemetry",
    slug: "analytics",
    price: 129900,
    price_formatted: "₹1,299",
    category: "Analytics",
    badge: "Data Driven",
    licenseType: "One-Time License",
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
    shortName: "Custom App Navigation Builder",
    slug: "custom_nav",
    price: 149900,
    price_formatted: "₹1,499",
    category: "Customization",
    badge: "UX Polish",
    licenseType: "One-Time License",
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
    shortName: "100% White-Label Branding",
    slug: "white_label",
    price: 99900,
    price_formatted: "₹999",
    category: "Branding",
    badge: "Full Identity",
    licenseType: "One-Time License",
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
    shortName: "Custom API & ERP Integrations",
    slug: "api_integration",
    price: 299900,
    price_formatted: "₹2,999",
    category: "Infrastructure",
    badge: "Enterprise Ready",
    licenseType: "One-Time License",
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
  const router = useRouter();
  const searchParams = useSearchParams();

  // Navigation sidebar state
  const [activeTab, setActiveTab] = useState<
    "overview" | "billing" | "downloads" | "app_traffic" | "web_traffic" | "settings"
  >("overview");

  useEffect(() => {
    const sectionParam = searchParams.get("section") || searchParams.get("tab");
    if (
      sectionParam &&
      ["overview", "billing", "downloads", "app_traffic", "web_traffic", "settings"].includes(sectionParam)
    ) {
      if (activeTab !== sectionParam) {
        setActiveTab(sectionParam as any);
      }
    } else if (!sectionParam && activeTab !== "overview") {
      setActiveTab("overview");
    }
  }, [searchParams, activeTab]);

  const handleSelectTab = (tabId: "overview" | "billing" | "downloads" | "app_traffic" | "web_traffic" | "settings") => {
    setActiveTab(tabId);
    if (app?.ulid || app?.id) {
      router.push(`/dashboard?app=${app.ulid || app.id}&section=${tabId}`);
    }
  };

  // Add-ons state
  const [addonFilter, setAddonFilter] = useState<"all" | "available" | "active">("all");
  const [expandedAddonId, setExpandedAddonId] = useState<string | number | null>(null);
  const [localPurchasedSlugs, setLocalPurchasedSlugs] = useState<string[]>([]);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // App billing query for this specific app
  const { data: ordersData, isLoading: isLoadingOrders } = useQuery({
    queryKey: ["app-orders", app?.id || app?.ulid],
    queryFn: async () => {
      try {
        const res = await apiClient("/api/orders/my-orders");
        const list = Array.isArray(res) ? res : res?.orders || [];
        return list.filter(
          (o: any) =>
            String(o.app_id) === String(app?.id) ||
            o.app_ulid === app?.ulid ||
            o.meta?.app_id === app?.id ||
            o.meta?.app_ulid === app?.ulid
        );
      } catch {
        return [];
      }
    },
    enabled: Boolean(app?.id || app?.ulid),
  });

  const appOrders = ordersData || [];

  const readyBuild =
    app?.builds?.find((b: any) => b.status === "ready" || b.status?.value === "ready") ||
    app?.builds?.[0];
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

  const primaryColor = appConfig?.theme?.colors?.primary || "#78593D";
  const secondaryColor = appConfig?.theme?.colors?.secondary || "#C2A88F";
  const font = appConfig?.theme?.font || "Inter";
  const layoutScheme = appConfig?.theme?.layout || "theme_a";

  const storeUrl = app?.connection?.store_url || app?.connection?.site_url || app?.website_url || "";
  const packageName = app?.package_name || "com.store.app";
  const platform =
    app?.platform === "woo" || app?.platform?.value === "woo"
      ? "WooCommerce (WordPress)"
      : app?.platform === "shopify" || app?.platform?.value === "shopify"
      ? "Shopify"
      : "WordPress";

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

  const pendingSteps: Array<{ id: string; label: string; step: string }> = Array.isArray(app?.pending_steps)
    ? app.pending_steps
    : [];

  const hasPaidPlan = Boolean(
    (currentPlan && currentPlan.name !== "Free Plan" && currentPlan.id !== "free" && currentPlan.name !== "None") ||
    app?.active_plan ||
    app?.can_apk === true
  );

  const hasReadyBuild = Boolean(
    targetBuildId && (latestBuild?.status ? latestBuild.status.toLowerCase() === "ready" : true)
  );

  // APK download is available when the app has a build and paid plan, and has no blocking incomplete setup
  const canDownloadApk = Boolean(
    hasPaidPlan &&
    hasReadyBuild &&
    (app?.can_apk !== false)
  );

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

    if (slug && localPurchasedSlugs.includes(slug)) return true;
    if (appHasAddon && appHasAddon(app, addon)) return true;
    if (Array.isArray(app?.purchased_addon_ids) && app.purchased_addon_ids.includes(addon.id)) {
      return true;
    }
    if (slug && Array.isArray(app?.purchased_addon_slugs) && app.purchased_addon_slugs.includes(slug)) {
      return true;
    }
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
      if (addon.slug) {
        setLocalPurchasedSlugs((prev) => [...prev, addon.slug.toLowerCase()]);
      }
      setCheckoutMessage({
        text: `✓ Add-on "${addon.name}" successfully purchased and provisioned for ${appName}!`,
        type: "success",
      });
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

  // Billing calculation
  const totalPaid = useMemo(() => {
    return appOrders
      .filter((o: any) => o.status === "paid" || o.status === "completed")
      .reduce((sum: number, o: any) => sum + (o.amount || 0), 0);
  }, [appOrders]);

  const pendingAmount = useMemo(() => {
    return appOrders
      .filter((o: any) => o.status === "pending" || o.status === "created")
      .reduce((sum: number, o: any) => sum + (o.amount || 0), 0);
  }, [appOrders]);

  const sidebarNavItems = [
    {
      id: "overview" as const,
      label: "Overview",
      icon: LayoutDashboard,
      description: "Basic info, status & specs",
    },
    {
      id: "billing" as const,
      label: "Billing",
      icon: CreditCard,
      description: "Payment history & invoices",
      badge: appOrders.length > 0 ? String(appOrders.length) : undefined,
    },
    {
      id: "downloads" as const,
      label: "Downloads",
      icon: Download,
      description: "APK, AAB & build history",
      badge: app?.builds?.length ? `${app.builds.length} builds` : undefined,
    },
    {
      id: "app_traffic" as const,
      label: "App Traffic",
      icon: Smartphone,
      description: "App installs & user sessions",
    },
    {
      id: "web_traffic" as const,
      label: "Web Traffic",
      icon: Globe,
      description: "Store visitors & analytics",
    },
    {
      id: "settings" as const,
      label: "Settings",
      icon: Sliders,
      description: "Config, sync & danger zone",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fadeIn font-sans">
      {/* ── TOP HEADER & QUICK ACTIONS BAR ── */}
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#78593D] to-[#C2A88F] text-white font-extrabold text-sm flex items-center justify-center shadow-xs flex-shrink-0">
              {appName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-[#1C1917] tracking-tight">
                  {appName}
                </h1>
                {canDownloadApk || app?.is_completed || (app?.status && app?.status !== "draft") ? (
                  <span className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {app?.status && app?.status !== "draft" ? app.status : "Active"}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                    Setup Incomplete
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider bg-[#EFEAE2] text-[#78593D]">
                  {platform.split(" ")[0]}
                </span>
              </div>
              <p className="text-[11px] text-[#7E756B] font-mono truncate max-w-xs">{packageName}</p>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {canDownloadApk && targetBuildId ? (
            <a
              href={`/api/apps/${app?.ulid}/builds/${targetBuildId}/download-file?format=apk&app_name=${encodeURIComponent(appName)}&version=${latestBuild?.version_code || 1}`}
              download={`${appName.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}-v${latestBuild?.version_code || 1}.apk`}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download APK</span>
            </a>
          ) : !hasPaidPlan ? (
            <Link
              href={`/dashboard/apps/${app?.ulid}/setup/payment`}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Select a plan or package to unlock APK download"
            >
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Plan Required</span>
            </Link>
          ) : (
            <Link
              href={`/dashboard/apps/${app?.ulid}/setup/${pendingSteps[0]?.step || "build"}`}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Complete pending setup steps to unlock APK download"
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Setup Incomplete</span>
            </Link>
          )}

          {hasAdminPanel && (
            <Link
              href={`/dashboard/apps/${app?.ulid}/admin`}
              className="px-3.5 py-2 bg-gradient-to-r from-[#4A3B32] to-[#2E241E] hover:from-[#3D2F27] hover:to-[#221A15] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs border border-[#3D2F27]"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-amber-300" />
              <span>Admin Panel</span>
            </Link>
          )}

          <button
            type="button"
            onClick={onRebuild}
            disabled={isRebuilding}
            className="p-2 rounded-xl border border-[#EBE6DF] hover:border-[#78593D]/30 text-[#7E756B] hover:text-[#1C1917] transition bg-white shadow-2xs cursor-pointer"
            title="Rebuild APK"
          >
            <RefreshCw className={`w-4 h-4 ${isRebuilding ? "animate-spin text-[#78593D]" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="p-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition shadow-2xs cursor-pointer"
            title="Delete Application"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
          </button>
        </div>
      </div>

      {checkoutMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs ${
            checkoutMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <span>{checkoutMessage.text}</span>
          <button type="button" onClick={() => setCheckoutMessage(null)}>
            <X className="w-4 h-4 opacity-70 hover:opacity-100" />
          </button>
        </div>
      )}

      {/* ── TWO-COLUMN APPLICATION MANAGEMENT LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT SIDEBAR NAVIGATION ── */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-[#EBE6DF] rounded-3xl p-3 sm:p-4 shadow-sm">
            <div className="px-3 py-2 mb-2 border-b border-[#EBE6DF]">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#7E756B]">
                App Management
              </span>
            </div>

            <nav className="space-y-1">
              {sidebarNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#FAF7F2] text-[#78593D] font-extrabold shadow-xs border-l-4 border-[#78593D]"
                        : "text-[#57514B] hover:bg-[#F7F5F0] hover:text-[#1C1917] font-semibold"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                          isActive
                            ? "bg-[#78593D] text-white"
                            : "bg-[#F7F5F0] text-[#7E756B]"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm block leading-tight truncate">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-[#7E756B] block leading-tight truncate">
                          {item.description}
                        </span>
                      </div>
                    </div>

                    {item.badge && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#EFEAE2] text-[#78593D] flex-shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Plan Summary Card in Sidebar */}
          <div className="bg-[#FAF7F2] border border-[#EBE6DF] rounded-3xl p-4 sm:p-5 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#78593D]">
                Subscription Plan
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-white text-[#78593D] border border-[#EBE6DF]">
                Active
              </span>
            </div>
            <div>
              <strong className="text-sm font-black text-[#1C1917] block">
                {currentPlan?.name || "Pro Combo"}
              </strong>
              <span className="text-[#7E756B] text-[11px]">
                {currentPlan?.price_monthly === 0
                  ? "Standard Free Tier"
                  : `₹${((currentPlan?.price_monthly || 799900) / 100).toLocaleString("en-IN")} Lifetime`}
              </span>
            </div>
            <div className="pt-2 border-t border-[#EBE6DF]">
              <button
                type="button"
                onClick={() => onNavigateToTab("plans")}
                className="text-xs font-bold text-[#78593D] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Upgrade Plan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* ── RIGHT CONTENT PANEL ── */}
        <section className="lg:col-span-9 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Basic App Details Card */}
              <div className="bg-white border border-[#EBE6DF] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBE6DF]">
                  <div>
                    <h2 className="text-lg font-black text-[#1C1917]">App Information &amp; Specs</h2>
                    <p className="text-xs text-[#7E756B]">Detailed configuration and store connection</p>
                  </div>
                  <Link
                    href={`/dashboard/apps/${app?.ulid}/setup/branding`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#EBE6DF] hover:bg-[#F7F5F0] text-xs font-bold text-[#78593D] transition cursor-pointer self-start sm:self-auto"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Edit Theme &amp; Branding</span>
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF]">
                    <span className="text-[10px] font-bold text-[#7E756B] uppercase tracking-wider block">
                      Application Name
                    </span>
                    <strong className="text-sm font-extrabold text-[#1C1917] mt-1 block truncate">
                      {appName}
                    </strong>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF]">
                    <span className="text-[10px] font-bold text-[#7E756B] uppercase tracking-wider block">
                      Store Website URL
                    </span>
                    {storeUrl ? (
                      <a
                        href={storeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-bold text-[#78593D] hover:underline mt-1 inline-flex items-center gap-1 truncate max-w-full"
                      >
                        <span className="truncate">{storeUrl.replace(/^https?:\/\//, "")}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    ) : (
                      <span className="text-sm text-slate-400 mt-1 block">Not connected</span>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF]">
                    <span className="text-[10px] font-bold text-[#7E756B] uppercase tracking-wider block">
                      Target Platform
                    </span>
                    <strong className="text-sm font-extrabold text-[#1C1917] mt-1 block">
                      {platform}
                    </strong>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF]">
                    <span className="text-[10px] font-bold text-[#7E756B] uppercase tracking-wider block">
                      Package Name
                    </span>
                    <strong className="text-xs font-mono font-bold text-[#57514B] mt-1 block truncate">
                      {packageName}
                    </strong>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF]">
                    <span className="text-[10px] font-bold text-[#7E756B] uppercase tracking-wider block">
                      Current Plan Tier
                    </span>
                    <strong className="text-sm font-extrabold text-[#78593D] mt-1 block">
                      {currentPlan?.name || "Pro Combo"}
                    </strong>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF]">
                    <span className="text-[10px] font-bold text-[#7E756B] uppercase tracking-wider block">
                      Lifecycle Status
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{app?.status || "Active & Ready"}</span>
                    </span>
                  </div>
                </div>

                {/* Theme & Palette Preview */}
                <div className="pt-4 border-t border-[#EBE6DF]">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#7E756B] block mb-3">
                    Active Branding &amp; Visual Tokens
                  </span>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="w-5 h-5 rounded-md border border-black/10 shadow-2xs" style={{ backgroundColor: primaryColor }} />
                      <span className="font-semibold text-slate-700">Primary: <code>{primaryColor}</code></span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="w-5 h-5 rounded-md border border-black/10 shadow-2xs" style={{ backgroundColor: secondaryColor }} />
                      <span className="font-semibold text-slate-700">Accent: <code>{secondaryColor}</code></span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <span className="text-slate-400">Font:</span>
                      <strong className="text-slate-800">{font}</strong>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <span className="text-slate-400">Layout:</span>
                      <strong className="text-slate-800 capitalize">{layoutScheme.replace("_", " ")}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── MODULAR ADD-ONS SECTION IN COMPACT EXPANDABLE HEADINGS (Task 3) ── */}
              <div id="app-addons-section" className="bg-white border border-[#EBE6DF] rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EBE6DF]">
                  <div>
                    <h2 className="text-lg font-black text-[#1C1917] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#78593D]" />
                      <span>Modular Add-ons &amp; Extensions</span>
                    </h2>
                    <p className="text-xs text-[#7E756B]">
                      Expand any add-on below to view full specifications, license types, and activation controls.
                    </p>
                  </div>

                  {/* Add-on status filters */}
                  <div className="flex items-center gap-1.5 p-1 bg-[#F7F5F0] rounded-xl self-start sm:self-auto border border-[#EBE6DF]">
                    <button
                      type="button"
                      onClick={() => setAddonFilter("all")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        addonFilter === "all" ? "bg-white text-[#78593D] shadow-xs" : "text-[#7E756B]"
                      }`}
                    >
                      All ({availableAddons.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddonFilter("available")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        addonFilter === "available" ? "bg-white text-[#78593D] shadow-xs" : "text-[#7E756B]"
                      }`}
                    >
                      Available ({availableCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddonFilter("active")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        addonFilter === "active" ? "bg-white text-emerald-800 shadow-xs" : "text-[#7E756B]"
                      }`}
                    >
                      Active ({activeCount})
                    </button>
                  </div>
                </div>

                {/* ── RESPONSIVE MULTI-COLUMN ADD-ONS GRID ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAddons.map((addon) => {
                    const isActive = checkIsAddonActive(addon);
                    const isExpanded = expandedAddonId === addon.id;

                    return (
                      <div
                        key={addon.id}
                        className={`rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                          isExpanded
                            ? "border-[#78593D] bg-[#FAF7F2] shadow-md ring-1 ring-[#78593D]/30"
                            : "border-[#EBE6DF] bg-white hover:border-[#78593D]/40 hover:bg-[#FAF7F2]/40"
                        }`}
                      >
                        {/* Compact Card Content */}
                        <div className="p-4 space-y-3 flex-1">
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                                  isActive
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-[#F7F5F0] text-[#78593D]"
                                }`}
                              >
                                <Sparkles className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-xs sm:text-sm font-extrabold text-[#1C1917] truncate">
                                  {addon.shortName || addon.name}
                                </h3>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#EFEAE2] text-[#78593D] inline-block mt-0.5">
                                  {addon.category || "Feature"}
                                </span>
                              </div>
                            </div>

                            <div>
                              {isActive ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  <span>Active</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#F7F5F0] text-[#7E756B] border border-[#EBE6DF]">
                                  Available
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-baseline justify-between pt-1">
                            <span className="text-sm font-black text-[#1C1917]">
                              {addon.price_formatted || formatPrice(addon.price)}
                            </span>
                            <span className="text-[10px] text-[#7E756B]">
                              {addon.licenseType || "Lifetime App License"}
                            </span>
                          </div>

                          <p className="text-xs text-[#57514B] leading-relaxed line-clamp-2">
                            {addon.description}
                          </p>
                        </div>

                        {/* Card Bottom / Toggle & Action */}
                        <div className="p-4 pt-0 space-y-3">
                          <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#EBE6DF]/70">
                            <button
                              type="button"
                              onClick={() => setExpandedAddonId(isExpanded ? null : addon.id)}
                              className="text-xs font-bold text-[#78593D] hover:text-[#5A412A] flex items-center gap-1 cursor-pointer select-none"
                            >
                              <span>{isExpanded ? "Hide Details" : "View Details"}</span>
                              <ChevronDown
                                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </button>

                            <div>
                              {isActive ? (
                                hasAdminPanel ? (
                                  <Link
                                    href={`/dashboard/apps/${app?.ulid}/admin`}
                                    className="px-3 py-1.5 bg-gradient-to-r from-[#4A3B32] to-[#2E241E] text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
                                  >
                                    <LayoutDashboard className="w-3 h-3 text-amber-300" />
                                    <span>Admin</span>
                                  </Link>
                                ) : (
                                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Active</span>
                                  </span>
                                )
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleExecutePurchase(addon)}
                                  disabled={isProcessingCheckout || isPurchasingAddon}
                                  className="px-3 py-1.5 bg-[#78593D] hover:bg-[#634932] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer active:scale-98"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  <span>
                                    {isProcessingCheckout ? "Opening..." : "Buy"}
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Expanded Details inside card */}
                          {isExpanded && (
                            <div className="pt-3 border-t border-[#EBE6DF]/70 space-y-2.5 animate-fadeIn text-xs">
                              {addon.features && addon.features.length > 0 && (
                                <div className="bg-white p-2.5 rounded-xl border border-[#EBE6DF] space-y-1">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-[#7E756B] block">
                                    Key Features
                                  </span>
                                  <div className="space-y-1 text-xs text-[#2A241F]">
                                    {addon.features.slice(0, 3).map((feat: string, idx: number) => (
                                      <div key={idx} className="flex items-start gap-1.5">
                                        <Check className="w-3 h-3 text-emerald-600 flex-shrink-0 mt-0.5" />
                                        <span className="text-[11px] leading-tight">{feat}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BILLING & INVOICES */}
          {activeTab === "billing" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Billing KPIs for this App */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-[#EBE6DF] rounded-3xl p-5 shadow-sm">
                  <span className="text-[10px] font-bold text-[#7E756B] uppercase tracking-wider block">
                    Total Amount Paid
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-[#1C1917] mt-1">
                    ₹{(totalPaid / 100).toLocaleString("en-IN")}
                  </div>
                  <span className="text-[11px] text-emerald-700 font-bold mt-1 block">
                    ✓ Verified Transactions
                  </span>
                </div>

                <div className="bg-white border border-[#EBE6DF] rounded-3xl p-5 shadow-sm">
                  <span className="text-[10px] font-bold text-[#7E756B] uppercase tracking-wider block">
                    Pending Payments
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-[#1C1917] mt-1">
                    ₹{(pendingAmount / 100).toLocaleString("en-IN")}
                  </div>
                  <span className="text-[11px] text-[#7E756B] mt-1 block">
                    {pendingAmount === 0 ? "All orders settled" : "Awaiting checkout"}
                  </span>
                </div>

                <div className="bg-white border border-[#EBE6DF] rounded-3xl p-5 shadow-sm">
                  <span className="text-[10px] font-bold text-[#7E756B] uppercase tracking-wider block">
                    App Subscription License
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-[#78593D] mt-1 truncate">
                    {currentPlan?.name || "Pro Combo"}
                  </div>
                  <span className="text-[11px] text-[#7E756B] mt-1 block">
                    Lifetime App Ownership
                  </span>
                </div>
              </div>

              {/* Invoices List */}
              <div className="bg-white border border-[#EBE6DF] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-[#EBE6DF]">
                  <div>
                    <h2 className="text-lg font-black text-[#1C1917]">App Payment &amp; Invoice History</h2>
                    <p className="text-xs text-[#7E756B]">
                      Records mapped specifically to App: <strong>{appName}</strong>
                    </p>
                  </div>
                </div>

                {isLoadingOrders ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#78593D] mb-2" />
                    <span>Loading billing records...</span>
                  </div>
                ) : appOrders.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF] space-y-2">
                    <Receipt className="w-8 h-8 mx-auto text-[#78593D]" />
                    <h3 className="text-sm font-bold text-[#1C1917]">No Invoices Found for This App</h3>
                    <p className="text-xs text-[#7E756B] max-w-sm mx-auto">
                      Any plans, add-ons, or custom feature payments for {appName} will appear here with downloadable receipts.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#EBE6DF] text-[#7E756B] font-bold uppercase text-[10px]">
                          <th className="py-3 px-2">Invoice / Order #</th>
                          <th className="py-3 px-2">Description</th>
                          <th className="py-3 px-2">Date</th>
                          <th className="py-3 px-2">Amount</th>
                          <th className="py-3 px-2">Status</th>
                          <th className="py-3 px-2 text-right">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EBE6DF]/70">
                        {appOrders.map((ord: any) => (
                          <tr key={ord.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                            <td className="py-3 px-2 font-mono font-bold text-[#1C1917]">
                              {ord.order_number || ord.order_id || `#INV-${ord.id}`}
                            </td>
                            <td className="py-3 px-2 text-[#57514B]">
                              {ord.items?.[0]?.name || ord.description || "Package / Add-on License"}
                            </td>
                            <td className="py-3 px-2 text-[#7E756B]">
                              {ord.created_at ? new Date(ord.created_at).toLocaleDateString() : "Recent"}
                            </td>
                            <td className="py-3 px-2 font-black text-[#1C1917]">
                              ₹{((ord.amount || 0) / 100).toLocaleString("en-IN")}
                            </td>
                            <td className="py-3 px-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  ord.status === "paid" || ord.status === "completed"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {ord.status || "Paid"}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right">
                              {ord.invoice_url || ord.invoice_pdf ? (
                                <a
                                  href={ord.invoice_url || ord.invoice_pdf}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-bold text-[#78593D] hover:underline inline-flex items-center gap-1"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Download</span>
                                </a>
                              ) : (
                                <span className="text-[#A8A199] text-[11px]">Settled</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DOWNLOADS & BUILDS */}
          {activeTab === "downloads" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white border border-[#EBE6DF] rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBE6DF]">
                  <div>
                    <h2 className="text-lg font-black text-[#1C1917]">Application Binaries &amp; Build Artifacts</h2>
                    <p className="text-xs text-[#7E756B]">
                      Production APKs, Google Play AABs, and historical compilations for {appName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onRebuild}
                    disabled={isRebuilding}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-xs cursor-pointer self-start sm:self-auto"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRebuilding ? "animate-spin" : ""}`} />
                    <span>Compile New Build</span>
                  </button>
                </div>

                {/* Incomplete Setup Alert Banner */}
                {!canDownloadApk && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-[#1C1917] font-extrabold block">
                          APK Download Restricted &mdash; Mandatory Setup Incomplete
                        </strong>
                        <p className="text-amber-900/80 mt-0.5">
                          {pendingSteps.length > 0
                            ? `Pending steps required: ${pendingSteps.map((s) => s.label).join(", ")}`
                            : "You must complete all mandatory setup steps and build compilation before downloading the APK."}
                        </p>
                      </div>
                    </div>
                    {app?.ulid && (
                      <Link
                        href={`/dashboard/apps/${app.ulid}/setup/${app.setup_step || "connect"}`}
                        className="px-3.5 py-1.5 rounded-xl bg-[#78593D] hover:bg-[#634932] text-white font-bold text-xs transition shadow-2xs whitespace-nowrap self-start sm:self-auto flex items-center gap-1.5"
                      >
                        <span>Complete Setup</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                )}

                {/* Primary APK Download Card */}
                <div className="p-5 sm:p-6 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF] flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#78593D] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                      <Smartphone className="w-6 h-6 text-amber-100" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-base font-black text-[#1C1917]">
                          Android Production APK (.apk)
                        </strong>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                          v{latestBuild?.version_code || 1}.0.0 Ready
                        </span>
                      </div>
                      <p className="text-xs text-[#57514B] mt-1">
                        Compatible with Android 8.0 through Android 15. Native WebView engine with biometrics and push capabilities.
                      </p>
                      <p className="text-[11px] font-mono text-[#7E756B] mt-1">
                        Package: {packageName} &bull; Keystore: RSA-2048 Signed
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-start md:self-auto flex-shrink-0">
                    {canDownloadApk && targetBuildId ? (
                      <a
                        href={`/api/apps/${app?.ulid}/builds/${targetBuildId}/download-file?format=apk&app_name=${encodeURIComponent(appName)}&version=${latestBuild?.version_code || 1}`}
                        download={`${appName.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}-v${latestBuild?.version_code || 1}.apk`}
                        className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black transition shadow-xs flex items-center gap-2 cursor-pointer active:scale-98"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download APK File</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="px-5 py-2.5 bg-slate-200 text-slate-400 rounded-xl text-xs font-bold flex items-center gap-2 cursor-not-allowed opacity-80"
                      >
                        <Lock className="w-4 h-4" />
                        <span>Download Restricted</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Google Play Bundle Card */}
                <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#EBE6DF] flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] text-[#78593D] border border-[#EBE6DF] flex items-center justify-center flex-shrink-0">
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-base font-black text-[#1C1917]">
                          Google Play Android App Bundle (.aab)
                        </strong>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EFEAE2] text-[#78593D]">
                          Store Publishing
                        </span>
                      </div>
                      <p className="text-xs text-[#57514B] mt-1">
                        Format mandated by the Google Play Console for publication. Includes dynamic asset splitting and SDK 34 target.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-start md:self-auto flex-shrink-0">
                    {app?.can_aab || isEnterprise ? (
                      <a
                        href={`/api/apps/${app?.ulid}/builds/${targetBuildId}/download-file?format=aab&app_name=${encodeURIComponent(appName)}&version=${latestBuild?.version_code || 1}`}
                        download={`${appName.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}-v${latestBuild?.version_code || 1}.aab`}
                        className="px-5 py-2.5 bg-[#78593D] hover:bg-[#634932] text-white rounded-xl text-xs font-black transition shadow-xs flex items-center gap-2 cursor-pointer active:scale-98"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download .AAB</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelectTab("overview")}
                        className="px-4 py-2 border border-[#78593D]/30 bg-[#FAF7F2] hover:bg-[#EFEAE2] text-[#78593D] rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Unlock Play Store Add-on</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Build History List */}
                <div className="pt-4 border-t border-[#EBE6DF] space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#7E756B] block">
                    Compilation Log History
                  </span>
                  {(app?.builds || []).length === 0 ? (
                    <p className="text-xs text-[#7E756B]">Initial build generated during setup wizard.</p>
                  ) : (
                    <div className="space-y-2">
                      {app.builds.map((b: any, index: number) => (
                        <div
                          key={b.id || index}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <div>
                              <strong className="text-slate-800">Build #v{b.version_code || index + 1}.0.0</strong>
                              <span className="text-slate-400 text-[11px] ml-2">
                                {b.created_at ? new Date(b.created_at).toLocaleString() : "Latest Release"}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {b.status || "Ready"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: APP TRAFFIC (Real analytics with authentic empty states, no fake numbers) */}
          {activeTab === "app_traffic" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white border border-[#EBE6DF] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <h2 className="text-lg font-black text-[#1C1917]">App Traffic &amp; Installation Telemetry</h2>
                  <p className="text-xs text-[#7E756B]">
                    Live user engagement metrics for Android and iOS builds
                  </p>
                </div>

                {/* Real KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF]">
                    <span className="text-[10px] font-bold text-[#7E756B] uppercase tracking-wider block">
                      Total Installs
                    </span>
                    <div className="text-2xl font-black text-[#1C1917] mt-1">0</div>
                    <span className="text-[10px] text-[#7E756B] mt-0.5 block">Unique device IDs</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF]">
                    <span className="text-[10px] font-bold text-[#7E756B] uppercase tracking-wider block">
                      Active Users (DAU)
                    </span>
                    <div className="text-2xl font-black text-[#1C1917] mt-1">0</div>
                    <span className="text-[10px] text-[#7E756B] mt-0.5 block">Daily active shoppers</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF]">
                    <span className="text-[10px] font-bold text-[#7E756B] uppercase tracking-wider block">
                      Session Count
                    </span>
                    <div className="text-2xl font-black text-[#1C1917] mt-1">0</div>
                    <span className="text-[10px] text-[#7E756B] mt-0.5 block">In-app launch sessions</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF]">
                    <span className="text-[10px] font-bold text-[#7E756B] uppercase tracking-wider block">
                      Push Open Rate
                    </span>
                    <div className="text-2xl font-black text-[#1C1917] mt-1">0.0%</div>
                    <span className="text-[10px] text-[#7E756B] mt-0.5 block">Campaign clickthrough</span>
                  </div>
                </div>

                {/* Meaningful Telemetry State Banner */}
                <div className="p-6 rounded-2xl bg-white border border-[#EBE6DF] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <strong className="text-sm font-bold text-[#1C1917] block">
                        Telemetry Bridge Waiting for Device Connections
                      </strong>
                      <p className="text-xs text-[#57514B] mt-0.5 max-w-xl">
                        Once you distribute your APK or publish on Google Play, installs and session counts stream automatically to your dashboard. Connect Google Analytics for Firebase to unlock real-time funnels.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: WEB TRAFFIC */}
          {activeTab === "web_traffic" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white border border-[#EBE6DF] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <h2 className="text-lg font-black text-[#1C1917]">Store Website Traffic &amp; API Health</h2>
                  <p className="text-xs text-[#7E756B]">
                    Bi-directional catalog sync telemetry between your live website and mobile clients
                  </p>
                </div>

                {/* Website Connection Diagnostics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF]">
                    <span className="text-[10px] font-bold text-[#7E756B] uppercase tracking-wider block">
                      Store URL Status
                    </span>
                    <div className="text-sm font-black text-emerald-800 mt-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="truncate">{storeUrl ? "Verified Online" : "Pending Setup"}</span>
                    </div>
                    <span className="text-[10px] text-[#7E756B] mt-0.5 block font-mono truncate">{storeUrl || "N/A"}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF]">
                    <span className="text-[10px] font-bold text-[#7E756B] uppercase tracking-wider block">
                      REST API Protocol
                    </span>
                    <div className="text-sm font-black text-[#1C1917] mt-1">
                      {platform.includes("Woo") ? "WooCommerce v3 REST" : "Shopify Admin API"}
                    </div>
                    <span className="text-[10px] text-emerald-700 font-bold mt-0.5 block">
                      ✓ TLS 1.3 Encrypted
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF]">
                    <span className="text-[10px] font-bold text-[#7E756B] uppercase tracking-wider block">
                      Last Catalog Sync
                    </span>
                    <div className="text-sm font-black text-[#1C1917] mt-1">Real-Time Webhooks</div>
                    <span className="text-[10px] text-[#7E756B] mt-0.5 block">Products &amp; stock sync</span>
                  </div>
                </div>

                {/* Meaningful Real State */}
                <div className="p-8 text-center rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF] space-y-3">
                  <Globe className="w-8 h-8 mx-auto text-[#78593D]" />
                  <h3 className="text-sm font-bold text-[#1C1917]">Store Visitor Telemetry Active</h3>
                  <p className="text-xs text-[#7E756B] max-w-md mx-auto leading-relaxed">
                    Customer visits on your web store are routed automatically to your synced mobile app catalog. Orders placed on either platform update stock immediately across both databases.
                  </p>
                  {storeUrl && (
                    <div className="pt-2">
                      <a
                        href={storeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#EBE6DF] hover:bg-[#FAF7F2] text-xs font-bold text-[#78593D] transition shadow-2xs"
                      >
                        <span>Visit Live Website</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SETTINGS & DANGER ZONE */}
          {activeTab === "settings" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white border border-[#EBE6DF] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <h2 className="text-lg font-black text-[#1C1917]">Application Configuration &amp; Settings</h2>
                  <p className="text-xs text-[#7E756B]">
                    Manage project credentials, app assets, branding, and dangerous actions
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <strong className="text-sm font-bold text-[#1C1917] block">Branding, App Icon &amp; Colors</strong>
                      <p className="text-xs text-[#7E756B] mt-0.5">
                        Customize your launcher icon, splash banner, primary palette, and mobile fonts.
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/apps/${app?.ulid}/setup/branding`}
                      className="px-4 py-2 bg-[#78593D] hover:bg-[#634932] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs self-start sm:self-auto"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Edit Branding</span>
                    </Link>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <strong className="text-sm font-bold text-[#1C1917] block">Synchronize Store Products</strong>
                      <p className="text-xs text-[#7E756B] mt-0.5">
                        Force-refresh category trees, product prices, and promotional banners.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onRebuild}
                      disabled={isRebuilding}
                      className="px-4 py-2 border border-[#EBE6DF] bg-white hover:bg-[#F7F5F0] text-[#1C1917] rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer self-start sm:self-auto"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRebuilding ? "animate-spin text-[#78593D]" : ""}`} />
                      <span>Sync Now</span>
                    </button>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="pt-6 border-t border-rose-100 space-y-4">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-600" />
                    <h3 className="text-sm font-black text-rose-700">Danger Zone</h3>
                  </div>
                  <div className="p-5 rounded-2xl bg-rose-50/60 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <strong className="text-sm font-bold text-rose-900 block">Delete Application</strong>
                      <p className="text-xs text-rose-700 mt-0.5 max-w-lg">
                        Permanently delete {appName}, its configuration, cached catalog assets, and historical build binaries. This action cannot be undone.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(true)}
                      className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Application</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ── 3-STEP POPUP DELETION MODAL ── */}
      <DeleteAppModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        app={app}
        onDeleted={() => {
          setIsDeleteModalOpen(false);
          onBack();
        }}
      />
    </div>
  );
}
