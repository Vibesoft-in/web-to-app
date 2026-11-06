"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Calendar,
  Check,
  CreditCard,
  FileText,
  HelpCircle,
  Loader2,
  Receipt,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Zap,
  Mail,
  Printer,
  ExternalLink,
  Send,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { openRazorpayModal, withSinglePaymentLock } from "@/lib/razorpay";

export default function BillingPage() {
  const isSwitchingPlanRef = useRef(false);
  const [switchingPlanId, setSwitchingPlanId] = useState<number | null>(null);
  const [switchMessage, setSwitchMessage] = useState<string | null>(null);
  const [resendingOrderId, setResendingOrderId] = useState<number | null>(null);
  const [invoiceNotice, setInvoiceNotice] = useState<string | null>(null);
  const [isYearly, setIsYearly] = useState(false);
  const [selectedAppUlid, setSelectedAppUlid] = useState<string>("");

  const { data: userAppsData } = useQuery({
    queryKey: ["user-apps-billing"],
    queryFn: () => apiClient("/api/apps"),
  });

  const apps: any[] = userAppsData || [];
  const selectedApp =
    apps.find((a: any) => a.ulid === selectedAppUlid) || apps[0] || null;
  const currentAppUlid = selectedApp?.ulid || "";

  const { data: billingData, isLoading, refetch } = useQuery({
    queryKey: ["billing-data", currentAppUlid],
    queryFn: () =>
      apiClient(
        currentAppUlid ? `/api/billing?app_ulid=${currentAppUlid}` : "/api/billing"
      ),
  });

  const { data: ordersData, refetch: refetchOrders } = useQuery({
    queryKey: ["orders", "my-orders", currentAppUlid],
    queryFn: () =>
      apiClient(
        currentAppUlid
          ? `/api/orders/my-orders?app_ulid=${currentAppUlid}`
          : "/api/orders/my-orders"
      ),
  });
  const myOrders: any[] = ordersData?.orders || [];

  const handleResendInvoice = async (orderId: number) => {
    setResendingOrderId(orderId);
    setInvoiceNotice(null);
    try {
      const res = await apiClient(`/api/orders/${orderId}/resend-invoice`, {
        method: "POST",
      });
      if (res?.success) {
        setInvoiceNotice(res.message || "Invoice notification dispatched successfully!");
      } else {
        setInvoiceNotice("Invoice email triggered. Please check your inbox and logs.");
      }
    } catch (e: any) {
      setInvoiceNotice(e.message || "Failed to dispatch email.");
    } finally {
      setResendingOrderId(null);
    }
  };

  const activeSub = billingData?.active_sub;
  const currentPlan = activeSub?.plan || {
    id: 1,
    name: "Starter App",
    price_monthly: 499900,
  };
  const plans = billingData?.plans || [
    {
      id: 1,
      name: "Starter App",
      price_monthly: 499900,
      features: { wishlist: true, otp_login: true, notifications: true },
      limits: { builds_per_month: 3, max_apps: 1 },
    },
    {
      id: 2,
      name: "Pro Combo",
      price_monthly: 899900,
      features: { wishlist: true, otp_login: true, notifications: true, reviews: true, whatsapp: true },
      limits: { builds_per_month: 10, max_apps: 3 },
    },
    {
      id: 3,
      name: "Enterprise Suite",
      price_monthly: 1499900,
      features: { wishlist: true, otp_login: true, notifications: true, reviews: true, whatsapp: true },
      limits: { builds_per_month: 50, max_apps: 10 },
    },
  ];

  const handleSwitchPlan = async (planId: number, planName: string) => {
    if (activeSub?.app?.ulid) {
      if (isSwitchingPlanRef.current || switchingPlanId !== null) return; // Prevent double-clicks
      isSwitchingPlanRef.current = true;
      setSwitchingPlanId(planId);
      setSwitchMessage(null);

      await withSinglePaymentLock(async () => {
        try {
          const billingPeriod = isYearly ? "annual" : "one_time";

          // 1. Create order on backend via Razorpay
          const orderRes = await apiClient(`/api/apps/${activeSub.app.ulid}/payment/create-order`, {
            method: "POST",
            body: JSON.stringify({
              plan_id: planId,
              billing_period: billingPeriod,
            }),
          });

          if (orderRes?.success && orderRes?.order) {
            const orderData = orderRes.order;

            // 2. Open Razorpay Checkout modal
            const paymentResponse = await openRazorpayModal({
              orderId: orderData.order_id,
              amount: orderData.amount,
              currency: orderData.currency || "INR",
              keyId: orderData.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_SnbtbVtFnRIrAI",
              name: "WebIntoApp",
              description: `${planName} Subscription Upgrade`,
              prefill: orderRes.prefill,
              themeColor: "#4f46e5",
            });

            // 3. Verify signature on backend
            await apiClient(`/api/apps/${activeSub.app.ulid}/payment/verify`, {
              method: "POST",
              body: JSON.stringify({
                order_id: paymentResponse.razorpay_order_id,
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                plan_id: planId,
                billing_period: billingPeriod,
              }),
            });

            setSwitchMessage(`Successfully upgraded to ${planName}! (Transaction ID: ${paymentResponse.razorpay_payment_id})`);
          } else {
            // Direct fallback
            await apiClient(`/api/apps/${activeSub.app.ulid}/subscribe`, {
              method: "POST",
              body: JSON.stringify({ plan_id: planId, billing_period: billingPeriod }),
            });
            setSwitchMessage(`Successfully switched plan to ${planName}!`);
          }

          await refetch();
        } catch (err: any) {
          if (err.message === "PAYMENT_CANCELLED") {
            setSwitchMessage("Upgrade cancelled. Your current plan remains active.");
          } else if (err.message !== "PAYMENT_ALREADY_IN_PROGRESS") {
            setSwitchMessage(err.message || "Failed to switch plan.");
          }
        } finally {
          isSwitchingPlanRef.current = false;
          setSwitchingPlanId(null);
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[450px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="text-xs font-semibold text-slate-500">Loading billing details...</span>
        </div>
      </div>
    );
  }

  const formattedActivePrice =
    currentPlan.price_monthly === 0
      ? "₹0"
      : `₹${(currentPlan.price_monthly / 100).toLocaleString("en-IN")}`;

  const paidOrders = myOrders.filter(
    (o: any) => o.status === "paid" || o.status === "completed"
  );
  const pendingOrders = myOrders.filter(
    (o: any) => o.status === "pending" || o.status === "created"
  );

  const totalPaidRupees = paidOrders.reduce((acc: number, o: any) => {
    const val = typeof o.total_amount === "number" ? o.total_amount : 0;
    return acc + Math.round(val / 100);
  }, 0);

  const totalPendingRupees = pendingOrders.reduce((acc: number, o: any) => {
    const val = typeof o.total_amount === "number" ? o.total_amount : 0;
    return acc + Math.round(val / 100);
  }, 0);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Billing & Subscriptions</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your subscription tier, billing period, and view receipt history.
        </p>
      </div>

      {/* App-Wise Selection / Information Header */}
      {apps.length > 1 ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#78593D] text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Select Application
              </span>
              <h2 className="text-sm font-bold text-slate-900">
                Viewing billing details for:
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="app-billing-select" className="sr-only">
              Select App
            </label>
            <select
              id="app-billing-select"
              value={selectedApp?.ulid || ""}
              onChange={(e) => setSelectedAppUlid(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-white text-slate-800 text-xs font-bold shadow-2xs outline-none focus:ring-2 focus:ring-[#78593D] cursor-pointer min-w-[220px]"
            >
              {apps.map((app: any) => (
                <option key={app.ulid} value={app.ulid}>
                  {app.name} ({app.status || "active"})
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : apps.length === 1 && selectedApp ? (
        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF] shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#78593D] text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#78593D] bg-[#EFEAE2] px-2 py-0.5 rounded-md border border-[#D6C8B8]">
                  Single Application
                </span>
                <span className="text-xs text-slate-500">{selectedApp.site_url || selectedApp.website_url || ""}</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-0.5">{selectedApp.name}</h2>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
            {selectedApp.status || "active"}
          </span>
        </div>
      ) : apps.length === 0 ? (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-amber-700 flex-shrink-0" />
          <span>No apps found. Create your first mobile application to begin subscription and billing.</span>
        </div>
      ) : null}

      {/* App-Wise Financial KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
            Selected App
          </span>
          <span className="text-base font-black text-slate-900 mt-1 block truncate">
            {selectedApp?.name || "All Applications"}
          </span>
          <span className="text-[11px] text-slate-500 truncate block mt-0.5">
            {selectedApp?.site_url || selectedApp?.website_url || "Workspace Primary"}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
            Total Amount Paid
          </span>
          <span className="text-xl font-black text-emerald-700 mt-1 block">
            ₹{totalPaidRupees.toLocaleString("en-IN")}
          </span>
          <span className="text-[11px] text-emerald-600 block mt-0.5 font-medium">
            {paidOrders.length} successful payment{paidOrders.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
            Pending Balance
          </span>
          <span className="text-xl font-black text-slate-900 mt-1 block">
            {totalPendingRupees > 0 ? `₹${totalPendingRupees.toLocaleString("en-IN")}` : "₹0"}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            {totalPendingRupees > 0 ? "Pending checkout confirmation" : "All accounts settled"}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
            Subscription Status
          </span>
          <span className="text-base font-black text-slate-900 mt-1 block">
            {activeSub?.status ? activeSub.status.toUpperCase() : "ACTIVE"}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5 truncate">
            {activeSub?.current_period_end
              ? `Renews: ${new Date(activeSub.current_period_end).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
              : "Continuous license"}
          </span>
        </div>
      </div>

      {switchMessage && (
        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          <span>{switchMessage}</span>
        </div>
      )}

      {/* Active Subscription Overview Card */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 rounded-2xl sm:rounded-3xl p-4 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
                {activeSub?.status || "Active Plan"}
              </span>
              <span className="text-xs text-slate-400">
                Workspace: {billingData?.tenant?.name || "My Store"}
              </span>
            </div>
            <h2 className="text-3xl font-black mt-2 tracking-tight flex items-baseline gap-2">
              <span>{currentPlan.name} Tier</span>
              <span className="text-lg font-normal text-slate-400">
                {formattedActivePrice}
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              {selectedApp?.name
                ? `Assigned to Mobile App: ${selectedApp.name}`
                : activeSub?.app?.name
                ? `Assigned to Mobile App: ${activeSub.app.name}`
                : "Active white-label mobile app license"}
            </p>
          </div>

          <div className="text-left md:text-right">
            <div className="text-xs text-slate-400 flex items-center md:justify-end gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {activeSub?.current_period_end
                  ? `Renews on: ${new Date(activeSub.current_period_end).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}`
                  : "Continuous access"}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">
              Ref ID: {activeSub?.razorpay_sub_id || "sub_active_store"}
            </div>
          </div>
        </div>

        {/* Quotas & Features */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
              Monthly Builds
            </span>
            <span className="text-xl font-bold mt-1 block">
              {currentPlan.limits?.builds_per_month || 10} / month
            </span>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
              Supported Platforms
            </span>
            <span className="text-xl font-bold mt-1 block">
              {currentPlan.name?.includes("Starter") ? "Android (AAB+APK)" : "Android & iOS (AAB+APK+IPA)"}
            </span>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
              Catalog Sync
            </span>
            <span className="text-xl font-bold mt-1 block">Automated REST</span>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
              Push Notifications
            </span>
            <span className="text-xl font-bold mt-1 block">Firebase (FCM)</span>
          </div>
        </div>
      </div>

      {/* Available Plans Comparison */}
      {/* Available Plans Comparison */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Available Subscription Plans</h3>
            <p className="text-xs text-slate-500">Simple &amp; transparent pricing. Switch tiers at any time with immediate effect.</p>
          </div>

          {/* Pricing Toggle: Standard One-Time vs Annual License */}
          <div className="inline-flex items-center gap-3 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200 self-start sm:self-auto">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((p: any) => {
            const isCurrent = currentPlan.id === p.id;
            const isPro = p.name?.includes("Pro") || p.popular;

            const oneTimePrice = p.one_time_price || (p.price_monthly ? Math.round(p.price_monthly / 100) : 4999);
            const annualPrice = p.annual_price || Math.round(oneTimePrice * 0.8);
            const displayPrice = isYearly ? annualPrice : oneTimePrice;
            const priceFormatted = `₹${displayPrice.toLocaleString("en-IN")}`;
            const periodText = isYearly ? "/ year" : " one-time";

            const usdText = p.usd_equivalent || (
              oneTimePrice <= 5000
                ? "Approx. $50 USD • Lifetime App Files"
                : oneTimePrice <= 9500
                ? "Approx. $90 USD • Lifetime App Files"
                : "Approx. $150 USD • Lifetime App Files"
            );

            return (
              <div
                key={p.id}
                className={`rounded-3xl p-6 border-2 transition flex flex-col justify-between relative bg-white ${
                  isCurrent
                    ? "border-amber-800 shadow-lg ring-1 ring-amber-800 bg-amber-50/10"
                    : isPro
                    ? "border-amber-200 hover:border-amber-400 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 shadow-sm"
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-900 text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm">
                    Current Plan
                  </div>
                )}
                {!isCurrent && isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm">
                    Most Popular
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-extrabold text-slate-900 text-lg">{p.name}</h4>
                    {p.name?.includes("Starter") && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        APK + AAB
                      </span>
                    )}
                    {p.name?.includes("Pro") && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        APK • AAB • IPA
                      </span>
                    )}
                    {p.name?.includes("Enterprise") && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        All + Admin Panel
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 mt-1 min-h-[32px] leading-relaxed">
                    {p.desc || (
                      p.name?.includes("Starter")
                        ? "Ideal for single Android store apps with standard features."
                        : p.name?.includes("Pro")
                        ? "Complete mobile presence for Android and iOS devices."
                        : "For high-scale commerce sites requiring full integration."
                    )}
                  </p>

                  <div className="mt-3 mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-slate-500">₹</span>
                      <span className="text-3xl font-black text-slate-900">{displayPrice.toLocaleString("en-IN")}</span>
                      <span className="text-xs text-slate-500 font-semibold">{periodText}</span>
                    </div>
                    <div className="text-[11px] text-amber-900/80 font-medium mt-0.5">
                      {usdText}
                    </div>
                  </div>

                  <div className="space-y-2.5 border-t border-slate-100 pt-4 text-xs text-slate-600">
                    {p.name?.includes("Starter") ? (
                      <>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 font-bold flex-shrink-0" />
                          <span className="font-semibold text-slate-900">Android App (.aab / .apk files)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>Standard Clean Theme Layout</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>Push Notifications (Basic)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>Standard App Icon &amp; Splash Screen</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>Real-Time Product &amp; Order Sync</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>3 Months Technical Support</span>
                        </div>
                      </>
                    ) : p.name?.includes("Pro") ? (
                      <>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-amber-800 font-bold flex-shrink-0" />
                          <span className="font-bold text-slate-900">Both Android &amp; iOS Apps</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>All Premium Themes Included</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-amber-800 font-bold flex-shrink-0" />
                          <span className="font-bold text-slate-900">Native Push Notifications</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>Payment Gateway Sync &amp; 1-Tap Checkout</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>Custom Branding &amp; Full Color Palette</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>WhatsApp &amp; In-App Chat Integration</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-amber-800 font-bold flex-shrink-0" />
                          <span className="font-bold text-slate-900">6 Months Priority Support</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-purple-600 font-bold flex-shrink-0" />
                          <span className="font-bold text-slate-900">Both Android &amp; iOS Apps Included</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                          <span className="font-semibold text-slate-900">All Premium Add-ons &amp; Themes Included</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>Priority App Store &amp; Play Store Publishing</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>Dedicated Technical App Manager</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>Custom ERP &amp; API Integrations</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>1 Year Dedicated Support &amp; Updates</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isCurrent || switchingPlanId !== null}
                  onClick={() => handleSwitchPlan(p.id, p.name)}
                  className={`mt-6 w-full py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
                    isCurrent
                      ? "bg-slate-100 text-slate-400 cursor-default"
                      : switchingPlanId !== null
                      ? "bg-amber-900/60 pointer-events-none opacity-60 cursor-not-allowed text-white"
                      : "bg-amber-900 hover:bg-amber-800 text-white shadow-sm shadow-amber-900/20 cursor-pointer"
                  }`}
                >
                  {switchingPlanId === p.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Switching...</span>
                    </>
                  ) : isCurrent ? (
                    "Active Tier"
                  ) : (
                    <span>Switch to {p.name}</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoice & Receipt History */}
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Payment &amp; Billing History</h3>
            <p className="text-xs text-slate-500">View official tax invoices, print receipts, and trigger email delivery.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
              Verified Invoices ({myOrders.length > 0 ? myOrders.length : 1})
            </span>
          </div>
        </div>

        {invoiceNotice && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-800 flex-shrink-0" />
              <span>{invoiceNotice}</span>
            </div>
            <button
              onClick={() => setInvoiceNotice(null)}
              className="text-amber-800 hover:text-amber-950 font-bold text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead>
              <tr className="text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="py-3 font-semibold">Order / Invoice ID</th>
                <th className="py-3 font-semibold">Transaction ID</th>
                <th className="py-3 font-semibold">Date</th>
                <th className="py-3 font-semibold">Plan &amp; Items</th>
                <th className="py-3 font-semibold">Amount</th>
                <th className="py-3 font-semibold">Status</th>
                <th className="py-3 font-semibold text-right">Invoice Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {myOrders.length > 0 ? (
                myOrders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 font-mono font-medium text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-amber-800" />
                        <span>{order.order_number}</span>
                      </div>
                    </td>
                    <td className="py-3.5 font-mono text-[11px] text-slate-500">
                      {order.transaction_id || `txn_${order.id.toString().padStart(6, "0")}`}
                    </td>
                    <td className="py-3.5 text-slate-600">
                      {order.paid_at
                        ? new Date(order.paid_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : order.created_at
                        ? new Date(order.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Just now"}
                    </td>
                    <td className="py-3.5">
                      <span className="font-bold text-slate-900 block">{order.package_name || "App Package"}</span>
                      {order.items && order.items.length > 1 && (
                        <span className="text-[10px] text-amber-900 font-semibold">
                          +{order.items.length - 1} Add-on(s)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 font-black text-slate-900 text-sm">
                      {order.total_formatted || `₹${Math.round((order.total_amount || 0) / 100).toLocaleString("en-IN")}`}
                    </td>
                    <td className="py-3.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                        {order.status === "paid" ? "Paid & Verified" : order.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <a
                          href={`/api/orders/${order.id}/invoice?download=1`}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={`Invoice-${order.order_number || order.id}.pdf`}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-800 font-bold text-xs hover:bg-slate-50 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          title="Download official PDF tax invoice"
                        >
                          <Printer className="w-3 h-3 text-slate-600" />
                          <span>Download Invoice</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => handleResendInvoice(order.id)}
                          disabled={resendingOrderId === order.id}
                          className="px-3 py-1.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                        >
                          {resendingOrderId === order.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Sending...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3 h-3" />
                              <span>Resend Email</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-semibold text-slate-700">No invoice records found for this application.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">When you purchase plans or add-ons for {selectedApp?.name || "this app"}, invoices will appear here.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Secure Payment Gateway Notice */}
      <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Payments are processed with 256-bit bank-grade encryption via Razorpay.</span>
        </div>
        <span className="font-semibold text-slate-500">PCI-DSS Compliant</span>
      </div>
    </div>
  );
}
