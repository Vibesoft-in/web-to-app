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
} from "lucide-react";

interface OrdersViewProps {
  rawOrders: any[];
  currencySymbol: string;
  storeDomain: string;
  storeUrl?: string;
  onSelectOrder: (order: any) => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  highlightedStage?: "paid" | "processing" | "packed" | "shipped" | null;
  onSelectStage?: (stage: "paid" | "processing" | "packed" | "shipped" | null) => void;
  orderStatusOverrides?: Record<string, string>;
  onUpdateOrderStatus?: (orderId: string, newStatus: "paid" | "processing" | "packed" | "shipped" | "delivered") => void;
  onResetOrderStatuses?: () => void;
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
}: OrdersViewProps) {
  const [subTab, setSubTab] = useState<"fulfil" | "all" | "returns">("fulfil");
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | "web" | "app" | "wholesale">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "processing" | "pending">("all");
  const [displayLimit, setDisplayLimit] = useState(25);
  const [activeHighlight, setActiveHighlight] = useState<"paid" | "processing" | "packed" | "shipped" | null>(
    highlightedStage ?? null
  );

  // Sync when prop changes and auto-scroll to the highlighted Kanban column
  useEffect(() => {
    if (highlightedStage !== undefined) {
      setActiveHighlight(highlightedStage);
      if (highlightedStage) {
        setSubTab("fulfil");
        if (highlightedStage === "paid") setStatusFilter("pending");
        else if (highlightedStage === "processing" || highlightedStage === "packed") setStatusFilter("processing");
        else if (highlightedStage === "shipped") setStatusFilter("completed");

        const timer = setTimeout(() => {
          const el = document.getElementById(`kanban-stage-${highlightedStage}`);
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

  // Drag and drop state
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<"paid" | "processing" | "packed" | "shipped" | null>(null);

  const STAGE_TITLES: Record<string, string> = {
    paid: "Paid Orders",
    processing: "Roasting / Prep",
    packed: "Packed in Box",
    shipped: "Shipped Today",
    delivered: "Delivered",
  };

  const getOrderStatus = (order: any) => {
    const id = String(order.id);
    const num = String(order.order_number || "");
    if (orderStatusOverrides[id]) return orderStatusOverrides[id];
    if (num && orderStatusOverrides[num]) return orderStatusOverrides[num];
    if (order._statusOverride) return order._statusOverride;
    const st = String(order.status || "processing").toLowerCase();
    if (st === "pending" || st === "on-hold" || st === "paid") return "paid";
    if (st === "processing") return "processing";
    if (st === "packed") return "packed";
    if (st === "completed" || st === "shipped" || st === "delivered") return "shipped";
    return "paid";
  };

  const updateOrderStatus = (orderId: string, newStatus: "paid" | "processing" | "packed" | "shipped" | "delivered") => {
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

  const handleDropOnStage = (targetStage: "paid" | "processing" | "packed" | "shipped") => {
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
    let next: "paid" | "processing" | "packed" | "shipped" = "processing";
    if (current === "paid") next = "processing";
    else if (current === "processing") next = "packed";
    else if (current === "packed") next = "shipped";
    else if (current === "shipped") next = "shipped";

    updateOrderStatus(String(order.id), next);
    showToast(`Order #${order.order_number || order.id} moved to ${STAGE_TITLES[next]}!`, "success");
  };

  const handleBatchDispatch = () => {
    const packedOrders = rawOrders.filter((o) => getOrderStatus(o) === "packed");
    if (packedOrders.length === 0) {
      showToast("No packed orders ready for dispatch.", "info");
      return;
    }
    packedOrders.forEach((o) => {
      updateOrderStatus(String(o.id), "shipped");
    });
    showToast(`Dispatched ${packedOrders.length} packed orders to courier!`, "success");
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
        statusFilter === "all" ||
        (statusFilter === "completed" && st === "shipped") ||
        (statusFilter === "processing" && (st === "processing" || st === "packed")) ||
        (statusFilter === "pending" && st === "paid");

      return matchesSearch && matchesChannel && matchesStatus;
    });
  }, [rawOrders, searchQuery, channelFilter, statusFilter, orderStatusOverrides]);

  // Grouped for Kanban
  const kanbanColumns = useMemo(() => {
    const paid: any[] = [];
    const processing: any[] = [];
    const packed: any[] = [];
    const shipped: any[] = [];

    rawOrders.forEach((o) => {
      const st = getOrderStatus(o);
      if (st === "paid") paid.push(o);
      else if (st === "processing") processing.push(o);
      else if (st === "packed") packed.push(o);
      else shipped.push(o);
    });

    return { paid, processing, packed, shipped };
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

      {/* ── SUB-VIEW 1: FULFIL KANBAN BOARD (EXACT MAVORA BOARD) ── */}
      {subTab === "fulfil" && (
        <div className="space-y-4">
          {/* Active Highlight Stage Notice Bar */}
          {activeHighlight && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-blue-500/10 border border-[#E6E3DC] shadow-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#557e2a] opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#557e2a]" />
                </span>
                <div>
                  <p className="text-xs sm:text-sm font-extrabold text-[#23241B]">
                    Active Fulfilment Stage:{" "}
                    <span className="capitalize text-[#557e2a] font-black underline decoration-2">
                      {activeHighlight === "paid"
                        ? "Paid (Awaiting Packing)"
                        : activeHighlight === "processing"
                        ? "Processing (Roasting / Prep)"
                        : activeHighlight === "packed"
                        ? "Packed (Ready for Courier)"
                        : "Shipped (Handed to Courier)"}
                    </span>
                  </p>
                  <p className="text-[11px] text-[#6f7060]">
                    Highlighted from your Fulfilment Overview. Click another column or reset to view all.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {(["paid", "processing", "packed", "shipped"] as const).map((stageKey) => (
                  <button
                    key={stageKey}
                    type="button"
                    onClick={() => {
                      setActiveHighlight(stageKey);
                      onSelectStage?.(stageKey);
                      const el = document.getElementById(`kanban-stage-${stageKey}`);
                      el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold capitalize transition ${
                      activeHighlight === stageKey
                        ? "bg-[#23241B] text-white shadow-xs"
                        : "bg-white border border-[#ded8ce] text-[#23241B] hover:bg-[#f6f2ea]"
                    }`}
                  >
                    {stageKey}
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

          {/* Top Courier Dispatch Schedule Bar */}
          <div className="p-4 rounded-2xl bg-[#FFFCF9] border border-[#E6E3DC] shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#eff5ea] text-[#557e2a] flex items-center justify-center flex-shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#23241B] block">
                  Courier Pickup at 4:00 PM
                </span>
                <span className="text-[11px] text-[#6f7060]">
                  {kanbanColumns.packed.length} packed orders ready to hand over. {kanbanColumns.shipped.length} orders dispatched today.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBatchDispatch}
              disabled={kanbanColumns.packed.length === 0}
              className="px-4 py-2 rounded-xl bg-[#557e2a] text-white text-xs font-extrabold hover:bg-[#486b24] transition shadow-xs flex items-center gap-1.5 disabled:opacity-40"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Dispatch Packed Orders ({kanbanColumns.packed.length})</span>
            </button>
          </div>

          {/* Drag & Drop Hint Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-[#f7f5ed] dark:bg-[#1f221b] border border-[#ded8ce] dark:border-[#33372c] text-xs">
            <div className="flex items-center gap-2 text-[#23241B] dark:text-[#f3f0e8]">
              <MoveHorizontal className="w-4 h-4 text-[#557e2a] flex-shrink-0 animate-pulse" />
              <span>
                <strong>Drag &amp; Drop:</strong> Drag any order card between columns to instantly update its status.
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

          {/* 4 Kanban Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
            {/* Column 1: Paid */}
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
              className={`rounded-[24px] bg-[#FFFCF9] border p-4 shadow-sm flex flex-col min-h-[520px] transition-all duration-200 ${
                dragOverColumn === "paid"
                  ? "ring-4 ring-offset-2 ring-[#4D86D8] border-[#4D86D8] bg-[#eff5fc] scale-[1.01]"
                  : activeHighlight === "paid"
                  ? "ring-4 ring-[#4D86D8] border-[#4D86D8] shadow-2xl scale-[1.01] bg-gradient-to-b from-[#eff5fc] via-[#FFFCF9] to-[#FFFCF9]"
                  : activeHighlight
                  ? "border-[#E6E3DC] opacity-75 hover:opacity-100"
                  : "border-[#E6E3DC]"
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#ECE9E2]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4D86D8]" />
                  <h3 className="font-extrabold text-sm text-[#23241B]">Paid Orders</h3>
                  {activeHighlight === "paid" && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#4D86D8] text-white animate-pulse">
                      Selected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black font-mono px-2 py-0.5 rounded-full bg-[#eff5fc] text-[#4D86D8]">
                    {kanbanColumns.paid.length}
                  </span>
                  {activeHighlight === "paid" && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveHighlight(null);
                        onSelectStage?.(null);
                      }}
                      className="text-[10px] text-[#6f7060] hover:text-[#23241B] font-bold underline ml-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-2.5 flex-1 flex flex-col">
                {dragOverColumn === "paid" && (
                  <div className="p-3 rounded-2xl border-2 border-dashed border-[#4D86D8] bg-[#eff5fc] text-center text-xs font-extrabold text-[#4D86D8] flex items-center justify-center gap-2 shadow-xs animate-pulse">
                    <span>⬇ Drop here to mark as Paid Orders</span>
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
                        className={`p-3.5 rounded-2xl bg-white border transition select-none cursor-grab active:cursor-grabbing group ${
                          isDragging
                            ? "opacity-35 scale-[0.98] border-dashed border-[#4D86D8] ring-2 ring-[#4D86D8]/40 shadow-none"
                            : "border-[#E6E3DC] hover:border-[#4D86D8] hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-1.5">
                            <GripVertical className="w-3.5 h-3.5 text-[#b5b3ab] group-hover:text-[#4D86D8] mt-0.5 flex-shrink-0 cursor-grab" />
                            <div>
                              <span className="font-mono font-bold text-xs text-[#23241B] block">
                                #{o.order_number || o.id}
                              </span>
                              <span className="font-extrabold text-[13px] text-[#23241B] block mt-0.5 group-hover:text-[#4D86D8] transition truncate max-w-[150px]">
                                {o.customer_name || "Customer"}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-black font-mono text-[#23241B]">
                            {currencySymbol}{parseFloat(o.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-[#F0EEE8] flex items-center justify-between text-[11px] text-[#6f7060]">
                          <span>{o.items_count || (o.line_items && o.line_items.length) || 1} items</span>
                          <button
                            type="button"
                            onClick={(e) => handleAdvanceOrder(e, o)}
                            className="px-2.5 py-1 rounded-lg bg-[#fef3ec] text-[#ef8a45] hover:bg-[#ef8a45] hover:text-white font-extrabold text-[10px] transition flex items-center gap-1"
                          >
                            <span>To Roasting</span>
                            <span>➔</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Column 2: Processing / Roasting */}
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
              className={`rounded-[24px] bg-[#FFFCF9] border p-4 shadow-sm flex flex-col min-h-[520px] transition-all duration-200 ${
                dragOverColumn === "processing"
                  ? "ring-4 ring-offset-2 ring-[#EF8A45] border-[#EF8A45] bg-[#fef3ec] scale-[1.01]"
                  : activeHighlight === "processing"
                  ? "ring-4 ring-[#EF8A45] border-[#EF8A45] shadow-2xl scale-[1.01] bg-gradient-to-b from-[#fef3ec] via-[#FFFCF9] to-[#FFFCF9]"
                  : activeHighlight
                  ? "border-[#E6E3DC] opacity-75 hover:opacity-100"
                  : "border-[#E6E3DC]"
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#ECE9E2]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EF8A45]" />
                  <h3 className="font-extrabold text-sm text-[#23241B]">Roasting / Prep</h3>
                  {activeHighlight === "processing" && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#EF8A45] text-white animate-pulse">
                      Selected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black font-mono px-2 py-0.5 rounded-full bg-[#fef3ec] text-[#EF8A45]">
                    {kanbanColumns.processing.length}
                  </span>
                  {activeHighlight === "processing" && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveHighlight(null);
                        onSelectStage?.(null);
                      }}
                      className="text-[10px] text-[#6f7060] hover:text-[#23241B] font-bold underline ml-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-2.5 flex-1 flex flex-col">
                {dragOverColumn === "processing" && (
                  <div className="p-3 rounded-2xl border-2 border-dashed border-[#EF8A45] bg-[#fef3ec] text-center text-xs font-extrabold text-[#EF8A45] flex items-center justify-center gap-2 shadow-xs animate-pulse">
                    <span>⬇ Drop here to mark as Roasting / Prep</span>
                  </div>
                )}
                {kanbanColumns.processing.length === 0 ? (
                  <p className="text-xs text-[#9a9c8f] italic py-8 text-center my-auto">Batch clear</p>
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
                        className={`p-3.5 rounded-2xl bg-white border transition select-none cursor-grab active:cursor-grabbing group ${
                          isDragging
                            ? "opacity-35 scale-[0.98] border-dashed border-[#EF8A45] ring-2 ring-[#EF8A45]/40 shadow-none"
                            : "border-[#E6E3DC] hover:border-[#EF8A45] hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-1.5">
                            <GripVertical className="w-3.5 h-3.5 text-[#b5b3ab] group-hover:text-[#EF8A45] mt-0.5 flex-shrink-0 cursor-grab" />
                            <div>
                              <span className="font-mono font-bold text-xs text-[#23241B] block">
                                #{o.order_number || o.id}
                              </span>
                              <span className="font-extrabold text-[13px] text-[#23241B] block mt-0.5 group-hover:text-[#EF8A45] transition truncate max-w-[150px]">
                                {o.customer_name || "Customer"}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-black font-mono text-[#23241B]">
                            {currencySymbol}{parseFloat(o.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-[#F0EEE8] flex items-center justify-between text-[11px] text-[#6f7060]">
                          <span>{o.items_count || (o.line_items && o.line_items.length) || 1} items</span>
                          <button
                            type="button"
                            onClick={(e) => handleAdvanceOrder(e, o)}
                            className="px-2.5 py-1 rounded-lg bg-[#fdf6e6] text-[#caa227] hover:bg-[#caa227] hover:text-white font-extrabold text-[10px] transition flex items-center gap-1"
                          >
                            <span>To Packed</span>
                            <span>➔</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Column 3: Packed */}
            <div
              id="kanban-stage-packed"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverColumn !== "packed") setDragOverColumn("packed");
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                if (dragOverColumn !== "packed") setDragOverColumn("packed");
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverColumn(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDropOnStage("packed");
              }}
              className={`rounded-[24px] bg-[#FFFCF9] border p-4 shadow-sm flex flex-col min-h-[520px] transition-all duration-200 ${
                dragOverColumn === "packed"
                  ? "ring-4 ring-offset-2 ring-[#CAA227] border-[#CAA227] bg-[#fdf6e6] scale-[1.01]"
                  : activeHighlight === "packed"
                  ? "ring-4 ring-[#CAA227] border-[#CAA227] shadow-2xl scale-[1.01] bg-gradient-to-b from-[#fdf6e6] via-[#FFFCF9] to-[#FFFCF9]"
                  : activeHighlight
                  ? "border-[#E6E3DC] opacity-75 hover:opacity-100"
                  : "border-[#E6E3DC]"
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#ECE9E2]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#CAA227]" />
                  <h3 className="font-extrabold text-sm text-[#23241B]">Packed in Box</h3>
                  {activeHighlight === "packed" && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#CAA227] text-white animate-pulse">
                      Selected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black font-mono px-2 py-0.5 rounded-full bg-[#fdf6e6] text-[#CAA227]">
                    {kanbanColumns.packed.length}
                  </span>
                  {activeHighlight === "packed" && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveHighlight(null);
                        onSelectStage?.(null);
                      }}
                      className="text-[10px] text-[#6f7060] hover:text-[#23241B] font-bold underline ml-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-2.5 flex-1 flex flex-col">
                {dragOverColumn === "packed" && (
                  <div className="p-3 rounded-2xl border-2 border-dashed border-[#CAA227] bg-[#fdf6e6] text-center text-xs font-extrabold text-[#CAA227] flex items-center justify-center gap-2 shadow-xs animate-pulse">
                    <span>⬇ Drop here to mark as Packed in Box</span>
                  </div>
                )}
                {kanbanColumns.packed.length === 0 ? (
                  <p className="text-xs text-[#9a9c8f] italic py-8 text-center my-auto">No parcels packed</p>
                ) : (
                  kanbanColumns.packed.map((o) => {
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
                        className={`p-3.5 rounded-2xl bg-white border transition select-none cursor-grab active:cursor-grabbing group ${
                          isDragging
                            ? "opacity-35 scale-[0.98] border-dashed border-[#CAA227] ring-2 ring-[#CAA227]/40 shadow-none"
                            : "border-[#E6E3DC] hover:border-[#CAA227] hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-1.5">
                            <GripVertical className="w-3.5 h-3.5 text-[#b5b3ab] group-hover:text-[#CAA227] mt-0.5 flex-shrink-0 cursor-grab" />
                            <div>
                              <span className="font-mono font-bold text-xs text-[#23241B] block">
                                #{o.order_number || o.id}
                              </span>
                              <span className="font-extrabold text-[13px] text-[#23241B] block mt-0.5 group-hover:text-[#CAA227] transition truncate max-w-[150px]">
                                {o.customer_name || "Customer"}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-black font-mono text-[#23241B]">
                            {currencySymbol}{parseFloat(o.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-[#F0EEE8] flex items-center justify-between text-[11px] text-[#6f7060]">
                          <span className="font-semibold text-emerald-700">Slip printed</span>
                          <button
                            type="button"
                            onClick={(e) => handleAdvanceOrder(e, o)}
                            className="px-2.5 py-1 rounded-lg bg-[#edf5ee] text-[#296d43] hover:bg-[#296d43] hover:text-white font-extrabold text-[10px] transition flex items-center gap-1"
                          >
                            <span>To Courier</span>
                            <span>➔</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Column 4: Shipped */}
            <div
              id="kanban-stage-shipped"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverColumn !== "shipped") setDragOverColumn("shipped");
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                if (dragOverColumn !== "shipped") setDragOverColumn("shipped");
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverColumn(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDropOnStage("shipped");
              }}
              className={`rounded-[24px] bg-[#FFFCF9] border p-4 shadow-sm flex flex-col min-h-[520px] transition-all duration-200 ${
                dragOverColumn === "shipped"
                  ? "ring-4 ring-offset-2 ring-[#718D32] border-[#718D32] bg-[#edf5ee] scale-[1.01]"
                  : activeHighlight === "shipped"
                  ? "ring-4 ring-[#718D32] border-[#718D32] shadow-2xl scale-[1.01] bg-gradient-to-b from-[#edf5ee] via-[#FFFCF9] to-[#FFFCF9]"
                  : activeHighlight
                  ? "border-[#E6E3DC] opacity-75 hover:opacity-100"
                  : "border-[#E6E3DC]"
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#ECE9E2]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#718D32]" />
                  <h3 className="font-extrabold text-sm text-[#23241B]">Shipped Today</h3>
                  {activeHighlight === "shipped" && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#718D32] text-white animate-pulse">
                      Selected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black font-mono px-2 py-0.5 rounded-full bg-[#edf5ee] text-[#296d43]">
                    {kanbanColumns.shipped.length}
                  </span>
                  {activeHighlight === "shipped" && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveHighlight(null);
                        onSelectStage?.(null);
                      }}
                      className="text-[10px] text-[#6f7060] hover:text-[#23241B] font-bold underline ml-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-2.5 flex-1 flex flex-col">
                {dragOverColumn === "shipped" && (
                  <div className="p-3 rounded-2xl border-2 border-dashed border-[#718D32] bg-[#edf5ee] text-center text-xs font-extrabold text-[#718D32] flex items-center justify-center gap-2 shadow-xs animate-pulse">
                    <span>⬇ Drop here to mark as Shipped Today</span>
                  </div>
                )}
                {kanbanColumns.shipped.length === 0 ? (
                  <p className="text-xs text-[#9a9c8f] italic py-8 text-center my-auto">No orders shipped yet</p>
                ) : (
                  kanbanColumns.shipped.map((o) => {
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
                        className={`p-3.5 rounded-2xl bg-white border transition select-none cursor-grab active:cursor-grabbing group ${
                          isDragging
                            ? "opacity-35 scale-[0.98] border-dashed border-[#718D32] ring-2 ring-[#718D32]/40 shadow-none"
                            : "border-[#E6E3DC] hover:border-[#718D32] hover:shadow-md opacity-90 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-1.5">
                            <GripVertical className="w-3.5 h-3.5 text-[#b5b3ab] group-hover:text-[#557e2a] mt-0.5 flex-shrink-0 cursor-grab" />
                            <div>
                              <span className="font-mono font-bold text-xs text-[#23241B] block">
                                #{o.order_number || o.id}
                              </span>
                              <span className="font-extrabold text-[13px] text-[#23241B] block mt-0.5 group-hover:text-[#557e2a] transition truncate max-w-[150px]">
                                {o.customer_name || "Customer"}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-black font-mono text-[#23241B]">
                            {currencySymbol}{parseFloat(o.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-[#F0EEE8] flex items-center justify-between text-[11px] text-[#6f7060]">
                          <span className="inline-flex items-center gap-1 text-[#296d43] font-bold">
                            <Check className="w-3 h-3" />
                            <span>With Courier</span>
                          </span>
                          <span className="text-[10px] text-[#9a9c8f]">
                            {o.created_at ? new Date(o.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Today"}
                          </span>
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

              {/* Status filter */}
              <div className="flex items-center gap-1 p-1 bg-[var(--mav-surface)] border border-[var(--mav-line)] rounded-xl text-xs font-bold">
                {[
                  { id: "all", label: "All Statuses" },
                  { id: "processing", label: "Processing" },
                  { id: "completed", label: "Shipped" },
                  { id: "pending", label: "Pending" },
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
                              <span className={`w-1.5 h-1.5 rounded-full ${channel.includes("App") ? "bg-[#EF8A45]" : "bg-[#718D32]"}`} />
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
                                st === "shipped"
                                  ? "bg-[#edf5ee] text-[#296d43]"
                                  : st === "processing"
                                  ? "bg-[#fef3ec] text-[#ef8b48]"
                                  : st === "packed"
                                  ? "bg-[#fdf6e6] text-[#caa227]"
                                  : "bg-[#eff5fc] text-[#4b84d4]"
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              <span className="capitalize">{st === "shipped" ? "Delivered" : st}</span>
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

      {/* ── SUB-VIEW 3: RETURNS & REFUNDS ── */}
      {subTab === "returns" && (
        <div className="rounded-[28px] bg-[var(--mav-surface)] border border-[var(--mav-line)] p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#fdeeed] text-[#d9534f] flex items-center justify-center flex-shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[var(--mav-text)]">
                Returns &amp; Store Credits
              </h3>
              <p className="text-xs text-[var(--mav-muted)]">
                Completed refunds and replacement requests processed for {storeDomain}.
              </p>
            </div>
          </div>

          <div className="border-t border-[var(--mav-line)] pt-4">
            {rawOrders.filter((o) => o.status === "refunded" || o.status === "cancelled").length === 0 ? (
              <div className="py-12 text-center text-[var(--mav-muted)]">
                <Check className="w-10 h-10 mx-auto text-[#557e2a] opacity-60 mb-2" />
                <p className="font-bold text-sm text-[var(--mav-text)]">Zero active returns or disputes</p>
                <p className="text-xs mt-0.5">Customer satisfaction is at 100% across all recent dispatches.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--mav-line)]">
                {rawOrders
                  .filter((o) => o.status === "refunded" || o.status === "cancelled")
                  .map((o) => (
                    <div key={o.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold">Order #{o.order_number || o.id}</span>
                        <span className="text-[var(--mav-muted)] block mt-0.5">Customer: {o.customer_name}</span>
                      </div>
                      <span className="font-mono font-bold text-[#d9534f]">
                        -{currencySymbol}{o.total}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
