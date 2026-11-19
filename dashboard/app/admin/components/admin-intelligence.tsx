"use client";

import React, { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Layers,
  Sparkles,
  TrendingUp,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Filter,
} from "lucide-react";

const MODULE_USAGE_DATA = [
  { module: "Push Notifications (FCM)", usageRate: 88, activeApps: 465 },
  { module: "Cart & Checkout Sync", usageRate: 82, activeApps: 433 },
  { module: "Wishlist Engine", usageRate: 64, activeApps: 338 },
  { module: "Product Image Zoom", usageRate: 59, activeApps: 311 },
  { module: "Offline Catalog Caching", usageRate: 51, activeApps: 269 },
  { module: "Multi-currency Switcher", usageRate: 38, activeApps: 201 },
  { module: "Biometric Authentication", usageRate: 29, activeApps: 153 },
];

const THEME_SELECTION_DATA = [
  { name: "Modern Retail", value: 48, color: "#4F46E5" },
  { name: "Luxury Boutique", value: 31, color: "#10B981" },
  { name: "Vibrant Lifestyle", value: 14, color: "#EC4899" },
  { name: "Elite Dark Luxe", value: 7, color: "#1E1B4B" },
];

const FUNNEL_DROPOFF_DATA = [
  { step: "1. Select Platform", count: 1248, rate: "100%" },
  { step: "2. Verify Connection", count: 1042, rate: "83.5%" },
  { step: "3. Choose Theme", count: 914, rate: "73.2%" },
  { step: "4. Customize Layout", count: 780, rate: "62.5%" },
  { step: "5. Build APK", count: 654, rate: "52.4%" },
  { step: "6. Publish to Store", count: 528, rate: "42.3%" },
];

export function AdminIntelligence() {
  const [platformFilter, setPlatformFilter] = useState("all");

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            Platform Intelligence
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none shadow-2xs"
          >
            <option value="all">All Platforms</option>
            <option value="woo">WooCommerce</option>
            <option value="shopify">Shopify</option>
          </select>
        </div>
      </div>

      {/* ── ROW 1: MODULE USAGE & THEME PREFERENCE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module Adoption Horizontal Bar Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm sm:text-base text-slate-900">
              Module Adoption
            </h3>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              Push 88%
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MODULE_USAGE_DATA} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" stroke="#94A3B8" fontSize={11} domain={[0, 100]} unit="%" />
                <YAxis type="category" dataKey="module" stroke="#64748B" fontSize={11} width={135} tickLine={false} />
                <Tooltip formatter={(v: any) => [`${v}% of apps`, "Adoption Rate"]} />
                <Bar dataKey="usageRate" name="Adoption Rate (%)" fill="#4F46E5" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Theme Preferences Donut */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm sm:text-base text-slate-900">
              Theme Preferences
            </h3>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
              Modern Retail (48%)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={THEME_SELECTION_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {THEME_SELECTION_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v}%`, "Share"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              {THEME_SELECTION_DATA.map((t) => (
                <div key={t.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-md" style={{ backgroundColor: t.color }} />
                    <span className="font-bold text-slate-700">{t.name}</span>
                  </div>
                  <span className="font-black text-slate-900">{t.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 2: APPLICATION CREATION COMPLETION FUNNEL ── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
              Application Creation Wizard Completion & Drop-Off Points
            </h3>
            <p className="text-xs text-slate-500">
              Tracing tenant friction and onboarding progression from step 1 through published stores
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            42.3% Overall Published Rate
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mt-6">
          {FUNNEL_DROPOFF_DATA.map((step, idx) => (
            <div key={step.step} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Stage {idx + 1}</span>
                <h4 className="font-extrabold text-xs text-slate-900 mt-1">{step.step}</h4>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/60">
                <div className="text-lg font-black text-indigo-700 font-mono">{step.count}</div>
                <span className="text-[11px] font-semibold text-slate-500">{step.rate} retained</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
