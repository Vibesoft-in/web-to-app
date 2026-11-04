"use client";

import { useState, useMemo } from "react";
import {
  Ticket,
  Plus,
  Search,
  Copy,
  Check,
  Trash2,
  Calendar,
  Percent,
  DollarSign,
  AlertCircle,
  Tag,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  X,
  Clock,
  ArrowRight,
  Truck,
  Ban,
  User,
  HelpCircle,
  Layers,
  Coins,
} from "lucide-react";

export interface CouponItem {
  id: string | number;
  code: string;
  amount: string | number;
  discount_type: "percent" | "fixed_cart" | "fixed_product" | string;
  description?: string;
  expiry_date?: string | null;
  usage_count?: number;
  free_shipping?: boolean;
  apply_as_cashback?: boolean;
  minimum_amount?: string | number | null;
  maximum_amount?: string | number | null;
  individual_use?: boolean;
  exclude_sale_items?: boolean;
  usage_limit?: number | null;
  usage_limit_per_user?: number | null;
  store_synced?: boolean;
}

interface CouponsViewProps {
  rawCoupons: CouponItem[];
  currencySymbol: string;
  storeDomain: string;
  onSaveCoupon: (data: {
    code: string;
    discount_type: string;
    amount: number | string;
    description?: string;
    expiry_date?: string;
    free_shipping?: boolean;
    apply_as_cashback?: boolean;
    minimum_amount?: number | string;
    maximum_amount?: number | string;
    individual_use?: boolean;
    exclude_sale_items?: boolean;
    usage_limit?: number | string;
    usage_limit_per_user?: number | string;
  }) => Promise<void>;
  onDeleteCoupon: (couponId: string | number) => Promise<void>;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  isSaving?: boolean;
  isDeleting?: boolean;
}

function FieldHelpTooltip({ text }: { text: string }) {
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold cursor-help ml-1.5 transition hover:bg-slate-300 dark:hover:bg-slate-600 flex-shrink-0"
      title={text}
      aria-label={text}
    >
      ?
    </span>
  );
}

export function CouponsView({
  rawCoupons,
  currencySymbol,
  storeDomain,
  onSaveCoupon,
  onDeleteCoupon,
  showToast,
  isSaving = false,
  isDeleting = false,
}: CouponsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "percent" | "fixed">("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | number | null>(null);

  // Modal active tab: matches WooCommerce coupon panels (General | Usage restriction | Usage limits)
  const [activeModalTab, setActiveModalTab] = useState<"general" | "usage_restriction" | "usage_limits">("general");

  // Form State
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discount_type: "fixed_cart", // Default: Fixed cart discount (matches Image 1)
    amount: "0",
    free_shipping: false,
    expiry_date: "",
    apply_as_cashback: false,
    minimum_amount: "",
    maximum_amount: "",
    individual_use: false,
    exclude_sale_items: false,
    usage_limit: "",
    usage_limit_per_user: "",
  });

  const handleCopy = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      showToast(`Coupon code "${code}" copied to clipboard!`, "success");
      setTimeout(() => setCopiedCode(null), 2500);
    }
  };

  const handleOpenCreateModal = () => {
    setFormData({
      code: "",
      description: "",
      discount_type: "fixed_cart",
      amount: "0",
      free_shipping: false,
      expiry_date: "",
      apply_as_cashback: false,
      minimum_amount: "",
      maximum_amount: "",
      individual_use: false,
      exclude_sale_items: false,
      usage_limit: "",
      usage_limit_per_user: "",
    });
    setActiveModalTab("general");
    setIsCreateModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      showToast("Please enter a coupon code.", "error");
      setActiveModalTab("general");
      return;
    }
    const numAmount = parseFloat(formData.amount);
    if (isNaN(numAmount) || numAmount < 0) {
      showToast("Please enter a valid coupon amount (0 or greater).", "error");
      setActiveModalTab("general");
      return;
    }

    try {
      await onSaveCoupon({
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim() || undefined,
        discount_type: formData.discount_type,
        amount: numAmount,
        free_shipping: formData.free_shipping,
        expiry_date: formData.expiry_date || undefined,
        apply_as_cashback: formData.apply_as_cashback,
        minimum_amount: formData.minimum_amount ? parseFloat(formData.minimum_amount) : undefined,
        maximum_amount: formData.maximum_amount ? parseFloat(formData.maximum_amount) : undefined,
        individual_use: formData.individual_use,
        exclude_sale_items: formData.exclude_sale_items,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit, 10) : undefined,
        usage_limit_per_user: formData.usage_limit_per_user ? parseInt(formData.usage_limit_per_user, 10) : undefined,
      });
      setIsCreateModalOpen(false);
    } catch {
      // Toast already shown by mutation onError
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await onDeleteCoupon(id);
      setDeleteConfirmId(null);
    } catch {
      // Handled
    }
  };

  // Filtered coupons
  const filteredCoupons = useMemo(() => {
    return rawCoupons.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (c.code || "").toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q);

      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "percent" && c.discount_type === "percent") ||
        (typeFilter === "fixed" && (c.discount_type === "fixed_cart" || c.discount_type === "fixed_product"));

      return matchesSearch && matchesType;
    });
  }, [rawCoupons, searchQuery, typeFilter]);

  // Derived stats
  const stats = useMemo(() => {
    const total = rawCoupons.length;
    const percentCount = rawCoupons.filter((c) => c.discount_type === "percent").length;
    const fixedCount = rawCoupons.filter((c) => c.discount_type === "fixed_cart" || c.discount_type === "fixed_product").length;
    const totalUses = rawCoupons.reduce((sum, c) => sum + (c.usage_count || 0), 0);
    return { total, percentCount, fixedCount, totalUses };
  }, [rawCoupons]);

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--mav-muted)] mb-1">
            <span>Marketing</span>
            <span>/</span>
            <span className="text-[var(--mav-text)]">Coupons &amp; Deals</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--mav-text)] flex items-center gap-2.5">
            <span>Store Coupons</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--mav-primary)]/10 text-[var(--mav-primary)] font-bold">
              {rawCoupons.length} Active
            </span>
          </h2>
          <p className="text-xs text-[var(--mav-muted)] mt-1">
            Create promotional discount codes synchronized live to your WooCommerce store ({storeDomain}) and mobile apps.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--mav-primary)] text-[var(--mav-on-primary)] font-bold text-xs shadow-md shadow-[var(--mav-primary)]/20 hover:brightness-105 active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create Coupon</span>
          </button>
        </div>
      </div>

      {/* ── Metrics Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[var(--mav-surface)] border border-[var(--mav-line)]">
          <span className="text-[11px] font-bold text-[var(--mav-muted)] uppercase tracking-wider block">
            Total Coupons
          </span>
          <div className="text-2xl font-black mt-1 text-[var(--mav-text)]">{stats.total}</div>
          <span className="text-[10px] text-[var(--mav-muted)] mt-0.5 block">Configured for mobile</span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--mav-surface)] border border-[var(--mav-line)]">
          <span className="text-[11px] font-bold text-[var(--mav-muted)] uppercase tracking-wider block">
            Percentage Discounts
          </span>
          <div className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
            {stats.percentCount}
          </div>
          <span className="text-[10px] text-[var(--mav-muted)] mt-0.5 block">% Off Cart Value</span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--mav-surface)] border border-[var(--mav-line)]">
          <span className="text-[11px] font-bold text-[var(--mav-muted)] uppercase tracking-wider block">
            Fixed Amount Off
          </span>
          <div className="text-2xl font-black mt-1 text-indigo-600 dark:text-indigo-400">
            {stats.fixedCount}
          </div>
          <span className="text-[10px] text-[var(--mav-muted)] mt-0.5 block">{currencySymbol} Flat Cart Rebates</span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--mav-surface)] border border-[var(--mav-line)]">
          <span className="text-[11px] font-bold text-[var(--mav-muted)] uppercase tracking-wider block">
            Customer Redemptions
          </span>
          <div className="text-2xl font-black mt-1 text-amber-600 dark:text-amber-400">
            {stats.totalUses}
          </div>
          <span className="text-[10px] text-[var(--mav-muted)] mt-0.5 block">Total App Orders Applied</span>
        </div>
      </div>

      {/* ── Filter / Search Bar ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--mav-surface)] border border-[var(--mav-line)]">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--mav-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search coupons by code or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-xl bg-[var(--mav-surface-2)] text-xs text-[var(--mav-text)] placeholder-[var(--mav-muted)] border-none focus:outline-none focus:ring-1 focus:ring-[var(--mav-primary)]"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setTypeFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              typeFilter === "all"
                ? "bg-[var(--mav-primary)] text-[var(--mav-on-primary)] shadow-xs"
                : "text-[var(--mav-muted)] hover:text-[var(--mav-text)] hover:bg-[var(--mav-surface-2)]"
            }`}
          >
            All Types ({rawCoupons.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("percent")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              typeFilter === "percent"
                ? "bg-[var(--mav-primary)] text-[var(--mav-on-primary)] shadow-xs"
                : "text-[var(--mav-muted)] hover:text-[var(--mav-text)] hover:bg-[var(--mav-surface-2)]"
            }`}
          >
            Percentage
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("fixed")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              typeFilter === "fixed"
                ? "bg-[var(--mav-primary)] text-[var(--mav-on-primary)] shadow-xs"
                : "text-[var(--mav-muted)] hover:text-[var(--mav-text)] hover:bg-[var(--mav-surface-2)]"
            }`}
          >
            Fixed Discount
          </button>
        </div>
      </div>

      {/* ── Coupons Grid ──────────────────────────────────────────────────── */}
      {filteredCoupons.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[var(--mav-surface)] border border-dashed border-[var(--mav-line)] text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--mav-surface-2)] text-[var(--mav-muted)] mx-auto flex items-center justify-center">
            <Ticket className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-[var(--mav-text)]">No promotional coupons found</h3>
          <p className="text-xs text-[var(--mav-muted)] max-w-sm mx-auto">
            {searchQuery
              ? `No coupons match "${searchQuery}". Try a different keyword or clear your filter.`
              : "Create your first discount coupon to incentivize shoppers and boost app conversions."}
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--mav-primary)] text-[var(--mav-on-primary)] text-xs font-bold shadow hover:brightness-105 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Coupon</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCoupons.map((coupon) => {
            const isPercent = coupon.discount_type === "percent";
            const discountLabel = isPercent
              ? `${coupon.amount}% OFF`
              : `${currencySymbol}${coupon.amount} OFF`;
            const isDeletingThis = isDeleting && deleteConfirmId === coupon.id;
            const isCopied = copiedCode === coupon.code;

            return (
              <div
                key={coupon.id}
                className="relative p-5 rounded-3xl bg-[var(--mav-surface)] border border-[var(--mav-line)] shadow-xs hover:shadow-md transition flex flex-col justify-between group overflow-hidden"
              >
                {/* Top: Header Badges & Delete */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isPercent
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                        }`}
                      >
                        {isPercent ? <Percent className="w-2.5 h-2.5" /> : <DollarSign className="w-2.5 h-2.5" />}
                        <span>
                          {coupon.discount_type === "fixed_cart"
                            ? "Fixed Cart"
                            : coupon.discount_type === "fixed_product"
                            ? "Fixed Product"
                            : "Percentage"}
                        </span>
                      </span>

                      {coupon.store_synced && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                          <Check className="w-2.5 h-2.5" />
                          <span>WooCommerce</span>
                        </span>
                      )}

                      {coupon.free_shipping && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20" title="Grants Free Shipping">
                          <Truck className="w-2.5 h-2.5" />
                          <span>Free Shipping</span>
                        </span>
                      )}

                      {coupon.apply_as_cashback && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20" title="Applied as Cashback">
                          <Coins className="w-2.5 h-2.5" />
                          <span>Cashback</span>
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(coupon.id)}
                      className="p-1.5 rounded-lg text-[var(--mav-muted)] hover:text-red-600 hover:bg-red-500/10 transition opacity-60 group-hover:opacity-100"
                      title="Delete coupon"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Main Value Banner */}
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-black tracking-tight text-[var(--mav-text)]">
                      {discountLabel}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-[var(--mav-muted)] line-clamp-2 min-h-[32px]">
                    {coupon.description || "Applicable on eligible store orders in mobile app."}
                  </p>
                </div>

                {/* Middle: Code Pill with 1-Click Copy */}
                <div className="my-4 pt-3 border-t border-dashed border-[var(--mav-line)]">
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)]">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Ticket className="w-4 h-4 text-[var(--mav-primary)] shrink-0" />
                      <span className="font-mono font-black text-sm tracking-widest text-[var(--mav-text)] truncate">
                        {coupon.code}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(coupon.code)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition shrink-0 cursor-pointer ${
                        isCopied
                          ? "bg-emerald-600 text-white"
                          : "bg-[var(--mav-surface)] hover:bg-[var(--mav-primary)] hover:text-[var(--mav-on-primary)] text-[var(--mav-text)] border border-[var(--mav-line)]"
                      }`}
                    >
                      {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>

                  {/* Rules summary badges if set */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    {coupon.minimum_amount && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-[var(--mav-muted)]">
                        Min spend: {currencySymbol}{coupon.minimum_amount}
                      </span>
                    )}
                    {coupon.maximum_amount && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-[var(--mav-muted)]">
                        Max spend: {currencySymbol}{coupon.maximum_amount}
                      </span>
                    )}
                    {coupon.individual_use && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-[var(--mav-muted)]">
                        Solo use only
                      </span>
                    )}
                    {coupon.exclude_sale_items && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-[var(--mav-muted)]">
                        Excludes sale items
                      </span>
                    )}
                    {coupon.usage_limit && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-[var(--mav-muted)]">
                        Limit: {coupon.usage_limit}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Metadata: Expiry & Usage */}
                <div className="flex items-center justify-between text-[11px] text-[var(--mav-muted)] pt-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {coupon.expiry_date
                        ? `Expires: ${coupon.expiry_date}`
                        : "Never Expires"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 font-semibold">
                    <span>{coupon.usage_count || 0} uses</span>
                  </div>
                </div>

                {/* Inline Delete Confirmation Dialog */}
                {deleteConfirmId === coupon.id && (
                  <div className="absolute inset-0 bg-[var(--mav-surface)]/95 backdrop-blur-sm p-5 flex flex-col justify-center items-center text-center space-y-3 z-10 transition">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-[var(--mav-text)]">
                        Delete coupon {coupon.code}?
                      </h4>
                      <p className="text-[11px] text-[var(--mav-muted)] max-w-xs mt-0.5">
                        This coupon code will immediately become invalid for all mobile app shoppers.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(coupon.id)}
                        disabled={isDeletingThis}
                        className="px-4 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold shadow hover:bg-red-700 transition"
                      >
                        {isDeletingThis ? "Deleting..." : "Yes, Delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-3 py-1.5 rounded-xl border border-[var(--mav-line)] text-xs font-semibold hover:bg-[var(--mav-surface-2)]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create Coupon Modal (Matches WooCommerce coupon fields) ─────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-[var(--mav-surface)] border border-[var(--mav-line)] shadow-2xl p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-150 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Title */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--mav-line)]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[var(--mav-primary)]/10 text-[var(--mav-primary)] flex items-center justify-center">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base tracking-tight text-[var(--mav-text)]">
                    Create New Coupon
                  </h3>
                  <p className="text-xs text-[var(--mav-muted)]">
                    Syncs in real-time to {storeDomain} and customer mobile devices
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-xl text-[var(--mav-muted)] hover:text-[var(--mav-text)] hover:bg-[var(--mav-surface-2)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Top: Coupon Code & Description (Standard WooCommerce fields) */}
              <div className="space-y-3 p-4 rounded-2xl bg-[var(--mav-surface-2)]/60 border border-[var(--mav-line)]">
                <div>
                  <label className="text-xs font-bold block mb-1 text-[var(--mav-text)]">
                    Coupon code *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="e.g. FESTIVE20 or WELCOME50"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          code: e.target.value.toUpperCase().replace(/\s+/g, ""),
                        })
                      }
                      className="w-full h-11 px-3 rounded-xl bg-[var(--mav-surface)] border border-[var(--mav-line)] text-sm font-mono font-bold tracking-wider text-[var(--mav-text)] focus:outline-none focus:border-[var(--mav-primary)]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--mav-muted)] font-mono">
                      AUTO-UPPERCASE
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1 text-[var(--mav-text)]">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Flat ₹200 off on first mobile purchase"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-[var(--mav-surface)] border border-[var(--mav-line)] text-xs text-[var(--mav-text)] focus:outline-none focus:border-[var(--mav-primary)]"
                  />
                </div>
              </div>

              {/* ── Tabs Bar (General | Usage restriction | Usage limits) ── */}
              <div className="flex border-b border-[var(--mav-line)] gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveModalTab("general")}
                  className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                    activeModalTab === "general"
                      ? "border-[var(--mav-primary)] text-[var(--mav-primary)]"
                      : "border-transparent text-[var(--mav-muted)] hover:text-[var(--mav-text)]"
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>General</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModalTab("usage_restriction")}
                  className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                    activeModalTab === "usage_restriction"
                      ? "border-[var(--mav-primary)] text-[var(--mav-primary)]"
                      : "border-transparent text-[var(--mav-muted)] hover:text-[var(--mav-text)]"
                  }`}
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Usage restriction</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModalTab("usage_limits")}
                  className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                    activeModalTab === "usage_limits"
                      ? "border-[var(--mav-primary)] text-[var(--mav-primary)]"
                      : "border-transparent text-[var(--mav-muted)] hover:text-[var(--mav-text)]"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Usage limits</span>
                </button>
              </div>

              {/* ── TAB 1: GENERAL (Image 1) ──────────────────────────────── */}
              {activeModalTab === "general" && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  {/* Discount type */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center">
                    <label className="text-xs font-bold text-[var(--mav-text)]">
                      Discount type
                    </label>
                    <div className="sm:col-span-2">
                      <select
                        value={formData.discount_type}
                        onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-xs text-[var(--mav-text)] focus:outline-none focus:border-[var(--mav-primary)]"
                      >
                        <option value="fixed_cart">Fixed cart discount</option>
                        <option value="percent">Percentage discount</option>
                        <option value="fixed_product">Fixed product discount</option>
                      </select>
                    </div>
                  </div>

                  {/* Coupon amount */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center">
                    <label className="text-xs font-bold text-[var(--mav-text)] flex items-center">
                      <span>Coupon amount</span>
                      <FieldHelpTooltip text="Value of the coupon." />
                    </label>
                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-xs text-[var(--mav-text)] focus:outline-none focus:border-[var(--mav-primary)]"
                      />
                    </div>
                  </div>

                  {/* Allow free shipping */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start pt-1">
                    <label className="text-xs font-bold text-[var(--mav-text)] pt-0.5">
                      Allow free shipping
                    </label>
                    <div className="sm:col-span-2 flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id="chk_free_shipping"
                        checked={formData.free_shipping}
                        onChange={(e) => setFormData({ ...formData, free_shipping: e.target.checked })}
                        className="mt-1 w-4 h-4 rounded border-[var(--mav-line)] text-[var(--mav-primary)] focus:ring-[var(--mav-primary)] cursor-pointer"
                      />
                      <label htmlFor="chk_free_shipping" className="text-xs text-[var(--mav-muted)] leading-relaxed cursor-pointer">
                        Check this box if the coupon grants free shipping. A <span className="text-[var(--mav-primary)] underline">free shipping method</span> must be enabled in your shipping zone and be set to require "a valid free shipping coupon" (see the "Free Shipping" method settings).
                      </label>
                    </div>
                  </div>

                  {/* Coupon expiry date */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center">
                    <label className="text-xs font-bold text-[var(--mav-text)] flex items-center">
                      <span>Coupon expiry date</span>
                      <FieldHelpTooltip text="The date this coupon should expire and can no longer be used." />
                    </label>
                    <div className="sm:col-span-2">
                      <input
                        type="date"
                        placeholder="YYYY-MM-DD"
                        value={formData.expiry_date}
                        onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-xs text-[var(--mav-text)] focus:outline-none focus:border-[var(--mav-primary)]"
                      />
                    </div>
                  </div>

                  {/* Apply as cashback */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center pt-1">
                    <label className="text-xs font-bold text-[var(--mav-text)]">
                      Apply as cashback
                    </label>
                    <div className="sm:col-span-2 flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        id="chk_apply_cashback"
                        checked={formData.apply_as_cashback}
                        onChange={(e) => setFormData({ ...formData, apply_as_cashback: e.target.checked })}
                        className="w-4 h-4 rounded border-[var(--mav-line)] text-[var(--mav-primary)] focus:ring-[var(--mav-primary)] cursor-pointer"
                      />
                      <label htmlFor="chk_apply_cashback" className="text-xs text-[var(--mav-muted)] cursor-pointer">
                        Check this box if the coupon should apply as cashback.
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 2: USAGE RESTRICTION (Image 2) ───────────────────── */}
              {activeModalTab === "usage_restriction" && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  {/* Minimum spend */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center">
                    <label className="text-xs font-bold text-[var(--mav-text)] flex items-center">
                      <span>Minimum spend</span>
                      <FieldHelpTooltip text="No minimum amount to spend." />
                    </label>
                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="No minimum"
                        value={formData.minimum_amount}
                        onChange={(e) => setFormData({ ...formData, minimum_amount: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-xs text-[var(--mav-text)] focus:outline-none focus:border-[var(--mav-primary)]"
                      />
                    </div>
                  </div>

                  {/* Maximum spend */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center">
                    <label className="text-xs font-bold text-[var(--mav-text)] flex items-center">
                      <span>Maximum spend</span>
                      <FieldHelpTooltip text="No maximum amount to spend." />
                    </label>
                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="No maximum"
                        value={formData.maximum_amount}
                        onChange={(e) => setFormData({ ...formData, maximum_amount: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-xs text-[var(--mav-text)] focus:outline-none focus:border-[var(--mav-primary)]"
                      />
                    </div>
                  </div>

                  {/* Individual use only */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start pt-1">
                    <label className="text-xs font-bold text-[var(--mav-text)] pt-0.5">
                      Individual use only
                    </label>
                    <div className="sm:col-span-2 flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id="chk_individual_use"
                        checked={formData.individual_use}
                        onChange={(e) => setFormData({ ...formData, individual_use: e.target.checked })}
                        className="mt-1 w-4 h-4 rounded border-[var(--mav-line)] text-[var(--mav-primary)] focus:ring-[var(--mav-primary)] cursor-pointer"
                      />
                      <label htmlFor="chk_individual_use" className="text-xs text-[var(--mav-muted)] leading-relaxed cursor-pointer">
                        Check this box if the coupon cannot be used in conjunction with other coupons.
                      </label>
                    </div>
                  </div>

                  {/* Exclude sale items */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start pt-1">
                    <label className="text-xs font-bold text-[var(--mav-text)] pt-0.5">
                      Exclude sale items
                    </label>
                    <div className="sm:col-span-2 flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id="chk_exclude_sale"
                        checked={formData.exclude_sale_items}
                        onChange={(e) => setFormData({ ...formData, exclude_sale_items: e.target.checked })}
                        className="mt-1 w-4 h-4 rounded border-[var(--mav-line)] text-[var(--mav-primary)] focus:ring-[var(--mav-primary)] cursor-pointer"
                      />
                      <label htmlFor="chk_exclude_sale" className="text-xs text-[var(--mav-muted)] leading-relaxed cursor-pointer">
                        Check this box if the coupon should not apply to items on sale. Per-item coupons will only work if the item is not on sale. Per-cart coupons will only work if there are items in the cart that are not on sale.
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 3: USAGE LIMITS (Image 3) ────────────────────────── */}
              {activeModalTab === "usage_limits" && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  {/* Usage limit per coupon */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center">
                    <label className="text-xs font-bold text-[var(--mav-text)] flex items-center">
                      <span>Usage limit per coupon</span>
                      <FieldHelpTooltip text="How many times this coupon can be used before it is void." />
                    </label>
                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="Unlimited usage"
                        value={formData.usage_limit}
                        onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-xs text-[var(--mav-text)] focus:outline-none focus:border-[var(--mav-primary)]"
                      />
                    </div>
                  </div>

                  {/* Usage limit per user */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center">
                    <label className="text-xs font-bold text-[var(--mav-text)] flex items-center">
                      <span>Usage limit per user</span>
                      <FieldHelpTooltip text="How many times this coupon can be used by an individual user." />
                    </label>
                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="Unlimited usage"
                        value={formData.usage_limit_per_user}
                        onChange={(e) => setFormData({ ...formData, usage_limit_per_user: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-xs text-[var(--mav-text)] focus:outline-none focus:border-[var(--mav-primary)]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-[var(--mav-line)]">
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--mav-muted)]">
                  <span>Active Tab:</span>
                  <span className="font-bold capitalize text-[var(--mav-text)]">
                    {activeModalTab.replace("_", " ")}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-[var(--mav-line)] text-xs font-semibold hover:bg-[var(--mav-surface-2)] text-[var(--mav-text)] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--mav-primary)] text-[var(--mav-on-primary)] font-bold text-xs shadow-md hover:brightness-105 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isSaving ? "Saving & Syncing..." : "Add & Sync to App"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
