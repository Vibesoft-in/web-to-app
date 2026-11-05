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
  Loader2,
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

      {/* ── RESPONSIVE MULTI-COLUMN ADD-ONS GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {displayedAddons.map((addon) => {
          const Icon = addon.icon || Sparkles;
          const isPurchasing = purchasingAddonId === addon.id;
          const isExpanded = expandedAddonId === addon.id;

          return (
            <div
              key={addon.id}
              className={`rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                isExpanded
                  ? "border-indigo-600 bg-indigo-50/20 shadow-md ring-1 ring-indigo-600/30"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              {/* Card Main Info */}
              <div className="p-4 sm:p-5 space-y-3 flex-1">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-3 min-w-0">
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
                      <h3 className="font-extrabold text-sm text-slate-900 truncate">
                        {addon.shortName}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 inline-block mt-0.5">
                        {addon.category || "Extension"}
                      </span>
                    </div>
                  </div>

                  <div>
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
                  </div>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <span className="text-base font-black text-slate-900">{addon.price}</span>
                    <span className="text-[10px] text-slate-400 ml-1.5 font-medium">{addon.licenseType}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                  {addon.oneLineDesc}
                </p>
              </div>

              {/* Card Bottom / Toggle & Actions */}
              <div className="p-4 pt-0 space-y-3">
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setExpandedAddonId(isExpanded ? null : addon.id)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer select-none"
                  >
                    <span>{isExpanded ? "Hide Details" : "View Details"}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <div className="flex items-center gap-2">
                    {addon.isActive ? (
                      addon.actionUrl ? (
                        <a
                          href={addon.actionUrl}
                          className="py-1.5 px-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition flex items-center gap-1 shadow-2xs"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="py-1.5 px-2.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Installed</span>
                        </span>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleBuyAddon(addon)}
                        disabled={isPurchasing}
                        className="py-1.5 px-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-1 shadow-2xs cursor-pointer active:scale-98"
                      >
                        {isPurchasing ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Opening...</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-3 h-3" />
                            <span>Buy Add-on</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable Section inside card */}
                {isExpanded && (
                  <div className="pt-3 border-t border-slate-100 space-y-3 animate-fadeIn text-xs">
                    {addon.featureDetails?.items && (
                      <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1.5">
                        <strong className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 block">
                          Features &amp; Capabilities
                        </strong>
                        <ul className="space-y-1 text-slate-600">
                          {addon.featureDetails.items.slice(0, 3).map((b: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <Check className="w-3 h-3 text-emerald-600 flex-shrink-0 mt-0.5" />
                              <span className="text-[11px] leading-tight">{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedLearnMoreAddon(addon)}
                        className="py-1.5 px-2.5 rounded-lg text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition flex items-center gap-1 cursor-pointer"
                      >
                        <Info className="w-3 h-3" />
                        <span>Full Guide</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
