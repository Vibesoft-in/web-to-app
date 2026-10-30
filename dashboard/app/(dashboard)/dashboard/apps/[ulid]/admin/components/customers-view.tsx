"use client";

import { useState, useMemo } from "react";
import {
  Users,
  Search,
  Download,
  Mail,
  ShoppingBag,
  ExternalLink,
  X,
  ChevronRight,
  MapPin,
  Calendar,
  CreditCard,
  DollarSign,
} from "lucide-react";

interface CustomersViewProps {
  rawCustomers: any[];
  rawOrders: any[];
  currencySymbol: string;
  storeDomain: string;
  storeUrl?: string;
  onSelectOrder: (order: any) => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

export function CustomersView({
  rawCustomers,
  rawOrders,
  currencySymbol,
  storeDomain,
  storeUrl,
  onSelectOrder,
  showToast,
}: CustomersViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  // Filter customers by search query
  const filteredCustomers = useMemo(() => {
    return rawCustomers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const nameMatch = (c.name || "").toLowerCase().includes(q);
      const emailMatch = (c.email || "").toLowerCase().includes(q);
      const cityMatch = (c.city || "").toLowerCase().includes(q);
      return nameMatch || emailMatch || cityMatch;
    });
  }, [rawCustomers, searchQuery]);

  // Orders for selected customer
  const customerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    const cEmail = (selectedCustomer.email || "").toLowerCase().trim();
    const cName = (selectedCustomer.name || "").toLowerCase().trim();
    return rawOrders.filter((o) => {
      const oEmail = (o.customer_email || o.billing?.email || "").toLowerCase().trim();
      const oName = (o.customer_name || "").toLowerCase().trim();
      return (cEmail && oEmail === cEmail) || (cName && oName === cName);
    });
  }, [selectedCustomer, rawOrders]);

  // CSV Export
  const handleExportCsv = () => {
    if (!rawCustomers.length) {
      showToast("No customer records to export.", "info");
      return;
    }
    const headers = "Customer Name,Email,City,Orders Count,Total Spent,Currency\n";
    const rows = rawCustomers
      .map((c) => {
        const name = `"${(c.name || "Customer").replace(/"/g, '""')}"`;
        const email = `"${(c.email || "").replace(/"/g, '""')}"`;
        const city = `"${(c.city || "").replace(/"/g, '""')}"`;
        const orders = c.orders_count || 0;
        const spent = parseFloat(c.total_spent || "0");
        const curr = `"${currencySymbol.trim()}"`;
        return [name, email, city, orders, spent, curr].join(",");
      })
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(storeDomain || "store").replace(/\./g, "-")}-customers.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${rawCustomers.length} customer records to CSV!`, "success");
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--mav-muted)] mb-1">
            <span>Store Desk</span>
            <span>/</span>
            <span className="text-[var(--mav-text)]">Customers</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--mav-text)]">
            Store Customers &amp; Subscribers
          </h2>
          <p className="text-sm text-[var(--mav-muted)] mt-1">
            {rawCustomers.length} registered shoppers and accounts retrieved from <strong className="text-[var(--mav-text)]">{storeDomain}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-xl bg-white dark:bg-[#1f221b] border border-[var(--mav-line)] text-xs font-bold text-[var(--mav-text)] hover:bg-[var(--mav-surface-2)] transition shadow-xs flex items-center gap-1.5"
            title="Download CSV of customers"
          >
            <Download className="w-3.5 h-3.5 text-[var(--mav-muted)]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Toolbar / Search */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mav-muted)]" />
          <input
            type="search"
            placeholder="Search customer name, email, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-[var(--mav-surface)] border border-[var(--mav-line)] text-xs text-[var(--mav-text)] placeholder:text-[var(--mav-muted)] focus:outline-none focus:border-[var(--mav-primary)]"
          />
        </div>
      </div>

      {/* Customers Data Table */}
      <div className="rounded-[28px] bg-[var(--mav-surface)] border border-[var(--mav-line)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--mav-line)] text-[var(--mav-muted)] uppercase tracking-wider font-extrabold text-[11px] bg-[var(--mav-surface-2)]/60">
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Email Address</th>
                <th className="py-3.5 px-4">City / Region</th>
                <th className="py-3.5 px-4">Orders</th>
                <th className="py-3.5 px-4">Lifetime Spend</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--mav-line)]">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--mav-muted)]">
                    <Users className="w-10 h-10 mx-auto opacity-30 mb-2" />
                    <p className="font-bold text-sm">No customers found</p>
                    <p className="text-xs mt-0.5">Customer profiles automatically populate from website checkouts.</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const initials = (c.name || "C").slice(0, 2).toUpperCase();
                  const spent = parseFloat(c.total_spent || 0);

                  return (
                    <tr
                      key={c.id || c.email}
                      onClick={() => setSelectedCustomer(c)}
                      className="hover:bg-[var(--mav-surface-2)] transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#e5ede0] text-[#557e2a] font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                            {initials}
                          </div>
                          <div>
                            <span className="font-extrabold block text-[13px] text-[var(--mav-text)] group-hover:text-[var(--mav-primary)] transition">
                              {c.name || "Customer"}
                            </span>
                            <span className="text-[11px] text-[var(--mav-muted)] font-mono">
                              ID #{c.id || "Live"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[12px] text-[var(--mav-muted)]">
                        {c.email || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-[var(--mav-muted)] font-medium">
                        {c.city || "Online Store"}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[13px] text-[var(--mav-text)]">
                        {c.orders_count || 0}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[13px] text-[var(--mav-text)]">
                        {currencySymbol}{spent.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomer(c);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-[var(--mav-line)] bg-white dark:bg-[#1f221b] text-xs font-extrabold hover:bg-[var(--mav-well)] transition"
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CUSTOMER DETAIL SLIDE-OVER DRAWER ── */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[2px] flex justify-end animate-in fade-in"
          onClick={() => setSelectedCustomer(null)}
        >
          <div
            className="w-full max-w-[480px] bg-white border-l border-[#E6E3DC] shadow-2xl h-full flex flex-col justify-between overflow-hidden rounded-l-[32px] animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-6 sm:p-7 pb-4 border-b border-[#F0EEE8] flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-[#e5ede0] text-[#557e2a] font-extrabold text-base flex items-center justify-center flex-shrink-0">
                  {(selectedCustomer.name || "C").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl sm:text-2xl font-black text-[#23241B] tracking-tight leading-tight truncate">
                    {selectedCustomer.name || "Customer Profile"}
                  </h3>
                  <p className="text-xs text-[#6f7060] font-medium mt-0.5 truncate">
                    {selectedCustomer.email || "No email"} · {selectedCustomer.city || "Online Store"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="w-9 h-9 rounded-full border border-[#ded8ce] bg-white text-[#6f7060] hover:text-[#23241B] hover:bg-[#f6f2ea] flex items-center justify-center transition shadow-xs flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-6">
              {/* Lifetime Stats Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#faf8f4] border border-[#eeebe3] p-4">
                  <span className="text-xs text-[#6f7060] font-medium block">Lifetime Spend</span>
                  <span className="text-2xl font-black text-[#23241B] mt-1.5 block">
                    {currencySymbol}{parseFloat(selectedCustomer.total_spent || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="rounded-2xl bg-[#faf8f4] border border-[#eeebe3] p-4">
                  <span className="text-xs text-[#6f7060] font-medium block">Total Orders</span>
                  <span className="text-2xl font-black text-[#23241B] mt-1.5 block">
                    {selectedCustomer.orders_count || customerOrders.length || 0}
                  </span>
                </div>
              </div>

              {/* Contact Card */}
              <div className="rounded-2xl bg-[#faf8f4] border border-[#eeebe3] p-4 space-y-2.5 text-xs">
                <h4 className="font-extrabold uppercase tracking-wider text-[10px] text-[#6f7060]">
                  Contact &amp; Location
                </h4>
                <div className="flex items-center gap-2 text-[#23241B]">
                  <Mail className="w-3.5 h-3.5 text-[#557e2a]" />
                  <a href={`mailto:${selectedCustomer.email}`} className="font-bold hover:underline">
                    {selectedCustomer.email || "N/A"}
                  </a>
                </div>
                <div className="flex items-center gap-2 text-[#23241B]">
                  <MapPin className="w-3.5 h-3.5 text-[#557e2a]" />
                  <span>{selectedCustomer.city || selectedCustomer.address || "Online Store Customer"}</span>
                </div>
              </div>

              {/* Order History */}
              <div>
                <h4 className="font-extrabold uppercase tracking-wider text-[11px] text-[#6f7060] mb-3">
                  ORDER HISTORY ({customerOrders.length})
                </h4>

                {customerOrders.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-[#faf8f4] border border-dashed border-[#ded8ce] text-center text-xs text-[#6f7060]">
                    No recorded order history for this profile.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customerOrders.map((o) => (
                      <div
                        key={o.id}
                        onClick={() => {
                          setSelectedCustomer(null);
                          onSelectOrder(o);
                        }}
                        className="p-3.5 rounded-2xl bg-[#faf8f4] hover:bg-white border border-[#eeebe3] hover:border-[#557e2a] hover:shadow-xs transition cursor-pointer flex items-center justify-between gap-3 group"
                        title="Click to view order details"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-[#eff5ea] text-[#557e2a] flex items-center justify-center flex-shrink-0">
                            <ShoppingBag className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-black text-xs text-[#23241B] group-hover:text-[#557e2a] transition block truncate">
                              Order #{o.order_number || o.id}
                            </span>
                            <span className="text-[11px] text-[#6f7060] block mt-0.5">
                              {o.created_at ? new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recent"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs font-black text-[#23241B]">
                            {currencySymbol}{parseFloat(o.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#b5b3ab] group-hover:text-[#23241B] transition" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-5 sm:p-6 border-t border-[#F0EEE8] bg-white">
              <a
                href={`mailto:${selectedCustomer.email}?subject=Store Order Followup`}
                className="w-full py-3 px-4 rounded-2xl bg-[#557e2a] hover:bg-[#486b24] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition"
              >
                <Mail className="w-4 h-4" />
                <span>Send Customer an Email</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
