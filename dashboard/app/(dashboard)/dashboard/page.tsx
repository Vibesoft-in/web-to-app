"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { openRazorpayModal, withSinglePaymentLock } from "@/lib/razorpay";
import { AppDetailsView } from "@/components/dashboard/app-details-view";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Box,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Flame,
  Globe,
  HardDrive,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  List,
  Loader2,
  Lock,
  MessageSquare,
  Package,
  PlayCircle,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Rocket,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  User,
  X,
  Zap,
} from "lucide-react";

const WIZARD_STEPS_LIST = [
  { key: "platform", label: "Platform" },
  { key: "connect", label: "Connect" },
  { key: "analysis", label: "Score" },
  { key: "data-collection", label: "Catalog" },
  { key: "theme", label: "Theme" },
  { key: "branding", label: "Branding" },
  { key: "preview", label: "Preview" },
  { key: "integrations", label: "Integrations" },
  { key: "payment", label: "Plan" },
  { key: "build", label: "Build" },
];

const SETUP_STEP_DETAILS: Record<
  string,
  { stepNumber: number; title: string; description: string; nextAction: string }
> = {
  platform: {
    stepNumber: 1,
    title: "Platform Selection",
    description: "Choose your eCommerce platform (WooCommerce, Shopify, Custom, etc.).",
    nextAction: "Select Platform & Credentials",
  },
  connect: {
    stepNumber: 2,
    title: "Store Connection",
    description: "Connect your live store URL and authenticate API keys.",
    nextAction: "Verify Store Connection",
  },
  analysis: {
    stepNumber: 3,
    title: "Store Analysis",
    description: "Review store mobile-readiness score, speed metrics, and endpoints.",
    nextAction: "Review Store Score",
  },
  "data-collection": {
    stepNumber: 4,
    title: "Catalog Data Sync",
    description: "Synchronize products, categories, stock levels, and store collections.",
    nextAction: "Sync Store Products",
  },
  theme: {
    stepNumber: 5,
    title: "Theme & Layout",
    description: "Customize your mobile app template, layout sections, and theme palette.",
    nextAction: "Customize Mobile Theme",
  },
  branding: {
    stepNumber: 6,
    title: "Branding & App Icon",
    description: "Upload your app launcher icon, splash banner, and app title.",
    nextAction: "Configure Branding Assets",
  },
  preview: {
    stepNumber: 7,
    title: "Live Interactive Preview",
    description: "Test drive your app inside the interactive device simulator.",
    nextAction: "Test Drive Live Simulator",
  },
  integrations: {
    stepNumber: 8,
    title: "Integrations & Add-ons",
    description: "Configure WhatsApp order notifications, push alerts, and analytics.",
    nextAction: "Setup Integrations",
  },
  payment: {
    stepNumber: 9,
    title: "Plan & Package Selection",
    description: "Choose your per-app license plan (Basic, Pro, Premium) and checkout.",
    nextAction: "Select Package & License",
  },
  build: {
    stepNumber: 10,
    title: "Compilation & APK Build",
    description: "Compile and download your native Android APK and Google Play .AAB.",
    nextAction: "Compile Mobile Build",
  },
};

function UserDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<
    "apps" | "builds" | "purchases" | "plans" | "addons" | "custom_features"
  >("apps");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam &&
      ["apps", "builds", "purchases", "plans", "addons", "custom_features"].includes(tabParam)
    ) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [rebuildMessage, setRebuildMessage] = useState<string | null>(null);
  const [rebuildingAppUlids, setRebuildingAppUlids] = useState<Record<string, boolean>>({});

  // Feature Claiming & Perks State
  const [claimingFeatureKey, setClaimingFeatureKey] = useState<string | null>(null);
  const [claimedSuccessNotice, setClaimedSuccessNotice] = useState<{ appName: string; featureTitle: string } | null>(null);
  const [featureTabFilter, setFeatureTabFilter] = useState<Record<string, "unclaimed" | "claimed" | "all">>({});
  const [appFilterTab, setAppFilterTab] = useState<"all" | "active" | "drafts">("all");

  // Upgrade Modal State
  const [upgradeTargetPkg, setUpgradeTargetPkg] = useState<any | null>(null);
  const [upgradeTargetApp, setUpgradeTargetApp] = useState<any | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null);

  // Invoice Receipt Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Add-on Checkout State
  const [selectedAddon, setSelectedAddon] = useState<any | null>(null);
  const [selectedAddonAppId, setSelectedAddonAppId] = useState<string | number | null>(null);
  const [selectedAppByAddon, setSelectedAppByAddon] = useState<Record<string | number, string | number>>({});
  const [isPurchasingAddon, setIsPurchasingAddon] = useState(false);
  const [addonMessage, setAddonMessage] = useState<string | null>(null);

  // Synchronous refs to prevent rapid double-clicks from firing duplicate payment requests
  const isUpgradingRef = useRef(false);
  const isPurchasingAddonRef = useRef(false);
  const isProcessingQuoteRef = useRef(false);

  // Custom Feature Modal & Accept Quote State
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customFeatureName, setCustomFeatureName] = useState("");
  const [customFeatureReqs, setCustomFeatureReqs] = useState("");
  const [customFeatureUrl, setCustomFeatureUrl] = useState("");
  const [customFeatureFunc, setCustomFeatureFunc] = useState("");
  const [customFeatureNotes, setCustomFeatureNotes] = useState("");
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);
  const [customActionMessage, setCustomActionMessage] = useState<string | null>(null);
  const [processingQuoteId, setProcessingQuoteId] = useState<number | null>(null);

  // Client mount state for React portals
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scrolling when any popup modal is open so the popup stays fixed with zero scrolling
  useEffect(() => {
    if (selectedAddon || upgradeTargetPkg || isCustomModalOpen || selectedInvoice) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [selectedAddon, upgradeTargetPkg, isCustomModalOpen, selectedInvoice]);

  // App details drilldown
  const [viewingAppDetails, setViewingAppDetails] = useState<any | null>(null);
  const [appConfigData, setAppConfigData] = useState<any | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // 1. Fetch User Profile
  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiClient("/api/auth/me"),
    retry: false,
  });

  const user = userData?.user;
  const isAdmin = Boolean(user?.is_super_admin || user?.email === "admin@webintoapp.com");

  // Redirect admin users to the dedicated Admin Oversight Dashboard
  useEffect(() => {
    if (!isUserLoading && user && isAdmin) {
      router.replace("/dashboard/admin");
    }
  }, [isUserLoading, user, isAdmin, router]);

  // 2. Fetch User's Applications (with builds & connections)
  const {
    data: apps,
    isLoading: isAppsLoading,
    refetch: refetchApps,
  } = useQuery({
    queryKey: ["apps"],
    queryFn: async () => {
      try {
        const res = await apiClient("/api/apps");
        return Array.isArray(res) ? res : res.apps || [];
      } catch {
        return [];
      }
    },
  });

  const isAppDraft = (appItem: any) => {
    const builds = appItem?.builds || [];
    const hasReadyBuild = builds.some((b: any) => b.is_ready || b.status === "ready");
    return Boolean(
      !appItem?.is_completed &&
      !hasReadyBuild &&
      appItem?.status !== "completed" &&
      appItem?.status !== "live" &&
      appItem?.status !== "active"
    );
  };

  const hasPreviouslyBuiltApps = Boolean(
    user?.has_built_apps ||
    (apps &&
      apps.length > 0 &&
      apps.some((a: any) => !isAppDraft(a)))
  );

  // Redirect unauthenticated visitors to login
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/login");
    }
  }, [isUserLoading, user, router]);

  // 3. Fetch Billing & Subscriptions
  const {
    data: billingData,
    isLoading: isBillingLoading,
    refetch: refetchBilling,
  } = useQuery({
    queryKey: ["billing-data"],
    queryFn: () => apiClient("/api/billing"),
  });

  // 4. Fetch Customer Verified Orders
  const {
    data: ordersData,
    isLoading: isOrdersLoading,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ["orders", "my-orders"],
    queryFn: () => apiClient("/api/orders/my-orders"),
  });
  const myOrders = ordersData?.orders || [];

  // 5. Fetch Custom Feature Requests
  const {
    data: customFeaturesData,
    isLoading: isCustomLoading,
    refetch: refetchCustomFeatures,
  } = useQuery({
    queryKey: ["custom-features"],
    queryFn: () => apiClient("/api/custom-features"),
  });
  const myCustomRequests = customFeaturesData?.requests || [];

  // 6. Fetch Packages
  const { data: packagesData } = useQuery({
    queryKey: ["commercial", "packages"],
    queryFn: () => apiClient("/api/commercial/packages"),
  });
  const commercialPackages = packagesData?.packages || [];

  // 7. Fetch Add-ons
  const { data: addonsData } = useQuery({
    queryKey: ["commercial", "addons"],
    queryFn: () => apiClient("/api/commercial/addons"),
  });
  const commercialAddons = addonsData?.addons || [];

  const primaryApp = apps?.[0];

  const appHasAddon = (targetApp: any, addon: any): boolean => {
    if (!targetApp || !addon) return false;

    // 1. Check purchased addon IDs attached to app
    if (
      Array.isArray(targetApp.purchased_addon_ids) &&
      targetApp.purchased_addon_ids.includes(addon.id)
    ) {
      return true;
    }

    // 2. Check purchased addon slugs attached to app
    const addonSlug = (addon.slug || "").toLowerCase();
    if (
      addonSlug &&
      Array.isArray(targetApp.purchased_addon_slugs) &&
      targetApp.purchased_addon_slugs.includes(addonSlug)
    ) {
      return true;
    }

    // 3. Cross-reference customer verified orders from myOrders
    const foundInOrders = myOrders?.some((order: any) => {
      if (order.status !== "paid") return false;
      const isSameApp =
        (order.app_id && String(order.app_id) === String(targetApp.id)) ||
        (order.app_ulid && order.app_ulid === targetApp.ulid) ||
        (order.app_name && order.app_name === targetApp.name);
      if (!isSameApp) return false;
      return order.items?.some((item: any) => {
        const itemSlug = (item.slug || item.meta?.slug || "").toLowerCase();
        const itemName = (item.name || "").toLowerCase();
        const currentAddonName = (addon.name || "").toLowerCase();
        return (
          item.item_type === "addon" &&
          (item.item_id === addon.id ||
            itemSlug === addonSlug ||
            itemName.includes(addonSlug) ||
            itemName.includes(currentAddonName) ||
            currentAddonName.includes(itemName))
        );
      });
    });
    if (foundInOrders) return true;

    // 4. Inherent plan capabilities
    if (
      addonSlug.includes("play_store") ||
      addonSlug.includes("aab") ||
      (addon.badge || "").toLowerCase().includes("play store")
    ) {
      if (targetApp.can_aab) return true;
      const planName = (targetApp.active_plan?.name || "").toLowerCase();
      if (planName.includes("pro") || planName.includes("premium") || planName.includes("enterprise")) {
        return true;
      }
    }

    if (
      addonSlug.includes("admin_panel") ||
      (addon.badge || "").toLowerCase().includes("admin panel")
    ) {
      if (targetApp.has_admin_panel) return true;
      const planName = (targetApp.active_plan?.name || "").toLowerCase();
      if (planName.includes("premium") || planName.includes("enterprise")) {
        return true;
      }
    }

    return false;
  };
  const activeSub = billingData?.active_sub;

  // Active Plan Resolution
  const currentPlan =
    primaryApp?.active_plan ||
    activeSub?.plan || {
      id: 1,
      name: "Basic",
      price_monthly: 299900,
      can_apk: true,
      can_aab: false,
      has_admin_panel: false,
    };

  const builds = primaryApp?.builds || [];
  const readyBuild =
    builds.find((b: any) => b.status === "ready" || b.status?.value === "ready") || builds[0];
  const latestBuild = readyBuild || builds[0];
  const targetBuildId = latestBuild?.id;

  // Entitlement Flags
  const canDownloadApk = primaryApp?.can_apk ?? (currentPlan.can_apk ?? true);
  const canDownloadAab =
    primaryApp?.can_aab ??
    (currentPlan.can_aab ??
      (currentPlan.name !== "Basic" &&
        currentPlan.name !== "Basic App" &&
        currentPlan.name !== "Starter"));
  const hasAdminPanel =
    primaryApp?.has_admin_panel ??
    (currentPlan.has_admin_panel ??
      (currentPlan.name === "Premium" ||
        currentPlan.name === "Premium Package" ||
        currentPlan.name === "Enterprise Suite"));

  const formatPrice = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

  const totalBuildsCount = apps
    ? apps.reduce((acc: number, a: any) => acc + (a.builds?.length || 0), 0)
    : builds.length;

  const appPlanSummary = (() => {
    if (!apps || apps.length === 0) return "No packages yet";
    const counts: Record<string, number> = {};
    for (const a of apps) {
      const pName = a.active_plan?.name || "Basic";
      counts[pName] = (counts[pName] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, count]) => `${count} ${name}`)
      .join(", ");
  })();

  const fallbackCommercialPackages = [
    {
      id: 1,
      slug: "basic",
      name: "Basic",
      price_monthly: 299900,
      can_apk: true,
      can_aab: false,
      has_admin_panel: false,
    },
    {
      id: 2,
      slug: "pro",
      name: "Pro",
      price_monthly: 799900,
      can_apk: true,
      can_aab: true,
      has_admin_panel: false,
    },
    {
      id: 3,
      slug: "premium",
      name: "Premium",
      price_monthly: 1499900,
      can_apk: true,
      can_aab: true,
      has_admin_panel: true,
    },
  ];

  const displayedPackages =
    commercialPackages && commercialPackages.length > 0
      ? commercialPackages
      : fallbackCommercialPackages;

  const fallbackCommercialAddons = [
    {
      id: 6,
      name: "Google Play Store Build & Submission (.AAB)",
      slug: "play_store_publish",
      price: 149900,
      price_formatted: "₹1,499",
      category: "publishing",
      badge: "Play Store Build",
      description:
        "Compile production-ready Google Play .AAB bundles, generate store listing assets, and receive complete submission assistance to Google Play Console.",
      features: [
        "Google Play Console submission",
        "Signed .AAB bundle generation",
        "Store listing graphics & banners",
        "Privacy policy hosting & approval guarantee",
      ],
    },
    {
      id: 5,
      name: "Dedicated Admin Panel Access Module",
      slug: "admin_panel_addon",
      price: 299900,
      price_formatted: "₹2,999",
      category: "admin",
      badge: "Admin Panel",
      description:
        "Web-based admin portal for your app. Manage push notification campaigns, live store catalog sync, user analytics, and app configuration.",
      features: [
        "Web management portal access",
        "Push notification composer & history",
        "Live catalog sync trigger",
        "Multi-staff role access",
      ],
    },
    {
      id: 1,
      name: "Push Notifications Campaign Engine",
      slug: "push_notifications",
      price: 99900,
      price_formatted: "₹999",
      category: "marketing",
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
      category: "support",
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
      category: "analytics",
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
      category: "customization",
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
      category: "branding",
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
      category: "infrastructure",
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

  // Prioritize Play Store Build and Admin Panel so they are always at the top of the grid
  const displayedAddons = (
    commercialAddons && commercialAddons.length > 0 ? commercialAddons : fallbackCommercialAddons
  )
    .slice()
    .sort((a: any, b: any) => {
      const getPriority = (item: any) => {
        const slug = (item.slug || "").toLowerCase();
        const name = (item.name || "").toLowerCase();
        if (slug.includes("play_store") || name.includes("play store") || name.includes("aab")) return 1;
        if (slug.includes("admin_panel") || name.includes("admin panel")) return 2;
        return 3;
      };
      return getPriority(a) - getPriority(b);
    });

  const handleUsePlan = (pkg: any) => {
    try {
      const planKey = (pkg.slug || pkg.name || "basic").toLowerCase();
      localStorage.setItem("appifyhub_selected_plan", planKey);
      localStorage.setItem("appifyhub_selected_plan_id", String(pkg.id));
      localStorage.setItem(
        "appifyhub_selected_plan_info",
        JSON.stringify({
          id: pkg.id,
          name: pkg.name,
          price_monthly: pkg.price_monthly,
          slug: planKey,
        })
      );
      router.push(`/dashboard/apps/new?plan=${encodeURIComponent(planKey)}`);
    } catch {
      router.push("/dashboard/apps/new");
    }
  };

  const handleRebuildForApp = async (targetApp: any) => {
    if (!targetApp?.ulid) return;
    setRebuildingAppUlids((prev) => ({ ...prev, [targetApp.ulid]: true }));
    setIsRebuilding(true);
    setRebuildMessage(null);
    try {
      await apiClient(`/api/apps/${targetApp.ulid}/builds`, { method: "POST" });
      setRebuildMessage(`Build job for "${targetApp.name}" queued successfully! Compiling Android binaries...`);
      await refetchApps();
    } catch (err: any) {
      setRebuildMessage(err.message || `Failed to trigger build for ${targetApp.name}.`);
    } finally {
      setRebuildingAppUlids((prev) => ({ ...prev, [targetApp.ulid]: false }));
      setIsRebuilding(false);
    }
  };

  const handleRebuild = async () => {
    if (!primaryApp) return;
    await handleRebuildForApp(primaryApp);
  };

  const handleClaimFeature = async (targetApp: any, feature: any) => {
    const claimId = `${targetApp.ulid}_${feature.key}`;
    setClaimingFeatureKey(claimId);
    try {
      const res = await apiClient(`/api/apps/${targetApp.ulid}/features/claim`, {
        method: "POST",
        body: JSON.stringify({ feature_key: feature.key }),
      });

      if (res?.success) {
        setClaimedSuccessNotice({
          appName: targetApp.name,
          featureTitle: feature.title,
        });
        await refetchApps();
      }
    } catch (err: any) {
      alert(err.message || "Failed to claim feature. Please try again.");
    } finally {
      setClaimingFeatureKey(null);
    }
  };


  const getAppFeatureCatalog = (appItem: any) => {
    const appPlan =
      appItem.active_plan ||
      activeSub?.plan || {
        id: 1,
        name: "Basic",
        price_monthly: 299900,
        can_apk: true,
        can_aab: false,
        has_admin_panel: false,
      };

    const planSlug = (appPlan.slug || appPlan.name || "").toLowerCase();
    const isProTier =
      planSlug.includes("pro") ||
      planSlug.includes("premium") ||
      planSlug.includes("enterprise") ||
      Boolean(appPlan.can_aab);

    const isPremiumTier =
      planSlug.includes("premium") ||
      planSlug.includes("enterprise") ||
      Boolean(appPlan.has_admin_panel);

    const hasAdminAddon =
      Boolean(
        (Array.isArray(appItem.purchased_addon_slugs) &&
          (appItem.purchased_addon_slugs.includes("admin_panel_addon") ||
            appItem.purchased_addon_slugs.includes("admin_panel"))) ||
        myOrders?.some(
          (o: any) =>
            o.status === "paid" &&
            (String(o.app_id) === String(appItem.id) || o.app_ulid === appItem.ulid) &&
            o.items?.some(
              (i: any) =>
                i.meta?.slug === "admin_panel_addon" ||
                i.meta?.slug === "admin_panel" ||
                i.item_id === 5 ||
                (i.name && i.name.toLowerCase().includes("admin panel"))
            )
        )
      );

    const appHasAdmin = Boolean(
      appItem.has_admin_panel ||
      hasAdminAddon ||
      appPlan.has_admin_panel ||
      isPremiumTier ||
      planSlug.includes("enterprise") ||
      appPlan.name === "Premium" ||
      appPlan.name === "Enterprise" ||
      appPlan.name === "Enterprise Suite"
    );

    const appConfig = appItem.configs?.[0]?.config || {};
    const activeFeatures = appConfig.features || {};
    const claimedFeaturesList: string[] = appConfig.claimed_features || [];

    const hasWhatsAppAddon = myOrders.some(
      (o: any) =>
        o.status === "paid" &&
        o.items?.some((i: any) => i.meta?.slug === "whatsapp_sync" || i.item_id === 2)
    );
    const hasAnalyticsAddon = myOrders.some(
      (o: any) =>
        o.status === "paid" &&
        o.items?.some((i: any) => i.meta?.slug === "analytics" || i.item_id === 3)
    );
    const hasCustomNavAddon = myOrders.some(
      (o: any) =>
        o.status === "paid" &&
        o.items?.some((i: any) => i.meta?.slug === "custom_nav" || i.item_id === 4)
    );
    const hasPublishingAddon = myOrders.some(
      (o: any) =>
        o.status === "paid" &&
        o.items?.some((i: any) => i.meta?.slug === "play_store_publish" || i.item_id === 6)
    );
    const hasWhiteLabelAddon = myOrders.some(
      (o: any) =>
        o.status === "paid" &&
        o.items?.some((i: any) => i.meta?.slug === "white_label" || i.item_id === 7)
    );

    const catalog = [
      {
        key: "reviews",
        title: "Customer Reviews",
        category: "Engagement & Trust",
        desc: "Verified buyer ratings and reviews.",
        icon: Star,
        source: `${appPlan.name} Package`,
        isEntitled: isProTier || Boolean(appPlan.features?.reviews),
        isClaimed: Boolean(activeFeatures.reviews || claimedFeaturesList.includes("reviews")),
      },
      {
        key: "whatsapp",
        title: "WhatsApp Live Chat",
        category: "Automation & Support",
        desc: "In-app chat and automated alerts.",
        icon: MessageSquare,
        source: isProTier ? `${appPlan.name} Package` : "Add-on License",
        isEntitled: isProTier || hasWhatsAppAddon || Boolean(appPlan.features?.whatsapp),
        isClaimed: Boolean(activeFeatures.whatsapp || claimedFeaturesList.includes("whatsapp")),
      },
      {
        key: "vip_support",
        title: "Priority VIP Support",
        category: "VIP Service",
        desc: "Priority developer support and onboarding.",
        icon: ShieldCheck,
        source: `${appPlan.name} Package`,
        isEntitled: isProTier,
        isClaimed: claimedFeaturesList.includes("vip_support") || Boolean(activeFeatures.vip_support),
      },
      {
        key: "custom_nav",
        title: "Custom App Navigation",
        category: "Customization",
        desc: "Tailored navigation menus and tabs.",
        icon: HardDrive,
        source: isProTier ? `${appPlan.name} Package` : "Navigation Add-on",
        isEntitled: isProTier || hasCustomNavAddon,
        isClaimed: Boolean(activeFeatures.custom_nav || claimedFeaturesList.includes("custom_nav")),
      },
      {
        key: "play_store_publish",
        title: "Play Store Publishing",
        category: "Distribution",
        desc: "Assisted Google Play Store submission.",
        icon: Rocket,
        source: isPremiumTier ? `${appPlan.name} Package` : "Publishing Add-on",
        isEntitled: isPremiumTier || hasPublishingAddon,
        isClaimed: Boolean(activeFeatures.play_store_publish || claimedFeaturesList.includes("play_store_publish")),
      },
      {
        key: "admin_panel",
        title: "Dedicated Admin Panel",
        category: "Store Oversight",
        desc: "Dedicated real-time management console.",
        icon: LayoutDashboard,
        source: isPremiumTier ? `${appPlan.name} Package` : "Admin Add-on",
        isEntitled: appHasAdmin,
        isClaimed: Boolean(activeFeatures.admin_panel || claimedFeaturesList.includes("admin_panel")),
      },
      {
        key: "white_label",
        title: "White-Label Branding",
        category: "Branding",
        desc: "Complete branding and watermark removal.",
        icon: Sparkles,
        source: isPremiumTier ? `${appPlan.name} Package` : "White-Label Add-on",
        isEntitled: isPremiumTier || hasWhiteLabelAddon,
        isClaimed: Boolean(activeFeatures.white_label || claimedFeaturesList.includes("white_label")),
      },
      {
        key: "analytics",
        title: "In-App Analytics",
        category: "Growth & Telemetry",
        desc: "Real-time traffic and conversion analytics.",
        icon: Layers,
        source: isPremiumTier ? `${appPlan.name} Package` : "Analytics Add-on",
        isEntitled: isPremiumTier || hasAnalyticsAddon,
        isClaimed: Boolean(activeFeatures.analytics || claimedFeaturesList.includes("analytics")),
      },
      {
        key: "notifications",
        title: "Push Notifications",
        category: "Marketing",
        desc: "Instant broadcast mobile push campaigns.",
        icon: Bell,
        source: `${appPlan.name} Package`,
        isEntitled: true,
        isClaimed: Boolean(activeFeatures.notifications !== false),
      },
    ];

    const entitled = catalog.filter((c) => c.isEntitled);
    const unclaimed = entitled.filter((c) => !c.isClaimed);
    const claimed = entitled.filter((c) => c.isClaimed);

    return { catalog, entitled, unclaimed, claimed, appPlan, appHasAdmin };
  };


  // ── 1-CLICK PACKAGE UPGRADE FLOW (DIFFERENCE ONLY) ──
  const handleInitiateUpgrade = async (targetPkg: any) => {
    const targetApp = upgradeTargetApp || primaryApp;
    if (!targetApp?.id) return;
    if (isUpgradingRef.current || isUpgrading) return; // Prevent double-click

    isUpgradingRef.current = true;
    setIsUpgrading(true);
    setUpgradeMessage(null);

    const appCurrentPlan = targetApp?.active_plan || targetApp?.plan || currentPlan;

    await withSinglePaymentLock(async () => {
      try {
        // 1. Create order on server (charges ONLY the difference)
        const checkoutRes = await apiClient("/api/orders/checkout", {
          method: "POST",
          body: JSON.stringify({
            type: "upgrade",
            app_id: targetApp.id,
            package_id: targetPkg.id,
            customer_name: user?.name || "",
            customer_email: user?.email || "",
            currency: "INR",
          }),
        });

        if (!checkoutRes?.success || !checkoutRes?.order) {
          throw new Error(checkoutRes?.message || "Failed to calculate upgrade price difference.");
        }

        const orderData = checkoutRes.order;

        // 2. Open Razorpay Checkout modal
        const paymentResponse = await openRazorpayModal({
          orderId: orderData.gateway_order_id || orderData.order_id,
          amount: orderData.amount,
          currency: orderData.currency || "INR",
          keyId:
            orderData.key_id ||
            process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
            "rzp_test_SnbtbVtFnRIrAI",
          name: "WebIntoApp",
          description: `Upgrade "${targetApp.name}" from ${appCurrentPlan.name} to ${targetPkg.name}`,
          prefill: {
            name: user?.name,
            email: user?.email,
          },
          themeColor: "#78593D",
        });

        // 3. Verify Razorpay signature on server
        const verifyRes = await apiClient("/api/orders/verify", {
          method: "POST",
          body: JSON.stringify({
            order_id: orderData.id,
            razorpay_order_id: paymentResponse.razorpay_order_id,
            razorpay_payment_id: paymentResponse.razorpay_payment_id,
            razorpay_signature: paymentResponse.razorpay_signature,
          }),
        });

        if (!verifyRes?.success) {
          throw new Error(verifyRes?.message || "Payment signature verification failed.");
        }

        setUpgradeMessage(
          `Upgraded "${targetApp.name}" to ${targetPkg.name} successfully! Newly unlocked capabilities (including ${
            targetPkg.can_aab ? "Google Play .AAB" : ""
          } ${targetPkg.has_admin_panel ? "& Admin Panel" : ""}) are now active.`
        );
        setUpgradeTargetPkg(null);
        setUpgradeTargetApp(null);
        await refetchApps();
        await refetchBilling();
        await refetchOrders();
      } catch (err: any) {
        if (err.message === "PAYMENT_CANCELLED") {
          setUpgradeMessage("Upgrade payment was dismissed.");
        } else if (err.message !== "PAYMENT_ALREADY_IN_PROGRESS") {
          setUpgradeMessage(err.message || "Failed to process upgrade.");
        }
      } finally {
        isUpgradingRef.current = false;
        setIsUpgrading(false);
      }
    });
  };

  // ── PURCHASE ADD-ON FLOW ──
  const handlePurchaseAddon = async (addon: any, targetAppOverride?: any) => {
    if (isPurchasingAddonRef.current || isPurchasingAddon) return; // Prevent double-click
    const selectedAppId =
      targetAppOverride?.id ||
      selectedAddonAppId ||
      selectedAppByAddon[addon?.id];

    const targetApp =
      targetAppOverride ||
      apps?.find((a: any) => String(a.id) === String(selectedAppId)) ||
      null;

    if (!targetApp?.id) {
      alert("Please select the required application from the dropdown to enable this add-on.");
      return;
    }

    isPurchasingAddonRef.current = true;
    setIsPurchasingAddon(true);
    setAddonMessage(null);

    await withSinglePaymentLock(async () => {
      try {
        const checkoutRes = await apiClient("/api/orders/checkout", {
          method: "POST",
          body: JSON.stringify({
            type: "addon",
            app_id: targetApp.id,
            app_ulid: targetApp.ulid,
            addon_ids: [addon.id],
            customer_name: user?.name || "",
            customer_email: user?.email || "",
            currency: "INR",
          }),
        });

        if (!checkoutRes?.success || !checkoutRes?.order) {
          throw new Error(checkoutRes?.message || "Failed to create add-on order.");
        }

        const orderData = checkoutRes.order;

        const paymentResponse = await openRazorpayModal({
          orderId: orderData.gateway_order_id || orderData.order_id,
          amount: orderData.amount,
          currency: orderData.currency || "INR",
          keyId:
            orderData.key_id ||
            process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
            "rzp_test_SnbtbVtFnRIrAI",
          name: "WebIntoApp",
          description: `Add-on: ${addon.name} (${targetApp.name})`,
          prefill: {
            name: user?.name,
            email: user?.email,
          },
          themeColor: "#78593D",
        });

        await apiClient("/api/orders/verify", {
          method: "POST",
          body: JSON.stringify({
            order_id: orderData.id,
            razorpay_order_id: paymentResponse.razorpay_order_id,
            razorpay_payment_id: paymentResponse.razorpay_payment_id,
            razorpay_signature: paymentResponse.razorpay_signature,
          }),
        });

        setAddonMessage(`Add-on "${addon.name}" enabled successfully for ${targetApp.name}!`);
        setSelectedAddon(null);
        await refetchOrders();
        await refetchApps();
      } catch (err: any) {
        if (err.message !== "PAYMENT_CANCELLED" && err.message !== "PAYMENT_ALREADY_IN_PROGRESS") {
          setAddonMessage(err.message || "Failed to purchase add-on.");
        }
      } finally {
        isPurchasingAddonRef.current = false;
        setIsPurchasingAddon(false);
      }
    });
  };

  // ── ACCEPT & PAY CUSTOM QUOTE FLOW ──
  const handleAcceptAndPayQuote = async (req: any) => {
    if (isProcessingQuoteRef.current || processingQuoteId) return; // Prevent double-click
    isProcessingQuoteRef.current = true;
    setProcessingQuoteId(req.id);
    setCustomActionMessage(null);

    await withSinglePaymentLock(async () => {
      try {
        // 1. Accept quote and generate order
        const acceptRes = await apiClient(`/api/custom-features/${req.id}/accept`, {
          method: "POST",
        });

        if (!acceptRes?.success || !acceptRes?.order) {
          throw new Error(acceptRes?.message || "Failed to accept quote.");
        }

        const orderData = acceptRes.order;

        // 2. Open Razorpay Checkout modal
        const paymentResponse = await openRazorpayModal({
          orderId: orderData.gateway_order_id || orderData.order_id,
          amount: orderData.amount,
          currency: orderData.currency || "INR",
          keyId:
            orderData.key_id ||
            process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
            "rzp_test_SnbtbVtFnRIrAI",
          name: "WebIntoApp",
          description: `Custom Feature: ${req.feature_name}`,
          prefill: {
            name: user?.name,
            email: user?.email,
          },
          themeColor: "#78593D",
        });

        // 3. Verify Razorpay signature on server
        await apiClient("/api/orders/verify", {
          method: "POST",
          body: JSON.stringify({
            order_id: orderData.id,
            razorpay_order_id: paymentResponse.razorpay_order_id,
            razorpay_payment_id: paymentResponse.razorpay_payment_id,
            razorpay_signature: paymentResponse.razorpay_signature,
          }),
        });

        setCustomActionMessage(
          `Payment verified for Ticket #${req.ticket_number}! Development status is now Approved and in progress.`
        );
        await refetchCustomFeatures();
        await refetchOrders();
      } catch (err: any) {
        if (err.message !== "PAYMENT_CANCELLED" && err.message !== "PAYMENT_ALREADY_IN_PROGRESS") {
          setCustomActionMessage(err.message || "Could not complete quote payment.");
        }
      } finally {
        isProcessingQuoteRef.current = false;
        setProcessingQuoteId(null);
      }
    });
  };

  const handleRejectQuote = async (reqId: number) => {
    if (!confirm("Are you sure you want to decline this quote?")) return;
    try {
      await apiClient(`/api/custom-features/${reqId}/reject`, { method: "POST" });
      await refetchCustomFeatures();
      setCustomActionMessage("Quote was rejected.");
    } catch (err: any) {
      alert(err.message || "Failed to reject quote.");
    }
  };

  const handleCustomFeatureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFeatureName.trim() || !customFeatureReqs.trim()) return;
    setIsSubmittingCustom(true);
    try {
      const res = await apiClient("/api/custom-features", {
        method: "POST",
        body: JSON.stringify({
          app_id: primaryApp?.id || null,
          feature_name: customFeatureName,
          requirements: customFeatureReqs,
          reference_url: customFeatureUrl,
          expected_functionality: customFeatureFunc,
          additional_notes: customFeatureNotes,
        }),
      });
      if (res?.success) {
        setCustomActionMessage(
          `Request submitted! Ticket #${res.request.ticket_number}. Status: Pending Review.`
        );
        setCustomFeatureName("");
        setCustomFeatureReqs("");
        setCustomFeatureUrl("");
        setCustomFeatureFunc("");
        setCustomFeatureNotes("");
        setIsCustomModalOpen(false);
        await refetchCustomFeatures();
      }
    } catch (err: any) {
      alert(err.message || "Failed to submit custom request.");
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  const handleOpenAppDetails = async (app: any, initialSection?: string) => {
    setViewingAppDetails(app);
    setIsLoadingConfig(true);
    try {
      const res = await apiClient(`/api/apps/${app.ulid}/config/draft`);
      if (res?.config) {
        setAppConfigData(res.config);
      } else if (app?.configs?.[0]?.config) {
        setAppConfigData(app.configs[0].config);
      }
    } catch {
      if (app?.configs?.[0]?.config) {
        setAppConfigData(app.configs[0].config);
      }
    } finally {
      setIsLoadingConfig(false);
      if (initialSection) {
        setTimeout(() => {
          const el = document.getElementById(initialSection);
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 150);
      }
    }
  };

  if (viewingAppDetails) {
    return (
      <AppDetailsView
        app={viewingAppDetails}
        currentPlan={viewingAppDetails.active_plan || viewingAppDetails.plan || currentPlan}
        config={appConfigData || viewingAppDetails?.configs?.[0]?.config}
        isLoadingConfig={isLoadingConfig}
        onBack={() => {
          setViewingAppDetails(null);
          setAppConfigData(null);
        }}
        onNavigateToTab={(tab) => {
          setViewingAppDetails(null);
          setAppConfigData(null);
          setActiveTab(tab as any);
        }}
        onRebuild={handleRebuild}
        isRebuilding={isRebuilding}
        addons={displayedAddons}
        onPurchaseAddon={async (addon) => {
          await handlePurchaseAddon(addon, viewingAppDetails);
          const freshApps = await refetchApps();
          const refreshed = freshApps?.data?.find((a: any) => String(a.id) === String(viewingAppDetails.id));
          if (refreshed) {
            setViewingAppDetails(refreshed);
          }
        }}
        isPurchasingAddon={isPurchasingAddon}
        appHasAddon={(targetApp, addon) => appHasAddon(targetApp || viewingAppDetails, addon)}
        user={user}
      />
    );
  }

  if (isUserLoading || (isAppsLoading && !apps)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <Loader2 className="w-9 h-9 text-[#78593D] animate-spin mb-4" />
        <h2 className="text-base font-bold text-slate-800">Loading your applications...</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Retrieving your configured applications and package deliverables.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-sans">
      {/* ── TOP HERO BAR ── */}
      <div className="bg-white border border-[#EBE6DF] rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#78593D] via-[#8E6D4E] to-[#C2A88F] text-white font-extrabold text-2xl sm:text-3xl flex items-center justify-center shadow-lg shadow-[#78593D]/20 flex-shrink-0">
              {(user?.name || primaryApp?.name || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#1C1917] tracking-tight">
                  Welcome back, {user?.name || "Store Owner"}!
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Verified Client
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#57514B] mt-1">
                {user?.email || "owner@store.com"}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-[#7E756B]">
                <span className="flex items-center gap-1.5 font-semibold text-[#1C1917]">
                  <Smartphone className="w-3.5 h-3.5 text-[#78593D]" />
                  <span>{apps?.length ?? 0} {apps?.length === 1 ? "App" : "Apps"} Configured</span>
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Per-App Lifetime Licensing</span>
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-1.5 text-[#57514B]">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Independent App Packages</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab("plans")}
              className="px-4 py-2.5 rounded-xl border border-[#78593D] bg-[#EFEAE2]/60 hover:bg-[#EFEAE2] text-[#78593D] text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Package className="w-4 h-4 text-[#78593D]" />
              <span>All Plans &amp; Packages</span>
            </button>
            <button
              onClick={() => setActiveTab("addons")}
              className="px-4 py-2.5 rounded-xl border border-[#EBE6DF] bg-white hover:bg-[#F7F5F0] text-[#57514B] text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#78593D]" />
              <span>Add Features</span>
            </button>
            <Link
              href="/dashboard/apps/new"
              className="px-4 py-2.5 rounded-xl bg-[#78593D] hover:bg-[#634932] text-white text-xs font-bold transition flex items-center gap-2 shadow-md shadow-[#78593D]/20"
            >
              <Plus className="w-4 h-4" />
              <span>Build New App</span>
            </Link>
          </div>
        </div>

        {/* Metric Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-[#EBE6DF]">
          <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF]">
            <span className="text-[11px] font-bold text-[#7E756B] uppercase tracking-wider">
              Active Apps
            </span>
            <div className="text-xl sm:text-2xl font-black text-[#1C1917] mt-1">
              {apps?.length ?? 0}
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> Fully Connected
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF]">
            <span className="text-[11px] font-bold text-[#7E756B] uppercase tracking-wider">
              Compiled Builds
            </span>
            <div className="text-xl sm:text-2xl font-black text-[#1C1917] mt-1">{totalBuildsCount}</div>
            <span className="text-[11px] text-[#78593D] font-semibold flex items-center gap-1 mt-0.5">
              <Package className="w-3 h-3" />
              {totalBuildsCount > 0
                ? `${totalBuildsCount} Production Binaries`
                : "No builds yet"}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF]">
            <span className="text-[11px] font-bold text-[#7E756B] uppercase tracking-wider">
              App Packages
            </span>
            <div className="text-xl sm:text-2xl font-black text-[#1C1917] mt-1">
              {apps?.length ?? 0} Licensed
            </div>
            <span className="text-[11px] text-[#78593D] font-semibold flex items-center gap-1 mt-0.5 truncate" title={appPlanSummary}>
              <Layers className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{appPlanSummary} (Per-App)</span>
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF]">
            <span className="text-[11px] font-bold text-[#7E756B] uppercase tracking-wider">
              Commercial Orders
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
              {myOrders.length} Verified
            </div>
            <span className="text-[11px] text-[#7E756B] font-semibold flex items-center gap-1 mt-0.5">
              <Receipt className="w-3 h-3" /> Invoices Ready
            </span>
          </div>
        </div>
      </div>

      {/* Global Action Messages */}
      {upgradeMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{upgradeMessage}</span>
        </div>
      )}
      {customActionMessage && (
        <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-800 text-xs font-bold border border-indigo-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          <span>{customActionMessage}</span>
        </div>
      )}

      {/* ── DASHBOARD NAVIGATION TABS ── */}
      <div className="flex items-center gap-2 border-b border-[#EBE6DF] pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("apps")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "apps"
              ? "bg-[#78593D] text-white shadow-md shadow-[#78593D]/20"
              : "text-[#57514B] hover:text-[#1C1917] hover:bg-[#EFEAE2]"
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>My Apps &amp; Downloads</span>
        </button>

        <button
          onClick={() => setActiveTab("builds")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "builds"
              ? "bg-[#78593D] text-white shadow-md shadow-[#78593D]/20"
              : "text-[#57514B] hover:text-[#1C1917] hover:bg-[#EFEAE2]"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Build Artifacts ({builds.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("purchases")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "purchases"
              ? "bg-[#78593D] text-white shadow-md shadow-[#78593D]/20"
              : "text-[#57514B] hover:text-[#1C1917] hover:bg-[#EFEAE2]"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>My Purchases &amp; Invoices ({myOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("plans")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "plans"
              ? "bg-[#78593D] text-white shadow-md shadow-[#78593D]/20"
              : "text-[#57514B] hover:text-[#1C1917] hover:bg-[#EFEAE2]"
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Plans &amp; Packages</span>
        </button>

        <button
          onClick={() => setActiveTab("addons")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "addons"
              ? "bg-[#78593D] text-white shadow-md shadow-[#78593D]/20"
              : "text-[#57514B] hover:text-[#1C1917] hover:bg-[#EFEAE2]"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Add-on Marketplace</span>
        </button>

        <button
          onClick={() => setActiveTab("custom_features")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "custom_features"
              ? "bg-[#78593D] text-white shadow-md shadow-[#78593D]/20"
              : "text-[#57514B] hover:text-[#1C1917] hover:bg-[#EFEAE2]"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Custom Quotes ({myCustomRequests.length})</span>
        </button>
      </div>

      {/* ── TAB 1: MY APPS & ENTITLED DOWNLOADS ── */}
      {activeTab === "apps" && (
        <div className="space-y-8">
          {claimedSuccessNotice && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-950 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 font-black shadow-sm">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-emerald-900">
                    "{claimedSuccessNotice.featureTitle}" Claimed Successfully!
                  </h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    This premium module has been activated and bound to <strong>{claimedSuccessNotice.appName}</strong>. It is now ready to use and will be compiled into your mobile build.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClaimedSuccessNotice(null)}
                className="text-emerald-700 hover:text-emerald-900 p-2 rounded-xl hover:bg-emerald-100/70 transition"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {rebuildMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center justify-between border border-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{rebuildMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setRebuildMessage(null)}
                className="text-emerald-700 hover:text-emerald-900 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Applications Filter Toolbar */}
          {apps && apps.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAppFilterTab("all")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    appFilterTab === "all"
                      ? "bg-[#78593D] text-white shadow-xs"
                      : "bg-white text-[#57514B] border border-[#EBE6DF] hover:bg-[#F7F5F0]"
                  }`}
                >
                  <span>All Applications</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      appFilterTab === "all"
                        ? "bg-white/20 text-white"
                        : "bg-[#EFEAE2] text-[#78593D]"
                    }`}
                  >
                    {apps.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAppFilterTab("active")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    appFilterTab === "active"
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "bg-white text-[#57514B] border border-[#EBE6DF] hover:bg-[#F7F5F0]"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Active &amp; Built</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      appFilterTab === "active"
                        ? "bg-white/20 text-white"
                        : "bg-emerald-50 text-emerald-800"
                    }`}
                  >
                    {apps.filter((a: any) => !isAppDraft(a)).length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAppFilterTab("drafts")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    appFilterTab === "drafts"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-white text-[#57514B] border border-[#EBE6DF] hover:bg-[#F7F5F0]"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-200" />
                  <span>Drafts (Incomplete)</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      appFilterTab === "drafts"
                        ? "bg-white/20 text-white"
                        : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {apps.filter((a: any) => isAppDraft(a)).length}
                  </span>
                </button>
              </div>

              <Link
                href="/dashboard/apps/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#78593D] hover:bg-[#634932] text-white rounded-xl text-xs font-bold transition shadow-sm self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create New App</span>
              </Link>
            </div>
          )}

          {apps && apps.length > 0 ? (
            (() => {
              const displayedApps = apps.filter((appItem: any) => {
                if (appFilterTab === "drafts") return isAppDraft(appItem);
                if (appFilterTab === "active") return !isAppDraft(appItem);
                return true;
              });

              if (displayedApps.length === 0) {
                return (
                  <div className="bg-white border border-[#EBE6DF] rounded-3xl p-12 text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#F7F5F0] text-[#78593D] mx-auto flex items-center justify-center">
                      <Clock className="w-7 h-7 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-[#1C1917]">
                        No {appFilterTab === "drafts" ? "Draft" : "Active"} Applications Found
                      </h3>
                      <p className="text-xs text-[#7E756B] mt-1 max-w-md mx-auto">
                        {appFilterTab === "drafts"
                          ? "You don't have any in-progress drafts. All your apps are fully configured!"
                          : "You don't have any completed apps yet. Continue setting up your draft app to build your first APK."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAppFilterTab("all")}
                      className="px-4 py-2 bg-[#78593D] text-white rounded-xl text-xs font-bold transition hover:bg-[#634932] cursor-pointer"
                    >
                      View All Applications
                    </button>
                  </div>
                );
              }

              if (viewMode === "grid") {
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedApps.map((appItem: any) => {
                      const { catalog, entitled, unclaimed, claimed, appPlan, appHasAdmin } = getAppFeatureCatalog(appItem);
                      const appBuilds = appItem.builds || [];
                      const appReadyBuild = appBuilds.find((b: any) => b.status === "ready" || b.status?.value === "ready") || appBuilds[0];
                      const appLatestBuild = appReadyBuild || appBuilds[0];
                      const appTargetBuildId = appLatestBuild?.id;
                      const isDraft = isAppDraft(appItem);
                      const currentStepKey = appItem.setup_step || "platform";
                      const stepInfo = SETUP_STEP_DETAILS[currentStepKey] || {
                        stepNumber: 1,
                        title: "Platform Selection",
                        description: "Configure your store platform and credentials.",
                        nextAction: "Select Platform",
                      };
                      const isAppRebuilding = Boolean(rebuildingAppUlids[appItem.ulid]);
                      const buildPercentage = isAppRebuilding
                        ? 95
                        : Math.max(10, Math.min(90, Math.round(((stepInfo.stepNumber - 1) / 10) * 100)));
                      const circumference = 88;
                      const strokeDashoffset = circumference - (circumference * buildPercentage) / 100;
                      const storeUrl = appItem.connection?.store_url || appItem.connection?.site_url;

                      return (
                        <div
                          key={appItem.id || appItem.ulid}
                          className={`bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group ${
                            isDraft
                              ? "border-2 border-amber-300/80 shadow-amber-500/5"
                              : "border border-[#EBE6DF]"
                          }`}
                        >
                          {isDraft && (
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-300" />
                          )}

                          <div className="space-y-3">
                            {/* App Header Card Top */}
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-10 h-10 rounded-xl text-white font-extrabold text-lg flex items-center justify-center shadow-xs flex-shrink-0 ${
                                  isDraft
                                    ? "bg-gradient-to-tr from-amber-600 to-amber-400 shadow-amber-600/20"
                                    : "bg-gradient-to-tr from-[#78593D] to-[#C2A88F] shadow-[#78593D]/20"
                                }`}
                              >
                                {appItem.name.charAt(0).toUpperCase()}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1.5">
                                  <h3 className="text-sm sm:text-base font-black text-[#1C1917] truncate" title={appItem.name}>
                                    {appItem.name}
                                  </h3>
                                  {isDraft ? (
                                    <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 flex-shrink-0">
                                      Step {stepInfo.stepNumber}/10
                                    </span>
                                  ) : (
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      {appHasAdmin && (
                                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-100 text-[#78593D] border border-amber-300 flex items-center gap-0.5">
                                          <LayoutDashboard className="w-2.5 h-2.5 text-[#78593D]" />
                                          Admin
                                        </span>
                                      )}
                                      <span className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        {appItem.status || "Completed"}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <p className="text-[10.5px] text-[#7E756B] font-mono truncate mt-0.5">
                                  {appItem.package_name || `com.${appItem.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.app`}
                                </p>

                                {storeUrl && (
                                  <p className="text-[10.5px] text-[#57514B] truncate mt-0.5">
                                    <a
                                      href={storeUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[#78593D] hover:underline font-semibold inline-flex items-center gap-1 truncate"
                                    >
                                      <Globe className="w-2.5 h-2.5 text-slate-400 flex-shrink-0" />
                                      <span className="truncate">{storeUrl.replace(/^https?:\/\//, "")}</span>
                                      <ExternalLink className="w-2 h-2 flex-shrink-0 opacity-70" />
                                    </a>
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Middle Info Block (Compact Short-Card 2x2 Grid) */}
                            {isDraft ? (
                              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-50/70 via-[#FDFBF7] to-[#FAF8F5] border border-amber-200/80 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="relative w-6 h-6 flex-shrink-0 flex items-center justify-center">
                                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                        <circle cx="18" cy="18" r="14" stroke="#E8DFD5" strokeWidth="3.5" fill="none" />
                                        <circle
                                          cx="18"
                                          cy="18"
                                          r="14"
                                          stroke="#78593D"
                                          strokeWidth="3.5"
                                          fill="none"
                                          strokeDasharray={circumference}
                                          strokeDashoffset={strokeDashoffset}
                                          strokeLinecap="round"
                                          className="transition-all duration-700 ease-out"
                                        />
                                      </svg>
                                      <span className="absolute text-[8px] font-black text-[#78593D]">
                                        {buildPercentage}%
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-[11px] font-bold text-[#1C1917] block">
                                        Step {stepInfo.stepNumber} of 10
                                      </span>
                                      <span className="text-[9.5px] text-[#7E756B] truncate block">
                                        {stepInfo.nextAction}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-xs font-black text-[#78593D] font-mono">{buildPercentage}%</span>
                                </div>
                                <div className="w-full h-1 bg-amber-100 rounded-full overflow-hidden border border-amber-200/50">
                                  <div
                                    className="h-full bg-gradient-to-r from-[#C2A88F] to-[#78593D] rounded-full transition-all duration-700"
                                    style={{ width: `${buildPercentage}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="p-2.5 rounded-xl bg-[#F7F5F0] border border-[#EBE6DF] text-xs">
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                                  <div className="min-w-0">
                                    <span className="text-[10px] font-medium text-[#7E756B] block">Package Tier</span>
                                    <span className="font-extrabold text-[#78593D] text-[11px] truncate block">
                                      {appPlan.name}
                                    </span>
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-[10px] font-medium text-[#7E756B] block">Latest Build</span>
                                    <span className="font-bold text-[#1C1917] text-[11px] truncate block">
                                      {appBuilds.length > 0 ? `v${appLatestBuild?.version_code || 1}.0.0 (Ready)` : "Ready"}
                                    </span>
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-[10px] font-medium text-[#7E756B] block">Platform</span>
                                    <span className="font-bold text-[#57514B] text-[11px] capitalize truncate block">
                                      {appItem.platform === "woo" ? "WooCommerce" : appItem.platform || "WordPress"}
                                    </span>
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-[10px] font-medium text-[#7E756B] block">Admin Panel</span>
                                    <span className="font-bold text-[11px] truncate block">
                                      {appHasAdmin ? (
                                        <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                          <span>Unlocked</span>
                                        </span>
                                      ) : (
                                        <span className="text-[#8A837A] font-medium">Add-on</span>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Bottom Action Buttons (Short-Card 2-Row Layout) */}
                          <div className="pt-3 border-t border-[#EBE6DF] mt-3 space-y-2">
                            {isDraft ? (
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenAppDetails(appItem)}
                                  className="py-2 px-2.5 bg-[#EFEAE2]/80 hover:bg-[#EFEAE2] text-[#78593D] border border-[#78593D]/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 truncate"
                                >
                                  <Eye className="w-3.5 h-3.5 text-[#78593D] flex-shrink-0" />
                                  <span className="truncate">View Details</span>
                                </button>

                                <Link
                                  href={`/dashboard/apps/${appItem.ulid}/setup/${appItem.setup_step || "platform"}`}
                                  className="py-2 px-2.5 bg-[#78593D] hover:bg-[#634932] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs text-center active:scale-98 cursor-pointer truncate"
                                >
                                  <span className="truncate">Continue</span>
                                  <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
                                </Link>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {/* Row 1: Primary Action(s) */}
                                {appHasAdmin ? (
                                  <div className="grid grid-cols-2 gap-2">
                                    {appBuilds.length > 0 && appTargetBuildId ? (
                                      <a
                                        href={`/api/apps/${appItem.ulid}/builds/${appTargetBuildId}/download-file?format=apk&app_name=${encodeURIComponent(appItem.name || "app")}&version=${appLatestBuild?.version_code || 1}`}
                                        download={`${(appItem.name || "app").toLowerCase().replace(/[^a-z0-9_-]/g, "-")}-v${appLatestBuild?.version_code || 1}.apk`}
                                        className="py-2 px-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-2xs flex items-center justify-center gap-1.5 truncate"
                                        title={`Download APK (v${appLatestBuild?.version_code || 1})`}
                                      >
                                        <Download className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span className="truncate">Download APK</span>
                                      </a>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleRebuildForApp(appItem)}
                                        disabled={isAppRebuilding}
                                        className="py-2 px-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer truncate"
                                      >
                                        <RefreshCw className={`w-3.5 h-3.5 flex-shrink-0 ${isAppRebuilding ? "animate-spin" : ""}`} />
                                        <span className="truncate">Compile APK</span>
                                      </button>
                                    )}

                                    <Link
                                      href={`/dashboard/apps/${appItem.ulid}/admin`}
                                      className="py-2 px-2 bg-gradient-to-r from-[#4A3B32] to-[#2E241E] hover:from-[#3D2F27] hover:to-[#221A15] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-98 border border-[#3D2F27] truncate"
                                      title="Open App Admin Panel"
                                    >
                                      <LayoutDashboard className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
                                      <span className="truncate">Admin Panel</span>
                                    </Link>
                                  </div>
                                ) : (
                                  appBuilds.length > 0 && appTargetBuildId ? (
                                    <a
                                      href={`/api/apps/${appItem.ulid}/builds/${appTargetBuildId}/download-file?format=apk&app_name=${encodeURIComponent(appItem.name || "app")}&version=${appLatestBuild?.version_code || 1}`}
                                      download={`${(appItem.name || "app").toLowerCase().replace(/[^a-z0-9_-]/g, "-")}-v${appLatestBuild?.version_code || 1}.apk`}
                                      className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-2xs flex items-center justify-center gap-1.5"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      <span>Download APK (v${appLatestBuild?.version_code || 1})</span>
                                    </a>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleRebuildForApp(appItem)}
                                      disabled={isAppRebuilding}
                                      className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                      <RefreshCw className={`w-3.5 h-3.5 ${isAppRebuilding ? "animate-spin" : ""}`} />
                                      <span>Compile APK</span>
                                    </button>
                                  )
                                )}

                                {/* Row 2: Secondary Actions (Side-by-Side: View Details & Buy Add-ons) */}
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAppDetails(appItem)}
                                    className="py-2 px-2.5 bg-[#78593D] hover:bg-[#634932] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-98 truncate"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-white flex-shrink-0" />
                                    <span className="truncate">View Details</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenAppDetails(appItem, "app-addons-section")}
                                    className="py-2 px-2.5 bg-[#F7F5F0] hover:bg-[#EFEAE2] text-[#78593D] border border-[#78593D]/25 hover:border-[#78593D] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-98 truncate"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                                    <span className="truncate">Buy Add-ons</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }

              // List View fallback
              return (
                <div className="space-y-4">
                  {displayedApps.map((appItem: any) => {
                    const { catalog, entitled, unclaimed, claimed, appPlan, appHasAdmin } = getAppFeatureCatalog(appItem);
                    const appBuilds = appItem.builds || [];
                    const appReadyBuild = appBuilds.find((b: any) => b.status === "ready" || b.status?.value === "ready") || appBuilds[0];
                    const appLatestBuild = appReadyBuild || appBuilds[0];
                    const appTargetBuildId = appLatestBuild?.id;
                    const isDraft = isAppDraft(appItem);
                    const currentStepKey = appItem.setup_step || "platform";
                    const stepInfo = SETUP_STEP_DETAILS[currentStepKey] || {
                      stepNumber: 1,
                      title: "Platform Selection",
                      description: "Configure your store platform and credentials.",
                      nextAction: "Select Platform",
                    };
                    const isAppRebuilding = Boolean(rebuildingAppUlids[appItem.ulid]);
                    const buildPercentage = isAppRebuilding
                      ? 95
                      : Math.max(10, Math.min(90, Math.round(((stepInfo.stepNumber - 1) / 10) * 100)));
                    const circumference = 88;
                    const strokeDashoffset = circumference - (circumference * buildPercentage) / 100;
                    const storeUrl = appItem.connection?.store_url || appItem.connection?.site_url;

                    return (
                      <div
                        key={appItem.id || appItem.ulid}
                        className={`bg-white rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden ${
                          isDraft ? "border-2 border-amber-300/80" : "border border-[#EBE6DF]"
                        }`}
                      >
                        <div className="flex items-start gap-4 min-w-0 flex-1">
                          <div
                            className={`w-12 h-12 rounded-2xl text-white font-extrabold text-xl flex items-center justify-center shadow-md flex-shrink-0 ${
                              isDraft
                                ? "bg-gradient-to-tr from-amber-600 to-amber-400"
                                : "bg-gradient-to-tr from-[#78593D] to-[#C2A88F]"
                            }`}
                          >
                            {appItem.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-black text-[#1C1917] truncate">{appItem.name}</h3>
                              {isDraft ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                                  Draft • Step {stepInfo.stepNumber}/10
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Completed
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EFEAE2] text-[#78593D]">
                                {appPlan.name}
                              </span>
                            </div>
                            <p className="text-xs text-[#7E756B] font-mono mt-0.5 truncate">{appItem.package_name}</p>
                            {storeUrl && (
                              <p className="text-xs text-[#57514B] mt-0.5 truncate">
                                Store: <a href={storeUrl} target="_blank" rel="noreferrer" className="text-[#78593D] hover:underline font-semibold">{storeUrl}</a>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions in list view */}
                        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto flex-shrink-0">
                          {isDraft ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenAppDetails(appItem)}
                                className="px-4 py-2 bg-[#EFEAE2]/80 hover:bg-[#EFEAE2] text-[#78593D] border border-[#78593D]/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-[#78593D]" />
                                <span>View Details</span>
                              </button>
                              <Link
                                href={`/dashboard/apps/${appItem.ulid}/setup/${appItem.setup_step || "platform"}`}
                                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-50 to-[#FAF7F2] border border-amber-300/80 hover:border-amber-400 hover:shadow-xs transition group"
                                title="Click to resume setup"
                              >
                                <div className="relative w-7 h-7 flex-shrink-0 flex items-center justify-center">
                                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                    <circle cx="18" cy="18" r="14" stroke="#E8DFD5" strokeWidth="3.5" fill="none" />
                                    <circle
                                      cx="18"
                                      cy="18"
                                      r="14"
                                      stroke="#78593D"
                                      strokeWidth="3.5"
                                      fill="none"
                                      strokeDasharray={circumference}
                                      strokeDashoffset={strokeDashoffset}
                                      strokeLinecap="round"
                                      className="transition-all duration-700 ease-out"
                                    />
                                  </svg>
                                  <span className="absolute text-[8px] font-black text-[#78593D]">
                                    {buildPercentage}%
                                  </span>
                                </div>
                                <div className="text-left">
                                  <span className="text-xs font-extrabold text-[#78593D] block group-hover:underline">
                                    {buildPercentage}% Completed
                                  </span>
                                  <span className="text-[10px] text-amber-800/80 font-medium block">
                                    Step {stepInfo.stepNumber}/10 • Resume →
                                  </span>
                                </div>
                              </Link>
                            </>
                          ) : (
                            <>
                              {appBuilds.length > 0 && appTargetBuildId && (
                                <a
                                  href={`/api/apps/${appItem.ulid}/builds/${appTargetBuildId}/download-file?format=apk&app_name=${encodeURIComponent(appItem.name || "app")}&version=${appLatestBuild?.version_code || 1}`}
                                  download={`${(appItem.name || "app").toLowerCase().replace(/[^a-z0-9_-]/g, "-")}-v${appLatestBuild?.version_code || 1}.apk`}
                                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Download APK</span>
                                </a>
                              )}
                              {appHasAdmin && (
                                <Link
                                  href={`/dashboard/apps/${appItem.ulid}/admin`}
                                  className="px-4 py-2 bg-gradient-to-r from-[#4A3B32] to-[#2E241E] hover:from-[#3D2F27] hover:to-[#221A15] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs border border-[#3D2F27]"
                                >
                                  <LayoutDashboard className="w-3.5 h-3.5 text-amber-300" />
                                  <span>Open App Admin Panel</span>
                                </Link>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenAppDetails(appItem)}
                                className="px-4 py-2 bg-[#78593D] hover:bg-[#634932] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-white" />
                                <span>View App Details</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenAppDetails(appItem, "app-addons-section")}
                                className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-[#78593D] border border-amber-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                <span>Buy Add-ons</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );})()
      ) : (
            <div className="bg-white border border-[#EBE6DF] rounded-3xl p-12 text-center">
              <Smartphone className="w-12 h-12 text-[#A68A70] mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#1C1917]">No applications created yet</h3>
              <p className="text-xs text-[#7E756B] mt-1 max-w-sm mx-auto">
                Convert your WooCommerce or Shopify store into native mobile apps in minutes.
              </p>
              <Link
                href="/dashboard/apps/new"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#78593D] text-white rounded-xl text-xs font-bold shadow-md shadow-[#78593D]/20"
              >
                <Plus className="w-4 h-4" />
                <span>Start New App</span>
              </Link>
            </div>
          )}
        </div>
      )}


      {/* ── TAB 2: BUILD HISTORY ── */}
      {activeTab === "builds" && (
        <div className="bg-white border border-[#EBE6DF] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-[#EBE6DF]">
            <div>
              <h3 className="font-black text-[#1C1917] text-base">Compilation &amp; Build Artifacts</h3>
              <p className="text-xs text-[#7E756B] mt-0.5">
                Download verified Android APK and Google Play .AAB binaries according to your purchased entitlements.
              </p>
            </div>
            <button
              onClick={handleRebuild}
              disabled={isRebuilding}
              className="px-3.5 py-2 rounded-xl bg-[#EFEAE2] text-[#78593D] hover:bg-[#E2DBD0] text-xs font-bold transition flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRebuilding ? "animate-spin" : ""}`} />
              <span>Trigger New Build</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead>
                <tr className="text-[#7E756B] uppercase tracking-wider border-b border-[#EBE6DF]">
                  <th className="py-3 font-bold">Build ID</th>
                  <th className="py-3 font-bold">Version</th>
                  <th className="py-3 font-bold">Target</th>
                  <th className="py-3 font-bold">Date &amp; Time</th>
                  <th className="py-3 font-bold">Status</th>
                  <th className="py-3 font-bold text-right">Downloads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBE6DF] text-[#57514B]">
                {builds.length > 0 ? (
                  builds.map((b: any) => (
                    <tr key={b.id} className="hover:bg-[#F7F5F0]/60 transition">
                      <td className="py-3.5 font-mono font-bold text-[#1C1917]">
                        BUILD-{b.id.toString().padStart(4, "0")}
                      </td>
                      <td className="py-3.5 font-bold text-[#1C1917]">v{b.version_code || 1}.0.0</td>
                      <td className="py-3.5 font-medium">Android 14 (API 34) &bull; Universal DEX</td>
                      <td className="py-3.5 text-[#7E756B]">
                        {b.created_at
                          ? new Date(b.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Today"}
                      </td>
                      <td className="py-3.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-200">
                          {b.status || "Ready"}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`/api/apps/${primaryApp?.ulid}/builds/${b.id}/download-file?format=apk&app_name=${encodeURIComponent(primaryApp?.name || "app")}&version=${b.version_name || b.version_code || 1}`}
                            download={`${(primaryApp?.name || "app").toLowerCase().replace(/[^a-z0-9_-]/g, "-")}-v${b.version_name || b.version_code || 1}.apk`}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px] flex items-center gap-1 transition"
                          >
                            <Download className="w-3 h-3" />
                            <span>APK</span>
                          </a>

                          {canDownloadAab ? (
                            <a
                              href={`/api/apps/${primaryApp?.ulid}/builds/${b.id}/download-file?format=aab&app_name=${encodeURIComponent(primaryApp?.name || "app")}&version=${b.version_name || b.version_code || 1}`}
                              download={`${(primaryApp?.name || "app").toLowerCase().replace(/[^a-z0-9_-]/g, "-")}-v${b.version_name || b.version_code || 1}.aab`}
                              className="px-2.5 py-1.5 rounded-lg bg-[#EFEAE2] text-[#78593D] hover:bg-[#E2DBD0] font-bold text-[11px] flex items-center gap-1 transition"
                            >
                              <Download className="w-3 h-3" />
                              <span>AAB</span>
                            </a>
                          ) : (
                            <button
                              onClick={() => {
                                const proPkg = commercialPackages.find(
                                  (p: any) => p.slug === "pro"
                                ) || { id: 2, name: "Pro", price_monthly: 799900 };
                                setUpgradeTargetPkg(proPkg);
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-100 text-slate-500 hover:text-amber-700 font-bold text-[10px] flex items-center gap-1"
                            >
                              <Lock className="w-3 h-3 text-amber-600" />
                              <span>AAB (Pro)</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#7E756B]">
                      No builds compiled yet. Click &quot;Trigger New Build&quot; above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: MY PURCHASES & VERIFIED INVOICES ── */}
      {activeTab === "purchases" && (
        <div className="bg-white border border-[#EBE6DF] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-[#EBE6DF]">
            <div>
              <h3 className="font-black text-[#1C1917] text-base">Verified Purchases &amp; Invoices</h3>
              <p className="text-xs text-[#7E756B] mt-0.5">
                Official records of packages, upgrades, add-ons, and approved custom quotes.
              </p>
            </div>
            <Receipt className="w-5 h-5 text-[#78593D]" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead>
                <tr className="text-[#7E756B] uppercase tracking-wider border-b border-[#EBE6DF]">
                  <th className="py-3 font-bold">Order #</th>
                  <th className="py-3 font-bold">Transaction Ref</th>
                  <th className="py-3 font-bold">Date &amp; Time</th>
                  <th className="py-3 font-bold">Description</th>
                  <th className="py-3 font-bold">Amount Paid</th>
                  <th className="py-3 font-bold">Status</th>
                  <th className="py-3 font-bold text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBE6DF] text-[#57514B]">
                {myOrders.length > 0 ? (
                  myOrders.map((ord: any) => {
                    const firstTx = ord.transactions?.[0];
                    const txId = firstTx?.gateway_payment_id || `tx_${ord.id}`;
                    return (
                      <tr key={ord.id} className="hover:bg-[#F7F5F0]/60 transition">
                        <td className="py-3.5 font-mono font-bold text-[#1C1917]">
                          {ord.order_number}
                        </td>
                        <td className="py-3.5 font-mono text-[11px] text-[#7E756B]">{txId}</td>
                        <td className="py-3.5 text-[#57514B]">
                          {ord.paid_at
                            ? new Date(ord.paid_at).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ord.created_at
                            ? new Date(ord.created_at).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "Today"}
                        </td>
                        <td className="py-3.5 font-semibold text-[#1C1917]">
                          {ord.package?.name
                            ? `${ord.package.name} Package`
                            : ord.type === "upgrade"
                            ? "Package Upgrade Difference"
                            : "Custom Add-on Order"}
                        </td>
                        <td className="py-3.5 font-extrabold text-[#1C1917]">
                          {formatPrice(ord.total_amount)}
                        </td>
                        <td className="py-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                              ord.status === "paid"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {ord.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            onClick={() => setSelectedInvoice(ord)}
                            className="px-3 py-1.5 rounded-lg border border-[#EBE6DF] hover:border-[#A68A70] text-[#1C1917] font-bold text-[11px] transition inline-flex items-center gap-1 shadow-xs"
                          >
                            <Receipt className="w-3.5 h-3.5 text-[#78593D]" />
                            <span>View Receipt</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#7E756B]">
                      No purchases logged yet. Visit the Packages tab to select your plan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: ALL AVAILABLE PLANS & PACKAGES ── */}
      {activeTab === "plans" && (
        <div className="space-y-8">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#78593D] via-[#8E6D4E] to-[#3B2C1E] rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/20 text-white border border-white/30 inline-block mb-3">
                Transparent Lifetime Pricing
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                All Available Plans &amp; Packages
              </h2>
              <p className="text-xs sm:text-sm text-amber-100/90 mt-2 leading-relaxed">
                Review our complete selection of mobile app packages. Every app you create has its own dedicated package and licensing. Click &quot;Use This Plan&quot; to build a new mobile application with that package, or upgrade any existing app directly from your apps list.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 flex-shrink-0">
              <Sparkles className="w-8 h-8 text-amber-300" />
              <div>
                <div className="text-sm font-extrabold text-white">Lifetime Ownership</div>
                <div className="text-[11px] text-amber-200">One-time payment &bull; All features unlocked</div>
              </div>
            </div>
          </div>

          {/* Plan Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {displayedPackages.map((pkg: any) => {
              const pkgName = pkg.name || "Plan";
              const isPro = pkgName.toLowerCase().includes("pro");
              const isPremium = pkgName.toLowerCase().includes("premium");
              const isBasic = !isPro && !isPremium;

              return (
                <div
                  key={pkg.id || pkg.slug || pkgName}
                  className={`relative rounded-3xl p-6 sm:p-8 border transition flex flex-col justify-between ${
                    isPro
                      ? "border-[#78593D] bg-[#F7F5F0] shadow-xl ring-2 ring-[#78593D]/25"
                      : "border-[#EBE6DF] bg-white hover:border-[#A68A70] shadow-sm hover:shadow-md"
                  }`}
                >
                  {isPro && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="px-3.5 py-1 rounded-full bg-[#78593D] text-white font-extrabold text-[11px] uppercase tracking-wider shadow-md shadow-[#78593D]/30 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-black text-xl text-[#1C1917]">{pkgName}</h3>
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#EFEAE2] text-[#78593D] border border-[#78593D]/20">
                        {isBasic ? "Starter Tier" : isPro ? "Recommended" : "Complete Suite"}
                      </span>
                    </div>

                    <p className="text-xs text-[#7E756B] mb-5">
                      {isBasic
                        ? "Perfect for launching direct-download Android APKs for your store."
                        : isPro
                        ? "Ideal for growing businesses publishing directly to the Google Play Store."
                        : "Full suite with dedicated admin panel access and automated store sync."}
                    </p>

                    <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF] mb-6">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-black text-[#1C1917]">
                          {formatPrice(pkg.price_monthly || 299900)}
                        </span>
                        <span className="text-xs font-semibold text-[#7E756B]">/ lifetime</span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 block mt-1">
                        &bull; One-time payment &bull; No recurring fee
                      </span>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7E756B]">
                        Included Capabilities:
                      </div>
                      <ul className="space-y-2.5 text-xs text-[#57514B]">
                        <li className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span className="font-medium text-[#1C1917]">
                            Android APK Generation &amp; Direct Downloads
                          </span>
                        </li>

                        <li className="flex items-start gap-2.5">
                          {pkg.can_aab ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                              <span className="font-bold text-[#1C1917]">
                                Google Play .AAB Bundle Included
                              </span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
                              <span className="text-slate-400 line-through">
                                Google Play .AAB Bundle (APK Only)
                              </span>
                            </>
                          )}
                        </li>

                        <li className="flex items-start gap-2.5">
                          {pkg.has_admin_panel ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                              <span className="font-bold text-[#1C1917]">
                                Dedicated Admin Panel Access
                              </span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
                              <span className="text-slate-400 line-through">
                                Dedicated Admin Panel Access
                              </span>
                            </>
                          )}
                        </li>

                        <li className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span>Automated Store Catalog Sync (Woo/Shopify)</span>
                        </li>

                        <li className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span>Offline Wishlist &amp; Shopping Cart</span>
                        </li>

                        <li className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span>Instant Rebuilds &amp; Over-The-Air Config Sync</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="pt-8">
                    <button
                      type="button"
                      onClick={() => handleUsePlan(pkg)}
                      className="w-full py-3.5 rounded-2xl font-black text-xs transition flex items-center justify-center gap-2 group shadow-md bg-[#78593D] hover:bg-[#634932] text-white shadow-[#78593D]/20 cursor-pointer"
                    >
                      <Rocket className="w-4 h-4 transition group-hover:-translate-y-0.5" />
                      <span>Use This Plan</span>
                      <ArrowRight className="w-4 h-4 transition group-hover:translate-x-1" />
                    </button>
                    <p className="text-[10px] text-center text-[#7E756B] mt-2 font-medium">
                      Build an app using {pkgName} Package
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 5: PREDEFINED ADD-ONS MARKETPLACE ── */}
      {activeTab === "addons" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-[#78593D] via-[#8E6D4E] to-[#3B2C1E] rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/20 text-white border border-white/30">
                Modular Capabilities
              </span>
              <h2 className="text-xl sm:text-2xl font-black mt-2">
                Predefined Feature Add-ons Marketplace
              </h2>
              <p className="text-xs text-amber-100 mt-1 max-w-xl leading-relaxed">
                Supercharge your mobile applications with Google Play Store builds, dedicated Admin Panel access, push notification campaign engines, and WhatsApp order tracking.
              </p>
            </div>
            <button
              onClick={() => setIsCustomModalOpen(true)}
              className="px-4 py-2.5 bg-white text-[#78593D] rounded-xl font-bold text-xs hover:bg-[#EFEAE2] transition shadow-lg flex-shrink-0 flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Request Custom Development</span>
            </button>
          </div>

          {/* ── ADD-ON CARDS GRID ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayedAddons.map((addon: any) => {
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

              // Card-specific selected app
              const cardAppId = selectedAppByAddon[addon.id] || "";
              const cardApp = apps?.find((a: any) => String(a.id) === String(cardAppId)) || null;
              const isActiveOnCardApp = cardApp ? appHasAddon(cardApp, addon) : false;

              const defaultBadge =
                addon.badge ||
                (isPlayStore
                  ? "Play Store Build"
                  : isAdminPanel
                  ? "Admin Panel"
                  : isWhatsApp
                  ? "WhatsApp Sync"
                  : addon.category || "Add-on Module");

              return (
                <div
                  key={addon.id}
                  className={`bg-white rounded-3xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between border ${
                    isActiveOnCardApp
                      ? "border-emerald-300 ring-1 ring-emerald-200 bg-gradient-to-b from-white to-emerald-50/20"
                      : isPlayStore || isAdminPanel
                      ? "border-[#78593D]/30 ring-1 ring-[#78593D]/10 bg-gradient-to-b from-white to-[#FDFCFB]"
                      : "border-[#EBE6DF] hover:border-[#78593D]/30"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                          isActiveOnCardApp
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : isPlayStore
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : isAdminPanel
                            ? "bg-amber-50 text-amber-900 border border-amber-200"
                            : "bg-[#EFEAE2] text-[#78593D]"
                        }`}
                      >
                        {isActiveOnCardApp ? `✓ Active on ${cardApp?.name}` : defaultBadge}
                      </span>
                      {isActiveOnCardApp ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : isPlayStore || isAdminPanel ? (
                        <Rocket className="w-4 h-4 text-[#78593D]" />
                      ) : isWhatsApp ? (
                        <MessageSquare className="w-4 h-4 text-[#78593D]" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-[#78593D]" />
                      )}
                    </div>

                    <h3 className="font-extrabold text-sm text-[#1C1917] leading-snug">
                      {addon.name}
                    </h3>
                    <p className="text-xs text-[#57514B] mt-2 line-clamp-3 leading-relaxed">
                      {addon.description}
                    </p>

                    {/* App selector dropdown on card */}
                    {apps && apps.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-[#EBE6DF]/70 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <label htmlFor={`addon-app-select-${addon.id}`} className="text-[#78593D] uppercase tracking-wider">
                            Select App:
                          </label>
                          {isActiveOnCardApp ? (
                            <span className="text-emerald-700 flex items-center gap-1 font-extrabold">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Active
                            </span>
                          ) : cardApp ? (
                            <span className="text-emerald-600 font-semibold">Ready to add</span>
                          ) : (
                            <span className="text-[#7E756B]">Optional</span>
                          )}
                        </div>
                        <select
                          id={`addon-app-select-${addon.id}`}
                          value={cardAppId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedAppByAddon((prev) => ({
                              ...prev,
                              [addon.id]: val,
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-[#EBE6DF] text-[11px] font-bold text-[#1C1917] bg-[#F7F5F0] focus:outline-none focus:ring-2 focus:ring-[#78593D]/20 cursor-pointer shadow-2xs"
                        >
                          <option value="">-- Choose Application --</option>
                          {apps.map((a: any) => {
                            const alreadyHas = appHasAddon(a, addon);
                            return (
                              <option key={a.id} value={a.id}>
                                {a.name} ({a.platform === "woo" ? "Woo" : "Shopify"}) {alreadyHas ? "— [Already Active]" : "— [Available to Add]"}
                              </option>
                            );
                          })}
                        </select>
                        {isActiveOnCardApp ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px] pt-0.5">
                            <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            Already active on {cardApp?.name}
                          </span>
                        ) : cardApp ? (
                          <span className="text-[10px] text-[#57514B] block pt-0.5 font-medium">
                            Will be enabled for: <strong className="text-[#1C1917]">{cardApp.name}</strong>
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#7E756B] block pt-0.5">
                            Choose app from dropdown to activate
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#EBE6DF] flex items-center justify-between gap-2">
                    <div>
                      <span className="text-base font-black text-[#1C1917] block">
                        {formatPrice(addon.price)}
                      </span>
                      <span className="text-[10px] text-[#7E756B]">One-time fee</span>
                    </div>
                    {isActiveOnCardApp ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAddon(addon);
                          setSelectedAddonAppId(cardApp?.id || null);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Already Active</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAddon(addon);
                          if (cardApp?.id) {
                            setSelectedAddonAppId(cardApp.id);
                          }
                        }}
                        className="px-3.5 py-2 rounded-xl bg-[#78593D] hover:bg-[#634932] text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Enable Add-on</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 6: CUSTOM FEATURE REQUESTS & QUOTES ── */}
      {activeTab === "custom_features" && (
        <div className="bg-white border border-[#EBE6DF] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-[#EBE6DF]">
            <div>
              <h3 className="font-black text-[#1C1917] text-base">Custom Development Requests</h3>
              <p className="text-xs text-[#7E756B] mt-0.5">
                Review engineering quotes, approve or decline proposals, and track implementation status.
              </p>
            </div>
            <button
              onClick={() => setIsCustomModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#78593D] text-white font-bold text-xs hover:bg-[#634932] transition flex items-center gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Custom Request</span>
            </button>
          </div>

          <div className="space-y-4">
            {myCustomRequests.length > 0 ? (
              myCustomRequests.map((req: any) => {
                const isQuotePendingCustomer = req.status === "quote_provided";
                return (
                  <div
                    key={req.id}
                    className={`rounded-2xl p-5 border transition ${
                      isQuotePendingCustomer
                        ? "border-[#78593D] bg-[#F7F5F0] ring-2 ring-[#78593D]/20"
                        : "border-[#EBE6DF] bg-white"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EBE6DF]/70">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#78593D]">
                            #{req.ticket_number}
                          </span>
                          <h4 className="font-black text-sm text-[#1C1917]">{req.feature_name}</h4>
                        </div>
                        <span className="text-[11px] text-[#7E756B] mt-0.5 block">
                          Submitted on{" "}
                          {new Date(req.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider self-start sm:self-auto ${
                          req.status === "pending_review"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : req.status === "quote_provided"
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : req.status === "approved" || req.status === "in_progress"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {req.status === "pending_review"
                          ? "Pending Admin Review"
                          : req.status === "quote_provided"
                          ? "Quote Ready For You"
                          : req.status}
                      </span>
                    </div>

                    <p className="text-xs text-[#57514B] mt-3 leading-relaxed">
                      <strong>Requirements:</strong> {req.requirements}
                    </p>

                    {/* Admin Quote Box */}
                    {req.quoted_price && (
                      <div className="mt-4 p-4 rounded-xl bg-white border border-[#EBE6DF] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#78593D]">Official Admin Quote:</span>
                          <span className="text-base font-black text-[#1C1917]">
                            {formatPrice(req.quoted_price)}
                          </span>
                        </div>
                        {req.admin_notes && (
                          <p className="text-xs text-[#57514B] italic">
                            &quot;{req.admin_notes}&quot;
                          </p>
                        )}

                        {isQuotePendingCustomer && (
                          <div className="pt-3 border-t border-[#EBE6DF] flex items-center justify-end gap-3">
                            <button
                              onClick={() => handleRejectQuote(req.id)}
                              className="px-3.5 py-2 rounded-xl border border-[#EBE6DF] hover:bg-slate-50 text-slate-600 font-bold text-xs"
                            >
                              Decline Quote
                            </button>
                            <button
                              disabled={Boolean(processingQuoteId)}
                              onClick={() => handleAcceptAndPayQuote(req)}
                              className={`px-4 py-2 rounded-xl bg-[#78593D] hover:bg-[#634932] text-white font-bold text-xs shadow-md shadow-[#78593D]/20 flex items-center gap-2 ${
                                Boolean(processingQuoteId) ? "pointer-events-none opacity-60 cursor-not-allowed" : "cursor-pointer"
                              }`}
                            >
                              {processingQuoteId === req.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Launching Checkout...</span>
                                </>
                              ) : (
                                <>
                                  <span>Accept &amp; Pay {formatPrice(req.quoted_price)}</span>
                                  <ShieldCheck className="w-4 h-4" />
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center text-[#7E756B] text-xs">
                No custom feature requests submitted yet. Click &quot;New Custom Request&quot; above to propose bespoke features.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── UPGRADE MODAL (CHARGES PRICE DIFFERENCE ONLY) ── */}
      {upgradeTargetPkg && (() => {
        const targetApp = upgradeTargetApp || primaryApp;
        const targetAppPlan = targetApp?.active_plan || targetApp?.plan || currentPlan;
        const upgradeDifference = Math.max(0, (upgradeTargetPkg.price_monthly || 0) - (targetAppPlan.price_monthly || 0));

        const upgradeMarkup = (
          <div
            className="fixed inset-0 z-[99999] w-screen h-screen bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden"
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setUpgradeTargetPkg(null);
                setUpgradeTargetApp(null);
              }
            }}
          >
            <div
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EBE6DF] animate-in fade-in zoom-in-95 relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-[#EBE6DF] pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#78593D] text-white flex items-center justify-center font-extrabold">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-[#1C1917]">Upgrade Application Package</h3>
                    <span className="text-xs text-[#7E756B]">Pay only the calculated price difference</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setUpgradeTargetPkg(null);
                    setUpgradeTargetApp(null);
                  }}
                  className="w-8 h-8 rounded-full bg-[#F7F5F0] text-[#7E756B] hover:text-[#1C1917] flex items-center justify-center font-bold"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF] space-y-2">
                  <div className="flex justify-between text-[#57514B]">
                    <span>Target Application:</span>
                    <strong className="text-[#1C1917] font-bold">{targetApp?.name || "Selected App"}</strong>
                  </div>
                  <div className="flex justify-between text-[#57514B]">
                    <span>Current Package:</span>
                    <strong className="text-[#1C1917]">{targetAppPlan.name}</strong>
                  </div>
                  <div className="flex justify-between text-[#57514B]">
                    <span>Already Paid:</span>
                    <span>{formatPrice(targetAppPlan.price_monthly || 299900)}</span>
                  </div>
                  <div className="flex justify-between text-[#57514B]">
                    <span>New Target Package:</span>
                    <strong className="text-[#78593D]">{upgradeTargetPkg.name} ({formatPrice(upgradeTargetPkg.price_monthly)})</strong>
                  </div>
                  <div className="pt-2 border-t border-[#EBE6DF] flex justify-between font-black text-sm text-[#1C1917]">
                    <span>Net Difference Payable:</span>
                    <span className="text-emerald-700">
                      {formatPrice(upgradeDifference)}
                    </span>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setUpgradeTargetPkg(null);
                      setUpgradeTargetApp(null);
                    }}
                    className="flex-1 py-3 rounded-xl border border-[#EBE6DF] text-[#57514B] font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isUpgrading}
                    onClick={() => handleInitiateUpgrade(upgradeTargetPkg)}
                    className={`flex-1 py-3 rounded-xl bg-[#78593D] hover:bg-[#634932] text-white font-bold text-xs shadow-md shadow-[#78593D]/20 flex items-center justify-center gap-2 cursor-pointer ${
                      isUpgrading ? "pointer-events-none opacity-60 cursor-not-allowed" : ""
                    }`}
                  >
                    {isUpgrading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <span>Pay {formatPrice(upgradeDifference)}</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

        return mounted ? createPortal(upgradeMarkup, document.body) : upgradeMarkup;
      })()}

      {/* ── ADD-ON PURCHASE MODAL (PREMIUM FIXED MODAL) ── */}
      {selectedAddon && (() => {
        const isPlayStore =
          selectedAddon.slug?.includes("play_store") ||
          selectedAddon.badge?.toLowerCase().includes("play store") ||
          selectedAddon.name?.toLowerCase().includes("play store");
        const isAdminPanel =
          selectedAddon.slug?.includes("admin_panel") ||
          selectedAddon.badge?.toLowerCase().includes("admin panel") ||
          selectedAddon.name?.toLowerCase().includes("admin panel");
        const isWhatsApp =
          selectedAddon.slug?.includes("whatsapp") ||
          selectedAddon.name?.toLowerCase().includes("whatsapp");
        const isAnalytics =
          selectedAddon.slug?.includes("analytics") ||
          selectedAddon.name?.toLowerCase().includes("analytics");

        const modalAppId = selectedAddonAppId || selectedAppByAddon[selectedAddon.id] || "";
        const modalTargetApp = apps?.find((a: any) => String(a.id) === String(modalAppId)) || null;
        const isModalAppActive = modalTargetApp ? appHasAddon(modalTargetApp, selectedAddon) : false;

        const modalMarkup = (
          <div
            className="fixed inset-0 z-[99999] w-screen h-screen bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden"
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedAddon(null);
            }}
          >
            <div
              className="bg-white rounded-[32px] max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-[#EBE6DF] animate-in fade-in zoom-in-95 relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-[#EBE6DF] pb-3.5 mb-3.5">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-xs ${
                      isModalAppActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : isAdminPanel
                        ? "bg-amber-50 text-amber-900 border-amber-200"
                        : isPlayStore
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-[#78593D]/10 text-[#78593D] border-[#78593D]/20"
                    }`}
                  >
                    {isAdminPanel ? (
                      <LayoutDashboard className="w-5 h-5" />
                    ) : isPlayStore ? (
                      <Rocket className="w-5 h-5" />
                    ) : isWhatsApp ? (
                      <MessageSquare className="w-5 h-5" />
                    ) : isAnalytics ? (
                      <Layers className="w-5 h-5" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#EFEAE2] text-[#78593D] border border-[#78593D]/20">
                        {isModalAppActive && modalTargetApp
                          ? `Active on ${modalTargetApp.name}`
                          : selectedAddon.badge || (isAdminPanel ? "Admin Panel" : isPlayStore ? "Play Store Build" : "Add-on Module")}
                      </span>
                      <span className="text-[10px] font-semibold text-[#7E756B]">
                        Lifetime License
                      </span>
                    </div>
                    <h3 className="font-black text-base sm:text-lg text-[#1C1917] tracking-tight mt-0.5">
                      {selectedAddon.name}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedAddon(null)}
                  className="w-8 h-8 rounded-full bg-[#F7F5F0] hover:bg-[#EBE6DF] text-[#7E756B] hover:text-[#1C1917] transition flex items-center justify-center font-bold text-base cursor-pointer flex-shrink-0"
                  aria-label="Close modal"
                >
                  &times;
                </button>
              </div>

              {/* Description */}
              <p className="text-xs text-[#57514B] leading-relaxed mb-3">
                {selectedAddon.description}
              </p>

              {/* Feature Highlights Grid */}
              {Array.isArray(selectedAddon.features) && selectedAddon.features.length > 0 && (
                <div className="mb-3.5 p-3 rounded-2xl bg-[#FDFCFB] border border-[#EBE6DF] grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {selectedAddon.features.map((feat: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-[#1C1917] font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="truncate">{feat}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Target Application Selection */}
              {apps && apps.length > 0 && (
                <div className="mb-3.5 p-3 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="modal-app-select" className="text-[10px] font-black uppercase tracking-wider text-[#78593D] block">
                      Target Application:
                    </label>
                    {isModalAppActive && modalTargetApp ? (
                      <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        Active on {modalTargetApp.name}
                      </span>
                    ) : modalTargetApp ? (
                      <span className="text-[10px] font-bold text-emerald-700">
                        Selected: {modalTargetApp.name}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700">
                        Choose App Below
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <select
                      id="modal-app-select"
                      value={modalTargetApp?.id || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedAddonAppId(val || null);
                        if (selectedAddon?.id) {
                          setSelectedAppByAddon((prev) => ({
                            ...prev,
                            [selectedAddon.id]: val,
                          }));
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-[#EBE6DF] text-xs font-bold text-[#1C1917] bg-white focus:outline-none focus:ring-2 focus:ring-[#78593D]/20 cursor-pointer shadow-xs"
                    >
                      <option value="">-- Choose Application from Dropdown --</option>
                      {apps.map((a: any) => {
                        const alreadyHas = appHasAddon(a, selectedAddon);
                        return (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.platform === "woo" ? "WooCommerce" : "Shopify"} - {a.active_plan?.name || "Basic"})
                            {alreadyHas ? " — [Already Active]" : " — [Available to Add]"}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <span className="text-[9px] text-[#7E756B] block">
                    {modalTargetApp
                      ? `Add-on capability will be provisioned specifically for "${modalTargetApp.name}".`
                      : "Please choose which application from the dropdown will receive this add-on."}
                  </span>
                </div>
              )}

              {/* Already Active / Entitlement Card */}
              {isModalAppActive && modalTargetApp && (
                <div className="mb-3.5 p-3 rounded-2xl bg-gradient-to-br from-emerald-50 via-emerald-50/50 to-white border border-emerald-200 shadow-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-extrabold text-xs text-emerald-950">
                          Already Active on {modalTargetApp.name}
                        </h4>
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Active &amp; Licensed
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-800 mt-0.5 leading-relaxed">
                        This application has already claimed and unlocked this add-on capability. Your mobile app compilation includes full access.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing & Billing Summary Card */}
              <div className="p-3 rounded-2xl bg-[#F7F5F0] border border-[#EBE6DF] flex items-center justify-between mb-4">
                <div>
                  <span className="text-[11px] font-bold text-[#7E756B] block">
                    {isModalAppActive ? "Billing Status" : "Payable Amount"}
                  </span>
                  {isModalAppActive ? (
                    <span className="text-xs font-black text-emerald-700 flex items-center gap-1 mt-0.5">
                      <Check className="w-3 h-3 text-emerald-600" />
                      Already Licensed (₹0)
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#57514B] mt-0.5 block">
                      One-time lifetime activation fee
                    </span>
                  )}
                </div>

                <div className="text-right">
                  {isModalAppActive ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#7E756B] line-through">
                        {formatPrice(selectedAddon.price)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Included
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-base sm:text-lg font-black text-[#78593D] block leading-tight">
                        {formatPrice(selectedAddon.price)}
                      </span>
                      <span className="text-[9px] text-[#7E756B]">Includes all taxes</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 text-xs">
                {isModalAppActive && modalTargetApp ? (
                  <button
                    type="button"
                    onClick={() => setSelectedAddon(null)}
                    className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold transition shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Already Active on {modalTargetApp.name} • Close</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedAddon(null)}
                      className="flex-1 py-2.5 rounded-xl border border-[#EBE6DF] font-bold text-[#57514B] hover:bg-[#F7F5F0] transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isPurchasingAddon || !modalTargetApp}
                      onClick={() => {
                        if (!modalTargetApp) return;
                        handlePurchaseAddon(selectedAddon, modalTargetApp);
                      }}
                      className={`flex-1 py-2.5 rounded-xl bg-[#78593D] hover:bg-[#634932] text-white font-bold transition shadow-md shadow-[#78593D]/20 flex items-center justify-center gap-2 cursor-pointer ${
                        isPurchasingAddon || !modalTargetApp ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                    >
                      {isPurchasingAddon ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Launching Checkout...</span>
                        </>
                      ) : !modalTargetApp ? (
                        <span>Select App to Continue</span>
                      ) : (
                        <>
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Pay {formatPrice(selectedAddon.price)} for {modalTargetApp.name}</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );

        return mounted ? createPortal(modalMarkup, document.body) : modalMarkup;
      })()}

      {/* ── CUSTOM FEATURE REQUEST MODAL ── */}
      {isCustomModalOpen && (() => {
        const customModalMarkup = (
          <div
            className="fixed inset-0 z-[99999] w-screen h-screen bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden"
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsCustomModalOpen(false);
            }}
          >
            <div
              className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-[#EBE6DF] animate-in fade-in zoom-in-95 relative max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-[#EBE6DF] pb-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#78593D]/10 text-[#78593D] flex items-center justify-center font-extrabold">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-[#1C1917]">Request Custom Feature</h3>
                    <span className="text-xs text-[#7E756B]">Initial Status: Pending Review</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsCustomModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#F7F5F0] text-[#7E756B] hover:text-[#1C1917] flex items-center justify-center font-bold text-base cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleCustomFeatureSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-[#1C1917] block mb-1">Feature Name *</label>
                  <input
                    type="text"
                    required
                    value={customFeatureName}
                    onChange={(e) => setCustomFeatureName(e.target.value)}
                    placeholder="e.g. Geolocation Delivery Radius Verification"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EBE6DF] outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1C1917] block mb-1">Detailed Requirements *</label>
                  <textarea
                    required
                    rows={3}
                    value={customFeatureReqs}
                    onChange={(e) => setCustomFeatureReqs(e.target.value)}
                    placeholder="Describe what functionality you need built..."
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EBE6DF] outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1C1917] block mb-1">Reference URL (Optional)</label>
                  <input
                    type="url"
                    value={customFeatureUrl}
                    onChange={(e) => setCustomFeatureUrl(e.target.value)}
                    placeholder="https://link-to-documentation.com"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EBE6DF] outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1C1917] block mb-1">Expected Functionality</label>
                  <textarea
                    rows={2}
                    value={customFeatureFunc}
                    onChange={(e) => setCustomFeatureFunc(e.target.value)}
                    placeholder="How shoppers or admins should interact with this feature..."
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EBE6DF] outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1C1917] block mb-1">Additional Notes</label>
                  <textarea
                    rows={2}
                    value={customFeatureNotes}
                    onChange={(e) => setCustomFeatureNotes(e.target.value)}
                    placeholder="Timeline constraints, specific store requirements..."
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EBE6DF] outline-none font-medium"
                  />
                </div>

                <div className="pt-3 border-t border-[#EBE6DF] flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCustomModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-[#EBE6DF] text-[#57514B] font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCustom}
                    className="flex-1 py-2.5 rounded-xl bg-[#78593D] hover:bg-[#634932] text-white font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    {isSubmittingCustom ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Submit Request</span>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );

        return mounted ? createPortal(customModalMarkup, document.body) : customModalMarkup;
      })()}

      {/* ── PRINTABLE INVOICE RECEIPT MODAL ── */}
      {selectedInvoice && (() => {
        const invoiceMarkup = (
          <div
            className="fixed inset-0 z-[99999] w-screen h-screen bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden"
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedInvoice(null);
            }}
          >
            <div
              className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-[#EBE6DF] animate-in fade-in zoom-in-95 relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-[#EBE6DF] pb-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#78593D] text-white flex items-center justify-center font-extrabold">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-[#1C1917]">Tax Invoice &amp; Receipt</h3>
                    <span className="font-mono text-xs text-[#7E756B]">
                      {selectedInvoice.order_number || selectedInvoice.invoiceId || "INV-2026-0001"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="w-8 h-8 rounded-full bg-[#F7F5F0] text-[#7E756B] hover:text-[#1C1917] flex items-center justify-center font-bold text-base cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-[#F7F5F0]">
                  <div>
                    <span className="text-[#7E756B] font-semibold block">Billed To</span>
                    <strong className="text-[#1C1917] block mt-0.5">
                      {selectedInvoice.customer_name || user?.name || "Customer"}
                    </strong>
                    <span className="text-[#57514B] block truncate">
                      {selectedInvoice.customer_email || user?.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#7E756B] font-semibold block">Application</span>
                    <strong className="text-[#1C1917] block mt-0.5">
                      {primaryApp?.name || "Mobile Store"}
                    </strong>
                    <span className="text-emerald-700 font-bold block">Status: Verified Paid</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl border border-[#EBE6DF] space-y-1.5">
                  <div className="flex justify-between font-semibold text-[#7E756B]">
                    <span>Item Description</span>
                    <span>Amount</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#1C1917] border-t border-[#EBE6DF] pt-1.5">
                    <span>
                      {selectedInvoice.package?.name
                        ? `${selectedInvoice.package.name} Package`
                        : selectedInvoice.type === "upgrade"
                        ? "Package Upgrade Difference"
                        : "Mobile App Commercial Order"}
                    </span>
                    <span>{formatPrice(selectedInvoice.total_amount || selectedInvoice.amount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-[#7E756B] text-[11px] pt-0.5">
                    <span>Platform Fee &amp; Keystore Sync</span>
                    <span>₹0.00</span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-[#1C1917] border-t border-[#EBE6DF] pt-1.5">
                    <span>Total Amount Paid</span>
                    <span className="text-[#78593D]">
                      {formatPrice(selectedInvoice.total_amount || selectedInvoice.amount || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 rounded-xl border border-[#EBE6DF] text-[#1C1917] font-bold text-xs hover:bg-[#F7F5F0] transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Invoice</span>
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="flex-1 py-2.5 rounded-xl bg-[#78593D] hover:bg-[#634932] text-white font-bold text-xs shadow-md shadow-[#78593D]/20 transition cursor-pointer"
                >
                  Close Receipt
                </button>
              </div>
            </div>
          </div>
        );

        return mounted ? createPortal(invoiceMarkup, document.body) : invoiceMarkup;
      })()}
    </div>
  );
}


export default function UserDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading dashboard...</div>}>
      <UserDashboardContent />
    </Suspense>
  );
}
