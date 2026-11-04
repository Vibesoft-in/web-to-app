"use client";

function getAddonShortName(name: string, slug?: string): string {
  const lower = (name + " " + (slug || "")).toLowerCase();
  if (lower.includes("admin")) return "Admin Panel";
  if (lower.includes("play") || lower.includes("store") || lower.includes("aab")) return "Play Store Publishing";
  if (lower.includes("push") || lower.includes("notif")) return "Push Notifications";
  if (lower.includes("whatsapp")) return "WhatsApp Integration";
  if (lower.includes("analytic") || lower.includes("telemetry")) return "App Analytics";
  if (lower.includes("nav") || lower.includes("menu")) return "Custom Navigation";
  if (lower.includes("white") || lower.includes("brand") || lower.includes("splash")) return "White-Label Branding";
  if (lower.includes("api") || lower.includes("erp")) return "API & ERP Integration";
  return name;
}

function getAddonOneLineDesc(shortName: string, desc: string): string {
  switch (shortName) {
    case "Admin Panel":
      return "Standalone web control portal for live product sync, push messaging, and orders.";
    case "Play Store Publishing":
      return "Guaranteed Google Play submission with policy compliance and signed .aab generation.";
    case "Push Notifications":
      return "Automated lock-screen broadcasts, flash deal triggers, and cart recovery alerts.";
    case "WhatsApp Integration":
      return "Automated WhatsApp order tracking, COD confirmation, and floating live chat.";
    case "App Analytics":
      return "Real-time user behavior tracking, screen views, and funnel drop-off metrics.";
    case "Custom Navigation":
      return "Drag-and-drop bottom tab bar, custom side drawer, and deep-link menu designer.";
    case "White-Label Branding":
      return "Remove all platform watermarks with custom animated splash screen and package ID.";
    case "API & ERP Integration":
      return "Custom enterprise webhook bridges for SAP, Tally, Zoho, and custom logistics.";
    default:
      return desc ? desc.split(".")[0] + "." : "Enhance your mobile application experience.";
  }
}
import { AddonLearnMoreModal, AddonDetail } from "@/components/addons/addon-learn-more-modal";
import { STANDARDIZED_ADDONS } from "@/lib/addons-data";
import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  Loader2,
  Sparkles,
  Smartphone,
  ShieldCheck,
  LayoutDashboard,
  CreditCard,
  Shield,
  AlertCircle,
  Bell,
  MessageSquare,
  BarChart3,
  Compass,
  CheckCircle2,
  Info,
  ShoppingBag,
  Plus,
  X,
  Layers,
  Zap,
  Receipt,
  CheckSquare,
  Square,
  Palette,
  ExternalLink,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { openRazorpayModal, withSinglePaymentLock } from "@/lib/razorpay";

interface StepPaymentProps {
  ulid?: string;
  setupState?: any;
  onNext: () => void;
}

interface AddOnItem {
  id: number;
  name: string;
  slug: string;
  price: number; // in paise
  price_formatted?: string;
  category: string;
  badge?: string;
  description: string;
  features?: string[];
}

const FALLBACK_ADDONS: AddOnItem[] = [
  {
    id: 1,
    name: "Push Notifications Campaign Engine",
    slug: "push_notifications",
    price: 99900,
    price_formatted: "₹999",
    category: "Marketing",
    badge: "Sales Booster",
    description: "Send rich media push notifications to customer lock screens, flash deal alerts, and automated abandoned cart recovery triggers.",
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
    description: "Automated WhatsApp order confirmation alerts, live parcel tracking links, and 1-click in-app floating WhatsApp live chat support.",
    features: [
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
    description: "Web-based customer portal to monitor mobile app telemetry, manage push notification campaigns, and trigger real-time catalog sync.",
    features: [
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
    description: "Deep user engagement session telemetry, product heatmaps, drop-off conversion funnels, and Google Analytics 4 integration.",
    features: [
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
    description: "Tailored bottom tab bar items, nested category accordions, custom icon packs, and dedicated promotional banner sliders.",
    features: [
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
    description: "Complete submission assistance to Google Play Console with signed .aab, asset graphics, privacy policy hosting, and approval guarantee.",
    features: [
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
    description: "Completely remove all platform watermarks. Custom animated launch splash screen, custom brand typography, and custom package identifier.",
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
    description: "Connect custom warehouse inventory, custom CRM webhooks, private courier tracking endpoints, or specialized payment gateways.",
    features: [
      "Custom REST & webhook endpoints",
      "Warehouse inventory live sync",
      "Private courier tracking bridge",
      "Specialized gateway support",
    ],
  },
];

export function StepPayment({ ulid, setupState, onNext }: StepPaymentProps) {
  const hasActiveSubscription = Boolean(setupState?.subscription?.has_active);
  const currentPlanId = hasActiveSubscription ? Number(setupState?.subscription?.plan_id) : null;
  const currentPlanPaidRupees = hasActiveSubscription ? Number(setupState?.subscription?.paid_amount_rupees || 0) : 0;
  const currentPlanName = hasActiveSubscription ? (setupState?.subscription?.plan_name || "Active Plan") : null;

  const getDefaultPlanId = () => {
    if (hasActiveSubscription && currentPlanId) {
      if (currentPlanId === 1) return 2;
      if (currentPlanId === 2) return 3;
      return 3;
    }
    return setupState?.subscription?.plan_id || 2;
  };

  const [selectedPlanId, setSelectedPlanId] = useState<number | string>(getDefaultPlanId());
  const [selectedAddonIds, setSelectedAddonIds] = useState<number[]>([]);
  const [isYearly, setIsYearly] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Mandatory Payment Terms & Conditions Consent State
  const [hasPaymentConsented, setHasPaymentConsented] = useState(false);
  const [isPaymentTermsModalOpen, setIsPaymentTermsModalOpen] = useState(false);
  const [selectedLearnMoreAddon, setSelectedLearnMoreAddon] = useState<AddonDetail | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);

  // Fetch recorded payment consent from backend
  const { data: consentData } = useQuery({
    queryKey: ['app-consent', ulid],
    queryFn: async () => {
      try {
        const res = await apiClient(`/api/apps/${ulid}/consent`);
        return res;
      } catch {
        return null;
      }
    },
    enabled: !!ulid,
  });

  useEffect(() => {
    if (
      consentData?.payment_terms?.consented ||
      setupState?.verification?.payment_consent ||
      hasActiveSubscription
    ) {
      setHasPaymentConsented(true);
    }
  }, [consentData, setupState, hasActiveSubscription]);

  const isSubmittingRef = useRef(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedPlanId = localStorage.getItem("appifyhub_selected_plan_id");
      if (savedPlanId) {
        setSelectedPlanId(Number(savedPlanId));
        return;
      }
      const savedPlan = localStorage.getItem("appifyhub_selected_plan");
      if (savedPlan) {
        if (savedPlan.includes("starter") || savedPlan.includes("basic")) {
          setSelectedPlanId(1);
          return;
        } else if (savedPlan.includes("enterprise") || savedPlan.includes("premium")) {
          setSelectedPlanId(3);
          return;
        } else if (savedPlan.includes("pro")) {
          setSelectedPlanId(2);
          return;
        }
      }
    } catch {}

    if (hasActiveSubscription && currentPlanId) {
      // Default selection to next higher tier
      if (currentPlanId === 1) setSelectedPlanId(2);
      else if (currentPlanId === 2) setSelectedPlanId(3);
      else setSelectedPlanId(3);
    } else if (setupState?.subscription?.plan_id) {
      setSelectedPlanId(setupState.subscription.plan_id);
    }
  }, [hasActiveSubscription, currentPlanId, setupState?.subscription?.plan_id]);

  // Fetch plans
  const { data: plansData, isLoading: isPlansLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      try {
        const res = await apiClient("/api/plans");
        return res.plans || [];
      } catch {
        return [
          {
            id: 1,
            key: "basic",
            name: "Basic",
            one_time_price: 2999,
            annual_price: 2399,
            price_formatted: "₹2,999",
            usd_equivalent: "Approx. $50 USD • Lifetime App Files",
            period: " one-time",
            desc: "Mobile app solution for eCommerce stores.",
            formats: ["APK", "AAB"],
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
            one_time_price: 7999,
            annual_price: 6399,
            price_formatted: "₹7,999",
            usd_equivalent: "Approx. $90 USD • Lifetime App Files",
            period: " one-time",
            desc: "Complete mobile presence for Android and iOS devices.",
            formats: ["APK", "AAB", "IPA"],
            features: [
              "Android (.apk/.aab)",
              "Automated Store Catalog Sync",
              "Push Notifications",
              "iOS IPA Package Available",
              "Priority App Compilation",
            ],
            popular: true,
          },
          {
            id: 3,
            key: "premium",
            name: "Premium",
            one_time_price: 14999,
            annual_price: 11999,
            price_formatted: "₹14,999",
            usd_equivalent: "Approx. $150 USD • Lifetime App Files",
            period: " one-time",
            desc: "High-scale commerce sites with dedicated app admin panel.",
            formats: ["APK", "AAB", "IPA", "Admin Panel"],
            admin_panel: true,
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
      }
    },
  });

  // Fetch modular add-ons from database
  const { data: addonsData } = useQuery({
    queryKey: ["commercial-addons"],
    queryFn: async () => {
      try {
        const res = await apiClient("/api/commercial/addons");
        return res.addons || [];
      } catch {
        return [];
      }
    },
  });

  const plans = plansData || [];
  const availableAddons: AddOnItem[] =
    addonsData && addonsData.length > 0 ? addonsData : FALLBACK_ADDONS;

  // Selected plan entity
  const selectedPlan =
    plans.find((p: any) => Number(p.id) === Number(selectedPlanId)) ||
    plans[0] || {
      id: 1,
      name: "Basic",
      one_time_price: 2999,
      annual_price: 2399,
    };

  const planBasePrice = isYearly
    ? selectedPlan.annual_price || Math.round((selectedPlan.one_time_price || 2999) * 0.8)
    : selectedPlan.one_time_price ||
      (selectedPlan.price_monthly ? Math.round(selectedPlan.price_monthly / 100) : 2999);

  // Upgrade determination & credit deduction
  const isSelectedCurrentPlan = hasActiveSubscription && Number(selectedPlan.id) === Number(currentPlanId);
  const isSelectedUpgrade = hasActiveSubscription && !isSelectedCurrentPlan && planBasePrice > currentPlanPaidRupees;
  const selectedUpgradeCredit = isSelectedUpgrade ? currentPlanPaidRupees : 0;
  const effectivePlanPrice = isSelectedUpgrade
    ? Math.max(0, planBasePrice - selectedUpgradeCredit)
    : (isSelectedCurrentPlan ? 0 : planBasePrice);

  // Selected add-on entities
  const selectedAddonsList = availableAddons.filter((a) => selectedAddonIds.includes(a.id));

  // Add-ons total in Rupees (prices in DB are in paise)
  const addonsTotalInRupees = selectedAddonsList.reduce((sum, a) => {
    const val = typeof a.price === "number" ? Math.round(a.price / 100) : 0;
    return sum + val;
  }, 0);

  // Theme selection determination & pricing
  const THEME_PRICING_MAP: Record<
    string,
    { name: string; style: string; price: number; isFree: boolean }
  > = {
    theme_a: { name: "Minimal", style: "Modern Retail", price: 0, isFree: true },
    theme_b: { name: "Modern", style: "Luxury Boutique", price: 999, isFree: false },
    theme_c: { name: "Trendy", style: "Vibrant Lifestyle", price: 1499, isFree: false },
    theme_d: { name: "Elite Dark Luxe", style: "Elite Dark Luxe", price: 1999, isFree: false },
  };

  const selectedThemeKey: string =
    setupState?.selected_theme?.key ||
    (typeof window !== "undefined"
      ? localStorage.getItem(`appifyhub_selected_theme_key_${ulid}`) ||
        localStorage.getItem("appifyhub_selected_theme_key")
      : null) ||
    "theme_a";

  const themeInfo = THEME_PRICING_MAP[selectedThemeKey] || THEME_PRICING_MAP.theme_a;
  const isPremiumPlanSelected = Number(selectedPlanId) === 3;
  const isThemeIncludedInPlan = isPremiumPlanSelected || themeInfo.isFree;
  const themePriceInRupees = isThemeIncludedInPlan
    ? 0
    : (setupState?.selected_theme?.price_rupees ?? themeInfo.price);

  // Grand total calculation with upgrade deduction, theme price, and add-ons
  const grandTotalInRupees = effectivePlanPrice + themePriceInRupees + addonsTotalInRupees;
  const grandTotalInPaise = grandTotalInRupees * 100;

  // Toggle add-on selection
  const toggleAddon = (id: number) => {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Helper icon selector for add-ons
  const getAddonIcon = (slug: string, category: string) => {
    if (slug.includes("push") || slug.includes("notification")) {
      return <Bell className="w-4 h-4 text-amber-700 flex-shrink-0" />;
    }
    if (slug.includes("whatsapp") || slug.includes("chat")) {
      return <MessageSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />;
    }
    if (slug.includes("admin")) {
      return <LayoutDashboard className="w-4 h-4 text-purple-700 flex-shrink-0" />;
    }
    if (slug.includes("analytics")) {
      return <BarChart3 className="w-4 h-4 text-blue-600 flex-shrink-0" />;
    }
    if (slug.includes("nav")) {
      return <Compass className="w-4 h-4 text-amber-700 flex-shrink-0" />;
    }
    if (slug.includes("publish") || slug.includes("play_store")) {
      return <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />;
    }
    if (slug.includes("white_label") || slug.includes("branding")) {
      return <Sparkles className="w-4 h-4 text-amber-700 flex-shrink-0" />;
    }
    return <Zap className="w-4 h-4 text-indigo-600 flex-shrink-0" />;
  };

  // Execute payment via Razorpay Checkout
  const handleRazorpayPayment = async () => {
    if (!ulid) {
      onNext();
      return;
    }

    if (!hasPaymentConsented && !hasActiveSubscription) {
      setConsentError('Please accept the Payment Terms & Conditions before initiating payment.');
      return;
    }
    setConsentError(null);
    if (isSubmittingRef.current || isSubmitting) return; // Prevent double-clicks
    isSubmittingRef.current = true;
    setPaymentError(null);
    setPaymentSuccess(null);
    setIsSubmitting(true);

    await withSinglePaymentLock(async () => {
      try {
        const planToActivate = Number(selectedPlanId) || Number(plans[0]?.id) || 1;
        const billingPeriod = isYearly ? "annual" : "one_time";
        const currentPlan = plans.find((p: any) => Number(p.id) === planToActivate);

        // 1. Create Razorpay order on server, including selected add-ons and theme
        const orderRes = await apiClient(`/api/apps/${ulid}/payment/create-order`, {
          method: "POST",
          body: JSON.stringify({
            plan_id: planToActivate,
            billing_period: billingPeriod,
            addons: selectedAddonIds,
            theme_key: selectedThemeKey,
          }),
        });

        if (!orderRes?.success || !orderRes?.order) {
          throw new Error(orderRes?.error || "Could not initialize payment order.");
        }
        // Record mandatory payment consent on backend
        try {
          await apiClient(`/api/apps/${ulid}/consent`, {
            method: 'POST',
            body: JSON.stringify({
              consent_type: 'payment_terms',
              agreed: true,
              policy_version: 'v1.0',
              metadata: {
                plan_id: planToActivate,
                amount_rupees: grandTotalInRupees,
              },
            }),
          });
        } catch (cErr) {
          console.warn('Payment consent record note:', cErr);
        }


        const orderData = orderRes.order;

        // 2. Open official Razorpay Checkout popup
        const modalDescription = isSelectedUpgrade
          ? `Upgrade from ${currentPlanName} to ${currentPlan?.name || "Pro"} (Difference ₹${grandTotalInRupees.toLocaleString("en-IN")})`
          : `${currentPlan?.name || "Selected"} Plan + ${themeInfo.name} Theme + ${selectedAddonIds.length} Add-on(s)`;

        const paymentResponse = await openRazorpayModal({
          orderId: orderData.order_id,
          amount: orderData.amount || grandTotalInPaise,
          currency: orderData.currency || "INR",
          keyId:
            orderData.key_id ||
            process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
            "rzp_test_SnbtbVtFnRIrAI",
          name: "WebIntoApp",
          description: modalDescription,
          prefill: orderRes.prefill,
          themeColor: "#78350f",
        });

        // 3. Verify cryptographic HMAC signature on server and fulfill plan + add-ons + theme
        const verifyRes = await apiClient(`/api/apps/${ulid}/payment/verify`, {
          method: "POST",
          body: JSON.stringify({
            order_id: paymentResponse.razorpay_order_id,
            razorpay_order_id: paymentResponse.razorpay_order_id,
            razorpay_payment_id: paymentResponse.razorpay_payment_id,
            razorpay_signature: paymentResponse.razorpay_signature,
            plan_id: planToActivate,
            billing_period: billingPeriod,
            addons: selectedAddonIds,
            theme_key: selectedThemeKey,
          }),
        });

        if (!verifyRes?.success) {
          throw new Error(verifyRes?.error || "Payment verification failed.");
        }

        setPaymentSuccess(`Payment verified! ID: ${paymentResponse.razorpay_payment_id}`);

        setTimeout(() => {
          onNext();
        }, 1000);
      } catch (err: any) {
        if (err.message === "PAYMENT_CANCELLED") {
          setPaymentError("Payment window was cancelled. You can retry whenever you are ready.");
        } else if (err.message !== "PAYMENT_ALREADY_IN_PROGRESS") {
          setPaymentError(err.message || "Failed to process payment with Razorpay.");
        }
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    });
  };

  // Developer mode bypass
  const handleDevSkip = async () => {
    if (ulid) {
      setIsSubmitting(true);
      setPaymentError(null);
      try {
        const planToActivate = Number(selectedPlanId) || Number(plans[0]?.id) || 1;
        await apiClient(`/api/apps/${ulid}/subscribe`, {
          method: "POST",
          body: JSON.stringify({
            plan_id: planToActivate,
            billing_period: isYearly ? "annual" : "one_time",
            addons: selectedAddonIds,
            theme_key: selectedThemeKey,
          }),
        });
        onNext();
      } catch (e: any) {
        setPaymentError(e.message || "Activation failed.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      onNext();
    }
  };

  return (
    <div className="space-y-8">
      {/* ── 1. Top Section: Header & Billing Frequency Toggle ── */}
      <div className="text-center sm:text-left space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-amber-100/80 text-amber-900 border border-amber-300/60 mb-1">
          <span>Simple &amp; Transparent Plans</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Invest in Your Mobile Growth
        </h2>
        <p className="text-sm text-slate-500 max-w-2xl">
          No hidden transaction percentages. Lifetime app ownership with zero revenue commissions.
        </p>

        {/* Active Plan Upgrade Notice Banner */}
        {hasActiveSubscription && currentPlanPaidRupees > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/70 to-amber-50/50 border border-emerald-300/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-xs mt-0.5 sm:mt-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-900">
                    Active Plan: {currentPlanName} (₹{currentPlanPaidRupees.toLocaleString("en-IN")} Paid)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-200/80 text-emerald-950 border border-emerald-400">
                    Upgrade Credit Active
                  </span>
                </div>
                <p className="text-xs text-slate-700 mt-0.5">
                  Your previously paid <strong className="text-emerald-900 font-extrabold">₹{currentPlanPaidRupees.toLocaleString("en-IN")}</strong> will be deducted automatically from any higher package!
                </p>
              </div>
            </div>
            <div className="text-right sm:text-right flex-shrink-0">
              <span className="text-[11px] font-extrabold text-emerald-800 bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block">
                Credit: -₹{currentPlanPaidRupees.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        )}

        {/* Pricing Toggle: Standard One-Time vs Annual License */}
        <div className="mt-4 inline-flex items-center gap-3 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200">
          <span
            onClick={() => setIsYearly(false)}
            className={`text-xs px-3 py-1.5 rounded-xl cursor-pointer transition select-none ${
              !isYearly
                ? "bg-white font-bold text-slate-900 shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 font-medium"
            }`}
          >
            Standard One-Time
          </span>

          <button
            type="button"
            onClick={() => setIsYearly(!isYearly)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isYearly ? "bg-amber-800" : "bg-slate-300"
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
            className={`text-xs px-3 py-1.5 rounded-xl cursor-pointer transition select-none flex items-center gap-1.5 ${
              isYearly
                ? "bg-white font-bold text-slate-900 shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 font-medium"
            }`}
          >
            <span>Annual License</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200">
              Save 20%
            </span>
          </span>
        </div>
      </div>

      {/* ── 2. Main Plans Selection Grid ── */}
      {isPlansLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-amber-800 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan: any, idx: number) => {
            const isSelected = Number(selectedPlanId) === Number(plan.id);
            const isFeatured = Boolean(
              plan.popular || plan.key === "pro" || plan.name?.toLowerCase().includes("pro")
            );

            const oneTimePrice =
              plan.one_time_price ||
              (plan.price_monthly ? Math.round(plan.price_monthly / 100) : 2999);
            const annualPrice = plan.annual_price || Math.round(oneTimePrice * 0.8);

            const rawDisplayPrice = isYearly ? annualPrice : oneTimePrice;
            const periodText = isYearly ? "/ year" : " one-time";

            const isCurrentPlan = hasActiveSubscription && Number(plan.id) === Number(currentPlanId);
            const isUpgrade = hasActiveSubscription && !isCurrentPlan && rawDisplayPrice > currentPlanPaidRupees;
            const isLowerPlan = hasActiveSubscription && !isCurrentPlan && rawDisplayPrice <= currentPlanPaidRupees;
            const upgradeCredit = isUpgrade ? currentPlanPaidRupees : 0;
            const effectivePrice = isUpgrade ? Math.max(0, rawDisplayPrice - upgradeCredit) : rawDisplayPrice;

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
              : ["White-label Android App", "Unlimited Catalog Sync", "Push Notifications"];

            return (
              <div
                key={plan.id || idx}
                onClick={() => {
                  if (!isCurrentPlan && !isLowerPlan) {
                    setSelectedPlanId(plan.id);
                  }
                }}
                className={`p-6 rounded-2xl border-2 transition flex flex-col justify-between relative ${
                  isCurrentPlan
                    ? "border-emerald-500 bg-emerald-50/20 shadow-sm cursor-default"
                    : isLowerPlan
                    ? "border-slate-200 bg-slate-50/60 opacity-60 cursor-not-allowed"
                    : isSelected
                    ? isFeatured
                      ? "border-amber-800 bg-amber-50/20 shadow-xl shadow-amber-900/10 ring-2 ring-amber-800 cursor-pointer"
                      : "border-indigo-600 bg-indigo-50/20 shadow-lg shadow-indigo-600/10 ring-2 ring-indigo-600 cursor-pointer"
                    : isFeatured
                    ? "border-amber-300 bg-white hover:border-amber-500 shadow-md cursor-pointer"
                    : "border-slate-200 bg-white hover:border-slate-300 shadow-sm cursor-pointer"
                }`}
              >
                {/* Badges on top */}
                {isCurrentPlan ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>Your Active Plan</span>
                  </div>
                ) : isFeatured ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-900 text-white text-[10px] font-extrabold uppercase tracking-wider px-3.5 py-0.5 rounded-full shadow-md">
                    Most Popular
                  </div>
                ) : null}

                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-extrabold text-slate-900 text-lg">{plan.name}</h3>
                    {plan.name?.includes("Basic") && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                        APK + AAB
                      </span>
                    )}
                    {plan.name?.includes("Pro") && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap">
                        APK • AAB • IPA
                      </span>
                    )}
                    {plan.name?.includes("Premium") && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200 whitespace-nowrap">
                        All + Admin Panel
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 mt-1 leading-relaxed min-h-[32px]">
                    {plan.desc}
                  </p>

                  {/* Pricing Display */}
                  <div className="mt-4 mb-2">
                    {isCurrentPlan ? (
                      <div>
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 mb-1.5">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Active Plan (Paid ₹{currentPlanPaidRupees.toLocaleString("en-IN")})</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-slate-400">₹</span>
                          <span className="text-3xl font-black text-slate-600">
                            {rawDisplayPrice.toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs text-slate-400 font-semibold">{periodText}</span>
                        </div>
                        <div className="text-[11px] text-emerald-700 font-bold mt-1">
                          Already unlocked for this app
                        </div>
                      </div>
                    ) : isUpgrade ? (
                      <div>
                        {/* Strikethrough & Credit Tag */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-400 line-through">
                            ₹{rawDisplayPrice.toLocaleString("en-IN")}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                            <span>-₹{upgradeCredit.toLocaleString("en-IN")} Paid Credit</span>
                          </span>
                        </div>

                        {/* Net Difference to Pay */}
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-amber-800">₹</span>
                          <span className="text-3xl font-black text-slate-900">
                            {effectivePrice.toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs text-slate-500 font-semibold">{periodText}</span>
                        </div>

                        <div className="text-[11px] text-emerald-700 font-bold mt-1">
                          Pay upgrade difference: ₹{rawDisplayPrice.toLocaleString("en-IN")} − ₹{upgradeCredit.toLocaleString("en-IN")}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-slate-500">₹</span>
                          <span className="text-3xl font-black text-slate-900">
                            {rawDisplayPrice.toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs text-slate-500 font-semibold">{periodText}</span>
                        </div>
                        <div className="text-[11px] text-amber-900/80 font-medium mt-1">
                          {usdText}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5 border-t border-slate-100 pt-4 text-xs text-slate-600">
                    {featureList.map((feat: string, fidx: number) => {
                      const isFormatHighlight =
                        feat.includes("APK") ||
                        feat.includes("AAB") ||
                        feat.includes("IPA") ||
                        feat.includes("Android & iOS") ||
                        feat.includes("Admin Panel");

                      return (
                        <div key={fidx} className="flex items-start gap-2">
                          <Check
                            className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${
                              isFormatHighlight ? "text-amber-800 font-bold" : "text-emerald-600"
                            }`}
                          />
                          <span className={isFormatHighlight ? "font-bold text-slate-900" : ""}>
                            {feat}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isCurrentPlan || isLowerPlan}
                  className={`mt-6 w-full py-2.5 rounded-xl font-bold text-xs transition ${
                    isCurrentPlan
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-300 cursor-default"
                      : isLowerPlan
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : isSelected
                      ? isFeatured
                        ? "bg-amber-900 text-white shadow-md shadow-amber-900/25"
                        : "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {isCurrentPlan
                    ? "Current Active Plan"
                    : isLowerPlan
                    ? "Included in Active Plan"
                    : isUpgrade
                    ? isSelected
                      ? `Selected Upgrade (₹${effectivePrice.toLocaleString("en-IN")})`
                      : `Upgrade for ₹${effectivePrice.toLocaleString("en-IN")}`
                    : isSelected
                    ? "Selected Plan"
                    : "Choose Plan"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 3. Add-ons & Live Totaling Section (Placed Directly Below Main Plans) ── */}
      <div className="pt-8 border-t border-slate-200/90">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wider uppercase bg-amber-100/90 text-amber-900 border border-amber-300/70 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-800" />
              <span>Recommended Add-ons &amp; Native Extensions</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Select Add-Ons to Enhance Your App
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 max-w-2xl">
              Select verified native extensions below (e.g. Push Notifications, WhatsApp Sync, Dedicated Admin Panel). Totaling updates dynamically on the right.
            </p>
          </div>

          {selectedAddonIds.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedAddonIds([])}
              className="text-xs font-bold text-amber-900 hover:text-amber-700 bg-amber-50 hover:bg-amber-100/80 px-3 py-1.5 rounded-xl border border-amber-200/80 transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <X className="w-3.5 h-3.5 text-amber-700" />
              <span>Reset Add-ons ({selectedAddonIds.length})</span>
            </button>
          )}
        </div>

        {/* Two-Column Responsive Layout: Add-ons on Left (7 cols), Real-time Totaling on Right (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Area: Grid of Add-on Cards */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {availableAddons.map((addon) => {
              const isChecked = selectedAddonIds.includes(addon.id);
              const priceNum = Math.round((addon.price || 0) / 100);
              const shortName = getAddonShortName(addon.name, addon.slug);
              const oneLineDesc = getAddonOneLineDesc(shortName, addon.description);

              const matchingStandard = STANDARDIZED_ADDONS.find(
                (s) => s.shortName === shortName || s.id === addon.slug
              );

              const addonDetail: AddonDetail = matchingStandard
                ? {
                    ...matchingStandard,
                    id: addon.id,
                    price: `₹${priceNum.toLocaleString("en-IN")}`,
                    priceNum,
                    isActive: false,
                  }
                : {
                    id: addon.id,
                    shortName,
                    originalName: addon.name,
                    oneLineDesc,
                    price: `₹${priceNum.toLocaleString("en-IN")}`,
                    priceNum,
                    licenseType: "Lifetime Module",
                    isActive: false,
                    category: addon.category || "Add-on",
                    featureDetails: {
                      title: addon.description,
                      items: addon.features || ["Direct mobile integration", "Priority updates"],
                    },
                    whyItIsUsed: {
                      problem: "Expands your app capabilities without custom development.",
                      benefits: ["Immediate activation", "Full compatibility guarantee"],
                      targetAudience: "All growing store owners",
                    },
                    howItWorks: {
                      steps: ["Select add-on", "Complete checkout", "App compiles with new features"],
                    },
                    purchaseInfo: {
                      priceLabel: `₹${priceNum.toLocaleString("en-IN")}`,
                      license: "Lifetime Module",
                      conditions: "Compatible with your active plan",
                      activeStatusLabel: "Available to Buy",
                    },
                  };

              return (
                <div
                  key={addon.id}
                  className={`p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between relative group select-none min-h-[175px] ${
                    isChecked
                      ? "bg-amber-50/40 border-amber-800 ring-2 ring-amber-800/20 shadow-md shadow-amber-900/10"
                      : "bg-white border-slate-200 hover:border-amber-400 hover:shadow-sm"
                  }`}
                >
                  <div>
                    {/* Top Row: Category & Status Checkbox */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100/80 text-amber-900 border border-amber-200/60">
                        {addon.category}
                      </span>

                      <div
                        onClick={() => toggleAddon(addon.id)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                          isChecked
                            ? "bg-amber-900 text-white"
                            : "border-2 border-slate-300 group-hover:border-amber-600 bg-white"
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>

                    {/* Short Heading */}
                    <div className="flex items-start gap-2 mb-1">
                      <div className="mt-0.5 p-1 rounded-lg bg-slate-50 border border-slate-100 flex-shrink-0">
                        {getAddonIcon(addon.slug, addon.category)}
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 leading-snug">
                        {shortName}
                      </h4>
                    </div>

                    {/* One-Line Description */}
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {oneLineDesc}
                    </p>
                  </div>

                  {/* Price Tag & Action Buttons (Learn More + Toggle Add) */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-xs font-bold text-slate-500">₹</span>
                        <span className="text-base font-black text-slate-900">
                          {priceNum.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block -mt-0.5">Lifetime</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLearnMoreAddon(addonDetail);
                        }}
                        className="py-1 px-2.5 rounded-lg text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition flex items-center gap-1 cursor-pointer"
                      >
                        <Info className="w-3 h-3 text-slate-500" />
                        <span>Learn More</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleAddon(addon.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-extrabold transition flex items-center gap-1 cursor-pointer ${
                          isChecked
                            ? "bg-amber-900 text-white shadow-xs"
                            : "bg-slate-900 text-white hover:bg-black"
                        }`}
                      >
                        {isChecked ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Area: Real-Time Totaling & Order Summary Box ("right of the add ons") */}
          <div className="lg:col-span-5 lg:sticky lg:top-4">
            <div className="rounded-2xl border-2 border-amber-900/20 bg-gradient-to-b from-white via-amber-50/20 to-white p-5 sm:p-6 shadow-xl shadow-amber-900/5">
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/80 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-900 text-white flex items-center justify-center font-bold shadow-xs">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 leading-tight">
                      Order &amp; Billing Summary
                    </h4>
                    <span className="text-[10px] text-amber-900 font-bold uppercase tracking-wider">
                      Live Real-Time Total
                    </span>
                  </div>
                </div>
                <span
                  className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"
                  title="Gateway ready"
                />
              </div>

              {/* Selected Plan Row */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs mb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    {isSelectedUpgrade ? "Upgrading Mobile Package" : "Base Mobile Plan"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                      isSelectedUpgrade
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : isSelectedCurrentPlan
                        ? "bg-slate-100 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {isSelectedUpgrade
                      ? "Package Upgrade"
                      : isSelectedCurrentPlan
                      ? "Active Plan (Paid)"
                      : isYearly
                      ? "Annual License"
                      : "Lifetime Ownership"}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <div>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {selectedPlan.name} Plan
                    </span>
                    {isSelectedUpgrade && (
                      <span className="text-[11px] text-emerald-700 font-semibold block">
                        Upgrading from {currentPlanName}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    {isSelectedUpgrade ? (
                      <div>
                        <span className="text-xs text-slate-400 line-through mr-1.5">
                          ₹{planBasePrice.toLocaleString("en-IN")}
                        </span>
                        <span className="font-black text-slate-900 text-base">
                          ₹{effectivePlanPrice.toLocaleString("en-IN")}
                        </span>
                      </div>
                    ) : isSelectedCurrentPlan ? (
                      <span className="font-black text-emerald-700 text-xs bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                        Paid ₹{currentPlanPaidRupees.toLocaleString("en-IN")}
                      </span>
                    ) : (
                      <span className="font-black text-slate-900 text-base">
                        ₹{planBasePrice.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Selected Mobile Theme Card */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs mb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Selected Mobile Theme</span>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                      themePriceInRupees === 0
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-amber-100 text-amber-900 border border-amber-300"
                    }`}
                  >
                    {isThemeIncludedInPlan
                      ? isPremiumPlanSelected && !themeInfo.isFree
                        ? "Included in Premium"
                        : "Official Free Theme"
                      : "Theme Upgrade"}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <div>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {themeInfo.name} Theme
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Style: {themeInfo.style}
                    </span>
                  </div>
                  <div className="text-right">
                    {themePriceInRupees === 0 ? (
                      <span className="font-black text-emerald-700 text-xs bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                        {isPremiumPlanSelected && !themeInfo.isFree ? "Included (₹0)" : "Free (₹0)"}
                      </span>
                    ) : (
                      <span className="font-black text-slate-900 text-base">
                        +₹{themePriceInRupees.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Selected Add-ons Itemized List */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-2 px-1">
                  <span>Selected Add-ons ({selectedAddonsList.length})</span>
                  <span className="text-amber-900 font-extrabold">
                    {selectedAddonsList.length > 0
                      ? `+₹${addonsTotalInRupees.toLocaleString("en-IN")}`
                      : "None"}
                  </span>
                </div>

                {selectedAddonsList.length === 0 ? (
                  <div className="p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 text-center">
                    <p className="text-xs text-slate-500">
                      No add-ons selected yet. Pick options like{" "}
                      <strong className="text-slate-700">Push Notifications</strong> or{" "}
                      <strong className="text-slate-700">WhatsApp Sync</strong> on the left to bundle them.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedAddonsList.map((addon) => {
                      const priceNum = Math.round((addon.price || 0) / 100);
                      return (
                        <div
                          key={addon.id}
                          className="p-2.5 rounded-xl bg-white border border-amber-200/80 flex items-center justify-between text-xs shadow-2xs group"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <Check className="w-3.5 h-3.5 text-amber-800 flex-shrink-0 font-bold" />
                            <div className="truncate">
                              <span className="font-bold text-slate-800 truncate block text-xs">
                                {addon.name}
                              </span>
                              <span className="text-[10px] text-slate-400 capitalize">
                                {addon.category}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="font-black text-amber-900 text-xs">
                              +₹{priceNum.toLocaleString("en-IN")}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAddon(addon.id);
                              }}
                              className="text-slate-400 hover:text-red-600 p-0.5 rounded transition"
                              title="Remove add-on"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Real-Time Totaling Breakdown */}
              <div className="space-y-2 pt-3 border-t border-slate-200 text-xs text-slate-600 mb-4">
                <div className="flex justify-between">
                  <span>{selectedPlan.name} Plan Base:</span>
                  <span className="font-semibold text-slate-800">
                    ₹{planBasePrice.toLocaleString("en-IN")}
                  </span>
                </div>

                {/* Paid Plan Credit Minus Row */}
                {isSelectedUpgrade && (
                  <div className="flex justify-between items-center text-emerald-800 bg-emerald-50/90 px-2.5 py-1.5 rounded-lg border border-emerald-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>Paid Plan Credit ({currentPlanName}):</span>
                    </span>
                    <span className="font-black text-emerald-700">
                      -₹{selectedUpgradeCredit.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                {isSelectedUpgrade && (
                  <div className="flex justify-between text-slate-700 font-semibold pl-0.5">
                    <span>Net Upgrade Plan Charge:</span>
                    <span className="font-bold text-slate-900">
                      ₹{effectivePlanPrice.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                {themePriceInRupees > 0 && (
                  <div className="flex justify-between text-amber-900 font-semibold">
                    <span>Selected Theme ({themeInfo.name}):</span>
                    <span className="font-bold">
                      +₹{themePriceInRupees.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                {selectedAddonsList.length > 0 && (
                  <div className="flex justify-between text-amber-900">
                    <span>Add-ons ({selectedAddonsList.length}):</span>
                    <span className="font-bold">
                      +₹{addonsTotalInRupees.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                {isYearly && !isSelectedUpgrade && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Annual 20% License Discount:</span>
                    <span className="font-bold">Applied</span>
                  </div>
                )}

                <div className="flex justify-between items-baseline pt-2.5 border-t border-slate-200">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900 block">
                      Total Payable Amount
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isSelectedUpgrade ? "Paid plan credit deducted" : "All features & compilation files"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900">
                      ₹{grandTotalInRupees.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] text-slate-500 block font-medium">
                      {isSelectedUpgrade ? "Difference amount only" : "One-time / Zero commission"}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── REQ 5B: MANDATORY PAYMENT TERMS & CONDITIONS CONSENT CHECKBOX & LEARN MORE ── */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-2 mb-3">
                <div className="flex items-start gap-2.5">
                  <input
                    id="payment-terms-consent"
                    type="checkbox"
                    checked={hasPaymentConsented}
                    onChange={(e) => {
                      setHasPaymentConsented(e.target.checked);
                      if (e.target.checked) setConsentError(null);
                    }}
                    className="w-4 h-4 mt-0.5 rounded border-slate-300 text-amber-900 focus:ring-amber-800 cursor-pointer"
                  />
                  <div className="space-y-0.5 flex-1">
                    <label
                      htmlFor="payment-terms-consent"
                      className="font-bold text-slate-900 cursor-pointer select-none text-xs"
                    >
                      I have read and agree to the Payment Terms &amp; Conditions. *
                    </label>
                    <p className="text-slate-500 text-[10.5px] leading-tight">
                      One-time license, digital software fulfillment, and 7-day technical refund guarantee.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPaymentTermsModalOpen(true)}
                    className="text-[11px] font-bold text-amber-800 hover:text-amber-950 hover:underline flex items-center gap-1 cursor-pointer flex-shrink-0"
                  >
                    <Receipt className="w-3 h-3" />
                    <span>Learn More</span>
                  </button>
                </div>

                {consentError && (
                  <p className="text-[11px] text-rose-600 font-medium pl-6 animate-in fade-in">
                    {consentError}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleRazorpayPayment}
                  disabled={isSubmitting || (!hasPaymentConsented && !hasActiveSubscription) || (isSelectedCurrentPlan && selectedAddonIds.length === 0)}
                  className={`w-full py-3 px-4 bg-amber-900 hover:bg-amber-800 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-md shadow-amber-900/25 ${
                    isSubmitting ? "pointer-events-none opacity-60 cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>
                        {isSelectedCurrentPlan && selectedAddonIds.length === 0
                          ? "Current Plan Already Active"
                          : isSelectedUpgrade
                          ? `Pay Upgrade ₹${grandTotalInRupees.toLocaleString("en-IN")} with Razorpay`
                          : `Pay ₹${grandTotalInRupees.toLocaleString("en-IN")} with Razorpay`}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDevSkip}
                  disabled={isSubmitting}
                  className="w-full py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold hover:bg-slate-100 rounded-lg transition"
                >
                  Skip Payment (Dev Mode)
                </button>
              </div>

              {/* Trust & Gateway Security Strip */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-500">
                <span className="flex items-center gap-1 text-slate-700 font-medium">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>256-bit SSL</span>
                </span>
                <span>Razorpay Gateway</span>
                <span>100% App Ownership</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error & Success Messages */}
      {paymentError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{paymentError}</span>
          </div>
          <button
            onClick={() => setPaymentError(null)}
            className="text-red-600 hover:text-red-800 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {paymentSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{paymentSuccess}</span>
        </div>
      )}

      {/* Bottom Trust & Gateway Info Strip */}
      <div className="p-3 bg-gradient-to-r from-amber-50/50 via-slate-50 to-indigo-50/40 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-800">Razorpay Gateway Ready</span>
          <span className="text-slate-400">•</span>
          <span className="text-[11px] text-slate-500">Test Mode (rzp_test_Snbtb...)</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1 font-medium text-slate-700">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            256-bit SSL Encrypted
          </span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span className="hidden sm:inline">UPI • Cards • NetBanking • Wallets</span>
        </div>
      </div>

      {/* ── BOTTOM ACTION BAR WITH NEXT BUTTON ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200 mt-6">
        <div className="text-xs text-slate-500">
          {hasActiveSubscription
            ? "Your license package is active. Proceed to the APK build & compilation step."
            : "Select your desired package above or proceed to the mobile build compilation step."}
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={!hasActiveSubscription && !hasPaymentConsented}
          className={`w-full sm:w-auto justify-center px-7 py-3 rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-md ${
            hasActiveSubscription || hasPaymentConsented
              ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 cursor-pointer active:scale-98"
              : "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
          }`}
        >
          <span>Next</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      {!hasActiveSubscription && !hasPaymentConsented && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/70 p-2.5 rounded-xl text-center">
          🔒 <strong>Step Locked:</strong> Payment Terms &amp; Conditions consent is required before proceeding to the mobile build compilation step.
        </p>
      )}

      {/* ── MODAL: PAYMENT TERMS LEARN MORE (8 MANDATORY SECTIONS) ── */}
      {isPaymentTermsModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setIsPaymentTermsModalOpen(false)} />

          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative z-10 border border-slate-200 my-auto max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    Payment Terms &amp; Commercial Conditions
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Clear breakdown of licensing, payment schedules, refund policy, and activation terms.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentTermsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm mb-1">1. Covered Service &amp; Package Deliverables</h4>
                <p className="text-slate-600 leading-relaxed">
                  Payment covers automated cloud compilation, code signing, and digital fulfillment of your mobile application artifacts (installable Android APK, Google Play Bundle .AAB, iOS .IPA, and admin management portal access per selected tier).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm mb-1">2. One-Time vs Recurring Charges</h4>
                <p className="text-slate-600 leading-relaxed">
                  All packages and add-on modules are billed as transparent, one-time lifetime license fees. There are zero recurring monthly royalties or revenue commissions on store sales.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm mb-1">3. Additional Third-Party Charges</h4>
                <p className="text-slate-600 leading-relaxed">
                  There are no hidden gateway surcharges. Note that Google Play Developer ($25 one-time) and Apple Developer ($99/year) console registration fees are paid directly to Google and Apple respectively if you choose to publish on their app stores.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm mb-1">4. Refund Policy</h4>
                <p className="text-slate-600 leading-relaxed">
                  We offer a 100% money-back refund guarantee within 7 business days if our automated build engine fails to compile your verified store application and our technical engineering team cannot resolve it.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm mb-1">5. Cancellation Policy</h4>
                <p className="text-slate-600 leading-relaxed">
                  Orders may be cancelled or modified at any point prior to final production build generation. Once production binaries are generated, the digital software license is delivered.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm mb-1">6. Service Activation Timeline</h4>
                <p className="text-slate-600 leading-relaxed">
                  License entitlement activates immediately upon successful transaction verification through Razorpay. You can trigger mobile build compilation without delay.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm mb-1">7. Service Delivery &amp; Support Conditions</h4>
                <p className="text-slate-600 leading-relaxed">
                  All binary outputs are delivered electronically directly into your dashboard downloads section. You receive full developer documentation and priority email/chat support for store deployment.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm mb-1">8. Failed or Duplicate Payment Handling</h4>
                <p className="text-slate-600 leading-relaxed">
                  If an order fails but your account was charged, Razorpay automatically reconciles the transaction within 24-48 hours. Any inadvertent duplicate payment is detected automatically and refunded in full to your original payment method.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <a
                href="/terms"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-amber-800 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Full Terms of Service</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <button
                type="button"
                onClick={() => {
                  setHasPaymentConsented(true);
                  setConsentError(null);
                  setIsPaymentTermsModalOpen(false);
                }}
                className="px-5 py-2.5 bg-amber-900 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm active:scale-95"
              >
                Accept &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}
    
      {/* ── MODAL: 4-SECTION ADD-ON LEARN MORE POPUP ── */}
      <AddonLearnMoreModal
        isOpen={Boolean(selectedLearnMoreAddon)}
        onClose={() => setSelectedLearnMoreAddon(null)}
        addon={selectedLearnMoreAddon}
        isSelectedInCart={selectedLearnMoreAddon ? selectedAddonIds.includes(Number(selectedLearnMoreAddon.id)) : false}
        onSelectOrBuy={(a) => toggleAddon(Number(a.id))}
      />
</div>
  );
}
