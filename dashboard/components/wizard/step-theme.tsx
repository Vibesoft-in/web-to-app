"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  Lock,
  Palette,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface StepThemeProps {
  ulid: string;
  onNext: () => void;
}

interface SavedThemeInfo {
  name: string;
  slug: string;
  price?: string;
  badge?: string;
}

const THEME_META: Record<
  string,
  {
    marketName: string;
    marketSlug: string;
    badge: string;
    price: string;
    priceNum: number;
    priceFormatted: string;
    description: string;
    emoji: string;
    isFree: boolean;
  }
> = {
  theme_a: {
    marketName: "Minimal",
    marketSlug: "minimal",
    badge: "Official Free Theme",
    price: "Free (Given by Admin)",
    priceNum: 0,
    priceFormatted: "Free",
    description: "Clean, whitespace-focused minimalist store layout provided by platform admin",
    emoji: "🛍️",
    isFree: true,
  },
  theme_b: {
    marketName: "Modern",
    marketSlug: "modern",
    badge: "Modern Style",
    price: "₹999",
    priceNum: 999,
    priceFormatted: "₹999",
    description: "Editorial typography & storytelling showcase layout",
    emoji: "✨",
    isFree: false,
  },
  theme_c: {
    marketName: "Trendy",
    marketSlug: "trendy",
    badge: "Trendy Style",
    price: "₹1,499",
    priceNum: 1499,
    priceFormatted: "₹1,499",
    description: "High-contrast dynamic energetic boutique design",
    emoji: "⚡",
    isFree: false,
  },
  theme_d: {
    marketName: "Elite Dark Luxe",
    marketSlug: "elite",
    badge: "Premium Exclusive",
    price: "₹1,999",
    priceNum: 1999,
    priceFormatted: "₹1,999",
    description: "Ultra-premium obsidian dark mode with brushed amber-gold accents",
    emoji: "👑",
    isFree: false,
  },
};

export function StepTheme({ ulid, onNext }: StepThemeProps) {
  const [selectedKey, setSelectedKey] = useState("theme_a");
  const [isSaving, setIsSaving] = useState(false);
  const [themeNotice, setThemeNotice] = useState<string | null>(null);

  // Fetch themes with prices and admin lock policy
  const { data: themesResponse, isLoading } = useQuery({
    queryKey: ["themes", ulid],
    queryFn: async () => {
      try {
        const res = await apiClient(`/api/apps/${ulid}/themes`);
        return res;
      } catch {
        return {
          themes: [
            {
              key: "theme_a",
              name: "Modern Retail",
              price: 0,
              price_rupees: 0,
              price_formatted: "Free",
              is_free_theme: true,
              defaults: {
                colors: {
                  primary: "#E91E63",
                  secondary: "#222222",
                  background: "#FFFFFF",
                  surface: "#FAFAFA",
                  text: "#111111",
                },
                radius: 12,
                font: "Poppins",
              },
            },
            {
              key: "theme_b",
              name: "Luxury Boutique",
              price: 99900,
              price_rupees: 999,
              price_formatted: "₹999",
              is_free_theme: false,
              defaults: {
                colors: {
                  primary: "#0F172A",
                  secondary: "#C5A880",
                  background: "#F8FAFC",
                  surface: "#FFFFFF",
                  text: "#0F172A",
                },
                radius: 8,
                font: "Outfit",
              },
            },
            {
              key: "theme_c",
              name: "Vibrant Lifestyle",
              price: 149900,
              price_rupees: 1499,
              price_formatted: "₹1,499",
              is_free_theme: false,
              defaults: {
                colors: {
                  primary: "#4F46E5",
                  secondary: "#F59E0B",
                  background: "#FFFFFF",
                  surface: "#F3F4F6",
                  text: "#1F2937",
                },
                radius: 16,
                font: "Inter",
              },
            },
            {
              key: "theme_d",
              name: "Elite Dark Luxe",
              price: 199900,
              price_rupees: 1999,
              price_formatted: "₹1,999",
              is_free_theme: false,
              defaults: {
                colors: {
                  primary: "#D97706",
                  secondary: "#F59E0B",
                  background: "#0B0F19",
                  surface: "#111827",
                  text: "#F9FAFB",
                },
                radius: 14,
                font: "Cinzel",
              },
            },
          ],
          can_change_theme: true,
          assigned_theme_key: "theme_a",
          selected_theme_key: "theme_a",
          free_theme_key: "theme_a",
        };
      }
    },
  });

  const themes = themesResponse?.themes || [];
  const assignedKey = themesResponse?.assigned_theme_key || "theme_a";
  const initialSelectedKey =
    themesResponse?.selected_theme_key || assignedKey || "theme_a";

  // Initialize selected theme from server or localStorage
  useEffect(() => {
    try {
      const localThemeKey =
        localStorage.getItem(`appifyhub_selected_theme_key_${ulid}`) ||
        localStorage.getItem("appifyhub_selected_theme_key");
      if (localThemeKey && ["theme_a", "theme_b", "theme_c", "theme_d"].includes(localThemeKey)) {
        setSelectedKey(localThemeKey);
        return;
      }
    } catch {}

    if (initialSelectedKey) {
      setSelectedKey(initialSelectedKey);
    }
  }, [initialSelectedKey, ulid]);

  const handleCardClick = (themeKey: string) => {
    setSelectedKey(themeKey);
    const meta = THEME_META[themeKey];

    // Store in localStorage for instant synchronization across steps
    try {
      localStorage.setItem(`appifyhub_selected_theme_key_${ulid}`, themeKey);
      localStorage.setItem("appifyhub_selected_theme_key", themeKey);
      localStorage.setItem(
        `appifyhub_selected_theme_price_${ulid}`,
        String(meta?.priceNum || 0)
      );
      localStorage.setItem(
        `appifyhub_selected_theme_name_${ulid}`,
        meta?.marketName || "Theme"
      );
    } catch {}

    if (meta && !meta.isFree) {
      setThemeNotice(
        `✨ "${meta.marketName}" theme selected (${meta.price}). The theme price will be added to your total order summary in the Payment step.`
      );
    } else {
      setThemeNotice(null);
    }
  };

  const handleSelect = async () => {
    setIsSaving(true);
    const chosen = themes.find((t: any) => t.key === selectedKey) || themes[0];
    const meta = THEME_META[selectedKey];

    try {
      localStorage.setItem(`appifyhub_selected_theme_key_${ulid}`, selectedKey);
      localStorage.setItem("appifyhub_selected_theme_key", selectedKey);
      localStorage.setItem(
        `appifyhub_selected_theme_price_${ulid}`,
        String(meta?.priceNum || 0)
      );
      localStorage.setItem(
        `appifyhub_selected_theme_name_${ulid}`,
        meta?.marketName || "Theme"
      );
    } catch {}

    // 🚀 ADVANCE IMMEDIATELY!
    onNext();

    if (chosen) {
      apiClient(`/api/apps/${ulid}/config/draft`, {
        method: "PUT",
        body: JSON.stringify({
          theme: chosen.defaults,
          selected_theme_key: selectedKey,
        }),
      }).catch(() => {});
    }
  };

  const selectedMeta = THEME_META[selectedKey] || THEME_META.theme_a;

  return (
    <div className="space-y-6">
      {/* ── Title & Intro ────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Mobile App Theme &amp; Layout
          </h2>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Select your mobile app theme below. The official free theme is provided at ₹0, or you can choose and buy a premium theme layout that will be added to your order summary at checkout.
        </p>
      </div>

      {/* ── Official Free Theme & Pricing Notice Banner ───────────── */}
      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 flex items-start gap-3.5 shadow-xs">
        <div className="w-10 h-10 rounded-xl bg-amber-700 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-slate-900">
              Theme Assigned by Website Administrator
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
              Official Free Theme Active
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            The free mobile theme for this app (<strong>Minimal</strong>) is given directly by the <strong>Website Administrator</strong> at <strong>₹0 / Free</strong>. You can keep the free theme or choose any premium layout preset below. If you select a premium theme, its pricing will be added automatically to your total during the <strong>Payment step</strong>.
          </p>
        </div>
      </div>

      {/* ── Selected Paid Theme Toast Banner ────────────────────────── */}
      {themeNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in shadow-xs">
          <Sparkles className="w-4 h-4 text-emerald-700 flex-shrink-0" />
          <span>{themeNotice}</span>
        </div>
      )}

      {/* ── 4 Theme Cards Grid ──────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-72 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {themes.map((theme: any) => {
            const isAssigned = theme.key === assignedKey;
            const isSelected = selectedKey === theme.key;
            const colors = theme.defaults?.colors || {};
            const meta = THEME_META[theme.key] || {
              marketName: theme.name,
              marketSlug: theme.key,
              badge: "Theme Preset",
              price: theme.price_formatted || (theme.price > 0 ? `₹${theme.price / 100}` : "Free"),
              priceNum: theme.price_rupees || 0,
              priceFormatted: theme.price_formatted || "Free",
              description: "Optimized mobile layout",
              emoji: "📱",
              isFree: theme.price === 0,
            };

            return (
              <div
                key={theme.key}
                onClick={() => handleCardClick(theme.key)}
                className={`p-5 rounded-2xl border-2 transition-all flex flex-col justify-between relative cursor-pointer select-none group ${
                  isSelected
                    ? "border-amber-900 bg-amber-50/30 shadow-md ring-2 ring-amber-900/20"
                    : "border-slate-200 hover:border-amber-400 bg-white hover:shadow-sm"
                }`}
              >
                {/* Admin Assigned Badge */}
                {meta.isFree && (
                  <div className="absolute -top-3 left-4 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Given by Admin</span>
                  </div>
                )}

                {/* Paid Theme Price Badge */}
                {!meta.isFree && (
                  <div className="absolute -top-3 right-4 bg-amber-900 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                    <span>{meta.price}</span>
                  </div>
                )}

                <div>
                  {/* Top Bar with Emoji & Price */}
                  <div className="flex items-start justify-between mb-3 mt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{meta.emoji}</span>
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 block">
                          {meta.badge}
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs font-black text-slate-900">
                            {meta.price}
                          </span>
                          {!meta.isFree && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              (One-time)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Radio/Check selector */}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition ${
                        isSelected
                          ? "bg-amber-900 text-white shadow-xs"
                          : "border-2 border-slate-300 group-hover:border-amber-600 text-transparent"
                      }`}
                    >
                      {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : "○"}
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base mb-0.5">
                    {meta.marketName}
                  </h3>
                  <span className="text-xs font-semibold text-slate-400 block mb-2">
                    Style: {theme.name}
                  </span>
                  <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                    {meta.description}
                  </p>

                  <p className="text-xs text-slate-500 mb-4">
                    Font:{" "}
                    <strong className="text-slate-700">
                      {theme.defaults?.font || "Poppins"}
                    </strong>{" "}
                    • Radius: {theme.defaults?.radius || 12}px
                  </p>

                  {/* Color Swatch Previews */}
                  <div className="flex items-center gap-2 mb-4">
                    <div
                      className="w-7 h-7 rounded-full shadow-inner border border-black/10"
                      style={{ backgroundColor: colors.primary || "#E91E63" }}
                      title="Primary"
                    />
                    <div
                      className="w-7 h-7 rounded-full shadow-inner border border-black/10"
                      style={{ backgroundColor: colors.secondary || "#222222" }}
                      title="Secondary"
                    />
                    <div
                      className="w-7 h-7 rounded-full shadow-inner border border-black/10"
                      style={{ backgroundColor: colors.surface || "#FAFAFA" }}
                      title="Surface"
                    />
                  </div>
                </div>

                {/* Bottom Card Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  {meta.isFree ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Admin Free Theme</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/80">
                      <span>Price: {meta.price}</span>
                    </span>
                  )}

                  <span
                    className={`font-bold ${
                      isSelected
                        ? "text-amber-900"
                        : "text-slate-500 group-hover:text-amber-900"
                    }`}
                  >
                    {isSelected
                      ? meta.isFree
                        ? "Active (Free)"
                        : "Selected (Buy)"
                      : "Click to Select"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

            {/* ── Continue Action Button ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200 mt-6">
        <div className="text-xs text-slate-500">
          Selected Theme: <strong className="text-slate-800">{selectedMeta.marketName} ({selectedMeta.priceFormatted})</strong>
        </div>

        <button
          type="button"
          onClick={handleSelect}
          disabled={isSaving}
          className="w-full sm:w-auto justify-center px-7 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-70 cursor-pointer active:scale-98"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Theme...</span>
            </>
          ) : (
            <>
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
