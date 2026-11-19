"use client";

import React, { useState } from "react";
import { AdminSidebar, AdminTab } from "./components/admin-sidebar";
import { AdminHeader } from "./components/admin-header";
import { GlobalSearchModal } from "./components/global-search-modal";
import { AdminOverview } from "./components/admin-overview";
import { AdminCustomers } from "./components/admin-customers";
import { AdminApplications } from "./components/admin-applications";
import { AdminRevenue } from "./components/admin-revenue";
import { AdminSecurity } from "./components/admin-security";
import { AdminIntelligence } from "./components/admin-intelligence";
import { AdminBuilds } from "./components/admin-builds";
import { AdminThemes } from "./components/admin-themes";
import { AdminPlans } from "./components/admin-plans";
import { AdminAddons } from "./components/admin-addons";
import {
  Building2,
  CreditCard,
  Receipt,
  PackagePlus,
  SlidersHorizontal,
  Plus,
  CheckCircle2,
  ExternalLink,
  Shield,
  Clock,
  Sparkles,
} from "lucide-react";

export default function SuperAdminPortalPage() {
  const [currentTab, setCurrentTab] = useState<AdminTab>("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global search navigation
  const handleSearchNavigate = (category: string, recordId?: string) => {
    switch (category) {
      case "customers":
        setCurrentTab("customers");
        break;
      case "apps":
        setCurrentTab("applications");
        break;
      case "builds":
        setCurrentTab("builds");
        break;
      case "orders":
        setCurrentTab("revenue");
        break;
      case "tenants":
        setCurrentTab("tenants");
        break;
      default:
        setCurrentTab("revenue");
        break;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased flex flex-col">
      {/* ── COLLAPSIBLE DEEP NAVY SIDEBAR ── */}
      <AdminSidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* ── MAIN CONTENT AREA ── */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? "pl-20" : "pl-64"
        }`}
      >
        {/* Top Navigation Bar */}
        <AdminHeader
          onOpenSearch={() => setIsSearchOpen(true)}
          criticalAlertCount={4}
          onSelectTab={setCurrentTab}
        />

        {/* Dynamic Page Views */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === "dashboard" && (
            <AdminOverview onNavigateTab={setCurrentTab} />
          )}

          {currentTab === "customers" && <AdminCustomers />}

          {currentTab === "applications" && <AdminApplications />}

          {currentTab === "monitoring" && <AdminApplications />}

          {currentTab === "builds" && <AdminBuilds />}

          {currentTab === "revenue" && <AdminRevenue />}

          {currentTab === "security" && <AdminSecurity />}

          {currentTab === "backups" && <AdminSecurity />}

          {currentTab === "intelligence" && <AdminIntelligence />}

          {/* Tenants Management Tab */}
          {currentTab === "tenants" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h1 className="text-xl font-bold text-slate-900">Tenants</h1>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Tenant #2 • Active</span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">Sanskriti Store Global</h3>
                    <p className="text-xs text-slate-500 mt-0.5">sanskritistore.com • 1 App</p>
                    <span className="mt-2 inline-block text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      Growth
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Tenant #4 • Active</span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">Fashion Hub India</h3>
                    <p className="text-xs text-slate-500 mt-0.5">fashionhub.in • 3 Apps</p>
                    <span className="mt-2 inline-block text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      Growth
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Tenant #5 • Suspended</span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">Malhotra Luxury Silks</h3>
                    <p className="text-xs text-slate-500 mt-0.5">malhotratextiles.com • 4 Apps</p>
                    <span className="mt-2 inline-block text-[11px] font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                      Enterprise
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subscriptions & Plans Tab (Fully Editable) */}
          {currentTab === "plans" && <AdminPlans />}

          {/* Add-on Management Tab (Fully Editable) */}
          {currentTab === "addons" && <AdminAddons />}

          {/* Theme Management Tab (Fully Editable) */}
          {currentTab === "themes" && <AdminThemes />}

          {/* Billing & Invoices Tab */}
          {currentTab === "billing" && <AdminRevenue />}

          {/* Global Settings Tab */}
          {currentTab === "settings" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h1 className="text-xl font-bold text-slate-900">Settings</h1>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 max-w-xl">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Razorpay Key ID</label>
                  <input type="text" defaultValue="rzp_live_998182741" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Razorpay Webhook Secret</label>
                  <input type="password" defaultValue="sec_live_9921827181" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">FCM Server Key</label>
                  <input type="password" defaultValue="AAAA_Live_Push_Token_Key_Here" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono" />
                </div>
                <div className="pt-2">
                  <button onClick={() => alert("Settings saved.")} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── MULTI-ATTRIBUTE GLOBAL SEARCH MODAL ── */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleSearchNavigate}
      />
    </div>
  );
}
