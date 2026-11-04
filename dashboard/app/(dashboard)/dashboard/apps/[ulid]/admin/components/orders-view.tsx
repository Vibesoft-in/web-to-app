"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ShoppingBag,
  Search,
  Filter,
  Download,
  Flame,
  Package,
  Truck,
  CreditCard,
  Check,
  ChevronRight,
  Clock,
  ArrowUpRight,
  ExternalLink,
  RotateCcw,
  GripVertical,
  MoveHorizontal,
  AlertCircle,
  X,
  Ban,
  CheckCircle2,
  Wallet,
  AlertTriangle,
  RefreshCw,
  Lock,
  Info,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";

export type OrderKanbanStage = "paid" | "unpaid" | "processing" | "complete" | "cancelled";

interface OrdersViewProps {
  rawOrders: any[];
  currencySymbol: string;
  storeDomain: string;
  storeUrl?: string;
  onSelectOrder: (order: any) => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  highlightedStage?: OrderKanbanStage | null;
  onSelectStage?: (stage: OrderKanbanStage | null) => void;
  orderStatusOverrides?: Record<string, string>;
  onUpdateOrderStatus?: (orderId: string, newStatus: OrderKanbanStage) => void;
  onResetOrderStatuses?: () => void;
  teraWallet?: {
    installed?: boolean;
    mandate?: boolean;
    plugin_name?: string;
    plugin_slug?: string;
    plugin_url?: string;
    mandate_text?: string;
  };
  refundsList?: any[];
  onVerifyTeraWallet?: (forceVerify?: boolean) => Promise<any>;
  onProcessRefund?: (data: {
    orderId: string;
    amount: number;
    reason?: string;
    customerName?: string;
    customerEmail?: string;
    restock?: boolean;
  }) => Promise<any>;
  externalRefundOrder?: any;
  onClearExternalRefundOrder?: () => void;
}

export function OrdersView({
  rawOrders,
  currencySymbol,
  storeDomain,
  storeUrl,
  onSelectOrder,
  showToast,
  highlightedStage,
  onSelectStage,
  orderStatusOverrides: propOverrides,
  onUpdateOrderStatus,
  onResetOrderStatuses,
  teraWallet,
  refundsList = [],
  onVerifyTeraWallet,
  onProcessRefund,
  externalRefundOrder,
  onClearExternalRefundOrder,
}: OrdersViewProps) {
  const [subTab, setSubTab] = useState<"fulfil" | "all" | "returns">("fulfil");
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | "web" | "app" | "wholesale">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderKanbanStage>("all");
  const [displayLimit, setDisplayLimit] = useState(25);
  const [activeHighlight, setActiveHighlight] = useState<OrderKanbanStage | null>(
    highlightedStage ?? null
  );

  // Sync when prop changes and auto-scroll to the highlighted Kanban column
  useEffect(() => {
    if (highlightedStage !== undefined) {
      setActiveHighlight(highlightedStage);
      if (highlightedStage) {
        setSubTab("fulfil");
        setStatusFilter(highlightedStage);

        const timer = setTimeout(() => {
          const el = document.getElementById("kanban-stage-" + highlightedStage);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
          }
        }, 120);
        return () => clearTimeout(timer);
      }
    }
  }, [highlightedStage]);

  // Local overrides for order advancement across kanban with persistence (fallback if not controlled)
  const [localOrderStatusOverrides, setLocalOrderStatusOverrides] = useState<Record<string, string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("mavora:order_status_overrides");
        return cached ? JSON.parse(cached) : {};
      } catch {
        return {};
      }
    }
    return {};
  });

  const orderStatusOverrides = propOverrides ?? localOrderStatusOverrides;

  // TeraWallet Mandate & Refund Modal State
  const [isTeraWalletActive, setIsTeraWalletActive] = useState<boolean>(() => {
    return Boolean(teraWallet?.installed);
  });
  const [isVerifyingPlugin, setIsVerifyingPlugin] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedRefundOrder, setSelectedRefundOrder] = useState<any | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("Customer requested return");
  const [restockInventory, setRestockInventory] = useState(true);
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  // Sync external props
  useEffect(() => {
    if (teraWallet?.installed !== undefined) {
      setIsTeraWalletActive(Boolean(teraWallet.installed));
    }
  }, [teraWallet?.installed]);

  // Handle external refund request from Order Drawer
  useEffect(() => {
    if (externalRefundOrder) {
      setSelectedRefundOrder(externalRefundOrder);
      setRefundAmount(String(externalRefundOrder.total || "0"));
      setIsRefundModalOpen(true);
    }
  }, [externalRefundOrder]);

  const handleVerifyPlugin = async (forceToggle = false) => {
    setIsVerifyingPlugin(true);
    try {
      if (onVerifyTeraWallet) {
        const res = await onVerifyTeraWallet(forceToggle ? !isTeraWalletActive : undefined);
        if (res && typeof res.installed === "boolean") {
          setIsTeraWalletActive(res.installed);
          if (res.installed) {
            showToast("✓ TeraWallet verified and active on WooCommerce site!", "success");
          } else {
            showToast("TeraWallet plugin not detected on WooCommerce site.", "error");
          }
        }
      } else {
        // Local simulation fallback
        setIsTeraWalletActive((prev) => !prev);
        showToast(
          !isTeraWalletActive
            ? "✓ TeraWallet plugin active (Simulation mode)"
            : "TeraWallet plugin deactivated (Simulation mode)",
          "info"
        );
      }
    } catch (e: any) {
      showToast(e?.message || "Failed to verify TeraWallet plugin.", "error");
    } finally {
      setIsVerifyingPlugin(false);
    }
  };

  const handleOpenRefundModalForOrder = (order: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedRefundOrder(order);
    setRefundAmount(String(order.total || "0"));
    setIsRefundModalOpen(true);
  };

  const handleSubmitRefund = async () => {
    if (!isTeraWalletActive) {
      showToast("Refund Blocked: TeraWallet plugin must be installed on your WooCommerce site.", "error");
      return;
    }

    if (!selectedRefundOrder) {
      showToast("Please select an order to refund.", "error");
      return;
    }

    const amt = parseFloat(refundAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast("Please enter a valid refund amount.", "error");
      return;
    }

    const maxAmt = parseFloat(selectedRefundOrder.total || "0");
    if (amt > maxAmt && maxAmt > 0) {
      showToast(`Refund amount cannot exceed order total (${currencySymbol}${maxAmt}).`, "error");
      return;
    }

    setIsSubmittingRefund(true);
    try {
      if (onProcessRefund) {
        await onProcessRefund({
          orderId: String(selectedRefundOrder.id),
          amount: amt,
          reason: refundReason,
          customerName: selectedRefundOrder.customer_name || "Customer",
          customerEmail: selectedRefundOrder.customer_email || selectedRefundOrder.billing?.email || "",
          restock: restockInventory,
        });
      } else {
        // Fallback update
        updateOrderStatus(String(selectedRefundOrder.id), "cancelled");
      }

      showToast(
        `✓ Refund of ${currencySymbol}${amt} credited to ${selectedRefundOrder.customer_name || "customer"}'s TeraWallet!`,
        "success"
      );
      setIsRefundModalOpen(false);
      setSelectedRefundOrder(null);
      onClearExternalRefundOrder?.();
    } catch (e: any) {
      showToast(e?.message || "Failed to process TeraWallet refund.", "error");
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  // Drag and drop state
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<OrderKanbanStage | null>(null);

  const STAGE_TITLES: Record<OrderKanbanStage, string> = {
    paid: "Paid Orders",
    unpaid: "Unpaid",
    processing: "Processing",
    complete: "Complete",
    cancelled: "Cancelled",
  };

  const getOrderStatus = (order: any): OrderKanbanStage => {
    const id = String(order.id);
    const num = String(order.order_number || "");
    const override = orderStatusOverrides[id] || (num ? orderStatusOverrides[num] : null) || order._statusOverride;
    if (override) {
      if (override === "paid") return "paid";
      if (override === "unpaid") return "unpaid";
      if (override === "processing") return "processing";
      if (override === "complete" || override === "completed" || override === "shipped" || override === "packed" || override === "delivered") return "complete";
      if (override === "cancelled" || override === "canceled" || override === "refunded" || override === "failed") return "cancelled";
    }

    const rawSt = String(order.status || "").toLowerCase().trim();

    // 5. Cancelled / Refunded / Void
    if (rawSt === "cancelled" || rawSt === "canceled" || rawSt === "refunded" || rawSt === "trash") {
      return "cancelled";
    }
    // 4. Complete / Delivered / Shipped
    if (rawSt === "completed" || rawSt === "complete" || rawSt === "shipped" || rawSt === "delivered") {
      return "complete";
    }
    // 3. Processing / Packing / In-progress
    if (rawSt === "processing" || rawSt === "prep" || rawSt === "in-progress" || rawSt === "packed") {
      return "processing";
    }
    // 2. Unpaid / Pending payment / Failed
    if (rawSt === "pending" || rawSt === "unpaid" || rawSt === "failed" || rawSt === "checkout-draft") {
      return "unpaid";
    }
    // 1. Paid / On-hold awaiting fulfillment
    if (rawSt === "paid" || rawSt === "on-hold") {
      return "paid";
    }

    return "paid";
  };

  const updateOrderStatus = (orderId: string, newStatus: OrderKanbanStage) => {
    if (onUpdateOrderStatus) {
      onUpdateOrderStatus(orderId, newStatus);
    } else {
      setLocalOrderStatusOverrides((prev) => {
        const next = { ...prev, [orderId]: newStatus };
        try {
          localStorage.setItem("mavora:order_status_overrides", JSON.stringify(next));
        } catch {}
        return next;
      });
    }
  };

  const handleDropOnStage = (targetStage: OrderKanbanStage) => {
    if (!draggedOrderId) return;
    const current = getOrderStatus({ id: draggedOrderId });
    if (current === targetStage) {
      setDraggedOrderId(null);
      setDragOverColumn(null);
      return;
    }

    const orderObj = rawOrders.find((o) => String(o.id) === String(draggedOrderId));
    const orderNum = orderObj?.order_number || draggedOrderId;

    updateOrderStatus(draggedOrderId, targetStage);
    showToast(`Order #${orderNum} moved to ${STAGE_TITLES[targetStage]}!`, "success");
    setDraggedOrderId(null);
    setDragOverColumn(null);
  };

  const handleAdvanceOrder = (e: React.MouseEvent, order: any) => {
    e.stopPropagation();
    const current = getOrderStatus(order);
    let next: OrderKanbanStage = "processing";
    if (current === "unpaid") next = "paid";
    else if (current === "paid") next = "processing";
    else if (current === "processing") next = "complete";
    else if (current === "complete") next = "complete";
    else if (current === "cancelled") next = "paid";

    updateOrderStatus(String(order.id), next);
    showToast(`Order #${order.order_number || order.id} moved to ${STAGE_TITLES[next]}!`, "success");
  };

  const handleBatchCompleteProcessing = () => {
    const processingOrders = rawOrders.filter((o) => getOrderStatus(o) === "processing");
    if (processingOrders.length === 0) {
      showToast("No processing orders in queue to mark complete.", "info");
      return;
    }
    processingOrders.forEach((o) => {
      updateOrderStatus(String(o.id), "complete");
    });
    showToast(`Marked ${processingOrders.length} processing orders as Complete!`, "success");
  };

  // CSV Export
  const handleExportCsv = () => {
    if (!rawOrders.length) {
      showToast("No orders available to export.", "info");
      return;
    }
    const headers = "Order Number,Customer Name,Email,Date,Items Count,Status,Total,Currency\n";
    const rows = rawOrders
      .map((o) => {
        const num = `"${o.order_number || o.id}"`;
        const name = `"${(o.customer_name || "Customer").replace(/"/g, '""')}"`;
        const email = `"${(o.customer_email || o.billing?.email || "").replace(/"/g, '""')}"`;
        const date = `"${o.created_at || ""}"`;
        const items = o.items_count || (o.line_items && o.line_items.length) || 1;
        const status = `"${getOrderStatus(o)}"`;
        const total = parseFloat(o.total || "0");
        const curr = `"${currencySymbol.trim()}"`;
        return [num, name, email, date, items, status, total, curr].join(",");
      })
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(storeDomain || "store").replace(/\./g, "-")}-orders.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${rawOrders.length} orders to CSV!`, "success");
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return rawOrders.filter((o) => {
      const q = searchQuery.toLowerCase().trim();
      const numMatch = String(o.order_number || o.id).toLowerCase().includes(q);
      const nameMatch = (o.customer_name || "").toLowerCase().includes(q);
      const emailMatch = (o.customer_email || o.billing?.email || "").toLowerCase().includes(q);
      const matchesSearch = !q || numMatch || nameMatch || emailMatch;

      const channel = (o.channel || (o.payment_method_title?.toLowerCase().includes("app") ? "app" : "web")).toLowerCase();
      const matchesChannel =
        channelFilter === "all" ||
        (channelFilter === "web" && channel.includes("web")) ||
        (channelFilter === "app" && (channel.includes("app") || channel.includes("club"))) ||
        (channelFilter === "wholesale" && channel.includes("wholesale"));

      const st = getOrderStatus(o);
      const matchesStatus =
        statusFilter === "all" || statusFilter === st;

      return matchesSearch && matchesChannel && matchesStatus;
    });
  }, [rawOrders, searchQuery, channelFilter, statusFilter, orderStatusOverrides]);

  // Grouped for Kanban across 5 exact sections
  const kanbanColumns = useMemo(() => {
    const paid: any[] = [];
    const unpaid: any[] = [];
    const processing: any[] = [];
    const complete: any[] = [];
    const cancelled: any[] = [];

    rawOrders.forEach((o) => {
      const st = getOrderStatus(o);
      if (st === "paid") paid.push(o);
      else if (st === "unpaid") unpaid.push(o);
      else if (st === "processing") processing.push(o);
      else if (st === "complete") complete.push(o);
      else if (st === "cancelled") cancelled.push(o);
      else paid.push(o);
    });

    return { paid, unpaid, processing, complete, cancelled };
  }, [rawOrders, orderStatusOverrides]);

  return (
    <div className="space-y-6">
      {/* View Header with Sub-Tabs & Actions */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--mav-muted)] mb-1">
            <span>Store Desk</span>
            <span>/</span>
            <span className="text-[var(--mav-text)]">Orders &amp; Fulfilment</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--mav-text)]">
            Store Orders
          </h2>
          <p className="text-sm text-[var(--mav-muted)] mt-1">
            {rawOrders.length} customer purchases placed via web and mobile app from <strong className="text-[var(--mav-text)]">{storeDomain}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Sub-tab Switcher (Fulfil / All / Returns) */}
          <div className="p-1 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)] flex items-center text-xs font-bold">
            <button
              type="button"
              onClick={() => setSubTab("fulfil")}
              className={`px-4 py-1.5 rounded-lg transition ${
                subTab === "fulfil"
                  ? "bg-white dark:bg-[#252820] text-[var(--mav-text)] shadow-xs font-extrabold"
                  : "text-[var(--mav-muted)] hover:text-[var(--mav-text)]"
              }`}
            >
              Fulfilment Board
            </button>
            <button
              type="button"
              onClick={() => setSubTab("all")}
              className={`px-4 py-1.5 rounded-lg transition ${
                subTab === "all"
                  ? "bg-white dark:bg-[#252820] text-[var(--mav-text)] shadow-xs font-extrabold"
                  : "text-[var(--mav-muted)] hover:text-[var(--mav-text)]"
              }`}
            >
              All Orders ({rawOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab("returns")}
              className={`px-4 py-1.5 rounded-lg transition ${
                subTab === "returns"
                  ? "bg-white dark:bg-[#252820] text-[var(--mav-text)] shadow-xs font-extrabold"
                  : "text-[var(--mav-muted)] hover:text-[var(--mav-text)]"
              }`}
            >
              Returns &amp; Refunds
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-xl bg-white dark:bg-[#1f221b] border border-[var(--mav-line)] text-xs font-bold text-[var(--mav-text)] hover:bg-[var(--mav-surface-2)] transition shadow-xs flex items-center gap-1.5"
            title="Download CSV of orders"
          >
            <Download className="w-3.5 h-3.5 text-[var(--mav-muted)]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── SUB-VIEW 1: FULFIL KANBAN BOARD (5 SECTIONS) ── */}
      {subTab === "fulfil" && (
        <div className="space-y-4">
          {/* Active Highlight Stage Notice Bar */}
          {activeHighlight && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-amber-500/10 to-emerald-500/10 border border-[#E6E3DC] shadow-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2563eb] opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#2563eb]" />
                </span>
                <div>
                  <p className="text-xs sm:text-sm font-extrabold text-[#23241B]">
                    Filtered Section:{" "}
                    <span className="capitalize text-[#2563eb] font-black underline decoration-2">
                      {STAGE_TITLES[activeHighlight]}
                    </span>
                  </p>
                  <p className="text-[11px] text-[#6f7060]">
                    Showing {STAGE_TITLES[activeHighlight]} section. Click another column or view all.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {(["paid", "unpaid", "processing", "complete", "cancelled"] as const).map((stageKey) => (
                  <button
                    key={stageKey}
                    type="button"
                    onClick={() => {
                      setActiveHighlight(stageKey);
                      onSelectStage?.(stageKey);
                      const el = document.getElementById("kanban-stage-" + stageKey);
                      el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold capitalize transition ${
                      activeHighlight === stageKey
                        ? "bg-[#23241B] text-white shadow-xs"
                        : "bg-white border border-[#ded8ce] text-[#23241B] hover:bg-[#f6f2ea]"
                    }`}
                  >
                    {STAGE_TITLES[stageKey]}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setActiveHighlight(null);
                    onSelectStage?.(null);
                  }}
                  className="ml-1 px-3 py-1 rounded-lg text-[11px] font-extrabold text-[#6f7060] hover:text-[#23241B] hover:bg-black/5 transition"
                >
                  Show All
                </button>
              </div>
            </div>
          )}

          {/* Top Pipeline Summary & Quick Batch Bar */}
          <div className="p-4 rounded-2xl bg-[#FFFCF9] border border-[#E6E3DC] shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#eff5fc] text-[#2563EB] flex items-center justify-center flex-shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#23241B] block">
                  Store Fulfilment Pipeline ({rawOrders.length} Orders)
                </span>
                <span className="text-[11px] text-[#6f7060]">
                  {kanbanColumns.paid.length} Paid · {kanbanColumns.unpaid.length} Unpaid · {kanbanColumns.processing.length} Processing · {kanbanColumns.complete.length} Complete · {kanbanColumns.cancelled.length} Cancelled
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBatchCompleteProcessing}
              disabled={kanbanColumns.processing.length === 0}
              className="px-4 py-2 rounded-xl bg-[#16A34A] text-white text-xs font-extrabold hover:bg-[#15803D] transition shadow-xs flex items-center gap-1.5 disabled:opacity-40"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Complete Processing Orders ({kanbanColumns.processing.length})</span>
            </button>
          </div>

          {/* Drag & Drop Hint Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-[#f7f5ed] dark:bg-[#1f221b] border border-[#ded8ce] dark:border-[#33372c] text-xs">
            <div className="flex items-center gap-2 text-[#23241B] dark:text-[#f3f0e8]">
              <MoveHorizontal className="w-4 h-4 text-[#2563EB] flex-shrink-0 animate-pulse" />
              <span>
                <strong>Drag &amp; Drop:</strong> Drag any order card between the 5 sections (Paid, Unpaid, Processing, Complete, Cancelled) to instantly update its status.
              </span>
            </div>
            {Object.keys(orderStatusOverrides).length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (onResetOrderStatuses) {
                    onResetOrderStatuses();
                  } else {
                    setLocalOrderStatusOverrides({});
                    try {
                      localStorage.removeItem("mavora:order_status_overrides");
                    } catch {}
                  }
                  showToast("Reset all order statuses to default", "info");
                }}
                className="text-[11px] font-bold text-[#6f7060] hover:text-[#23241B] underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset board ({Object.keys(orderStatusOverrides).length} moved)</span>
              </button>
            )}
          </div>

          {/* EXACT 5 KANBAN SECTIONS: 1. Paid Orders 2. Unpaid 3. Processing 4. Complete 5. Cancelled */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 items-start">
            
            {/* ── 1. PAID ORDERS ── */}
            <div
              id="kanban-stage-paid"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverColumn !== "paid") setDragOverColumn("paid");
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                if (dragOverColumn !== "paid") setDragOverColumn("paid");
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverColumn(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDropOnStage("paid");
              }}
              className={`rounded-[22px] bg-[#FFFCF9] border p-3.5 shadow-sm flex flex-col min-h-[520px] transition-all duration-200 ${
                dragOverColumn === "paid"
                  ? "ring-4 ring-offset-2 ring-[#2563EB] border-[#2563EB] bg-[#eff5fc] scale-[1.01]"
                  : activeHighlight === "paid"
                  ? "ring-4 ring-[#2563EB] border-[#2563EB] shadow-2xl scale-[1.01] bg-gradient-to-b from-[#eff5fc] via-[#FFFCF9] to-[#FFFCF9]"
                  : activeHighlight
                  ? "border-[#E6E3DC] opacity-75 hover:opacity-100"
                  : "border-[#E6E3DC]"
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#ECE9E2]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] flex-shrink-0" />
                  <h3 className="font-extrabold text-xs sm:text-sm text-[#23241B] truncate">
                    Paid Orders
                  </h3>
                  {activeHighlight === "paid" && (
                    <span className="px-1.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-[#2563EB] text-white">
                      Selected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs font-black font-mono px-2 py-0.5 rounded-full bg-[#eff5fc] text-[#2563EB]">
                    {kanbanColumns.paid.length}
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-2.5 flex-1 flex flex-col">
                {dragOverColumn === "paid" && (
                  <div className="p-3 rounded-2xl border-2 border-dashed border-[#2563EB] bg-[#eff5fc] text-center text-xs font-extrabold text-[#2563EB] flex items-center justify-center gap-2 shadow-xs animate-pulse">
                    <span>⬇ Drop here to mark Paid</span>
                  </div>
                )}
                {kanbanColumns.paid.length === 0 ? (
                  <p className="text-xs text-[#9a9c8f] italic py-8 text-center my-auto">No paid orders in queue</p>
                ) : (
                  kanbanColumns.paid.map((o) => {
                    const isDragging = draggedOrderId === String(o.id);
                    return (
                      <div
                        key={o.id}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", String(o.id));
                          e.dataTransfer.effectAllowed = "move";
                          setDraggedOrderId(String(o.id));
                        }}
                        onDragEnd={() => {
                          setDraggedOrderId(null);
                          setDragOverColumn(null);
                        }}
                        onClick={() => {
                          const currentSt = getOrderStatus(o);
                          onSelectOrder({ ...o, status: currentSt, _statusOverride: currentSt });
                        }}
                        className={`p-3 rounded-xl bg-white border transition select-none cursor-grab active:cursor-grabbing group ${
                          isDragging
                            ? "opacity-35 scale-[0.98] border-dashed border-[#2563EB] ring-2 ring-[#2563EB]/40 shadow-none"
                            : "border-[#E6E3DC] hover:border-[#2563EB] hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex items-start gap-1 min-w-0">
                            <GripVertical className="w-3.5 h-3.5 text-[#b5b3ab] group-hover:text-[#2563EB] mt-0.5 flex-shrink-0 cursor-grab" />
                            <div className="min-w-0">
                              <span className="font-mono font-bold text-xs text-[#23241B] block">
                                #{o.order_number || o.id}
                              </span>
                              <span className="font-extrabold text-[12px] text-[#23241B] block mt-0.5 group-hover:text-[#2563EB] transition truncate">
                                {o.customer_name || "Customer"}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-black font-mono text-[#23241B] flex-shrink-0">
                            {currencySymbol}{parseFloat(o.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-[#F0EEE8] flex items-center justify-between text-[11px] text-[#6f7060]">
                          <span>{o.items_count || (o.line_items && o.line_items.length) || 1} items</span>
                          <button
                            type="button"
                            onClick={(e) => handleAdvanceOrder(e, o)}
                            className="px-2 py-0.5 rounded-lg bg-[#f5f3ff] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white font-extrabold text-[10px] transition flex items-center gap-1"
                            title="Advance order to Processing"
                          >
                            <span>To Processing</span>
                            <span>➔</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── 2. UNPAID ── */}
            <div
              id="kanban-stage-unpaid"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverColumn !== "unpaid") setDragOverColumn("unpaid");
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                if (dragOverColumn !== "unpaid") setDragOverColumn("unpaid");
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverColumn(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDropOnStage("unpaid");
              }}
              className={`rounded-[22px] bg-[#FFFCF9] border p-3.5 shadow-sm flex flex-col min-h-[520px] transition-all duration-200 ${
                dragOverColumn === "unpaid"
                  ? "ring-4 ring-offset-2 ring-[#D97706] border-[#D97706] bg-[#fffbeb] scale-[1.01]"
                  : activeHighlight === "unpaid"
                  ? "ring-4 ring-[#D97706] border-[#D97706] shadow-2xl scale-[1.01] bg-gradient-to-b from-[#fffbeb] via-[#FFFCF9] to-[#FFFCF9]"
                  : activeHighlight
                  ? "border-[#E6E3DC] opacity-75 hover:opacity-100"
                  : "border-[#E6E3DC]"
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#ECE9E2]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D97706] flex-shrink-0" />
                  <h3 className="font-extrabold text-xs sm:text-sm text-[#23241B] truncate">
                    Unpaid
                  </h3>
                  {activeHighlight === "unpaid" && (
                    <span className="px-1.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-[#D97706] text-white">
                      Selected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs font-black font-mono px-2 py-0.5 rounded-full bg-[#fffbeb] text-[#B45309]">
                    {kanbanColumns.unpaid.length}
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-2.5 flex-1 flex flex-col">
                {dragOverColumn === "unpaid" && (
                  <div className="p-3 rounded-2xl border-2 border-dashed border-[#D97706] bg-[#fffbeb] text-center text-xs font-extrabold text-[#B45309] flex items-center justify-center gap-2 shadow-xs animate-pulse">
                    <span>⬇ Drop here to mark Unpaid</span>
                  </div>
                )}
                {kanbanColumns.unpaid.length === 0 ? (
                  <p className="text-xs text-[#9a9c8f] italic py-8 text-center my-auto">No unpaid orders</p>
                ) : (
                  kanbanColumns.unpaid.map((o) => {
                    const isDragging = draggedOrderId === String(o.id);
                    return (
                      <div
                        key={o.id}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", String(o.id));
                          e.dataTransfer.effectAllowed = "move";
                          setDraggedOrderId(String(o.id));
                        }}
                        onDragEnd={() => {
                          setDraggedOrderId(null);
                          setDragOverColumn(null);
                        }}
                        onClick={() => {
                          const currentSt = getOrderStatus(o);
                          onSelectOrder({ ...o, status: currentSt, _statusOverride: currentSt });
                        }}
                        className={`p-3 rounded-xl bg-white border transition select-none cursor-grab active:cursor-grabbing group ${
                          isDragging
                            ? "opacity-35 scale-[0.98] border-dashed border-[#D97706] ring-2 ring-[#D97706]/40 shadow-none"
                            : "border-[#E6E3DC] hover:border-[#D97706] hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex items-start gap-1 min-w-0">
                            <GripVertical className="w-3.5 h-3.5 text-[#b5b3ab] group-hover:text-[#D97706] mt-0.5 flex-shrink-0 cursor-grab" />
                            <div className="min-w-0">
                              <span className="font-mono font-bold text-xs text-[#23241B] block">
                                #{o.order_number || o.id}
                              </span>
                              <span className="font-extrabold text-[12px] text-[#23241B] block mt-0.5 group-hover:text-[#D97706] transition truncate">
                                {o.customer_name || "Customer"}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-black font-mono text-[#23241B] flex-shrink-0">
                            {currencySymbol}{parseFloat(o.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-[#F0EEE8] flex items-center justify-between text-[11px] text-[#6f7060]">
                          <span className="inline-flex items-center gap-1 text-[#b45309] font-bold text-[10px]">
                            <Clock className="w-3 h-3" />
                            <span>Pending</span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleAdvanceOrder(e, o)}
                            className="px-2 py-0.5 rounded-lg bg-[#eff5fc] text-[#2563EB] hover:bg-[#2563EB] hover:text-white font-extrabold text-[10px] transition flex items-center gap-1"
                            title="Mark order as Paid"
                          >
                            <span>Mark Paid</span>
                            <span>➔</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── 3. PROCESSING ── */}
            <div
              id="kanban-stage-processing"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverColumn !== "processing") setDragOverColumn("processing");
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                if (dragOverColumn !== "processing") setDragOverColumn("processing");
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverColumn(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDropOnStage("processing");
              }}
              className={`rounded-[22px] bg-[#FFFCF9] border p-3.5 shadow-sm flex flex-col min-h-[520px] transition-all duration-200 ${
                dragOverColumn === "processing"
                  ? "ring-4 ring-offset-2 ring-[#8B5CF6] border-[#8B5CF6] bg-[#f5f3ff] scale-[1.01]"
                  : activeHighlight === "processing"
                  ? "ring-4 ring-[#8B5CF6] border-[#8B5CF6] shadow-2xl scale-[1.01] bg-gradient-to-b from-[#f5f3ff] via-[#FFFCF9] to-[#FFFCF9]"
                  : activeHighlight
                  ? "border-[#E6E3DC] opacity-75 hover:opacity-100"
                  : "border-[#E6E3DC]"
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#ECE9E2]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6] flex-shrink-0" />
                  <h3 className="font-extrabold text-xs sm:text-sm text-[#23241B] truncate">
                    Processing
                  </h3>
                  {activeHighlight === "processing" && (
                    <span className="px-1.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-[#8B5CF6] text-white">
                      Selected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs font-black font-mono px-2 py-0.5 rounded-full bg-[#f5f3ff] text-[#7C3AED]">
                    {kanbanColumns.processing.length}
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-2.5 flex-1 flex flex-col">
                {dragOverColumn === "processing" && (
                  <div className="p-3 rounded-2xl border-2 border-dashed border-[#8B5CF6] bg-[#f5f3ff] text-center text-xs font-extrabold text-[#7C3AED] flex items-center justify-center gap-2 shadow-xs animate-pulse">
                    <span>⬇ Drop here to mark Processing</span>
                  </div>
                )}
                {kanbanColumns.processing.length === 0 ? (
                  <p className="text-xs text-[#9a9c8f] italic py-8 text-center my-auto">No orders in processing</p>
                ) : (
                  kanbanColumns.processing.map((o) => {
                    const isDragging = draggedOrderId === String(o.id);
                    return (
                      <div
                        key={o.id}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", String(o.id));
                          e.dataTransfer.effectAllowed = "move";
                          setDraggedOrderId(String(o.id));
                        }}
                        onDragEnd={() => {
                          setDraggedOrderId(null);
                          setDragOverColumn(null);
                        }}
                        onClick={() => {
                          const currentSt = getOrderStatus(o);
                          onSelectOrder({ ...o, status: currentSt, _statusOverride: currentSt });
                        }}
                        className={`p-3 rounded-xl bg-white border transition select-none cursor-grab active:cursor-grabbing group ${
                          isDragging
                            ? "opacity-35 scale-[0.98] border-dashed border-[#8B5CF6] ring-2 ring-[#8B5CF6]/40 shadow-none"
                            : "border-[#E6E3DC] hover:border-[#8B5CF6] hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex items-start gap-1 min-w-0">
                            <GripVertical className="w-3.5 h-3.5 text-[#b5b3ab] group-hover:text-[#8B5CF6] mt-0.5 flex-shrink-0 cursor-grab" />
                            <div className="min-w-0">
                              <span className="font-mono font-bold text-xs text-[#23241B] block">
                                #{o.order_number || o.id}
                              </span>
                              <span className="font-extrabold text-[12px] text-[#23241B] block mt-0.5 group-hover:text-[#8B5CF6] transition truncate">
                                {o.customer_name || "Customer"}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-black font-mono text-[#23241B] flex-shrink-0">
                            {currencySymbol}{parseFloat(o.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-[#F0EEE8] flex items-center justify-between text-[11px] text-[#6f7060]">
                          <span>{o.items_count || (o.line_items && o.line_items.length) || 1} items</span>
                          <button
                            type="button"
                            onClick={(e) => handleAdvanceOrder(e, o)}
                            className="px-2 py-0.5 rounded-lg bg-[#f0fdf4] text-[#16A34A] hover:bg-[#16A34A] hover:text-white font-extrabold text-[10px] transition flex items-center gap-1"
                            title="Mark order as Complete"
                          >
                            <span>Mark Complete</span>
                            <span>➔</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── 4. COMPLETE ── */}
            <div
              id="kanban-stage-complete"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverColumn !== "complete") setDragOverColumn("complete");
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                if (dragOverColumn !== "complete") setDragOverColumn("complete");
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverColumn(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDropOnStage("complete");
              }}
              className={`rounded-[22px] bg-[#FFFCF9] border p-3.5 shadow-sm flex flex-col min-h-[520px] transition-all duration-200 ${
                dragOverColumn === "complete"
                  ? "ring-4 ring-offset-2 ring-[#16A34A] border-[#16A34A] bg-[#f0fdf4] scale-[1.01]"
                  : activeHighlight === "complete"
                  ? "ring-4 ring-[#16A34A] border-[#16A34A] shadow-2xl scale-[1.01] bg-gradient-to-b from-[#f0fdf4] via-[#FFFCF9] to-[#FFFCF9]"
                  : activeHighlight
                  ? "border-[#E6E3DC] opacity-75 hover:opacity-100"
                  : "border-[#E6E3DC]"
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#ECE9E2]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] flex-shrink-0" />
                  <h3 className="font-extrabold text-xs sm:text-sm text-[#23241B] truncate">
                    Complete
                  </h3>
                  {activeHighlight === "complete" && (
                    <span className="px-1.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-[#16A34A] text-white">
                      Selected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs font-black font-mono px-2 py-0.5 rounded-full bg-[#f0fdf4] text-[#16A34A]">
                    {kanbanColumns.complete.length}
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-2.5 flex-1 flex flex-col">
                {dragOverColumn === "complete" && (
                  <div className="p-3 rounded-2xl border-2 border-dashed border-[#16A34A] bg-[#f0fdf4] text-center text-xs font-extrabold text-[#16A34A] flex items-center justify-center gap-2 shadow-xs animate-pulse">
                    <span>⬇ Drop here to mark Complete</span>
                  </div>
                )}
                {kanbanColumns.complete.length === 0 ? (
                  <p className="text-xs text-[#9a9c8f] italic py-8 text-center my-auto">No completed orders yet</p>
                ) : (
                  kanbanColumns.complete.map((o) => {
                    const isDragging = draggedOrderId === String(o.id);
                    return (
                      <div
                        key={o.id}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", String(o.id));
                          e.dataTransfer.effectAllowed = "move";
                          setDraggedOrderId(String(o.id));
                        }}
                        onDragEnd={() => {
                          setDraggedOrderId(null);
                          setDragOverColumn(null);
                        }}
                        onClick={() => {
                          const currentSt = getOrderStatus(o);
                          onSelectOrder({ ...o, status: currentSt, _statusOverride: currentSt });
                        }}
                        className={`p-3 rounded-xl bg-white border transition select-none cursor-grab active:cursor-grabbing group ${
                          isDragging
                            ? "opacity-35 scale-[0.98] border-dashed border-[#16A34A] ring-2 ring-[#16A34A]/40 shadow-none"
                            : "border-[#E6E3DC] hover:border-[#16A34A] hover:shadow-md opacity-90 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex items-start gap-1 min-w-0">
                            <GripVertical className="w-3.5 h-3.5 text-[#b5b3ab] group-hover:text-[#16A34A] mt-0.5 flex-shrink-0 cursor-grab" />
                            <div className="min-w-0">
                              <span className="font-mono font-bold text-xs text-[#23241B] block">
                                #{o.order_number || o.id}
                              </span>
                              <span className="font-extrabold text-[12px] text-[#23241B] block mt-0.5 group-hover:text-[#16A34A] transition truncate">
                                {o.customer_name || "Customer"}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-black font-mono text-[#23241B] flex-shrink-0">
                            {currencySymbol}{parseFloat(o.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-[#F0EEE8] flex items-center justify-between text-[11px] text-[#6f7060]">
                          <span className="inline-flex items-center gap-1 text-[#16A34A] font-bold text-[10.5px]">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Completed</span>
                          </span>
                          <span className="text-[10px] text-[#9a9c8f]">
                            {o.created_at ? new Date(o.created_at).toLocaleDateString([], { month: "short", day: "numeric" }) : "Done"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── 5. CANCELLED ── */}
            <div
              id="kanban-stage-cancelled"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverColumn !== "cancelled") setDragOverColumn("cancelled");
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                if (dragOverColumn !== "cancelled") setDragOverColumn("cancelled");
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverColumn(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDropOnStage("cancelled");
              }}
              className={`rounded-[22px] bg-[#FFFCF9] border p-3.5 shadow-sm flex flex-col min-h-[520px] transition-all duration-200 ${
                dragOverColumn === "cancelled"
                  ? "ring-4 ring-offset-2 ring-[#DC2626] border-[#DC2626] bg-[#fef2f2] scale-[1.01]"
                  : activeHighlight === "cancelled"
                  ? "ring-4 ring-[#DC2626] border-[#DC2626] shadow-2xl scale-[1.01] bg-gradient-to-b from-[#fef2f2] via-[#FFFCF9] to-[#FFFCF9]"
                  : activeHighlight
                  ? "border-[#E6E3DC] opacity-75 hover:opacity-100"
                  : "border-[#E6E3DC]"
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#ECE9E2]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] flex-shrink-0" />
                  <h3 className="font-extrabold text-xs sm:text-sm text-[#23241B] truncate">
                    Cancelled
                  </h3>
                  {activeHighlight === "cancelled" && (
                    <span className="px-1.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-[#DC2626] text-white">
                      Selected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs font-black font-mono px-2 py-0.5 rounded-full bg-[#fef2f2] text-[#DC2626]">
                    {kanbanColumns.cancelled.length}
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-2.5 flex-1 flex flex-col">
                {dragOverColumn === "cancelled" && (
                  <div className="p-3 rounded-2xl border-2 border-dashed border-[#DC2626] bg-[#fef2f2] text-center text-xs font-extrabold text-[#DC2626] flex items-center justify-center gap-2 shadow-xs animate-pulse">
                    <span>⬇ Drop here to mark Cancelled</span>
                  </div>
                )}
                {kanbanColumns.cancelled.length === 0 ? (
                  <p className="text-xs text-[#9a9c8f] italic py-8 text-center my-auto">Zero cancelled orders</p>
                ) : (
                  kanbanColumns.cancelled.map((o) => {
                    const isDragging = draggedOrderId === String(o.id);
                    return (
                      <div
                        key={o.id}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", String(o.id));
                          e.dataTransfer.effectAllowed = "move";
                          setDraggedOrderId(String(o.id));
                        }}
                        onDragEnd={() => {
                          setDraggedOrderId(null);
                          setDragOverColumn(null);
                        }}
                        onClick={() => {
                          const currentSt = getOrderStatus(o);
                          onSelectOrder({ ...o, status: currentSt, _statusOverride: currentSt });
                        }}
                        className={`p-3 rounded-xl bg-white border transition select-none cursor-grab active:cursor-grabbing group ${
                          isDragging
                            ? "opacity-35 scale-[0.98] border-dashed border-[#DC2626] ring-2 ring-[#DC2626]/40 shadow-none"
                            : "border-[#E6E3DC] hover:border-[#DC2626] hover:shadow-md opacity-80 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex items-start gap-1 min-w-0">
                            <GripVertical className="w-3.5 h-3.5 text-[#b5b3ab] group-hover:text-[#DC2626] mt-0.5 flex-shrink-0 cursor-grab" />
                            <div className="min-w-0">
                              <span className="font-mono font-bold text-xs text-[#23241B] block">
                                #{o.order_number || o.id}
                              </span>
                              <span className="font-extrabold text-[12px] text-[#23241B] block mt-0.5 group-hover:text-[#DC2626] transition truncate">
                                {o.customer_name || "Customer"}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-black font-mono text-[#9a9c8f] line-through flex-shrink-0">
                            {currencySymbol}{parseFloat(o.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-[#F0EEE8] flex items-center justify-between text-[11px] text-[#6f7060]">
                          <span className="inline-flex items-center gap-1 text-[#DC2626] font-bold text-[10.5px]">
                            <Ban className="w-3 h-3" />
                            <span>Cancelled</span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleAdvanceOrder(e, o)}
                            className="px-2 py-0.5 rounded-lg bg-[#eff5fc] text-[#2563EB] hover:bg-[#2563EB] hover:text-white font-extrabold text-[10px] transition flex items-center gap-1"
                            title="Reopen order to Paid"
                          >
                            <span>Reopen</span>
                            <span>➔</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── SUB-VIEW 2: ALL ORDERS TABLE ── */}
      {subTab === "all" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {/* Channel chips */}
              <div className="flex items-center gap-1 p-1 bg-[var(--mav-surface)] border border-[var(--mav-line)] rounded-xl text-xs font-bold">
                {[
                  { id: "all", label: "All Channels" },
                  { id: "web", label: "Web Shop" },
                  { id: "app", label: "Mobile App" },
                  { id: "wholesale", label: "Wholesale" },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => setChannelFilter(chip.id as any)}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      channelFilter === chip.id
                        ? "bg-[var(--mav-primary)] text-[var(--mav-on-primary)] shadow-sm font-extrabold"
                        : "text-[var(--mav-muted)] hover:text-[var(--mav-text)]"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Status filter: All 5 Stages */}
              <div className="flex items-center gap-1 p-1 bg-[var(--mav-surface)] border border-[var(--mav-line)] rounded-xl text-xs font-bold">
                {[
                  { id: "all", label: "All Statuses" },
                  { id: "paid", label: "Paid" },
                  { id: "unpaid", label: "Unpaid" },
                  { id: "processing", label: "Processing" },
                  { id: "complete", label: "Complete" },
                  { id: "cancelled", label: "Cancelled" },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => setStatusFilter(chip.id as any)}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      statusFilter === chip.id
                        ? "bg-[var(--mav-primary)] text-[var(--mav-on-primary)] shadow-sm font-extrabold"
                        : "text-[var(--mav-muted)] hover:text-[var(--mav-text)]"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mav-muted)]" />
              <input
                type="search"
                placeholder="Search orders, customers, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-[var(--mav-surface)] border border-[var(--mav-line)] text-xs text-[var(--mav-text)] placeholder:text-[var(--mav-muted)] focus:outline-none focus:border-[var(--mav-primary)]"
              />
            </div>
          </div>

          {/* Orders Data Table */}
          <div className="rounded-[28px] bg-[var(--mav-surface)] border border-[var(--mav-line)] shadow-sm overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--mav-line)] text-[var(--mav-muted)] uppercase tracking-wider font-extrabold text-[11px] bg-[var(--mav-surface-2)]/60">
                    <th className="py-3.5 px-4">Order #</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Channel</th>
                    <th className="py-3.5 px-4">Items</th>
                    <th className="py-3.5 px-4">Total Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--mav-line)]">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[var(--mav-muted)]">
                        <ShoppingBag className="w-10 h-10 mx-auto opacity-30 mb-2" />
                        <p className="font-bold text-sm">No orders matching criteria</p>
                        <p className="text-xs mt-0.5">Try adjusting your channel, status, or search filters.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.slice(0, displayLimit).map((o) => {
                      const st = getOrderStatus(o);
                      const channel = o.channel || (o.payment_method_title?.toLowerCase().includes("app") ? "Mobile App" : "Web shop");

                      return (
                        <tr
                          key={o.id}
                          onClick={() => {
                            const currentSt = getOrderStatus(o);
                            onSelectOrder({ ...o, status: currentSt, _statusOverride: currentSt });
                          }}
                          className="hover:bg-[var(--mav-surface-2)] transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-[13px] text-[var(--mav-text)]">
                            #{o.order_number || o.id}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-extrabold block text-[13px] text-[var(--mav-text)] group-hover:text-[var(--mav-primary)] transition">
                              {o.customer_name || "Customer"}
                            </span>
                            <span className="text-[11px] text-[var(--mav-muted)]">
                              {o.created_at ? new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Recent"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[var(--mav-well)] text-[var(--mav-muted)]">
                              <span className={`w-1.5 h-1.5 rounded-full ${channel.includes("App") ? "bg-[#8B5CF6]" : "bg-[#16A34A]"}`} />
                              <span>{channel}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-[var(--mav-muted)] font-semibold">
                            {o.items_count || (o.line_items && o.line_items.length) || 1} items
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-[13px] text-[var(--mav-text)]">
                            {currencySymbol}{parseFloat(o.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-tight ${
                                st === "complete"
                                  ? "bg-[#f0fdf4] text-[#16A34A]"
                                  : st === "processing"
                                  ? "bg-[#f5f3ff] text-[#7C3AED]"
                                  : st === "unpaid"
                                  ? "bg-[#fffbeb] text-[#B45309]"
                                  : st === "cancelled"
                                  ? "bg-[#fef2f2] text-[#DC2626]"
                                  : "bg-[#eff5fc] text-[#2563EB]"
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              <span className="capitalize">{STAGE_TITLES[st] || st}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const currentSt = getOrderStatus(o);
                                onSelectOrder({ ...o, status: currentSt, _statusOverride: currentSt });
                              }}
                              className="px-3.5 py-1.5 rounded-xl border border-[var(--mav-line)] bg-white dark:bg-[#1f221b] text-xs font-extrabold hover:bg-[var(--mav-well)] transition"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredOrders.length > displayLimit && (
              <div className="p-4 border-t border-[var(--mav-line)] flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setDisplayLimit((prev) => prev + 25)}
                  className="px-5 py-2 rounded-xl bg-white dark:bg-[#1f221b] border border-[var(--mav-line)] text-xs font-extrabold text-[var(--mav-text)] hover:bg-[var(--mav-surface-2)] transition shadow-xs"
                >
                  Show {Math.min(25, filteredOrders.length - displayLimit)} more · {filteredOrders.length - displayLimit} remaining
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SUB-VIEW 3: RETURNS & REFUNDS (TERAWALLET MANDATE ENFORCED) ── */}
      {subTab === "returns" && (
        <div className="space-y-5">
          {/* Top Returns Header */}
          <div className="rounded-[28px] bg-[var(--mav-surface)] border border-[var(--mav-line)] p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#eff5fc] text-[#2563EB] flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-5 h-5 text-[#2563EB]" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-[var(--mav-text)]">
                    Returns &amp; Store Credit Refunds
                  </h3>
                  <p className="text-xs text-[var(--mav-muted)] mt-0.5">
                    Customer refund requests and digital store wallet credits for <strong className="text-[var(--mav-text)]">{storeDomain}</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRefundOrder(rawOrders[0] || null);
                    setRefundAmount(rawOrders[0] ? String(rawOrders[0].total || "0") : "0");
                    setIsRefundModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#23241B] text-white hover:bg-[#383a2d] text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Issue Wallet Refund</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleVerifyPlugin(false)}
                  disabled={isVerifyingPlugin}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#1f221b] border border-[var(--mav-line)] text-xs font-bold text-[var(--mav-text)] hover:bg-[var(--mav-surface-2)] transition shadow-xs flex items-center gap-1.5"
                  title="Probe WooCommerce site for TeraWallet plugin"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingPlugin ? "animate-spin" : ""}`} />
                  <span>Verify TeraWallet</span>
                </button>

                <a
                  href="https://wordpress.org/plugins/woo-wallet/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#1f221b] border border-[var(--mav-line)] text-xs font-bold text-[#2563EB] hover:bg-[#eff5fc] transition shadow-xs flex items-center gap-1"
                >
                  <span>Plugin Page ↗</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* MANDATE CARD */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                isTeraWalletActive
                  ? "bg-[#f0fdf4] dark:bg-[#132817] border-[#bbf7d0] dark:border-[#204928]"
                  : "bg-[#fffbeb] dark:bg-[#2e2311] border-[#fde68a] dark:border-[#523e17]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 max-w-2xl min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs ${
                      isTeraWalletActive
                        ? "bg-[#16A34A] text-white"
                        : "bg-[#D97706] text-white"
                    }`}
                  >
                    {isTeraWalletActive ? (
                      <ShieldCheck className="w-5 h-5" />
                    ) : (
                      <Lock className="w-5 h-5 animate-pulse" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-extrabold text-sm text-[#23241B] dark:text-[#f2f4ed]">
                        WooCommerce TeraWallet Refund Mandate
                      </h4>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isTeraWalletActive
                            ? "bg-[#dcfce7] text-[#15803d] dark:bg-[#1d4023] dark:text-[#86efac]"
                            : "bg-[#fee2e2] text-[#b91c1c] dark:bg-[#431414] dark:text-[#fca5a5]"
                        }`}
                      >
                        {isTeraWalletActive
                          ? "● Plugin Active & Verified"
                          : "⚠️ Mandatory Plugin Missing"}
                      </span>
                    </div>

                    <p className="text-xs text-[#52524e] dark:text-[#c4c2ba] mt-1 leading-relaxed">
                      {isTeraWalletActive ? (
                        <>
                          <strong>Mandate Compliant:</strong> TeraWallet (WooWallet) is active on your WooCommerce site. All refunds are issued as store wallet credit directly to customer accounts to retain store funds and prevent payment gateway fee loss.
                        </>
                      ) : (
                        <>
                          <strong>Store Mandate Notice:</strong> In WooCommerce websites, refunds will <strong>only</strong> be generated if the <strong>TeraWallet</strong> plugin is installed and activated. Payment gateway chargebacks and cash refunds are disabled to protect store revenue.
                        </>
                      )}
                    </p>

                    {!isTeraWalletActive && (
                      <div className="mt-2.5 flex items-center gap-2 flex-wrap text-[11px] text-[#92400e] dark:text-[#fcd34d]">
                        <span className="font-bold">Required WordPress Plugin:</span>
                        <code className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono font-bold">
                          TeraWallet – For WooCommerce (woo-wallet)
                        </code>
                        <span>· by WPOpenVerse</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleVerifyPlugin(true)}
                    className="text-[11px] font-bold text-[#6f7060] hover:text-[#23241B] dark:hover:text-white underline"
                    title="Switch simulation mode for testing"
                  >
                    {isTeraWalletActive ? "Simulate Missing Plugin" : "Simulate Active (Test Mode)"}
                  </button>
                </div>
              </div>
            </div>

            {/* List of Cancelled / Refunded Orders */}
            <div className="border-t border-[var(--mav-line)] pt-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--mav-muted)] mb-3">
                Refund History &amp; Cancelled Orders
              </h4>

              {rawOrders.filter((o) => getOrderStatus(o) === "cancelled").length === 0 ? (
                <div className="py-12 text-center text-[var(--mav-muted)]">
                  <Check className="w-10 h-10 mx-auto text-[#16A34A] opacity-60 mb-2" />
                  <p className="font-bold text-sm text-[var(--mav-text)]">Zero active refund disputes</p>
                  <p className="text-xs mt-0.5">All customer orders are currently in active fulfillment.</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--mav-line)]">
                  {rawOrders
                    .filter((o) => getOrderStatus(o) === "cancelled")
                    .map((o) => (
                      <div key={o.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#23241B] dark:text-white">
                              #{o.order_number || o.id}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#eff5fc] text-[#2563EB]">
                              <Wallet className="w-2.5 h-2.5" />
                              <span>TeraWallet Credit</span>
                            </span>
                          </div>
                          <span className="text-[var(--mav-muted)] block mt-0.5 truncate">
                            Customer: <strong>{o.customer_name || "Customer"}</strong> · {o.created_at ? new Date(o.created_at).toLocaleDateString([], { month: "short", day: "numeric" }) : "Recent"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="font-mono font-bold text-[#DC2626]">
                            -{currencySymbol}{parseFloat(o.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              updateOrderStatus(String(o.id), "paid");
                              showToast(`Order #${o.order_number || o.id} reopened to Paid Orders!`, "success");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#eff5fc] text-[#2563EB] hover:bg-[#2563EB] hover:text-white font-extrabold text-[10.5px] transition"
                          >
                            Reopen
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TERAWALLET REFUND MODAL (MANDATE ENFORCED) ── */}
      {isRefundModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => {
            setIsRefundModalOpen(false);
            onClearExternalRefundOrder?.();
          }}
        >
          <div
            className="w-full max-w-lg rounded-[28px] bg-white dark:bg-[#1a1c15] border border-[#e2dfd5] dark:border-[#33372c] shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    isTeraWalletActive
                      ? "bg-[#f0fdf4] text-[#16A34A]"
                      : "bg-[#fee2e2] text-[#DC2626]"
                  }`}
                >
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#23241B] dark:text-[#f2f4ed] leading-tight">
                    {isTeraWalletActive ? "Generate TeraWallet Refund" : "TeraWallet Plugin Required"}
                  </h3>
                  <p className="text-xs text-[#6f7060] dark:text-[#a1a196] mt-0.5">
                    {isTeraWalletActive
                      ? "Issue store credit directly to customer digital wallet"
                      : "Mandate violation: WooCommerce refund blocked"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsRefundModalOpen(false);
                  onClearExternalRefundOrder?.();
                }}
                className="w-8 h-8 rounded-full border border-[#ded8ce] dark:border-[#33372c] hover:bg-[#f6f2ea] dark:hover:bg-[#252820] flex items-center justify-center text-[#6f7060] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* MANDATE BLOCK: When TeraWallet is NOT installed */}
            {!isTeraWalletActive ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#fee2e2] dark:bg-[#381a1a] border border-[#fca5a5] dark:border-[#632424] text-xs text-[#991b1b] dark:text-[#fca5a5] space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>Refund Cannot Be Generated</span>
                  </div>
                  <p className="leading-relaxed">
                    There is a strict mandate on WooCommerce stores: <strong>Customer refunds will only be generated if the TeraWallet plugin is installed and activated on your website.</strong> Direct payment gateway reversals are prohibited.
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f7f5ed] dark:bg-[#20231b] border border-[#ded8ce] dark:border-[#33372c] p-4 text-xs space-y-2.5">
                  <h4 className="font-extrabold text-[#23241B] dark:text-[#f2f4ed]">
                    How to install TeraWallet on your website:
                  </h4>
                  <ol className="list-decimal list-inside space-y-1.5 text-[#52524e] dark:text-[#c4c2ba]">
                    <li>Log into your WordPress Admin dashboard (<code className="font-mono">{storeDomain}/wp-admin</code>)</li>
                    <li>Go to <strong>Plugins</strong> ➔ <strong>Add New</strong></li>
                    <li>Search for <strong>"TeraWallet"</strong> (by WPOpenVerse)</li>
                    <li>Click <strong>Install Now</strong> and then <strong>Activate</strong></li>
                    <li>Click <strong>"Verify Installation"</strong> below to unlock refunds</li>
                  </ol>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleVerifyPlugin(false)}
                    disabled={isVerifyingPlugin}
                    className="flex-1 py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingPlugin ? "animate-spin" : ""}`} />
                    <span>Verify Installation</span>
                  </button>

                  <a
                    href="https://wordpress.org/plugins/woo-wallet/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-3 px-4 rounded-xl bg-white dark:bg-[#1f221b] border border-[#ded8ce] dark:border-[#33372c] hover:bg-[#f6f2ea] text-xs font-bold text-[#2563EB] flex items-center justify-center gap-1.5 transition shadow-xs"
                  >
                    <span>Download Plugin ↗</span>
                  </a>
                </div>

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => handleVerifyPlugin(true)}
                    className="text-[11px] font-bold text-[#6f7060] hover:text-[#23241B] dark:hover:text-white underline"
                  >
                    Bypass for testing (Simulate TeraWallet Active)
                  </button>
                </div>
              </div>
            ) : (
              /* REFUND FORM: When TeraWallet IS installed */
              <div className="space-y-4">
                {/* Target Order Selection */}
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-[#6f7060] mb-1.5">
                    Select Order to Refund
                  </label>
                  <select
                    value={selectedRefundOrder?.id || ""}
                    onChange={(e) => {
                      const matched = rawOrders.find((o) => String(o.id) === e.target.value);
                      setSelectedRefundOrder(matched || null);
                      if (matched) {
                        setRefundAmount(String(matched.total || "0"));
                      }
                    }}
                    className="w-full h-11 px-3.5 rounded-xl border border-[#ded8ce] dark:border-[#33372c] bg-white dark:bg-[#1f221b] text-xs font-bold text-[#23241B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  >
                    <option value="" disabled>-- Select a customer order --</option>
                    {rawOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        #{o.order_number || o.id} - {o.customer_name || "Customer"} ({currencySymbol}{o.total})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedRefundOrder && (
                  <div className="p-3.5 rounded-xl bg-[#eff5fc] dark:bg-[#14233a] border border-[#bfdbfe] dark:border-[#1e3a5f] text-xs space-y-1">
                    <div className="flex justify-between font-bold">
                      <span className="text-[#1e3a8a] dark:text-[#93c5fd]">Order Total:</span>
                      <span className="font-mono text-[#1e3a8a] dark:text-[#93c5fd]">
                        {currencySymbol}{parseFloat(selectedRefundOrder.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#60a5fa] text-[11px]">
                      <span>Customer:</span>
                      <span>{selectedRefundOrder.customer_name || "Customer"} ({selectedRefundOrder.customer_email || selectedRefundOrder.billing?.email || "No email"})</span>
                    </div>
                  </div>
                )}

                {/* Refund Amount */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-[#6f7060]">
                      Refund Amount ({currencySymbol})
                    </label>
                    {selectedRefundOrder && (
                      <button
                        type="button"
                        onClick={() => setRefundAmount(String(selectedRefundOrder.total || "0"))}
                        className="text-[10.5px] font-bold text-[#2563EB] hover:underline"
                      >
                        Set Full Amount
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6f7060]">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      className="w-full h-11 pl-8 pr-3.5 rounded-xl border border-[#ded8ce] dark:border-[#33372c] bg-white dark:bg-[#1f221b] text-sm font-bold text-[#23241B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                  </div>
                </div>

                {/* Refund Reason */}
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-[#6f7060] mb-1.5">
                    Refund Reason
                  </label>
                  <select
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-[#ded8ce] dark:border-[#33372c] bg-white dark:bg-[#1f221b] text-xs font-bold text-[#23241B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  >
                    <option value="Customer requested return">Customer requested return</option>
                    <option value="Item out of stock / inventory void">Item out of stock / inventory void</option>
                    <option value="Defective or damaged product">Defective or damaged product</option>
                    <option value="Size or color exchange balance">Size or color exchange balance</option>
                    <option value="Goodwill store credit">Goodwill store credit</option>
                  </select>
                </div>

                {/* Restock checkbox */}
                <label className="flex items-center gap-2.5 text-xs text-[#23241B] dark:text-[#f2f4ed] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={restockInventory}
                    onChange={(e) => setRestockInventory(e.target.checked)}
                    className="w-4 h-4 rounded text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <span>Restock refunded order items back to store inventory</span>
                </label>

                {/* Wallet Credit Notice */}
                <div className="p-3 rounded-xl bg-[#f0fdf4] dark:bg-[#132817] border border-[#bbf7d0] dark:border-[#204928] text-[11px] text-[#166534] dark:text-[#86efac] flex items-center gap-2">
                  <Wallet className="w-4 h-4 flex-shrink-0" />
                  <span>
                    The amount will be credited to the customer&apos;s <strong>TeraWallet</strong> store balance instantly.
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRefundModalOpen(false);
                      onClearExternalRefundOrder?.();
                    }}
                    className="py-3 px-4 rounded-xl border border-[#ded8ce] dark:border-[#33372c] text-xs font-bold hover:bg-[#f6f2ea] dark:hover:bg-[#252820] text-[#23241B] dark:text-white transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmitRefund}
                    disabled={isSubmittingRefund || !selectedRefundOrder || !refundAmount}
                    className="flex-1 py-3 px-4 rounded-xl bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-40 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition"
                  >
                    {isSubmittingRefund ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    )}
                    <span>Credit to Customer&apos;s TeraWallet</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
