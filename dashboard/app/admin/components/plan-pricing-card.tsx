"use client";

import React from "react";

export interface PlanPricingInfo {
  tierName: string;
  monthlyPrice: number;
  annualPrice: number;
  apkIncluded: boolean;
  aabIncluded: boolean;
  ipaIncluded: boolean;
  badge?: string;
}

export function getPlanPricingInfo(tier: string): PlanPricingInfo {
  const t = tier.toLowerCase();
  if (t.includes("enterprise")) {
    return {
      tierName: "Enterprise Suite",
      monthlyPrice: 14999,
      annualPrice: 149990,
      apkIncluded: true,
      aabIncluded: true,
      ipaIncluded: true,
      badge: "Scale",
    };
  }
  if (t.includes("starter")) {
    return {
      tierName: "Starter Tier",
      monthlyPrice: 2999,
      annualPrice: 29990,
      apkIncluded: true,
      aabIncluded: false,
      ipaIncluded: false,
      badge: "Starter",
    };
  }
  if (t.includes("free")) {
    return {
      tierName: "Free Tier",
      monthlyPrice: 0,
      annualPrice: 0,
      apkIncluded: true,
      aabIncluded: false,
      ipaIncluded: false,
      badge: "Community",
    };
  }
  // Default to Growth Tier
  return {
    tierName: "Growth Tier",
    monthlyPrice: 7999,
    annualPrice: 79990,
    apkIncluded: true,
    aabIncluded: true,
    ipaIncluded: false,
    badge: "Most Popular",
  };
}

export interface PlanPricingCardProps {
  tier?: string;
  monthlyPrice?: number;
  annualPrice?: number;
  apkIncluded?: boolean;
  aabIncluded?: boolean;
  ipaIncluded?: boolean;
  variant?: "card" | "compact" | "telemetry" | "inline";
  className?: string;
}

export function PlanPricingCard({
  tier = "Growth",
  monthlyPrice,
  annualPrice,
  apkIncluded,
  aabIncluded,
  ipaIncluded,
  variant = "card",
  className = "",
}: PlanPricingCardProps) {
  const defaults = getPlanPricingInfo(tier);

  const mPrice = monthlyPrice ?? defaults.monthlyPrice;
  const aPrice = annualPrice ?? defaults.annualPrice;
  const apk = apkIncluded ?? defaults.apkIncluded;
  const aab = aabIncluded ?? defaults.aabIncluded;
  const ipa = ipaIncluded ?? defaults.ipaIncluded;

  // COMPACT VARIANT (For Tables and narrow list rows)
  if (variant === "compact") {
    return (
      <div className={`space-y-1.5 ${className}`}>
        {/* Pricing */}
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-black text-slate-900 font-mono">
              ₹{mPrice.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400">/mo</span>
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            or <span className="font-mono text-slate-700 font-semibold">₹{aPrice.toLocaleString()}</span> /yr
          </div>
        </div>

        {/* 3 Capabilities Pills */}
        <div className="flex items-center gap-1 text-[9px] font-bold">
          <span
            className={`px-1.5 py-0.5 rounded transition ${
              apk
                ? "bg-[#F3EEE7] text-[#57514B]"
                : "bg-[#F7F5F0] text-[#A8A29E] line-through opacity-70"
            }`}
          >
            APK
          </span>
          <span
            className={`px-1.5 py-0.5 rounded transition ${
              aab
                ? "bg-[#F3EEE7] text-[#57514B]"
                : "bg-[#F7F5F0] text-[#A8A29E] line-through opacity-70"
            }`}
          >
            Play AAB
          </span>
          <span
            className={`px-1.5 py-0.5 rounded transition ${
              ipa
                ? "bg-[#F3EEE7] text-[#57514B]"
                : "bg-[#F7F5F0] text-[#A8A29E] line-through opacity-70"
            }`}
          >
            iOS IPA
          </span>
        </div>
      </div>
    );
  }

  // TELEMETRY CARD VARIANT (For top Customer telemetry stat cards)
  if (variant === "telemetry") {
    return (
      <div className={`space-y-2 ${className}`}>
        {/* Pricing */}
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900 font-mono tracking-tight">
              ₹{mPrice.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">/month</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            or <strong className="font-mono text-slate-700">₹{aPrice.toLocaleString()}</strong> billed annually
          </div>
        </div>

        {/* 3 Capabilities Pills */}
        <div className="grid grid-cols-3 gap-1 text-[10px] text-center font-bold">
          <span
            className={`px-1.5 py-0.5 rounded transition ${
              apk
                ? "bg-[#F3EEE7] text-[#57514B]"
                : "bg-[#F7F5F0] text-[#A8A29E] line-through opacity-70"
            }`}
          >
            APK
          </span>
          <span
            className={`px-1.5 py-0.5 rounded transition ${
              aab
                ? "bg-[#F3EEE7] text-[#57514B]"
                : "bg-[#F7F5F0] text-[#A8A29E] line-through opacity-70"
            }`}
          >
            Play AAB
          </span>
          <span
            className={`px-1.5 py-0.5 rounded transition ${
              ipa
                ? "bg-[#F3EEE7] text-[#57514B]"
                : "bg-[#F7F5F0] text-[#A8A29E] line-through opacity-70"
            }`}
          >
            iOS IPA
          </span>
        </div>
      </div>
    );
  }

  // STANDARD CARD VARIANT (Exactly matching media_1795155463526_d345a2ef.png)
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Pricing Display */}
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
            ₹{mPrice.toLocaleString()}
          </span>
          <span className="text-xs text-slate-400 font-medium">/month</span>
        </div>
        <div className="text-xs text-slate-500 mt-0.5">
          or <strong className="font-mono text-slate-700">₹{aPrice.toLocaleString()}</strong> billed annually
        </div>
      </div>

      {/* Build Capabilities Matrix (Exact pill styling from screenshot) */}
      <div className="grid grid-cols-3 gap-1.5 text-xs text-center font-bold">
        <span
          className={`px-2 py-1.5 rounded-lg transition ${
            apk
              ? "bg-[#F3EEE7] text-[#57514B] shadow-2xs"
              : "bg-[#F7F5F0] text-[#A8A29E] line-through opacity-70"
          }`}
        >
          APK
        </span>
        <span
          className={`px-2 py-1.5 rounded-lg transition ${
            aab
              ? "bg-[#F3EEE7] text-[#57514B] shadow-2xs"
              : "bg-[#F7F5F0] text-[#A8A29E] line-through opacity-70"
          }`}
        >
          Play AAB
        </span>
        <span
          className={`px-2 py-1.5 rounded-lg transition ${
            ipa
              ? "bg-[#F3EEE7] text-[#57514B] shadow-2xs"
              : "bg-[#F7F5F0] text-[#A8A29E] line-through opacity-70"
          }`}
        >
          iOS IPA
        </span>
      </div>
    </div>
  );
}
