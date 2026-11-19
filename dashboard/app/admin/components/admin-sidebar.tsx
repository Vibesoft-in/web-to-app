"use client";

import React from "react";
import {
  LayoutDashboard,
  Users,
  Building2,
  Smartphone,
  Cpu,
  CreditCard,
  BarChart3,
  PackagePlus,
  LineChart,
  Activity,
  ShieldCheck,
  Database,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
  Palette,
} from "lucide-react";

export type AdminTab =
  | "dashboard"
  | "customers"
  | "tenants"
  | "applications"
  | "builds"
  | "plans"
  | "addons"
  | "themes"
  | "billing"
  | "revenue"
  | "intelligence"
  | "monitoring"
  | "security"
  | "backups"
  | "settings";

interface SidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const ADMIN_NAV_ITEMS: {
  id: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "customers", label: "Customer Management", icon: Users },
  { id: "tenants", label: "Tenant Management", icon: Building2 },
  { id: "applications", label: "Application Management", icon: Smartphone },
  { id: "builds", label: "Mobile Build Management", icon: Cpu },
  { id: "plans", label: "Subscriptions & Plans", icon: CreditCard },
  { id: "addons", label: "Add-on Management", icon: PackagePlus },
  { id: "themes", label: "Theme Management", icon: Palette },
  { id: "revenue", label: "Revenue Analytics", icon: BarChart3 },
  { id: "intelligence", label: "Customer Intelligence", icon: LineChart },
  { id: "monitoring", label: "Application Monitoring", icon: Activity },
  { id: "security", label: "Security & Audit Logs", icon: ShieldCheck },
  { id: "backups", label: "Backup & Recovery", icon: Database },
  { id: "settings", label: "Global Settings", icon: SlidersHorizontal },
];

export function AdminSidebar({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-40 bg-[#0F172A] text-slate-300 flex flex-col transition-all duration-300 ease-in-out border-r border-slate-800/80 shadow-2xl ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 bg-[#0A0F1D]">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-400 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/25">
            <Layers className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="font-extrabold text-base text-white tracking-tight leading-none">
                WebIntoApp
              </span>
              <span className="text-[11px] font-medium text-slate-400 mt-1 truncate">
                Super Admin Panel
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 transition"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-1 custom-scrollbar">
        {!isCollapsed && (
          <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Platform Operations
          </div>
        )}

        {ADMIN_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group relative ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              {/* Active Indicator Bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full" />
              )}

              <Icon
                className={`w-4 h-4 flex-shrink-0 transition-transform ${
                  isActive
                    ? "text-white scale-110"
                    : "text-slate-400 group-hover:text-indigo-400 group-hover:scale-105"
                }`}
              />

              {!isCollapsed && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}

              {!isCollapsed && item.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    item.badgeColor || "bg-indigo-500/20 text-indigo-300"
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {/* Tooltip on collapsed */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto whitespace-nowrap z-50 border border-slate-700/60 transition-opacity">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info Box */}
      <div className="p-3 border-t border-slate-800/80 bg-[#0A0F1D]/60">
        {!isCollapsed ? (
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/40">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold text-slate-200">
                Production Cluster
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Backend v3.3.57 • Livewire • Multi-Tenant
            </p>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
