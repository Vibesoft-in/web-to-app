"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { detectStoreNicheFromData } from "@/lib/niche-detector";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  Image as ImageIcon,
  Loader2,
  Palette,
  RotateCcw,
  Smartphone,
  Sparkles,
  Type,
  Upload,
  Link as LinkIcon,
  Check,
  AlertCircle,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { PhoneFrame } from "@/components/preview/phone-frame";

interface StepPreviewProps {
  ulid: string;
  onNext: () => void;
}

const DEFAULT_THEME_COLORS: Record<string, string> = {
  primary: "#046BD2",
  secondary: "#045CB4",
  accent: "#1E293B",
  background: "#FFFFFF",
  surface: "#F0F5FA",
  text: "#1F2937",
};

const COLOR_FIELDS = [
  { label: "Primary Brand Accent", key: "primary", default: "#046BD2", desc: "Buttons, tabs, active highlights & prices" },
  { label: "Secondary Brand Color", key: "secondary", default: "#045CB4", desc: "Hero banners, gradient overlays & badges" },
  { label: "Accent / Headings", key: "accent", default: "#1E293B", desc: "Product titles, bold headers & section names" },
  { label: "Card & Surface Background", key: "surface", default: "#F0F5FA", desc: "Product cards, headers & drawer backgrounds" },
  { label: "App Canvas Background", key: "background", default: "#FFFFFF", desc: "Main screen background color" },
  { label: "Body Text Color", key: "text", default: "#1F2937", desc: "Standard body text and descriptions" },
];

const NICHE_PRESETS_MAP: Record<string, Array<{
  id: string;
  name: string;
  badge: string;
  title: string;
  button_text: string;
  image: string;
}>> = {
  lighting: [
    {
      id: "h7_halogen",
      name: "Ultra White Headlights",
      badge: "Super Bright 55W",
      title: "Ultra White High-Beam Headlights",
      button_text: "Shop Headlamps →",
      image: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "h3_halogen",
      name: "All-Weather Fog Lamps",
      badge: "Fog & Auxiliary",
      title: "All-Weather High-Output Fog Bulbs",
      button_text: "Upgrade Vision →",
      image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "auto_fuses",
      name: "Blade & Mini Fuses",
      badge: "Electrical Protection",
      title: "Maxi & Mini Blade Fuse Packs",
      button_text: "Shop Fuses →",
      image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "capless",
      name: "LED Marker Bulbs",
      badge: "OEM Indicator",
      title: "Interior Dashboard & Marker Lights",
      button_text: "Find Bulbs →",
      image: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "night_fighter",
      name: "Night Fighter 6000K",
      badge: "Max Lumens",
      title: "Ultra-Bright Night Fighter Halogen",
      button_text: "See Clearly →",
      image: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "clearance",
      name: "Lighting Clearance",
      badge: "Special Deals",
      title: "Up to 35% Off Lighting & Fuses",
      button_text: "Claim Deals →",
      image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
    },
  ],
  electronics: [
    {
      id: "wireless_audio",
      name: "Wireless ANC Audio",
      badge: "Hi-Res Audio",
      title: "Next-Gen Wireless Headphones & Buds",
      button_text: "Shop Audio →",
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "smartwatches",
      name: "Smart Wearables",
      badge: "Fitness & Health",
      title: "AMOLED Waterproof Smartwatches",
      button_text: "Explore Watches →",
      image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "fast_chargers",
      name: "GaN Fast Chargers",
      badge: "Fast Charge 65W",
      title: "Ultra-Compact Multi-Port Adapters",
      button_text: "Get Powered →",
      image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "gaming_gear",
      name: "Pro Gaming Gear",
      badge: "Ultra Low Latency",
      title: "RGB Mechanical Keyboards & Mice",
      button_text: "Level Up →",
      image: "https://images.unsplash.com/photo-1612287233214-74cf4716fcbe?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "smart_home",
      name: "Smart Home Hubs",
      badge: "IoT Connected",
      title: "Voice-Enabled Smart Home Automation",
      button_text: "Automate Home →",
      image: "https://images.unsplash.com/photo-1558089687-f282ffcbc126?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "tech_sale",
      name: "Gadget Clearance",
      badge: "Up to 40% Off",
      title: "Limited-Time Tech Super Sale",
      button_text: "Shop Deals →",
      image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80",
    },
  ],
  fashion: [
    {
      id: "summer_fashion",
      name: "Summer Fashion",
      badge: "New Arrivals",
      title: "Summer Collection 2026",
      button_text: "Shop Collection →",
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "streetwear",
      name: "Streetwear Drops",
      badge: "Trending Drop",
      title: "Urban Sneakers & Graphic Tees",
      button_text: "Get First Access →",
      image: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "luxury_watches",
      name: "Luxury Watches",
      badge: "Limited Edition",
      title: "Timeless Minimalist Essentials",
      button_text: "Discover Now →",
      image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "athleisure",
      name: "Athletic Activewear",
      badge: "Breathable Fit",
      title: "High-Performance Gym & Running Gear",
      button_text: "Shop Active →",
      image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "denim",
      name: "Vintage Denim",
      badge: "Classic Fit",
      title: "Tailored Jackets & Distressed Jeans",
      button_text: "Shop Denim →",
      image: "https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "mega_sale",
      name: "Mega Sale 50%",
      badge: "Flash Deal 50% Off",
      title: "Biggest Clearance Sale of Season",
      button_text: "Claim Discounts →",
      image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=800&q=80",
    },
  ],
  jewelry: [
    {
      id: "solitaire_rings",
      name: "Solitaire Diamond Rings",
      badge: "Certified Stones",
      title: "Timeless Solitaire & Engagement Rings",
      button_text: "Discover Rings →",
      image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "gold_necklaces",
      name: "Handcrafted Gold Sets",
      badge: "Pure 22K Gold",
      title: "Royal Traditional Gold Necklaces",
      button_text: "Shop Collection →",
      image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "luxury_watches",
      name: "Chronograph Watches",
      badge: "Limited Edition",
      title: "Precision Swiss Made Timepieces",
      button_text: "View Timepieces →",
      image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "silver_bracelets",
      name: "Sterling Silver 925",
      badge: "Modern Chic",
      title: "Minimalist Sterling Silver Bangles",
      button_text: "Shop Silver →",
      image: "https://images.unsplash.com/photo-1611591475871-33234d8a5712?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "pearl_sets",
      name: "South Sea Pearls",
      badge: "Hand-Selected",
      title: "Natural Lustrous Pearl Chokers",
      button_text: "Explore Pearls →",
      image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "festive_offer",
      name: "Festive Jewelry Gift",
      badge: "Free Gift Box",
      title: "Exclusive Festive Jewelry Collection",
      button_text: "Shop Gifts →",
      image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80",
    },
  ],
  beauty: [
    {
      id: "skincare_serum",
      name: "Glow Vitamin C Serum",
      badge: "Radiance Boost",
      title: "Active Botanical Glow Elixir",
      button_text: "Explore Skincare →",
      image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "matte_lipstick",
      name: "Velvet Lip Color",
      badge: "Long-Wear 16H",
      title: "Ultra-Pigmented Matte Lipstick Set",
      button_text: "Find Your Shade →",
      image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "organic_cream",
      name: "Deep Hydration Cream",
      badge: "100% Organic",
      title: "Ceramide Nourishing Night Cream",
      button_text: "Shop Moisturizer →",
      image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "hair_oils",
      name: "Ayurvedic Hair Oils",
      badge: "Root Strengthen",
      title: "Rosemary & Cold-Pressed Hair Care",
      button_text: "Repair Hair →",
      image: "https://images.unsplash.com/photo-1608248597359-338b25129668?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "fragrance",
      name: "Artisan Perfumes",
      badge: "Eau De Parfum",
      title: "Signature French Lavender Fragrance",
      button_text: "Smell Divine →",
      image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "beauty_clearance",
      name: "Clean Beauty Sale",
      badge: "Special Bundle",
      title: "Buy 2 Get 1 Free on All Beauty",
      button_text: "Claim Free Gift →",
      image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80",
    },
  ],
  home: [
    {
      id: "nordic_decor",
      name: "Nordic Minimal Living",
      badge: "Cozy Space",
      title: "Modern Scandinavian Living Interiors",
      button_text: "Explore Living →",
      image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "ceramic_pottery",
      name: "Artisan Ceramics",
      badge: "Handmade",
      title: "Handcrafted Terracotta & Ceramic Vases",
      button_text: "Shop Decor →",
      image: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "solid_wood",
      name: "Oak & Teak Furniture",
      badge: "100% Solid Wood",
      title: "Ergonomic Wooden Dining & Coffee Tables",
      button_text: "View Tables →",
      image: "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "ambient_lighting",
      name: "Warm Floor Lamps",
      badge: "Mood Lighting",
      title: "Contemporary Brass & Bamboo Lamps",
      button_text: "Brighten Up →",
      image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "linen_bedding",
      name: "Pure Washed Linen",
      badge: "Breathable Comfort",
      title: "Hotel Quality Linen Bedding Sets",
      button_text: "Shop Bedding →",
      image: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "home_clearance",
      name: "Furniture Clearance",
      badge: "Flat 30% Off",
      title: "Upgrade Your Home for Less",
      button_text: "Shop Room Sets →",
      image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80",
    },
  ],
  grocery: [
    {
      id: "organic_farm",
      name: "Farm-Fresh Harvest",
      badge: "100% Organic",
      title: "Locally Sourced Organic Fruit & Veggies",
      button_text: "Shop Fresh →",
      image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "specialty_coffee",
      name: "Single Origin Coffee",
      badge: "Freshly Roasted",
      title: "Artisanal Arabica Whole Bean Coffee",
      button_text: "Brew Better →",
      image: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "gourmet_spices",
      name: "Exotic Whole Spices",
      badge: "Aromatic & Pure",
      title: "Authentic Traditional Spice Blends",
      button_text: "Add Flavor →",
      image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "dry_fruits",
      name: "Superfood Dry Fruits",
      badge: "California Almonds",
      title: "Premium Walnuts, Cashews & Berries",
      button_text: "Shop Healthy →",
      image: "https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "cold_pressed",
      name: "Cold-Pressed Virgin Oils",
      badge: "Unrefined & Pure",
      title: "Extra Virgin Olive & Mustard Oils",
      button_text: "Shop Pure Oils →",
      image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "grocery_bundle",
      name: "Monthly Pantry Box",
      badge: "Save 20%",
      title: "Complete Monthly Kitchen Grocery Kit",
      button_text: "Order Bundle →",
      image: "https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?auto=format&fit=crop&w=800&q=80",
    },
  ],
};

const NICHE_TABS = [
  { key: "lighting", label: "Lighting & Electrical", icon: "💡" },
  { key: "electronics", label: "Electronics & Tech", icon: "⚡" },
  { key: "fashion", label: "Fashion & Apparel", icon: "👗" },
  { key: "jewelry", label: "Jewelry & Luxury", icon: "💍" },
  { key: "beauty", label: "Beauty & Skincare", icon: "🌿" },
  { key: "home", label: "Home & Decor", icon: "🛋️" },
  { key: "grocery", label: "Grocery & Foods", icon: "🛒" },
];

export function StepPreview({ ulid, onNext }: StepPreviewProps) {
  const [mobileTab, setMobileTab] = useState<"phone" | "controls">("phone");
  const [config, setConfig] = useState<any>({
    schema_version: 1,
    app: { name: "shop", currency: "INR" },
    theme: {
      layout: "theme_a",
      colors: {
        primary: "#046BD2",
        secondary: "#045CB4",
        accent: "#1E293B",
        background: "#FFFFFF",
        surface: "#F0F5FA",
        text: "#1F2937",
      },
      radius: 12,
      font: "Poppins",
      nav: "bottom",
    },
    features: {
      wishlist: true,
      otp_login: true,
      google_login: true,
      notifications: true,
      reviews: false,
    },
    home: [
      {
        type: "banner",
        items: [
          {
            image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
            link: "category:all",
            title: "Exclusive Online Collection",
            badge: "Featured Store Deal",
            button_text: "Shop Now →",
          },
        ],
      },
      { type: "categories" },
      { type: "product_rail", title: "Trending Products", source: "recent" },
    ],
    links: { privacy: "https://webintoapp.com/privacy", terms: "https://webintoapp.com/terms" },
  });

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasLoadedDraft = useRef(false);

  // Hero Banner editing state
  const bannerSectionRef = useRef<HTMLDivElement | null>(null);
  const bannerFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [bannerUploadError, setBannerUploadError] = useState<string | null>(null);
  const [bannerHighlight, setBannerHighlight] = useState(false);
  const [localBannerPreview, setLocalBannerPreview] = useState<string | null>(null);
  const [bannerUrlInput, setBannerUrlInput] = useState("");
  const [showAdvancedBannerText, setShowAdvancedBannerText] = useState(false);
  const [originalWebsiteColors, setOriginalWebsiteColors] = useState<Record<string, string> | null>(null);

  // Fetch real preview products from store connector
  const { data: previewData } = useQuery({
    queryKey: ["preview-data", ulid],
    queryFn: async () => {
      try {
        return await apiClient(`/api/apps/${ulid}/preview-data`);
      } catch {
        return { products: [], categories: [] };
      }
    },
  });

  // Fetch existing draft config on mount (ONCE ONLY - prevents overwriting live changes)
  useEffect(() => {
    // Read original extracted website colors if available
    try {
      const rawExtracted = localStorage.getItem(`app_draft_${ulid}_extracted_colors`);
      if (rawExtracted) {
        setOriginalWebsiteColors(JSON.parse(rawExtracted));
      }
    } catch {}

    if (hasLoadedDraft.current) return;
    let isMounted = true;
    apiClient(`/api/apps/${ulid}/config/draft`)
      .then((res) => {
        if (isMounted && res.config && !hasLoadedDraft.current) {
          hasLoadedDraft.current = true;

          let savedLocalColors: Record<string, string> = {};
          try {
            const raw = localStorage.getItem(`app_draft_${ulid}_colors`);
            if (raw) savedLocalColors = JSON.parse(raw);
          } catch {}

          let savedLocalBanner: string | null = null;
          try {
            savedLocalBanner = localStorage.getItem(`app_banner_${ulid}`);
          } catch {}

          setConfig((prev: any) => {
            let preservedHome =
              Array.isArray(res.config.home) && res.config.home.length > 0
                ? [...res.config.home]
                : prev.home;

            // If a custom banner was uploaded or saved locally, prioritize it over generic placeholders (ignore stale bulb URLs)
            if (
              savedLocalBanner &&
              !savedLocalBanner.includes("photo-1441986300917") &&
              !savedLocalBanner.includes("placeholders/banner") &&
              !savedLocalBanner.includes("Formula-Rally") &&
              !savedLocalBanner.includes("lighting.rishabhtyagi.in")
            ) {
              const bannerIdx = preservedHome?.findIndex((s: any) => s.type === "banner");
              if (bannerIdx >= 0 && preservedHome[bannerIdx]?.items?.[0]) {
                const currentImg = preservedHome[bannerIdx].items[0].image;
                if (!currentImg || currentImg.includes("photo-1441986300917") || currentImg.includes("placeholders/banner") || currentImg.includes("Formula-Rally") || currentImg.includes("lighting.rishabhtyagi.in")) {
                  preservedHome[bannerIdx] = {
                    ...preservedHome[bannerIdx],
                    items: [
                      {
                        ...preservedHome[bannerIdx].items[0],
                        image: savedLocalBanner,
                      },
                    ],
                  };
                }
              }
            }

            const finalName =
              res.config.app?.name ||
              previewData?.store_name ||
              prev.app?.name ||
              "My Mobile Store";

            return {
              ...prev,
              ...res.config,
              home: preservedHome,
              theme: {
                ...prev.theme,
                ...(res.config.theme || {}),
                colors: {
                  ...DEFAULT_THEME_COLORS,
                  ...(savedLocalColors || {}),
                  ...(prev.theme?.colors || {}),
                  ...(res.config.theme?.colors || {}),
                },
              },
              app: {
                ...prev.app,
                ...(res.config.app || {}),
                name: finalName,
              },
            };
          });
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [ulid, previewData?.store_name]);

  // Handle debounced updates to draft config (immediate state update for 0ms lag + 400ms debounce save)
  const updateConfigDebounced = (newConfig: any) => {
    setConfig(newConfig);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        await apiClient(`/api/apps/${ulid}/config/draft`, {
          method: "PUT",
          body: JSON.stringify(newConfig),
        });
      } catch (err) {
        console.error("Failed to autosave draft", err);
      }
    }, 400);
  };

  // Color changes
  const handleSpecificColorChange = (key: string, value: string) => {
    setConfig((prev: any) => {
      const updatedColors = {
        ...prev.theme?.colors,
        [key]: value,
      };
      const updated = {
        ...prev,
        theme: {
          ...prev.theme,
          colors: updatedColors,
        },
      };

      try {
        localStorage.setItem(`app_draft_${ulid}_colors`, JSON.stringify(updatedColors));
      } catch {}

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(async () => {
        try {
          await apiClient(`/api/apps/${ulid}/config/draft`, {
            method: "PUT",
            body: JSON.stringify(updated),
          });
        } catch (err) {
          console.error("Failed to autosave draft", err);
        }
      }, 400);

      return updated;
    });
  };

  const handleColorReset = (key: string) => {
    const fallback =
      originalWebsiteColors?.[key] || DEFAULT_THEME_COLORS[key] || "#046BD2";
    handleSpecificColorChange(key, fallback);
  };

  const handleResetToWebsiteColors = () => {
    const websiteColors = {
      ...DEFAULT_THEME_COLORS,
      ...(originalWebsiteColors || {}),
    };

    setConfig((prev: any) => {
      const updated = {
        ...prev,
        theme: {
          ...prev.theme,
          colors: websiteColors,
        },
      };

      try {
        localStorage.setItem(`app_draft_${ulid}_colors`, JSON.stringify(websiteColors));
      } catch {}

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(async () => {
        try {
          await apiClient(`/api/apps/${ulid}/config/draft`, {
            method: "PUT",
            body: JSON.stringify(updated),
          });
        } catch (err) {
          console.error("Failed to autosave draft", err);
        }
      }, 400);

      return updated;
    });
  };

  const handleFontChange = (fontName: string) => {
    setConfig((prev: any) => {
      const updated = {
        ...prev,
        theme: {
          ...prev.theme,
          font: fontName,
        },
      };

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(async () => {
        try {
          await apiClient(`/api/apps/${ulid}/config/draft`, {
            method: "PUT",
            body: JSON.stringify(updated),
          });
        } catch (err) {
          console.error("Failed to autosave draft", err);
        }
      }, 400);

      return updated;
    });
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Instant local preview
    const tempUrl = URL.createObjectURL(file);
    const updated = {
      ...config,
      app: {
        ...config.app,
        logo_url: tempUrl,
      },
      theme: {
        ...config.theme,
        logo_url: tempUrl,
      },
    };
    updateConfigDebounced(updated);

    // Read base64 fallback in parallel
    const reader = new FileReader();
    const readBase64Promise = new Promise<string>((resolve) => {
      reader.onload = (ev) => resolve((ev.target?.result as string) || "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "logo");

      let finalUrl = "";
      const res = await fetch(`/api/apps/${ulid}/upload-asset`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) finalUrl = data.url;
      } else {
        const directRes = await fetch(`http://127.0.0.1:8000/api/apps/${ulid}/upload-asset`, {
          method: "POST",
          body: formData,
        });
        if (directRes.ok) {
          const directData = await directRes.json();
          if (directData.url) finalUrl = directData.url;
        }
      }

      if (!finalUrl) {
        finalUrl = await readBase64Promise;
      }

      if (finalUrl) {
        const persisted = {
          ...config,
          app: {
            ...config.app,
            logo_url: finalUrl,
          },
          theme: {
            ...config.theme,
            logo_url: finalUrl,
          },
        };
        updateConfigDebounced(persisted);
      }
    } catch (err) {
      console.warn("Icon upload failed, fallback to base64", err);
      const base64 = await readBase64Promise;
      if (base64) {
        const persisted = {
          ...config,
          app: {
            ...config.app,
            logo_url: base64,
          },
          theme: {
            ...config.theme,
            logo_url: base64,
          },
        };
        updateConfigDebounced(persisted);
      }
    }
  };

  // ─── HERO BANNER EDITING & NICHE ADAPTATION LOGIC ───
  const [selectedNicheKey, setSelectedNicheKey] = useState<string>("auto");
  const storeDisplayName = previewData?.store_name || config?.app?.name || "Exclusive";

  const clientDetectedNiche = useMemo(() => {
    return detectStoreNicheFromData(
      previewData?.categories,
      previewData?.products,
      storeDisplayName,
      previewData?.store_url
    );
  }, [previewData?.categories, previewData?.products, storeDisplayName, previewData?.store_url]);

  const detectedNiche = useMemo(() => {
    if (previewData?.niche && previewData.niche.key && previewData.niche.key !== "lighting") {
      return previewData.niche;
    }
    if (clientDetectedNiche && clientDetectedNiche.key !== "lighting") {
      return clientDetectedNiche;
    }
    return previewData?.niche || clientDetectedNiche;
  }, [previewData?.niche, clientDetectedNiche]);

  const detectedNicheKey = detectedNiche?.key || "fashion";
  const activeNicheKey = selectedNicheKey === "auto" ? detectedNicheKey : selectedNicheKey;
  const activePresets =
    activeNicheKey === detectedNicheKey && Array.isArray(detectedNiche?.presets) && detectedNiche.presets.length > 0
      ? detectedNiche.presets
      : (NICHE_PRESETS_MAP[activeNicheKey] || NICHE_PRESETS_MAP.fashion);

  const homeBannerSection = Array.isArray(config.home)
    ? config.home.find((s: any) => s.type === "banner")
    : null;
  const bannerItem = homeBannerSection?.items?.[0] || {};

  const sanitizeImageUrl = (url?: string | null) => {
    if (!url) return "";
    if (url.includes("/storage/app_assets/")) {
      return url.substring(url.indexOf("/storage/app_assets/"));
    }
    return url;
  };

  const rawBannerImage =
    localBannerPreview ||
    (bannerItem.image &&
    !bannerItem.image.includes("photo-1441986300917") &&
    !bannerItem.image.includes("placeholders/banner1") &&
    !(bannerItem.image.includes("Formula-Rally") && detectedNicheKey !== "lighting") &&
    !(bannerItem.image.includes("lighting.rishabhtyagi.in") && detectedNicheKey !== "lighting")
      ? bannerItem.image
      : detectedNiche?.hero_image ||
        previewData?.banner_image ||
        config.app?.banner_url ||
        config.theme?.banner_url ||
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80");

  const activeBannerImage = sanitizeImageUrl(rawBannerImage);

  const activeBannerTitle =
    bannerItem.title && bannerItem.title !== "Exclusive Online Collection" && !(bannerItem.title.includes("High-Performance Lighting") && detectedNicheKey !== "lighting")
      ? bannerItem.title
      : detectedNiche?.hero_title || `${storeDisplayName} Collection`;

  const activeBannerBadge =
    bannerItem.badge && bannerItem.badge !== "Featured Store Deal" && !(bannerItem.badge.includes("SUPER BRIGHT") && detectedNicheKey !== "lighting")
      ? bannerItem.badge
      : detectedNiche?.hero_badge || "NEW ARRIVALS 2026";

  const activeBannerButton =
    bannerItem.button_text && bannerItem.button_text !== "Shop Now →" && !(bannerItem.button_text.includes("Shop Halogen & LED") && detectedNicheKey !== "lighting")
      ? bannerItem.button_text
      : detectedNiche?.hero_button || "Shop Collection →";

  // Automatically calibrate initial banner to detected store niche when loaded
  const hasSyncedNicheBanner = useRef(false);
  useEffect(() => {
    if (!hasLoadedDraft.current || !detectedNiche || hasSyncedNicheBanner.current) return;

    const currentBannerItem = Array.isArray(config?.home)
      ? config.home.find((s: any) => s.type === "banner")?.items?.[0]
      : null;

    const isStaleBulbBanner =
      detectedNiche.key !== "lighting" &&
      (currentBannerItem?.image?.includes("Formula-Rally") ||
       currentBannerItem?.image?.includes("lighting.rishabhtyagi.in") ||
       currentBannerItem?.title?.includes("High-Performance Lighting"));

    const isPlaceholderImage =
      !currentBannerItem?.image ||
      currentBannerItem.image.includes("photo-1441986300917") ||
      currentBannerItem.image.includes("placeholders/banner") ||
      isStaleBulbBanner;

    let hasLocalCustomBanner = false;
    try {
      const saved = localStorage.getItem(`app_banner_${ulid}`);
      if (
        saved &&
        !saved.includes("photo-1441986300917") &&
        !saved.includes("placeholders/banner") &&
        !(saved.includes("Formula-Rally") && detectedNiche.key !== "lighting") &&
        !(saved.includes("lighting.rishabhtyagi.in") && detectedNiche.key !== "lighting")
      ) {
        hasLocalCustomBanner = true;
      }
    } catch {}

    // Only apply default niche image if user has NO custom banner set anywhere (or if stuck on bulb banner)
    if ((isPlaceholderImage || isStaleBulbBanner) && (!hasLocalCustomBanner || isStaleBulbBanner) && detectedNiche.hero_image) {
      hasSyncedNicheBanner.current = true;
      updateBanner({
        image: detectedNiche.hero_image,
        title: detectedNiche.hero_title,
        badge: detectedNiche.hero_badge,
        button_text: detectedNiche.hero_button,
      });
    } else {
      hasSyncedNicheBanner.current = true;
    }
  }, [hasLoadedDraft.current, detectedNiche, config?.home, ulid]);

  const updateBanner = (updates: {
    image?: string;
    title?: string;
    badge?: string;
    button_text?: string;
  }) => {
    if (updates.image) {
      try {
        localStorage.setItem(`app_banner_${ulid}`, updates.image);
      } catch {}
    }
    setConfig((prev: any) => {
      const currentHome = Array.isArray(prev.home) ? [...prev.home] : [];
      const bannerIndex = currentHome.findIndex((s: any) => s.type === "banner");

      const existingItem =
        bannerIndex >= 0 ? currentHome[bannerIndex].items?.[0] || {} : {};
      const newItem = {
        ...existingItem,
        link: existingItem.link || "category:all",
        image: updates.image !== undefined ? updates.image : (existingItem.image || activeBannerImage),
        title: updates.title !== undefined ? updates.title : (existingItem.title || activeBannerTitle),
        badge: updates.badge !== undefined ? updates.badge : (existingItem.badge || activeBannerBadge),
        button_text: updates.button_text !== undefined ? updates.button_text : (existingItem.button_text || activeBannerButton),
      };

      if (bannerIndex >= 0) {
        currentHome[bannerIndex] = {
          ...currentHome[bannerIndex],
          items: [newItem],
        };
      } else {
        currentHome.unshift({
          type: "banner",
          items: [newItem],
        });
      }

      const updated = {
        ...prev,
        home: currentHome,
        app: {
          ...prev.app,
          banner_url: newItem.image,
        },
      };

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(async () => {
        try {
          await apiClient(`/api/apps/${ulid}/config/draft`, {
            method: "PUT",
            body: JSON.stringify(updated),
          });
        } catch (err) {
          console.error("Failed to autosave draft banner", err);
        }
      }, 400);

      return updated;
    });
  };

  const handleBannerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBannerUploadError(null);
    setIsUploadingBanner(true);

    // Immediate 0ms local preview
    const tempUrl = URL.createObjectURL(file);
    setLocalBannerPreview(tempUrl);

    // Read base64 in parallel for offline/fallback resilience
    const reader = new FileReader();
    const readBase64Promise = new Promise<string>((resolve) => {
      reader.onload = (ev) => resolve((ev.target?.result as string) || "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "banner");

      let finalUrl = "";
      // 1. Send to relative Next.js proxy route with session cookies
      try {
        const res = await fetch(`/api/apps/${ulid}/upload-asset`, {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.url) finalUrl = data.url;
        }
      } catch (err) {
        console.warn("Proxy upload failed, attempting direct:", err);
      }

      // 2. Direct backend fallback
      if (!finalUrl) {
        try {
          const directRes = await fetch(`http://127.0.0.1:8000/api/apps/${ulid}/upload-asset`, {
            method: "POST",
            body: formData,
          });
          if (directRes.ok) {
            const directData = await directRes.json();
            if (directData.url) finalUrl = directData.url;
          }
        } catch (err) {
          console.warn("Direct upload failed:", err);
        }
      }

      // 3. Fallback to base64 Data URL if needed
      if (!finalUrl) {
        finalUrl = await readBase64Promise;
      }

      if (finalUrl) {
        try {
          localStorage.setItem(`app_banner_${ulid}`, finalUrl);
        } catch {}
        updateBanner({ image: finalUrl });
        setLocalBannerPreview(null);
        setBannerUploadError(null);
      }
    } catch (err: any) {
      console.warn("Banner upload error, falling back to base64 data URL:", err);
      const base64 = await readBase64Promise;
      if (base64) {
        updateBanner({ image: base64 });
        setLocalBannerPreview(null);
        setBannerUploadError(null);
      } else {
        setLocalBannerPreview(null);
        setBannerUploadError(err.message || "Failed to upload banner.");
      }
    } finally {
      setIsUploadingBanner(false);
      if (bannerFileInputRef.current) {
        bannerFileInputRef.current.value = "";
      }
    }
  };

  const handleEditBannerFromPhone = () => {
    if (mobileTab !== "controls") {
      setMobileTab("controls");
    }
    setTimeout(() => {
      if (bannerSectionRef.current) {
        bannerSectionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        setBannerHighlight(true);
        setTimeout(() => setBannerHighlight(false), 2000);
      }
    }, 60);
  };

  const handlePublish = async () => {
    if (isUploadingBanner) {
      alert("Please wait a moment for the banner image to finish uploading.");
      return;
    }

    setIsPublishing(true);
    try {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Sanitize any transient blob URLs if present
      let configToSave = { ...config };
      if (configToSave.home && Array.isArray(configToSave.home)) {
        configToSave.home = configToSave.home.map((sec: any) => {
          if (sec.type === "banner" && Array.isArray(sec.items)) {
            return {
              ...sec,
              items: sec.items.map((it: any) => {
                if (it.image && it.image.startsWith("blob:")) {
                  const safeImg =
                    activeBannerImage && !activeBannerImage.startsWith("blob:")
                      ? activeBannerImage
                      : detectedNiche?.hero_image ||
                        previewData?.banner_image ||
                        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80";
                  return { ...it, image: safeImg };
                }
                return it;
              }),
            };
          }
          return sec;
        });
      }

      // 1. Immediately persist current state to draft
      await apiClient(`/api/apps/${ulid}/config/draft`, {
        method: "PUT",
        body: JSON.stringify(configToSave),
      });

      // 2. Publish snapshot
      await apiClient(`/api/apps/${ulid}/config/publish`, {
        method: "POST",
      });
      setPublishSuccess(true);
      setTimeout(() => {
        onNext();
      }, 700);
    } catch (err: any) {
      console.error("Publish configuration failed:", err);
      const detailMsg = err.errors
        ? Object.entries(err.errors)
            .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(", ")}`)
            .join("\n")
        : (err.message || "Failed to publish config.");
      alert(`Configuration publishing failed:\n${detailMsg}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const currentColors = {
    ...DEFAULT_THEME_COLORS,
    ...(config.theme?.colors || {}),
  };

  return (
    <div className="space-y-6">
      {/* Top Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Interactive Phone Preview
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Real products rendered dynamically from your store. Changes autosave with 400ms debounce.
          </p>
        </div>

        <button
          onClick={handlePublish}
          disabled={isPublishing || publishSuccess}
          className="w-full sm:w-auto justify-center px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-md shadow-emerald-600/20 disabled:opacity-70 cursor-pointer"
        >
          {isPublishing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Publishing Snapshot...</span>
            </>
          ) : publishSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Published!</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Publish Configuration</span>
            </>
          )}
        </button>
      </div>

      {/* Mobile Tab Switcher (Visible on Phones & Tablets) */}
      <div className="lg:hidden flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold w-full">
        <button
          type="button"
          onClick={() => setMobileTab("phone")}
          className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === "phone"
              ? "bg-white text-indigo-700 shadow-sm font-bold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Interactive Phone</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("controls")}
          className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === "controls"
              ? "bg-white text-indigo-700 shadow-sm font-bold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Theme Controls</span>
        </button>
      </div>

      {/* Two-Column Layout: Left Controls Scroll With Page + Right Emulator Stays Fixed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Real-time Live Controls (Left column: scrolls naturally with page) */}
        <div
          className={`lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6 ${
            mobileTab === "controls" ? "block" : "hidden lg:block"
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Eye className="w-4 h-4 text-amber-700" />
              <span>Live Theme Quick Controls</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>Synced with Store</span>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════════════
              1. HERO BANNER IMAGE & PROMOTION CONTROLS
             ═════════════════════════════════════════════════════════════════════════ */}
          <div
            ref={bannerSectionRef}
            className={`rounded-2xl p-4 sm:p-5 border transition-all duration-300 ${
              bannerHighlight
                ? "bg-indigo-50/70 border-indigo-400 ring-4 ring-indigo-200 shadow-lg"
                : "bg-slate-50/70 border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    HERO BANNER IMAGE
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Primary promotional banner on your app home screen
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setLocalBannerPreview(null);
                  try {
                    localStorage.removeItem(`app_banner_${ulid}`);
                  } catch {}
                  updateBanner({
                    image:
                      detectedNiche?.hero_image ||
                      previewData?.banner_image ||
                      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80",
                    title: detectedNiche?.hero_title || `${storeDisplayName} Collection`,
                    badge: detectedNiche?.hero_badge || "NEW ARRIVALS 2026",
                    button_text: detectedNiche?.hero_button || "Shop Collection →",
                  });
                }}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 hover:bg-white px-2 py-1 rounded-lg border border-transparent hover:border-slate-200 transition cursor-pointer"
                title="Reset banner to store niche default"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Banner Live Thumbnail Card */}
            <div className="relative w-full h-36 sm:h-40 rounded-xl overflow-hidden border border-slate-200 shadow-sm group bg-slate-900 mb-3.5">
              <img
                src={activeBannerImage}
                alt="Banner Preview"
                onError={(e) => {
                  const target = e.currentTarget;
                  const fallback =
                    detectedNiche?.hero_image ||
                    previewData?.banner_image ||
                    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80";
                  if (target.src !== fallback) {
                    target.src = fallback;
                  }
                }}
                className="w-full h-full object-cover transition duration-300 group-hover:scale-102"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex flex-col justify-end p-3.5 text-white">
                <span
                  className="text-[9.5px] uppercase font-bold tracking-wider px-2 py-0.5 rounded backdrop-blur-md shadow-xs self-start mb-1"
                  style={{
                    backgroundColor: currentColors.secondary || "#045CB4",
                    color: "#FFFFFF",
                  }}
                >
                  {activeBannerBadge}
                </span>
                <h4 className="font-extrabold text-sm text-white drop-shadow truncate">
                  {activeBannerTitle}
                </h4>
                <span className="text-[10px] text-white/90 underline font-semibold mt-0.5">
                  {activeBannerButton}
                </span>
              </div>

              {isUploadingBanner && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                  <span className="text-xs font-semibold">Uploading Banner Image...</span>
                </div>
              )}

              <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-black/60 backdrop-blur-md text-white rounded-md text-[10px] font-semibold border border-white/20">
                Live on Emulator
              </div>
            </div>

            {bannerUploadError && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                <span>{bannerUploadError}</span>
              </div>
            )}

            {/* Upload Button & URL Input */}
            <input
              ref={bannerFileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/jpg"
              onChange={handleBannerFileUpload}
              className="hidden"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3.5">
              <button
                type="button"
                onClick={() => bannerFileInputRef.current?.click()}
                disabled={isUploadingBanner}
                className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Custom Image</span>
              </button>

              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 shadow-2xs">
                <LinkIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <input
                  type="url"
                  placeholder="Paste Image URL (https://...)..."
                  value={bannerUrlInput}
                  onChange={(e) => {
                    setBannerUrlInput(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && bannerUrlInput.trim()) {
                      e.preventDefault();
                      const val = bannerUrlInput.trim();
                      if (val.startsWith("http://") || val.startsWith("https://") || val.startsWith("data:")) {
                        setLocalBannerPreview(null);
                        updateBanner({ image: val });
                        setBannerUploadError(null);
                      } else {
                        setBannerUploadError("Please enter a valid secure image URL (https://...)");
                      }
                    }
                  }}
                  className="w-full text-xs text-slate-800 bg-transparent outline-none placeholder:text-slate-400"
                />
                {bannerUrlInput && (
                  <button
                    type="button"
                    onClick={() => {
                      const val = bannerUrlInput.trim();
                      if (val.startsWith("http://") || val.startsWith("https://") || val.startsWith("data:")) {
                        setLocalBannerPreview(null);
                        updateBanner({ image: val });
                        setBannerUploadError(null);
                      } else {
                        setBannerUploadError("Please enter a valid secure image URL (https://...)");
                      }
                    }}
                    className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold hover:bg-indigo-100 cursor-pointer"
                  >
                    Apply
                  </button>
                )}
              </div>
            </div>


            {/* Banner Promotional Text Customization (Collapsible) */}
            <div className="pt-2.5 mt-2 border-t border-slate-200/60">
              <button
                type="button"
                onClick={() => setShowAdvancedBannerText(!showAdvancedBannerText)}
                className="w-full flex items-center justify-between text-[11px] font-bold text-slate-700 hover:text-slate-900 py-1 cursor-pointer"
              >
                <span>Customize Banner Headline &amp; Promotion Badge</span>
                {showAdvancedBannerText ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>

              {showAdvancedBannerText && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Promotional Badge
                    </label>
                    <input
                      type="text"
                      value={activeBannerBadge}
                      onChange={(e) => updateBanner({ badge: e.target.value })}
                      placeholder="e.g. 50% OFF"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Banner Headline
                    </label>
                    <input
                      type="text"
                      value={activeBannerTitle}
                      onChange={(e) => updateBanner({ title: e.target.value })}
                      placeholder="e.g. Summer Collection"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Button Label
                    </label>
                    <input
                      type="text"
                      value={activeBannerButton}
                      onChange={(e) => updateBanner({ button_text: e.target.value })}
                      placeholder="e.g. Shop Now →"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════════════
              2. THEME COLORS (EXTRACTED FROM WEBSITE & FULLY CUSTOMIZABLE)
             ═════════════════════════════════════════════════════════════════════════ */}
          <div className="space-y-3.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  THEME COLOR PALETTE
                </label>
                <p className="text-[11px] text-slate-500">
                  Extracted from your website. Click any color or hex to change live.
                </p>
              </div>

              <button
                type="button"
                onClick={handleResetToWebsiteColors}
                className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition flex items-center gap-1 cursor-pointer"
                title="Reset all colors back to website branding"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Website Colors</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {COLOR_FIELDS.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:shadow-xs transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="color"
                      value={currentColors[item.key] || item.default}
                      onChange={(e) => handleSpecificColorChange(item.key, e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-800 block truncate">
                        {item.label}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {item.desc}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    <input
                      type="text"
                      value={currentColors[item.key] || item.default}
                      onChange={(e) => handleSpecificColorChange(item.key, e.target.value)}
                      className="w-20 px-2 py-1 font-mono text-[11px] font-bold text-slate-700 uppercase bg-white border border-slate-200 rounded-lg text-center focus:border-indigo-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      title="Reset this color"
                      onClick={() => handleColorReset(item.key)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════════════
              3. APP DISPLAY NAME
             ═════════════════════════════════════════════════════════════════════════ */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              APP DISPLAY NAME
            </label>
            <input
              type="text"
              value={config.app?.name || ""}
              onChange={(e) =>
                updateConfigDebounced({
                  ...config,
                  app: { ...config.app, name: e.target.value },
                })
              }
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-600 focus:outline-none text-slate-900 bg-white"
            />
          </div>

          {/* ═════════════════════════════════════════════════════════════════════════
              4. CORNER RADIUS
             ═════════════════════════════════════════════════════════════════════════ */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                CORNER RADIUS
              </label>
              <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-700 border border-slate-200">
                {config.theme?.radius !== undefined ? config.theme.radius : 12}px
              </span>
            </div>
            <div className="space-y-1.5">
              <input
                type="range"
                min="0"
                max="24"
                value={config.theme?.radius !== undefined ? config.theme.radius : 12}
                onChange={(e) =>
                  updateConfigDebounced({
                    ...config,
                    theme: { ...config.theme, radius: parseInt(e.target.value, 10) },
                  })
                }
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                <span>0px (Sharp)</span>
                <span>12px (Smooth)</span>
                <span>24px (Rounded)</span>
              </div>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════════════
              5. APP ICON & SPLASH
             ═════════════════════════════════════════════════════════════════════════ */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              APP ICON &amp; LOGO
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleIconUpload}
              className="hidden"
            />

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-xs flex-shrink-0 overflow-hidden">
                  {config?.app?.logo_url || config?.theme?.logo_url ? (
                    <img
                      src={config.app?.logo_url || config.theme?.logo_url}
                      alt="Logo"
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <Upload className="w-5 h-5 text-slate-500" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Custom App Icon / Logo</h4>
                  <span className="text-[11px] text-slate-400 font-medium">PNG or JPEG, 512×512</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-bold text-xs text-slate-700 shadow-xs transition cursor-pointer"
              >
                Upload Icon
              </button>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════════════
              6. APP TYPOGRAPHY
             ═════════════════════════════════════════════════════════════════════════ */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                APP TYPOGRAPHY
              </label>
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                {config.theme?.font || "Poppins"}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { name: "Poppins", label: "Poppins", font: "'Poppins', sans-serif" },
                { name: "Plus Jakarta Sans", label: "Plus Jakarta", font: "'Plus Jakarta Sans', sans-serif" },
                { name: "Inter", label: "Inter", font: "'Inter', sans-serif" },
                { name: "Roboto", label: "Roboto", font: "'Roboto', sans-serif" },
              ].map((f) => (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => handleFontChange(f.name)}
                  style={{ fontFamily: f.font }}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition text-center cursor-pointer active:scale-95 ${
                    (config.theme?.font || "Poppins") === f.name
                      ? "border-indigo-600 bg-indigo-50/80 text-indigo-700 shadow-xs ring-1 ring-indigo-500 font-bold"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════════════
              7. IN-APP CAPABILITIES
             ═════════════════════════════════════════════════════════════════════════ */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              IN-APP CAPABILITIES
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { label: "Product Wishlist", key: "wishlist" },
                { label: "Push Notifications", key: "notifications" },
                { label: "Customer Reviews", key: "reviews" },
                { label: "Fast Guest Checkout", key: "otp_login" },
              ].map((feat) => {
                const isEnabled = config.features?.[feat.key] ?? true;
                return (
                  <button
                    key={feat.key}
                    type="button"
                    onClick={() =>
                      updateConfigDebounced({
                        ...config,
                        features: {
                          ...config.features,
                          [feat.key]: !isEnabled,
                        },
                      })
                    }
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      isEnabled
                        ? "border-emerald-300 bg-emerald-50/50 text-emerald-800"
                        : "border-slate-200 bg-slate-50/60 text-slate-500"
                    }`}
                  >
                    <span>{feat.label}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        isEnabled
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {isEnabled ? "ON" : "OFF"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Store Connection Info */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <p className="font-semibold text-slate-800 mb-0.5">Live Store Data Connected:</p>
            <p className="text-[11px] leading-relaxed">
              Displaying {previewData?.products?.length || 0} real catalog products synced directly from WooCommerce via REST v3 connector.
            </p>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════════
            INTERACTIVE MOBILE PHONE FRAME WRAPPER (Right column: sticky at top: 24px)
           ═════════════════════════════════════════════════════════════════════════ */}
        <div
          className={`lg:col-span-5 flex flex-col items-center justify-center lg:sticky lg:top-6 z-20 self-start w-full ${
            mobileTab === "phone" ? "flex" : "hidden lg:flex"
          }`}
          style={{ top: "24px" }}
        >
          <PhoneFrame
            config={config}
            products={previewData?.products}
            categories={previewData?.categories}
            logoUrl={config?.app?.logo_url || config?.theme?.logo_url || previewData?.website_logo}
            bannerUrl={activeBannerImage}
            niche={previewData?.niche}
            onEditBanner={handleEditBannerFromPhone}
          />
        </div>
      </div>

      {/* ── BOTTOM ACTION BAR WITH NEXT BUTTON ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200 mt-8">
        <div className="text-xs text-slate-500">
          Mobile app layout and products previewed. Ready to configure push notifications and integrations.
        </div>

        <button
          type="button"
          onClick={handlePublish}
          disabled={isPublishing || publishSuccess}
          className="w-full sm:w-auto justify-center px-7 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-70 cursor-pointer active:scale-98"
        >
          {isPublishing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Publishing &amp; Proceeding...</span>
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
