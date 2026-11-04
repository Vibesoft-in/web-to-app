"use client";

import React from "react";
import { AlertTriangle, RefreshCw, X, ShieldAlert, KeyRound, Globe, WifiOff, Lock } from "lucide-react";

interface VerificationErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry?: () => void;
  errorCode?: string;
  errorMessage?: string;
  platform?: string;
  storeUrl?: string;
}

export function VerificationErrorModal({
  isOpen,
  onClose,
  onRetry,
  errorCode = "VERIFICATION_FAILED",
  errorMessage = "Unable to connect to your store with the provided credentials.",
  platform = "woocommerce",
  storeUrl = "",
}: VerificationErrorModalProps) {
  if (!isOpen) return null;

  const isWoo = platform.toLowerCase().includes("woo") || platform.toLowerCase().includes("word");
  const isShopify = platform.toLowerCase().includes("shopify");

  // Map error code to human-friendly title, message, and actionable guidance
  const resolveErrorDetails = () => {
    switch (errorCode) {
      case "INVALID_CONSUMER_KEY":
      case "INVALID_KEY":
        return {
          title: "Invalid API Key",
          icon: <KeyRound className="w-6 h-6 text-rose-600" />,
          mainMessage: isShopify
            ? "The Shopify Admin API access token provided could not be verified."
            : "The WooCommerce Consumer Key (ck_...) does not match or is invalid.",
          guidance: isShopify
            ? "Please verify your Admin API access token in Shopify Admin under Settings → Apps and sales channels → Develop apps."
            : "Please double-check that your Consumer Key starts with 'ck_' and matches the key generated in your WordPress Admin.",
        };
      case "INVALID_CONSUMER_SECRET":
      case "INVALID_SECRET":
        return {
          title: "Invalid Consumer Secret",
          icon: <Lock className="w-6 h-6 text-rose-600" />,
          mainMessage: "The WooCommerce Consumer Secret (cs_...) is incorrect or expired.",
          guidance: "Please regenerate your REST API credentials in WordPress Admin (WooCommerce → Settings → Advanced → REST API) and copy the new Consumer Secret.",
        };
      case "INSUFFICIENT_PERMISSIONS":
      case "PERMISSION_DENIED":
      case "READ_ONLY":
        return {
          title: "Incorrect API Permissions",
          icon: <ShieldAlert className="w-6 h-6 text-amber-600" />,
          mainMessage: "The API credentials provided only have Read permissions.",
          guidance: "Your mobile application requires Read/Write permissions so customers can add products to cart and checkout. Please edit the API key in WooCommerce and change Permissions to 'Read/Write'.",
        };
      case "TIMEOUT":
      case "CONNECTION_TIMEOUT":
      case "CURL_TIMEOUT":
        return {
          title: "Connection Timed Out",
          icon: <WifiOff className="w-6 h-6 text-rose-600" />,
          mainMessage: "The connection to your website server timed out after waiting 15 seconds.",
          guidance: "Your website hosting server or firewall (such as Cloudflare or Wordfence) may be blocking outgoing API requests. Please check your website status and try again.",
        };
      case "URL_UNREACHABLE":
      case "DNS_FAILURE":
      case "WEBSITE_UNAVAILABLE":
        return {
          title: "Website Unavailable",
          icon: <Globe className="w-6 h-6 text-rose-600" />,
          mainMessage: `Could not reach ${storeUrl || "your website"}. The domain appears to be down or unreachable.`,
          guidance: "Ensure your website is live and publicly accessible over HTTPS before attempting verification.",
        };
      case "PLATFORM_MISMATCH":
        return {
          title: "Platform Mismatch Detected",
          icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
          mainMessage: `The API credentials entered do not match the detected website platform (${platform}).`,
          guidance: isWoo
            ? "You entered WooCommerce credentials, but the store does not appear to run WooCommerce."
            : "Please make sure you are using credentials from the correct e-commerce platform.",
        };
      case "CREDENTIAL_MISMATCH":
      case "CROSS_DOMAIN_MISMATCH":
        return {
          title: "Store & Credentials Mismatch",
          icon: <AlertTriangle className="w-6 h-6 text-rose-600" />,
          mainMessage: "These credentials belong to a different store and could not authenticate against this URL.",
          guidance: "API keys must be generated directly from the WordPress/Shopify admin of the exact store URL you specified.",
        };
      default:
        return {
          title: "Connection Failed",
          icon: <AlertTriangle className="w-6 h-6 text-rose-600" />,
          mainMessage: errorMessage || (isWoo ? "The WooCommerce API credentials are invalid." : "The API credentials could not be verified."),
          guidance: isWoo
            ? "Please check your Consumer Key and Consumer Secret and try again. Ensure permalinks are set to Post name in WordPress Settings."
            : "Please check your Admin API access token and permissions in your store admin and try again.",
        };
    }
  };

  const details = resolveErrorDetails();

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative z-10 border border-slate-200 my-auto text-center space-y-4">
        {/* Top Icon Badge */}
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
          {details.icon}
        </div>

        {/* Title & Message */}
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded">
            {errorCode}
          </span>
          <h3 className="text-lg font-black text-slate-900 tracking-tight mt-1.5">
            {details.title}
          </h3>
          <p className="text-xs text-slate-600 mt-2 font-medium leading-relaxed">
            {details.mainMessage}
          </p>
        </div>

        {/* Actionable Guidance Box */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-1">
          <span className="text-[11px] font-bold text-slate-800 block">Recommended Action:</span>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {details.guidance}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              if (onRetry) onRetry();
            }}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/30 cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    </div>
  );
}

