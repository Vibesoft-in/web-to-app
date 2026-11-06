"use client";

import React, { useEffect } from "react";
import { X, Check, CheckCircle2, ShoppingCart, ArrowRight, ExternalLink } from "lucide-react";

export interface AddonDetail {
  id: string | number;
  shortName: string;
  originalName?: string;
  oneLineDesc?: string;
  description?: string;
  price: string;
  priceNum?: number;
  licenseType?: string;
  isActive: boolean;
  category?: string;
  icon?: any;
  actionUrl?: string;
  featureDetails?: {
    title: string;
    items: string[];
  };
  features?: string[];
  whyItIsUsed?: {
    problem: string;
    benefits: string[];
    targetAudience: string;
  };
  howItWorks?: {
    steps: string[];
  };
  purchaseInfo?: {
    priceLabel: string;
    license: string;
    conditions: string;
    activeStatusLabel: string;
  };
}

interface AddonLearnMoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  addon: AddonDetail | null;
  onSelectOrBuy?: (addon: any) => void;
  isSelectedInCart?: boolean;
}

export function AddonLearnMoreModal({
  isOpen,
  onClose,
  addon,
  onSelectOrBuy,
  isSelectedInCart,
}: AddonLearnMoreModalProps) {
  // ESC key listener & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !addon) return null;

  const IconComponent = addon.icon;
  const featuresList = addon.featureDetails?.items || addon.features || [
    "Native mobile integration",
    "Real-time synchronized data",
    "One-click activation & control",
  ];

  return (
    <div
      className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative z-10 border border-[#EBE6DF] my-auto max-h-[92vh] overflow-y-auto flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#EBE6DF] flex-shrink-0">
          <div className="flex items-start gap-3.5 min-w-0 pr-4">
            <div className="w-11 h-11 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF] text-[#78593D] flex items-center justify-center flex-shrink-0 shadow-2xs">
              {IconComponent ? (
                typeof IconComponent === "function" ? (
                  <IconComponent className="w-5 h-5 text-[#78593D]" />
                ) : (
                  <span className="text-xl">✨</span>
                )
              ) : (
                <span className="text-xl">✨</span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {addon.category && (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#EFEAE2] text-[#78593D] border border-[#EBE6DF]">
                    {addon.category}
                  </span>
                )}
                {addon.isActive ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Active on App</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Available to Buy
                  </span>
                )}
                {addon.licenseType && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200">
                    {addon.licenseType}
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-[#1C1917] tracking-tight">
                {addon.shortName || addon.originalName || "Add-on Details"}
              </h2>
              <p className="text-xs text-[#57514B] mt-1 leading-relaxed">
                {addon.oneLineDesc || addon.description || "Enhance your mobile app with specialized e-commerce capabilities."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer flex-shrink-0"
            title="Close (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Information Sections */}
        <div className="space-y-4 py-4 overflow-y-auto flex-1 text-xs text-[#57514B]">
          {/* Features & Capabilities */}
          <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF] space-y-2.5">
            <h3 className="font-extrabold text-sm text-[#1C1917] flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-[#78593D] text-white font-bold text-[11px] flex items-center justify-center">1</span>
              <span>Features &amp; Capabilities Included</span>
            </h3>
            {addon.featureDetails?.title && (
              <p className="text-xs text-[#57514B] font-medium leading-relaxed">
                {addon.featureDetails.title}
              </p>
            )}
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {featuresList.map((item: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-[#EBE6DF] shadow-2xs">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug text-[#1C1917] font-medium text-[11.5px]">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Why It Is Used & Benefits */}
          {addon.whyItIsUsed && (
            <div className="p-4 rounded-2xl bg-white border border-[#EBE6DF] space-y-2">
              <h3 className="font-extrabold text-sm text-[#1C1917] flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-[#78593D] text-white font-bold text-[11px] flex items-center justify-center">2</span>
                <span>Why It Is Used &amp; Key Benefits</span>
              </h3>
              {addon.whyItIsUsed.problem && (
                <p className="text-[#57514B] leading-relaxed">
                  <strong className="text-[#1C1917]">Problem solved:</strong> {addon.whyItIsUsed.problem}
                </p>
              )}
              {addon.whyItIsUsed.benefits && addon.whyItIsUsed.benefits.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="font-bold text-[#1C1917] block text-[11px]">Primary Benefits:</span>
                  <ul className="space-y-1">
                    {addon.whyItIsUsed.benefits.map((b: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2 text-[#57514B]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#78593D] flex-shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {addon.whyItIsUsed.targetAudience && (
                <p className="text-[11px] text-[#7E756B] pt-1">
                  <strong>Best suited for:</strong> {addon.whyItIsUsed.targetAudience}
                </p>
              )}
            </div>
          )}

          {/* How It Works & Requirements */}
          {addon.howItWorks?.steps && addon.howItWorks.steps.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF] space-y-2">
              <h3 className="font-extrabold text-sm text-[#1C1917] flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-[#78593D] text-white font-bold text-[11px] flex items-center justify-center">3</span>
                <span>How It Works &amp; Activation Requirements</span>
              </h3>
              <ol className="space-y-2 pt-1">
                {addon.howItWorks.steps.map((st: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#EFEAE2] text-[#78593D] font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#EBE6DF]">
                      {idx + 1}
                    </span>
                    <span className="text-[#57514B] leading-relaxed">{st}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Pricing & License Specs */}
          <div className="p-4 rounded-2xl bg-white border border-[#EBE6DF] space-y-2">
            <h3 className="font-extrabold text-sm text-[#1C1917] flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-[#78593D] text-white font-bold text-[11px] flex items-center justify-center">4</span>
              <span>License &amp; Activation Terms</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1 font-sans">
              <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#EBE6DF]">
                <span className="text-[10px] text-[#7E756B] font-bold uppercase tracking-wider block">Price</span>
                <span className="text-sm font-black text-[#1C1917]">{addon.price}</span>
              </div>
              <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#EBE6DF]">
                <span className="text-[10px] text-[#7E756B] font-bold uppercase tracking-wider block">License</span>
                <span className="text-xs font-bold text-[#1C1917]">{addon.licenseType || "Lifetime App License"}</span>
              </div>
              <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#EBE6DF]">
                <span className="text-[10px] text-[#7E756B] font-bold uppercase tracking-wider block">Delivery</span>
                <span className="text-xs font-bold text-[#1C1917] truncate block">Instant Active</span>
              </div>
              <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#EBE6DF]">
                <span className="text-[10px] text-[#7E756B] font-bold uppercase tracking-wider block">Status</span>
                <span className={`text-xs font-extrabold truncate block ${addon.isActive ? "text-emerald-700" : "text-[#78593D]"}`}>
                  {addon.isActive ? "Active / Installed" : "Available to Buy"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="pt-4 border-t border-[#EBE6DF] flex items-center justify-between flex-shrink-0">
          <div>
            <span className="text-[11px] text-[#7E756B] font-bold uppercase tracking-wider block">Total License:</span>
            <span className="text-lg font-black text-[#1C1917]">{addon.price}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            >
              Close
            </button>

            {addon.isActive ? (
              addon.actionUrl ? (
                <a
                  href={addon.actionUrl}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#78593D] hover:bg-[#634932] transition flex items-center gap-1.5 shadow-sm"
                >
                  <span>Open Panel</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 cursor-default flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Installed &amp; Active</span>
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (onSelectOrBuy) onSelectOrBuy(addon);
                  onClose();
                }}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#78593D] hover:bg-[#634932] transition flex items-center gap-1.5 shadow-md shadow-[#78593D]/20 cursor-pointer active:scale-95"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Buy Add-on</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


