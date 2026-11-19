"use client";

import React, { useState } from "react";
import {
  Palette,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Smartphone,
  Eye,
  Sparkles,
  Layers,
  Layout,
} from "lucide-react";

export interface ThemeItem {
  id: string;
  name: string;
  slug: string;
  category: "E-Commerce" | "Fashion & Boutique" | "Lifestyle & Sports" | "Luxury & Dark" | "Minimal & Organic";
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  navigationStyle: "Bottom Navigation" | "Drawer Menu" | "Floating Bar";
  headerStyle: "Standard" | "Centered Logo" | "Banner Hero";
  activeAppsCount: number;
  isPopular?: boolean;
  active: boolean;
}

const DEFAULT_THEMES: ThemeItem[] = [
  {
    id: "thm_1",
    name: "Modern Retail",
    slug: "modern-retail",
    category: "E-Commerce",
    primaryColor: "#4F46E5",
    secondaryColor: "#1E1B4B",
    accentColor: "#10B981",
    fontFamily: "Inter",
    navigationStyle: "Bottom Navigation",
    headerStyle: "Standard",
    activeAppsCount: 254,
    isPopular: true,
    active: true,
  },
  {
    id: "thm_2",
    name: "Luxury Boutique",
    slug: "luxury-boutique",
    category: "Fashion & Boutique",
    primaryColor: "#78593D",
    secondaryColor: "#4A3728",
    accentColor: "#C2A88F",
    fontFamily: "Playfair Display",
    navigationStyle: "Bottom Navigation",
    headerStyle: "Centered Logo",
    activeAppsCount: 164,
    isPopular: true,
    active: true,
  },
  {
    id: "thm_3",
    name: "Vibrant Lifestyle",
    slug: "vibrant-lifestyle",
    category: "Lifestyle & Sports",
    primaryColor: "#EC4899",
    secondaryColor: "#BE185D",
    accentColor: "#F59E0B",
    fontFamily: "Plus Jakarta Sans",
    navigationStyle: "Floating Bar",
    headerStyle: "Banner Hero",
    activeAppsCount: 74,
    active: true,
  },
  {
    id: "thm_4",
    name: "Elite Dark Luxe",
    slug: "elite-dark-luxe",
    category: "Luxury & Dark",
    primaryColor: "#0F172A",
    secondaryColor: "#1E293B",
    accentColor: "#6366F1",
    fontFamily: "Outfit",
    navigationStyle: "Bottom Navigation",
    headerStyle: "Standard",
    activeAppsCount: 37,
    active: true,
  },
  {
    id: "thm_5",
    name: "Organic Minimal",
    slug: "organic-minimal",
    category: "Minimal & Organic",
    primaryColor: "#059669",
    secondaryColor: "#065F46",
    accentColor: "#34D399",
    fontFamily: "Inter",
    navigationStyle: "Drawer Menu",
    headerStyle: "Standard",
    activeAppsCount: 12,
    active: true,
  },
];

export function AdminThemes() {
  const [themes, setThemes] = useState<ThemeItem[]>(DEFAULT_THEMES);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<ThemeItem | null>(null);
  const [deletingTheme, setDeletingTheme] = useState<ThemeItem | null>(null);

  // Form State for Create/Edit
  const [themeForm, setThemeForm] = useState({
    name: "",
    category: "E-Commerce" as ThemeItem["category"],
    primaryColor: "#4F46E5",
    secondaryColor: "#1E1B4B",
    accentColor: "#10B981",
    fontFamily: "Inter",
    navigationStyle: "Bottom Navigation" as ThemeItem["navigationStyle"],
    headerStyle: "Standard" as ThemeItem["headerStyle"],
    isPopular: false,
    active: true,
  });

  const toggleThemeActive = (id: string) => {
    setThemes(
      themes.map((t) => (t.id === id ? { ...t, active: !t.active } : t))
    );
  };

  const handleStartCreate = () => {
    setThemeForm({
      name: "",
      category: "E-Commerce",
      primaryColor: "#4F46E5",
      secondaryColor: "#1E1B4B",
      accentColor: "#10B981",
      fontFamily: "Inter",
      navigationStyle: "Bottom Navigation",
      headerStyle: "Standard",
      isPopular: false,
      active: true,
    });
    setIsCreateOpen(true);
  };

  const handleCreateTheme = () => {
    if (!themeForm.name.trim()) return;
    const newTheme: ThemeItem = {
      id: "thm_" + Date.now(),
      name: themeForm.name.trim(),
      slug: themeForm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      category: themeForm.category,
      primaryColor: themeForm.primaryColor,
      secondaryColor: themeForm.secondaryColor,
      accentColor: themeForm.accentColor,
      fontFamily: themeForm.fontFamily,
      navigationStyle: themeForm.navigationStyle,
      headerStyle: themeForm.headerStyle,
      activeAppsCount: 0,
      isPopular: themeForm.isPopular,
      active: themeForm.active,
    };
    setThemes([...themes, newTheme]);
    setIsCreateOpen(false);
  };

  const handleStartEdit = (t: ThemeItem) => {
    setEditingTheme(t);
    setThemeForm({
      name: t.name,
      category: t.category,
      primaryColor: t.primaryColor,
      secondaryColor: t.secondaryColor,
      accentColor: t.accentColor,
      fontFamily: t.fontFamily,
      navigationStyle: t.navigationStyle,
      headerStyle: t.headerStyle,
      isPopular: Boolean(t.isPopular),
      active: t.active,
    });
  };

  const handleSaveEdit = () => {
    if (!editingTheme || !themeForm.name.trim()) return;
    setThemes(
      themes.map((t) =>
        t.id === editingTheme.id
          ? {
              ...t,
              name: themeForm.name.trim(),
              slug: themeForm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              category: themeForm.category,
              primaryColor: themeForm.primaryColor,
              secondaryColor: themeForm.secondaryColor,
              accentColor: themeForm.accentColor,
              fontFamily: themeForm.fontFamily,
              navigationStyle: themeForm.navigationStyle,
              headerStyle: themeForm.headerStyle,
              isPopular: themeForm.isPopular,
              active: themeForm.active,
            }
          : t
      )
    );
    setEditingTheme(null);
  };

  const handleDeleteTheme = (id: string) => {
    setThemes(themes.filter((t) => t.id !== id));
    setDeletingTheme(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            Theme Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure mobile UI templates, color palettes, fonts, and navigation layouts.
          </p>
        </div>

        <button
          onClick={handleStartCreate}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-2xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Theme</span>
        </button>
      </div>

      {/* ── THEMES GRID (CARDS WITH DIRECT EDIT/DELETE) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {themes.map((theme) => (
          <div
            key={theme.id}
            className={`bg-white rounded-2xl border p-5 shadow-2xs flex flex-col justify-between space-y-4 transition ${
              theme.active ? "border-slate-200" : "border-slate-200 opacity-60 bg-slate-50/50"
            }`}
          >
            <div>
              {/* Header: Title + Popular Badge + Status Toggle */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-bold text-slate-900">
                      {theme.name}
                    </h3>
                    {theme.isPopular && (
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Popular
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    {theme.category}
                  </span>
                </div>

                <button
                  onClick={() => toggleThemeActive(theme.id)}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                    theme.active
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                  title={theme.active ? "Click to disable theme" : "Click to activate theme"}
                >
                  {theme.active ? "Active" : "Disabled"}
                </button>
              </div>

              {/* Color Palette Preview Bar */}
              <div className="mt-3.5 pt-3 border-t border-slate-100">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                  Color Palette
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono">
                    <span
                      className="w-4 h-4 rounded-md shadow-xs border border-black/10 flex-shrink-0"
                      style={{ backgroundColor: theme.primaryColor }}
                    />
                    <span className="text-[11px]">{theme.primaryColor}</span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono">
                    <span
                      className="w-4 h-4 rounded-md shadow-xs border border-black/10 flex-shrink-0"
                      style={{ backgroundColor: theme.secondaryColor }}
                    />
                    <span className="text-[11px]">{theme.secondaryColor}</span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono">
                    <span
                      className="w-4 h-4 rounded-md shadow-xs border border-black/10 flex-shrink-0"
                      style={{ backgroundColor: theme.accentColor }}
                    />
                    <span className="text-[11px]">{theme.accentColor}</span>
                  </div>
                </div>
              </div>

              {/* Layout Specifications */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold">Navigation</span>
                  <strong className="text-slate-800">{theme.navigationStyle}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold">Typography</span>
                  <strong className="text-slate-800">{theme.fontFamily}</strong>
                </div>
              </div>
            </div>

            {/* Footer: Apps count + Edit/Delete actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                <strong className="text-slate-900 font-bold">{theme.activeAppsCount}</strong> apps deployed
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleStartEdit(theme)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition border border-transparent hover:border-indigo-100 cursor-pointer"
                  title="Edit Theme"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeletingTheme(theme)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition border border-transparent hover:border-rose-100 cursor-pointer"
                  title="Delete Theme"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── CREATE THEME MODAL ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 flex flex-col max-h-[82vh] sm:max-h-[84vh] overflow-hidden my-auto animate-in zoom-in-95">
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
              <h3 className="font-bold text-sm text-slate-900">Create New Theme Template</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 text-xs flex-1">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Theme Name</label>
                <input
                  type="text"
                  placeholder="e.g. Nordic Minimalist"
                  value={themeForm.name}
                  onChange={(e) => setThemeForm({ ...themeForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Category</label>
                <select
                  value={themeForm.category}
                  onChange={(e) => setThemeForm({ ...themeForm, category: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                >
                  <option value="E-Commerce">E-Commerce Standard</option>
                  <option value="Fashion & Boutique">Fashion &amp; Boutique</option>
                  <option value="Lifestyle & Sports">Lifestyle &amp; Sports</option>
                  <option value="Luxury & Dark">Luxury &amp; Dark</option>
                  <option value="Minimal & Organic">Minimal &amp; Organic</option>
                </select>
              </div>

              {/* Color Pickers */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Primary Color</label>
                  <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg p-1">
                    <input
                      type="color"
                      value={themeForm.primaryColor}
                      onChange={(e) => setThemeForm({ ...themeForm, primaryColor: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={themeForm.primaryColor}
                      onChange={(e) => setThemeForm({ ...themeForm, primaryColor: e.target.value })}
                      className="w-full text-[11px] font-mono focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Secondary</label>
                  <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg p-1">
                    <input
                      type="color"
                      value={themeForm.secondaryColor}
                      onChange={(e) => setThemeForm({ ...themeForm, secondaryColor: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={themeForm.secondaryColor}
                      onChange={(e) => setThemeForm({ ...themeForm, secondaryColor: e.target.value })}
                      className="w-full text-[11px] font-mono focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Accent</label>
                  <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg p-1">
                    <input
                      type="color"
                      value={themeForm.accentColor}
                      onChange={(e) => setThemeForm({ ...themeForm, accentColor: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={themeForm.accentColor}
                      onChange={(e) => setThemeForm({ ...themeForm, accentColor: e.target.value })}
                      className="w-full text-[11px] font-mono focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Navigation Layout</label>
                  <select
                    value={themeForm.navigationStyle}
                    onChange={(e) => setThemeForm({ ...themeForm, navigationStyle: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                  >
                    <option value="Bottom Navigation">Bottom Navigation</option>
                    <option value="Drawer Menu">Side Drawer Menu</option>
                    <option value="Floating Bar">Floating Bottom Bar</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Typography</label>
                  <select
                    value={themeForm.fontFamily}
                    onChange={(e) => setThemeForm({ ...themeForm, fontFamily: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                  >
                    <option value="Inter">Inter (Sans-serif)</option>
                    <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                    <option value="Playfair Display">Playfair Display (Serif)</option>
                    <option value="Outfit">Outfit (Geometric)</option>
                    <option value="Poppins">Poppins</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="createPopular"
                  checked={themeForm.isPopular}
                  onChange={(e) => setThemeForm({ ...themeForm, isPopular: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="createPopular" className="font-semibold text-slate-700 cursor-pointer">
                  Tag as Featured / Popular Theme
                </label>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2 flex-shrink-0 bg-slate-50/90">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTheme}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer shadow-xs"
              >
                Create Theme
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT THEME MODAL ── */}
      {editingTheme && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 flex flex-col max-h-[82vh] sm:max-h-[84vh] overflow-hidden my-auto animate-in zoom-in-95">
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Edit Theme</h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  Slug: {editingTheme.slug}
                </span>
              </div>
              <button
                onClick={() => setEditingTheme(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 text-xs flex-1">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Theme Name</label>
                <input
                  type="text"
                  value={themeForm.name}
                  onChange={(e) => setThemeForm({ ...themeForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Category</label>
                <select
                  value={themeForm.category}
                  onChange={(e) => setThemeForm({ ...themeForm, category: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                >
                  <option value="E-Commerce">E-Commerce Standard</option>
                  <option value="Fashion & Boutique">Fashion &amp; Boutique</option>
                  <option value="Lifestyle & Sports">Lifestyle &amp; Sports</option>
                  <option value="Luxury & Dark">Luxury &amp; Dark</option>
                  <option value="Minimal & Organic">Minimal &amp; Organic</option>
                </select>
              </div>

              {/* Color Pickers */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Primary Color</label>
                  <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg p-1">
                    <input
                      type="color"
                      value={themeForm.primaryColor}
                      onChange={(e) => setThemeForm({ ...themeForm, primaryColor: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={themeForm.primaryColor}
                      onChange={(e) => setThemeForm({ ...themeForm, primaryColor: e.target.value })}
                      className="w-full text-[11px] font-mono focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Secondary</label>
                  <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg p-1">
                    <input
                      type="color"
                      value={themeForm.secondaryColor}
                      onChange={(e) => setThemeForm({ ...themeForm, secondaryColor: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={themeForm.secondaryColor}
                      onChange={(e) => setThemeForm({ ...themeForm, secondaryColor: e.target.value })}
                      className="w-full text-[11px] font-mono focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Accent</label>
                  <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg p-1">
                    <input
                      type="color"
                      value={themeForm.accentColor}
                      onChange={(e) => setThemeForm({ ...themeForm, accentColor: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={themeForm.accentColor}
                      onChange={(e) => setThemeForm({ ...themeForm, accentColor: e.target.value })}
                      className="w-full text-[11px] font-mono focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Navigation Layout</label>
                  <select
                    value={themeForm.navigationStyle}
                    onChange={(e) => setThemeForm({ ...themeForm, navigationStyle: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                  >
                    <option value="Bottom Navigation">Bottom Navigation</option>
                    <option value="Drawer Menu">Side Drawer Menu</option>
                    <option value="Floating Bar">Floating Bottom Bar</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Typography</label>
                  <select
                    value={themeForm.fontFamily}
                    onChange={(e) => setThemeForm({ ...themeForm, fontFamily: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                  >
                    <option value="Inter">Inter (Sans-serif)</option>
                    <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                    <option value="Playfair Display">Playfair Display (Serif)</option>
                    <option value="Outfit">Outfit (Geometric)</option>
                    <option value="Poppins">Poppins</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editPopular"
                    checked={themeForm.isPopular}
                    onChange={(e) => setThemeForm({ ...themeForm, isPopular: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <label htmlFor="editPopular" className="font-semibold text-slate-700 cursor-pointer">
                    Popular Tag
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => setThemeForm({ ...themeForm, active: !themeForm.active })}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                    themeForm.active
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-slate-100 text-slate-500 border border-slate-200"
                  }`}
                >
                  {themeForm.active ? "Status: Active" : "Status: Disabled"}
                </button>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2 flex-shrink-0 bg-slate-50/90">
              <button
                onClick={() => setEditingTheme(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE THEME CONFIRMATION MODAL ── */}
      {deletingTheme && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-bold text-sm text-slate-900">Delete Theme Template?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to delete <b className="text-slate-800">{deletingTheme.name}</b>? Apps currently using this theme will fallback to the default template.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDeletingTheme(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTheme(deletingTheme.id)}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 cursor-pointer shadow-xs"
              >
                Delete Theme
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
