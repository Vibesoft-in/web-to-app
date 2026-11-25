"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  X,
  User,
  Smartphone,
  CreditCard,
  Cpu,
  Building2,
  Receipt,
  Ticket,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: any, recordId?: string) => void;
}

interface SearchRecord {
  id: string;
  category: "customers" | "apps" | "tenants" | "orders" | "builds" | "tickets";
  title: string;
  subtitle: string;
  meta: string;
  statusBadge?: string;
  badgeColor?: string;
}

const MOCK_INDEX: SearchRecord[] = [
  // Customers
  {
    id: "usr_1",
    category: "customers",
    title: "Super Admin",
    subtitle: "admin@webintoapp.com • +91 9876543210",
    meta: "Tenant #1 (Appify HQ) • Owner",
    statusBadge: "Active",
    badgeColor: "bg-emerald-100 text-emerald-800",
  },
  {
    id: "usr_2",
    category: "customers",
    title: "Sanskriti Mishra",
    subtitle: "sanskriti123@gmail.com • +91 9528109040",
    meta: "Tenant #2 (Sanskriti Store) • Owner",
    statusBadge: "Active",
    badgeColor: "bg-emerald-100 text-emerald-800",
  },
  {
    id: "usr_3",
    category: "customers",
    title: "Rohan Sharma",
    subtitle: "rohan.sharma@example.com • +91 9811223344",
    meta: "Tenant #3 (Rohan Boutique) • Owner",
    statusBadge: "Pending Verification",
    badgeColor: "bg-amber-100 text-amber-800",
  },

  // Apps
  {
    id: "app_1",
    category: "apps",
    title: "Fashion Hub Mobile",
    subtitle: "ULID: 01HZX87K99 • Package: com.fashionhub.app",
    meta: "WooCommerce • v1.0.4 • Theme: Luxury Boutique",
    statusBadge: "Live",
    badgeColor: "bg-emerald-100 text-emerald-800",
  },
  {
    id: "app_2",
    category: "apps",
    title: "Sanskriti Luxe App",
    subtitle: "ULID: 01J8Y29ZZ1 • Package: com.sanskriti.store",
    meta: "Shopify • v1.0.0 • Theme: Modern Retail",
    statusBadge: "Building",
    badgeColor: "bg-indigo-100 text-indigo-800",
  },
  {
    id: "app_3",
    category: "apps",
    title: "Vintage Denim Store",
    subtitle: "ULID: 01K7T91PP4 • Package: com.vintagedenim.mobile",
    meta: "WooCommerce • Draft Stage",
    statusBadge: "Suspended",
    badgeColor: "bg-rose-100 text-rose-800",
  },

  // Tenants
  {
    id: "ten_1",
    category: "tenants",
    title: "Appify HQ Organization",
    subtitle: "Tenant ID: #1 • Domain: appify.local",
    meta: "3 Apps Created • VIP Unlimited Tier",
    statusBadge: "Active",
    badgeColor: "bg-emerald-100 text-emerald-800",
  },
  {
    id: "ten_2",
    category: "tenants",
    title: "Sanskriti Store Global",
    subtitle: "Tenant ID: #2 • Domain: sanskritistore.com",
    meta: "1 App Created • Growth Fashion Plan",
    statusBadge: "Active",
    badgeColor: "bg-emerald-100 text-emerald-800",
  },

  // Orders & Payments
  {
    id: "ord_1",
    category: "orders",
    title: "Order #ORD-353212295512",
    subtitle: "Razorpay Order: order_Rpz99182 • Pay ID: pay_Kj99102",
    meta: "Invoice #INV-2026-089 • ₹14,999 Enterprise Tier",
    statusBadge: "Paid",
    badgeColor: "bg-emerald-100 text-emerald-800",
  },
  {
    id: "ord_2",
    category: "orders",
    title: "Order #ORD-7729104419",
    subtitle: "Razorpay Order: order_Zx71822 • Pay ID: pay_Failed_002",
    meta: "Invoice #INV-2026-092 • ₹7,999 Growth Tier",
    statusBadge: "Failed",
    badgeColor: "bg-rose-100 text-rose-800",
  },

  // Builds
  {
    id: "bld_1",
    category: "builds",
    title: "Build #104 - Android Release APK",
    subtitle: "App: Sanskriti Luxe App • Code: 4 (v1.0.4)",
    meta: "Compiler output: 42.8 MB • Fastlane Sync",
    statusBadge: "Failed",
    badgeColor: "bg-rose-100 text-rose-800",
  },
  {
    id: "bld_2",
    category: "builds",
    title: "Build #103 - Google Play AAB Bundle",
    subtitle: "App: Fashion Hub Mobile • Code: 5 (v1.0.5)",
    meta: "Artifact Ready: signed_release.aab (34.1 MB)",
    statusBadge: "Ready",
    badgeColor: "bg-emerald-100 text-emerald-800",
  },

  // Support / Custom Quotes
  {
    id: "tkt_1",
    category: "tickets",
    title: "Custom Quote Ticket #TK-8491",
    subtitle: "Feature: Multi-warehouse B2B ERP Inventory Sync",
    meta: "Requester: sanskriti123@gmail.com • Budget: ₹35,000",
    statusBadge: "Pending Quote",
    badgeColor: "bg-amber-100 text-amber-800",
  },
];

export function GlobalSearchModal({
  isOpen,
  onClose,
  onNavigate,
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        // Toggle or open
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_INDEX.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.meta.toLowerCase().includes(q)
      );
    });
  }, [query, selectedCategory]);

  if (!isOpen) return null;

  const categories = [
    { id: "all", label: "All Attributes" },
    { id: "customers", label: "Customers" },
    { id: "apps", label: "Applications" },
    { id: "tenants", label: "Tenants" },
    { id: "orders", label: "Orders & Payments" },
    { id: "builds", label: "Builds" },
    { id: "tickets", label: "Custom Quotes" },
  ];

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "customers":
        return <User className="w-4 h-4 text-indigo-500" />;
      case "apps":
        return <Smartphone className="w-4 h-4 text-sky-500" />;
      case "tenants":
        return <Building2 className="w-4 h-4 text-purple-500" />;
      case "orders":
        return <Receipt className="w-4 h-4 text-emerald-500" />;
      case "builds":
        return <Cpu className="w-4 h-4 text-amber-500" />;
      default:
        return <Ticket className="w-4 h-4 text-rose-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Search Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across customer name, email, phone, Tenant ID, App ULID, package, Razorpay order..."
            className="w-full text-sm sm:text-base text-slate-900 placeholder-slate-400 focus:outline-none font-medium"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Chips */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-3 space-y-1">
          {filteredResults.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Search className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                No matching platform records found
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Try searching for a different name, email, transaction ID or package identifier.
              </p>
            </div>
          ) : (
            filteredResults.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onClose();
                  onNavigate(item.category, item.id);
                }}
                className="p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition cursor-pointer flex items-center justify-between gap-4 group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-slate-100 flex-shrink-0 mt-0.5">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition truncate">
                        {item.title}
                      </h4>
                      {item.statusBadge && (
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${item.badgeColor}`}
                        >
                          {item.statusBadge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5 font-mono">
                      {item.subtitle}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {item.meta}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-400 group-hover:text-indigo-600 transition flex-shrink-0">
                  <span className="text-xs font-semibold hidden sm:inline">
                    Open Record
                  </span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <b>{filteredResults.length}</b> platform matching records
          </span>
          <span className="font-mono text-[11px]">
            Press <b>ESC</b> to close
          </span>
        </div>
      </div>
    </div>
  );
}
