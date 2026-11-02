"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Globe,
  Image as ImageIcon,
  Loader2,
  Palette,
  Sparkles,
  Type,
  Upload,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { getUserData, saveUserData } from "@/lib/user-data-store";

interface StepBrandingProps {
  ulid: string;
  app?: any;
  setupState?: any;
  onNext: () => void;
}

// 8 High-resolution, crisp SVG brand logo presets
const DUMMY_LOGOS = [
  {
    id: "eshop_bag",
    name: "E-Shop Pro",
    category: "Shopping",
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%234F46E5"/><stop offset="100%" stop-color="%237C3AED"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="url(%23g1)"/><path d="M32 38 L68 38 L64 74 L36 74 Z" fill="white" opacity="0.95"/><path d="M42 38 V30 C42 25 46 21 50 21 C54 21 58 25 58 30 V38" fill="none" stroke="white" stroke-width="5" stroke-linecap="round"/><circle cx="50" cy="54" r="5" fill="%234F46E5"/></svg>`,
  },
  {
    id: "fashion_chic",
    name: "Fashion Boutique",
    category: "Apparel",
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23EC4899"/><stop offset="100%" stop-color="%23F43F5E"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="url(%23g2)"/><path d="M50 24 C46 24 43 27 43 31 C43 35 48 37 50 40 L28 56 C25 58 27 62 31 62 L69 62 C73 62 75 58 72 56 Z" fill="white" opacity="0.95"/><line x1="30" y1="62" x2="70" y2="62" stroke="white" stroke-width="4" stroke-linecap="round"/></svg>`,
  },
  {
    id: "luxury_diamond",
    name: "Luxury Jewels",
    category: "Accessories",
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23F59E0B"/><stop offset="100%" stop-color="%23D97706"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="url(%23g3)"/><polygon points="50,22 76,42 50,78 24,42" fill="white" opacity="0.95"/><polyline points="24,42 50,48 76,42" fill="none" stroke="%23D97706" stroke-width="3"/><line x1="50" y1="22" x2="50" y2="78" stroke="%23D97706" stroke-width="3"/></svg>`,
  },
  {
    id: "organic_leaf",
    name: "Pure Organics",
    category: "Wellness",
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2310B981"/><stop offset="100%" stop-color="%23059669"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="url(%23g4)"/><path d="M30 70 C30 70 32 40 56 30 C76 22 74 48 70 56 C62 72 30 70 30 70 Z" fill="white" opacity="0.95"/><path d="M30 70 Q50 50 68 34" fill="none" stroke="%23059669" stroke-width="4" stroke-linecap="round"/></svg>`,
  },
  {
    id: "streetwear_flash",
    name: "Urban Flash",
    category: "Streetwear",
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g5" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23EF4444"/><stop offset="100%" stop-color="%23B91C1C"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="url(%23g5)"/><polygon points="56,18 32,50 48,50 44,82 68,50 52,50" fill="white" opacity="0.95"/></svg>`,
  },
  {
    id: "tech_cube",
    name: "Tech & Digital",
    category: "Electronics",
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g6" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2306B6D4"/><stop offset="100%" stop-color="%230284C7"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="url(%23g6)"/><polygon points="50,22 78,38 78,66 50,82 22,66 22,38" fill="white" opacity="0.95"/><line x1="50" y1="52" x2="50" y2="82" stroke="%230284C7" stroke-width="3"/><line x1="50" y1="52" x2="78" y2="38" stroke="%230284C7" stroke-width="3"/><line x1="50" y1="52" x2="22" y2="38" stroke="%230284C7" stroke-width="3"/></svg>`,
  },
  {
    id: "bakery_cafe",
    name: "Artisan Cafe",
    category: "Food & Drinks",
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g7" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23F97316"/><stop offset="100%" stop-color="%23EA580C"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="url(%23g7)"/><path d="M28 42 L72 42 C72 62 58 72 50 72 C42 72 28 62 28 42 Z" fill="white" opacity="0.95"/><path d="M72 46 C77 46 80 49 80 54 C80 59 76 62 72 62" fill="none" stroke="white" stroke-width="4" stroke-linecap="round"/><path d="M40 24 Q44 32 40 38" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"/><path d="M50 20 Q54 30 50 38" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"/><path d="M60 24 Q64 32 60 38" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"/></svg>`,
  },
  {
    id: "gift_store",
    name: "Celebration Gifts",
    category: "Lifestyle",
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g8" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%238B5CF6"/><stop offset="100%" stop-color="%236D28D9"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="url(%23g8)"/><rect x="26" y="44" width="48" height="34" rx="4" fill="white" opacity="0.95"/><rect x="22" y="34" width="56" height="10" rx="3" fill="white"/><rect x="46" y="34" width="8" height="44" fill="%236D28D9"/><path d="M38 34 C30 34 30 22 42 26 C48 28 50 34 50 34 C50 34 52 28 58 26 C70 22 70 34 62 34 Z" fill="white"/></svg>`,
  },
];

export function StepBranding({ ulid, app, setupState, onNext }: StepBrandingProps) {
  const storedUserData = typeof window !== "undefined" ? getUserData() : {};
  const initialName =
    app?.name ||
    setupState?.app?.name ||
    storedUserData.store_name ||
    "";

  const initialStoreUrl =
    app?.website_url ||
    app?.site_url ||
    setupState?.app?.website_url ||
    setupState?.app?.site_url ||
    storedUserData.website_url ||
    "";

  const [appName, setAppName] = useState<string>(initialName || "");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [logoMode, setLogoMode] = useState<"dummy" | "website" | "custom">("dummy");
  const [websiteLogo, setWebsiteLogo] = useState<string>("");
  const [storeUrl, setStoreUrl] = useState<string>(initialStoreUrl || "");
  const [primaryColor, setPrimaryColor] = useState<string>("#E91E63");
  const [secondaryColor, setSecondaryColor] = useState<string>("#222222");
  const [font, setFont] = useState<string>("Poppins");
  const [radius, setRadius] = useState<number>(12);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    apiClient(`/api/apps/${ulid}/config/draft`)
      .then((res) => {
        if (!isMounted) return;
        if (res.config) {
          if (res.config.app?.name && res.config.app.name !== "Glow Beauty") {
            setAppName(res.config.app.name);
          } else if (initialName) {
            setAppName(initialName);
          }
          if (res.config.app?.logo_url) {
            setLogoUrl(res.config.app.logo_url);
            setLogoMode("custom");
          } else if (res.config.theme?.logo_url) {
            setLogoUrl(res.config.theme.logo_url);
            setLogoMode("custom");
          }
          if (res.config.theme?.colors?.primary) setPrimaryColor(res.config.theme.colors.primary);
          if (res.config.theme?.colors?.secondary) setSecondaryColor(res.config.theme.colors.secondary);
          if (res.config.theme?.font) setFont(res.config.theme.font);
          if (res.config.theme?.radius !== undefined) setRadius(res.config.theme.radius);
        }
      })
      .catch(() => {});

    apiClient(`/api/apps/${ulid}/website-data`)
      .then((res) => {
        if (!isMounted || !res) return;
        if (res.store_name) {
          setAppName((prev: string) => (prev && prev !== "Glow Beauty" ? prev : res.store_name));
        }
        if (res.website_url) {
          setStoreUrl(res.website_url);
        }
        if (res.brand?.logo_url) {
          setWebsiteLogo(res.brand.logo_url);
          setLogoUrl((prev: string) => (prev && !prev.startsWith("data:image/svg+xml") ? prev : res.brand.logo_url));
          setLogoMode("website");
        }
        if (res.brand?.colors?.primary) {
          setPrimaryColor(res.brand.colors.primary);
        }
        if (res.brand?.colors?.secondary) {
          setSecondaryColor(res.brand.colors.secondary);
        }
        if (res.brand?.font_heading) {
          setFont(res.brand.font_heading);
        }
      })
      .catch(() => {
        // Fallback to preview-data or localStorage
        apiClient(`/api/apps/${ulid}/preview-data`)
          .then((res) => {
            if (!isMounted) return;
            if (res?.store_name) {
              setAppName((prev) => (prev && prev !== "Glow Beauty" ? prev : res.store_name));
            }
            if (res?.store_url) {
              setStoreUrl(res.store_url);
              const clean = res.store_url.replace(/\/+$/, "");
              setWebsiteLogo(`${clean}/favicon.ico`);
            }
            if (res?.website_logo) {
              setWebsiteLogo(res.website_logo);
              setLogoUrl((prev) => (prev && !prev.startsWith("data:image/svg+xml") ? prev : res.website_logo));
              setLogoMode("website");
            }
          })
          .catch(() => {});
      });

    return () => {
      isMounted = false;
    };
  }, [ulid]);

  // Fallback to website logo or first preset if nothing set
  useEffect(() => {
    if (!logoUrl) {
      if (websiteLogo) {
        setLogoUrl(websiteLogo);
        setLogoMode("website");
      } else if (DUMMY_LOGOS[0]) {
        setLogoUrl(DUMMY_LOGOS[0].svg);
        setLogoMode("dummy");
      }
    }
  }, [logoUrl, websiteLogo]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("Image size exceeds 2MB. Please choose a smaller logo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      if (dataUrl) {
        setLogoUrl(dataUrl);
        setLogoMode("custom");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyWebsiteLogo = () => {
    if (websiteLogo) {
      setLogoUrl(websiteLogo);
      setLogoMode("website");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);

    try {
      await apiClient(`/api/apps/${ulid}/config/draft`, {
        method: "PUT",
        body: JSON.stringify({
          app: {
            name: appName,
            logo_url: logoUrl,
            currency: "INR",
          },
          theme: {
            layout: "theme_a",
            logo_url: logoUrl,
            colors: {
              primary: primaryColor,
              secondary: secondaryColor,
              background: "#FFFFFF",
              surface: "#FAFAFA",
              text: "#111111",
            },
            radius,
            font,
            nav: "bottom",
          },
        }),
      });
      onNext();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update branding settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Brand Identity &amp; App Logo
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Choose a logo for your mobile application, or use the same logo as your website or select from our curated dummy logos.
        </p>
      </div>

      {/* Website Brand Synced Banner */}
      <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-700 flex-shrink-0" />
          <span className="text-slate-700">
            <strong>Website Brand Synced:</strong> Logo, typography ({font}), and brand color codes ({primaryColor}) automatically imported from your website.
          </span>
        </div>
        <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 self-start sm:self-auto">
          ✓ Synced from Website
        </span>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {errorMsg}
        </div>
      )}

      {/* ── LOGO SELECTION SECTION ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            Application Display Name
          </label>
          <input
            type="text"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="e.g. Website Development"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
          />
        </div>

        {/* ── LOGO CONTROLS ── */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Application Logo Selection
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Displayed in the mobile app header, splash launch screen, and app icon.
              </p>
            </div>

            {/* Mode Switcher Buttons */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setLogoMode("dummy")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  logoMode === "dummy"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sample Logos
              </button>
              <button
                type="button"
                onClick={() => setLogoMode("website")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  logoMode === "website"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Website Logo</span>
              </button>
              <button
                type="button"
                onClick={() => setLogoMode("custom")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  logoMode === "custom"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload / URL</span>
              </button>
            </div>
          </div>

          {/* ── MODE 1: DUMMY / PRE-MADE LOGOS ── */}
          {logoMode === "dummy" && (
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50/70 border border-slate-200">
              <span className="text-xs font-bold text-slate-700 block">
                Choose a professional dummy logo for your store:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {DUMMY_LOGOS.map((d) => {
                  const isSelected = logoUrl === d.svg;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setLogoUrl(d.svg)}
                      className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-2 relative ${
                        isSelected
                          ? "border-indigo-600 bg-white ring-2 ring-indigo-600/20 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                      <img
                        src={d.svg}
                        alt={d.name}
                        className="w-12 h-12 rounded-xl object-contain shadow-xs"
                      />
                      <div>
                        <span className="font-extrabold text-xs text-slate-900 block truncate max-w-[100px]">
                          {d.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block">{d.category}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── MODE 2: USE WEBSITE LOGO ── */}
          {logoMode === "website" && (
            <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 p-2 flex items-center justify-center shadow-xs flex-shrink-0">
                  {websiteLogo ? (
                    <img
                      src={websiteLogo}
                      alt="Website Logo"
                      className="w-10 h-10 object-contain rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DUMMY_LOGOS[0].svg;
                      }}
                    />
                  ) : (
                    <Globe className="w-7 h-7 text-indigo-600" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      Connected Store: {storeUrl || "https://testing.livaan.in"}
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Auto-detected
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Automatically pull and use the exact same logo / site icon from your WordPress store.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleApplyWebsiteLogo}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 flex-shrink-0"
              >
                <Check className="w-4 h-4" />
                <span>Apply Website Logo</span>
              </button>
            </div>
          )}

          {/* ── MODE 3: CUSTOM UPLOAD OR URL ── */}
          {logoMode === "custom" && (
            <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Upload File */}
                <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-white text-center hover:border-indigo-400 transition cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/svg+xml, image/webp"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Upload className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                  <span className="text-xs font-bold text-slate-900 block">
                    Upload Logo from Device
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    PNG, SVG, or WEBP (Square recommended, max 2MB)
                  </span>
                </div>

                {/* Paste Image URL */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Or Enter Image Web URL:
                  </label>
                  <input
                    type="url"
                    value={logoUrl.startsWith("data:") ? "" : logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://yourstore.com/logo.png"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                  <span className="text-[10px] text-slate-400 block">
                    Direct HTTPS link to your logo file.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── REAL-TIME LOGO PREVIEW BADGE ── */}
          {logoUrl && (
            <div className="mt-4 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-1.5 flex items-center justify-center shadow-xs flex-shrink-0">
                  <img
                    src={logoUrl}
                    alt="Active App Logo"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 block">
                    Active Selected Logo Preview
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {appName || "Website Development"}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Applied to App Header &bull; Splash Screen &bull; App Launcher Icon
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Ready
              </span>
            </div>
          )}
        </div>

        {/* ── PALETTE & TYPOGRAPHY ── */}
        <div className="pt-4 border-t border-slate-100 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Primary Brand Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Secondary Accent Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono uppercase"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Google Font Family
              </label>
              <select
                value={font}
                onChange={(e) => setFont(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:border-indigo-600 focus:outline-none"
              >
                <option value="Poppins">Poppins (Modern Clean)</option>
                <option value="Inter">Inter (Neutral Tech)</option>
                <option value="Outfit">Outfit (Geometric Luxury)</option>
                <option value="Roboto">Roboto (Google Material)</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Button &amp; Card Radius ({radius}px)
                </label>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-3"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full sm:w-auto justify-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-70"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Branding &amp; Logo...</span>
            </>
          ) : (
            <>
              <span>Save &amp; Continue to Preview</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
