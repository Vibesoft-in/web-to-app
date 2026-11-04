"use client";

import React from "react";
import { X, Check, CheckCircle2, ShieldCheck, Zap, ArrowRight, Sparkles, ExternalLink } from "lucide-react";

export interface AddonDetail {
  id: string | number;
  shortName: string;
  originalName: string;
  oneLineDesc: string;
  price: string;
  priceNum?: number;
  licenseType: string;
  isActive: boolean;
  category: string;
  icon?: any;
  actionUrl?: string;
  featureDetails: {
    title: string;
    items: string[];
  };
  whyItIsUsed: {
    problem: string;
    benefits: string[];
    targetAudience: string;
  };
  howItWorks: {
    steps: string[];
  };
  purchaseInfo: {
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
  onSelectOrBuy?: (addon: AddonDetail) => void;
  isSelectedInCart?: boolean;
}

export function AddonLearnMoreModal({
  isOpen,
  onClose,
  addon,
  onSelectOrBuy,
  isSelectedInCart,
}: AddonLearnMoreModalProps) {
  if (!isOpen || !addon) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative z-10 border border-slate-200 my-auto max-h-[92vh] overflow-y-auto flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {addon.category}
              </span>
              {addon.isActive ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Active on App</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Available to Buy
                </span>
              )}
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {addon.shortName}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {addon.oneLineDesc}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Mandatory Sections */}
        <div className="space-y-5 py-4 overflow-y-auto flex-1 text-xs text-slate-700">
          {/* Section 1: Feature Details */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center">1</span>
              <span>Feature Details</span>
            </h3>
            <p className="text-slate-600 leading-relaxed font-medium">
              {addon.featureDetails.title}
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {addon.featureDetails.items.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-white p-2 rounded-xl border border-slate-200/60 shadow-2xs">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug text-slate-800">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 2: Why It Is Used */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center">2</span>
              <span>Why It Is Used</span>
            </h3>
            <p className="text-slate-600 leading-relaxed">
              <strong>Problem solved:</strong> {addon.whyItIsUsed.problem}
            </p>
            <div className="space-y-1 pt-1">
              <span className="font-bold text-slate-800 block text-[11px]">Key Benefits:</span>
              <ul className="space-y-1">
                {addon.whyItIsUsed.benefits.map((b, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 flex-shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-[11px] text-slate-500 pt-1">
              <strong>Best suited for:</strong> {addon.whyItIsUsed.targetAudience}
            </p>
          </div>

          {/* Section 3: How It Works */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center">3</span>
              <span>How It Works</span>
            </h3>
            <ol className="space-y-2 pt-1">
              {addon.howItWorks.steps.map((st, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="text-slate-700 leading-relaxed">{st}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Section 4: Purchase Information */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2">
            <h3 className="font-extrabold text-sm text-indigo-950 flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-indigo-700 text-white font-bold text-[11px] flex items-center justify-center">4</span>
              <span>Purchase Information</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1 font-sans">
              <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                <span className="text-[10px] text-slate-500 block">Price</span>
                <span className="text-sm font-black text-slate-900">{addon.purchaseInfo.priceLabel}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                <span className="text-[10px] text-slate-500 block">License</span>
                <span className="text-xs font-bold text-slate-800">{addon.purchaseInfo.license}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                <span className="text-[10px] text-slate-500 block">Condition</span>
                <span className="text-xs font-bold text-slate-800 truncate block">{addon.purchaseInfo.conditions}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                <span className="text-[10px] text-slate-500 block">Status</span>
                <span className={`text-xs font-bold truncate block ${addon.isActive ? "text-emerald-700" : "text-indigo-700"}`}>
                  {addon.purchaseInfo.activeStatusLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>
            <span className="text-[11px] text-slate-500">Price:</span>
            <span className="text-base font-black text-slate-900 ml-1.5">{addon.price}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            >
              Close
            </button>

            {addon.isActive ? (
              addon.actionUrl ? (
                <a
                  href={addon.actionUrl}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-sm"
                >
                  <span>Open Panel</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="px-5 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-100 cursor-default flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Already Active</span>
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (onSelectOrBuy) onSelectOrBuy(addon);
                  onClose();
                }}
                className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer active:scale-95"
              >
                <span>{isSelectedInCart ? "Remove from Selection" : "Select & Add to App"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

