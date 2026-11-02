"use client";

/**
 * Centralized Store for User & App Configuration Across Pages
 * Ensures the website never asks a single thing multiple times.
 * Data entered on any page (Home, Pricing, Register, Setup) is automatically
 * synced and fetched on all subsequent pages.
 */

export interface UserStoreData {
  website_url?: string;
  platform?: "woo" | "shopify" | "woocommerce" | "wordpress";
  store_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  plan?: string;
  plan_id?: string | number;
  plan_name?: string;
  plan_price?: string;
  theme?: string;
  theme_id?: string | number;
  theme_name?: string;
  addons?: number[];
}

const STORAGE_KEY = "appifyhub_user_store_data";

export function saveUserData(data: Partial<UserStoreData>): void {
  if (typeof window === "undefined") return;

  try {
    const existing = getUserData();
    const merged: UserStoreData = { ...existing };

    // Clean and normalize URLs
    if (data.website_url !== undefined) {
      let cleanUrl = data.website_url.trim();
      if (cleanUrl && !cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
        cleanUrl = `https://${cleanUrl}`;
      }
      merged.website_url = cleanUrl;
      localStorage.setItem("appifyhub_temp_store_url", cleanUrl);
      localStorage.setItem("appifyhub_website_url", cleanUrl);
    }

    if (data.platform !== undefined) {
      merged.platform = data.platform;
    }

    if (data.store_name !== undefined) {
      merged.store_name = data.store_name.trim();
    }

    if (data.name !== undefined) {
      merged.name = data.name.trim();
    }

    if (data.email !== undefined) {
      merged.email = data.email.trim();
    }

    if (data.phone !== undefined) {
      merged.phone = data.phone.trim();
    }

    if (data.plan !== undefined) {
      merged.plan = data.plan;
      localStorage.setItem("appifyhub_selected_plan", data.plan);
    }

    if (data.plan_id !== undefined) {
      merged.plan_id = data.plan_id;
      localStorage.setItem("appifyhub_selected_plan_id", String(data.plan_id));
    }

    if (data.plan_name !== undefined) {
      merged.plan_name = data.plan_name;
    }

    if (data.plan_price !== undefined) {
      merged.plan_price = data.plan_price;
    }

    if (data.theme !== undefined) {
      merged.theme = data.theme;
    }

    if (data.theme_name !== undefined) {
      merged.theme_name = data.theme_name;
    }

    if (data.addons !== undefined) {
      merged.addons = data.addons;
    }

    // Keep legacy pending_app in sync only when user actually provided a website URL
    if (merged.website_url) {
      const normalizedPlatform =
        merged.platform === "shopify" ? "shopify" : "woo";
      localStorage.setItem(
        "appifyhub_pending_app",
        JSON.stringify({
          name: merged.store_name || "",
          url: merged.website_url || "",
          platform: normalizedPlatform,
        })
      );
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (err) {
    console.warn("Failed to save user store data:", err);
  }
}

export function getUserData(): UserStoreData {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data: UserStoreData = raw ? JSON.parse(raw) : {};

    if (!data.plan) {
      data.plan = localStorage.getItem("appifyhub_selected_plan") || undefined;
    }

    if (!data.plan_id) {
      const pid = localStorage.getItem("appifyhub_selected_plan_id");
      if (pid) data.plan_id = pid;
    }

    return data;
  } catch {
    return {};
  }
}

export function clearUserData(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("appifyhub_pending_app");
    localStorage.removeItem("appifyhub_temp_store_url");
    localStorage.removeItem("appifyhub_website_url");
    localStorage.removeItem("appifyhub_selected_plan");
    localStorage.removeItem("appifyhub_selected_plan_id");
    localStorage.removeItem("appifyhub_selected_plan_info");
    localStorage.removeItem("appifyhub_selected_theme");
  } catch {}
}
