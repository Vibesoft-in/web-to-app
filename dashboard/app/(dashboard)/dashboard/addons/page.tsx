"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Info,
  ShoppingCart,
  Check,
  ChevronDown,
} from "lucide-react";
import { STANDARDIZED_ADDONS } from "@/lib/addons-data";
import { AddonDetail, AddonLearnMoreModal } from "@/components/addons/addon-learn-more-modal";

export default function AddonsPage() {
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "active">("all");
  const [selectedLearnMoreAddon, setSelectedLearnMoreAddon] = useState<AddonDetail | null>(null);
  const [purchasingAddonId, setPurchasingAddonId] = useState<string | number | null>(null);
  const [activatedAddonIds, setActivatedAddonIds] = useState<(string | number)[]>([]);
  const [expandedAddonId, setExpandedAddonId] = useState<string | number | null>(null);

  const { data: billingData } = useQuery({
    queryKey: ["billing-data"],
    queryFn: () => apiClient("/api/billing"),
  });

  const { data: appsData } = useQuery({
    queryKey: ["apps"],
    queryFn: async () => {
      try {
        const res = await apiClient("/api/apps");
        return Array.isArray(res) ? res : res.apps || [];
      } catch {
        return [];
      }
    },
  });

  const activeApp = appsData?.[0];
  const activeSub = billingData?.active_sub;
  const currentPlan = activeSub?.plan?.name || "Starter App";
  const isEnterprise = currentPlan.includes("Enterprise");
  const isProOrEnterprise = currentPlan.includes("Pro") || isEnterprise;

  // Resolve active status for each of the 8 standardized add-ons
  const resolvedAddons: AddonDetail[] = useMemo(() => {
    return STANDARDIZED_ADDONS.map((addon) => {
      let isAddonActive = false;

      // Plan tier inclusions
      if (isEnterprise) {
        isAddonActive = true;
      } else if (isProOrEnterprise) {
        if (
          addon.id === "play_store" ||
          addon.id === "push_notifications" ||
          addon.id === "white_label"
        ) {
          isAddonActive = true;
        }
      }

      // Check local dynamic activation or backend subscriptions
      if (activatedAddonIds.includes(addon.id)) {
        isAddonActive = true;
      }

      // Action URL for active modules
      let actionUrl = "";
      if (addon.id === "admin_panel") {
        actionUrl = activeApp ? `/dashboard/apps/${activeApp.ulid}/admin` : "/dashboard/apps";
      } else if (addon.id === "push_notifications") {
        actionUrl = activeApp ? `/dashboard/apps/${activeApp.ulid}/admin` : "/dashboard/apps";
      }

      return {
        ...addon,
        isActive: isAddonActive,
        actionUrl,
        purchaseInfo: {
          ...addon.purchaseInfo,
          activeStatusLabel: isAddonActive ? "Active on App" : "Available to Buy",
        },
      };
    });
  }, [isEnterprise, isProOrEnterprise, activatedAddonIds, activeApp]);

  // Live filter counts
  const allCount = resolvedAddons.length;
  const activeCount = resolvedAddons.filter((a) => a.isActive).length;
  const availableCount = resolvedAddons.filter((a) => !a.isActive).length;

  // Filtered addons based on active filter
  const displayedAddons = useMemo(() => {
    if (statusFilter === "active") {
      return resolvedAddons.filter((a) => a.isActive);
    }
    if (statusFilter === "available") {
      return resolvedAddons.filter((a) => !a.isActive);
    }
    return resolvedAddons;
  }, [resolvedAddons, statusFilter]);

  const handleBuyAddon = (addon: AddonDetail) => {
    if (addon.isActive) return;
    setPurchasingAddonId(addon.id);
    setTimeout(() => {
      setActivatedAddonIds((prev) => [...prev, addon.id]);
      setPurchasingAddonId(null);
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Modular Add-ons
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs font-semibold text-slate-600">Active Plan: {currentPlan}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            App Add-ons &amp; Upgrades
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Enhance your mobile app with Play Store publishing, dedicated admin panel, push notifications, and ERP integrations.
          </p>
        </div>

        <Link
          href="/dashboard/billing"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 hover:opacity-95 transition flex-shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>Manage Plan</span>
        </Link>
      </div>

      {/* ── REQUIRED ADD-ON FILTERS (All Add-ons, Available to Buy, Active on App) ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200/80">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            statusFilter === "all"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <span>All Add-ons</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${statusFilter === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
            {allCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("available")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            statusFilter === "available"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <span>Available to Buy</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${statusFilter === "available" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
            {availableCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("active")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            statusFilter === "active"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <span>Active on App</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${statusFilter === "active" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"}`}>
            {activeCount}
          </span>
        </button>
      </div>

      {/* ── REDESIGNED COMPACT EXPANDABLE ADD-ONS LIST ── */}
      <div className="space-y-3">
        {displayedAddons.map((addon) => {
          const Icon = addon.icon || Sparkles;
          const isPurchasing = purchasingAddonId === addon.id;
          const isExpanded = expandedAddonId === addon.id;

          return (
            <div
              key={addon.id}
              className={`rounded-2xl border transition-all overflow-hidden ${
                isExpanded
                  ? "border-indigo-600 bg-indigo-50/20 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
              }`}
            >
              {/* Compact Heading Row */}
              <div
                onClick={() => setExpandedAddonId(isExpanded ? null : addon.id)}
                className="flex items-center justify-between p-4 cursor-pointer select-none gap-3"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      addon.isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-indigo-50 text-indigo-700"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-sm text-slate-900 truncate">
                        {addon.shortName}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600">
                        {addon.category || "Extension"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5 max-w-xl">
                      {addon.oneLineDesc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 flex-shrink-0">
                  <div className="text-right hidden sm:block">
                    <span className="text-sm font-black text-slate-900 block leading-tight">
                      {addon.price}
                    </span>
                    <span className="text-[10px] text-slate-400 block leading-tight">
                      {addon.licenseType}
                    </span>
                  </div>

                  {addon.isActive ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>Active</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      Available
                    </span>
                  )}

                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      isExpanded ? "rotate-180 text-indigo-600" : ""
                    }`}
                  />
                </div>
              </div>

              {/* Expandable Details Section */}
              {isExpanded && (
                <div className="p-5 pt-0 border-t border-slate-100 mt-1 space-y-4 animate-fadeIn">
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {addon.oneLineDesc}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {addon.featureDetails?.items && (
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
                        <strong className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block">
                          Features &amp; Capabilities
                        </strong>
                        <ul className="space-y-1.5 text-slate-600">
                          {addon.featureDetails.items.slice(0, 4).map((b: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {addon.whyItIsUsed?.benefits && (
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
                        <strong className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block">
                          Why It Matters &amp; ROI
                        </strong>
                        <ul className="space-y-1.5 text-slate-600">
                          {addon.whyItIsUsed.benefits.slice(0, 4).map((step: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="w-3.5 h-3.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Actions & Price bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div className="text-xs text-slate-500">
                      <span>Price: </span>
                      <strong className="text-slate-900 text-sm">{addon.price}</strong>
                      <span className="mx-2">&bull;</span>
                      <span>License: </span>
                      <strong className="text-slate-800">{addon.licenseType}</strong>
                      <span className="mx-2">&bull;</span>
                      <span>Status: </span>
                      <strong className={addon.isActive ? "text-emerald-700" : "text-slate-700"}>
                        {addon.isActive ? "Active on App" : "Available to Buy"}
                      </strong>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedLearnMoreAddon(addon)}
                        className="py-2 px-3 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition flex items-center gap-1 cursor-pointer"
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span>View Guide</span>
                      </button>

                      {addon.isActive ? (
                        addon.actionUrl ? (
                          <a
                            href={addon.actionUrl}
                            className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-2xs"
                          >
                            <span>Open Panel</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="py-2 px-3 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </span>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleBuyAddon(addon)}
                          disabled={isPurchasing}
                          className="py-2 px-5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>{isPurchasing ? "Processing..." : `Buy Add-on (${addon.price})`}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── MODAL: 4-SECTION LEARN MORE POPUP ── */}
      <AddonLearnMoreModal
        isOpen={Boolean(selectedLearnMoreAddon)}
        onClose={() => setSelectedLearnMoreAddon(null)}
        addon={selectedLearnMoreAddon}
        onSelectOrBuy={handleBuyAddon}
      />
    </div>
  );
}
