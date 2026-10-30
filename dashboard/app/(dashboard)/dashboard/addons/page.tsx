"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Globe,
  HelpCircle,
  Layers,
  MessageSquare,
  Package,
  Plus,
  Rocket,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react";

interface Addon {
  id: string;
  name: string;
  category: "publishing" | "marketing" | "branding" | "infra";
  badge: string;
  badgeColor: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  includedInPlan?: string;
  icon: any;
  actionText: string;
}

export default function AddonsPage() {
  const [filter, setFilter] = useState<string>("all");
  const [selectedAddon, setSelectedAddon] = useState<Addon | null>(null);
  const [requestStatus, setRequestStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [userNotes, setUserNotes] = useState("");

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

  const addons: Addon[] = [
    {
      id: "play_store",
      name: "Google Play Store Publishing Assistant",
      category: "publishing",
      badge: "Most Popular",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      price: !isProOrEnterprise ? "₹1,499" : "Included Free",
      period: !isProOrEnterprise ? "one-time setup" : "in your current plan",
      description: "Get your Android App published on the official Google Play Store with zero hassle. We handle console setup, asset guidelines, and approval guarantees.",
      features: [
        "Google Play Console compliance audit",
        "Auto-generated High-Res Feature Graphic & Screenshots",
        "Privacy Policy URL & Terms of Service hosting",
        "Signed production .aab bundle deployment",
        "Google Play review acceptance guarantee",
      ],
      includedInPlan: "Pro Combo & Enterprise Suite",
      icon: Rocket,
      actionText: "Request Play Store Publishing",
    },
    {
      id: "apple_store",
      name: "Apple App Store (iOS) Native Package",
      category: "publishing",
      badge: "High Demand",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      price: isEnterprise ? "Included Free" : "₹2,999",
      period: isEnterprise ? "in your current plan" : "one-time setup",
      description: "Expand your reach to iPhone and iPad users. Includes signed .ipa package compilation, TestFlight beta setup, and App Store review assistance.",
      features: [
        "Native iOS 17 & 18 optimized compilation",
        "Apple Developer Certificate & Provisioning profile",
        "TestFlight beta testing invitations",
        "App Store Connect metadata & screenshots",
        "Assistance with Apple Human Interface Guidelines",
      ],
      includedInPlan: "Enterprise Suite",
      icon: Smartphone,
      actionText: "Activate iOS Publishing",
    },
    {
      id: "push_notifications",
      name: "Push Notifications Campaign Engine Pro",
      category: "marketing",
      badge: "Boost Sales 3x",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      price: !isProOrEnterprise ? "₹699" : "Included Free",
      period: !isProOrEnterprise ? "/ month" : "in your current plan",
      description: "Directly message your customers on their lock screen. Trigger automated abandoned cart alerts, flash sale announcements, and discount coupons.",
      features: [
        "Unlimited scheduled broadcast campaigns",
        "Rich Media push with high-res product photos",
        "Deep-linking directly to specific sale items",
        "Automated cart abandonment reminders",
        "Detailed click-through analytics & delivery rates",
      ],
      includedInPlan: "Pro Combo & Enterprise Suite",
      icon: Bell,
      actionText: "Configure Push Notifications",
    },
    {
      id: "whatsapp_suite",
      name: "WhatsApp Automated Order Sync & Chat",
      category: "marketing",
      badge: "Conversion Booster",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      price: isEnterprise ? "Included Free" : "₹999",
      period: isEnterprise ? "in your current plan" : "/ month",
      description: "Connect your official WhatsApp Business API to send real-time order confirmation alerts, live tracking updates, and in-app 1-click live chat.",
      features: [
        "Automated WhatsApp order confirmation message",
        "Real-time shipment dispatch & tracking links",
        "Floating in-app WhatsApp support widget",
        "COD verification & address confirmation bot",
        "Indian & International phone number support",
      ],
      includedInPlan: "Enterprise Suite",
      icon: MessageSquare,
      actionText: "Connect WhatsApp Integration",
    },
    {
      id: "white_label",
      name: "100% White-Label & Custom Branding Pack",
      category: "branding",
      badge: "Full Identity",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      price: !isProOrEnterprise ? "₹999" : "Included Free",
      period: !isProOrEnterprise ? "/ month" : "in your current plan",
      description: "Remove all platform watermarks and branding. Deliver a 100% tailored brand experience with custom fonts, animated splash screen, and custom package name.",
      features: [
        "Complete removal of 'Powered by Appify' badges",
        "Custom branded animated splash screen loader",
        "Your own custom fonts & typography styling",
        "Custom package name (e.g. com.yourbrand.store)",
        "Custom App Store listing developer identity",
      ],
      includedInPlan: "Pro Combo & Enterprise Suite",
      icon: Sparkles,
      actionText: "Enable White-Labeling",
    },
    {
      id: "cloud_infra",
      name: "Dedicated High-Speed Cloud Server & 99.9% SLA",
      category: "infra",
      badge: "Enterprise Grade",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      price: isEnterprise ? "Included Free" : "₹1,999",
      period: isEnterprise ? "in your current plan" : "/ month",
      description: "Blazing fast product synchronization for large stores (10,000+ products). Includes dedicated redis caching and prioritized build queues.",
      features: [
        "Sub-second catalog synchronization engine",
        "Priority build pipeline (compile in < 30 seconds)",
        "99.9% Guaranteed uptime service level agreement",
        "Automated database backups & CDN asset caching",
        "Dedicated VIP WhatsApp support engineer",
      ],
      includedInPlan: "Enterprise Plan",
      icon: Zap,
      actionText: "Upgrade Cloud Node",
    },
  ];

  const filteredAddons = filter === "all" ? addons : addons.filter((a) => a.category === filter);

  const handleOpenModal = (addon: Addon) => {
    setSelectedAddon(addon);
    setRequestStatus("idle");
    setUserNotes("");
  };

  const handleSubmitRequest = () => {
    setRequestStatus("submitting");
    setTimeout(() => {
      setRequestStatus("success");
    }, 1200);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Enhancement Store
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs font-semibold text-slate-600">Active Plan: {currentPlan}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            App Enhancements &amp; Add-ons
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Supercharge your built mobile application with Play Store publishing, iOS packages, WhatsApp automation, and white-labeling.
          </p>
        </div>

        <Link
          href="/dashboard/billing"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 hover:opacity-95 transition flex-shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>Manage / Upgrade Plan</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { key: "all", label: "All Add-ons" },
          { key: "publishing", label: "Store Publishing" },
          { key: "marketing", label: "Marketing & Push" },
          { key: "branding", label: "Branding & White-label" },
          { key: "infra", label: "Cloud & SLA" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filter === tab.key
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Addons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAddons.map((addon) => {
          const Icon = addon.icon;
          return (
            <div
              key={addon.id}
              className="bg-white border border-slate-200 hover:border-indigo-300 rounded-3xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between relative group"
            >
              <div>
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition duration-200">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${addon.badgeColor}`}
                  >
                    {addon.badge}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">{addon.name}</h3>
                <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                  {addon.description}
                </p>

                {/* Price Display */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-baseline gap-2">
                  <span className="text-xl font-extrabold text-slate-900">{addon.price}</span>
                  {addon.period && (
                    <span className="text-xs text-slate-400 font-medium">{addon.period}</span>
                  )}
                </div>

                {/* Features List */}
                <ul className="mt-4 space-y-2 text-xs text-slate-600">
                  {addon.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bottom Action Button */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleOpenModal(addon)}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-1.5"
                >
                  <span>{addon.actionText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Modal */}
      {selectedAddon && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {requestStatus === "success" ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Add-on Activated Successfully!</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Your request for <strong>{selectedAddon.name}</strong> has been confirmed. Our team has mapped this enhancement to your application{" "}
                  <strong>{activeApp?.name || "Website Development"}</strong>.
                </p>
                <div className="pt-4">
                  <button
                    onClick={() => setSelectedAddon(null)}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/20"
                  >
                    Done &amp; Back to Store
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                      Add-on Configuration
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedAddon.name}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedAddon(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center font-bold text-base"
                  >
                    &times;
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Selected Application:</span>
                    <span className="font-bold text-slate-900">{activeApp?.name || "Website Development"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Add-on Investment:</span>
                    <span className="font-extrabold text-indigo-600">
                      {selectedAddon.price} {selectedAddon.period}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Plan Tier:</span>
                    <span className="font-semibold text-slate-700">{currentPlan}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Special Instructions / Notes (Optional):
                  </label>
                  <textarea
                    rows={3}
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    placeholder="e.g. Please use my existing Google Play Console account or connect specific WhatsApp business number..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAddon(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={requestStatus === "submitting"}
                    onClick={handleSubmitRequest}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2"
                  >
                    {requestStatus === "submitting" ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Activating...</span>
                      </>
                    ) : (
                      <span>Confirm &amp; Enable</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
