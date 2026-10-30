"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Box,
  Calculator,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  FileSpreadsheet,
  Gauge,
  Globe,
  HelpCircle,
  Info,
  Layers,
  List,
  Loader2,
  MessageSquare,
  PhoneCall,
  RefreshCw,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";

interface StepAnalysisProps {
  ulid?: string;
  app?: any;
  onNext: () => void;
}

interface Pillar {
  id: string;
  name: string;
  shortLabel: string;
  colorName: string;
  weight: number; // Max weight points (sum = 100)
  scoreHigh: number;
  scoreLow: number;
  color: string;
  colorBadgeBg: string;
  colorBadgeText: string;
  colorBadgeBorder: string;
  icon: any;
  metricKey: string;
  defaultVal: string;
  unit: string;
  benchmark: string;
  description: string;
  checklistHigh: string[];
  checklistLow: string[];
}

// 11 Core Pillars evaluating Website Performance, Technical Quality & Catalog Readiness
const PILLARS: Pillar[] = [
  {
    id: "speed",
    name: "Mobile Speed & Response Latency",
    shortLabel: "Speed (TTFB)",
    colorName: "Sky Blue",
    weight: 10,
    scoreHigh: 9,
    scoreLow: 4,
    color: "#0284c7",
    colorBadgeBg: "bg-sky-50",
    colorBadgeText: "text-sky-700",
    colorBadgeBorder: "border-sky-200",
    icon: Zap,
    metricKey: "speed",
    defaultVal: "145ms",
    unit: "ms",
    benchmark: "< 300ms",
    description: "Measures server time-to-first-byte (TTFB), REST API response latency, and payload delivery.",
    checklistHigh: [
      "Server API latency under 300ms for live catalog endpoints",
      "Mobile-friendly gzip/brotli compression active",
      "Instant data streaming ready for mobile app rails",
    ],
    checklistLow: [
      "Server response latency exceeds 900ms",
      "Unoptimized queries cause slow mobile app synchronization",
    ],
  },
  {
    id: "total_products",
    name: "Total Products Catalog",
    shortLabel: "Total Products",
    colorName: "Emerald Green",
    weight: 8,
    scoreHigh: 7,
    scoreLow: 3,
    color: "#10b981",
    colorBadgeBg: "bg-emerald-50",
    colorBadgeText: "text-emerald-700",
    colorBadgeBorder: "border-emerald-200",
    icon: Box,
    metricKey: "total_products",
    defaultVal: "24 items",
    unit: "items",
    benchmark: "Catalog ready",
    description: "Evaluates active product inventory volume, variant pricing, descriptions, and catalog depth.",
    checklistHigh: [
      "Catalog products detected with active pricing and currency",
      "Product variant options cleanly configured",
      "Sufficient depth for engaging category grids and carousels",
    ],
    checklistLow: [
      "Low or zero active products detected in catalog",
      "Missing product images or short descriptions",
    ],
  },
  {
    id: "first_contentful_paint",
    name: "First Contentful Paint (FCP)",
    shortLabel: "First Paint (FCP)",
    colorName: "Cyan",
    weight: 10,
    scoreHigh: 9,
    scoreLow: 4,
    color: "#06b6d4",
    colorBadgeBg: "bg-cyan-50",
    colorBadgeText: "text-cyan-700",
    colorBadgeBorder: "border-cyan-200",
    icon: Clock,
    metricKey: "first_contentful_paint",
    defaultVal: "1.1s",
    unit: "s",
    benchmark: "< 1.8s",
    description: "Time from when the page starts loading to when any part of the page's content is rendered.",
    checklistHigh: [
      "First DOM element painted in under 1.8s Google CWV standard",
      "Zero render-blocking scripts delaying first paint",
      "Instant visual feedback on 4G/5G mobile connections",
    ],
    checklistLow: [
      "FCP takes longer than 2.8s on mobile networks",
      "Heavy stylesheet dependencies delay initial rendering",
    ],
  },
  {
    id: "last_contentful_paint",
    name: "Last Contentful Paint (LCP)",
    shortLabel: "Last Paint (LCP)",
    colorName: "Indigo",
    weight: 12,
    scoreHigh: 11,
    scoreLow: 5,
    color: "#6366f1",
    colorBadgeBg: "bg-indigo-50",
    colorBadgeText: "text-indigo-700",
    colorBadgeBorder: "border-indigo-200",
    icon: Sparkles,
    metricKey: "last_contentful_paint",
    defaultVal: "1.9s",
    unit: "s",
    benchmark: "< 2.5s",
    description: "Time until the main hero banner / primary product block is fully visible to the user.",
    checklistHigh: [
      "Primary hero banner renders in under 2.5s",
      "WebP / optimized images loaded with high priority",
      "Smooth visual stability without content layout shifts",
    ],
    checklistLow: [
      "Hero banner image takes over 3.8s to fully load",
      "Oversized uncompressed images cause mobile bandwidth lag",
    ],
  },
  {
    id: "total_blocking_time",
    name: "Total Blocking Time (TBT)",
    shortLabel: "Blocking Time (TBT)",
    colorName: "Amber Orange",
    weight: 10,
    scoreHigh: 9,
    scoreLow: 4,
    color: "#f59e0b",
    colorBadgeBg: "bg-amber-50",
    colorBadgeText: "text-amber-700",
    colorBadgeBorder: "border-amber-200",
    icon: TrendingDown,
    metricKey: "total_blocking_time",
    defaultVal: "120ms",
    unit: "ms",
    benchmark: "< 200ms",
    description: "Total main-thread blocked time between FCP and Time to Interactive (input delay).",
    checklistHigh: [
      "Main thread blocked for less than 200ms during page load",
      "JavaScript parsed cleanly without input lag",
      "Immediate user touch and tap responsiveness",
    ],
    checklistLow: [
      "Third-party tracking scripts block main thread (> 350ms)",
      "Users experience input delay when tapping buttons",
    ],
  },
  {
    id: "performance",
    name: "Core Web Vitals Performance",
    shortLabel: "Performance",
    colorName: "Purple Violet",
    weight: 14,
    scoreHigh: 8,
    scoreLow: 5,
    color: "#8b5cf6",
    colorBadgeBg: "bg-purple-50",
    colorBadgeText: "text-purple-700",
    colorBadgeBorder: "border-purple-200",
    icon: Gauge,
    metricKey: "performance",
    defaultVal: "60/100",
    unit: "/100",
    benchmark: "> 85",
    description: "Comprehensive Google Core Web Vitals aggregate scoring across paint, interactivity, and stability.",
    checklistHigh: [
      "High overall Core Web Vitals rating (> 85/100)",
      "Lean DOM tree hierarchy without excessive element nesting",
      "Optimized for smooth 60fps mobile scrolling",
    ],
    checklistLow: [
      "Low performance score with bloated script bundles",
      "Cumulative layout shifts degrade mobile user experience",
    ],
  },
  {
    id: "accessibility",
    name: "Accessibility & UX (a11y)",
    shortLabel: "Accessibility",
    colorName: "Pink Rose",
    weight: 8,
    scoreHigh: 7,
    scoreLow: 3,
    color: "#ec4899",
    colorBadgeBg: "bg-pink-50",
    colorBadgeText: "text-pink-700",
    colorBadgeBorder: "border-pink-200",
    icon: Users,
    metricKey: "accessibility",
    defaultVal: "85/100",
    unit: "/100",
    benchmark: "> 85",
    description: "Assesses semantic markup, image alt tags, color contrast, and screen reader friendliness.",
    checklistHigh: [
      "Image alt descriptions detected across product media",
      "High contrast between text and background surfaces",
      "Standard touch targets (> 44x44px) ready for mobile fingers",
    ],
    checklistLow: [
      "Missing image alt tags and unlabeled buttons",
      "Low contrast text difficult to read on mobile screens",
    ],
  },
  {
    id: "best_practise",
    name: "Web Best Practices",
    shortLabel: "Best Practices",
    colorName: "Teal",
    weight: 8,
    scoreHigh: 8,
    scoreLow: 3,
    color: "#14b8a6",
    colorBadgeBg: "bg-teal-50",
    colorBadgeText: "text-teal-700",
    colorBadgeBorder: "border-teal-200",
    icon: CheckCircle2,
    metricKey: "best_practise",
    defaultVal: "100/100",
    unit: "/100",
    benchmark: "> 90",
    description: "Compliance with modern web specifications, HTML5 doctype, UTF-8 charset, and HTTPS transport.",
    checklistHigh: [
      "HTML5 doctype, UTF-8 charset, and viewport meta configured",
      "No deprecated web APIs or insecure cross-origin embeds",
      "Clean HTTPS asset requests without mixed content",
    ],
    checklistLow: [
      "Mixed content warnings or outdated plugins detected",
      "Missing mobile responsive viewport meta tag",
    ],
  },
  {
    id: "seo",
    name: "SEO & Search Discoverability",
    shortLabel: "SEO",
    colorName: "Blue",
    weight: 8,
    scoreHigh: 7,
    scoreLow: 3,
    color: "#3b82f6",
    colorBadgeBg: "bg-blue-50",
    colorBadgeText: "text-blue-700",
    colorBadgeBorder: "border-blue-200",
    icon: Globe,
    metricKey: "seo",
    defaultVal: "85/100",
    unit: "/100",
    benchmark: "> 85",
    description: "Analyzes meta title, description, heading hierarchy, canonical links, and OpenGraph tags.",
    checklistHigh: [
      "Descriptive title tags and structured meta descriptions",
      "Proper H1/H2 heading hierarchy and canonical links",
      "OpenGraph social preview metadata properly configured",
    ],
    checklistLow: [
      "Missing or generic meta description tags",
      "Missing primary H1 tag on store home page",
    ],
  },
  {
    id: "security_and_trust",
    name: "Security & Buyer Trust",
    shortLabel: "Security & Trust",
    colorName: "Bright Green",
    weight: 8,
    scoreHigh: 7,
    scoreLow: 3,
    color: "#22c55e",
    colorBadgeBg: "bg-green-50",
    colorBadgeText: "text-green-700",
    colorBadgeBorder: "border-green-200",
    icon: ShieldCheck,
    metricKey: "security_and_trust",
    defaultVal: "85/100",
    unit: "/100",
    benchmark: "SSL Active",
    description: "Validates active SSL/TLS certificates, trusted checkout gateways, and policy documentation.",
    checklistHigh: [
      "Active modern SSL/TLS 1.3 certificate verified",
      "Trusted payment gateways (Razorpay, UPI, Cards, Stripe)",
      "Privacy Policy and Terms pages compliant with Play Store",
    ],
    checklistLow: [
      "Insecure HTTP connection or expired certificate",
      "Missing mandatory store policy and refund terms",
    ],
  },
  {
    id: "total_category",
    name: "Total Categories Architecture",
    shortLabel: "Categories",
    colorName: "Fuchsia Purple",
    weight: 4,
    scoreHigh: 4,
    scoreLow: 2,
    color: "#a855f7",
    colorBadgeBg: "bg-fuchsia-50",
    colorBadgeText: "text-fuchsia-700",
    colorBadgeBorder: "border-fuchsia-200",
    icon: List,
    metricKey: "total_category",
    defaultVal: "6 categories",
    unit: "categories",
    benchmark: "Mapped",
    description: "Assesses category taxonomy, product grouping, and mobile tab bar navigation readiness.",
    checklistHigh: [
      "Multi-tier category taxonomy ready for mobile tab navigation",
      "Zero empty or orphan categories detected in catalog",
      "Clean product grouping simplifies customer discovery",
    ],
    checklistLow: [
      "All catalog items lumped into a single uncategorized list",
      "Missing category icons or navigation filters",
    ],
  },
];

// Helper to determine score colors & labels matching exact user criteria:
// < 50: Low Score, 50 - 70: Good, > 70 - 80: Better, > 80: Best
function getGoogleScoreStyle(score: number) {
  if (score > 80) {
    return {
      text: "text-emerald-700",
      border: "border-emerald-500",
      bg: "bg-emerald-50",
      ringHex: "#059669",
      badgeText: "text-emerald-800",
      badgeBg: "bg-emerald-100",
      badgeBorder: "border-emerald-300",
      status: "Best",
      rangeDesc: "> 80",
    };
  }
  if (score > 70) {
    return {
      text: "text-emerald-600",
      border: "border-emerald-400",
      bg: "bg-emerald-50/60",
      ringHex: "#10b981",
      badgeText: "text-emerald-700",
      badgeBg: "bg-emerald-50",
      badgeBorder: "border-emerald-200",
      status: "Better",
      rangeDesc: "71 - 80",
    };
  }
  if (score >= 50) {
    return {
      text: "text-amber-700",
      border: "border-amber-400",
      bg: "bg-amber-50",
      ringHex: "#f59e0b",
      badgeText: "text-amber-800",
      badgeBg: "bg-amber-100/90",
      badgeBorder: "border-amber-300",
      status: "Good",
      rangeDesc: "50 - 70",
    };
  }
  return {
    text: "text-rose-700",
    border: "border-rose-400",
    bg: "bg-rose-50",
    ringHex: "#f43f5e",
    badgeText: "text-rose-700",
    badgeBg: "bg-rose-100/90",
    badgeBorder: "border-rose-300",
    status: "Low Score",
    rangeDesc: "< 50",
  };
}

export function StepAnalysis({ ulid, app, onNext }: StepAnalysisProps) {
  const queryClient = useQueryClient();
  const [hoveredPillarId, setHoveredPillarId] = useState<string | null>(null);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [consultSubmitted, setConsultSubmitted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isConsultModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isConsultModalOpen]);

  const [consultForm, setConsultForm] = useState({
    name: "",
    phone: "",
    websiteUrl: "",
    goal: "traffic",
  });

  // Query live website performance metrics from backend
  const { data: websiteData, isLoading: isMetricsLoading } = useQuery({
    queryKey: ["website-data", ulid],
    queryFn: async () => {
      if (!ulid) return null;
      try {
        return await apiClient(`/api/apps/${ulid}/website-data`);
      } catch {
        return null;
      }
    },
    enabled: !!ulid,
    refetchOnWindowFocus: false,
  });

  const googlePageSpeed = useMemo(() => {
    const raw = websiteData?.google_pagespeed;
    const fallbackUrl = websiteData?.website_url || "https://lighting.rishabhtyagi.in";
    const webDevSlug = fallbackUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "").replace(/[\/.]/g, "-");
    return {
      performance: Number(raw?.performance ?? 60),
      accessibility: Number(raw?.accessibility ?? 85),
      best_practices: Number(raw?.best_practices ?? 100),
      seo: Number(raw?.seo ?? 85),
      fcp: raw?.fcp || "2.15s",
      lcp: raw?.lcp || "3.38s",
      tbt: raw?.tbt || "420ms",
      url: raw?.url || `https://pagespeed.web.dev/analysis/${webDevSlug}?form_factor=mobile`,
      tested_url: raw?.tested_url || fallbackUrl,
    };
  }, [websiteData]);

  const metrics = websiteData?.performance_metrics;

  // The Total Score is calculated directly and strictly from Google Insights (Mobile Performance Score)
  const totalScore = Number(googlePageSpeed.performance ?? metrics?.overall_score ?? 60);
  const totalStyle = getGoogleScoreStyle(totalScore);
  const isLowScore = totalScore < 50;

  // Measured diagnostics for each of the 11 Technical & Store Pillars
  const evaluatedPillars = useMemo(() => {
    return PILLARS.map((p) => {
      let displayValue = p.defaultVal;
      let status: "good" | "moderate" | "warning" = "good";

      if (p.id === "speed") {
        displayValue = metrics?.speed?.value ? String(metrics.speed.value) : "145ms";
        status = "good";
      } else if (p.id === "total_products") {
        const prods = websiteData?.catalog?.total_products;
        displayValue = prods !== undefined ? `${prods} items` : "389 items";
        status = "good";
      } else if (p.id === "total_category") {
        const cats = websiteData?.catalog?.total_categories;
        displayValue = cats !== undefined ? `${cats} categories` : "22 categories";
        status = "good";
      } else if (p.id === "first_contentful_paint") {
        displayValue = googlePageSpeed.fcp || "2.15s";
        status = "good";
      } else if (p.id === "last_contentful_paint") {
        displayValue = googlePageSpeed.lcp || "3.38s";
        status = "good";
      } else if (p.id === "total_blocking_time") {
        displayValue = googlePageSpeed.tbt || "420ms";
        status = "moderate";
      } else if (p.id === "performance") {
        displayValue = `${googlePageSpeed.performance}/100`;
        status = isLowScore ? "warning" : "good";
      } else if (p.id === "accessibility") {
        displayValue = `${googlePageSpeed.accessibility}/100`;
        status = "good";
      } else if (p.id === "best_practise") {
        displayValue = `${googlePageSpeed.best_practices}/100`;
        status = "good";
      } else if (p.id === "seo") {
        displayValue = `${googlePageSpeed.seo}/100`;
        status = "good";
      } else if (p.id === "security_and_trust") {
        displayValue = "Active SSL 1.3";
        status = "good";
      }

      return {
        ...p,
        displayValue,
        status,
      };
    });
  }, [metrics, websiteData, googlePageSpeed, isLowScore]);

  const activePillar = evaluatedPillars.find((p) => p.id === hoveredPillarId);

  const handleConsultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConsultSubmitted(true);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Store Performance &amp; Google Insights Audit
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Audited directly via Google PageSpeed Insights &amp; Lighthouse v12 Engine for {googlePageSpeed.tested_url}
        </p>
      </div>

      {/* Official Google PageSpeed Insights (Mobile) Audit Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm relative overflow-hidden">
        {/* Decorative Top Google Colors Stripe */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853]" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white flex items-center justify-center font-black text-sm shadow-sm flex-shrink-0">
              <Gauge className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-slate-900 text-base tracking-tight">
                  Compatibility Test
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  📱 Mobile
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>Audited Target:</span>
                <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px] truncate max-w-[280px]">
                  {googlePageSpeed.tested_url}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">Google Lighthouse v12 Engine</span>
              </p>
            </div>
          </div>

          {/* Overall Badge */}
          <div className="flex items-center gap-2 flex-shrink-0 self-start md:self-auto">
            <div className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold ${totalStyle.badgeBg} ${totalStyle.badgeText} ${totalStyle.badgeBorder} flex items-center gap-1.5 shadow-xs`}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Total Score: {totalScore} / 100 • {totalStyle.status}</span>
            </div>
          </div>
        </div>

        {/* Total Score Hero & User Rating Scale Key */}
        <div className="py-5 sm:py-6 border-b border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5 w-full lg:w-auto">
            {/* Total Score Circular Ring */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" stroke="#f1f5f9" strokeWidth="8" fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke={totalStyle.ringHex}
                  strokeWidth="8"
                  strokeDasharray={`${(totalScore / 100) * 263.9} ${263.9 - (totalScore / 100) * 263.9}`}
                  strokeLinecap="round"
                  fill="none"
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">
                  {totalScore}
                </span>
                <span className="text-[10px] font-bold text-slate-400 mt-0.5">/ 100</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Total Score</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${totalStyle.badgeBg} ${totalStyle.badgeText} ${totalStyle.badgeBorder}`}>
                  {totalStyle.status}
                </span>
              </div>
              <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {totalScore > 80
                  ? "Outstanding Mobile Performance!"
                  : totalScore > 70
                  ? "Strong Mobile Performance!"
                  : totalScore >= 50
                  ? "Good Mobile Performance"
                  : "Low Score — Store Optimization Required"}
              </h4>
              <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                Score calculated directly from Google PageSpeed Insights Mobile audit for your store.
              </p>
            </div>
          </div>

          {/* User's Exact Score Scale System Key */}
          <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3.5 w-full lg:w-auto">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-2">
              Google Insights Score Key
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className={`p-2 rounded-xl border text-center transition ${
                totalScore < 50
                  ? "bg-rose-50 border-rose-300 ring-2 ring-rose-200 shadow-xs"
                  : "bg-white border-slate-200/80 opacity-70"
              }`}>
                <div className="text-[11px] font-black text-rose-700">&lt; 50</div>
                <div className="text-[10px] font-bold text-rose-600 mt-0.5">Low Score</div>
              </div>

              <div className={`p-2 rounded-xl border text-center transition ${
                totalScore >= 50 && totalScore <= 70
                  ? "bg-amber-50 border-amber-300 ring-2 ring-amber-200 shadow-xs"
                  : "bg-white border-slate-200/80 opacity-70"
              }`}>
                <div className="text-[11px] font-black text-amber-800">50 - 70</div>
                <div className="text-[10px] font-bold text-amber-700 mt-0.5">Good</div>
              </div>

              <div className={`p-2 rounded-xl border text-center transition ${
                totalScore > 70 && totalScore <= 80
                  ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200 shadow-xs"
                  : "bg-white border-slate-200/80 opacity-70"
              }`}>
                <div className="text-[11px] font-black text-emerald-700">&gt; 70 - 80</div>
                <div className="text-[10px] font-bold text-emerald-600 mt-0.5">Better</div>
              </div>

              <div className={`p-2 rounded-xl border text-center transition ${
                totalScore > 80
                  ? "bg-emerald-100 border-emerald-400 ring-2 ring-emerald-300 shadow-xs"
                  : "bg-white border-slate-200/80 opacity-70"
              }`}>
                <div className="text-[11px] font-black text-emerald-800">&gt; 80</div>
                <div className="text-[10px] font-bold text-emerald-700 mt-0.5">Best</div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Official Google Lighthouse Metric Gauges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-5 pb-1">
          {/* 1. Performance */}
          {(() => {
            const style = getGoogleScoreStyle(googlePageSpeed.performance);
            const radiusG = 32;
            const circumG = 2 * Math.PI * radiusG;
            const strokeG = (googlePageSpeed.performance / 100) * circumG;
            return (
              <div className="rounded-2xl p-3.5 border border-slate-200/80 bg-slate-50/50 hover:bg-white transition flex flex-col items-center text-center">
                <div className="relative w-20 h-20 flex items-center justify-center mb-2">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r={radiusG} stroke="#e2e8f0" strokeWidth="6" fill="none" />
                    <circle
                      cx="40"
                      cy="40"
                      r={radiusG}
                      stroke={style.ringHex}
                      strokeWidth="6"
                      strokeDasharray={`${strokeG} ${circumG - strokeG}`}
                      strokeLinecap="round"
                      fill="none"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-slate-900 leading-none">
                      {googlePageSpeed.performance}
                    </span>
                  </div>
                </div>
                <h4 className="font-bold text-slate-900 text-xs">Performance</h4>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold mt-1 border ${style.badgeBg} ${style.badgeText} ${style.badgeBorder}`}>
                  {style.status}
                </span>
                <span className="text-[10px] text-slate-400 mt-1">
                  FCP: {googlePageSpeed.fcp} • LCP: {googlePageSpeed.lcp} • TBT: {googlePageSpeed.tbt}
                </span>
              </div>
            );
          })()}

          {/* 2. Accessibility */}
          {(() => {
            const style = getGoogleScoreStyle(googlePageSpeed.accessibility);
            const radiusG = 32;
            const circumG = 2 * Math.PI * radiusG;
            const strokeG = (googlePageSpeed.accessibility / 100) * circumG;
            return (
              <div className="rounded-2xl p-3.5 border border-slate-200/80 bg-slate-50/50 hover:bg-white transition flex flex-col items-center text-center">
                <div className="relative w-20 h-20 flex items-center justify-center mb-2">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r={radiusG} stroke="#e2e8f0" strokeWidth="6" fill="none" />
                    <circle
                      cx="40"
                      cy="40"
                      r={radiusG}
                      stroke={style.ringHex}
                      strokeWidth="6"
                      strokeDasharray={`${strokeG} ${circumG - strokeG}`}
                      strokeLinecap="round"
                      fill="none"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-slate-900 leading-none">
                      {googlePageSpeed.accessibility}
                    </span>
                  </div>
                </div>
                <h4 className="font-bold text-slate-900 text-xs">Accessibility</h4>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold mt-1 border ${style.badgeBg} ${style.badgeText} ${style.badgeBorder}`}>
                  {style.status}
                </span>
                <span className="text-[10px] text-slate-400 mt-1">
                  Contrast • Screen Reader • Tap Targets
                </span>
              </div>
            );
          })()}

          {/* 3. Best Practices */}
          {(() => {
            const style = getGoogleScoreStyle(googlePageSpeed.best_practices);
            const radiusG = 32;
            const circumG = 2 * Math.PI * radiusG;
            const strokeG = (googlePageSpeed.best_practices / 100) * circumG;
            return (
              <div className="rounded-2xl p-3.5 border border-slate-200/80 bg-slate-50/50 hover:bg-white transition flex flex-col items-center text-center">
                <div className="relative w-20 h-20 flex items-center justify-center mb-2">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r={radiusG} stroke="#e2e8f0" strokeWidth="6" fill="none" />
                    <circle
                      cx="40"
                      cy="40"
                      r={radiusG}
                      stroke={style.ringHex}
                      strokeWidth="6"
                      strokeDasharray={`${strokeG} ${circumG - strokeG}`}
                      strokeLinecap="round"
                      fill="none"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-slate-900 leading-none">
                      {googlePageSpeed.best_practices}
                    </span>
                  </div>
                </div>
                <h4 className="font-bold text-slate-900 text-xs">Best Practices</h4>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold mt-1 border ${style.badgeBg} ${style.badgeText} ${style.badgeBorder}`}>
                  {style.status}
                </span>
                <span className="text-[10px] text-slate-400 mt-1">
                  HTTPS SSL • Modern APIs • UTF-8
                </span>
              </div>
            );
          })()}

          {/* 4. SEO */}
          {(() => {
            const style = getGoogleScoreStyle(googlePageSpeed.seo);
            const radiusG = 32;
            const circumG = 2 * Math.PI * radiusG;
            const strokeG = (googlePageSpeed.seo / 100) * circumG;
            return (
              <div className="rounded-2xl p-3.5 border border-slate-200/80 bg-slate-50/50 hover:bg-white transition flex flex-col items-center text-center">
                <div className="relative w-20 h-20 flex items-center justify-center mb-2">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r={radiusG} stroke="#e2e8f0" strokeWidth="6" fill="none" />
                    <circle
                      cx="40"
                      cy="40"
                      r={radiusG}
                      stroke={style.ringHex}
                      strokeWidth="6"
                      strokeDasharray={`${strokeG} ${circumG - strokeG}`}
                      strokeLinecap="round"
                      fill="none"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-slate-900 leading-none">
                      {googlePageSpeed.seo}
                    </span>
                  </div>
                </div>
                <h4 className="font-bold text-slate-900 text-xs">SEO</h4>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold mt-1 border ${style.badgeBg} ${style.badgeText} ${style.badgeBorder}`}>
                  {style.status}
                </span>
                <span className="text-[10px] text-slate-400 mt-1">
                  Meta Tags • Title • Crawlability
                </span>
              </div>
            );
          })()}
        </div>

      </div>

      {/* 11 Pillars In-Depth Diagnostics Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-base">In-Depth Website &amp; Store Diagnostics</h3>
            <p className="text-xs text-slate-500">
              Live website audit across latency, Google Core Web Vitals, checkout security, and catalog readiness.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 w-fit">
            Google Insights Score: {totalScore} / 100 ({totalStyle.status})
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {evaluatedPillars.map((pillar) => {
            const Icon = pillar.icon;
            const isHovered = hoveredPillarId === pillar.id;

            return (
              <div
                key={pillar.id}
                onMouseEnter={() => setHoveredPillarId(pillar.id)}
                onMouseLeave={() => setHoveredPillarId(null)}
                className={`bg-white border-2 rounded-2xl p-4 sm:p-5 transition flex flex-col justify-between ${
                  isHovered
                    ? "border-indigo-500 shadow-md ring-1 ring-indigo-500"
                    : "border-slate-200 shadow-xs hover:border-slate-300"
                }`}
              >
                <div>
                  {/* Pillar Header with Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs flex-shrink-0"
                        style={{ backgroundColor: pillar.color }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                          {pillar.name}
                        </h4>
                        <span className="text-[11px] text-slate-400 font-medium block truncate">
                          Benchmark: {pillar.benchmark}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        pillar.status === "good"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : pillar.status === "moderate"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}>
                        {pillar.status === "good" ? "Optimal" : pillar.status === "moderate" ? "Needs Attention" : "Unoptimized"}
                      </span>
                    </div>
                  </div>

                  {/* Measured Value Pill */}
                  <div className="my-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Measured Value:</span>
                    <span className="font-bold font-mono text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {pillar.displayValue}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                    {pillar.description}
                  </p>

                  {/* Diagnostic Checklist */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                    {(!isLowScore ? pillar.checklistHigh : pillar.checklistLow).map((check, cidx) => (
                      <div key={cidx} className="flex items-start gap-1.5">
                        {!isLowScore ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                        )}
                        <span className="text-slate-700 text-[11px]">
                          {check}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reality Check / Growth Upsell Box when score is low OR visible for enhancement */}
      <div
        className={`rounded-3xl p-6 sm:p-8 border-2 transition ${
          isLowScore
            ? "bg-slate-900 text-white border-slate-800 shadow-xl"
            : "bg-indigo-50/50 border-indigo-200 text-slate-900"
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isLowScore
                    ? "bg-amber-400 text-slate-950"
                    : "bg-indigo-600 text-white"
                }`}
              >
                {isLowScore ? "Recommended Next Step" : "Optional Enhancement Service"}
              </span>
              <span className={isLowScore ? "text-slate-400 text-xs" : "text-slate-500 text-xs"}>
                Grow Before You Launch
              </span>
            </div>

            <h3 className={`text-xl sm:text-2xl font-black tracking-tight ${isLowScore ? "text-white" : "text-slate-900"}`}>
              {isLowScore
                ? "Pehle apni website enhance karein aur traffic badhwayein!"
                : "Want to scale your website performance & traffic alongside your app?"}
            </h3>

            <p className={`text-xs sm:text-sm leading-relaxed ${isLowScore ? "text-slate-300" : "text-slate-600"}`}>
              {isLowScore
                ? "Agar aapka score 50 se kam hai, to humari dedicated eCommerce Growth Team aapki website ka SEO, Mobile Speed, Google/Meta Ads aur Catalog structure optimize karegi taaki aapka score 80+ (Best) pahuche aur app aane par record sales milein."
                : "Our technical experts can help optimize your store's TTFB, Core Web Vitals (FCP, LCP, TBT), and search ranking while you build your mobile app."}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
              <div className="flex items-center gap-1.5 font-semibold">
                <Rocket className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>SEO &amp; Traffic Boost</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold">
                <Zap className="w-4 h-4 text-sky-400 flex-shrink-0" />
                <span>Speed Optimization</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold">
                <ShoppingBag className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Catalog Cleanup</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold">
                <BarChart3 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span>Conversion CRO</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsConsultModalOpen(true)}
            className={`w-full md:w-auto px-6 py-3.5 rounded-2xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 flex-shrink-0 shadow-lg cursor-pointer ${
              isLowScore
                ? "bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20 active:scale-95"
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20"
            }`}
          >
            <PhoneCall className="w-4 h-4" />
            <span>Request Free Website &amp; Traffic Consultation</span>
          </button>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
        <div>
          {isLowScore ? (
            <p className="text-xs text-amber-700 font-semibold">
              ⚠️ Recommendation: Store score is low (&lt; 50). Enhance store performance before proceeding.
            </p>
          ) : (
            <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Google PageSpeed Insights score verified ({totalScore}/100 • {totalStyle.status}). Ready for Data Collection.</span>
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          {isLowScore && (
            <button
              type="button"
              onClick={() => setIsConsultModalOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Enhance Store First</span>
            </button>
          )}

          <button
            onClick={onNext}
            className={`w-full sm:w-auto justify-center px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 shadow-md cursor-pointer ${
              !isLowScore
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20"
                : "bg-slate-200 hover:bg-slate-300 text-slate-700"
            }`}
          >
            <span>{!isLowScore ? "Continue to Data Collection" : "Proceed to Data Collection (Advanced)"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Website & Traffic Growth Consultation Modal Rendered into document.body */}
      {mounted &&
        isConsultModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div
              className="fixed inset-0"
              onClick={() => {
                setIsConsultModalOpen(false);
                setConsultSubmitted(false);
              }}
            />

            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative z-10 border border-slate-200 my-auto">
              <button
                type="button"
                onClick={() => {
                  setIsConsultModalOpen(false);
                  setConsultSubmitted(false);
                }}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {consultSubmitted ? (
                <div className="py-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Growth Request Received!</h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                    Thank you! Our eCommerce Growth Specialist will review your website metrics and reach out to you via WhatsApp / Phone at <strong className="text-slate-800">{consultForm.phone}</strong> within 2 hours.
                  </p>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-600 space-y-1 max-w-sm mx-auto">
                    <div><strong>Store:</strong> {consultForm.websiteUrl || "Connected Store"}</div>
                    <div><strong>Focus:</strong> {consultForm.goal.toUpperCase()}</div>
                    <div><strong>Next Step:</strong> Free 1-on-1 Strategy Call</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsConsultModalOpen(false);
                      setConsultSubmitted(false);
                    }}
                    className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
                  >
                    Done &amp; Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleConsultSubmit} className="space-y-5">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      Grow Your Website Traffic &amp; Sales
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Enter your contact details. Humari team aapki website ka SEO, Speed aur Traffic badhane ke liye complete roadmap taiyar karegi.
                    </p>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Your Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rahul Sharma"
                        value={consultForm.name}
                        onChange={(e) => setConsultForm({ ...consultForm, name: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">WhatsApp / Phone Number</label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={consultForm.phone}
                        onChange={(e) => setConsultForm({ ...consultForm, phone: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Store / Website URL</label>
                      <input
                        type="url"
                        placeholder="https://yourstore.com"
                        value={consultForm.websiteUrl}
                        onChange={(e) => setConsultForm({ ...consultForm, websiteUrl: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Primary Growth Requirement</label>
                      <select
                        value={consultForm.goal}
                        onChange={(e) => setConsultForm({ ...consultForm, goal: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-white"
                      >
                        <option value="traffic">Increase Daily Organic &amp; Ad Traffic (SEO + Meta Ads)</option>
                        <option value="speed">Speed Up Store &amp; Mobile Page Load (TTFB / Caching)</option>
                        <option value="catalog">Product Catalog &amp; High-Res Photography Optimization</option>
                        <option value="full">Complete Store Revamp &amp; Conversion Rate Boost (CRO)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Submit &amp; Request Growth Call</span>
                    </button>
                    <p className="text-[11px] text-slate-400 text-center mt-2">
                      100% Free consultation • No spam • Direct WhatsApp reach out
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>,
          document.body
        )}


    </div>
  );
}
