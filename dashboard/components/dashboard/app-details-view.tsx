"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DeleteAppModal } from "@/components/dashboard/delete-app-modal";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { AddonLearnMoreModal } from "@/components/addons/addon-learn-more-modal";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
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
  Mail,
  MessageSquare,
  Package,
  Palette,
  Plus,
  Receipt,
  RefreshCw,
  Rocket,
  Send,
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
  Upload,
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
    id: 9,
    name: "Branded Email Configuration Module",
    shortName: "Email Configuration Module",
    slug: "email_config",
    price: 99900,
    price_formatted: "₹999",
    category: "Communication",
    badge: "Transactional Mail",
    licenseType: "One-Time License",
    description:
      "Connect custom SMTP servers and API relays to send branded transactional receipts, password resets, and user alerts from your store domain.",
    features: [
      "Custom SMTP host & TLS port",
      "Store domain DKIM/SPF routing",
      "Automated order invoices & receipts",
      "Real-time test message dispatcher",
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

const ALLOWED_FONTS = [
  "Poppins",
  "Inter",
  "Roboto",
  "Outfit",
  "Montserrat",
  "Open Sans",
  "Lato",
];

const PRESET_PALETTES = [
  { name: "Coffee Warmth", primary: "#78593D", secondary: "#C2A88F" },
  { name: "Royal Indigo", primary: "#4338CA", secondary: "#818CF8" },
  { name: "Forest Emerald", primary: "#059669", secondary: "#6EE7B7" },
  { name: "Luxury Amber", primary: "#B45309", secondary: "#FCD34D" },
  { name: "Midnight Rose", primary: "#BE185D", secondary: "#F472B6" },
  { name: "Modern Dark", primary: "#1E293B", secondary: "#94A3B8" },
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

  // Navigation sidebar state & strictly ordered 10 tabs (Requirement 5)
  const TAB_KEYS = [
    "overview",
    "app_traffic",
    "web_traffic",
    "downloads",
    "addons",
    "branding",
    "push_notifications",
    "email_config",
    "whatsapp_config",
    "billing",
  ] as const;
  type TabKey = (typeof TAB_KEYS)[number];

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [direction, setDirection] = useState<"down" | "up">("down");
  const [exitingTab, setExitingTab] = useState<TabKey | null>(null);
  const isTransitioningRef = useRef(false);

  useEffect(() => {
    const sectionParam = searchParams.get("section") || searchParams.get("tab");
    if (sectionParam) {
      const aliasMap: Record<string, TabKey> = {
        "app-addons-section": "addons",
        "settings": "overview",
        "branding-section": "branding",
      };
      const resolved = (aliasMap[sectionParam] || sectionParam) as TabKey;
      if (TAB_KEYS.includes(resolved) && activeTab !== resolved) {
        const currentIdx = TAB_KEYS.indexOf(activeTab);
        const nextIdx = TAB_KEYS.indexOf(resolved);
        setDirection(nextIdx > currentIdx ? "down" : "up");
        setExitingTab(activeTab);
        setActiveTab(resolved);
        setTimeout(() => setExitingTab(null), 290);
      }
    } else if (!sectionParam && activeTab !== "overview") {
      setDirection("up");
      setExitingTab(activeTab);
      setActiveTab("overview");
      setTimeout(() => setExitingTab(null), 290);
    }
  }, [searchParams, activeTab]);

  const handleSelectTab = useCallback(
    (tabId: TabKey) => {
      if (tabId === activeTab || isTransitioningRef.current) return;

      const currentIdx = TAB_KEYS.indexOf(activeTab);
      const nextIdx = TAB_KEYS.indexOf(tabId);
      const dir: "down" | "up" = nextIdx > currentIdx ? "down" : "up";

      isTransitioningRef.current = true;
      setDirection(dir);
      setExitingTab(activeTab);
      setActiveTab(tabId);

      if (app?.ulid || app?.id) {
        router.push(`/dashboard?app=${app.ulid || app.id}&section=${tabId}`);
      }

      setTimeout(() => {
        setExitingTab(null);
        isTransitioningRef.current = false;
      }, 290);
    },
    [activeTab, app?.ulid, app?.id, router]
  );

  const getPanelClass = (tabKey: TabKey) => {
    const isActive = activeTab === tabKey;
    if (isActive) {
      return "w-full min-h-[580px] p-5 sm:p-7 bg-white rounded-3xl flex flex-col opacity-100 transition-opacity duration-200 animate-fadeIn";
    }
    return "hidden";
  };

  // Add-ons state
  const [addonFilter, setAddonFilter] = useState<"all" | "available" | "active">("all");
  const [expandedAddonId, setExpandedAddonId] = useState<string | number | null>(null);
  const [localPurchasedSlugs, setLocalPurchasedSlugs] = useState<string[]>([]);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [selectedAddonForModal, setSelectedAddonForModal] = useState<any | null>(null);

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
  const [appNameInput, setAppNameInput] = useState<string>(
    appConfig?.app?.name || app?.name || "Mobile Application"
  );
  const [logoUrlInput, setLogoUrlInput] = useState<string>(
    appConfig?.app?.logo_url ||
      appConfig?.theme?.logo_url ||
      (app?.connection?.site_url
        ? `${app?.connection?.site_url?.replace(/\/+$/, "")}/favicon.ico`
        : "")
  );
  const [bannerUrlInput, setBannerUrlInput] = useState<string>(
    appConfig?.app?.banner_url || appConfig?.theme?.banner_url || ""
  );
  const [primaryColorInput, setPrimaryColorInput] = useState<string>(
    appConfig?.theme?.colors?.primary || "#78593D"
  );
  const [secondaryColorInput, setSecondaryColorInput] = useState<string>(
    appConfig?.theme?.colors?.secondary || "#C2A88F"
  );
  const [fontInput, setFontInput] = useState<string>(
    appConfig?.theme?.font || "Poppins"
  );
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [brandingStatusMsg, setBrandingStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Sync inputs if config updates from parent
  useEffect(() => {
    if (appConfig?.app?.name) setAppNameInput(appConfig.app.name);
    if (appConfig?.app?.logo_url || appConfig?.theme?.logo_url) {
      setLogoUrlInput(appConfig.app?.logo_url || appConfig.theme?.logo_url);
    }
    if (appConfig?.app?.banner_url || appConfig?.theme?.banner_url) {
      setBannerUrlInput(appConfig.app?.banner_url || appConfig.theme?.banner_url);
    }
    if (appConfig?.theme?.colors?.primary) setPrimaryColorInput(appConfig.theme.colors.primary);
    if (appConfig?.theme?.colors?.secondary) setSecondaryColorInput(appConfig.theme.colors.secondary);
    if (appConfig?.theme?.font) setFontInput(appConfig.theme.font);
  }, [appConfig]);

  const appName = appNameInput || app?.name || "Mobile Application";
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

  const canDownloadApk = Boolean(
    hasPaidPlan &&
    hasReadyBuild &&
    (app?.can_apk !== false)
  );

  // Completed status check for conditional header (Requirement 2)
  const isCompletedApp = Boolean(
    app?.is_completed === true ||
    (app?.status && !["draft", "pending", "in_progress"].includes(String(app.status).toLowerCase()))
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

  const isPushActive = checkIsAddonActive({ slug: "push_notifications" }) || isEnterprise;
  const isEmailActive = checkIsAddonActive({ slug: "email_config" }) || isEnterprise;
  const isWhatsAppActive = checkIsAddonActive({ slug: "whatsapp_sync" }) || isEnterprise;

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

  // Save branding changes to backend (Requirement 6)
  const handleSaveBranding = async () => {
    if (!app?.ulid) return;
    setIsSavingBranding(true);
    setBrandingStatusMsg(null);

    try {
      const payload = {
        app: {
          name: appNameInput,
          logo_url: logoUrlInput,
          banner_url: bannerUrlInput,
          currency: "INR",
        },
        theme: {
          layout: appConfig?.theme?.layout || "theme_a",
          logo_url: logoUrlInput,
          banner_url: bannerUrlInput,
          colors: {
            primary: primaryColorInput,
            secondary: secondaryColorInput,
            background: "#FFFFFF",
            surface: "#FAFAFA",
            text: "#111111",
          },
          font: fontInput,
          radius: 16,
          nav: "bottom",
        },
      };

      await apiClient(`/api/apps/${app.ulid}/config/draft`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setBrandingStatusMsg({
        text: "✓ Brand styling, assets, and typography updated successfully!",
        type: "success",
      });
    } catch (err: any) {
      setBrandingStatusMsg({
        text: err.message || "Failed to persist branding updates.",
        type: "error",
      });
    } finally {
      setIsSavingBranding(false);
    }
  };

  // Integration forms state (Requirement 7)
  const [fcmKey, setFcmKey] = useState("");
  const [oneSignalId, setOneSignalId] = useState("");
  const [pushTestTitle, setPushTestTitle] = useState("Exclusive VIP Deal!");
  const [pushTestBody, setPushTestBody] = useState("Tap to claim your 20% store discount today.");
  const [isSendingPushTest, setIsSendingPushTest] = useState(false);
  const [isSavingPush, setIsSavingPush] = useState(false);
  const [pushMessage, setPushMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [smtpHost, setSmtpHost] = useState("smtp.mailgun.org");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("postmaster@store.app");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [fromName, setFromName] = useState(`${appName} Store`);
  const [fromEmail, setFromEmail] = useState(`orders@${storeUrl ? storeUrl.replace(/^https?:\/\//, "").split("/")[0] : "appifyhub.store"}`);
  const [emailTestRecipient, setEmailTestRecipient] = useState(user?.email || "customer@example.com");
  const [isSendingEmailTest, setIsSendingEmailTest] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [waPhoneId, setWaPhoneId] = useState("");
  const [waAccountId, setWaAccountId] = useState("");
  const [waToken, setWaToken] = useState("");
  const [waSupportPhone, setWaSupportPhone] = useState("+919876543210");
  const [waChatFloating, setWaChatFloating] = useState(true);
  const [waOrderUpdates, setWaOrderUpdates] = useState(true);
  const [waTestRecipient, setWaTestRecipient] = useState("+919876543210");
  const [isSendingWaTest, setIsSendingWaTest] = useState(false);
  const [isSavingWa, setIsSavingWa] = useState(false);
  const [waMessage, setWaMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

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

  // Sidebar navigation items in strictly requested order (Requirement 5)
  const sidebarNavItems = [
    {
      id: "overview" as const,
      label: "Overview",
      icon: LayoutDashboard,
      description: "Basic info, plan & specs",
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
      id: "downloads" as const,
      label: "Downloads",
      icon: Download,
      description: "APK, AAB & build history",
      badge: app?.builds?.length ? `${app.builds.length} builds` : undefined,
    },
    {
      id: "addons" as const,
      label: "Add-ons",
      icon: Sparkles,
      description: "Modules, admin & upgrades",
      badge: activeCount > 0 ? `${activeCount} active` : undefined,
    },
    {
      id: "branding" as const,
      label: "Theme & Branding",
      icon: Palette,
      description: "Colors, logo, fonts & preview",
    },
    {
      id: "push_notifications" as const,
      label: "Push Notifications",
      icon: Bell,
      description: "Campaigns & FCM credentials",
      badge: isPushActive ? "Active" : undefined,
    },
    {
      id: "email_config" as const,
      label: "Email Configuration",
      icon: Mail,
      description: "SMTP server & notifications",
      badge: isEmailActive ? "Active" : undefined,
    },
    {
      id: "whatsapp_config" as const,
      label: "WhatsApp API",
      icon: MessageSquare,
      description: "Cloud API & floating support",
      badge: isWhatsAppActive ? "Active" : undefined,
    },
    {
      id: "billing" as const,
      label: "Billing",
      icon: CreditCard,
      description: "Payment history & invoices",
      badge: appOrders.length > 0 ? String(appOrders.length) : undefined,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fadeIn font-sans">
      {/* ── CONDITIONAL HORIZONTAL HEADER BAR (Requirement 2) ── */}
      {/* Shown ONLY for incomplete applications; completely hidden for completed applications */}
      {!isCompletedApp && (
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
                  <span className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                    Setup Incomplete
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider bg-[#EFEAE2] text-[#78593D]">
                    {platform.split(" ")[0]}
                  </span>
                </div>
                <p className="text-[11px] text-[#7E756B] font-mono truncate max-w-xs">{packageName}</p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons for Incomplete App */}
          <div className="flex flex-wrap items-center gap-2">
            {!hasPaidPlan ? (
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
                <span>Continue Setup</span>
              </Link>
            )}

            <button
              type="button"
              onClick={onRebuild}
              disabled={isRebuilding}
              className="p-2 rounded-xl border border-[#EBE6DF] hover:border-[#78593D]/30 text-[#7E756B] hover:text-[#1C1917] transition bg-white shadow-2xs cursor-pointer"
              title="Refresh / Rebuild"
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
      )}

      {checkoutMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs ${
            checkoutMessage.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-rose-50 text-rose-900 border border-rose-200"
          }`}
        >
          <span>{checkoutMessage.text}</span>
          <button
            type="button"
            onClick={() => setCheckoutMessage(null)}
            className="p-1 hover:opacity-70 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── TWO-COLUMN APPLICATION MANAGEMENT LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT SIDEBAR NAVIGATION (Requirement 3: No internal scrolling) ── */}
        <aside className="lg:col-span-3 flex flex-col gap-4 self-start">
          <div className="bg-white border border-[#EBE6DF] rounded-3xl p-3 sm:p-4 shadow-sm flex flex-col">
            {/* If completed app, top bar was hidden: show Back button and app banner here */}
            {isCompletedApp && (
              <div className="mb-3 space-y-2.5">
                <button
                  type="button"
                  onClick={onBack}
                  className="w-full inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#F7F5F0] hover:bg-[#EFEAE2] text-[#1C1917] text-xs font-bold transition shadow-xs group cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-[#78593D] group-hover:-translate-x-1 transition-transform" />
                  <span>Back to Dashboard</span>
                </button>

                <div className="flex items-center gap-2.5 px-3 py-2 bg-[#FAF7F2] rounded-2xl border border-[#EBE6DF]">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#78593D] to-[#C2A88F] text-white font-extrabold text-xs flex items-center justify-center shadow-xs flex-shrink-0">
                    {appName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-extrabold text-[#1C1917] block truncate">{appName}</span>
                    <span className="text-[10px] text-[#7E756B] block truncate font-mono">{packageName}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                </div>
              </div>
            )}

            <div className="px-3 py-2 mb-2 border-b border-[#EBE6DF]">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#7E756B]">
                App Management
              </span>
            </div>

            {/* Sidebar navigation list with natural rendering (no internal scrollbar) */}
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
          {/* Note: Subscription Plan card removed from below sidebar (Requirement 4) */}
        </aside>

        {/* ── RIGHT SINGLE STAGE CONTENT WINDOW ── */}
        <section className="lg:col-span-9 h-full min-h-[580px]">
          <div className="app-stage-window" id="appDetailsStageWindow" aria-live="polite">
            {/* ── TAB 1: OVERVIEW ── */}
            <article className={getPanelClass("overview")}>
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBE6DF]">
                  <div>
                    <h2 className="text-lg font-black text-[#1C1917]">App Information &amp; Specs</h2>
                    <p className="text-xs text-[#7E756B]">Detailed configuration, subscription tier, and store connection</p>
                  </div>
                  {/* Note: "Edit Theme & Branding" removed from here as per Requirement 6 */}
                </div>

                {/* App Specs Grid */}
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
                      Lifecycle Status
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{app?.status || "Active & Ready"}</span>
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF]">
                    <span className="text-[10px] font-bold text-[#7E756B] uppercase tracking-wider block">
                      Keystore &amp; Security
                    </span>
                    <span className="text-xs font-bold text-[#1C1917] mt-1 block">
                      RSA-2048 Production Signed
                    </span>
                  </div>
                </div>

                {/* ── CURRENT SUBSCRIPTION PLAN CARD (Requirement 4) ── */}
                <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#FAF7F2] to-white border border-[#EBE6DF] flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-2xs">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#78593D] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                      <CreditCard className="w-6 h-6 text-amber-200" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#78593D]">
                          Active Subscription Plan
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Active
                        </span>
                      </div>
                      <strong className="text-base sm:text-lg font-black text-[#1C1917] mt-0.5 block">
                        {currentPlan?.name || "Pro Combo"}
                      </strong>
                      <div className="text-xs text-[#7E756B] mt-0.5 flex flex-wrap items-center gap-2">
                        <span>
                          {currentPlan?.price_monthly === 0
                            ? "Standard Free Tier"
                            : `₹${((currentPlan?.price_monthly || 799900) / 100).toLocaleString("en-IN")}`}
                        </span>
                        <span className="text-slate-300">&bull;</span>
                        <span className="font-semibold text-[#1C1917]">
                          {currentPlan?.billing_cycle === "annual" ? "Annual Billing" : "Lifetime Ownership"}
                        </span>
                        <span className="text-slate-300">&bull;</span>
                        <span className="text-emerald-700 font-bold">14-Day Store Acceptance Guarantee</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-auto flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => onNavigateToTab("plans")}
                      className="px-4 py-2.5 bg-[#78593D] hover:bg-[#634932] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
                    >
                      <span>Upgrade Plan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Theme & Palette Preview Strip */}
                <div className="pt-4 border-t border-[#EBE6DF]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#7E756B]">
                      Active Branding &amp; Visual Tokens
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectTab("branding")}
                      className="text-xs font-bold text-[#78593D] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Palette className="w-3 h-3" />
                      <span>Customize in Theme &amp; Branding &rarr;</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="w-5 h-5 rounded-md border border-black/10 shadow-2xs" style={{ backgroundColor: primaryColorInput }} />
                      <span className="font-semibold text-slate-700">Primary: <code>{primaryColorInput}</code></span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="w-5 h-5 rounded-md border border-black/10 shadow-2xs" style={{ backgroundColor: secondaryColorInput }} />
                      <span className="font-semibold text-slate-700">Accent: <code>{secondaryColorInput}</code></span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <span className="text-slate-400">Font:</span>
                      <strong className="text-slate-800">{fontInput}</strong>
                    </div>
                    {logoUrlInput && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                        <span className="text-slate-400">Logo:</span>
                        <span className="text-emerald-700 font-bold">Uploaded</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Store Sync & Danger Zone */}
                <div className="pt-6 border-t border-[#EBE6DF] space-y-4">
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

                  <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <strong className="text-sm font-bold text-rose-900 block">Delete Application</strong>
                      <p className="text-xs text-rose-700 mt-0.5 max-w-lg">
                        Permanently delete {appName}, its configuration, cached catalog assets, and historical build binaries.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Application</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>

            {/* ── TAB 2: APP TRAFFIC ── */}
            <article className={getPanelClass("app_traffic")}>
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-black text-[#1C1917]">App Traffic &amp; Installation Telemetry</h2>
                  <p className="text-xs text-[#7E756B]">
                    Live user engagement metrics for Android and iOS builds
                  </p>
                </div>

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
            </article>

            {/* ── TAB 3: WEB TRAFFIC ── */}
            <article className={getPanelClass("web_traffic")}>
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-black text-[#1C1917]">Store Website Traffic &amp; API Health</h2>
                  <p className="text-xs text-[#7E756B]">
                    Bi-directional catalog sync telemetry between your live website and mobile clients
                  </p>
                </div>

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
            </article>

            {/* ── TAB 4: DOWNLOADS ── */}
            <article className={getPanelClass("downloads")}>
              <div className="space-y-6">
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
                            : "You must complete all mandatory setup steps and choose an active plan before downloading the APK."}
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
                        Format mandated by Google Play Console for publication. Target SDK 34 with dynamic feature delivery.
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
                        onClick={() => handleSelectTab("addons")}
                        className="px-4 py-2 border border-[#78593D]/30 bg-[#FAF7F2] hover:bg-[#EFEAE2] text-[#78593D] rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Unlock Play Store Add-on</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Build History */}
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
            </article>

            {/* ── TAB 5: ADD-ONS ── */}
            <article className={getPanelClass("addons")}>
              <div id="app-addons-section" className="space-y-6">
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

                {/* Add-ons Grid */}
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
                        <div className="p-4 space-y-2 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-extrabold text-[#1C1917] leading-snug" title={addon.shortName || addon.name}>
                              {addon.shortName || addon.name}
                            </h3>

                            {isActive && (
                              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 flex items-center gap-1 flex-shrink-0">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                <span>Active</span>
                              </span>
                            )}
                          </div>

                          <div className="pt-1">
                            <span className="text-base font-black text-[#1C1917]">
                              {addon.price_formatted || formatPrice(addon.price)}
                            </span>
                          </div>
                        </div>

                        <div className="p-4 pt-0 space-y-3">
                          <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#EBE6DF]/70">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedAddonForModal({
                                  ...addon,
                                  shortName: addon.shortName || addon.name,
                                  oneLineDesc: addon.description,
                                  price: addon.price_formatted || formatPrice(addon.price),
                                  licenseType: addon.licenseType || "Lifetime App License",
                                  isActive,
                                  features: addon.features || [],
                                  featureDetails: {
                                    title: addon.description,
                                    items: addon.features || [],
                                  },
                                  actionUrl: hasAdminPanel ? `/dashboard/apps/${app?.ulid}/admin` : undefined,
                                })
                              }
                              className="text-xs font-bold text-[#78593D] hover:text-[#5A412A] flex items-center gap-1 cursor-pointer select-none"
                            >
                              <span>View Details</span>
                              <Info className="w-3.5 h-3.5" />
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

                          {isExpanded && (
                            <div className="pt-3 border-t border-[#EBE6DF]/70 space-y-2.5 animate-fadeIn text-xs">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#EFEAE2] text-[#78593D]">
                                  {addon.category || "Feature"}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#F7F5F0] text-[#7E756B] border border-[#EBE6DF]">
                                  {addon.licenseType || "Lifetime App License"}
                                </span>
                              </div>

                              {addon.description && (
                                <p className="text-xs text-[#57514B] leading-relaxed">
                                  {addon.description}
                                </p>
                              )}

                              {addon.features && addon.features.length > 0 && (
                                <div className="bg-white p-2.5 rounded-xl border border-[#EBE6DF] space-y-1">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-[#7E756B] block">
                                    Key Features
                                  </span>
                                  <div className="space-y-1 text-xs text-[#2A241F]">
                                    {addon.features.map((feat: string, idx: number) => (
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
            </article>

            {/* ── TAB 6: THEME & BRANDING (Requirement 6) ── */}
            <article className={getPanelClass("branding")}>
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBE6DF]">
                  <div>
                    <h2 className="text-lg font-black text-[#1C1917] flex items-center gap-2">
                      <Palette className="w-5 h-5 text-[#78593D]" />
                      <span>Theme &amp; Branding Customization</span>
                    </h2>
                    <p className="text-xs text-[#7E756B]">
                      Manage your app logo, splash banner, brand color scheme, typography, and live mobile preview
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveBranding}
                    disabled={isSavingBranding}
                    className="px-5 py-2.5 bg-[#78593D] hover:bg-[#634932] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-98 self-start sm:self-auto"
                  >
                    {isSavingBranding ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{isSavingBranding ? "Saving..." : "Save Branding"}</span>
                  </button>
                </div>

                {brandingStatusMsg && (
                  <div
                    className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-2xs ${
                      brandingStatusMsg.type === "success"
                        ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                        : "bg-rose-50 text-rose-900 border border-rose-200"
                    }`}
                  >
                    <span>{brandingStatusMsg.text}</span>
                    <button
                      type="button"
                      onClick={() => setBrandingStatusMsg(null)}
                      className="p-1 hover:opacity-70 transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Form Controls */}
                  <div className="lg:col-span-7 space-y-5">
                    {/* App Name */}
                    <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF] space-y-1.5">
                      <label className="text-[11px] font-bold text-[#7E756B] uppercase tracking-wider block">
                        Application Name
                      </label>
                      <input
                        type="text"
                        value={appNameInput}
                        onChange={(e) => setAppNameInput(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-[#EBE6DF] rounded-xl text-xs font-bold text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#78593D]/30"
                        placeholder="e.g. My Online Store"
                      />
                    </div>

                    {/* Logo & Launcher Icon */}
                    <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF] space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#7E756B] uppercase tracking-wider block">
                          App Icon &amp; Logo URL
                        </label>
                        <span className="text-[10px] text-[#7E756B]">Recommended: 512x512 PNG</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white border border-[#EBE6DF] flex items-center justify-center overflow-hidden flex-shrink-0 shadow-2xs">
                          {logoUrlInput ? (
                            <img src={logoUrlInput} alt="App logo" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg font-black text-[#78593D]">
                              {appNameInput.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={logoUrlInput}
                          onChange={(e) => setLogoUrlInput(e.target.value)}
                          className="flex-1 px-3.5 py-2 bg-white border border-[#EBE6DF] rounded-xl text-xs font-mono text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#78593D]/30"
                          placeholder="https://example.com/logo.png"
                        />
                      </div>
                    </div>

                    {/* Banner / Splash Screen */}
                    <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF] space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#7E756B] uppercase tracking-wider block">
                          Splash Screen &amp; Banner URL
                        </label>
                        <span className="text-[10px] text-[#7E756B]">Recommended: 1200x600 WebP/JPG</span>
                      </div>
                      <input
                        type="text"
                        value={bannerUrlInput}
                        onChange={(e) => setBannerUrlInput(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-[#EBE6DF] rounded-xl text-xs font-mono text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#78593D]/30"
                        placeholder="https://example.com/banner.jpg"
                      />
                    </div>

                    {/* Color Customization */}
                    <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF] space-y-3">
                      <label className="text-[11px] font-bold text-[#7E756B] uppercase tracking-wider block">
                        Brand Color Palette
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 bg-white border border-[#EBE6DF] rounded-xl space-y-1.5">
                          <span className="text-[10px] text-[#7E756B] font-bold uppercase block">Primary Color</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={primaryColorInput}
                              onChange={(e) => setPrimaryColorInput(e.target.value)}
                              className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                            />
                            <input
                              type="text"
                              value={primaryColorInput}
                              onChange={(e) => setPrimaryColorInput(e.target.value)}
                              className="flex-1 px-2.5 py-1 text-xs font-mono font-bold border border-[#EBE6DF] rounded-lg"
                            />
                          </div>
                        </div>

                        <div className="p-3 bg-white border border-[#EBE6DF] rounded-xl space-y-1.5">
                          <span className="text-[10px] text-[#7E756B] font-bold uppercase block">Secondary / Accent Color</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={secondaryColorInput}
                              onChange={(e) => setSecondaryColorInput(e.target.value)}
                              className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                            />
                            <input
                              type="text"
                              value={secondaryColorInput}
                              onChange={(e) => setSecondaryColorInput(e.target.value)}
                              className="flex-1 px-2.5 py-1 text-xs font-mono font-bold border border-[#EBE6DF] rounded-lg"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Presets */}
                      <div className="pt-2 border-t border-[#EBE6DF]/70">
                        <span className="text-[10px] text-[#7E756B] font-bold uppercase block mb-1.5">Quick Curated Palettes</span>
                        <div className="flex flex-wrap gap-2">
                          {PRESET_PALETTES.map((pal) => (
                            <button
                              key={pal.name}
                              type="button"
                              onClick={() => {
                                setPrimaryColorInput(pal.primary);
                                setSecondaryColorInput(pal.secondary);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white border border-[#EBE6DF] text-[10px] font-bold flex items-center gap-1.5 hover:border-[#78593D] transition cursor-pointer"
                            >
                              <div className="w-3 h-3 rounded-full shadow-2xs" style={{ backgroundColor: pal.primary }} />
                              <span>{pal.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Font Selector */}
                    <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF] space-y-1.5">
                      <label className="text-[11px] font-bold text-[#7E756B] uppercase tracking-wider block">
                        Application Typography
                      </label>
                      <select
                        value={fontInput}
                        onChange={(e) => setFontInput(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-[#EBE6DF] rounded-xl text-xs font-bold text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#78593D]/30"
                      >
                        {ALLOWED_FONTS.map((f) => (
                          <option key={f} value={f}>
                            {f} &mdash; Mobile Optimized
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Right Column: Live Mobile Preview */}
                  <div className="lg:col-span-5 flex flex-col items-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#7E756B] mb-2">
                      Live Mobile Preview
                    </span>
                    <div
                      className="w-[280px] h-[520px] rounded-[36px] bg-slate-900 p-3 shadow-2xl border-4 border-slate-800 flex flex-col relative overflow-hidden"
                      style={{ fontFamily: fontInput }}
                    >
                      {/* Speaker notch */}
                      <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-2 flex-shrink-0" />

                      {/* Screen content */}
                      <div className="w-full flex-1 bg-white rounded-[24px] overflow-hidden flex flex-col text-slate-900 text-xs">
                        {/* App bar */}
                        <div
                          className="px-3 py-2 text-white flex items-center justify-between shadow-xs transition-colors"
                          style={{ backgroundColor: primaryColorInput }}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            {logoUrlInput ? (
                              <img src={logoUrlInput} alt="icon" className="w-5 h-5 rounded-md object-cover bg-white" />
                            ) : (
                              <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center text-[10px] font-bold">
                                {appNameInput.charAt(0)}
                              </div>
                            )}
                            <span className="font-extrabold text-[11px] truncate">{appNameInput}</span>
                          </div>
                          <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold">Shop</span>
                        </div>

                        {/* Banner preview */}
                        <div className="p-2.5 flex-1 space-y-2 overflow-y-auto">
                          <div
                            className="w-full h-24 rounded-xl flex items-center justify-center text-center p-2 text-white shadow-2xs relative overflow-hidden"
                            style={{
                              backgroundColor: secondaryColorInput,
                              backgroundImage: bannerUrlInput ? `url(${bannerUrlInput})` : undefined,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }}
                          >
                            {!bannerUrlInput && (
                              <div className="z-10">
                                <span className="text-[11px] font-black block">SPRING ARRIVALS</span>
                                <span className="text-[9px] opacity-90">Up to 40% Off Everything</span>
                              </div>
                            )}
                          </div>

                          {/* Mini products grid */}
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                              <div className="w-full h-14 bg-slate-200 rounded-lg" />
                              <strong className="text-[10px] block truncate">Featured Item</strong>
                              <span className="text-[10px] font-bold" style={{ color: primaryColorInput }}>₹1,499</span>
                            </div>
                            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                              <div className="w-full h-14 bg-slate-200 rounded-lg" />
                              <strong className="text-[10px] block truncate">Best Seller</strong>
                              <span className="text-[10px] font-bold" style={{ color: primaryColorInput }}>₹2,299</span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom tab bar */}
                        <div className="h-10 border-t border-slate-100 flex items-center justify-around text-[9px] font-bold text-slate-400 bg-white">
                          <span style={{ color: primaryColorInput }}>Home</span>
                          <span>Search</span>
                          <span>Cart (0)</span>
                          <span>Account</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            {/* ── TAB 7: PUSH NOTIFICATIONS (Requirement 7) ── */}
            <article className={getPanelClass("push_notifications")}>
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBE6DF]">
                  <div>
                    <h2 className="text-lg font-black text-[#1C1917] flex items-center gap-2">
                      <Bell className="w-5 h-5 text-[#78593D]" />
                      <span>Push Notifications Campaign Engine</span>
                    </h2>
                    <p className="text-xs text-[#7E756B]">
                      Broadcast lock-screen push campaigns and configure Firebase Cloud Messaging (FCM) credentials
                    </p>
                  </div>
                  {isPushActive && (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black uppercase flex items-center gap-1 self-start sm:self-auto">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Active &amp; Provisioned</span>
                    </span>
                  )}
                </div>

                {isPushActive ? (
                  <div className="space-y-6">
                    {pushMessage && (
                      <div
                        className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-2xs ${
                          pushMessage.type === "success"
                            ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                            : "bg-rose-50 text-rose-900 border border-rose-200"
                        }`}
                      >
                        <span>{pushMessage.text}</span>
                        <button
                          type="button"
                          onClick={() => setPushMessage(null)}
                          className="p-1 hover:opacity-70 transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Dispatch Test Broadcast */}
                    <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF] space-y-4">
                      <div className="flex items-center justify-between">
                        <strong className="text-sm font-extrabold text-[#1C1917]">Send Live Push Broadcast / Test Message</strong>
                        <span className="text-[10px] text-emerald-700 font-bold">Encrypted Webpush &amp; FCM</span>
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#7E756B] uppercase">Broadcast Title</label>
                          <input
                            type="text"
                            value={pushTestTitle}
                            onChange={(e) => setPushTestTitle(e.target.value)}
                            className="w-full px-3.5 py-2 bg-white border border-[#EBE6DF] rounded-xl text-xs font-bold"
                            placeholder="e.g. Flash Sale Live Now!"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#7E756B] uppercase">Notification Message</label>
                          <textarea
                            rows={2}
                            value={pushTestBody}
                            onChange={(e) => setPushTestBody(e.target.value)}
                            className="w-full px-3.5 py-2 bg-white border border-[#EBE6DF] rounded-xl text-xs"
                            placeholder="Tap to explore our new arrivals and save 15% today."
                          />
                        </div>
                        <button
                          type="button"
                          disabled={isSendingPushTest}
                          onClick={async () => {
                            setIsSendingPushTest(true);
                            setPushMessage(null);
                            try {
                              const res = await apiClient(`/api/apps/${app.ulid}/integrations/push/test`, {
                                method: "POST",
                                body: JSON.stringify({ title: pushTestTitle, body: pushTestBody }),
                              });
                              setPushMessage({ text: res.message || "Push broadcast queued successfully!", type: "success" });
                            } catch (err: any) {
                              setPushMessage({ text: err.message || "Failed to dispatch test notification.", type: "error" });
                            } finally {
                              setIsSendingPushTest(false);
                            }
                          }}
                          className="px-4 py-2 bg-[#78593D] hover:bg-[#634932] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isSendingPushTest ? "Broadcasting..." : "Dispatch Notification Now"}</span>
                        </button>
                      </div>
                    </div>

                    {/* API Credentials */}
                    <div className="p-5 rounded-2xl bg-white border border-[#EBE6DF] space-y-4">
                      <strong className="text-sm font-extrabold text-[#1C1917] block">Firebase Cloud Messaging (FCM) Credentials</strong>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#7E756B] uppercase">FCM Server Key / Token</label>
                          <input
                            type="password"
                            value={fcmKey}
                            onChange={(e) => setFcmKey(e.target.value)}
                            placeholder="••••••••••••••••"
                            className="w-full px-3.5 py-2 bg-[#FAF7F2] border border-[#EBE6DF] rounded-xl text-xs font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#7E756B] uppercase">OneSignal App ID (Optional)</label>
                          <input
                            type="text"
                            value={oneSignalId}
                            onChange={(e) => setOneSignalId(e.target.value)}
                            placeholder="e.g. b2f7f966-d1e1-4c12-9c98-..."
                            className="w-full px-3.5 py-2 bg-[#FAF7F2] border border-[#EBE6DF] rounded-xl text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          disabled={isSavingPush}
                          onClick={async () => {
                            setIsSavingPush(true);
                            setPushMessage(null);
                            try {
                              await apiClient(`/api/apps/${app.ulid}/integrations/push`, {
                                method: "POST",
                                body: JSON.stringify({
                                  status: "active",
                                  credentials: { fcm_key: fcmKey, onesignal_id: oneSignalId },
                                }),
                              });
                              setPushMessage({ text: "✓ Push notification credentials saved securely!", type: "success" });
                            } catch (err: any) {
                              setPushMessage({ text: err.message || "Failed to save push settings.", type: "error" });
                            } finally {
                              setIsSavingPush(false);
                            }
                          }}
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isSavingPush ? "Saving..." : "Save Push Configuration"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── LOCKED STATE (Requirement 7) ── */
                  <div className="p-8 sm:p-10 rounded-3xl bg-[#FAF7F2] border border-[#EBE6DF] text-center space-y-4 max-w-xl mx-auto shadow-xs">
                    <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-xs">
                      <Lock className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-[#1C1917]">
                        Push Notifications Campaign Engine Locked
                      </h3>
                      <p className="text-xs text-[#7E756B] mt-1.5 leading-relaxed">
                        Send rich media push broadcasts to your customers&apos; lock screens, trigger automated abandoned cart recovery alerts, and drive 3.5x higher repeat visits.
                      </p>
                    </div>
                    <div className="pt-2">
                      <span className="text-xl font-black text-[#78593D] block">₹999</span>
                      <span className="text-[10px] text-[#7E756B]">Lifetime App License &bull; Unlimited Notifications</span>
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleExecutePurchase({
                            slug: "push_notifications",
                            name: "Push Notifications Campaign Engine",
                            price: 99900,
                          })
                        }
                        disabled={isProcessingCheckout}
                        className="px-6 py-2.5 bg-[#78593D] hover:bg-[#634932] text-white rounded-xl text-xs font-black transition flex items-center gap-2 mx-auto shadow-xs cursor-pointer active:scale-98"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>{isProcessingCheckout ? "Opening Checkout..." : "Unlock Push Notifications (₹999)"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </article>

            {/* ── TAB 8: EMAIL CONFIGURATION (Requirement 7) ── */}
            <article className={getPanelClass("email_config")}>
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBE6DF]">
                  <div>
                    <h2 className="text-lg font-black text-[#1C1917] flex items-center gap-2">
                      <Mail className="w-5 h-5 text-[#78593D]" />
                      <span>Transactional Email &amp; SMTP Configuration</span>
                    </h2>
                    <p className="text-xs text-[#7E756B]">
                      Connect custom SMTP servers to dispatch branded order invoices and customer notifications
                    </p>
                  </div>
                  {isEmailActive && (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black uppercase flex items-center gap-1 self-start sm:self-auto">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Active &amp; Provisioned</span>
                    </span>
                  )}
                </div>

                {isEmailActive ? (
                  <div className="space-y-6">
                    {emailMessage && (
                      <div
                        className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-2xs ${
                          emailMessage.type === "success"
                            ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                            : "bg-rose-50 text-rose-900 border border-rose-200"
                        }`}
                      >
                        <span>{emailMessage.text}</span>
                        <button
                          type="button"
                          onClick={() => setEmailMessage(null)}
                          className="p-1 hover:opacity-70 transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* SMTP Credentials Form */}
                    <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF] space-y-4">
                      <strong className="text-sm font-extrabold text-[#1C1917] block">Custom SMTP Gateway Settings</strong>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#7E756B] uppercase">SMTP Host Server</label>
                          <input
                            type="text"
                            value={smtpHost}
                            onChange={(e) => setSmtpHost(e.target.value)}
                            className="w-full px-3.5 py-2 bg-white border border-[#EBE6DF] rounded-xl text-xs font-mono"
                            placeholder="smtp.mailgun.org"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#7E756B] uppercase">SMTP Port</label>
                          <input
                            type="text"
                            value={smtpPort}
                            onChange={(e) => setSmtpPort(e.target.value)}
                            className="w-full px-3.5 py-2 bg-white border border-[#EBE6DF] rounded-xl text-xs font-mono"
                            placeholder="587"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#7E756B] uppercase">SMTP Username</label>
                          <input
                            type="text"
                            value={smtpUser}
                            onChange={(e) => setSmtpUser(e.target.value)}
                            className="w-full px-3.5 py-2 bg-white border border-[#EBE6DF] rounded-xl text-xs font-mono"
                            placeholder="postmaster@yourdomain.com"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#7E756B] uppercase">SMTP Password / API Key</label>
                          <input
                            type="password"
                            value={smtpPassword}
                            onChange={(e) => setSmtpPassword(e.target.value)}
                            className="w-full px-3.5 py-2 bg-white border border-[#EBE6DF] rounded-xl text-xs font-mono"
                            placeholder="••••••••••••••••"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#7E756B] uppercase">From Name</label>
                          <input
                            type="text"
                            value={fromName}
                            onChange={(e) => setFromName(e.target.value)}
                            className="w-full px-3.5 py-2 bg-white border border-[#EBE6DF] rounded-xl text-xs font-bold"
                            placeholder="Store Name"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#7E756B] uppercase">From Email Address</label>
                          <input
                            type="email"
                            value={fromEmail}
                            onChange={(e) => setFromEmail(e.target.value)}
                            className="w-full px-3.5 py-2 bg-white border border-[#EBE6DF] rounded-xl text-xs font-mono"
                            placeholder="orders@store.com"
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <button
                          type="button"
                          disabled={isSavingEmail}
                          onClick={async () => {
                            setIsSavingEmail(true);
                            setEmailMessage(null);
                            try {
                              await apiClient(`/api/apps/${app.ulid}/integrations/email`, {
                                method: "POST",
                                body: JSON.stringify({
                                  status: "active",
                                  credentials: {
                                    host: smtpHost,
                                    port: smtpPort,
                                    username: smtpUser,
                                    password: smtpPassword,
                                    from_name: fromName,
                                    from_email: fromEmail,
                                  },
                                }),
                              });
                              setEmailMessage({ text: "✓ SMTP email settings saved and verified!", type: "success" });
                            } catch (err: any) {
                              setEmailMessage({ text: err.message || "Failed to save email settings.", type: "error" });
                            } finally {
                              setIsSavingEmail(false);
                            }
                          }}
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isSavingEmail ? "Saving..." : "Save SMTP Settings"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Send Test Email */}
                    <div className="p-5 rounded-2xl bg-white border border-[#EBE6DF] space-y-3">
                      <strong className="text-sm font-extrabold text-[#1C1917] block">Dispatch Test Email Probe</strong>
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <input
                          type="email"
                          value={emailTestRecipient}
                          onChange={(e) => setEmailTestRecipient(e.target.value)}
                          className="w-full sm:flex-1 px-3.5 py-2 bg-[#FAF7F2] border border-[#EBE6DF] rounded-xl text-xs font-mono"
                          placeholder="recipient@example.com"
                        />
                        <button
                          type="button"
                          disabled={isSendingEmailTest}
                          onClick={async () => {
                            setIsSendingEmailTest(true);
                            setEmailMessage(null);
                            try {
                              const res = await apiClient(`/api/apps/${app.ulid}/integrations/email/test`, {
                                method: "POST",
                                body: JSON.stringify({ email: emailTestRecipient }),
                              });
                              setEmailMessage({ text: res.message || "Test email dispatched successfully!", type: "success" });
                            } catch (err: any) {
                              setEmailMessage({ text: err.message || "Failed to dispatch test email.", type: "error" });
                            } finally {
                              setIsSendingEmailTest(false);
                            }
                          }}
                          className="w-full sm:w-auto px-4 py-2 bg-[#78593D] hover:bg-[#634932] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isSendingEmailTest ? "Sending..." : "Send Test Email"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── LOCKED STATE (Requirement 7) ── */
                  <div className="p-8 sm:p-10 rounded-3xl bg-[#FAF7F2] border border-[#EBE6DF] text-center space-y-4 max-w-xl mx-auto shadow-xs">
                    <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-xs">
                      <Lock className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-[#1C1917]">
                        Branded Email Configuration Module Locked
                      </h3>
                      <p className="text-xs text-[#7E756B] mt-1.5 leading-relaxed">
                        Connect custom SMTP relays and domains to dispatch transactional purchase receipts, password recovery links, and customer notifications branded with your store identity.
                      </p>
                    </div>
                    <div className="pt-2">
                      <span className="text-xl font-black text-[#78593D] block">₹999</span>
                      <span className="text-[10px] text-[#7E756B]">Lifetime App License &bull; Custom SMTP Routing</span>
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleExecutePurchase({
                            slug: "email_config",
                            name: "Branded Email Configuration Module",
                            price: 99900,
                          })
                        }
                        disabled={isProcessingCheckout}
                        className="px-6 py-2.5 bg-[#78593D] hover:bg-[#634932] text-white rounded-xl text-xs font-black transition flex items-center gap-2 mx-auto shadow-xs cursor-pointer active:scale-98"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>{isProcessingCheckout ? "Opening Checkout..." : "Unlock Email Configuration (₹999)"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </article>

            {/* ── TAB 9: WHATSAPP API CONFIGURATION (Requirement 7) ── */}
            <article className={getPanelClass("whatsapp_config")}>
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBE6DF]">
                  <div>
                    <h2 className="text-lg font-black text-[#1C1917] flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-[#78593D]" />
                      <span>WhatsApp Business Cloud API &amp; Support Chat</span>
                    </h2>
                    <p className="text-xs text-[#7E756B]">
                      Connect Meta Cloud API for automated order alerts and 1-click in-app floating WhatsApp customer chat
                    </p>
                  </div>
                  {isWhatsAppActive && (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black uppercase flex items-center gap-1 self-start sm:self-auto">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Active &amp; Provisioned</span>
                    </span>
                  )}
                </div>

                {isWhatsAppActive ? (
                  <div className="space-y-6">
                    {waMessage && (
                      <div
                        className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-2xs ${
                          waMessage.type === "success"
                            ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                            : "bg-rose-50 text-rose-900 border border-rose-200"
                        }`}
                      >
                        <span>{waMessage.text}</span>
                        <button
                          type="button"
                          onClick={() => setWaMessage(null)}
                          className="p-1 hover:opacity-70 transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Meta Cloud Credentials */}
                    <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF] space-y-4">
                      <strong className="text-sm font-extrabold text-[#1C1917] block">Meta WhatsApp Cloud API Credentials</strong>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#7E756B] uppercase">WhatsApp Phone Number ID</label>
                          <input
                            type="text"
                            value={waPhoneId}
                            onChange={(e) => setWaPhoneId(e.target.value)}
                            className="w-full px-3.5 py-2 bg-white border border-[#EBE6DF] rounded-xl text-xs font-mono"
                            placeholder="e.g. 104859672849102"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#7E756B] uppercase">WhatsApp Business Account ID</label>
                          <input
                            type="text"
                            value={waAccountId}
                            onChange={(e) => setWaAccountId(e.target.value)}
                            className="w-full px-3.5 py-2 bg-white border border-[#EBE6DF] rounded-xl text-xs font-mono"
                            placeholder="e.g. 98472918472910"
                          />
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-[#7E756B] uppercase">Permanent Cloud Access Token</label>
                          <input
                            type="password"
                            value={waToken}
                            onChange={(e) => setWaToken(e.target.value)}
                            className="w-full px-3.5 py-2 bg-white border border-[#EBE6DF] rounded-xl text-xs font-mono"
                            placeholder="EAA..."
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#EBE6DF]/70 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#7E756B] uppercase">Support WhatsApp Number (With Country Code)</label>
                          <input
                            type="text"
                            value={waSupportPhone}
                            onChange={(e) => setWaSupportPhone(e.target.value)}
                            className="w-full px-3.5 py-2 bg-white border border-[#EBE6DF] rounded-xl text-xs font-mono font-bold"
                            placeholder="+919876543210"
                          />
                        </div>
                        <div className="flex flex-col justify-end gap-2">
                          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-[#1C1917]">
                            <input
                              type="checkbox"
                              checked={waChatFloating}
                              onChange={(e) => setWaChatFloating(e.target.checked)}
                              className="w-4 h-4 rounded text-[#78593D] focus:ring-0"
                            />
                            <span>Enable In-App Floating WhatsApp Live Chat Bubble</span>
                          </label>
                          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-[#1C1917]">
                            <input
                              type="checkbox"
                              checked={waOrderUpdates}
                              onChange={(e) => setWaOrderUpdates(e.target.checked)}
                              className="w-4 h-4 rounded text-[#78593D] focus:ring-0"
                            />
                            <span>Automated Order Confirmation &amp; Tracking Alerts</span>
                          </label>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          disabled={isSavingWa}
                          onClick={async () => {
                            setIsSavingWa(true);
                            setWaMessage(null);
                            try {
                              await apiClient(`/api/apps/${app.ulid}/integrations/whatsapp`, {
                                method: "POST",
                                body: JSON.stringify({
                                  status: "active",
                                  credentials: {
                                    phone_id: waPhoneId,
                                    account_id: waAccountId,
                                    access_token: waToken,
                                    support_phone: waSupportPhone,
                                    enable_floating_chat: waChatFloating,
                                    enable_order_updates: waOrderUpdates,
                                  },
                                }),
                              });
                              setWaMessage({ text: "✓ WhatsApp Cloud API integration settings saved!", type: "success" });
                            } catch (err: any) {
                              setWaMessage({ text: err.message || "Failed to save WhatsApp settings.", type: "error" });
                            } finally {
                              setIsSavingWa(false);
                            }
                          }}
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isSavingWa ? "Saving..." : "Save WhatsApp Configuration"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Test WhatsApp Message */}
                    <div className="p-5 rounded-2xl bg-white border border-[#EBE6DF] space-y-3">
                      <strong className="text-sm font-extrabold text-[#1C1917] block">Dispatch Test WhatsApp Template</strong>
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <input
                          type="text"
                          value={waTestRecipient}
                          onChange={(e) => setWaTestRecipient(e.target.value)}
                          className="w-full sm:flex-1 px-3.5 py-2 bg-[#FAF7F2] border border-[#EBE6DF] rounded-xl text-xs font-mono font-bold"
                          placeholder="+919876543210"
                        />
                        <button
                          type="button"
                          disabled={isSendingWaTest}
                          onClick={async () => {
                            setIsSendingWaTest(true);
                            setWaMessage(null);
                            try {
                              const res = await apiClient(`/api/apps/${app.ulid}/integrations/whatsapp/test`, {
                                method: "POST",
                                body: JSON.stringify({ phone: waTestRecipient }),
                              });
                              setWaMessage({ text: res.message || "WhatsApp test message sent successfully!", type: "success" });
                            } catch (err: any) {
                              setWaMessage({ text: err.message || "Failed to dispatch test WhatsApp message.", type: "error" });
                            } finally {
                              setIsSendingWaTest(false);
                            }
                          }}
                          className="w-full sm:w-auto px-4 py-2 bg-[#78593D] hover:bg-[#634932] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isSendingWaTest ? "Sending..." : "Dispatch Test WhatsApp"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── LOCKED STATE (Requirement 7) ── */
                  <div className="p-8 sm:p-10 rounded-3xl bg-[#FAF7F2] border border-[#EBE6DF] text-center space-y-4 max-w-xl mx-auto shadow-xs">
                    <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-xs">
                      <Lock className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-[#1C1917]">
                        WhatsApp Automated Order Sync &amp; Chat Locked
                      </h3>
                      <p className="text-xs text-[#7E756B] mt-1.5 leading-relaxed">
                        Automate WhatsApp order confirmation notifications, parcel tracking updates, and provide 1-click in-app floating WhatsApp live chat support to increase sales conversions by over 40%.
                      </p>
                    </div>
                    <div className="pt-2">
                      <span className="text-xl font-black text-[#78593D] block">₹999</span>
                      <span className="text-[10px] text-[#7E756B]">Lifetime App License &bull; Meta WhatsApp Cloud API</span>
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleExecutePurchase({
                            slug: "whatsapp_sync",
                            name: "WhatsApp Automated Order Sync & Chat",
                            price: 99900,
                          })
                        }
                        disabled={isProcessingCheckout}
                        className="px-6 py-2.5 bg-[#78593D] hover:bg-[#634932] text-white rounded-xl text-xs font-black transition flex items-center gap-2 mx-auto shadow-xs cursor-pointer active:scale-98"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>{isProcessingCheckout ? "Opening Checkout..." : "Unlock WhatsApp Integration (₹999)"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </article>

            {/* ── TAB 10: BILLING & INVOICES (Requirement 5: Must be last) ── */}
            <article className={getPanelClass("billing")}>
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBE6DF]">
                  <div>
                    <h2 className="text-lg font-black text-[#1C1917]">App Payment &amp; Invoice History</h2>
                    <p className="text-xs text-[#7E756B]">
                      Verified transactions and downloadable invoices for <strong>{appName}</strong>
                    </p>
                  </div>
                </div>

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
                    <h3 className="text-base font-bold text-[#1C1917]">Invoices &amp; Receipts</h3>
                  </div>

                  {isLoadingOrders ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#78593D] mb-2" />
                      <span>Loading billing records...</span>
                    </div>
                  ) : appOrders.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF] space-y-2">
                      <Receipt className="w-8 h-8 mx-auto text-[#78593D]" />
                      <h4 className="text-sm font-bold text-[#1C1917]">No Invoices Found for This App</h4>
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
                                {ord.invoice_url || ord.invoice_pdf || ord.id ? (
                                  <a
                                    href={ord.download_invoice_url || (ord.id ? `/api/orders/${ord.id}/invoice?download=1` : (ord.invoice_url || ord.invoice_pdf))}
                                    target="_blank"
                                    rel="noreferrer"
                                    download={`Invoice-${ord.order_number || ord.id}.pdf`}
                                    className="text-xs font-bold text-[#78593D] hover:underline inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Download className="w-3.5 h-3.5" />
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
            </article>
          </div>
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

      {/* ── ADD-ON SPECIFICATION & DETAILS POPUP MODAL (Requirement 5) ── */}
      <AddonLearnMoreModal
        isOpen={Boolean(selectedAddonForModal)}
        onClose={() => setSelectedAddonForModal(null)}
        addon={selectedAddonForModal}
        onSelectOrBuy={(targetAddon) => {
          setSelectedAddonForModal(null);
          handleExecutePurchase(targetAddon);
        }}
      />
    </div>
  );
}
