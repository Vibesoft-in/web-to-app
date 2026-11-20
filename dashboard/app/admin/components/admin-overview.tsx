"use client";

import React from "react";
import {
  Users,
  Smartphone,
  Banknote,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ShieldAlert,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { PlanPricingCard } from "./plan-pricing-card";

// Revenue Growth Data (Last 6 months)
const REVENUE_DATA = [
  { period: "Jun", gross: 320, net: 294 },
  { period: "Jul", gross: 450, net: 412 },
  { period: "Aug", gross: 580, net: 531 },
  { period: "Sep", gross: 720, net: 659 },
  { period: "Oct", gross: 890, net: 815 },
  { period: "Nov", gross: 1140, net: 1045 },
];

// Plan Distribution
const PLAN_DISTRIBUTION_DATA = [
  { name: "Starter Tier", value: 24, amount: "₹2.16L", color: "#6366F1" },
  { name: "Growth Tier", value: 46, amount: "₹4.14L", color: "#4F46E5" },
  { name: "Enterprise", value: 22, amount: "₹1.98L", color: "#1E1B4B" },
  { name: "Custom VIP", value: 8, amount: "₹0.72L", color: "#10B981" },
];

// Recent Priority Items (Text)
const RECENT_ALERTS = [
  {
    id: "B-104",
    title: "Build #104 Failed",
    detail: "Keystore signature mismatch in release variant",
    entity: "Mobile Store App",
    time: "12m ago",
    severity: "critical",
    action: "builds",
  },
  {
    id: "P-7729",
    title: "Payment Gateway Drop",
    detail: "Bank webhook timeout on UPI gateway",
    entity: "Zara Enterprise",
    time: "45m ago",
    severity: "warning",
    action: "revenue",
  },
  {
    id: "Q-8491",
    title: "Custom Quote Requested",
    detail: "Custom iOS Push SDK + Biometric Login",
    entity: "Nike Fashion Tenant",
    time: "2h ago",
    severity: "info",
    action: "intelligence",
  },
];

// Recent Mobile Applications (Text Table)
const RECENT_APPS = [
  {
    name: "Urban Style Store",
    customer: "Rajesh Sharma",
    platform: "WooCommerce",
    version: "v2.4.1",
    status: "Live",
    plan: "Growth",
  },
  {
    name: "QuickMart Grocery",
    customer: "Priya Nair",
    platform: "Shopify",
    version: "v1.8.0",
    status: "Live",
    plan: "Enterprise",
  },
  {
    name: "Apex Electronics",
    customer: "Vikram Mehta",
    platform: "Custom API",
    version: "v1.0.2",
    status: "Building",
    plan: "Starter",
  },
  {
    name: "Luxe Furnishings",
    customer: "Ananya Iyer",
    platform: "WooCommerce",
    version: "v3.0.0",
    status: "Live",
    plan: "Growth",
  },
];

interface AdminOverviewProps {
  onNavigateTab: (tab: any) => void;
}

export function AdminOverview({ onNavigateTab }: AdminOverviewProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── SECTION HEADER (MINIMAL, NO EXTRA TABS) ── */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Platform Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Key platform health, revenue metrics, and system status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            Operational
          </span>
        </div>
      </div>

      {/* ── 4 CORE KPI CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Customers */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Customers
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">1,248</span>
            <span className="text-xs font-semibold text-emerald-600">+18%</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">165 joined this month</p>
        </div>

        {/* 2. Apps */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Published Apps
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">528</span>
            <span className="text-xs font-semibold text-slate-500">of 634</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">106 in development</p>
        </div>

        {/* 3. MRR */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Monthly MRR
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">₹6.20L</span>
            <span className="text-xs font-semibold text-emerald-600">+19%</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">₹74.4L projected ARR</p>
        </div>

        {/* 4. Total Revenue */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">₹41.28L</span>
            <span className="text-xs font-semibold text-emerald-600">+35%</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">FY 2024 cumulative</p>
        </div>
      </div>

      {/* ── SOME VISUALS: 2 CLEAN CHARTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Revenue Growth (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-sm text-slate-900">
                Revenue Growth
              </h2>
              <p className="text-xs text-slate-500">Monthly gross and net receipts (₹k)</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600" /> Gross
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-300" /> Net
              </span>
            </div>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REVENUE_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="period" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}k`} />
                <Tooltip
                  formatter={(value: any) => [`₹${Number(value) * 1000}`, ""]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "12px" }}
                />
                <Bar dataKey="gross" fill="#4F46E5" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="net" fill="#A5B4FC" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Plan Breakdown Donut (1 Col) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-sm text-slate-900">
              Plan Distribution
            </h2>
            <p className="text-xs text-slate-500">Active subscription split</p>
          </div>

          <div className="h-44 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={PLAN_DISTRIBUTION_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {PLAN_DISTRIBUTION_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: any, item: any) => [
                    `${value}% (${item.payload.amount})`,
                    item.payload.name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2.5 pt-3 border-t border-slate-100">
            {PLAN_DISTRIBUTION_DATA.map((item) => (
              <div key={item.name} className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-800 font-bold">{item.name}</span>
                  </div>
                  <span className="font-extrabold text-slate-900 font-mono">{item.value}%</span>
                </div>
                <PlanPricingCard tier={item.name} variant="compact" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SOME TEXT: ACTION ITEMS & RECENT APPLICATIONS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Action Required (1 Col) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Action Required
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
              3 Items
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {RECENT_ALERTS.map((alert) => (
              <div key={alert.id} className="py-3 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    {alert.title}
                  </span>
                  <span className="text-[10px] text-slate-400">{alert.time}</span>
                </div>
                <p className="text-[11px] text-slate-500">{alert.detail}</p>
                <div className="flex items-center justify-between mt-1 pt-1">
                  <span className="text-[11px] font-medium text-slate-600">
                    {alert.entity}
                  </span>
                  <button
                    onClick={() => onNavigateTab(alert.action)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    Resolve <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Recent Applications Text Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold text-sm text-slate-900">
                Recent Applications
              </h2>
              <p className="text-xs text-slate-500">Latest active mobile apps across tenants</p>
            </div>
            <button
              onClick={() => onNavigateTab("applications")}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                  <th className="pb-2">App Name</th>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2">Platform</th>
                  <th className="pb-2">Version</th>
                  <th className="pb-2">Plan</th>
                  <th className="pb-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {RECENT_APPS.map((app) => (
                  <tr key={app.name} className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 font-bold text-slate-900">{app.name}</td>
                    <td className="py-2.5 text-slate-600">{app.customer}</td>
                    <td className="py-2.5 text-slate-600">{app.platform}</td>
                    <td className="py-2.5 text-slate-500 font-mono text-[11px]">{app.version}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {app.plan}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          app.status === "Live"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            app.status === "Live" ? "bg-emerald-600" : "bg-amber-600"
                          }`}
                        />
                        {app.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── MINIMAL TELEMETRY STRIP ── */}
      <div className="bg-slate-100/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 border border-slate-200/60">
        <div className="flex items-center gap-4">
          <span>
            Build Success: <strong className="text-slate-900">99.2%</strong>
          </span>
          <span className="text-slate-300">•</span>
          <span>
            Active Tenants: <strong className="text-slate-900">162</strong>
          </span>
          <span className="text-slate-300">•</span>
          <span>
            Churn Rate: <strong className="text-slate-900">1.9%</strong>
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>All cloud microservices and build runners healthy</span>
        </div>
      </div>
    </div>
  );
}
