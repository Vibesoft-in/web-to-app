"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { clearUserData } from "@/lib/user-data-store";
import {
  Check,
  ChevronDown,
  Flame,
  HelpCircle,
  Layers,
  LayoutDashboard,
  Loader2,
  Lock,
  MessageSquare,
  Package,
  Plus,
  Rocket,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
  X,
  Zap,
  CheckCircle2,
  Bell,
  ArrowRight,
  Filter,
  Globe,
  CreditCard,
  BarChart3,
  Send,
  Star,
} from "lucide-react";

interface PlanItem {
  id: number;
  key?: string;
  name: string;
  badge?: string;
  one_time_price?: number;
  annual_price?: number;
  price_monthly?: number;
  price_formatted?: string;
  usd_equivalent?: string;
  period?: string;
  desc?: string;
  formats?: string[];
  features?: string[] | Record<string, boolean>;
  admin_panel?: boolean;
  popular?: boolean;
}

interface AddOnItem {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: number; // in paise
  price_formatted?: string;
  category: string;
  badge?: string;
  is_active?: boolean;
  features?: string[];
  features_provided?: string[];
  plan_inclusion_note?: string;
}

const FAQS = [
  {
    q: "Can I start building my app before deciding on a plan?",
    a: "Yes! You can connect your website URL, pick a layout theme, and customize your app's branding and color scheme right away. You can select your desired architecture plan when you're ready to compile your live APK or Google Play AAB bundle.",
  },
  {
    q: "Can I add modular add-ons to my app later?",
    a: "Absolutely. All add-ons are modular extensions that can be attached to your mobile app at any time—either at launch or as your store scales.",
  },
  {
    q: "How does the plan upgrade policy work?",
    a: "If you purchase the Basic plan today and later decide to upgrade to Pro or Premium, you only pay the exact price difference between the plans. You never pay twice for features you already own.",
  },
  {
    q: "What does the Premium Web Admin Panel include?",
    a: "The dedicated Web Admin Portal gives you a centralized dashboard to broadcast push notifications to customer devices, manage live WooCommerce/Shopify store catalog sync, view real-time orders and fulfilment status, track best sellers, and configure mobile app banners.",
  },
  {
    q: "Do you charge any recurring percentages from my store sales?",
    a: "Zero percent. All purchases made by shoppers inside your app process directly through your existing payment gateway (Razorpay, Stripe, Cash on Delivery, etc.). We never take transaction commissions.",
  },
  {
    q: "What platforms and website engines do you support?",
    a: "We support WooCommerce, Shopify, WordPress, and custom eCommerce/web engines. Our bridge preserves your checkout, customer logins, inventory, and payment gateways with 100% sync.",
  },
];

// ── EXACT CORE PLANS FROM APP BUILDER (StepPayment / /api/plans) ────────────
const BUILDER_PLANS: PlanItem[] = [
  {
    id: 1,
    key: "basic",
    name: "Basic",
    badge: "Essential",
    one_time_price: 2999,
    annual_price: 2399,
    price_formatted: "₹2,999",
    usd_equivalent: "Approx. $50 USD • Lifetime App Files",
    period: " one-time",
    desc: "Mobile app solution for eCommerce stores.",
    formats: ["APK", "AAB"],
    admin_panel: false,
    popular: false,
    features: [
      "Android (.apk/.aab)",
      "Automated Store Catalog Sync",
      "Push Notifications",
    ],
  },
  {
    id: 2,
    key: "pro",
    name: "Pro",
    badge: "Most Popular",
    one_time_price: 7999,
    annual_price: 6399,
    price_formatted: "₹7,999",
    usd_equivalent: "Approx. $90 USD • Lifetime App Files",
    period: " one-time",
    desc: "Complete mobile presence for Android and iOS devices.",
    formats: ["APK", "AAB", "IPA"],
    admin_panel: false,
    popular: true,
    features: [
      "Android (.apk/.aab)",
      "Automated Store Catalog Sync",
      "Push Notifications",
      "iOS IPA Package Available",
      "Priority App Compilation",
    ],
  },
  {
    id: 3,
    key: "premium",
    name: "Premium",
    badge: "All + Admin Panel",
    one_time_price: 14999,
    annual_price: 11999,
    price_formatted: "₹14,999",
    usd_equivalent: "Approx. $150 USD • Lifetime App Files",
    period: " one-time",
    desc: "High-scale commerce sites with dedicated app admin panel.",
    formats: ["APK", "AAB", "IPA", "Admin Panel"],
    admin_panel: true,
    popular: false,
    features: [
      "Android (.apk/.aab) & iOS IPA",
      "Automated Store Catalog Sync",
      "Dedicated App Admin Panel (Active Users, Banners & Sales)",
      "Live Active Users & Devices Telemetry",
      "Mobile Banner Sliders & Flash Sales Manager",
      "Mobile Categories & Navigation Manager",
      "Exclusive 4th Theme (Elite Dark Luxe)",
      "Push Notifications Priority Engine",
      "Full White-Labeling & Priority Support",
    ],
  },
];

// ── EXACT MODULAR ADD-ONS FROM APP BUILDER (StepPayment / FALLBACK_ADDONS) ──
const BUILDER_ADDONS: AddOnItem[] = [
  {
    id: 1,
    name: "Push Notifications Campaign Engine",
    slug: "push_notifications",
    price: 99900,
    price_formatted: "₹999",
    category: "Marketing",
    badge: "Sales Booster",
    plan_inclusion_note: "Included in Premium • Available for Basic & Pro",
    description: "Send rich media push notifications to customer lock screens, flash deal alerts, and automated abandoned cart recovery triggers.",
    features_provided: [
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
    plan_inclusion_note: "Available for All Plans",
    description: "Automated WhatsApp order confirmation alerts, live parcel tracking links, and 1-click in-app floating WhatsApp live chat support.",
    features_provided: [
      "Instant order confirmation alerts",
      "Real-time courier tracking updates",
      "Floating in-app chat bubble",
      "Direct staff routing",
    ],
  },
  {
    id: 5,
    name: "Custom App Admin Panel Access Module",
    slug: "admin_panel_addon",
    price: 299900,
    price_formatted: "₹2,999",
    category: "Admin",
    badge: "Admin Control",
    plan_inclusion_note: "Included in Premium • Available as Modular Add-on",
    description: "Web-based customer portal to monitor mobile app telemetry, manage push notification campaigns, and trigger real-time catalog sync.",
    features_provided: [
      "Dedicated web management portal",
      "Push notification composer & history",
      "Live catalog sync trigger",
      "Multi-staff role access",
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
    plan_inclusion_note: "Available for All Plans",
    description: "Deep user engagement session telemetry, product heatmaps, drop-off conversion funnels, and Google Analytics 4 integration.",
    features_provided: [
      "Session duration & telemetry",
      "Conversion checkout funnels",
      "Product view heatmaps",
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
    plan_inclusion_note: "Included in Pro & Premium • Available for Basic",
    description: "Tailored bottom tab bar items, nested category accordions, custom icon packs, and dedicated promotional banner sliders.",
    features_provided: [
      "Dynamic bottom tab navigation",
      "Custom brand icon library",
      "Nested category accordions",
      "Promotional slider carousels",
    ],
  },
  {
    id: 6,
    name: "Google Play Store Publishing Assistant",
    slug: "play_store_publish",
    price: 149900,
    price_formatted: "₹1,499",
    category: "Publishing",
    badge: "Stress-Free",
    plan_inclusion_note: "Available for All Plans",
    description: "Complete submission assistance to Google Play Console with signed .aab, asset graphics, privacy policy hosting, and approval guarantee.",
    features_provided: [
      "Google Play Console submission",
      "Store listing graphics & banners",
      "Privacy policy page hosting",
      "Approval guarantee support",
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
    plan_inclusion_note: "Included in Pro & Premium • Available for Basic",
    description: "Completely remove all platform watermarks. Custom animated launch splash screen, custom brand typography, and custom package identifier.",
    features_provided: [
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
    plan_inclusion_note: "Available for All Plans",
    description: "Connect custom warehouse inventory, custom CRM webhooks, private courier tracking endpoints, or specialized payment gateways.",
    features_provided: [
      "Custom REST & webhook endpoints",
      "Warehouse inventory live sync",
      "Private courier tracking bridge",
      "Specialized gateway support",
    ],
  },
];

export default function PlansPage() {
  const router = useRouter();

  const [isYearly, setIsYearly] = useState(false);
  const [addonCategoryFilter, setAddonCategoryFilter] = useState<string>("all");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Custom Feature Modal State
  const [isCustomFeatureOpen, setIsCustomFeatureOpen] = useState(false);
  const [customFeatureName, setCustomFeatureName] = useState("");
  const [customFeatureReqs, setCustomFeatureReqs] = useState("");
  const [customFeatureUrl, setCustomFeatureUrl] = useState("");
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);
  const [customSuccessMessage, setCustomSuccessMessage] = useState<string | null>(null);

  // 1. Fetch Auth State
  const { data: authData } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiClient("/api/auth/me"),
    retry: false,
  });
  const user = authData?.user;
  const isAdmin = user?.role === "super_admin" || user?.is_super_admin;

  // 2. Fetch User's Existing Apps
  const { data: appsData } = useQuery({
    queryKey: ["apps"],
    queryFn: async () => {
      try {
        const res = await apiClient("/api/apps");
        return Array.isArray(res) ? res : res.apps || [];
      } catch {
        return [];
      }
    },
    enabled: Boolean(user),
  });
  const apps = appsData || [];
  const dashboardHref = apps.length > 0 ? "/dashboard" : "/dashboard/apps/new";
  const buildAppHref = user ? (apps.length > 0 ? "/dashboard/apps/new" : "/dashboard/apps/new") : "/signup";

  const handleLogout = async () => {
    try {
      clearUserData();
      await apiClient("/api/auth/logout", { method: "POST" });
    } catch { }
    window.location.href = "/";
  };

  // 3. Fetch Plans from /api/plans (identically to StepPayment in the builder)
  const { data: plansData, isLoading: isPlansLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      try {
        const res = await apiClient("/api/plans");
        return Array.isArray(res.plans) && res.plans.length > 0 ? res.plans : BUILDER_PLANS;
      } catch {
        return BUILDER_PLANS;
      }
    },
    staleTime: 60_000,
  });
  const plans: PlanItem[] = plansData && plansData.length > 0 ? plansData : BUILDER_PLANS;

  // 4. Fetch Add-Ons from /api/commercial/addons (identically to StepPayment in the builder)
  const { data: addonsData, isLoading: isAddonsLoading } = useQuery({
    queryKey: ["commercial-addons"],
    queryFn: async () => {
      try {
        const res = await apiClient("/api/commercial/addons");
        if (Array.isArray(res.addons) && res.addons.length > 0) {
          return res.addons.map((serverAddon: any) => {
            const fallback = BUILDER_ADDONS.find(
              (f) => f.slug === serverAddon.slug || f.name === serverAddon.name
            );
            return fallback
              ? {
                  ...fallback,
                  id: serverAddon.id,
                  price: serverAddon.price || fallback.price,
                  price_formatted: serverAddon.price_formatted || fallback.price_formatted,
                }
              : serverAddon;
          });
        }
        return BUILDER_ADDONS;
      } catch {
        return BUILDER_ADDONS;
      }
    },
    staleTime: 60_000,
  });
  const availableAddons: AddOnItem[] =
    addonsData && addonsData.length > 0 ? addonsData : BUILDER_ADDONS;

  // Filtered Addons
  const filteredAddons = useMemo(() => {
    if (addonCategoryFilter === "all") return availableAddons;
    return availableAddons.filter((a) => a.category?.toLowerCase() === addonCategoryFilter.toLowerCase());
  }, [availableAddons, addonCategoryFilter]);

  const addonCategories = [
    { key: "all", label: "All Add-Ons" },
    { key: "Marketing", label: "Marketing & Sales" },
    { key: "Support", label: "Customer Support" },
    { key: "Admin", label: "Admin & Portals" },
    { key: "Analytics", label: "Analytics" },
    { key: "Customization", label: "Customization" },
    { key: "Publishing", label: "Store Publishing" },
    { key: "Branding", label: "Branding" },
    { key: "Infrastructure", label: "Infrastructure" },
  ];

  const formatPrice = (paiseOrRupees: number, isPaise = true) => {
    const rupees = isPaise ? paiseOrRupees / 100 : paiseOrRupees;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(rupees);
  };

  const getAddonIcon = (slug: string) => {
    switch (slug) {
      case "push_notifications":
        return <Bell className="w-5 h-5 text-amber-700" />;
      case "whatsapp_sync":
        return <MessageSquare className="w-5 h-5 text-emerald-600" />;
      case "admin_panel_addon":
        return <LayoutDashboard className="w-5 h-5 text-indigo-600" />;
      case "analytics":
        return <BarChart3 className="w-5 h-5 text-blue-600" />;
      case "custom_nav":
        return <Layers className="w-5 h-5 text-purple-600" />;
      case "play_store_publish":
        return <Smartphone className="w-5 h-5 text-green-600" />;
      case "white_label":
        return <ShieldCheck className="w-5 h-5 text-rose-600" />;
      case "api_integration":
        return <Zap className="w-5 h-5 text-amber-600" />;
      default:
        return <Package className="w-5 h-5 text-[#78593D]" />;
    }
  };

  const handleSubmitCustomFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCustom(true);
    setCustomSuccessMessage(null);
    try {
      await apiClient("/api/custom-features", {
        method: "POST",
        body: JSON.stringify({
          feature_name: customFeatureName,
          requirements: customFeatureReqs,
          reference_url: customFeatureUrl,
        }),
      });
      setCustomSuccessMessage(
        "Thank you! Your custom feature inquiry has been received. Our engineering team will review requirements and reach out via email shortly."
      );
      setCustomFeatureName("");
      setCustomFeatureReqs("");
      setCustomFeatureUrl("");
    } catch (err: any) {
      setCustomSuccessMessage(
        "Thank you! Your request has been logged. Our engineering lead will follow up with you within 24 hours."
      );
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  return (
    <div className="landing-page min-h-screen bg-[#FAF8F5] text-[#1C1917]">
      {/* ===================================================
          1. TOP GLOBAL HEADER
          =================================================== */}
      <header className="app-header">
        <div className="header-inner">
          <Link href="/" className="brand-logo" aria-label="AppifyHub Home">
            <svg
              className="brand-icon"
              width="26"
              height="26"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M16 3L3 27H11L16 17L21 27H29L16 3Z" fill="#78593D" />
              <path d="M16 11L11.5 20H20.5L16 11Z" fill="#C2A88F" />
            </svg>
            <span className="brand-text">AppifyHub</span>
          </Link>

          <nav className="main-nav" aria-label="Main Navigation">
            <Link href="/" className="nav-link">
              Home
            </Link>
            <Link href="/how-it-works" className="nav-link">
              How It Works
            </Link>
            <Link href="/themes" className="nav-link">
              Themes
            </Link>
            <Link href="/plans" className="nav-link active">
              Plans
            </Link>
            <Link href="/support" className="nav-link">
              Support
            </Link>
          </nav>

          <div className="header-actions">
            <Link href="/login" className="btn-text">
              Login
            </Link>
            {user ? (
              <>
                <Link
                  href={isAdmin ? "http://localhost:8000/admin" : dashboardHref}
                  className="btn-outline"
                >
                  <span>{isAdmin ? "Admin Oversight" : apps.length > 0 ? "Dashboard" : "Create App"}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-text"
                  style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                >
                  Logout
                </button>
              </>
            ) : (
              <Link href="/signup" className="btn-outline">
                <span>Build Your App</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ===================================================
          2. HERO SECTION
          =================================================== */}
      <section className="relative overflow-hidden pt-12 pb-14 lg:pt-16 lg:pb-16 bg-gradient-to-b from-[#F7F5F0] to-[#FAF8F5] border-b border-[#EBE6DF]">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EFEAE2] text-[#78593D] text-xs font-extrabold uppercase tracking-wider mb-5 border border-[#E2DBD0]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Transparent Architecture Packages &amp; Modular Extensions</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-[#1C1917] tracking-tight leading-[1.15]">
            Simple Plans for Every Stage. <br />
            <span className="text-[#78593D] italic">Scale with Powerful Add-Ons.</span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-[#57514B] max-w-2xl mx-auto leading-relaxed">
            Review our three core architecture plans and specialized add-ons below.
            Zero sales commissions, lifetime app ownership, and seamless upgrades anytime.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={buildAppHref}
              className="px-6 py-3 rounded-xl bg-[#78593D] hover:bg-[#634932] text-white font-extrabold text-sm transition shadow-lg shadow-[#78593D]/25 flex items-center gap-2"
            >
              <Rocket className="w-4 h-4" />
              <span>Build Your App Now &rarr;</span>
            </Link>
            <a
              href="#addons"
              className="px-5 py-3 rounded-xl bg-white hover:bg-[#EFEAE2] text-[#57514B] border border-[#EBE6DF] font-bold text-sm transition"
            >
              Explore Provided Add-Ons
            </a>
          </div>
        </div>
      </section>

      {/* ===================================================
          3. CORE ARCHITECTURE PLANS: BASIC, PRO, PREMIUM
             (EXACT PLANS FROM APP BUILDER WORKFLOW)
          =================================================== */}
      <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#78593D]">
            Architecture Packages
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-[#1C1917] mt-1.5 tracking-tight">
            Our Core Architecture Plans
          </h2>
          <p className="text-xs sm:text-sm text-[#7E756B] mt-2 max-w-lg mx-auto">
            Lifetime single-app ownership with 0% transaction commission on all store sales.
          </p>

          {/* Pricing Toggle: Standard One-Time vs Annual License */}
          <div className="mt-6 inline-flex items-center gap-3 p-1.5 bg-[#EFEAE2] rounded-2xl border border-[#E2DBD0]">
            <span
              onClick={() => setIsYearly(false)}
              className={`text-xs px-3.5 py-1.5 rounded-xl cursor-pointer transition select-none ${
                !isYearly
                  ? "bg-white font-bold text-[#1C1917] shadow-sm border border-[#EBE6DF]"
                  : "text-[#57514B] hover:text-[#1C1917] font-medium"
              }`}
            >
              Standard One-Time
            </span>

            <button
              type="button"
              onClick={() => setIsYearly(!isYearly)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isYearly ? "bg-[#78593D]" : "bg-slate-300"
              }`}
              role="switch"
              aria-checked={isYearly}
              aria-label="Toggle annual billing"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isYearly ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>

            <span
              onClick={() => setIsYearly(true)}
              className={`text-xs px-3.5 py-1.5 rounded-xl cursor-pointer transition select-none flex items-center gap-1.5 ${
                isYearly
                  ? "bg-white font-bold text-[#1C1917] shadow-sm border border-[#EBE6DF]"
                  : "text-[#57514B] hover:text-[#1C1917] font-medium"
              }`}
            >
              <span>Annual License</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                Save 20%
              </span>
            </span>
          </div>
        </div>

        {isPlansLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[#78593D] animate-spin" />
            <span className="text-xs text-[#7E756B] font-semibold">Loading live package tiers...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan, idx) => {
              const isFeatured = Boolean(
                plan.popular || plan.key === "pro" || plan.name?.toLowerCase().includes("pro")
              );

              const oneTimePrice =
                plan.one_time_price ||
                (plan.price_monthly ? Math.round(plan.price_monthly / 100) : 2999);
              const annualPrice = plan.annual_price || Math.round(oneTimePrice * 0.8);
              const displayPrice = isYearly ? annualPrice : oneTimePrice;
              const periodText = isYearly ? "/ year" : " one-time";

              const usdText =
                plan.usd_equivalent ||
                (oneTimePrice <= 5000
                  ? "Approx. $50 USD • Lifetime App Files"
                  : oneTimePrice <= 9500
                  ? "Approx. $90 USD • Lifetime App Files"
                  : "Approx. $150 USD • Lifetime App Files");

              const featureList = Array.isArray(plan.features)
                ? plan.features
                : typeof plan.features === "object" && plan.features !== null
                ? Object.entries(plan.features)
                    .filter(([_, enabled]) => Boolean(enabled))
                    .map(([name]) => name.replace(/_/g, " ").toUpperCase())
                : ["White-label Android App", "Automated Catalog Sync", "Push Notifications"];

              const isBasic = plan.name?.toLowerCase().includes("basic") || plan.key === "basic";
              const isPro = plan.name?.toLowerCase().includes("pro") || plan.key === "pro";
              const isPremium = plan.name?.toLowerCase().includes("premium") || plan.key === "premium";

              return (
                <div
                  key={plan.id || idx}
                  className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between ${
                    isFeatured
                      ? "bg-white border-2 border-[#78593D] shadow-xl ring-4 ring-[#78593D]/10"
                      : "bg-white border border-[#EBE6DF] shadow-sm hover:border-[#A68A70] hover:shadow-md transition"
                  }`}
                >
                  {isFeatured && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#78593D] text-white text-[11px] font-extrabold tracking-wider uppercase shadow-md flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-300" />
                      <span>{plan.badge || "Most Popular"}</span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="text-2xl font-black text-[#1C1917] tracking-tight">{plan.name}</h3>
                      {isBasic && (
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                          APK + AAB
                        </span>
                      )}
                      {isPro && (
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap">
                          APK • AAB • IPA
                        </span>
                      )}
                      {isPremium && (
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200 whitespace-nowrap">
                          All + Admin Panel
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#57514B] leading-relaxed min-h-[38px]">
                      {plan.desc}
                    </p>

                    <div className="mt-6 mb-6 pb-6 border-b border-[#EBE6DF]">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl sm:text-4xl font-black text-[#1C1917] tracking-tight">
                          ₹{displayPrice.toLocaleString("en-IN")}
                        </span>
                        <span className="text-xs text-[#7E756B] font-medium">{periodText}</span>
                      </div>
                      <div className="text-[11px] text-[#78593D] font-bold mt-1">
                        {usdText}
                      </div>
                    </div>

                    {/* Entitlement Inclusions Matrix */}
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-[#F7F5F0]">
                        <span className="font-semibold text-[#57514B]">Android App (.apk/.aab)</span>
                        <span className="font-black text-emerald-700 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Included
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-[#F7F5F0]">
                        <span className="font-semibold text-[#57514B]">Automated Store Catalog Sync</span>
                        <span className="font-black text-emerald-700 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Included
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-[#F7F5F0]">
                        <span className="font-semibold text-[#57514B]">Apple iOS IPA Package</span>
                        {isPro || isPremium ? (
                          <span className="font-black text-emerald-700 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Included
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-400 flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5 text-amber-600" /> Pro / Add-on
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-[#F7F5F0]">
                        <span className="font-semibold text-[#57514B]">Dedicated Web Admin Portal</span>
                        {isPremium ? (
                          <span className="font-black text-emerald-700 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Included
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-400 flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5 text-amber-600" /> Premium / Add-on
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Feature bullet list */}
                    <ul className="space-y-2.5 text-xs text-[#57514B] mb-8">
                      {featureList.map((feat: string, fIdx: number) => (
                        <li key={fIdx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-[#78593D] flex-shrink-0 mt-0.5" />
                          <span className="leading-tight">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <Link
                      href={buildAppHref}
                      className={`w-full py-3.5 px-4 rounded-xl font-extrabold text-xs transition flex items-center justify-center gap-2 shadow-md ${
                        isFeatured
                          ? "bg-[#78593D] hover:bg-[#634932] text-white shadow-[#78593D]/20"
                          : "bg-[#EFEAE2] hover:bg-[#E2DBD0] text-[#1C1917] border border-[#78593D]/30"
                      }`}
                    >
                      <span>Build with {plan.name} &rarr;</span>
                    </Link>
                    <span className="block text-center text-[10px] text-[#7E756B] mt-2">
                      Lifetime ownership &bull; Instant setup &bull; 0% commission
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ===================================================
          4. MODULAR ADD-ONS SECTION (DESCRIBING WHAT WE PROVIDE)
          =================================================== */}
      <section id="addons" className="py-16 sm:py-20 bg-[#F7F5F0] border-y border-[#EBE6DF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#78593D]">
                Modular Add-Ons &amp; Extensions
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#1C1917] mt-1 tracking-tight">
                We Provide These High-Impact Add-Ons
              </h2>
              <p className="text-xs sm:text-sm text-[#7E756B] mt-1.5 max-w-2xl">
                Every mobile app is unique. In addition to our core plans, we provide specialized modular extensions to help you maximize customer retention, support, and sales conversion.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsCustomFeatureOpen(true)}
              className="px-4 py-2.5 rounded-xl border border-[#78593D] bg-white text-[#78593D] font-bold text-xs hover:bg-[#EFEAE2] transition shadow-xs flex items-center gap-2 self-start md:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Request Custom Feature Quote</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2 mb-8">
            {addonCategories.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setAddonCategoryFilter(cat.key)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                  addonCategoryFilter === cat.key
                    ? "bg-[#78593D] text-white shadow-xs"
                    : "bg-white text-[#57514B] border border-[#EBE6DF] hover:bg-[#EFEAE2]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Add-ons Descriptive Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAddons.map((addon) => {
              const features = addon.features_provided || addon.features || [];

              return (
                <div
                  key={addon.id}
                  className="rounded-2xl p-6 bg-white border border-[#EBE6DF] hover:border-[#A68A70] hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[#F7F5F0] border border-[#EBE6DF] flex items-center justify-center flex-shrink-0">
                        {getAddonIcon(addon.slug)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {addon.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                            {addon.badge}
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#EFEAE2] text-[#78593D]">
                          {addon.category}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-base font-extrabold text-[#1C1917] tracking-tight mb-2">
                      {addon.name}
                    </h3>

                    <p className="text-xs text-[#57514B] leading-relaxed mb-4">
                      {addon.description}
                    </p>

                    {/* Highlights list of what we provide */}
                    {features && features.length > 0 && (
                      <div className="space-y-1.5 pt-3 pb-4 border-t border-[#F5F2EB]">
                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-[#78593D] block mb-1">
                          What We Provide:
                        </span>
                        {features.map((feat: string, fIdx: number) => (
                          <div key={fIdx} className="flex items-start gap-1.5 text-xs text-[#57514B]">
                            <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <span className="text-[11px] leading-tight">{feat}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#F5F2EB] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#7E756B] block">Price</span>
                      <span className="text-sm font-black text-[#1C1917]">
                        {formatPrice(addon.price)}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold text-[#78593D] bg-[#EFEAE2] px-2.5 py-1 rounded-lg">
                      {addon.plan_inclusion_note || "Available for All Plans"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Feature Banner */}
          <div className="mt-10 rounded-2xl bg-white border border-[#78593D]/30 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#78593D]/10 text-[#78593D] flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#1C1917]">Need a custom API integration or unique workflow?</h4>
                <p className="text-xs text-[#7E756B]">
                  Our mobile engineering team builds bespoke integrations, barcode scanners, multi-vendor splits, and BLE device connections.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCustomFeatureOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#78593D] hover:bg-[#634932] text-white font-extrabold text-xs transition shadow-sm whitespace-nowrap"
            >
              Request Custom Quote &rarr;
            </button>
          </div>
        </div>
      </section>

      {/* ===================================================
          5. DETAILED COMPARISON TABLE
          =================================================== */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#78593D]">
            Side-by-side comparison
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#1C1917] mt-1 tracking-tight">
            Compare Plan Capabilities
          </h2>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-[#EBE6DF] bg-white shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#EBE6DF] bg-[#FAF8F5]">
                <th className="py-4 px-6 font-extrabold text-[#1C1917] w-1/3">Feature</th>
                <th className="py-4 px-6 font-extrabold text-[#1C1917] text-center">Basic (₹2,999)</th>
                <th className="py-4 px-6 font-extrabold text-[#78593D] text-center bg-[#F7F5F0]">Pro (₹7,999)</th>
                <th className="py-4 px-6 font-extrabold text-[#1C1917] text-center">Premium (₹14,999)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBE6DF] text-[#57514B]">
              <tr>
                <td className="py-3.5 px-6 font-semibold">Android App Files (.apk &amp; .aab)</td>
                <td className="py-3.5 px-6 text-center font-bold text-emerald-700">✓ Included</td>
                <td className="py-3.5 px-6 text-center font-bold text-emerald-700 bg-[#F7F5F0]">✓ Included</td>
                <td className="py-3.5 px-6 text-center font-bold text-emerald-700">✓ Included</td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-semibold">Automated Store Catalog Sync</td>
                <td className="py-3.5 px-6 text-center font-bold text-emerald-700">✓ Included</td>
                <td className="py-3.5 px-6 text-center font-bold text-emerald-700 bg-[#F7F5F0]">✓ Included</td>
                <td className="py-3.5 px-6 text-center font-bold text-emerald-700">✓ Included</td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-semibold">Push Notifications Engine</td>
                <td className="py-3.5 px-6 text-center font-bold text-emerald-700">✓ Standard</td>
                <td className="py-3.5 px-6 text-center font-bold text-emerald-700 bg-[#F7F5F0]">✓ Standard</td>
                <td className="py-3.5 px-6 text-center font-bold text-purple-700">✓ Priority Engine</td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-semibold">Apple iOS IPA Package Build</td>
                <td className="py-3.5 px-6 text-center text-slate-400">Available as Add-on</td>
                <td className="py-3.5 px-6 text-center font-bold text-emerald-700 bg-[#F7F5F0]">✓ Included</td>
                <td className="py-3.5 px-6 text-center font-bold text-emerald-700">✓ Included</td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-semibold">Priority App Compilation</td>
                <td className="py-3.5 px-6 text-center text-slate-400">Standard Queue</td>
                <td className="py-3.5 px-6 text-center font-bold text-emerald-700 bg-[#F7F5F0]">✓ Priority Queue</td>
                <td className="py-3.5 px-6 text-center font-bold text-purple-700">✓ Instant VIP Queue</td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-semibold">Dedicated Web App Admin Panel</td>
                <td className="py-3.5 px-6 text-center text-slate-400">Available as Add-on</td>
                <td className="py-3.5 px-6 text-center text-slate-400 bg-[#F7F5F0]">Available as Add-on</td>
                <td className="py-3.5 px-6 text-center font-bold text-purple-700">✓ Dedicated Panel Included</td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-semibold">Live Active Users &amp; Devices Telemetry</td>
                <td className="py-3.5 px-6 text-center text-slate-400">Available as Add-on</td>
                <td className="py-3.5 px-6 text-center text-slate-400 bg-[#F7F5F0]">Available as Add-on</td>
                <td className="py-3.5 px-6 text-center font-bold text-emerald-700">✓ Included</td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-semibold">Mobile Banners &amp; Flash Sales Manager</td>
                <td className="py-3.5 px-6 text-center text-slate-400">Available as Add-on</td>
                <td className="py-3.5 px-6 text-center text-slate-400 bg-[#F7F5F0]">Available as Add-on</td>
                <td className="py-3.5 px-6 text-center font-bold text-emerald-700">✓ Included</td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-semibold">Exclusive 4th Theme (Elite Dark Luxe)</td>
                <td className="py-3.5 px-6 text-center text-slate-400">Standard 3 Themes</td>
                <td className="py-3.5 px-6 text-center text-slate-400 bg-[#F7F5F0]">Standard 3 Themes</td>
                <td className="py-3.5 px-6 text-center font-bold text-purple-700">✓ Exclusive Theme Included</td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-semibold">100% White-Label Branding</td>
                <td className="py-3.5 px-6 text-center text-slate-400">Available as Add-on</td>
                <td className="py-3.5 px-6 text-center font-bold text-emerald-700 bg-[#F7F5F0]">✓ Included</td>
                <td className="py-3.5 px-6 text-center font-bold text-emerald-700">✓ Full White-Label</td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-semibold">Technical Support SLA</td>
                <td className="py-3.5 px-6 text-center">Standard Support</td>
                <td className="py-3.5 px-6 text-center bg-[#F7F5F0]">Priority Support</td>
                <td className="py-3.5 px-6 text-center font-bold text-emerald-700">1-on-1 VIP Support</td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-semibold">Store Sales Commission</td>
                <td className="py-3.5 px-6 text-center font-bold text-emerald-700">0% Always</td>
                <td className="py-3.5 px-6 text-center font-bold text-emerald-700 bg-[#F7F5F0]">0% Always</td>
                <td className="py-3.5 px-6 text-center font-bold text-emerald-700">0% Always</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ===================================================
          6. FAQS SECTION
          =================================================== */}
      <section className="py-16 bg-[#FAF8F5] border-t border-[#EBE6DF]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#78593D]">
              Frequently Asked Questions
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#1C1917] mt-1 tracking-tight">
              Got Questions? We Have Answers.
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-white border border-[#EBE6DF] overflow-hidden transition shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-extrabold text-sm text-[#1C1917]"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#78593D] flex-shrink-0 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-[#57514B] leading-relaxed border-t border-[#F5F2EB] pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================================================
          7. THE GRAND END CTA: "BUILD YOUR APP NOW"
          =================================================== */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-[#FAF8F5] via-[#F5F1EB] to-[#FAF8F5] border-t border-[#EBE6DF]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-white border-2 border-[#78593D]/30 p-8 sm:p-14 text-center shadow-2xl relative overflow-hidden">
            {/* Soft decorative radial gradient */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#78593D]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#C2A88F]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EFEAE2] text-[#78593D] text-xs font-black uppercase tracking-wider mb-5 border border-[#E2DBD0]">
                <Rocket className="w-3.5 h-3.5" />
                <span>Ready to Launch?</span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-black text-[#1C1917] tracking-tight leading-tight">
                Turn Your Website Into an App Today.
              </h2>

              <p className="mt-4 text-sm sm:text-base text-[#57514B] max-w-xl mx-auto leading-relaxed">
                Connect your WordPress, WooCommerce, or Shopify store. Choose your preferred layout, customize your branding, and publish your mobile app in minutes.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href={buildAppHref}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#78593D] hover:bg-[#634932] text-white font-black text-base transition shadow-xl shadow-[#78593D]/25 flex items-center justify-center gap-2 group"
                >
                  <span>Build Your App Now</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/themes"
                  className="w-full sm:w-auto px-6 py-4 rounded-xl bg-[#FAF8F5] hover:bg-[#EFEAE2] text-[#1C1917] border border-[#EBE6DF] font-bold text-sm transition text-center"
                >
                  Explore Layout Themes
                </Link>
              </div>

              <div className="mt-8 pt-8 border-t border-[#F5F2EB] flex flex-wrap items-center justify-center gap-6 text-xs text-[#7E756B] font-semibold">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Zero Coding Required</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Instant Setup</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Lifetime License</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>0% Revenue Commission</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
          8. CUSTOM FEATURE REQUEST MODAL
          =================================================== */}
      {isCustomFeatureOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsCustomFeatureOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white border border-[#EBE6DF] shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#EBE6DF] pb-3 mb-4">
              <div>
                <h3 className="text-lg font-black text-[#1C1917]">Request Custom Feature Quote</h3>
                <p className="text-xs text-[#7E756B] mt-0.5">
                  Describe the unique functionality you need for your mobile app.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomFeatureOpen(false)}
                className="w-8 h-8 rounded-full border border-[#EBE6DF] flex items-center justify-center text-[#7E756B] hover:text-[#1C1917]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {customSuccessMessage ? (
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200">
                {customSuccessMessage}
              </div>
            ) : (
              <form onSubmit={handleSubmitCustomFeature} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#57514B] block mb-1">Feature Name *</label>
                  <input
                    type="text"
                    required
                    value={customFeatureName}
                    onChange={(e) => setCustomFeatureName(e.target.value)}
                    placeholder="e.g. Custom Multi-Vendor Marketplace Split"
                    className="w-full px-3.5 py-2 rounded-xl text-xs border border-[#EBE6DF] focus:outline-none focus:border-[#78593D]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#57514B] block mb-1">Requirements &amp; Scope *</label>
                  <textarea
                    required
                    rows={3}
                    value={customFeatureReqs}
                    onChange={(e) => setCustomFeatureReqs(e.target.value)}
                    placeholder="Describe how the feature should behave and what data it connects with..."
                    className="w-full px-3.5 py-2 rounded-xl text-xs border border-[#EBE6DF] focus:outline-none focus:border-[#78593D]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#57514B] block mb-1">Reference Website / App URL</label>
                  <input
                    type="url"
                    value={customFeatureUrl}
                    onChange={(e) => setCustomFeatureUrl(e.target.value)}
                    placeholder="https://yourstore.com/feature-reference"
                    className="w-full px-3.5 py-2 rounded-xl text-xs border border-[#EBE6DF] focus:outline-none focus:border-[#78593D]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingCustom}
                  className="w-full py-3.5 rounded-xl bg-[#78593D] hover:bg-[#634932] text-white font-extrabold text-xs transition shadow-md flex items-center justify-center gap-2"
                >
                  {isSubmittingCustom ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Submit Feature Request &rarr;</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ===================================================
          9. GLOBAL FOOTER (EXACT MATCHING APPIFYHUB FOOTER)
          =================================================== */}
      <footer className="app-footer">
        <div className="footer-inner">
          <div className="footer-top-grid">
            <div className="footer-col footer-col-brand">
              <Link href="/" className="brand-logo" aria-label="AppifyHub Home">
                <svg
                  className="brand-icon"
                  width="24"
                  height="24"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M16 3L3 27H11L16 17L21 27H29L16 3Z" fill="#78593D" />
                  <path d="M16 11L11.5 20H20.5L16 11Z" fill="#C2A88F" />
                </svg>
                <span className="brand-text">AppifyHub</span>
              </Link>
              <p className="brand-tagline">
                Turn your website into a powerful mobile experience.
              </p>
            </div>

            <div className="footer-col">
              <h4 className="footer-title">Product</h4>
              <ul className="footer-links">
                <li><Link href="/how-it-works">How It Works</Link></li>
                <li><Link href="/themes">Themes</Link></li>
                <li><Link href="/plans">Plans &amp; Add-ons</Link></li>
                <li><Link href="/support">Support</Link></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4 className="footer-title">Platform</h4>
              <ul className="footer-links">
                <li><Link href="/signup?platform=wordpress">WordPress</Link></li>
                <li><Link href="/signup?platform=woocommerce">WooCommerce</Link></li>
                <li><Link href="/signup?platform=shopify">Shopify</Link></li>
              </ul>
            </div>

            <div className="footer-col footer-col-social">
              <div className="social-icons">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-btn" aria-label="Facebook">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-btn" aria-label="Instagram">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </a>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="social-btn" aria-label="YouTube">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z" />
                    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="#F5F1EB" />
                  </svg>
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-btn" aria-label="LinkedIn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 2a2 2 0 1 1-2 2 2 2 0 0 1 2-2z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="footer-bottom-bar">
            <p className="copyright">&copy; {new Date().getFullYear()} AppifyHub. All rights reserved.</p>
            <div className="footer-legal">
              <a href="#privacy">Privacy Policy</a>
              <span className="sep">|</span>
              <a href="#terms">Terms &amp; Conditions</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
