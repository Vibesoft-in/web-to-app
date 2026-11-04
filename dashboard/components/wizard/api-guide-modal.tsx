"use client";

import React, { useState } from "react";
import { X, Key, Layers, ExternalLink, Check, Copy, ChevronRight, Store, HelpCircle } from "lucide-react";

interface ApiGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  detectedPlatform?: string;
  storeUrl?: string;
}

export function ApiGuideModal({
  isOpen,
  onClose,
  detectedPlatform = "",
  storeUrl = "",
}: ApiGuideModalProps) {
  const normPlatform = (detectedPlatform || "").toLowerCase();
  const isShopifyDetected = normPlatform === "shopify";
  const isWooDetected =
    normPlatform === "woo" ||
    normPlatform === "woocommerce" ||
    normPlatform === "wordpress" ||
    normPlatform === "wp";
  const isUndetected = !isShopifyDetected && !isWooDetected;

  // Active tab state: default to detected platform, or woocommerce if unknown
  const [activeTab, setActiveTab] = useState<"woocommerce" | "shopify">(
    isShopifyDetected ? "shopify" : "woocommerce"
  );

  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const wooSteps = [
    {
      num: 1,
      title: "Open WordPress Admin",
      desc: "Log in to your WordPress dashboard. Usually located at your domain with /wp-admin.",
      actionText: "Visit WP Admin",
      actionUrl: storeUrl ? `${storeUrl.replace(/\/+$/, "")}/wp-admin` : "",
      screenshotType: "woo-step-1",
    },
    {
      num: 2,
      title: "Navigate to WooCommerce → Settings",
      desc: "In the left-hand WordPress dashboard sidebar, click 'WooCommerce' and choose 'Settings'.",
      screenshotType: "woo-step-2",
    },
    {
      num: 3,
      title: "Open Advanced → REST API",
      desc: "On the top navigation tabs in WooCommerce Settings, click 'Advanced', then select the 'REST API' sub-tab.",
      screenshotType: "woo-step-3",
    },
    {
      num: 4,
      title: "Click 'Add Key' Button",
      desc: "Click the blue 'Add Key' button or 'Create an API Key' to launch the credential generator.",
      screenshotType: "woo-step-4",
    },
    {
      num: 5,
      title: "Enter Description & Select User",
      desc: "In 'Description', enter 'Mobile App'. In 'User', pick your Administrator account.",
      screenshotType: "woo-step-5",
    },
    {
      num: 6,
      title: "Set Permissions to 'Read/Write'",
      desc: "Important: In the Permissions dropdown, select 'Read/Write' so your mobile app can read products and sync orders/cart.",
      screenshotType: "woo-step-6",
    },
    {
      num: 7,
      title: "Click 'Generate API Key'",
      desc: "Click the blue 'Generate API key' button. WordPress will securely compute your Consumer Key and Consumer Secret.",
      screenshotType: "woo-step-7",
    },
    {
      num: 8,
      title: "Copy Credentials into App Form",
      desc: "Copy the generated Consumer Key (ck_...) and Consumer Secret (cs_...) and paste them directly into the wizard fields below.",
      screenshotType: "woo-step-8",
    },
  ];

  const shopifySteps = [
    {
      num: 1,
      title: "Open Shopify Admin",
      desc: "Log in to your Shopify store admin portal at admin.shopify.com or your myshopify.com URL.",
      actionText: "Visit Shopify Admin",
      actionUrl: storeUrl ? storeUrl : "https://admin.shopify.com",
      screenshotType: "shopify-step-1",
    },
    {
      num: 2,
      title: "Navigate to Settings → Apps and sales channels",
      desc: "Click 'Settings' (gear icon at the bottom-left corner), then click 'Apps and sales channels' in the menu.",
      screenshotType: "shopify-step-2",
    },
    {
      num: 3,
      title: "Open 'Develop apps'",
      desc: "Click the 'Develop apps' button at the top of the page. If prompted to allow custom app development, click Allow.",
      screenshotType: "shopify-step-3",
    },
    {
      num: 4,
      title: "Click 'Create an app'",
      desc: "Click 'Create an app'. In App name, type 'Mobile App' and select yourself as App developer.",
      screenshotType: "shopify-step-4",
    },
    {
      num: 5,
      title: "Configure Admin API access scopes",
      desc: "Click 'Configure Admin API scopes'. Enable: read_products, read_orders, read_customers, and write_customers.",
      screenshotType: "shopify-step-5",
    },
    {
      num: 6,
      title: "Install the Custom App",
      desc: "Click the green 'Install app' button in the upper right corner to activate permissions.",
      screenshotType: "shopify-step-6",
    },
    {
      num: 7,
      title: "Generate & Reveal Admin API Access Token",
      desc: "Under 'API credentials', click 'Reveal token once'. Shopify will display your Admin API token starting with shpat_.",
      screenshotType: "shopify-step-7",
    },
    {
      num: 8,
      title: "Copy Token into App Form",
      desc: "Copy the Admin API Access Token and paste it into the 'Admin API Access Token' field in the connection setup.",
      screenshotType: "shopify-step-8",
    },
  ];

  const currentSteps = activeTab === "woocommerce" ? wooSteps : shopifySteps;
  const currentStep = currentSteps[activeStepIndex] || currentSteps[0];

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl relative z-10 border border-slate-200 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                Visual Step-by-Step Guide
              </span>
              {isUndetected && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                  Select your store platform below
                </span>
              )}
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
              <span>Generate API Credentials Guide</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Follow along with platform screenshots to generate secure REST API access keys.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Selection Tabs */}
        <div className="flex items-center gap-2 pt-4 pb-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab("woocommerce");
              setActiveStepIndex(0);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "woocommerce"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>WooCommerce (WordPress)</span>
            {isWooDetected && (
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-semibold">Detected</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("shopify");
              setActiveStepIndex(0);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "shopify"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Shopify Custom App</span>
            {isShopifyDetected && (
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-semibold">Detected</span>
            )}
          </button>
        </div>

        {/* Main Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-2 overflow-y-auto flex-1 pr-1">
          {/* Left Column: Step Navigation List (4 cols) */}
          <div className="md:col-span-5 space-y-1.5 overflow-y-auto max-h-[460px] pr-1">
            {currentSteps.map((step, idx) => {
              const isActive = activeStepIndex === idx;
              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => setActiveStepIndex(idx)}
                  className={`w-full text-left p-3 rounded-2xl border transition flex items-start gap-3 cursor-pointer ${
                    isActive
                      ? "bg-indigo-50/80 border-indigo-300 ring-1 ring-indigo-300 shadow-xs"
                      : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {step.num}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-bold leading-snug truncate ${
                        isActive ? "text-indigo-950" : "text-slate-800"
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {step.desc}
                    </p>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 flex-shrink-0 transition ${
                      isActive ? "text-indigo-600 translate-x-0.5" : "text-slate-300"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Right Column: Step Visual Illustration & Screenshot (7 cols) */}
          <div className="md:col-span-7 flex flex-col justify-between bg-slate-50 rounded-2xl border border-slate-200/80 p-4">
            <div>
              {/* Step Heading Badge & Title */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100/70 px-2.5 py-0.5 rounded-md">
                  Step {currentStep.num} of 8
                </span>
                {currentStep.actionUrl && (
                  <a
                    href={currentStep.actionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline"
                  >
                    <span>{currentStep.actionText || "Open in New Tab"}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                {currentStep.title}
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {currentStep.desc}
              </p>

              {/* High-Fidelity Platform UI Mockup / Visual Screenshot */}
              <div className="mt-3 bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
                {/* Browser-like window header */}
                <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                  </div>
                  <span className="truncate max-w-[260px] text-slate-600 font-medium">
                    {activeTab === "woocommerce" ? "wp-admin / woocommerce / settings" : "admin.shopify.com / settings / apps"}
                  </span>
                  <span className="text-[10px] text-slate-400">HTTPS</span>
                </div>

                {/* Screenshot Frame Content based on active step */}
                <div className="p-3 sm:p-4 text-xs font-sans select-none min-h-[190px] flex flex-col justify-center bg-gradient-to-b from-white to-slate-50/50">
                  {/* --- WooCommerce Screenshots --- */}
                  {activeTab === "woocommerce" && currentStep.num === 1 && (
                    <div className="space-y-3 p-2 bg-slate-900 text-white rounded-xl shadow-inner max-w-sm mx-auto">
                      <div className="text-center font-bold text-sm text-indigo-400">WordPress Admin Login</div>
                      <div className="space-y-2">
                        <div className="h-7 bg-slate-800 rounded px-2 text-[11px] flex items-center text-slate-300 border border-slate-700">admin@yourstore.com</div>
                        <div className="h-7 bg-slate-800 rounded px-2 text-[11px] flex items-center text-slate-400 border border-slate-700">••••••••••••</div>
                        <div className="h-7 bg-indigo-600 rounded flex items-center justify-center font-bold text-white text-[11px]">Log In</div>
                      </div>
                    </div>
                  )}

                  {activeTab === "woocommerce" && currentStep.num === 2 && (
                    <div className="flex gap-3">
                      <div className="w-36 bg-slate-900 text-slate-300 p-2 rounded-lg text-[11px] space-y-1.5">
                        <div className="text-slate-400 text-[10px] uppercase font-bold">WP Sidebar</div>
                        <div className="p-1 rounded bg-slate-800 font-bold text-white">Posts</div>
                        <div className="p-1 rounded bg-indigo-600 text-white font-bold flex items-center justify-between ring-2 ring-indigo-400">
                          <span>WooCommerce</span>
                          <span className="text-[9px]">►</span>
                        </div>
                        <div className="pl-3 space-y-1 text-slate-300">
                          <div className="p-1 rounded bg-indigo-500/30 text-indigo-300 font-bold border border-indigo-400">→ Settings</div>
                          <div className="p-1">Orders</div>
                        </div>
                      </div>
                      <div className="flex-1 bg-white p-2 rounded border border-slate-200">
                        <div className="font-bold text-slate-800">WooCommerce Settings</div>
                        <div className="text-[10px] text-slate-500 mt-1">General | Products | Shipping | Payments | Accounts | Emails | Integration | <strong className="text-indigo-600 underline">Advanced</strong></div>
                      </div>
                    </div>
                  )}

                  {activeTab === "woocommerce" && currentStep.num === 3 && (
                    <div className="space-y-2">
                      <div className="flex gap-2 border-b border-slate-200 pb-1 text-[11px]">
                        <span className="text-slate-500">Page setup</span>
                        <span className="px-2 py-0.5 bg-indigo-600 text-white font-bold rounded ring-2 ring-indigo-300">REST API</span>
                        <span className="text-slate-500">Webhooks</span>
                        <span className="text-slate-500">Legacy API</span>
                      </div>
                      <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900">REST API Applications</div>
                          <div className="text-[10px] text-slate-600">The WooCommerce REST API allows external apps to read/write data.</div>
                        </div>
                        <span className="px-3 py-1 bg-indigo-600 text-white font-bold text-xs rounded-lg shadow-sm">Add Key</span>
                      </div>
                    </div>
                  )}

                  {activeTab === "woocommerce" && currentStep.num === 4 && (
                    <div className="p-3 bg-white border border-slate-300 rounded-xl space-y-2">
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="font-bold text-slate-900">REST API Keys</span>
                        <button type="button" className="px-3 py-1.5 bg-indigo-600 text-white font-bold rounded-lg text-xs animate-pulse ring-4 ring-indigo-200">
                          + Add Key
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500">Clicking &apos;Add Key&apos; opens the key details configuration panel.</p>
                    </div>
                  )}

                  {activeTab === "woocommerce" && currentStep.num === 5 && (
                    <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-300">
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block">Description *</label>
                        <div className="mt-0.5 p-1.5 bg-indigo-50/70 border-2 border-indigo-500 rounded text-indigo-900 font-bold flex items-center justify-between">
                          <span>Mobile App</span>
                          <span className="text-[9px] bg-indigo-600 text-white px-1 rounded">Required</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block">User *</label>
                        <div className="mt-0.5 p-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800">
                          Admin (admin@yourstore.com)
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "woocommerce" && currentStep.num === 6 && (
                    <div className="space-y-2 bg-white p-3 rounded-xl border-2 border-emerald-500 ring-2 ring-emerald-200">
                      <label className="text-[11px] font-bold text-slate-900 block flex items-center justify-between">
                        <span>Permissions *</span>
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">Select &quot;Read/Write&quot;</span>
                      </label>
                      <div className="p-2 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-900 flex items-center justify-between">
                        <span>Read/Write</span>
                        <Check className="w-4 h-4 text-emerald-600" />
                      </div>
                      <p className="text-[10px] text-slate-500">
                        ✓ Read/Write allows real-time catalog sync and lets customers place orders inside your app.
                      </p>
                    </div>
                  )}

                  {activeTab === "woocommerce" && currentStep.num === 7 && (
                    <div className="p-3 bg-white rounded-xl border border-slate-300 space-y-2">
                      <div className="text-slate-700 text-xs font-medium">Ready to issue credentials?</div>
                      <button type="button" className="w-full py-2 bg-indigo-600 text-white font-bold rounded-lg text-xs shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5">
                        <Key className="w-3.5 h-3.5" />
                        <span>Generate API Key</span>
                      </button>
                      <p className="text-[10px] text-slate-400 text-center">Generates encrypted consumer_key and consumer_secret.</p>
                    </div>
                  )}

                  {activeTab === "woocommerce" && currentStep.num === 8 && (
                    <div className="space-y-2 bg-slate-900 text-white p-3 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-mono">Consumer Key</span>
                        <div className="flex items-center justify-between bg-slate-800 p-1.5 rounded font-mono text-[11px] text-emerald-400 border border-slate-700">
                          <span className="truncate">ck_7a9f82b3d1c4e0987f654...</span>
                          <Copy className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-mono">Consumer Secret</span>
                        <div className="flex items-center justify-between bg-slate-800 p-1.5 rounded font-mono text-[11px] text-emerald-400 border border-slate-700">
                          <span className="truncate">cs_9c8b7a6f5e4d3c2b1a0...</span>
                          <Copy className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- Shopify Screenshots --- */}
                  {activeTab === "shopify" && currentStep.num === 1 && (
                    <div className="space-y-2 p-3 bg-slate-900 text-white rounded-xl shadow-inner max-w-sm mx-auto">
                      <div className="font-bold text-center text-sm text-emerald-400">Shopify Admin Portal</div>
                      <div className="p-2 bg-slate-800 rounded text-xs text-slate-300 border border-slate-700 flex items-center justify-between">
                        <span>your-store.myshopify.com/admin</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                  )}

                  {activeTab === "shopify" && currentStep.num === 2 && (
                    <div className="flex gap-2">
                      <div className="w-36 bg-slate-800 text-white p-2 rounded text-[11px] space-y-1">
                        <div className="text-[10px] text-slate-400">Settings</div>
                        <div className="p-1 rounded bg-slate-700">General</div>
                        <div className="p-1 rounded bg-indigo-600 text-white font-bold ring-2 ring-indigo-400">Apps and sales channels</div>
                        <div className="p-1 rounded">Domains</div>
                      </div>
                      <div className="flex-1 bg-white p-2 rounded border border-slate-200">
                        <div className="font-bold text-slate-800">Apps and sales channels</div>
                        <div className="text-[10px] text-slate-500 mt-1">Manage installed apps and custom store apps.</div>
                      </div>
                    </div>
                  )}

                  {activeTab === "shopify" && currentStep.num === 3 && (
                    <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold text-slate-800">Custom App Development</div>
                          <div className="text-[10px] text-slate-500">Build custom integrations with Shopify Admin API.</div>
                        </div>
                        <span className="px-3 py-1 bg-indigo-600 text-white font-bold rounded-lg text-xs ring-4 ring-indigo-200 animate-pulse">
                          Develop apps
                        </span>
                      </div>
                    </div>
                  )}

                  {activeTab === "shopify" && currentStep.num === 4 && (
                    <div className="p-3 bg-white border border-slate-300 rounded-xl space-y-2">
                      <div className="font-bold text-slate-800">Create an app</div>
                      <div>
                        <label className="text-[10px] text-slate-600 block">App name</label>
                        <div className="p-1.5 bg-indigo-50 border border-indigo-400 rounded text-xs font-bold text-indigo-900">
                          Mobile App Converter
                        </div>
                      </div>
                      <button type="button" className="px-3 py-1 bg-indigo-600 text-white font-bold rounded text-xs">
                        Create app
                      </button>
                    </div>
                  )}

                  {activeTab === "shopify" && currentStep.num === 5 && (
                    <div className="p-3 bg-white border border-slate-300 rounded-xl space-y-2">
                      <div className="font-bold text-slate-900 text-xs">Admin API access scopes</div>
                      <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                        <div className="p-1 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 flex items-center justify-between">
                          <span>read_products</span>
                          <Check className="w-3 h-3 text-emerald-600" />
                        </div>
                        <div className="p-1 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 flex items-center justify-between">
                          <span>read_orders</span>
                          <Check className="w-3 h-3 text-emerald-600" />
                        </div>
                        <div className="p-1 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 flex items-center justify-between">
                          <span>read_customers</span>
                          <Check className="w-3 h-3 text-emerald-600" />
                        </div>
                        <div className="p-1 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 flex items-center justify-between">
                          <span>write_customers</span>
                          <Check className="w-3 h-3 text-emerald-600" />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "shopify" && currentStep.num === 6 && (
                    <div className="p-3 bg-white border border-slate-300 rounded-xl space-y-2 text-center">
                      <div className="text-xs text-slate-700">All scopes configured. Ready to install?</div>
                      <button type="button" className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded-lg text-xs shadow-md ring-4 ring-emerald-200">
                        Install app
                      </button>
                      <div className="text-[10px] text-slate-400">Activates Admin API permissions for your store</div>
                    </div>
                  )}

                  {activeTab === "shopify" && currentStep.num === 7 && (
                    <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2">
                      <div className="text-[11px] font-bold text-slate-200">Admin API access token</div>
                      <div className="p-2 bg-slate-800 rounded border border-slate-700 flex items-center justify-between">
                        <span className="font-mono text-emerald-400 text-xs">shpat_9f8e7d6c5b4a3...</span>
                        <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded font-bold">Revealed</span>
                      </div>
                      <p className="text-[10px] text-amber-300">⚠️ Token is only revealed once. Copy it now.</p>
                    </div>
                  )}

                  {activeTab === "shopify" && currentStep.num === 8 && (
                    <div className="p-3 bg-white border border-slate-300 rounded-xl space-y-2">
                      <div className="text-xs font-bold text-slate-900">Paste Token into Setup</div>
                      <div className="p-2 bg-indigo-50 border border-indigo-300 rounded text-xs font-mono text-indigo-900">
                        shpat_9f8e7d6c5b4a3...
                      </div>
                      <p className="text-[10px] text-slate-500">Paste into the &quot;Admin API Access Token&quot; field in Step 2 of the setup wizard.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step Navigation Controls */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200/80">
              <button
                type="button"
                onClick={() => setActiveStepIndex((prev) => Math.max(0, prev - 1))}
                disabled={activeStepIndex === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous Step
              </button>

              <span className="text-[11px] text-slate-500 font-medium">
                Step {activeStepIndex + 1} of {currentSteps.length}
              </span>

              <button
                type="button"
                onClick={() => {
                  if (activeStepIndex < currentSteps.length - 1) {
                    setActiveStepIndex((prev) => prev + 1);
                  } else {
                    onClose();
                  }
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm cursor-pointer"
              >
                {activeStepIndex === currentSteps.length - 1 ? "Finish & Close" : "Next Step"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
          <p className="text-[11px] text-slate-500">
            Need help? Make sure your store uses HTTPS and that API permissions are granted.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
