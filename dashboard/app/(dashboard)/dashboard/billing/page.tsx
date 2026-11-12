"use client";

import { useState, useRef, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  HelpCircle,
  Layers,
  Loader2,
  Mail,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
  Zap,
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

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending" | "failed" | "refunded">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "month" | "3months" | "6months" | "year">("all");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">("date_desc");

  // Modals state
  const [previewInvoiceOrder, setPreviewInvoiceOrder] = useState<any | null>(null);
  const [selectedTxnDetails, setSelectedTxnDetails] = useState<any | null>(null);

  const { data: userData } = useQuery({
    queryKey: ["auth-me"],
    queryFn: () => apiClient("/api/auth/me"),
  });
  const currentUser = userData?.user || userData;

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
        setInvoiceNotice(res.message || "Tax invoice notification dispatched successfully to your email!");
      } else {
        setInvoiceNotice("Invoice dispatch initiated. Please check your inbox and spam folder.");
      }
    } catch (e: any) {
      setInvoiceNotice(e.message || "Failed to dispatch email. Please try again.");
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
      if (isSwitchingPlanRef.current || switchingPlanId !== null) return;
      isSwitchingPlanRef.current = true;
      setSwitchingPlanId(planId);
      setSwitchMessage(null);

      await withSinglePaymentLock(async () => {
        try {
          const billingPeriod = isYearly ? "annual" : "one_time";

          const orderRes = await apiClient(`/api/apps/${activeSub.app.ulid}/payment/create-order`, {
            method: "POST",
            body: JSON.stringify({
              plan_id: planId,
              billing_period: billingPeriod,
            }),
          });

          if (orderRes?.success && orderRes?.order) {
            const orderData = orderRes.order;

            const paymentResponse = await openRazorpayModal({
              orderId: orderData.order_id,
              amount: orderData.amount,
              currency: orderData.currency || "INR",
              keyId: orderData.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_SnbtbVtFnRIrAI",
              name: "WebIntoApp",
              description: `${planName} Subscription Upgrade`,
              prefill: orderRes.prefill,
              themeColor: "#78593D",
            });

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
            await apiClient(`/api/apps/${activeSub.app.ulid}/subscribe`, {
              method: "POST",
              body: JSON.stringify({ plan_id: planId, billing_period: billingPeriod }),
            });
            setSwitchMessage(`Successfully switched plan to ${planName}!`);
          }

          await refetch();
          await refetchOrders();
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

  // Financial Metrics Calculation
  const paidOrders = useMemo(
    () => myOrders.filter((o: any) => o.status === "paid" || o.status === "completed"),
    [myOrders]
  );
  const pendingOrders = useMemo(
    () => myOrders.filter((o: any) => o.status === "pending" || o.status === "created"),
    [myOrders]
  );
  const failedOrders = useMemo(
    () => myOrders.filter((o: any) => o.status === "failed"),
    [myOrders]
  );
  const refundedOrders = useMemo(
    () => myOrders.filter((o: any) => o.status === "refunded"),
    [myOrders]
  );

  const totalPaidRupees = useMemo(() => {
    return paidOrders.reduce((acc: number, o: any) => {
      const val = typeof o.total_amount === "number" ? o.total_amount : 0;
      return acc + Math.round(val / 100);
    }, 0);
  }, [paidOrders]);

  const totalPendingRupees = useMemo(() => {
    return pendingOrders.reduce((acc: number, o: any) => {
      const val = typeof o.total_amount === "number" ? o.total_amount : 0;
      return acc + Math.round(val / 100);
    }, 0);
  }, [pendingOrders]);

  // Filtered & Sorted Orders for Transaction History
  const filteredOrders = useMemo(() => {
    let result = [...myOrders];

    // Status filter
    if (statusFilter === "paid") {
      result = result.filter((o) => o.status === "paid" || o.status === "completed");
    } else if (statusFilter === "pending") {
      result = result.filter((o) => o.status === "pending" || o.status === "created");
    } else if (statusFilter === "failed") {
      result = result.filter((o) => o.status === "failed");
    } else if (statusFilter === "refunded") {
      result = result.filter((o) => o.status === "refunded");
    }

    // Date filter
    const now = new Date();
    if (dateFilter === "month") {
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      result = result.filter((o) => new Date(o.paid_at || o.created_at) >= oneMonthAgo);
    } else if (dateFilter === "3months") {
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      result = result.filter((o) => new Date(o.paid_at || o.created_at) >= threeMonthsAgo);
    } else if (dateFilter === "6months") {
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      result = result.filter((o) => new Date(o.paid_at || o.created_at) >= sixMonthsAgo);
    } else if (dateFilter === "year") {
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      result = result.filter((o) => new Date(o.paid_at || o.created_at) >= oneYearAgo);
    }

    // Search term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter((o) => {
        const orderNum = (o.order_number || "").toLowerCase();
        const txnId = (o.transaction_id || "").toLowerCase();
        const pkgName = (o.package_name || "").toLowerCase();
        const appName = (o.app_name || o.app?.name || "").toLowerCase();
        return (
          orderNum.includes(q) ||
          txnId.includes(q) ||
          pkgName.includes(q) ||
          appName.includes(q)
        );
      });
    }

    // Sorting
    result.sort((a, b) => {
      const dateA = new Date(a.paid_at || a.created_at).getTime();
      const dateB = new Date(b.paid_at || b.created_at).getTime();
      const amountA = typeof a.total_amount === "number" ? a.total_amount : 0;
      const amountB = typeof b.total_amount === "number" ? b.total_amount : 0;

      if (sortBy === "date_asc") return dateA - dateB;
      if (sortBy === "date_desc") return dateB - dateA;
      if (sortBy === "amount_asc") return amountA - amountB;
      if (sortBy === "amount_desc") return amountB - amountA;
      return 0;
    });

    return result;
  }, [myOrders, statusFilter, dateFilter, searchTerm, sortBy]);

  if (isLoading) {
    return (
      <div className="min-h-[450px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#78593D]" />
          <span className="text-xs font-semibold text-[#7E756B]">Loading billing details...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-fadeIn">
      {/* ── 1. PAGE HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EBE6DF] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full bg-[#EFEAE2] text-[#78593D] border border-[#D6C8B8]">
              Billing &amp; Payments
            </span>
            <span className="text-xs text-[#A8A199]">&bull;</span>
            <span className="text-xs font-semibold text-[#7E756B]">
              Active Tier: {currentPlan.name}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1C1917] tracking-tight">
            Billing &amp; Invoices
          </h1>
          <p className="text-xs sm:text-sm text-[#7E756B] mt-1 max-w-2xl leading-relaxed">
            Manage your mobile app subscription tiers, inspect official GST tax invoices, and review verified transaction records.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link
            href="/dashboard/addons"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#EBE6DF] bg-white hover:bg-[#FAF7F2] text-[#1C1917] text-xs font-bold transition shadow-2xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#78593D]" />
            <span>Store &amp; Add-ons</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              refetch();
              refetchOrders();
            }}
            className="p-2.5 rounded-xl border border-[#EBE6DF] bg-white hover:bg-[#FAF7F2] text-[#78593D] transition shadow-2xs cursor-pointer"
            title="Refresh billing data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── 2. APPLICATION SELECTOR TOOLBAR (IF MULTIPLE APPS) ── */}
      {apps.length > 1 ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF] shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#78593D] text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#78593D] block">
                Filter by Application
              </span>
              <h2 className="text-sm font-bold text-[#1C1917]">
                Currently viewing financial ledger for:
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
              className="px-4 py-2.5 rounded-xl border border-[#EBE6DF] bg-white text-[#1C1917] text-xs font-bold shadow-2xs outline-none focus:ring-2 focus:ring-[#78593D]/20 cursor-pointer min-w-[220px]"
            >
              {apps.map((app: any) => (
                <option key={app.ulid} value={app.ulid}>
                  {app.name} ({app.platform === "woo" ? "WooCommerce" : "Shopify"} - {app.active_plan?.name || "Active"})
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
                <span className="text-[10px] font-black uppercase tracking-wider text-[#78593D] bg-[#EFEAE2] px-2 py-0.5 rounded-md border border-[#D6C8B8]">
                  Single Application
                </span>
                <span className="text-xs text-[#7E756B]">{selectedApp.site_url || selectedApp.website_url || ""}</span>
              </div>
              <h2 className="text-base font-bold text-[#1C1917] mt-0.5">{selectedApp.name}</h2>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
            {selectedApp.status || "active"}
          </span>
        </div>
      ) : null}

      {/* ── 3. FIVE OVERVIEW FINANCIAL KPI CARDS (Requirement 3) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Amount Spent */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EBE6DF] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7E756B] mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">
              Total Spent
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF7F2] text-[#78593D] flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-[#1C1917] tracking-tight block">
              ₹{totalPaidRupees.toLocaleString("en-IN")}
            </span>
            <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-1">
              <Check className="w-3 h-3" />
              Verified &amp; Paid
            </span>
          </div>
        </div>

        {/* Card 2: Total Transactions */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EBE6DF] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7E756B] mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">
              Total Transactions
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF7F2] text-[#78593D] flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-[#1C1917] tracking-tight block">
              {myOrders.length}
            </span>
            <span className="text-[10px] text-[#7E756B] block mt-1">
              {paidOrders.length} paid &bull; {pendingOrders.length} pending
            </span>
          </div>
        </div>

        {/* Card 3: Active Plan */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EBE6DF] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7E756B] mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">
              Active Tier
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-lg font-black text-[#78593D] truncate block">
              {currentPlan.name}
            </span>
            <span className="text-[10px] text-emerald-700 font-bold block mt-1">
              Active Subscription
            </span>
          </div>
        </div>

        {/* Card 4: Pending Payments */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EBE6DF] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7E756B] mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">
              Pending Orders
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-[#1C1917] tracking-tight block">
              {pendingOrders.length}
            </span>
            <span className="text-[10px] text-amber-700 font-bold block mt-1">
              {pendingOrders.length === 0 ? "All Cleared" : `₹${totalPendingRupees.toLocaleString("en-IN")} pending`}
            </span>
          </div>
        </div>

        {/* Card 5: Outstanding Amount */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EBE6DF] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7E756B] mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">
              Outstanding Due
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-[#1C1917] tracking-tight block">
              ₹0
            </span>
            <span className="text-[10px] text-emerald-700 font-bold block mt-1">
              Account in Good Standing
            </span>
          </div>
        </div>
      </div>

      {/* Switch Message Notice */}
      {switchMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-xs">
          <span>{switchMessage}</span>
          <button
            type="button"
            onClick={() => setSwitchMessage(null)}
            className="p-1 hover:opacity-70 text-emerald-800"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Invoice Dispatched Notice */}
      {invoiceNotice && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span>{invoiceNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setInvoiceNotice(null)}
            className="p-1 hover:opacity-70 text-amber-800"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── 4. TRANSACTION & INVOICE HISTORY SECTION (Requirement 4) ── */}
      <div className="bg-white border border-[#EBE6DF] rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#EBE6DF] gap-3">
          <div>
            <h3 className="font-black text-lg text-[#1C1917] tracking-tight">
              Transaction History &amp; Invoices
            </h3>
            <p className="text-xs text-[#7E756B] mt-0.5">
              Review payment confirmations, download official GST PDF invoices, or inspect gateway references.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#FAF7F2] text-[#78593D] border border-[#D6C8B8] self-start sm:self-auto">
            {filteredOrders.length} {filteredOrders.length === 1 ? "Record" : "Records"}
          </span>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#7E756B] absolute left-3 top-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by order #, txn ID, app..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#EBE6DF] bg-[#FAF7F2]/60 text-xs text-[#1C1917] placeholder:text-[#A8A199] outline-none focus:ring-2 focus:ring-[#78593D]/20 focus:bg-white transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-3 text-[#A8A199] hover:text-[#1C1917]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#EBE6DF] bg-white text-xs font-bold text-[#1C1917] outline-none focus:ring-2 focus:ring-[#78593D]/20 cursor-pointer shadow-2xs"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid &amp; Verified</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5">
            <select
              value={dateFilter}
              onChange={(e: any) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#EBE6DF] bg-white text-xs font-bold text-[#1C1917] outline-none focus:ring-2 focus:ring-[#78593D]/20 cursor-pointer shadow-2xs"
            >
              <option value="all">All Time</option>
              <option value="month">This Month</option>
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="year">This Year</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5">
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#EBE6DF] bg-white text-xs font-bold text-[#1C1917] outline-none focus:ring-2 focus:ring-[#78593D]/20 cursor-pointer shadow-2xs"
            >
              <option value="date_desc">Date: Newest First</option>
              <option value="date_asc">Date: Oldest First</option>
              <option value="amount_desc">Amount: High to Low</option>
              <option value="amount_asc">Amount: Low to High</option>
            </select>
          </div>
        </div>

        {/* Transaction History Table */}
        <div className="overflow-x-auto rounded-2xl border border-[#EBE6DF]">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead>
              <tr className="text-[#7E756B] bg-[#FAF7F2] uppercase tracking-wider text-[10px] font-black border-b border-[#EBE6DF]">
                <th className="py-3 px-4">Order / Invoice ID</th>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Target Application</th>
                <th className="py-3 px-4">Plan / Items</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBE6DF] text-[#1C1917]">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order: any) => {
                  const isPaid = order.status === "paid" || order.status === "completed";
                  const isPending = order.status === "pending" || order.status === "created";
                  const isFailed = order.status === "failed";
                  const isRefunded = order.status === "refunded";

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-[#FAF7F2]/60 transition cursor-pointer"
                      onClick={() => setSelectedTxnDetails(order)}
                    >
                      {/* Order Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#78593D]">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-[#78593D]" />
                          <span>{order.order_number}</span>
                        </div>
                      </td>

                      {/* Transaction ID */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#7E756B]">
                        {order.transaction_id || `txn_${order.id.toString().padStart(6, "0")}`}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-[#57514B]">
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
                          : "Recent"}
                      </td>

                      {/* Target App */}
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-[#1C1917] block truncate max-w-[140px]">
                          {order.app_name || order.app?.name || selectedApp?.name || "Web Application"}
                        </span>
                        <span className="text-[10px] text-[#7E756B] block">
                          {order.package_name || "App Package"}
                        </span>
                      </td>

                      {/* Plan / Items */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[#1C1917] block">
                          {order.package_name || "App Package"}
                        </span>
                        {order.items && order.items.length > 1 && (
                          <span className="text-[10px] text-[#78593D] font-bold block">
                            +{order.items.length - 1} Add-on Module(s)
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 font-mono font-black text-[#1C1917] text-sm">
                        {order.total_formatted ||
                          `₹${Math.round((order.total_amount || 0) / 100).toLocaleString("en-IN")}`}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-300">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Paid</span>
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Pending</span>
                          </span>
                        ) : isFailed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 text-[10px] font-black uppercase tracking-wider border border-rose-300">
                            <X className="w-3 h-3 text-rose-600" />
                            <span>Failed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 text-[10px] font-black uppercase tracking-wider border border-purple-300">
                            <span>{order.status}</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewInvoiceOrder(order)}
                            className="p-1.5 rounded-xl border border-[#EBE6DF] hover:border-[#78593D]/40 bg-white hover:bg-[#FAF7F2] text-[#78593D] transition shadow-2xs cursor-pointer"
                            title="Preview Invoice"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <a
                            href={`/api/orders/${order.id}/invoice?download=1`}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={`Invoice-${order.order_number || order.id}.pdf`}
                            className="p-1.5 rounded-xl border border-[#EBE6DF] hover:border-[#78593D]/40 bg-white hover:bg-[#FAF7F2] text-[#1C1917] transition shadow-2xs cursor-pointer"
                            title="Download official PDF tax invoice"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleResendInvoice(order.id)}
                            disabled={resendingOrderId === order.id}
                            className="p-1.5 rounded-xl border border-[#EBE6DF] hover:border-[#78593D]/40 bg-white hover:bg-[#FAF7F2] text-[#57514B] hover:text-[#1C1917] transition shadow-2xs cursor-pointer disabled:opacity-50"
                            title="Resend email invoice"
                          >
                            {resendingOrderId === order.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#78593D]" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#7E756B]">
                    <Receipt className="w-8 h-8 mx-auto text-[#A8A199] mb-2" />
                    <p className="text-xs font-black text-[#1C1917]">
                      No transaction or invoice records found
                    </p>
                    <p className="text-[11px] text-[#7E756B] mt-0.5 max-w-sm mx-auto">
                      {searchTerm || statusFilter !== "all" || dateFilter !== "all"
                        ? "No orders match your selected filters. Try resetting the search or filter options."
                        : `When you purchase plans or add-ons for ${selectedApp?.name || "your app"}, invoices will appear here.`}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. PLAN SUBSCRIPTION & UPGRADE SECTION ── */}
      <div className="bg-white border border-[#EBE6DF] rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#EBE6DF] gap-3">
          <div>
            <h3 className="font-black text-lg text-[#1C1917] tracking-tight">
              Subscription Tiers &amp; Upgrades
            </h3>
            <p className="text-xs text-[#7E756B] mt-0.5">
              Switch plans to unlock iOS builds, White Labeling, Priority Support, and Enterprise integrations.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto bg-[#FAF7F2] p-1 rounded-xl border border-[#EBE6DF]">
            <button
              type="button"
              onClick={() => setIsYearly(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                !isYearly ? "bg-white text-[#1C1917] shadow-2xs" : "text-[#7E756B]"
              }`}
            >
              Lifetime One-Time
            </button>
            <button
              type="button"
              onClick={() => setIsYearly(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                isYearly ? "bg-white text-[#1C1917] shadow-2xs" : "text-[#7E756B]"
              }`}
            >
              Annual Billing
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((p: any) => {
            const isCurrent = currentPlan.id === p.id;
            const price = Math.round((p.price_monthly || 499900) / 100);

            return (
              <div
                key={p.id}
                className={`p-5 rounded-2xl border transition flex flex-col justify-between ${
                  isCurrent
                    ? "bg-[#FAF7F2] border-[#78593D] ring-2 ring-[#78593D]/20 shadow-xs"
                    : "bg-white border-[#EBE6DF] hover:border-[#78593D]/30 shadow-2xs"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-black text-[#1C1917]">{p.name}</h4>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                        Active Tier
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1 my-3">
                    <span className="text-2xl font-black text-[#78593D]">
                      ₹{price.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] text-[#7E756B]">/ lifetime</span>
                  </div>

                  <div className="space-y-2 text-xs text-[#57514B] pt-3 border-t border-[#EBE6DF]">
                    {p.id === 1 ? (
                      <>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>Android APK &amp; Web App Converter</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>Standard Mobile UI Theme</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>Basic Push Notifications</span>
                        </div>
                      </>
                    ) : p.id === 2 ? (
                      <>
                        <div className="flex items-center gap-2 font-bold text-[#1C1917]">
                          <Check className="w-3.5 h-3.5 text-[#78593D] flex-shrink-0" />
                          <span>Both Android &amp; iOS Apps</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>All Curated Premium Themes</span>
                        </div>
                        <div className="flex items-center gap-2 font-bold text-[#1C1917]">
                          <Check className="w-3.5 h-3.5 text-[#78593D] flex-shrink-0" />
                          <span>Dedicated Admin Panel Included</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>WhatsApp &amp; Live Chat Support</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 font-bold text-[#1C1917]">
                          <Check className="w-3.5 h-3.5 text-[#78593D] flex-shrink-0" />
                          <span>Complete Android &amp; iOS Suite</span>
                        </div>
                        <div className="flex items-center gap-2 font-bold text-[#1C1917]">
                          <Check className="w-3.5 h-3.5 text-[#78593D] flex-shrink-0" />
                          <span>All Premium Add-ons Included</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>Priority App Store Publishing</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>Custom ERP &amp; API Integration</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isCurrent || switchingPlanId !== null}
                  onClick={() => handleSwitchPlan(p.id, p.name)}
                  className={`mt-5 w-full py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
                    isCurrent
                      ? "bg-[#EFEAE2] text-[#78593D] cursor-default font-black"
                      : switchingPlanId !== null
                      ? "bg-[#78593D]/50 text-white cursor-not-allowed"
                      : "bg-[#78593D] hover:bg-[#634932] text-white shadow-xs"
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
                    <span>Upgrade to {p.name}</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 6. SECURE PAYMENT GATEWAY NOTICE ── */}
      <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF] text-xs text-[#7E756B] flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>All payments are encrypted and securely processed via Razorpay. PCI-DSS Level 1 Compliant.</span>
        </div>
        <span className="font-mono text-[11px] text-[#A8A199]">Instant Licensing Engine</span>
      </div>

      {/* ── 7. INVOICE PREVIEW MODAL ── */}
      {previewInvoiceOrder && (
        <div
          className="fixed inset-0 z-[99999] w-screen h-screen bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setPreviewInvoiceOrder(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-[#EBE6DF] overflow-hidden my-auto animate-fadeIn relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#FAF7F2] p-6 border-b border-[#EBE6DF] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#78593D] block">
                  Official Tax Invoice
                </span>
                <h3 className="text-lg font-black text-[#1C1917] mt-0.5">
                  Invoice {previewInvoiceOrder.order_number}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewInvoiceOrder(null)}
                className="p-2 rounded-xl text-[#7E756B] hover:text-[#1C1917] hover:bg-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Invoice Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Seller & Customer Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-[#EBE6DF]">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#7E756B] block">
                    Issued By:
                  </span>
                  <strong className="text-xs font-black text-[#1C1917] block mt-1">
                    WebIntoApp Technologies Pvt. Ltd.
                  </strong>
                  <p className="text-[11px] text-[#7E756B] mt-0.5 leading-relaxed">
                    Website to Mobile App Conversion Platform<br />
                    GSTIN: 07AAACW1234F1Z5 &bull; CIN: U72900DL2024PTC123456
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#7E756B] block">
                    Billed To:
                  </span>
                  <strong className="text-xs font-black text-[#1C1917] block mt-1">
                    {previewInvoiceOrder.customer_name || currentUser?.name || "Valued Customer"}
                  </strong>
                  <p className="text-[11px] text-[#7E756B] mt-0.5">
                    {previewInvoiceOrder.customer_email || currentUser?.email || "customer@webintoapp.com"}
                  </p>
                  <p className="text-[10px] text-[#78593D] font-mono mt-1 font-bold">
                    App: {previewInvoiceOrder.app_name || selectedApp?.name || "Mobile App"}
                  </p>
                </div>
              </div>

              {/* Invoice Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF] text-xs">
                <div>
                  <span className="text-[9px] uppercase font-bold text-[#7E756B] block">Invoice Date</span>
                  <span className="font-bold text-[#1C1917]">
                    {previewInvoiceOrder.paid_at
                      ? new Date(previewInvoiceOrder.paid_at).toLocaleDateString("en-IN")
                      : new Date(previewInvoiceOrder.created_at).toLocaleDateString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-[#7E756B] block">Status</span>
                  <span className="font-black text-emerald-700 uppercase text-[10px]">
                    {previewInvoiceOrder.status}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-[#7E756B] block">Payment Gateway</span>
                  <span className="font-bold text-[#1C1917]">Razorpay</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-[#7E756B] block">Txn Reference</span>
                  <span className="font-mono text-[10px] text-[#78593D] font-bold truncate block">
                    {previewInvoiceOrder.transaction_id || `txn_${previewInvoiceOrder.id}`}
                  </span>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="border border-[#EBE6DF] rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#FAF7F2] text-[#7E756B] text-[10px] font-black uppercase tracking-wider border-b border-[#EBE6DF]">
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Tax (18% GST)</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBE6DF] text-[#1C1917]">
                    {Array.isArray(previewInvoiceOrder.items) && previewInvoiceOrder.items.length > 0 ? (
                      previewInvoiceOrder.items.map((item: any, idx: number) => {
                        const price = typeof item.price === "number" ? item.price : item.amount || 0;
                        const sub = Math.round(price / 100);
                        const tax = Math.round(sub * 0.18);
                        return (
                          <tr key={idx}>
                            <td className="py-3 px-3">
                              <span className="font-bold block">{item.name || item.title || "Module License"}</span>
                              <span className="text-[10px] text-[#7E756B]">
                                Lifetime License &bull; {item.item_type || "Module"}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center font-mono">1</td>
                            <td className="py-3 px-3 text-right font-mono">₹{sub.toLocaleString("en-IN")}</td>
                            <td className="py-3 px-3 text-right font-mono text-[#7E756B]">Included</td>
                            <td className="py-3 px-3 text-right font-mono font-bold">₹{sub.toLocaleString("en-IN")}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="py-3 px-3">
                          <span className="font-bold block">{previewInvoiceOrder.package_name || "App Package"}</span>
                          <span className="text-[10px] text-[#7E756B]">Lifetime Application License</span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono">1</td>
                        <td className="py-3 px-3 text-right font-mono">
                          {previewInvoiceOrder.total_formatted ||
                            `₹${Math.round((previewInvoiceOrder.total_amount || 0) / 100).toLocaleString("en-IN")}`}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[#7E756B]">Included</td>
                        <td className="py-3 px-3 text-right font-mono font-bold">
                          {previewInvoiceOrder.total_formatted ||
                            `₹${Math.round((previewInvoiceOrder.total_amount || 0) / 100).toLocaleString("en-IN")}`}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals */}
              <div className="flex justify-end">
                <div className="w-full sm:w-64 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[#7E756B]">
                    <span>Subtotal:</span>
                    <span className="font-mono font-bold text-[#1C1917]">
                      {previewInvoiceOrder.total_formatted ||
                        `₹${Math.round((previewInvoiceOrder.total_amount || 0) / 100).toLocaleString("en-IN")}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#7E756B]">
                    <span>GST (Integrated 18%):</span>
                    <span className="font-mono text-emerald-700 font-bold">Included</span>
                  </div>
                  <div className="pt-2 border-t border-[#EBE6DF] flex items-center justify-between font-black text-sm">
                    <span className="text-[#1C1917]">Total Paid:</span>
                    <span className="text-[#78593D] font-mono text-base">
                      {previewInvoiceOrder.total_formatted ||
                        `₹${Math.round((previewInvoiceOrder.total_amount || 0) / 100).toLocaleString("en-IN")}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 sm:p-5 bg-[#FAF7F2] border-t border-[#EBE6DF] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPreviewInvoiceOrder(null)}
                className="px-4 py-2.5 rounded-xl border border-[#EBE6DF] font-bold text-xs text-[#57514B] hover:bg-white transition cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <a
                  href={`/api/orders/${previewInvoiceOrder.id}/invoice?download=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={`Invoice-${previewInvoiceOrder.order_number || previewInvoiceOrder.id}.pdf`}
                  className="px-5 py-2.5 rounded-xl bg-[#78593D] hover:bg-[#634932] text-white font-bold text-xs transition flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF Invoice</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. TRANSACTION DETAILS MODAL ── */}
      {selectedTxnDetails && (
        <div
          className="fixed inset-0 z-[99999] w-screen h-screen bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setSelectedTxnDetails(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-[#EBE6DF] overflow-hidden my-auto animate-fadeIn relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#FAF7F2] p-5 sm:p-6 border-b border-[#EBE6DF] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#78593D] block">
                  Transaction Metadata
                </span>
                <h3 className="text-base sm:text-lg font-black text-[#1C1917] mt-0.5">
                  Reference: {selectedTxnDetails.order_number}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTxnDetails(null)}
                className="p-2 rounded-xl text-[#7E756B] hover:text-[#1C1917] hover:bg-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              <div className="space-y-2 p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF]">
                <div className="flex justify-between">
                  <span className="text-[#7E756B]">Order ID:</span>
                  <span className="font-mono font-bold text-[#1C1917]">#{selectedTxnDetails.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7E756B]">Order Number:</span>
                  <span className="font-mono font-bold text-[#78593D]">{selectedTxnDetails.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7E756B]">Gateway Transaction:</span>
                  <span className="font-mono text-[#1C1917]">{selectedTxnDetails.transaction_id || `txn_${selectedTxnDetails.id}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7E756B]">Gateway Order ID:</span>
                  <span className="font-mono text-[#7E756B]">{selectedTxnDetails.gateway_order_id || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7E756B]">Amount:</span>
                  <span className="font-mono font-black text-[#1C1917] text-sm">
                    {selectedTxnDetails.total_formatted ||
                      `₹${Math.round((selectedTxnDetails.total_amount || 0) / 100).toLocaleString("en-IN")}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7E756B]">Status:</span>
                  <span className="font-black text-emerald-700 uppercase">{selectedTxnDetails.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7E756B]">Date Paid:</span>
                  <span className="text-[#1C1917]">
                    {selectedTxnDetails.paid_at
                      ? new Date(selectedTxnDetails.paid_at).toLocaleString("en-IN")
                      : selectedTxnDetails.created_at
                      ? new Date(selectedTxnDetails.created_at).toLocaleString("en-IN")
                      : "Recent"}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#EBE6DF] flex items-center justify-between">
                <span className="text-[#7E756B]">Target Application:</span>
                <strong className="text-[#1C1917] font-bold">
                  {selectedTxnDetails.app_name || selectedApp?.name || "Application"}
                </strong>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const o = selectedTxnDetails;
                    setSelectedTxnDetails(null);
                    setPreviewInvoiceOrder(o);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-[#EBE6DF] bg-white hover:bg-[#FAF7F2] text-[#78593D] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Full Invoice</span>
                </button>
                <a
                  href={`/api/orders/${selectedTxnDetails.id}/invoice?download=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={`Invoice-${selectedTxnDetails.order_number || selectedTxnDetails.id}.pdf`}
                  className="flex-1 py-2.5 rounded-xl bg-[#78593D] hover:bg-[#634932] text-white font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
