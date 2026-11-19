"use client";

import React, { useState } from "react";
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Sparkles,
  Smartphone,
  Shield,
  Layers,
  Check,
} from "lucide-react";

export interface PlanItem {
  id: string;
  name: string;
  slug: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  badge?: string;
  isPopular?: boolean;
  features: string[];
  apkIncluded: boolean;
  aabIncluded: boolean;
  ipaIncluded: boolean;
  customThemes: boolean;
  dedicatedRunner: boolean;
  whiteLabel: boolean;
  subscribersCount: number;
  active: boolean;
}

const DEFAULT_PLANS: PlanItem[] = [
  {
    id: "plan_starter",
    name: "Starter Tier",
    slug: "starter",
    monthlyPrice: 2999,
    annualPrice: 29990,
    description: "Ideal for boutique shops and early-stage stores building their first Android app.",
    features: [
      "Android APK Package",
      "Push Notifications (FCM)",
      "Standard Store Themes",
      "Real-time WooCommerce / Shopify Sync",
    ],
    apkIncluded: true,
    aabIncluded: false,
    ipaIncluded: false,
    customThemes: false,
    dedicatedRunner: false,
    whiteLabel: false,
    subscribersCount: 248,
    active: true,
  },
  {
    id: "plan_growth",
    name: "Growth Tier",
    slug: "growth",
    monthlyPrice: 7999,
    annualPrice: 79990,
    description: "Complete commercial solution for growing brands deploying to Google Play Store.",
    badge: "Most Popular",
    isPopular: true,
    features: [
      "Android APK & Google Play AAB",
      "White-label Splash & App Launcher Icon",
      "Cart & Payment Gateway Integration",
      "Automated Catalog Synchronizer",
      "Standard Build Pipeline (10 mins)",
    ],
    apkIncluded: true,
    aabIncluded: true,
    ipaIncluded: false,
    customThemes: true,
    dedicatedRunner: false,
    whiteLabel: true,
    subscribersCount: 582,
    active: true,
  },
  {
    id: "plan_enterprise",
    name: "Enterprise Pro Suite",
    slug: "enterprise",
    monthlyPrice: 14999,
    annualPrice: 149990,
    description: "High-volume multi-store architecture with Apple iOS and dedicated build servers.",
    badge: "Enterprise",
    features: [
      "Android APK, Google Play AAB & Apple iOS (.IPA)",
      "Dedicated Cloud Build Runner (2-min builds)",
      "All Premium Themes & Custom CSS Overrides",
      "Priority SLA Support & SLA Escalation",
      "Biometric Customer Login Support",
    ],
    apkIncluded: true,
    aabIncluded: true,
    ipaIncluded: true,
    customThemes: true,
    dedicatedRunner: true,
    whiteLabel: true,
    subscribersCount: 198,
    active: true,
  },
];

export function AdminPlans() {
  const [plans, setPlans] = useState<PlanItem[]>(DEFAULT_PLANS);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<PlanItem | null>(null);

  // Form State
  const [planForm, setPlanForm] = useState({
    name: "",
    monthlyPrice: 2999,
    annualPrice: 29990,
    description: "",
    badge: "",
    isPopular: false,
    featuresText: "",
    apkIncluded: true,
    aabIncluded: true,
    ipaIncluded: false,
    customThemes: true,
    dedicatedRunner: false,
    whiteLabel: false,
    active: true,
  });

  const togglePlanActive = (id: string) => {
    setPlans(
      plans.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    );
  };

  const handleStartCreate = () => {
    setPlanForm({
      name: "",
      monthlyPrice: 4999,
      annualPrice: 49990,
      description: "Custom platform subscription tier.",
      badge: "",
      isPopular: false,
      featuresText: "Android APK & Play Store AAB\nPush Notifications\nWhite-label Branding",
      apkIncluded: true,
      aabIncluded: true,
      ipaIncluded: false,
      customThemes: true,
      dedicatedRunner: false,
      whiteLabel: true,
      active: true,
    });
    setIsCreateOpen(true);
  };

  const handleCreatePlan = () => {
    if (!planForm.name.trim()) return;
    const featuresList = planForm.featuresText
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);

    const newPlan: PlanItem = {
      id: "plan_" + Date.now(),
      name: planForm.name.trim(),
      slug: planForm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      monthlyPrice: Number(planForm.monthlyPrice) || 0,
      annualPrice: Number(planForm.annualPrice) || 0,
      description: planForm.description.trim(),
      badge: planForm.badge.trim() || undefined,
      isPopular: planForm.isPopular,
      features: featuresList.length > 0 ? featuresList : ["Standard Mobile Features"],
      apkIncluded: planForm.apkIncluded,
      aabIncluded: planForm.aabIncluded,
      ipaIncluded: planForm.ipaIncluded,
      customThemes: planForm.customThemes,
      dedicatedRunner: planForm.dedicatedRunner,
      whiteLabel: planForm.whiteLabel,
      subscribersCount: 0,
      active: planForm.active,
    };

    setPlans([...plans, newPlan]);
    setIsCreateOpen(false);
  };

  const handleStartEdit = (p: PlanItem) => {
    setEditingPlan(p);
    setPlanForm({
      name: p.name,
      monthlyPrice: p.monthlyPrice,
      annualPrice: p.annualPrice,
      description: p.description,
      badge: p.badge || "",
      isPopular: Boolean(p.isPopular),
      featuresText: p.features.join("\n"),
      apkIncluded: p.apkIncluded,
      aabIncluded: p.aabIncluded,
      ipaIncluded: p.ipaIncluded,
      customThemes: p.customThemes,
      dedicatedRunner: p.dedicatedRunner,
      whiteLabel: p.whiteLabel,
      active: p.active,
    });
  };

  const handleSaveEdit = () => {
    if (!editingPlan || !planForm.name.trim()) return;
    const featuresList = planForm.featuresText
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);

    setPlans(
      plans.map((p) =>
        p.id === editingPlan.id
          ? {
              ...p,
              name: planForm.name.trim(),
              slug: planForm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              monthlyPrice: Number(planForm.monthlyPrice) || 0,
              annualPrice: Number(planForm.annualPrice) || 0,
              description: planForm.description.trim(),
              badge: planForm.badge.trim() || undefined,
              isPopular: planForm.isPopular,
              features: featuresList.length > 0 ? featuresList : p.features,
              apkIncluded: planForm.apkIncluded,
              aabIncluded: planForm.aabIncluded,
              ipaIncluded: planForm.ipaIncluded,
              customThemes: planForm.customThemes,
              dedicatedRunner: planForm.dedicatedRunner,
              whiteLabel: planForm.whiteLabel,
              active: planForm.active,
            }
          : p
      )
    );
    setEditingPlan(null);
  };

  const handleDeletePlan = (id: string) => {
    setPlans(plans.filter((p) => p.id !== id));
    setDeletingPlan(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            Subscriptions &amp; Plans
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage SaaS pricing tiers, build allowances, features, and active subscribers.
          </p>
        </div>

        <button
          onClick={handleStartCreate}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-2xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Plan</span>
        </button>
      </div>

      {/* ── PLANS GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-2xl border p-5 shadow-2xs flex flex-col justify-between space-y-4 transition ${
              plan.isPopular ? "border-indigo-600 ring-2 ring-indigo-600/10" : "border-slate-200"
            } ${!plan.active ? "opacity-60 bg-slate-50/50" : ""}`}
          >
            <div>
              {/* Header: Title + Badge + Status Toggle */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-bold text-slate-900">
                      {plan.name}
                    </h3>
                    {plan.badge && (
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {plan.description}
                  </p>
                </div>

                <button
                  onClick={() => togglePlanActive(plan.id)}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer flex-shrink-0 ${
                    plan.active
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                  title={plan.active ? "Click to disable plan" : "Click to activate plan"}
                >
                  {plan.active ? "Active" : "Disabled"}
                </button>
              </div>

              {/* Pricing Display */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 font-mono">
                    ₹{plan.monthlyPrice.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  or <strong className="font-mono text-slate-700">₹{plan.annualPrice.toLocaleString()}</strong> billed annually
                </div>
              </div>

              {/* Build Capabilities Matrix */}
              <div className="mt-3.5 grid grid-cols-3 gap-1.5 text-[11px] text-center">
                <span
                  className={`px-2 py-1 rounded font-bold ${
                    plan.apkIncluded
                      ? "bg-indigo-50 text-indigo-700"
                      : "bg-slate-100 text-slate-400 line-through"
                  }`}
                >
                  APK
                </span>
                <span
                  className={`px-2 py-1 rounded font-bold ${
                    plan.aabIncluded
                      ? "bg-indigo-50 text-indigo-700"
                      : "bg-slate-100 text-slate-400 line-through"
                  }`}
                >
                  Play AAB
                </span>
                <span
                  className={`px-2 py-1 rounded font-bold ${
                    plan.ipaIncluded
                      ? "bg-indigo-50 text-indigo-700"
                      : "bg-slate-100 text-slate-400 line-through"
                  }`}
                >
                  iOS IPA
                </span>
              </div>

              {/* Feature Bullets */}
              <ul className="text-xs text-slate-600 space-y-2 mt-4 pt-3 border-t border-slate-100">
                {plan.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer: Subscriber Count + Edit / Delete */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                <strong className="text-slate-900 font-bold">{plan.subscribersCount}</strong> subscribers
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleStartEdit(plan)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition border border-transparent hover:border-indigo-100 cursor-pointer"
                  title="Edit Plan"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeletingPlan(plan)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition border border-transparent hover:border-rose-100 cursor-pointer"
                  title="Delete Plan"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── CREATE PLAN MODAL ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 flex flex-col max-h-[82vh] sm:max-h-[84vh] overflow-hidden my-auto animate-in zoom-in-95">
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
              <h3 className="font-bold text-sm text-slate-900">Create Subscription Plan</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Plan Name</label>
                <input
                  type="text"
                  placeholder="e.g. VIP Brand Suite"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Monthly Price (₹)</label>
                  <input
                    type="number"
                    value={planForm.monthlyPrice}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, monthlyPrice: Number(e.target.value) })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Annual Price (₹)</label>
                  <input
                    type="number"
                    value={planForm.annualPrice}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, annualPrice: Number(e.target.value) })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Badge Tag (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Recommended, Popular"
                  value={planForm.badge}
                  onChange={(e) => setPlanForm({ ...planForm, badge: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden resize-none"
                />
              </div>

              {/* Build Capabilities Checkboxes */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">Package Capabilities</label>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={planForm.apkIncluded}
                      onChange={(e) => setPlanForm({ ...planForm, apkIncluded: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>Android APK</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={planForm.aabIncluded}
                      onChange={(e) => setPlanForm({ ...planForm, aabIncluded: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>Play AAB</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={planForm.ipaIncluded}
                      onChange={(e) => setPlanForm({ ...planForm, ipaIncluded: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>Apple iOS</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Features (One per line)
                </label>
                <textarea
                  rows={5}
                  value={planForm.featuresText}
                  onChange={(e) => setPlanForm({ ...planForm, featuresText: e.target.value })}
                  placeholder="Unlimited builds&#10;White-label icon&#10;Custom themes"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:outline-hidden focus:border-indigo-500 min-h-[120px] leading-relaxed resize-y"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="createPlanPopular"
                  checked={planForm.isPopular}
                  onChange={(e) => setPlanForm({ ...planForm, isPopular: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="createPlanPopular" className="font-semibold text-slate-700 cursor-pointer">
                  Highlight as Popular Plan
                </label>
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
                onClick={handleCreatePlan}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer shadow-xs"
              >
                Create Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT PLAN MODAL ── */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 flex flex-col max-h-[82vh] sm:max-h-[84vh] overflow-hidden my-auto animate-in zoom-in-95">
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Edit Subscription Plan</h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  Slug: {editingPlan.slug}
                </span>
              </div>
              <button
                onClick={() => setEditingPlan(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Plan Name</label>
                <input
                  type="text"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Monthly Price (₹)</label>
                  <input
                    type="number"
                    value={planForm.monthlyPrice}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, monthlyPrice: Number(e.target.value) })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Annual Price (₹)</label>
                  <input
                    type="number"
                    value={planForm.annualPrice}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, annualPrice: Number(e.target.value) })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Badge Tag</label>
                <input
                  type="text"
                  value={planForm.badge}
                  onChange={(e) => setPlanForm({ ...planForm, badge: e.target.value })}
                  placeholder="e.g. Most Popular, Best Value"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden resize-none"
                />
              </div>

              {/* Build Capabilities Checkboxes */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">Package Capabilities</label>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={planForm.apkIncluded}
                      onChange={(e) => setPlanForm({ ...planForm, apkIncluded: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>Android APK</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={planForm.aabIncluded}
                      onChange={(e) => setPlanForm({ ...planForm, aabIncluded: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>Play AAB</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={planForm.ipaIncluded}
                      onChange={(e) => setPlanForm({ ...planForm, ipaIncluded: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>Apple iOS</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Features (One per line)
                </label>
                <textarea
                  rows={5}
                  value={planForm.featuresText}
                  onChange={(e) => setPlanForm({ ...planForm, featuresText: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:outline-hidden focus:border-indigo-500 min-h-[120px] leading-relaxed resize-y"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editPlanPopular"
                    checked={planForm.isPopular}
                    onChange={(e) => setPlanForm({ ...planForm, isPopular: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <label htmlFor="editPlanPopular" className="font-semibold text-slate-700 cursor-pointer">
                    Popular Plan
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => setPlanForm({ ...planForm, active: !planForm.active })}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                    planForm.active
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-slate-100 text-slate-500 border border-slate-200"
                  }`}
                >
                  {planForm.active ? "Status: Active" : "Status: Disabled"}
                </button>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2 flex-shrink-0 bg-slate-50/90">
              <button
                onClick={() => setEditingPlan(null)}
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

      {/* ── DELETE PLAN CONFIRMATION MODAL ── */}
      {deletingPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-bold text-sm text-slate-900">Delete Subscription Plan?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to delete <b className="text-slate-800">{deletingPlan.name}</b>? Existing subscribers on this plan will not be terminated, but new checkouts will be restricted.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDeletingPlan(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePlan(deletingPlan.id)}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 cursor-pointer shadow-xs"
              >
                Delete Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
