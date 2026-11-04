"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";

interface StepIntegrationsProps {
  onNext: () => void;
}

export function StepIntegrations({ onNext }: StepIntegrationsProps) {
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Third-Party Integrations
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Essential services pre-configured for your white-label build.
        </p>
      </div>

      <div className="space-y-4">
        {/* Push Notification Integration */}
        <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 text-sm">Firebase Cloud Messaging (FCM)</h4>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  Auto-Configured
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Managed automatically by WebIntoApp infrastructure. No manual Firebase console setup required for standard push broadcasts.
              </p>
            </div>
          </div>
        </div>

        {/* WhatsApp Business Cloud API */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h4 className="font-bold text-slate-900 text-sm">WhatsApp Cloud Messaging</h4>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                  Optional Add-On
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Direct WhatsApp automated notifications on dispatched orders. Can be linked anytime post-launch.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setWhatsappEnabled(!whatsappEnabled)}
            className={`w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-semibold border transition text-center ${
              whatsappEnabled
                ? "bg-green-600 text-white border-green-600"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            {whatsappEnabled ? "Enabled" : "Enable"}
          </button>
        </div>
      </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200 mt-6">
        <div className="text-xs text-slate-500">
          Push notifications and cloud messaging configured. Next, choose your subscription plan.
        </div>

        <button
          type="button"
          onClick={onNext}
          className="w-full sm:w-auto justify-center px-7 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer active:scale-98"
        >
          <span>Next</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
