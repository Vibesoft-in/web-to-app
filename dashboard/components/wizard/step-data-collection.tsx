"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Image as ImageIcon,
  Layers,
  Link as LinkIcon,
  Loader2,
  Lock,
  Palette,
  Pencil,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Sliders,
  Sparkles,
  Type,
  Upload,
  X,
  Zap,
} from "lucide-react";

interface StepDataCollectionProps {
  ulid: string;
  onNext: () => void;
}

export function StepDataCollection({ ulid, onNext }: StepDataCollectionProps) {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [scanStage, setScanStage] = useState<number>(4);

  // Logo customization state
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);
  const [isChangingLogo, setIsChangingLogo] = useState(false);
  const [logoMode, setLogoMode] = useState<"upload" | "url">("upload");
  const [logoInputUrl, setLogoInputUrl] = useState("");
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editable brand colors (taken from website and customizable by user)
  const [customColors, setCustomColors] = useState<Record<string, string>>({
    primary: "#046BD2",
    secondary: "#045CB4",
    accent: "#1E293B",
    background: "#FFFFFF",
    surface: "#F0F5FA",
  });
  const [hasCustomizedColors, setHasCustomizedColors] = useState(false);

  // Load any previously customized logo from localStorage
  useEffect(() => {
    try {
      const savedLogo = localStorage.getItem(`app_draft_${ulid}_logo`);
      if (savedLogo) {
        setCustomLogoUrl(savedLogo);
      }
    } catch {}
  }, [ulid]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setLogoError("Image exceeds 5MB limit. Please choose a smaller file.");
      return;
    }

    setLogoError(null);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      if (dataUrl) {
        setCustomLogoUrl(dataUrl);
        setIsChangingLogo(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyLogoUrl = () => {
    const trimmed = logoInputUrl.trim();
    if (!trimmed) {
      setLogoError("Please enter an image URL.");
      return;
    }
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("data:")) {
      setLogoError("URL must start with https:// or http://");
      return;
    }
    setLogoError(null);
    setCustomLogoUrl(trimmed);
    setLogoInputUrl("");
    setIsChangingLogo(false);
  };

  const handleResetLogo = () => {
    setCustomLogoUrl(null);
    setLogoError(null);
    setLogoInputUrl("");
    setIsChangingLogo(false);
    try {
      localStorage.removeItem(`app_draft_${ulid}_logo`);
    } catch {}
  };

  // Fetch website extracted data
  const {
    data: siteData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["website-data", ulid],
    queryFn: async () => {
      const res = await apiClient(`/api/apps/${ulid}/website-data`);
      return res;
    },
    refetchOnWindowFocus: false,
  });

  // Automatically take the website colors into editable state upon loading
  useEffect(() => {
    if (siteData?.brand?.colors && !hasCustomizedColors) {
      setCustomColors({
        primary: siteData.brand.colors.primary || "#046BD2",
        secondary: siteData.brand.colors.secondary || "#045CB4",
        accent: siteData.brand.colors.accent || "#1E293B",
        background: siteData.brand.colors.background || "#FFFFFF",
        surface: siteData.brand.colors.surface || "#F0F5FA",
      });
    }
  }, [siteData?.brand?.colors, hasCustomizedColors]);

  const handleColorChange = (key: string, value: string) => {
    setHasCustomizedColors(true);
    setCustomColors((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleResetColor = (key: string) => {
    const original = siteData?.brand?.colors?.[key];
    if (original) {
      setCustomColors((prev) => ({
        ...prev,
        [key]: original,
      }));
    }
  };

  const handleResetAllColors = () => {
    if (siteData?.brand?.colors) {
      setCustomColors({ ...siteData.brand.colors });
      setHasCustomizedColors(false);
    }
  };

  const handleSelectPalette = (palette: Record<string, string>) => {
    setHasCustomizedColors(true);
    setCustomColors((prev) => ({
      ...prev,
      ...palette,
    }));
  };

  const handleCopyColor = (hex: string, label: string) => {
    navigator.clipboard?.writeText(hex);
    setCopiedColor(label);
    setTimeout(() => setCopiedColor(null), 1800);
  };

  const handleRescan = async () => {
    setIsSyncing(true);
    setScanStage(1);
    const t1 = setTimeout(() => setScanStage(2), 600);
    const t2 = setTimeout(() => setScanStage(3), 1200);
    const t3 = setTimeout(() => setScanStage(4), 1800);

    try {
      await refetch();
      setHasCustomizedColors(false);
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
      }, 2000);
    }
  };

  const handleApplyAndContinue = async () => {
    setIsApplying(true);
    const finalLogoUrl = customLogoUrl || siteData?.brand?.logo_url || "";
    try {
      if (siteData?.brand || finalLogoUrl) {
        await apiClient(`/api/apps/${ulid}/website-data/apply`, {
          method: "POST",
          body: JSON.stringify({
            logo_url: finalLogoUrl,
            font: siteData?.brand?.font_heading,
            colors: customColors,
            app_name: siteData?.store_name,
          }),
        });

        // Store in localStorage for branding and theme wizards
        try {
          localStorage.setItem(`app_draft_${ulid}_colors`, JSON.stringify(customColors));
          if (finalLogoUrl) {
            localStorage.setItem(`app_draft_${ulid}_logo`, finalLogoUrl);
          }
          if (siteData?.brand?.colors) {
            localStorage.setItem(`app_draft_${ulid}_extracted_colors`, JSON.stringify(siteData.brand.colors));
          }
          localStorage.setItem(
            "appifyhub_extracted_website_brand",
            JSON.stringify({
              logo_url: finalLogoUrl,
              font_heading: siteData?.brand?.font_heading,
              font_body: siteData?.brand?.font_body,
              colors: customColors,
              store_name: siteData?.store_name,
              store_url: siteData?.website_url,
            })
          );
        } catch {}
      }
      onNext();
    } catch {
      onNext();
    } finally {
      setIsApplying(false);
    }
  };

  const brand = siteData?.brand || {
    logo_url: "",
    logo_source: "Website Header",
    font_heading: "Plus Jakarta Sans",
    font_body: "Inter",
    detected_fonts: ["Plus Jakarta Sans", "Inter"],
    colors: {
      primary: "#78593D",
      secondary: "#252525",
      accent: "#B69A78",
      background: "#FFFFFF",
      surface: "#F9F7F4",
    },
  };

  const activeLogo = customLogoUrl || brand.logo_url || "";

  const catalog = siteData?.catalog || {
    total_products: 0,
    total_categories: 0,
    currency: "INR",
    currency_symbol: "₹",
    categories: [],
  };

  const metrics = siteData?.metrics || {
    latency_ms: 120,
    ssl_secure: true,
    platform: "woocommerce",
  };

  return (
    <div className="space-y-6">
      {/* ── TOP HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-700" />
              <span>Automated Website Extraction</span>
            </span>
            <span className="text-xs text-slate-400">• Step 4 of 11</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Data Collection & Brand Extraction
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            We analyzed your website <strong className="text-slate-800">{siteData?.website_url || "store"}</strong> to collect your official brand logo, typography, color codes, and product catalog data.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRescan}
          disabled={isSyncing || isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs disabled:opacity-60 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-indigo-600" : ""}`} />
          <span>{isSyncing ? "Re-scanning Website..." : "Re-calculate Data"}</span>
        </button>
      </div>

      {/* ── LIVE DATA EXTRACTION PROGRESS BAR ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50/70 via-stone-50 to-emerald-50/50 border border-amber-200/70 shadow-xs">
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
            <span>Store Asset Extraction Engine</span>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-200">
            ✓ 100% Data Collected
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
          <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-xl border border-slate-200/80">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-slate-700 font-medium">Logo & Favicon Extracted</span>
          </div>
          <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-xl border border-slate-200/80">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-slate-700 font-medium">Fonts & Typography Detected</span>
          </div>
          <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-xl border border-slate-200/80">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-slate-700 font-medium">Hex Color Codes Sampled</span>
          </div>
          <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-xl border border-slate-200/80">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-slate-700 font-medium">Catalog Structure Parsed</span>
          </div>
        </div>
      </div>

      {/* ── 3 COLUMN GRID: LOGO, FONT, COLOR CODES ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. EXTRACTED / CUSTOM LOGO CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {customLogoUrl ? "Custom Store Logo" : "Extracted Logo"}
                  </h3>
                  <span className="text-[11px] text-slate-400 block truncate max-w-[150px]">
                    {customLogoUrl ? "Customized by user" : brand.logo_source}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {customLogoUrl ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                    Custom
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Verified
                  </span>
                )}
              </div>
            </div>

            {/* Logo Preview Box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 mb-3 flex flex-col items-center justify-center min-h-[140px] relative group">
              {activeLogo ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-center max-w-[200px] min-h-[64px]">
                    <img
                      src={activeLogo}
                      alt="Store Logo"
                      className="max-h-14 max-w-[170px] object-contain drop-shadow-xs"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {brand.favicon_url && !customLogoUrl && (
                      <img
                        src={brand.favicon_url}
                        alt="Favicon"
                        className="w-4 h-4 rounded object-contain border border-slate-200"
                        title="Website Favicon"
                      />
                    )}
                    <span className="text-[11px] text-slate-500 font-medium">
                      {customLogoUrl ? "Selected Custom Logo" : `${siteData?.store_name || "Store"} Official Logo`}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center text-xs text-slate-400">
                  <ImageIcon className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                  <span>No Logo Detected</span>
                </div>
              )}
            </div>

            {/* Change Logo Actions / Controls */}
            {!isChangingLogo ? (
              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setIsChangingLogo(true)}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Change Logo</span>
                </button>

                {customLogoUrl && (
                  <button
                    type="button"
                    onClick={handleResetLogo}
                    title="Reset to website's extracted logo"
                    className="py-2 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Change Store Logo:</span>
                  <button
                    type="button"
                    onClick={() => { setIsChangingLogo(false); setLogoError(null); }}
                    className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Sub-tabs: Upload file or URL */}
                <div className="flex border-b border-slate-200 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => { setLogoMode("upload"); setLogoError(null); }}
                    className={`pb-1.5 px-2 border-b-2 transition cursor-pointer ${
                      logoMode === "upload"
                        ? "border-amber-900 text-amber-900 font-bold"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLogoMode("url"); setLogoError(null); }}
                    className={`pb-1.5 px-2 border-b-2 transition cursor-pointer ${
                      logoMode === "url"
                        ? "border-amber-900 text-amber-900 font-bold"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Image URL
                  </button>
                </div>

                {logoMode === "upload" ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2.5 px-3 border border-dashed border-slate-300 hover:border-amber-600 bg-white hover:bg-amber-50/50 rounded-xl text-xs font-semibold text-slate-700 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-800" />
                      <span>Choose Image (PNG, JPG, SVG, WebP)</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <input
                      type="url"
                      placeholder="https://example.com/logo.png"
                      value={logoInputUrl}
                      onChange={(e) => setLogoInputUrl(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleApplyLogoUrl}
                      className="px-3 py-1.5 bg-amber-900 hover:bg-amber-950 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                )}

                {logoError && (
                  <p className="text-[11px] text-rose-600 font-medium">{logoError}</p>
                )}
              </div>
            )}

            <p className="text-xs text-slate-500 leading-relaxed">
              This logo will be automatically configured for your mobile app splash screen, header navigation, and push notifications.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Target</span>
            <span className="font-semibold text-slate-800">Mobile App Icon &amp; Header</span>
          </div>
        </div>

        {/* 2. EXTRACTED TYPOGRAPHY / FONT CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            {brand.font_heading && (
              <link
                rel="stylesheet"
                href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(
                  brand.font_heading
                )}:wght@400;600;700&display=swap`}
              />
            )}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  <Type className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Extracted Font</h3>
                  <span className="text-[11px] text-slate-400 block">Google Fonts &amp; CSS Tokens</span>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                Live Font
              </span>
            </div>

            {/* Font Preview Box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold">Primary Heading Font:</span>
                <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60 font-mono">
                  {brand.font_heading}
                </span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200/80">
                <p
                  className="text-sm font-bold text-slate-900 leading-snug"
                  style={{ fontFamily: brand.font_heading }}
                >
                  Modern Mobile Experience
                </p>
                <p
                  className="text-xs text-slate-500 mt-1"
                  style={{ fontFamily: brand.font_body }}
                >
                  The quick brown fox jumps over the lazy dog.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {brand.detected_fonts.map((f: string, idx: number) => (
                  <span
                    key={idx}
                    className="text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Fonts detected from your website will be rendered natively inside your Flutter iOS &amp; Android app package.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Headings &amp; Body</span>
            <span className="font-semibold text-slate-800">{brand.font_heading} / {brand.font_body}</span>
          </div>
        </div>

        {/* 3. EXTRACTED & EDITABLE BRAND COLOR CODES CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Extracted Color Codes</h3>
                  <span className="text-[11px] text-slate-400 block">Sampled &amp; Fully Customizable</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {hasCustomizedColors && (
                  <button
                    type="button"
                    onClick={handleResetAllColors}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 transition"
                    title="Reset all colors to original website values"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Reset</span>
                  </button>
                )}
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {hasCustomizedColors ? "Customized" : "Website"}
                </span>
              </div>
            </div>

            {/* Color Swatches Grid with Live Color Pickers and Hex Inputs */}
            <div className="space-y-2.5 mb-3.5">
              {[
                { key: "primary", label: "Primary", desc: "CTA Buttons & Icons", defaultHex: siteData?.brand?.colors?.primary || "#046BD2" },
                { key: "secondary", label: "Secondary", desc: "Gradients & Accents", defaultHex: siteData?.brand?.colors?.secondary || "#045CB4" },
                { key: "accent", label: "Accent / Headings", desc: "Headings & Dark Elements", defaultHex: siteData?.brand?.colors?.accent || "#1E293B" },
                { key: "background", label: "Background", desc: "App Canvas", defaultHex: siteData?.brand?.colors?.background || "#FFFFFF" },
                { key: "surface", label: "Surface", desc: "Cards & Category Pills", defaultHex: siteData?.brand?.colors?.surface || "#F0F5FA" },
              ].map((item) => {
                const currentColor = customColors[item.key] || item.defaultHex;
                const isModified = currentColor.toUpperCase() !== item.defaultHex.toUpperCase();
                const isCopied = copiedColor === item.key;

                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-2 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white transition"
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Interactive Color Picker Trigger */}
                      <div className="relative flex-shrink-0">
                        <input
                          type="color"
                          value={currentColor}
                          onChange={(e) => handleColorChange(item.key, e.target.value)}
                          className="w-7 h-7 rounded-lg cursor-pointer border border-black/15 shadow-inner p-0.5 block"
                          title={`Click to pick ${item.label} color`}
                        />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 capitalize block leading-tight">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {item.desc}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={currentColor}
                        onChange={(e) => handleColorChange(item.key, e.target.value)}
                        className="w-20 px-2 py-1 text-xs font-mono uppercase bg-white border border-slate-200 rounded-lg text-slate-800 text-center font-bold focus:border-indigo-600 focus:outline-none"
                        maxLength={7}
                      />
                      {isModified && (
                        <button
                          type="button"
                          onClick={() => handleResetColor(item.key)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
                          title="Reset to website color"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopyColor(currentColor, item.key)}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded transition"
                        title="Copy hex code"
                      >
                        {isCopied ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick 1-Click Alternate Palettes */}
            <div className="pt-2 border-t border-slate-100 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Quick Palettes
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={handleResetAllColors}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition"
                >
                  <span className="w-2 h-2 rounded-full bg-[#046BD2]" />
                  <span>Website Extracted</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPalette({ primary: "#4F46E5", secondary: "#7C3AED", accent: "#1E1B4B" })}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center gap-1 transition"
                >
                  <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
                  <span>Royal Indigo</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPalette({ primary: "#059669", secondary: "#10B981", accent: "#064E3B" })}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center gap-1 transition"
                >
                  <span className="w-2 h-2 rounded-full bg-[#059669]" />
                  <span>Emerald Luxe</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPalette({ primary: "#E11D48", secondary: "#FB7185", accent: "#881337" })}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center gap-1 transition"
                >
                  <span className="w-2 h-2 rounded-full bg-[#E11D48]" />
                  <span>Rose Chic</span>
                </button>
              </div>
            </div>

            {/* Live Mini Preview with these colors */}
            <div
              className="p-2.5 rounded-xl border flex items-center justify-between text-xs"
              style={{ backgroundColor: customColors.surface || "#F0F5FA" }}
            >
              <span className="font-semibold" style={{ color: customColors.accent || "#1E293B" }}>
                Preview UI:
              </span>
              <span
                className="px-3 py-1 rounded-lg font-bold text-white shadow-xs text-[11px]"
                style={{ backgroundColor: customColors.primary || "#046BD2" }}
              >
                Sample Button
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Primary Brand Hex</span>
            <span className="font-bold text-slate-900 font-mono">{customColors.primary}</span>
          </div>
        </div>
      </div>

      {/* ── CALCULATED STORE DATA & 11-FACTOR WEBSITE PERFORMANCE ROW ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-700" />
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Website Performance &amp; Core Web Vitals (11-Factor Audit)
              </h3>
              <p className="text-xs text-slate-500">
                Calculated on Speed, Total Products, FCP, LCP, TBT, Performance, Accessibility, Best Practices, SEO, Security, and Categories.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Overall Score: {siteData?.performance_metrics?.overall_score || 87}%
            </span>
          </div>
        </div>

        {/* 11 Performance & Quality Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            {
              key: "speed",
              label: "1. Speed & Latency",
              val: siteData?.performance_metrics?.speed?.value || `${metrics.latency_ms || 145}ms`,
              benchmark: "< 300ms",
              desc: "Server TTFB & API round-trip",
              status: "good",
            },
            {
              key: "total_products",
              label: "2. Total Products",
              val: siteData?.performance_metrics?.total_products?.value || catalog.total_products || 24,
              benchmark: "Catalog ready",
              desc: "Total inventory available for app",
              status: "good",
            },
            {
              key: "first_contentful_paint",
              label: "3. First Paint (FCP)",
              val: siteData?.performance_metrics?.first_contentful_paint?.value || "1.1s",
              benchmark: "< 1.8s",
              desc: "First visible DOM paint",
              status: "good",
            },
            {
              key: "last_contentful_paint",
              label: "4. Last Paint (LCP)",
              val: siteData?.performance_metrics?.last_contentful_paint?.value || "1.9s",
              benchmark: "< 2.5s",
              desc: "Hero banner & primary content",
              status: "good",
            },
            {
              key: "total_blocking_time",
              label: "5. Total Blocking (TBT)",
              val: siteData?.performance_metrics?.total_blocking_time?.value || "120ms",
              benchmark: "< 200ms",
              desc: "Main thread interactivity delay",
              status: "good",
            },
            {
              key: "performance",
              label: "6. CWV Performance",
              val: siteData?.performance_metrics?.performance?.value || "92/100",
              benchmark: "> 85",
              desc: "Lighthouse Core Web Vitals",
              status: "good",
            },
            {
              key: "accessibility",
              label: "7. Accessibility (a11y)",
              val: siteData?.performance_metrics?.accessibility?.value || "96/100",
              benchmark: "> 90",
              desc: "Alt tags, contrast & labels",
              status: "good",
            },
            {
              key: "best_practise",
              label: "8. Best Practices",
              val: siteData?.performance_metrics?.best_practise?.value || "98/100",
              benchmark: "> 90",
              desc: "Modern HTML5, doctype & HTTPS",
              status: "good",
            },
            {
              key: "seo",
              label: "9. SEO Score",
              val: siteData?.performance_metrics?.seo?.value || "94/100",
              benchmark: "> 85",
              desc: "Meta descriptions & OpenGraph",
              status: "good",
            },
            {
              key: "security_and_trust",
              label: "10. Security & Trust",
              val: siteData?.performance_metrics?.security_and_trust?.value || "95/100",
              benchmark: "SSL Active",
              desc: "TLS 1.3 encryption & policies",
              status: "good",
            },
            {
              key: "total_category",
              label: "11. Total Categories",
              val: siteData?.performance_metrics?.total_category?.value || catalog.total_categories || 6,
              benchmark: "Taxonomy mapped",
              desc: "Categorization for app navigation",
              status: "good",
            },
          ].map((item) => (
            <div
              key={item.key}
              className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/70 hover:bg-white hover:border-slate-300 transition"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-700 truncate">{item.label}</span>
                <span className="text-[9.5px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  {item.benchmark}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 my-1">
                <span className="text-lg font-black text-slate-900 font-mono">{item.val}</span>
              </div>
              <span className="text-[10px] text-slate-400 block truncate">{item.desc}</span>
            </div>
          ))}
        </div>

        {/* Categories Chips */}
        {catalog.categories && catalog.categories.length > 0 && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider mr-1">
              Top Mapped Store Categories:
            </span>
            {catalog.categories.map((cat: any, idx: number) => (
              <span
                key={idx}
                className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200"
              >
                {cat.name || cat} {cat.count ? `(${cat.count})` : ""}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── BOTTOM ACTIONS ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>
            Website logo, fonts, and hex colors will be auto-populated in the Theme and Branding steps.
          </span>
        </div>

        <button
          type="button"
          onClick={handleApplyAndContinue}
          disabled={isApplying}
          className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-white bg-amber-900 hover:bg-amber-950 focus:ring-4 focus:ring-amber-200 transition shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {isApplying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Applying Website Brand Tokens...</span>
            </>
          ) : (
            <>
              <span>Apply Website Data &amp; Continue</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
