"use client";

import React, { useState } from "react";
import {
  PackagePlus,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Package,
  Layers,
  Smartphone,
  Sparkles,
  ShoppingBag,
} from "lucide-react";

export interface AddonItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  category: "Build & Distribution" | "Branding & White-label" | "Marketing & Push" | "Store Automation" | "Security & SLA";
  description: string;
  targetPlatform: "All Platforms" | "Android" | "Apple iOS";
  totalPurchased: number;
  totalRevenue: number;
  active: boolean;
}

const DEFAULT_ADDONS: AddonItem[] = [
  {
    id: "addon_ios",
    name: "Apple iOS App Store Bundle",
    slug: "apple-ios-bundle",
    price: 2999,
    category: "Build & Distribution",
    description: "Generates production signed Apple .IPA binaries for App Store and TestFlight distribution.",
    targetPlatform: "Apple iOS",
    totalPurchased: 42,
    totalRevenue: 125958,
    active: true,
  },
  {
    id: "addon_push",
    name: "Push Notifications Pro (FCM)",
    slug: "push-notifications-pro",
    price: 999,
    category: "Marketing & Push",
    description: "Automated cart abandonment alerts, rich media marketing broadcasts, and order milestone triggers.",
    targetPlatform: "All Platforms",
    totalPurchased: 88,
    totalRevenue: 87912,
    active: true,
  },
  {
    id: "addon_whitelabel",
    name: "White-label Branding Removal",
    slug: "whitelabel-removal",
    price: 9999,
    category: "Branding & White-label",
    description: "Completely removes 'Powered by WebIntoApp' splash watermarks, footer mentions, and header tags.",
    targetPlatform: "All Platforms",
    totalPurchased: 56,
    totalRevenue: 559944,
    active: true,
  },
  {
    id: "addon_builder",
    name: "Dedicated Cloud Build Server",
    slug: "dedicated-builder",
    price: 1999,
    category: "Build & Distribution",
    description: "Isolated cloud container runners guaranteeing sub-2-minute rapid build turnaround and priority queues.",
    targetPlatform: "All Platforms",
    totalPurchased: 19,
    totalRevenue: 37981,
    active: true,
  },
  {
    id: "addon_whatsapp",
    name: "WhatsApp Order Updates Sync",
    slug: "whatsapp-order-sync",
    price: 1499,
    category: "Store Automation",
    description: "Dispatches automated WhatsApp messages for order confirmation, shipping tracking, and dispatch.",
    targetPlatform: "All Platforms",
    totalPurchased: 31,
    totalRevenue: 46469,
    active: true,
  },
  {
    id: "addon_biometric",
    name: "Biometric Authentication Suite",
    slug: "biometric-auth",
    price: 2499,
    category: "Security & SLA",
    description: "Native FaceID and Fingerprint biometric security credentials for customer accounts.",
    targetPlatform: "All Platforms",
    totalPurchased: 15,
    totalRevenue: 37485,
    active: true,
  },
];

export function AdminAddons() {
  const [addons, setAddons] = useState<AddonItem[]>(DEFAULT_ADDONS);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<AddonItem | null>(null);
  const [deletingAddon, setDeletingAddon] = useState<AddonItem | null>(null);

  // Form State
  const [addonForm, setAddonForm] = useState({
    name: "",
    price: 1999,
    category: "Build & Distribution" as AddonItem["category"],
    targetPlatform: "All Platforms" as AddonItem["targetPlatform"],
    description: "",
    active: true,
  });

  const toggleAddonActive = (id: string) => {
    setAddons(
      addons.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
    );
  };

  const handleStartCreate = () => {
    setAddonForm({
      name: "",
      price: 1999,
      category: "Build & Distribution",
      targetPlatform: "All Platforms",
      description: "Custom platform add-on capability.",
      active: true,
    });
    setIsCreateOpen(true);
  };

  const handleCreateAddon = () => {
    if (!addonForm.name.trim()) return;
    const newAddon: AddonItem = {
      id: "addon_" + Date.now(),
      name: addonForm.name.trim(),
      slug: addonForm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      price: Number(addonForm.price) || 0,
      category: addonForm.category,
      targetPlatform: addonForm.targetPlatform,
      description: addonForm.description.trim(),
      totalPurchased: 0,
      totalRevenue: 0,
      active: addonForm.active,
    };
    setAddons([...addons, newAddon]);
    setIsCreateOpen(false);
  };

  const handleStartEdit = (a: AddonItem) => {
    setEditingAddon(a);
    setAddonForm({
      name: a.name,
      price: a.price,
      category: a.category,
      targetPlatform: a.targetPlatform,
      description: a.description,
      active: a.active,
    });
  };

  const handleSaveEdit = () => {
    if (!editingAddon || !addonForm.name.trim()) return;
    setAddons(
      addons.map((a) =>
        a.id === editingAddon.id
          ? {
              ...a,
              name: addonForm.name.trim(),
              slug: addonForm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              price: Number(addonForm.price) || 0,
              category: addonForm.category,
              targetPlatform: addonForm.targetPlatform,
              description: addonForm.description.trim(),
              active: addonForm.active,
            }
          : a
      )
    );
    setEditingAddon(null);
  };

  const handleDeleteAddon = (id: string) => {
    setAddons(addons.filter((a) => a.id !== id));
    setDeletingAddon(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            Add-on Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage standalone marketplace add-ons, pricing, platform constraints, and sales telemetry.
          </p>
        </div>

        <button
          onClick={handleStartCreate}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-2xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Add-on</span>
        </button>
      </div>

      {/* ── ADD-ONS GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {addons.map((addon) => (
          <div
            key={addon.id}
            className={`bg-white rounded-2xl border p-5 shadow-2xs flex flex-col justify-between space-y-4 transition ${
              addon.active ? "border-slate-200" : "border-slate-200 opacity-60 bg-slate-50/50"
            }`}
          >
            <div>
              {/* Header: Title + Category + Status Toggle */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {addon.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {addon.category}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">
                      {addon.targetPlatform}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => toggleAddonActive(addon.id)}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer flex-shrink-0 ${
                    addon.active
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                  title={addon.active ? "Click to disable add-on" : "Click to activate add-on"}
                >
                  {addon.active ? "Active" : "Disabled"}
                </button>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-500 mt-2.5 line-clamp-2">
                {addon.description}
              </p>

              {/* Price & Telemetry */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                    Price
                  </span>
                  <span className="text-xl font-black text-slate-900 font-mono">
                    ₹{addon.price.toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                    Total Revenue
                  </span>
                  <span className="text-xs font-bold text-emerald-600 font-mono">
                    ₹{addon.totalRevenue.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer: Purchases + Edit / Delete */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                <strong className="text-slate-900 font-bold">{addon.totalPurchased}</strong> units sold
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleStartEdit(addon)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition border border-transparent hover:border-indigo-100 cursor-pointer"
                  title="Edit Add-on"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeletingAddon(addon)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition border border-transparent hover:border-rose-100 cursor-pointer"
                  title="Delete Add-on"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── CREATE ADD-ON MODAL ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 flex flex-col max-h-[82vh] sm:max-h-[84vh] overflow-hidden my-auto animate-in zoom-in-95">
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
              <h3 className="font-bold text-sm text-slate-900">Create New Add-on</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Add-on Name</label>
                <input
                  type="text"
                  placeholder="e.g. Offline Catalog Storage"
                  value={addonForm.name}
                  onChange={(e) => setAddonForm({ ...addonForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={addonForm.price}
                    onChange={(e) => setAddonForm({ ...addonForm, price: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Target Platform</label>
                  <select
                    value={addonForm.targetPlatform}
                    onChange={(e) =>
                      setAddonForm({ ...addonForm, targetPlatform: e.target.value as any })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                  >
                    <option value="All Platforms">All Platforms</option>
                    <option value="Android">Android Only</option>
                    <option value="Apple iOS">Apple iOS Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Category</label>
                <select
                  value={addonForm.category}
                  onChange={(e) =>
                    setAddonForm({ ...addonForm, category: e.target.value as any })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                >
                  <option value="Build & Distribution">Build &amp; Distribution</option>
                  <option value="Branding & White-label">Branding &amp; White-label</option>
                  <option value="Marketing & Push">Marketing &amp; Push</option>
                  <option value="Store Automation">Store Automation</option>
                  <option value="Security & SLA">Security &amp; SLA</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={addonForm.description}
                  onChange={(e) => setAddonForm({ ...addonForm, description: e.target.value })}
                  placeholder="Describe add-on capability and customer entitlement..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden resize-none"
                />
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2 flex-shrink-0 bg-slate-50/90">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAddon}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer shadow-xs"
              >
                Create Add-on
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT ADD-ON MODAL ── */}
      {editingAddon && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 flex flex-col max-h-[82vh] sm:max-h-[84vh] overflow-hidden my-auto animate-in zoom-in-95">
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Edit Add-on</h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  Slug: {editingAddon.slug}
                </span>
              </div>
              <button
                onClick={() => setEditingAddon(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Add-on Name</label>
                <input
                  type="text"
                  value={addonForm.name}
                  onChange={(e) => setAddonForm({ ...addonForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={addonForm.price}
                    onChange={(e) => setAddonForm({ ...addonForm, price: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Target Platform</label>
                  <select
                    value={addonForm.targetPlatform}
                    onChange={(e) =>
                      setAddonForm({ ...addonForm, targetPlatform: e.target.value as any })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                  >
                    <option value="All Platforms">All Platforms</option>
                    <option value="Android">Android Only</option>
                    <option value="Apple iOS">Apple iOS Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Category</label>
                <select
                  value={addonForm.category}
                  onChange={(e) =>
                    setAddonForm({ ...addonForm, category: e.target.value as any })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                >
                  <option value="Build & Distribution">Build &amp; Distribution</option>
                  <option value="Branding & White-label">Branding &amp; White-label</option>
                  <option value="Marketing & Push">Marketing &amp; Push</option>
                  <option value="Store Automation">Store Automation</option>
                  <option value="Security & SLA">Security &amp; SLA</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={addonForm.description}
                  onChange={(e) => setAddonForm({ ...addonForm, description: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="font-semibold text-slate-700">Add-on Status</span>
                <button
                  type="button"
                  onClick={() => setAddonForm({ ...addonForm, active: !addonForm.active })}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                    addonForm.active
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-slate-100 text-slate-500 border border-slate-200"
                  }`}
                >
                  {addonForm.active ? "Status: Active" : "Status: Disabled"}
                </button>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2 flex-shrink-0 bg-slate-50/90">
              <button
                onClick={() => setEditingAddon(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE ADD-ON CONFIRMATION MODAL ── */}
      {deletingAddon && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-bold text-sm text-slate-900">Delete Marketplace Add-on?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to delete add-on <b className="text-slate-800">{deletingAddon.name}</b>? Existing customer licenses will remain active, but new purchases will be discontinued.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDeletingAddon(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteAddon(deletingAddon.id)}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 cursor-pointer shadow-xs"
              >
                Delete Add-on
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
