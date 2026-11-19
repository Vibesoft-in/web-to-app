"use client";

import React, { useState } from "react";
import {
  Banknote,
  TrendingUp,
  Receipt,
  Ticket,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  ArrowUpRight,
  Send,
  X,
  Edit2,
  Trash2,
  Calendar,
  Tag,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

const MONTHLY_REVENUE_TRENDS = [
  { month: "Jun", gross: 320000, net: 294000 },
  { month: "Jul", gross: 450000, net: 412000 },
  { month: "Aug", gross: 580000, net: 531000 },
  { month: "Sep", gross: 720000, net: 659000 },
  { month: "Oct", gross: 890000, net: 815000 },
  { month: "Nov", gross: 1140000, net: 1045000 },
];

interface FailedPayment {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  reason: string;
  retryAttempts: number;
  status: "Failed" | "Pending Settle" | "Recovered";
  lastNotification: string;
}

const FAILED_PAYMENTS: FailedPayment[] = [
  {
    id: "fp_1",
    orderNumber: "ORD-7729104419",
    customerName: "Megha Bahukhandi",
    customerEmail: "meghabahukhandi@gmail.com",
    amount: 7999,
    reason: "Razorpay webhook signature drop",
    retryAttempts: 2,
    status: "Failed",
    lastNotification: "Nov 19, 11:30 AM",
  },
  {
    id: "fp_2",
    orderNumber: "ORD-9912048122",
    customerName: "Vikram Malhotra",
    customerEmail: "vikram@malhotratextiles.com",
    amount: 14999,
    reason: "Card 3D Secure timeout",
    retryAttempts: 1,
    status: "Pending Settle",
    lastNotification: "Nov 18, 04:15 PM",
  },
];

interface DiscountItem {
  id: string;
  code: string;
  category: "First Purchase" | "Renewal" | "Customer-Specific" | "General";
  type: "Percentage" | "Fixed";
  value: string;
  usesCount: number;
  maxUses?: number;
  minSpend: number;
  expiresAt?: string;
  active: boolean;
}

const DISCOUNTS_DATA: DiscountItem[] = [
  {
    id: "dsc_1",
    code: "WELCOME20",
    category: "First Purchase",
    type: "Percentage",
    value: "20%",
    usesCount: 142,
    maxUses: 500,
    minSpend: 2999,
    expiresAt: "Dec 31, 2026",
    active: true,
  },
  {
    id: "dsc_2",
    code: "RENEW500",
    category: "Renewal",
    type: "Fixed",
    value: "₹500",
    usesCount: 88,
    minSpend: 7999,
    expiresAt: "Jan 15, 2027",
    active: true,
  },
  {
    id: "dsc_3",
    code: "VIPFASHION",
    category: "Customer-Specific",
    type: "Percentage",
    value: "30%",
    usesCount: 4,
    maxUses: 5,
    minSpend: 14999,
    expiresAt: "Nov 30, 2026",
    active: true,
  },
];

export function AdminRevenue() {
  const [discounts, setDiscounts] = useState<DiscountItem[]>(DISCOUNTS_DATA);
  const [payments, setPayments] = useState<FailedPayment[]>(FAILED_PAYMENTS);

  // Create Modal State
  const [isNewDiscountOpen, setIsNewDiscountOpen] = useState(false);
  const [newDiscountForm, setNewDiscountForm] = useState({
    code: "",
    category: "General" as DiscountItem["category"],
    type: "Percentage" as DiscountItem["type"],
    value: "15",
    minSpend: 2999,
    maxUses: 100,
    expiresAt: "Dec 31, 2026",
  });

  // Edit Modal State
  const [editingDiscount, setEditingDiscount] = useState<DiscountItem | null>(null);
  const [editingForm, setEditingForm] = useState({
    code: "",
    category: "General" as DiscountItem["category"],
    type: "Percentage" as DiscountItem["type"],
    numericValue: "15",
    minSpend: 2999,
    maxUses: 100,
    expiresAt: "",
    active: true,
  });

  // Delete Confirmation Modal State
  const [deletingDiscount, setDeletingDiscount] = useState<DiscountItem | null>(null);

  const toggleDiscountActive = (id: string) => {
    setDiscounts(
      discounts.map((d) => (d.id === id ? { ...d, active: !d.active } : d))
    );
  };

  const handleCreateDiscount = () => {
    if (!newDiscountForm.code.trim()) return;
    const item: DiscountItem = {
      id: "dsc_" + Date.now(),
      code: newDiscountForm.code.toUpperCase().trim(),
      category: newDiscountForm.category,
      type: newDiscountForm.type,
      value:
        newDiscountForm.type === "Percentage"
          ? `${newDiscountForm.value}%`
          : `₹${newDiscountForm.value}`,
      usesCount: 0,
      maxUses: Number(newDiscountForm.maxUses) > 0 ? Number(newDiscountForm.maxUses) : undefined,
      minSpend: Number(newDiscountForm.minSpend) || 0,
      expiresAt: newDiscountForm.expiresAt || "No Expiry",
      active: true,
    };
    setDiscounts([item, ...discounts]);
    setIsNewDiscountOpen(false);
    setNewDiscountForm({
      code: "",
      category: "General",
      type: "Percentage",
      value: "15",
      minSpend: 2999,
      maxUses: 100,
      expiresAt: "Dec 31, 2026",
    });
  };

  const handleStartEdit = (d: DiscountItem) => {
    const rawVal = d.value.replace(/[^0-9.]/g, "");
    setEditingDiscount(d);
    setEditingForm({
      code: d.code,
      category: d.category,
      type: d.type,
      numericValue: rawVal,
      minSpend: d.minSpend,
      maxUses: d.maxUses || 0,
      expiresAt: d.expiresAt || "",
      active: d.active,
    });
  };

  const handleSaveEdit = () => {
    if (!editingDiscount || !editingForm.code.trim()) return;
    const formattedValue =
      editingForm.type === "Percentage"
        ? `${editingForm.numericValue}%`
        : `₹${editingForm.numericValue}`;

    setDiscounts(
      discounts.map((d) =>
        d.id === editingDiscount.id
          ? {
              ...d,
              code: editingForm.code.toUpperCase().trim(),
              category: editingForm.category,
              type: editingForm.type,
              value: formattedValue,
              minSpend: Number(editingForm.minSpend) || 0,
              maxUses: Number(editingForm.maxUses) > 0 ? Number(editingForm.maxUses) : undefined,
              expiresAt: editingForm.expiresAt.trim() || undefined,
              active: editingForm.active,
            }
          : d
      )
    );
    setEditingDiscount(null);
  };

  const handleDeleteDiscount = (id: string) => {
    setDiscounts(discounts.filter((d) => d.id !== id));
    setDeletingDiscount(null);
  };

  const recoverPayment = (id: string) => {
    setPayments(
      payments.map((p) => (p.id === id ? { ...p, status: "Recovered" } : p))
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── HEADER (NO EXTRA TABS) ── */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Revenue &amp; Billing
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Financial metrics, transaction recovery, and promotional discounts.
          </p>
        </div>
        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          ₹41.28L Settled
        </span>
      </div>

      {/* ── 4 CORE REVENUE METRICS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Gross Revenue
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            ₹41,28,500
          </div>
          <span className="text-xs font-semibold text-emerald-600">+28.4% YoY</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            MRR
          </span>
          <div className="text-xl sm:text-2xl font-black text-indigo-700 mt-1">
            ₹6,20,000
          </div>
          <span className="text-xs font-semibold text-emerald-600">+19.3% monthly</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Projected ARR
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            ₹74,40,000
          </div>
          <span className="text-xs text-slate-400">12x MRR run-rate</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Add-on Revenue
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
            ₹3,68,500
          </div>
          <span className="text-xs text-slate-400">236 purchases</span>
        </div>
      </div>

      {/* ── 1 CLEAN REVENUE VISUAL ── */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold text-sm text-slate-900">
              Gross vs Net Receipts
            </h2>
            <p className="text-xs text-slate-500">Trailing 6 months performance</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600" /> Gross
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> Net (Margin 92%)
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={MONTHLY_REVENUE_TRENDS} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip
                formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, ""]}
                contentStyle={{ borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "12px" }}
              />
              <Bar dataKey="gross" fill="#4F46E5" radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Bar dataKey="net" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── TEXT SECTION 1: FAILED PAYMENT RECOVERY ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Failed Payment Recovery
            </h2>
            <p className="text-xs text-slate-500">
              Resolve payment gateway drops and retry subscriber payments
            </p>
          </div>
          <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
            {payments.filter((p) => p.status !== "Recovered").length} Pending
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-4 py-2.5">Order</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Amount</th>
                <th className="px-4 py-2.5">Reason</th>
                <th className="px-4 py-2.5">Retries</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">
                    {p.orderNumber}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800">{p.customerName}</div>
                    <div className="text-[11px] text-slate-400">{p.customerEmail}</div>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">
                    ₹{p.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-rose-600 font-medium">
                    {p.reason}
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-medium">
                    {p.retryAttempts}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === "Recovered"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.status !== "Recovered" ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => recoverPayment(p.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition"
                        >
                          Mark Settled
                        </button>
                        <button
                          onClick={() =>
                            alert(`Retry notice dispatched to ${p.customerEmail}`)
                          }
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold transition"
                        >
                          Send Retry
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-600 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── TEXT SECTION 2: DISCOUNT MANAGEMENT (CREATE, UPDATE, DELETE) ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-sm text-slate-900">
              Discount Codes &amp; Coupons
            </h2>
            <p className="text-xs text-slate-500">
              Active promotional offers and customer vouchers
            </p>
          </div>
          <button
            onClick={() => setIsNewDiscountOpen(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Coupon</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-4 py-2.5">Code</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Value</th>
                <th className="px-4 py-2.5">Redemptions</th>
                <th className="px-4 py-2.5">Min Spend</th>
                <th className="px-4 py-2.5">Expires</th>
                <th className="px-4 py-2.5 text-center">Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {discounts.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">
                    {d.code}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                      {d.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-indigo-600">
                    {d.value}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {d.maxUses ? `${d.usesCount} / ${d.maxUses}` : `${d.usesCount}`}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    ₹{d.minSpend.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {d.expiresAt || "No Expiry"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleDiscountActive(d.id)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer ${
                        d.active
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                      title={d.active ? "Click to disable" : "Click to activate"}
                    >
                      {d.active ? "Active" : "Disabled"}
                    </button>
                  </td>
                  {/* Actions: Edit & Delete buttons */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleStartEdit(d)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition border border-transparent hover:border-indigo-100 cursor-pointer"
                        title="Edit Coupon"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingDiscount(d)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition border border-transparent hover:border-rose-100 cursor-pointer"
                        title="Delete Coupon"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CREATE COUPON MODAL ── */}
      {isNewDiscountOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 flex flex-col max-h-[82vh] sm:max-h-[84vh] overflow-hidden my-auto animate-in zoom-in-95">
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
              <h3 className="font-bold text-sm text-slate-900">Create New Coupon</h3>
              <button
                onClick={() => setIsNewDiscountOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Coupon Code</label>
                <input
                  type="text"
                  placeholder="e.g. FLASH30"
                  value={newDiscountForm.code}
                  onChange={(e) =>
                    setNewDiscountForm({ ...newDiscountForm, code: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono uppercase focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Category</label>
                <select
                  value={newDiscountForm.category}
                  onChange={(e) =>
                    setNewDiscountForm({ ...newDiscountForm, category: e.target.value as any })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                >
                  <option value="General">General Promo</option>
                  <option value="First Purchase">First Purchase</option>
                  <option value="Renewal">Renewal Retention</option>
                  <option value="Customer-Specific">Customer-Specific VIP</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Discount Type</label>
                  <select
                    value={newDiscountForm.type}
                    onChange={(e) =>
                      setNewDiscountForm({ ...newDiscountForm, type: e.target.value as any })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                  >
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Value</label>
                  <input
                    type="number"
                    value={newDiscountForm.value}
                    onChange={(e) =>
                      setNewDiscountForm({ ...newDiscountForm, value: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Min Spend (₹)</label>
                  <input
                    type="number"
                    value={newDiscountForm.minSpend}
                    onChange={(e) =>
                      setNewDiscountForm({
                        ...newDiscountForm,
                        minSpend: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Max Uses</label>
                  <input
                    type="number"
                    value={newDiscountForm.maxUses}
                    onChange={(e) =>
                      setNewDiscountForm({
                        ...newDiscountForm,
                        maxUses: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Expiry Description</label>
                <input
                  type="text"
                  placeholder="e.g. Dec 31, 2026"
                  value={newDiscountForm.expiresAt}
                  onChange={(e) =>
                    setNewDiscountForm({ ...newDiscountForm, expiresAt: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                />
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2 flex-shrink-0 bg-slate-50/90">
              <button
                onClick={() => setIsNewDiscountOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDiscount}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer shadow-xs"
              >
                Create Coupon
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT COUPON MODAL ── */}
      {editingDiscount && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 flex flex-col max-h-[82vh] sm:max-h-[84vh] overflow-hidden my-auto animate-in zoom-in-95">
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Edit Coupon</h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  ID: {editingDiscount.id}
                </span>
              </div>
              <button
                onClick={() => setEditingDiscount(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Coupon Code</label>
                <input
                  type="text"
                  value={editingForm.code}
                  onChange={(e) =>
                    setEditingForm({ ...editingForm, code: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono uppercase focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Category</label>
                <select
                  value={editingForm.category}
                  onChange={(e) =>
                    setEditingForm({ ...editingForm, category: e.target.value as any })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                >
                  <option value="General">General Promo</option>
                  <option value="First Purchase">First Purchase</option>
                  <option value="Renewal">Renewal Retention</option>
                  <option value="Customer-Specific">Customer-Specific VIP</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Discount Type</label>
                  <select
                    value={editingForm.type}
                    onChange={(e) =>
                      setEditingForm({ ...editingForm, type: e.target.value as any })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                  >
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Value</label>
                  <input
                    type="number"
                    value={editingForm.numericValue}
                    onChange={(e) =>
                      setEditingForm({ ...editingForm, numericValue: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Min Spend (₹)</label>
                  <input
                    type="number"
                    value={editingForm.minSpend}
                    onChange={(e) =>
                      setEditingForm({
                        ...editingForm,
                        minSpend: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Max Uses</label>
                  <input
                    type="number"
                    value={editingForm.maxUses}
                    onChange={(e) =>
                      setEditingForm({
                        ...editingForm,
                        maxUses: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Expiry Description</label>
                <input
                  type="text"
                  value={editingForm.expiresAt}
                  onChange={(e) =>
                    setEditingForm({ ...editingForm, expiresAt: e.target.value })
                  }
                  placeholder="e.g. Dec 31, 2026"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="font-semibold text-slate-700">Coupon Status</span>
                <button
                  type="button"
                  onClick={() =>
                    setEditingForm({ ...editingForm, active: !editingForm.active })
                  }
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                    editingForm.active
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-slate-100 text-slate-500 border border-slate-200"
                  }`}
                >
                  {editingForm.active ? "Status: Active" : "Status: Disabled"}
                </button>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2 flex-shrink-0 bg-slate-50/90">
              <button
                onClick={() => setEditingDiscount(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {deletingDiscount && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-bold text-sm text-slate-900">Delete Discount Coupon?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to delete coupon <b className="font-mono text-slate-800">{deletingDiscount.code}</b> ({deletingDiscount.value})? Customers will no longer be able to redeem this voucher.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDeletingDiscount(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDiscount(deletingDiscount.id)}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 cursor-pointer shadow-xs"
              >
                Delete Coupon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
