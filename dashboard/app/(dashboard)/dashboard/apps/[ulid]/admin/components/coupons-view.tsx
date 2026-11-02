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
} from "lucide-react";

export interface CouponItem {
  id: string | number;
  code: string;
  amount: string | number;
  discount_type: "percent" | "fixed_cart" | "fixed_product" | string;
  description?: string;
  expiry_date?: string | null;
  usage_count?: number;
  minimum_amount?: string | number | null;
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
    minimum_amount?: number | string;
  }) => Promise<void>;
  onDeleteCoupon: (couponId: string | number) => Promise<void>;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  isSaving?: boolean;
  isDeleting?: boolean;
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

  // Form State
  const [formData, setFormData] = useState({
    code: "",
    discount_type: "percent",
    amount: "15",
    description: "",
    expiry_date: "",
    minimum_amount: "",
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
      discount_type: "percent",
      amount: "15",
      description: "",
      expiry_date: "",
      minimum_amount: "",
    });
    setIsCreateModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      showToast("Please enter a coupon code.", "error");
      return;
    }
    const numAmount = parseFloat(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast("Please enter a valid discount amount.", "error");
      return;
    }

    try {
      await onSaveCoupon({
        code: formData.code.trim().toUpperCase(),
        discount_type: formData.discount_type,
        amount: numAmount,
        description: formData.description.trim() || undefined,
        expiry_date: formData.expiry_date || undefined,
        minimum_amount: formData.minimum_amount ? parseFloat(formData.minimum_amount) : undefined,
      });
      setIsCreateModalOpen(false);
    } catch (err: any) {
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
            <span>Grow &amp; App</span>
            <span>/</span>
            <span className="text-[var(--mav-text)]">Coupons &amp; Promo Codes</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Coupons &amp; Discounts
          </h2>
          <p className="text-sm text-[var(--mav-muted)] mt-1">
            Create promotional coupon codes that sync automatically across your mobile app and store.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[var(--mav-primary)] text-[var(--mav-on-primary)] font-bold text-sm shadow-md hover:brightness-105 active:scale-95 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Create Coupon</span>
        </button>
      </div>

      {/* ── Stats Ribbon ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[var(--mav-surface)] border border-[var(--mav-line)] shadow-sm">
          <div className="flex items-center gap-2 text-[var(--mav-muted)] text-xs font-semibold mb-1">
            <Ticket className="w-3.5 h-3.5 text-[var(--mav-primary)]" />
            <span>Active Coupons</span>
          </div>
          <div className="text-2xl font-black">{stats.total}</div>
          <span className="text-[10px] text-emerald-600 font-bold mt-1 inline-block">
            Synchronized with App
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--mav-surface)] border border-[var(--mav-line)] shadow-sm">
          <div className="flex items-center gap-2 text-[var(--mav-muted)] text-xs font-semibold mb-1">
            <Percent className="w-3.5 h-3.5 text-blue-500" />
            <span>Percentage Deals</span>
          </div>
          <div className="text-2xl font-black">{stats.percentCount}</div>
          <span className="text-[10px] text-[var(--mav-muted)] mt-1 inline-block">
            e.g. 10% - 50% Off
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--mav-surface)] border border-[var(--mav-line)] shadow-sm">
          <div className="flex items-center gap-2 text-[var(--mav-muted)] text-xs font-semibold mb-1">
            <DollarSign className="w-3.5 h-3.5 text-amber-500" />
            <span>Fixed Cash Off</span>
          </div>
          <div className="text-2xl font-black">{stats.fixedCount}</div>
          <span className="text-[10px] text-[var(--mav-muted)] mt-1 inline-block">
            Flat Cart Reductions
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--mav-surface)] border border-[var(--mav-line)] shadow-sm">
          <div className="flex items-center gap-2 text-[var(--mav-muted)] text-xs font-semibold mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Total Redemptions</span>
          </div>
          <div className="text-2xl font-black">{stats.totalUses}</div>
          <span className="text-[10px] text-[var(--mav-muted)] mt-1 inline-block">
            Customer Uses
          </span>
        </div>
      </div>

      {/* ── Search & Filters ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--mav-surface)] border border-[var(--mav-line)] shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--mav-muted)]" />
          <input
            type="text"
            placeholder="Search coupons by code or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-xs text-[var(--mav-text)] placeholder:text-[var(--mav-muted)] focus:outline-none focus:border-[var(--mav-primary)]"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)]">
          <button
            onClick={() => setTypeFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              typeFilter === "all"
                ? "bg-[var(--mav-surface)] text-[var(--mav-text)] shadow-sm"
                : "text-[var(--mav-muted)] hover:text-[var(--mav-text)]"
            }`}
          >
            All Types
          </button>
          <button
            onClick={() => setTypeFilter("percent")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              typeFilter === "percent"
                ? "bg-[var(--mav-surface)] text-[var(--mav-text)] shadow-sm"
                : "text-[var(--mav-muted)] hover:text-[var(--mav-text)]"
            }`}
          >
            Percentage (%)
          </button>
          <button
            onClick={() => setTypeFilter("fixed")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              typeFilter === "fixed"
                ? "bg-[var(--mav-surface)] text-[var(--mav-text)] shadow-sm"
                : "text-[var(--mav-muted)] hover:text-[var(--mav-text)]"
            }`}
          >
            Fixed Cash
          </button>
        </div>
      </div>

      {/* ── Coupons Grid (Voucher Ticket Card Design) ──────────────────────── */}
      {filteredCoupons.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[var(--mav-surface)] border border-dashed border-[var(--mav-line)] space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--mav-well)] text-[var(--mav-primary)] flex items-center justify-center">
            <Ticket className="w-7 h-7 opacity-80" />
          </div>
          <div>
            <h3 className="font-black text-lg">No Coupons Found</h3>
            <p className="text-xs text-[var(--mav-muted)] max-w-sm mx-auto mt-1">
              {searchQuery
                ? `No promo codes match "${searchQuery}". Try a different term or clear the filter.`
                : "You haven't created any promotional coupons yet. Create your first coupon to drive sales on your mobile app!"}
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--mav-primary)] text-[var(--mav-on-primary)] font-bold text-xs shadow hover:brightness-105"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Coupon</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCoupons.map((coupon) => {
            const isPercent = coupon.discount_type === "percent";
            const discountLabel = isPercent
              ? `${coupon.amount}% OFF`
              : `${currencySymbol}${parseFloat(String(coupon.amount) || "0").toLocaleString("en-IN")} OFF`;
            const isCopied = copiedCode === coupon.code;
            const isDeletingThis = isDeleting && deleteConfirmId === coupon.id;

            return (
              <div
                key={coupon.id}
                className="group relative flex flex-col justify-between rounded-3xl bg-[var(--mav-surface)] border border-[var(--mav-line)] p-5 shadow-sm hover:shadow-md hover:border-[var(--mav-primary)]/50 transition-all overflow-hidden"
              >
                {/* Decorative side perforated notch */}
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[var(--mav-bg)] border border-[var(--mav-line)]" />
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[var(--mav-bg)] border border-[var(--mav-line)]" />

                {/* Top Row: Type & Discount Badge */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        isPercent
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {isPercent ? <Percent className="w-2.5 h-2.5" /> : <Tag className="w-2.5 h-2.5" />}
                      <span>{isPercent ? "Percentage Discount" : "Fixed Cart Discount"}</span>
                    </span>

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
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition shrink-0 ${
                        isCopied
                          ? "bg-emerald-600 text-white"
                          : "bg-[var(--mav-surface)] hover:bg-[var(--mav-primary)] hover:text-[var(--mav-on-primary)] text-[var(--mav-text)] border border-[var(--mav-line)]"
                      }`}
                    >
                      {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                {/* Bottom Metadata: Expiry & Usage */}
                <div className="flex items-center justify-between text-[11px] text-[var(--mav-muted)] pt-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {coupon.expiry_date
                        ? `Expires: ${new Date(coupon.expiry_date).toLocaleDateString()}`
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

      {/* ── Create Coupon Modal ────────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg rounded-3xl bg-[var(--mav-surface)] border border-[var(--mav-line)] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--mav-line)]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--mav-primary)]/10 text-[var(--mav-primary)] flex items-center justify-center">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base tracking-tight">Create Promotional Coupon</h3>
                  <p className="text-xs text-[var(--mav-muted)]">
                    Syncs in real-time to {storeDomain} and customer mobile devices
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-xl text-[var(--mav-muted)] hover:text-[var(--mav-text)] hover:bg-[var(--mav-surface-2)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1">Coupon Code *</label>
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
                    className="w-full h-11 px-3 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-sm font-mono font-bold tracking-wider text-[var(--mav-text)] focus:outline-none focus:border-[var(--mav-primary)]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--mav-muted)] font-mono">
                    AUTO-UPPERCASE
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Discount Type *</label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-xs text-[var(--mav-text)] focus:outline-none focus:border-[var(--mav-primary)]"
                  >
                    <option value="percent">Percentage Discount (%)</option>
                    <option value="fixed_cart">Fixed Cart Discount ({currencySymbol})</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">
                    {formData.discount_type === "percent"
                      ? "Percentage Amount (%) *"
                      : `Fixed Cash Value (${currencySymbol}) *`}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    placeholder={formData.discount_type === "percent" ? "e.g. 20" : "e.g. 150"}
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-sm font-bold text-[var(--mav-text)] focus:outline-none focus:border-[var(--mav-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Flat 20% off on all items for new app users"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full h-11 px-3 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-xs text-[var(--mav-text)] focus:outline-none focus:border-[var(--mav-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-xs text-[var(--mav-text)] focus:outline-none focus:border-[var(--mav-primary)]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">
                    Minimum Order Amount ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 499 (optional)"
                    value={formData.minimum_amount}
                    onChange={(e) => setFormData({ ...formData, minimum_amount: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-xs text-[var(--mav-text)] focus:outline-none focus:border-[var(--mav-primary)]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--mav-line)]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[var(--mav-line)] text-xs font-semibold hover:bg-[var(--mav-surface-2)] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--mav-primary)] text-[var(--mav-on-primary)] font-bold text-xs shadow-md hover:brightness-105 active:scale-95 transition disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isSaving ? "Saving & Syncing..." : "Add & Sync to App"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
