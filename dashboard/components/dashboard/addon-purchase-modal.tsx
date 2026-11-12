"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Check,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Clock,
  Info,
  Loader2,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  Layers,
  Lock,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { openRazorpayModal, withSinglePaymentLock } from "@/lib/razorpay";

export interface AddonPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  addon: {
    id: number | string;
    slug?: string;
    name: string;
    price: number;
    description?: string;
    features?: string[];
    badge?: string;
    category?: string;
  } | null;
  apps: any[];
  myOrders?: any[];
  user?: any;
  preselectedAppId?: string | number | null;
  onSuccess?: (app: any, addon: any) => void;
}

export function AddonPurchaseModal({
  isOpen,
  onClose,
  addon,
  apps = [],
  myOrders = [],
  user,
  preselectedAppId,
  onSuccess,
}: AddonPurchaseModalProps) {
  const [selectedAppId, setSelectedAppId] = useState<string | number | null>(preselectedAppId || null);
  const [isConfirmStep, setIsConfirmStep] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync preselectedAppId if changed or modal reopens
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      if (preselectedAppId) {
        setSelectedAppId(preselectedAppId);
      } else if (apps.length === 1) {
        setSelectedAppId(apps[0]?.id || apps[0]?.ulid);
      }
      setIsConfirmStep(false);
    }
  }, [isOpen, preselectedAppId, apps]);

  if (!isOpen || !addon) return null;

  const formatPrice = (p: number) => {
    if (p === 0) return "Free";
    const rupees = Math.round(p / 100);
    return `₹${rupees.toLocaleString("en-IN")}`;
  };

  const addonPriceRupees = Math.round((addon.price || 99900) / 100);
  const addonSlug = (addon.slug || "").toLowerCase();

  // Evaluate entitlement status for a specific app
  const getAppEntitlement = (targetApp: any) => {
    if (!targetApp) return { status: "available", reason: "" };

    const planSlug = (targetApp.active_plan?.slug || targetApp.active_plan?.name || "").toLowerCase();
    const isEnterprise = planSlug.includes("enterprise") || targetApp.active_plan?.id === 3;
    const isPremium = planSlug.includes("premium") || targetApp.active_plan?.id === 2;

    // 1. Inherent plan inclusion check
    if (addonSlug.includes("play_store") || addonSlug.includes("aab")) {
      if (targetApp.can_aab || isPremium || isEnterprise) {
        return { status: "included", label: "Included in Plan", reason: "Play Store publishing is included in your active plan." };
      }
    }

    if (addonSlug.includes("admin_panel")) {
      if (targetApp.has_admin_panel || isPremium || isEnterprise) {
        return { status: "included", label: "Included in Plan", reason: "Admin Panel is included in your active plan." };
      }
    }

    if (
      addonSlug.includes("push") ||
      addonSlug.includes("email") ||
      addonSlug.includes("whatsapp") ||
      addonSlug.includes("theme")
    ) {
      if (isEnterprise) {
        return { status: "included", label: "Included in Plan", reason: "This module is included in your Enterprise Suite plan." };
      }
    }

    // 2. Purchased addon IDs / slugs on app record
    if (
      Array.isArray(targetApp.purchased_addon_ids) &&
      targetApp.purchased_addon_ids.includes(addon.id)
    ) {
      return { status: "active", label: "Active & Licensed", reason: "This add-on is already active and licensed for this application." };
    }

    if (
      addonSlug &&
      Array.isArray(targetApp.purchased_addon_slugs) &&
      targetApp.purchased_addon_slugs.includes(addonSlug)
    ) {
      return { status: "active", label: "Active & Licensed", reason: "This add-on is already active and licensed for this application." };
    }

    // 3. Cross-reference paid orders
    const hasPaidOrder = myOrders?.some((order: any) => {
      if (order.status !== "paid" && order.status !== "completed") return false;
      const isSameApp =
        (order.app_id && String(order.app_id) === String(targetApp.id)) ||
        (order.app_ulid && order.app_ulid === targetApp.ulid);
      if (!isSameApp) return false;

      return order.items?.some((item: any) => {
        const itemSlug = (item.slug || item.meta?.slug || "").toLowerCase();
        const itemName = (item.name || "").toLowerCase();
        const hasIdMatch = Boolean(addon.id && item.item_id && String(item.item_id) === String(addon.id));
        const hasSlugMatch = Boolean(
          addonSlug && (itemSlug === addonSlug || itemSlug.includes(addonSlug) || itemName.includes(addonSlug))
        );
        return hasIdMatch || hasSlugMatch;
      });
    });

    if (hasPaidOrder) {
      return { status: "active", label: "Active & Licensed", reason: "Official invoice verified. Add-on is permanently active." };
    }

    // 4. Cross-reference pending orders
    const hasPendingOrder = myOrders?.some((order: any) => {
      if (order.status !== "pending" && order.status !== "pending_payment" && order.status !== "created") return false;
      const isSameApp =
        (order.app_id && String(order.app_id) === String(targetApp.id)) ||
        (order.app_ulid && order.app_ulid === targetApp.ulid);
      if (!isSameApp) return false;

      return order.items?.some((item: any) => {
        const itemSlug = (item.slug || item.meta?.slug || "").toLowerCase();
        const itemName = (item.name || "").toLowerCase();
        const hasIdMatch = Boolean(addon.id && item.item_id && String(item.item_id) === String(addon.id));
        const hasSlugMatch = Boolean(
          addonSlug && (itemSlug === addonSlug || itemSlug.includes(addonSlug) || itemName.includes(addonSlug))
        );
        return hasIdMatch || hasSlugMatch;
      });
    });

    if (hasPendingOrder) {
      return { status: "pending", label: "Payment Pending", reason: "An order for this add-on is currently pending payment verification." };
    }

    return { status: "available", label: "Available to License", reason: "" };
  };

  const selectedApp = apps.find(
    (a: any) => String(a.id) === String(selectedAppId) || String(a.ulid) === String(selectedAppId)
  ) || null;

  const selectedAppEntitlement = selectedApp ? getAppEntitlement(selectedApp) : null;
  const isSelectedAppEligible = selectedAppEntitlement?.status === "available";

  const handleProceedToPayment = async () => {
    if (!selectedApp || !isSelectedAppEligible) return;
    setIsProcessing(true);
    setErrorMessage(null);

    await withSinglePaymentLock(async () => {
      try {
        // 1. Call checkout order creation API
        const checkoutRes = await apiClient("/api/orders/checkout", {
          method: "POST",
          body: JSON.stringify({
            type: "addon",
            app_id: selectedApp.id,
            app_ulid: selectedApp.ulid,
            addon_ids: addon.id ? [addon.id] : [],
            addon_slugs: addon.slug ? [addon.slug] : [],
            customer_name: user?.name || "",
            customer_email: user?.email || "",
            currency: "INR",
          }),
        });

        if (!checkoutRes?.success || !checkoutRes?.order) {
          throw new Error(checkoutRes?.message || "Failed to create checkout order.");
        }

        const orderData = checkoutRes.order;

        // 2. Open Razorpay Modal
        const paymentResponse = await openRazorpayModal({
          orderId: orderData.gateway_order_id || orderData.order_id,
          amount: orderData.amount,
          currency: orderData.currency || "INR",
          keyId:
            orderData.key_id ||
            process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
            "rzp_test_SnbtbVtFnRIrAI",
          name: "WebIntoApp",
          description: `Add-on: ${addon.name} (${selectedApp.name})`,
          prefill: {
            name: user?.name,
            email: user?.email,
          },
          themeColor: "#78593D",
        });

        // 3. Verify Payment on Backend
        await apiClient("/api/orders/verify", {
          method: "POST",
          body: JSON.stringify({
            order_id: orderData.id,
            razorpay_order_id: paymentResponse.razorpay_order_id,
            razorpay_payment_id: paymentResponse.razorpay_payment_id,
            razorpay_signature: paymentResponse.razorpay_signature,
          }),
        });

        setSuccessMessage(`Add-on "${addon.name}" successfully activated for ${selectedApp.name}!`);
        if (onSuccess) {
          onSuccess(selectedApp, addon);
        }

        setTimeout(() => {
          onClose();
        }, 1400);
      } catch (err: any) {
        if (err.message !== "PAYMENT_CANCELLED" && err.message !== "PAYMENT_ALREADY_IN_PROGRESS") {
          setErrorMessage(err.message || "Payment process could not be completed.");
        }
      } finally {
        setIsProcessing(false);
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-[99999] w-screen h-screen bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose();
      }}
    >
      <div
        className="bg-white border border-[#EBE6DF] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden my-auto animate-fadeIn relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-[#FAF7F2] p-5 sm:p-6 border-b border-[#EBE6DF] relative">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="absolute top-5 right-5 p-2 rounded-xl text-[#7E756B] hover:text-[#1C1917] hover:bg-white/80 transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#EFEAE2] text-[#78593D] border border-[#D6C8B8]">
              {addon.category || "Add-on Module"}
            </span>
            <span className="text-xs text-[#A8A199]">&bull;</span>
            <span className="text-xs font-black text-[#78593D]">
              {formatPrice(addon.price)} Lifetime
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-black text-[#1C1917] tracking-tight">
            {isConfirmStep ? "Confirm Add-on Purchase" : "Select Target Application"}
          </h2>
          <p className="text-xs text-[#7E756B] mt-1 leading-relaxed">
            {isConfirmStep
              ? `Review the summary below before completing secure payment for ${selectedApp?.name}.`
              : `Choose which application you want to attach and license "${addon.name}" for.`}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="p-1 hover:opacity-70 text-rose-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 shadow-2xs animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ── STEP 1: APPLICATION SELECTION ── */}
          {!isConfirmStep ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#7E756B]">
                  Your Applications ({apps.length})
                </span>
                <span className="text-[11px] text-[#A8A199]">
                  1 license per application
                </span>
              </div>

              {apps.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF] space-y-2">
                  <Smartphone className="w-8 h-8 text-[#A8A199] mx-auto" />
                  <p className="text-xs font-bold text-[#1C1917]">No applications found</p>
                  <p className="text-[11px] text-[#7E756B]">
                    Please create an application before purchasing add-ons.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {apps.map((appItem: any) => {
                    const entitlement = getAppEntitlement(appItem);
                    const isSelected =
                      String(selectedAppId) === String(appItem.id) ||
                      String(selectedAppId) === String(appItem.ulid);
                    const isAvailable = entitlement.status === "available";
                    const appLogo = appItem.icon_url || appItem.logo_url || appItem.config?.app?.logo_url;

                    return (
                      <div
                        key={appItem.id || appItem.ulid}
                        onClick={() => {
                          if (isAvailable) {
                            setSelectedAppId(appItem.id || appItem.ulid);
                          }
                        }}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isSelected && isAvailable
                            ? "bg-[#FAF7F2] border-[#78593D] ring-2 ring-[#78593D]/20 shadow-xs cursor-pointer"
                            : isAvailable
                            ? "bg-white border-[#EBE6DF] hover:border-[#78593D]/40 hover:bg-[#FAF7F2]/50 cursor-pointer shadow-2xs"
                            : "bg-[#F7F5F0]/70 border-[#EBE6DF] opacity-75 cursor-not-allowed"
                        }`}
                      >
                        {/* Left: App Identity */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-[#EBE6DF] bg-white shadow-2xs flex-shrink-0 flex items-center justify-center">
                            {appLogo ? (
                              <img
                                src={appLogo}
                                alt={appItem.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = "none";
                                  if (e.currentTarget.nextElementSibling) {
                                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex";
                                  }
                                }}
                              />
                            ) : null}
                            <div
                              className={`w-full h-full bg-[#78593D] text-white font-extrabold text-xs items-center justify-center ${
                                appLogo ? "hidden" : "flex"
                              }`}
                            >
                              {(appItem.name || "A").charAt(0).toUpperCase()}
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <h3 className="text-xs sm:text-sm font-black text-[#1C1917] truncate">
                                {appItem.name}
                              </h3>
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-[#EFEAE2] text-[#78593D]">
                                {appItem.platform === "woo" ? "WooCommerce" : appItem.platform === "shopify" ? "Shopify" : "Web"}
                              </span>
                              <span className="text-[9.5px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                                {appItem.active_plan?.name || "Starter App"}
                              </span>
                            </div>
                            <span className="text-[10px] text-[#7E756B] block truncate mt-0.5 font-mono">
                              {appItem.connection?.store_url || appItem.website_url || appItem.site_url || appItem.package_name || "https://yourstore.com"}
                            </span>
                            {!isAvailable && entitlement.reason && (
                              <p className="text-[10px] text-amber-800 font-semibold mt-1 leading-tight flex items-center gap-1">
                                <Info className="w-3 h-3 text-amber-700 flex-shrink-0" />
                                <span>{entitlement.reason}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: Status / Select */}
                        <div className="flex items-center justify-between sm:justify-end gap-2.5 flex-shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#EBE6DF]">
                          {entitlement.status === "active" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Active</span>
                            </span>
                          ) : entitlement.status === "included" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Sparkles className="w-3 h-3 text-indigo-600" />
                              <span>Included in Plan</span>
                            </span>
                          ) : entitlement.status === "pending" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Pending</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAppId(appItem.id || appItem.ulid);
                                setIsConfirmStep(true);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                                isSelected
                                  ? "bg-[#78593D] text-white"
                                  : "bg-[#FAF7F2] text-[#78593D] border border-[#D6C8B8] hover:bg-[#78593D] hover:text-white"
                              }`}
                            >
                              <span>Select</span>
                              <span className="font-mono text-[11px] font-black">
                                ({formatPrice(addon.price)})
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ── STEP 2: PURCHASE CONFIRMATION & ORDER SUMMARY ── */
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF] space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#7E756B] block">
                  Order Breakdown
                </span>

                <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#EBE6DF]">
                  <div>
                    <h4 className="text-sm font-black text-[#1C1917]">{addon.name}</h4>
                    <p className="text-[11px] text-[#7E756B] mt-0.5">
                      Lifetime License &bull; One-time Activation
                    </p>
                  </div>
                  <span className="text-sm font-black text-[#78593D] font-mono">
                    {formatPrice(addon.price)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[#57514B]">
                  <span>Target Application:</span>
                  <strong className="text-[#1C1917] font-bold">{selectedApp?.name}</strong>
                </div>

                <div className="flex items-center justify-between text-xs text-[#57514B]">
                  <span>Store Website:</span>
                  <span className="font-mono text-[11px] text-[#7E756B] truncate max-w-[220px]">
                    {selectedApp?.website_url || selectedApp?.site_url || "Configured URL"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[#57514B]">
                  <span>GST / Platform Taxes:</span>
                  <span className="text-emerald-700 font-bold">Included (18%)</span>
                </div>

                <div className="pt-2 border-t border-[#EBE6DF] flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-[#1C1917]">
                    Total Payable:
                  </span>
                  <span className="text-lg font-black text-[#78593D] font-mono">
                    {formatPrice(addon.price)}
                  </span>
                </div>
              </div>

              {/* Security & Guarantee Note */}
              <div className="p-3 rounded-xl bg-white border border-[#EBE6DF] flex items-center gap-2.5 text-[11px] text-[#7E756B] shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  Protected by 256-bit bank encryption via Razorpay. Add-on unlocks immediately upon payment.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-[#FAF7F2] border-t border-[#EBE6DF] flex items-center justify-between gap-3">
          {isConfirmStep ? (
            <button
              type="button"
              onClick={() => setIsConfirmStep(false)}
              disabled={isProcessing}
              className="px-4 py-2.5 rounded-xl border border-[#EBE6DF] font-bold text-xs text-[#57514B] hover:bg-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change App</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2.5 rounded-xl border border-[#EBE6DF] font-bold text-xs text-[#57514B] hover:bg-white transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
          )}

          {isConfirmStep ? (
            <button
              type="button"
              onClick={handleProceedToPayment}
              disabled={isProcessing || !isSelectedAppEligible}
              className="px-6 py-2.5 rounded-xl bg-[#78593D] hover:bg-[#634932] text-white font-bold text-xs transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Payment...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Pay {formatPrice(addon.price)} with Razorpay</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (selectedApp && isSelectedAppEligible) {
                  setIsConfirmStep(true);
                }
              }}
              disabled={!selectedApp || !isSelectedAppEligible}
              className="px-5 py-2.5 rounded-xl bg-[#78593D] hover:bg-[#634932] text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Continue to Summary</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

