"use client";

import React, { useState, useMemo } from "react";
import {
  Building2,
  Search,
  Filter,
  Plus,
  ArrowRightLeft,
  ExternalLink,
  Edit,
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Smartphone,
  Check,
  X,
  Mail,
  User,
  Globe,
  SlidersHorizontal,
  ChevronDown,
  Trash2,
  Layers,
  Sparkles,
} from "lucide-react";
import { PlanPricingCard } from "./plan-pricing-card";

export interface TenantRecord {
  id: number;
  name: string;
  ownerName: string;
  ownerEmail: string;
  storeUrl: string;
  plan: "Free" | "Starter" | "Growth" | "Enterprise";
  planPrice: string;
  appsCount: number;
  dbCluster: string;
  status: "Active" | "Suspended" | "Inactive";
  joinedDate: string;
  lastActive: string;
}

const INITIAL_TENANTS: TenantRecord[] = [
  {
    id: 2,
    name: "Sanskriti Store Global",
    ownerName: "Sanskriti Mishra",
    ownerEmail: "sanskriti123@gmail.com",
    storeUrl: "https://sanskritistore.com",
    plan: "Growth",
    planPrice: "₹14,999/yr",
    appsCount: 1,
    dbCluster: "tenant_db_002 (Isolated Schema)",
    status: "Active",
    joinedDate: "Nov 14, 2026",
    lastActive: "12m ago",
  },
  {
    id: 4,
    name: "Fashion Hub India",
    ownerName: "Rahul Sharma",
    ownerEmail: "rahul.sharma@fashionhub.in",
    storeUrl: "https://fashionhub.in",
    plan: "Growth",
    planPrice: "₹14,999/yr",
    appsCount: 3,
    dbCluster: "tenant_db_004 (Isolated Schema)",
    status: "Active",
    joinedDate: "Oct 22, 2026",
    lastActive: "5m ago",
  },
  {
    id: 5,
    name: "Malhotra Luxury Silks",
    ownerName: "Vikram Malhotra",
    ownerEmail: "vikram@malhotratextiles.com",
    storeUrl: "https://malhotratextiles.com",
    plan: "Enterprise",
    planPrice: "₹59,996/yr",
    appsCount: 4,
    dbCluster: "tenant_db_005 (Dedicated Postgres Cluster)",
    status: "Suspended",
    joinedDate: "Sep 15, 2026",
    lastActive: "3d ago",
  },
  {
    id: 3,
    name: "Megha Boutique",
    ownerName: "Megha Bahukhandi",
    ownerEmail: "meghabahukhandi@gmail.com",
    storeUrl: "https://meghaboutique.shop",
    plan: "Growth",
    planPrice: "₹7,999/yr",
    appsCount: 1,
    dbCluster: "tenant_db_003 (Shared Multi-Tenant)",
    status: "Active",
    joinedDate: "Nov 02, 2026",
    lastActive: "1h ago",
  },
  {
    id: 6,
    name: "Organic Bliss Care",
    ownerName: "Pooja Varma",
    ownerEmail: "pooja.varma@organicbliss.co",
    storeUrl: "https://organicbliss.co",
    plan: "Free",
    planPrice: "₹0/mo",
    appsCount: 0,
    dbCluster: "tenant_db_006 (Shared Multi-Tenant)",
    status: "Inactive",
    joinedDate: "Oct 01, 2026",
    lastActive: "28d ago",
  },
  {
    id: 7,
    name: "Urban Street Footwear",
    ownerName: "Anand Rathi",
    ownerEmail: "anand.rathi@urbanstreet.in",
    storeUrl: "https://urbanstreet.in",
    plan: "Growth",
    planPrice: "₹7,999/yr",
    appsCount: 1,
    dbCluster: "tenant_db_007 (Shared Multi-Tenant)",
    status: "Active",
    joinedDate: "Nov 08, 2026",
    lastActive: "4h ago",
  },
  {
    id: 8,
    name: "Handicrafts Emporium",
    ownerName: "Deepak Choudhary",
    ownerEmail: "deepak@choudharycrafts.com",
    storeUrl: "https://choudharycrafts.com",
    plan: "Starter",
    planPrice: "₹2,999/mo",
    appsCount: 1,
    dbCluster: "tenant_db_008 (Shared Multi-Tenant)",
    status: "Active",
    joinedDate: "Nov 12, 2026",
    lastActive: "2h ago",
  },
];

interface AdminTenantsProps {
  onNavigateCustomer?: (customerId: string) => void;
}

export function AdminTenants({ onNavigateCustomer }: AdminTenantsProps) {
  const [tenants, setTenants] = useState<TenantRecord[]>(INITIAL_TENANTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");

  // Modals
  const [impersonateTenant, setImpersonateTenant] = useState<TenantRecord | null>(null);
  const [editingTenant, setEditingTenant] = useState<TenantRecord | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // New Tenant Form
  const [createForm, setCreateForm] = useState({
    name: "",
    ownerName: "",
    ownerEmail: "",
    storeUrl: "",
    plan: "Growth" as const,
    dbCluster: "Isolated Schema",
  });

  // Filtered tenants
  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (planFilter !== "all" && t.plan !== planFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.ownerName.toLowerCase().includes(q) ||
        t.ownerEmail.toLowerCase().includes(q) ||
        t.storeUrl.toLowerCase().includes(q) ||
        `#${t.id}`.includes(q)
      );
    });
  }, [tenants, searchQuery, statusFilter, planFilter]);

  // Telemetry counts
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.status === "Active").length;
  const suspendedTenants = tenants.filter((t) => t.status === "Suspended").length;
  const totalApps = tenants.reduce((acc, t) => acc + t.appsCount, 0);

  // Handlers
  const handleToggleStatus = (tenantId: number) => {
    setTenants((prev) =>
      prev.map((t) => {
        if (t.id === tenantId) {
          const nextStatus = t.status === "Active" ? "Suspended" : "Active";
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;

    setTenants((prev) =>
      prev.map((t) => (t.id === editingTenant.id ? editingTenant : t))
    );
    setEditingTenant(null);
  };

  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.ownerEmail.trim()) {
      alert("Please provide at least a Tenant Name and Owner Email.");
      return;
    }

    const nextId = Math.max(...tenants.map((t) => t.id), 8) + 1;
    const newTenant: TenantRecord = {
      id: nextId,
      name: createForm.name,
      ownerName: createForm.ownerName || "Tenant Admin",
      ownerEmail: createForm.ownerEmail,
      storeUrl: createForm.storeUrl || `https://${createForm.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
      plan: createForm.plan,
      planPrice: createForm.plan === "Enterprise" ? "₹59,996/yr" : createForm.plan === "Growth" ? "₹14,999/yr" : "₹2,999/mo",
      appsCount: 0,
      dbCluster: `tenant_db_00${nextId} (${createForm.dbCluster})`,
      status: "Active",
      joinedDate: "Today",
      lastActive: "Just now",
    };

    setTenants([newTenant, ...tenants]);
    setIsCreateOpen(false);
    setCreateForm({
      name: "",
      ownerName: "",
      ownerEmail: "",
      storeUrl: "",
      plan: "Growth",
      dbCluster: "Isolated Schema",
    });
  };

  const handleDeleteTenant = (tenantId: number, tenantName: string) => {
    if (confirm(`Are you sure you want to permanently delete Tenant #${tenantId} (${tenantName})? This action cannot be undone.`)) {
      setTenants((prev) => prev.filter((t) => t.id !== tenantId));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── HEADER TITLE & ACTIONS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Tenant Management</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Multi-tenant workspace isolation, database routing, subscription tiers, and domain configurations
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Provision Tenant</span>
          </button>
        </div>
      </div>

      {/* ── 4 TELEMETRY CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Tenants
          </span>
          <div className="text-xl font-black text-slate-900 mt-1">{totalTenants}</div>
          <span className="text-[11px] text-slate-500 font-medium">Provisioned organizations</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Active Workspaces
          </span>
          <div className="text-xl font-black text-emerald-600 mt-1">{activeTenants}</div>
          <span className="text-[11px] text-emerald-600/80 font-medium">Live &amp; healthy tenants</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Suspended / Attention
          </span>
          <div className="text-xl font-black text-rose-600 mt-1">{suspendedTenants}</div>
          <span className="text-[11px] text-slate-400 font-medium">Flagged or overdue</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Connected Mobile Apps
          </span>
          <div className="text-xl font-black text-indigo-700 mt-1">{totalApps} Apps</div>
          <span className="text-[11px] text-slate-400 font-medium">Across all tenant environments</span>
        </div>
      </div>

      {/* ── FILTER & SEARCH TOOLBAR ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tenant name, owner, email, domain, or ID..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
            <option value="Inactive">Inactive</option>
          </select>

          {/* Plan filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Plans</option>
            <option value="Enterprise">Enterprise</option>
            <option value="Growth">Growth</option>
            <option value="Starter">Starter</option>
            <option value="Free">Free</option>
          </select>
        </div>
      </div>

      {/* ── ORGANIZED TENANTS TABLE ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-slate-900">Tenant Directory</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
              {filteredTenants.length} of {tenants.length}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Click table actions to edit configuration, suspend, or impersonate
          </span>
        </div>

        {filteredTenants.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No tenants match your search and filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Tenant &amp; Organization</th>
                  <th className="px-4 py-3">Owner / Contact</th>
                  <th className="px-4 py-3">Store Domain</th>
                  <th className="px-4 py-3">Plan Tier</th>
                  <th className="px-4 py-3">Apps</th>
                  <th className="px-4 py-3">Database Isolation</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition">
                    {/* Tenant & Organization */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-black text-xs flex-shrink-0">
                          #{t.id}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <span>{t.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Tenant Identifier #{t.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Owner / Contact */}
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-800">{t.ownerName}</div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <Mail className="w-2.5 h-2.5 text-slate-400" />
                        <span>{t.ownerEmail}</span>
                      </div>
                    </td>

                    {/* Store Domain */}
                    <td className="px-4 py-3.5">
                      <a
                        href={t.storeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        <Globe className="w-3 h-3 text-slate-400" />
                        <span>{t.storeUrl.replace("https://", "")}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </td>

                    {/* Plan Tier with Exact Subscription Plan UI */}
                    <td className="px-4 py-3.5 min-w-[170px]">
                      <div className="space-y-1.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.plan === "Enterprise"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : t.plan === "Growth"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : t.plan === "Starter"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {t.plan} Tier
                        </span>
                        <PlanPricingCard tier={t.plan} variant="compact" />
                      </div>
                    </td>

                    {/* Apps */}
                    <td className="px-4 py-3.5">
                      <div className="inline-flex items-center gap-1 font-bold text-slate-800">
                        <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t.appsCount}</span>
                      </div>
                    </td>

                    {/* Database Isolation */}
                    <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Database className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate max-w-[140px]" title={t.dbCluster}>
                          {t.dbCluster}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          t.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : t.status === "Suspended"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            t.status === "Active"
                              ? "bg-emerald-500"
                              : t.status === "Suspended"
                              ? "bg-rose-500"
                              : "bg-slate-400"
                          }`}
                        />
                        {t.status}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        Active {t.lastActive}
                      </div>
                    </td>

                    {/* Joined Date */}
                    <td className="px-4 py-3.5 text-slate-500 text-[11px] whitespace-nowrap">
                      {t.joinedDate}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Impersonate */}
                        <button
                          onClick={() => setImpersonateTenant(t)}
                          className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-50 border border-amber-200 transition cursor-pointer"
                          title={`Impersonate Tenant #${t.id} (${t.name})`}
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => setEditingTenant({ ...t })}
                          className="p-1.5 rounded-lg text-indigo-700 hover:bg-indigo-50 border border-indigo-200 transition cursor-pointer"
                          title="Edit Tenant Settings"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Toggle Suspend / Activate */}
                        <button
                          onClick={() => handleToggleStatus(t.id)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                            t.status === "Active"
                              ? "text-rose-700 hover:bg-rose-50 border-rose-200"
                              : "text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                          }`}
                          title={t.status === "Active" ? "Suspend Tenant" : "Re-activate Tenant"}
                        >
                          {t.status === "Active" ? "Suspend" : "Activate"}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteTenant(t.id, t.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete Tenant"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── EDIT TENANT MODAL ── */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] sm:max-h-[92vh] overflow-hidden my-auto animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Edit Tenant Workspace</h3>
                  <span className="text-[11px] text-slate-500">
                    Tenant #{editingTenant.id} • {editingTenant.name}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setEditingTenant(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveEdit} className="p-4 sm:p-5 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-3.5 flex-1 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Organization Name</label>
                <input
                  type="text"
                  value={editingTenant.name}
                  onChange={(e) => setEditingTenant({ ...editingTenant, name: e.target.value })}
                  required
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Owner Name</label>
                  <input
                    type="text"
                    value={editingTenant.ownerName}
                    onChange={(e) => setEditingTenant({ ...editingTenant, ownerName: e.target.value })}
                    required
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Owner Email</label>
                  <input
                    type="email"
                    value={editingTenant.ownerEmail}
                    onChange={(e) => setEditingTenant({ ...editingTenant, ownerEmail: e.target.value })}
                    required
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Store / Domain URL</label>
                <input
                  type="url"
                  value={editingTenant.storeUrl}
                  onChange={(e) => setEditingTenant({ ...editingTenant, storeUrl: e.target.value })}
                  required
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Subscription Plan</label>
                  <select
                    value={editingTenant.plan}
                    onChange={(e) => {
                      const p = e.target.value as TenantRecord["plan"];
                      const price = p === "Enterprise" ? "₹59,996/yr" : p === "Growth" ? "₹14,999/yr" : p === "Starter" ? "₹2,999/mo" : "₹0/mo";
                      setEditingTenant({ ...editingTenant, plan: p, planPrice: price });
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                  >
                    <option value="Growth">Growth Tier</option>
                    <option value="Enterprise">Enterprise Suite</option>
                    <option value="Starter">Starter Tier</option>
                    <option value="Free">Free Tier</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tenant Status</label>
                  <select
                    value={editingTenant.status}
                    onChange={(e) => setEditingTenant({ ...editingTenant, status: e.target.value as TenantRecord["status"] })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Live Subscription Plan UI Preview */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Subscription Plan Package Entitlements
                </span>
                <PlanPricingCard tier={editingTenant.plan} variant="card" />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Database Cluster &amp; Schema</label>
                <input
                  type="text"
                  value={editingTenant.dbCluster}
                  onChange={(e) => setEditingTenant({ ...editingTenant, dbCluster: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono focus:outline-hidden"
                />
              </div>
            </form>

            {/* Modal Footer */}
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2 flex-shrink-0 bg-slate-50/90">
              <button
                type="button"
                onClick={() => setEditingTenant(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PROVISION NEW TENANT MODAL ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] sm:max-h-[92vh] overflow-hidden my-auto animate-in zoom-in-95">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Provision New Tenant</h3>
                  <span className="text-[11px] text-slate-500">
                    Create an isolated multi-tenant environment with automated DB routing
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleCreateTenant} className="p-4 sm:p-5 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-3.5 flex-1 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Organization / Store Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Lifestyle Global"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  required
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Owner Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Siddharth Verma"
                    value={createForm.ownerName}
                    onChange={(e) => setCreateForm({ ...createForm, ownerName: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Owner Email *</label>
                  <input
                    type="email"
                    placeholder="e.g. sid@apexlifestyle.com"
                    value={createForm.ownerEmail}
                    onChange={(e) => setCreateForm({ ...createForm, ownerEmail: e.target.value })}
                    required
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">eCommerce Store / Domain URL</label>
                <input
                  type="url"
                  placeholder="https://apexlifestyle.com"
                  value={createForm.storeUrl}
                  onChange={(e) => setCreateForm({ ...createForm, storeUrl: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Assigned Plan</label>
                  <select
                    value={createForm.plan}
                    onChange={(e) => setCreateForm({ ...createForm, plan: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                  >
                    <option value="Growth">Growth Tier (₹14,999/yr)</option>
                    <option value="Enterprise">Enterprise Suite (₹59,996/yr)</option>
                    <option value="Starter">Starter Tier (₹2,999/mo)</option>
                    <option value="Free">Free Tier (₹0/mo)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Database Topology</label>
                  <select
                    value={createForm.dbCluster}
                    onChange={(e) => setCreateForm({ ...createForm, dbCluster: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                  >
                    <option value="Isolated Schema">Isolated Schema (Recommended)</option>
                    <option value="Dedicated Postgres Cluster">Dedicated Postgres Cluster</option>
                    <option value="Shared Multi-Tenant">Shared Multi-Tenant</option>
                  </select>
                </div>
              </div>

              {/* Live Subscription Plan UI Preview */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Assigned Subscription Plan Entitlements
                </span>
                <PlanPricingCard tier={createForm.plan} variant="card" />
              </div>

              <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200/60 text-slate-600 text-[11px] leading-relaxed">
                <span className="font-bold text-indigo-900 block mb-0.5">Automated Multi-Tenant Setup:</span>
                Creating this tenant will provision isolated schema partitions, generate unique JWT API keys, and configure standard web2app bridges.
              </div>
            </form>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2 flex-shrink-0 bg-slate-50/90">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateTenant}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Provision Tenant</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── IMPERSONATION CONFIRMATION MODAL ── */}
      {impersonateTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-amber-200 w-full max-w-md p-6 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900">
              Confirm Sensitive Action: Impersonate Tenant #{impersonateTenant.id}
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              You are about to start an impersonated session as{" "}
              <b>{impersonateTenant.ownerName}</b> ({impersonateTenant.name}).
              An audit log entry will be permanently recorded for security compliance.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setImpersonateTenant(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert(
                    `Impersonation session initiated for Tenant #${impersonateTenant.id} (${impersonateTenant.name}). Redirecting to tenant dashboard.`
                  );
                  setImpersonateTenant(null);
                  window.open(`/dashboard`, "_blank");
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Proceed to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
