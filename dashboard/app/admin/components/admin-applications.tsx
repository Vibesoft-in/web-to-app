"use client";

import React, { useState, useMemo } from "react";
import {
  Smartphone,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Download,
  RotateCcw,
  Sliders,
  ShieldAlert,
  Layers,
  Palette,
  Type,
  Layout,
  ToggleLeft,
  X,
  ExternalLink,
  ChevronRight,
  Eye,
  Plus,
} from "lucide-react";

interface AppItem {
  id: number;
  ulid: string;
  name: string;
  logoUrl?: string;
  customerName: string;
  tenantId: number;
  platform: "WooCommerce" | "Shopify" | "Custom";
  packageName: string;
  currentVersion: string;
  previousVersion?: string;
  plan: string;
  status: "Active" | "Suspended" | "Under Maintenance" | "Build Restricted" | "Disabled";
  publishedStatus: "Published" | "In Review" | "Draft";
  assignedTheme: string;
  primaryColor: string;
  buildsCount: number;
}

const APPS_DATA: AppItem[] = [
  {
    id: 1,
    ulid: "01HZX87K99",
    name: "Fashion Hub Mobile",
    logoUrl: "https://images.unsplash.com/photo-1544441893-675973e31985?w=100&auto=format&fit=crop&q=60",
    customerName: "Rahul Sharma",
    tenantId: 4,
    platform: "WooCommerce",
    packageName: "com.fashionhub.app",
    currentVersion: "1.0.5",
    previousVersion: "1.0.4",
    plan: "Growth Fashion Tier",
    status: "Active",
    publishedStatus: "Published",
    assignedTheme: "Luxury Boutique",
    primaryColor: "#4F46E5",
    buildsCount: 5,
  },
  {
    id: 2,
    ulid: "01J8Y29ZZ1",
    name: "Sanskriti Luxe App",
    logoUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=100&auto=format&fit=crop&q=60",
    customerName: "Sanskriti Mishra",
    tenantId: 2,
    platform: "WooCommerce",
    packageName: "com.sanskriti.store",
    currentVersion: "1.0.4",
    previousVersion: "1.0.3",
    plan: "Growth Fashion Tier",
    status: "Active",
    publishedStatus: "Published",
    assignedTheme: "Modern Retail",
    primaryColor: "#E53935",
    buildsCount: 4,
  },
  {
    id: 3,
    ulid: "01K7T91PP4",
    name: "Vintage Denim Store",
    logoUrl: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=100&auto=format&fit=crop&q=60",
    customerName: "Vikram Malhotra",
    tenantId: 5,
    platform: "Shopify",
    packageName: "com.vintagedenim.mobile",
    currentVersion: "1.0.1",
    previousVersion: "1.0.0",
    plan: "Enterprise Pro",
    status: "Suspended",
    publishedStatus: "Draft",
    assignedTheme: "Elite Dark Luxe",
    primaryColor: "#111827",
    buildsCount: 2,
  },
  {
    id: 4,
    ulid: "01L9Q44AA2",
    name: "Megha Couture",
    logoUrl: "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?w=100&auto=format&fit=crop&q=60",
    customerName: "Megha Bahukhandi",
    tenantId: 3,
    platform: "WooCommerce",
    packageName: "com.meghacouture.app",
    currentVersion: "1.0.0",
    plan: "Starter Plan",
    status: "Under Maintenance",
    publishedStatus: "In Review",
    assignedTheme: "Vibrant Lifestyle",
    primaryColor: "#EC4899",
    buildsCount: 1,
  },
];

export function AdminApplications() {
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals state
  const [versionModalApp, setVersionModalApp] = useState<AppItem | null>(null);
  const [overrideModalApp, setOverrideModalApp] = useState<AppItem | null>(null);
  const [statusModalApp, setStatusModalApp] = useState<AppItem | null>(null);

  // Override Form state
  const [overrideForm, setOverrideForm] = useState({
    name: "",
    packageName: "",
    theme: "",
    primaryColor: "",
    fontFamily: "Inter",
    navigationLayout: "bottom_tabs",
    featurePush: true,
    featureBiometrics: false,
    featureOffline: true,
    featureDarkMode: true,
  });

  // Status Control Form state
  const [statusForm, setStatusForm] = useState({
    status: "Active",
    reason: "",
    notifyCustomer: true,
  });

  const filteredApps = useMemo(() => {
    return APPS_DATA.filter((app) => {
      if (platformFilter !== "all" && app.platform !== platformFilter) return false;
      if (statusFilter !== "all" && app.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        app.name.toLowerCase().includes(q) ||
        app.packageName.toLowerCase().includes(q) ||
        app.ulid.toLowerCase().includes(q) ||
        app.customerName.toLowerCase().includes(q)
      );
    });
  }, [search, platformFilter, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Active
          </span>
        );
      case "Suspended":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            Suspended
          </span>
        );
      case "Under Maintenance":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Under Maintenance
          </span>
        );
      case "Build Restricted":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            Build Restricted
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            Disabled
          </span>
        );
    }
  };

  const openOverrideModal = (app: AppItem) => {
    setOverrideForm({
      name: app.name,
      packageName: app.packageName,
      theme: app.assignedTheme,
      primaryColor: app.primaryColor,
      fontFamily: "Inter",
      navigationLayout: "bottom_tabs",
      featurePush: true,
      featureBiometrics: false,
      featureOffline: true,
      featureDarkMode: true,
    });
    setOverrideModalApp(app);
  };

  const openStatusModal = (app: AppItem) => {
    setStatusForm({
      status: app.status,
      reason: "",
      notifyCustomer: true,
    });
    setStatusModalApp(app);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            Applications
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold uppercase tracking-wider">
              {APPS_DATA.length} Apps
            </span>
          </h1>
        </div>

        <button
          onClick={() => alert("Creating custom enterprise application")}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New App</span>
        </button>
      </div>

      {/* ── SEARCH & FILTERS ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by app name, package ID, ULID or customer..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">All Platforms</option>
              <option value="WooCommerce">WooCommerce</option>
              <option value="Shopify">Shopify</option>
              <option value="Custom">Custom API</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">All Operational Statuses</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Build Restricted">Build Restricted</option>
            </select>
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50/80 text-[11px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Application</th>
                <th className="px-6 py-3.5">Customer & Tenant</th>
                <th className="px-6 py-3.5">Platform</th>
                <th className="px-6 py-3.5">Package Identifier</th>
                <th className="px-6 py-3.5">Version History</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Administrative Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredApps.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden flex-shrink-0">
                        {app.logoUrl ? (
                          <img src={app.logoUrl} alt={app.name} className="w-full h-full object-cover" />
                        ) : (
                          <Smartphone className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900">{app.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">ULID: {app.ulid}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{app.customerName}</div>
                    <div className="text-xs text-slate-500 font-mono">Tenant #{app.tenantId}</div>
                  </td>

                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {app.platform}
                    </span>
                  </td>

                  <td className="px-6 py-4 font-mono text-xs text-slate-600">
                    {app.packageName}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 font-mono text-xs">v{app.currentVersion}</span>
                      {app.previousVersion && (
                        <span className="text-[10px] text-slate-400 font-mono">(prev: v{app.previousVersion})</span>
                      )}
                    </div>
                    <span className="text-[10px] text-emerald-600 font-semibold block">{app.publishedStatus}</span>
                  </td>

                  <td className="px-6 py-4">
                    {getStatusBadge(app.status)}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Version History Action */}
                      <button
                        onClick={() => setVersionModalApp(app)}
                        className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold transition flex items-center gap-1"
                        title="View App Version History & Builds"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Versions</span>
                      </button>

                      {/* Config Override Action */}
                      <button
                        onClick={() => openOverrideModal(app)}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition flex items-center gap-1"
                        title="Override application configuration"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Override</span>
                      </button>

                      {/* Status Control Action */}
                      <button
                        onClick={() => openStatusModal(app)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold transition flex items-center gap-1"
                        title="Change operational status"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Status</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 1. APP VERSION MANAGEMENT MODAL ── */}
      {versionModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Version History & Build Artifacts: {versionModalApp.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Package: {versionModalApp.packageName} • Current Version: v{versionModalApp.currentVersion}
                </p>
              </div>
              <button
                onClick={() => setVersionModalApp(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <table className="w-full text-xs text-left border border-slate-200 rounded-2xl overflow-hidden">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Version</th>
                    <th className="px-4 py-2.5">Platform</th>
                    <th className="px-4 py-2.5">Release Status</th>
                    <th className="px-4 py-2.5">Date Compiled</th>
                    <th className="px-4 py-2.5">Artifact Size</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-emerald-50/30">
                    <td className="px-4 py-3 font-bold text-slate-900 font-mono">v1.0.5 (Build #5)</td>
                    <td className="px-4 py-3 text-slate-600">Android APK & AAB</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Published</span></td>
                    <td className="px-4 py-3 text-slate-500">Nov 18, 2026</td>
                    <td className="px-4 py-3 font-mono">34.2 MB</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => alert("Downloading Build #5 APK artifact...")}
                        className="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-900 font-mono">v1.0.4 (Build #4)</td>
                    <td className="px-4 py-3 text-slate-600">Android APK</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">Archived</span></td>
                    <td className="px-4 py-3 text-slate-500">Nov 10, 2026</td>
                    <td className="px-4 py-3 font-mono">32.8 MB</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => alert("Downloading Build #4 APK...")}
                          className="text-xs font-bold text-slate-600 hover:underline"
                        >
                          Download
                        </button>
                        <button
                          onClick={() => alert("Rollback initiated to v1.0.4 configuration.")}
                          className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-0.5"
                        >
                          <RotateCcw className="w-3 h-3" /> Rollback
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setVersionModalApp(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. APPLICATION CONFIGURATION OVERRIDE MODAL ── */}
      {overrideModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Super Admin Configuration Override: {overrideModalApp.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Modify application settings directly. Updates will be locked into mobile runtime config.
                </p>
              </div>
              <button
                onClick={() => setOverrideModalApp(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">App Display Name</label>
                  <input
                    type="text"
                    value={overrideForm.name}
                    onChange={(e) => setOverrideForm({ ...overrideForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Android Package Name</label>
                  <input
                    type="text"
                    value={overrideForm.packageName}
                    onChange={(e) => setOverrideForm({ ...overrideForm, packageName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Primary Theme Template</label>
                  <select
                    value={overrideForm.theme}
                    onChange={(e) => setOverrideForm({ ...overrideForm, theme: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    <option value="Modern Retail">Modern Retail</option>
                    <option value="Luxury Boutique">Luxury Boutique</option>
                    <option value="Vibrant Lifestyle">Vibrant Lifestyle</option>
                    <option value="Elite Dark Luxe">Elite Dark Luxe (VIP)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Primary Brand Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={overrideForm.primaryColor}
                      onChange={(e) => setOverrideForm({ ...overrideForm, primaryColor: e.target.value })}
                      className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={overrideForm.primaryColor}
                      onChange={(e) => setOverrideForm({ ...overrideForm, primaryColor: e.target.value })}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Typography Font</label>
                  <select
                    value={overrideForm.fontFamily}
                    onChange={(e) => setOverrideForm({ ...overrideForm, fontFamily: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    <option value="Inter">Inter (Clean Sans)</option>
                    <option value="Roboto">Roboto (Material)</option>
                    <option value="Poppins">Poppins (Modern)</option>
                    <option value="Playfair Display">Playfair Display (Luxury)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Navigation Layout</label>
                  <select
                    value={overrideForm.navigationLayout}
                    onChange={(e) => setOverrideForm({ ...overrideForm, navigationLayout: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    <option value="bottom_tabs">Bottom Navigation Tabs</option>
                    <option value="drawer">Slide-out Drawer</option>
                    <option value="minimal">Minimal Header</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 block mb-2">Feature Access Controls</label>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overrideForm.featurePush}
                      onChange={(e) => setOverrideForm({ ...overrideForm, featurePush: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>Push Notifications (FCM)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overrideForm.featureOffline}
                      onChange={(e) => setOverrideForm({ ...overrideForm, featureOffline: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>Offline Product Caching</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overrideForm.featureDarkMode}
                      onChange={(e) => setOverrideForm({ ...overrideForm, featureDarkMode: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>Dark Theme Support</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overrideForm.featureBiometrics}
                      onChange={(e) => setOverrideForm({ ...overrideForm, featureBiometrics: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>Biometric Login</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setOverrideModalApp(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert(`Overrides saved for ${overrideModalApp.name}.`);
                  setOverrideModalApp(null);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm"
              >
                Apply Overrides
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. APPLICATION STATUS CONTROLS MODAL ── */}
      {statusModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-amber-200 w-full max-w-md p-6 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h3 className="font-extrabold text-base text-slate-900">
              Administrative Status Control: {statusModalApp.name}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Set the operational status of this app. When suspending or restricting, a reason is required.
            </p>

            <div className="space-y-3.5 mt-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Operational Status</label>
                <select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="Active">Active (Normal Operations)</option>
                  <option value="Suspended">Suspended (All Operations Halted)</option>
                  <option value="Under Maintenance">Under Maintenance</option>
                  <option value="Build Restricted">Build Restricted (Build generation blocked)</option>
                  <option value="Disabled">Temporarily Disabled</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Reason for Status Change</label>
                <textarea
                  value={statusForm.reason}
                  onChange={(e) => setStatusForm({ ...statusForm, reason: e.target.value })}
                  placeholder="Provide internal rationale and information for customer notice..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={statusForm.notifyCustomer}
                  onChange={(e) => setStatusForm({ ...statusForm, notifyCustomer: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <span>Notify customer via registered email ({statusModalApp.customerName})</span>
              </label>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setStatusModalApp(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert(`Status changed to ${statusForm.status} for ${statusModalApp.name}.`);
                  setStatusModalApp(null);
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-sm"
              >
                Confirm Status Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
