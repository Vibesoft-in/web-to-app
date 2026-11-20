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
import { AdminTenants } from "./components/admin-tenants";
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

          {/* Tenants Management Tab (Organized as Data Table) */}
          {currentTab === "tenants" && <AdminTenants />}

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
