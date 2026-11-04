"use client";

import { useMemo, useState } from "react";
import { detectStoreNicheFromData } from "@/lib/niche-detector";
import {
  Heart,
  Home,
  Search,
  ShoppingBag,
  User,
  Wifi,
  Battery,
  Sparkles,
  Check,
  Plus,
  Minus,
  Trash2,
  Package,
  Bell,
  MapPin,
  Settings,
  ArrowRight,
  X,
  ChevronRight,
  Star,
} from "lucide-react";

interface PhoneFrameProps {
  config: any;
  products?: any[];
  categories?: any[];
  logoUrl?: string;
  bannerUrl?: string;
  niche?: any;
  onEditBanner?: () => void;
}

export function PhoneFrame({
  config,
  products = [],
  categories = [],
  logoUrl,
  bannerUrl,
  niche,
  onEditBanner,
}: PhoneFrameProps) {
  const [activeTab, setActiveTab] = useState<"home" | "categories" | "cart" | "profile">("home");
  const [wishlist, setWishlist] = useState<Set<number | string>>(new Set());
  const [cartItems, setCartItems] = useState<
    Array<{ id: any; title: string; price: number; qty: number; image?: string }>
  >([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const theme = config?.theme || {};
  const colors = {
    primary: "#046BD2",
    secondary: "#045CB4",
    accent: "#1E293B",
    background: "#FFFFFF",
    surface: "#FAFAFA",
    text: "#1F2937",
    ...(theme.colors || {}),
  };
  const radius = theme.radius !== undefined ? `${theme.radius}px` : "12px";
  const buttonRadius = theme.radius !== undefined ? `${Math.min(theme.radius, 14)}px` : "8px";
  const appName = config?.app?.name || "My Mobile Store";
  const autoNiche = useMemo(() => {
    if (niche && niche.key && niche.hero_title && !niche.hero_title.includes("High-Performance Lighting")) {
      return niche;
    }
    const detected = detectStoreNicheFromData(categories, products, appName);
    return niche && niche.key === detected.key ? { ...detected, ...niche } : detected;
  }, [niche, categories, products, appName]);
  const font = theme.font || "Poppins";
  const fontFamilies: Record<string, string> = {
    "Poppins": "'Poppins', sans-serif",
    "Plus Jakarta Sans": "'Plus Jakarta Sans', sans-serif",
    "Inter": "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    "Roboto": "'Roboto', sans-serif",
  };
  const activeFontFamily = fontFamilies[font] || (font ? `'${font}', sans-serif` : "'Poppins', sans-serif");
  const features = config?.features || {
    wishlist: true,
    notifications: true,
    reviews: false,
    otp_login: true,
  };
  const currency = config?.app?.currency || "INR";
  const currencySymbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2000);
  };

  const toggleWishlist = (id: number | string, title: string) => {
    setWishlist((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        showToast(`Removed from Wishlist`);
      } else {
        next.add(id);
        showToast(`Saved to Wishlist!`);
      }
      return next;
    });
  };

  const addToCart = (prod: any) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === prod.id);
      if (existing) {
        return prev.map((item) =>
          item.id === prod.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      const img = prod.images?.[0]?.src || prod.images?.[0] || prod.image || null;
      return [
        ...prev,
        {
          id: prod.id,
          title: prod.title || prod.name || "Product",
          price: Number(prod.price) || 49,
          qty: 1,
          image: typeof img === "string" ? img : img?.src,
        },
      ];
    });
    showToast(`Added to Cart!`);
  };

  const updateCartQty = (id: any, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as any
    );
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.qty, 0);
  const cartSubtotal = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);

  const homeSections = useMemo(() => {
    if (Array.isArray(config?.home) && config.home.length > 0) {
      return config.home;
    }
    return [
      {
        type: "banner",
        items: [{ image: bannerUrl || "", link: "category:all" }],
      },
      { type: "categories" },
      { type: "product_rail", title: "All Products", source: "recent" },
    ];
  }, [config?.home, bannerUrl]);

  const fallbackBanner = bannerUrl || products[0]?.images?.[0] || null;

  const rawProducts =
    products.length > 0
      ? products
      : [
          {
            id: 101,
            title: "Summer Floral Dress",
            price: 89,
            images: [
              "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=400&q=80",
            ],
          },
          {
            id: 102,
            title: "Classic Denim Jacket",
            price: 120,
            images: [
              "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=400&q=80",
            ],
          },
          {
            id: 103,
            title: "Minimalist Leather Watch",
            price: 145,
            images: [
              "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=400&q=80",
            ],
          },
          {
            id: 104,
            title: "Everyday Canvas Sneakers",
            price: 65,
            images: [
              "https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=400&q=80",
            ],
          },
        ];

  const filteredProducts = useMemo(() => {
    let list = rawProducts;
    if (searchQuery.trim()) {
      list = list.filter((p: any) =>
        (p.title || p.name || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return list;
  }, [rawProducts, searchQuery]);

  const defaultCategories = [
    { id: 1, name: "Clothing", count: 24 },
    { id: 2, name: "Accessories", count: 18 },
    { id: 3, name: "Footwear", count: 12 },
    { id: 4, name: "Beauty", count: 9 },
  ];
  const cats = categories.length > 0 ? categories : defaultCategories;

  return (
    <div className="relative mx-auto w-[280px] sm:w-[295px] md:w-[305px] lg:w-[315px] h-[610px] sm:h-[640px] md:h-[665px] lg:h-[685px] max-h-[calc(100vh-36px)] bg-slate-950 rounded-[40px] sm:rounded-[44px] p-2.5 shadow-2xl border-[3px] border-slate-800 ring-1 ring-slate-900/50 flex flex-col select-none flex-shrink-0 transition-all duration-300">
      {/* Speaker / Dynamic Island */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-full z-30 flex items-center justify-center shadow-inner">
        <div className="w-1.5 h-1.5 rounded-full bg-slate-900 mr-1.5" />
        <div className="w-7 h-0.5 bg-slate-800 rounded-full" />
      </div>

      {/* Screen container */}
      <div
        className="w-full h-full rounded-[32px] sm:rounded-[36px] overflow-hidden flex flex-col relative text-xs transition-colors duration-150 [&_*]:!font-[family-name:inherit]"
        style={{
          backgroundColor: colors.background || "#FFFFFF",
          color: colors.text || "#111111",
          fontFamily: activeFontFamily,
        }}
      >
        {/* Status Bar */}
        <div className="h-6 pt-0.5 px-4 flex items-center justify-between z-20 text-[9px] font-medium text-slate-500">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3 h-3" />
            <Battery className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* In-App Header */}
        <div
          className="px-3.5 py-2 border-b flex items-center justify-between z-10"
          style={{
            borderColor: "rgba(0,0,0,0.06)",
            backgroundColor: colors.surface || "#FAFAFA",
          }}
        >
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setActiveTab("home")}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={appName}
                className="w-5 h-5 rounded-md object-contain bg-white shadow-sm"
              />
            ) : (
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center text-white font-bold text-[9px] shadow-sm"
                style={{ backgroundColor: colors.primary || "#E91E63" }}
              >
                {appName.charAt(0)}
              </div>
            )}
            <span
              className="font-bold text-xs tracking-tight truncate max-w-[130px] sm:max-w-[160px]"
              style={{ color: colors.text }}
            >
              {appName}
            </span>
          </div>

          <div className="flex items-center gap-1 text-slate-500">
            {features.notifications !== false && (
              <button
                type="button"
                onClick={() => showToast("Notifications enabled in app settings")}
                className="p-1 hover:bg-slate-200/60 rounded-full transition active:scale-95 cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-3.5 h-3.5 text-slate-600" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-1 hover:bg-slate-200/60 rounded-full transition active:scale-95 cursor-pointer"
              title="Search"
            >
              <Search className="w-3.5 h-3.5 text-slate-600" />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("cart")}
              className="p-1 hover:bg-slate-200/60 rounded-full transition relative active:scale-95 cursor-pointer"
              title="Cart"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-slate-600" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full ring-1 ring-white" />
              )}
            </button>
          </div>
        </div>

        {/* In-App Search Bar Drawer */}
        {searchOpen && (
          <div className="px-3.5 py-2 border-b bg-white flex items-center gap-2 z-10 shadow-xs">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-xs outline-none bg-transparent text-slate-800"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="cursor-pointer"
              >
                <X className="w-3 h-3 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>
        )}

        {/* Interactive In-App Toast Notification */}
        {toastMessage && (
          <div className="absolute top-14 left-4 right-4 z-40 bg-slate-900/95 text-white backdrop-blur-md px-3.5 py-2 rounded-2xl text-[11px] font-semibold flex items-center justify-center gap-2 shadow-xl border border-slate-700/60 transition-all duration-200 animate-in fade-in slide-in-from-top-2">
            <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span className="truncate">{toastMessage}</span>
          </div>
        )}

        {/* ─── TAB VIEW: HOME ─── */}
        {activeTab === "home" && (
          <div className="flex-1 overflow-y-auto no-scrollbar pb-18 space-y-3 pt-2">
            {homeSections.map((sec: any, idx: number) => {
              if (sec.type === "banner") {
                const item = sec.items?.[0] || {};
                let activeImg = item.image || bannerUrl || fallbackBanner;
                if (typeof activeImg === "string" && activeImg.includes("/storage/app_assets/")) {
                  activeImg = activeImg.substring(activeImg.indexOf("/storage/app_assets/"));
                }
                let bannerTitle = item.title;
                let bannerBadge = item.badge;
                let bannerButton = item.button_text;

                const isStaleBulb =
                  (bannerTitle?.includes("High-Performance Lighting") ||
                    bannerTitle?.includes("Lighting & Bulbs") ||
                    bannerBadge?.includes("SUPER BRIGHT") ||
                    bannerButton?.includes("Halogen") ||
                    bannerButton?.includes("Shop Halogen & LED") ||
                    (typeof activeImg === "string" &&
                      (activeImg.includes("Formula-Rally") ||
                        activeImg.includes("lighting.rishabhtyagi.in") ||
                        activeImg.includes("photo-1517524008697")))) &&
                  autoNiche?.key !== "lighting";

                if (isStaleBulb || !bannerTitle || bannerTitle === "Exclusive Online Collection") {
                  bannerTitle = autoNiche?.hero_title || `${appName} Collection`;
                }
                if (isStaleBulb || !bannerBadge || bannerBadge === "Featured Store Deal") {
                  bannerBadge = autoNiche?.hero_badge || "NEW ARRIVALS 2026";
                }
                if (isStaleBulb || !bannerButton || bannerButton === "Shop Now →") {
                  bannerButton = autoNiche?.hero_button || "Shop Collection →";
                }
                if (
                  isStaleBulb ||
                  !activeImg ||
                  activeImg.includes("photo-1441986300917") ||
                  activeImg.includes("placeholders/banner1")
                ) {
                  activeImg = autoNiche?.hero_image || activeImg;
                }

                return (
                  <div key={idx} className="px-3.5 relative group">
                    <div
                      onClick={() => {
                        if (onEditBanner) {
                          onEditBanner();
                        } else {
                          showToast(`${bannerBadge} applied!`);
                        }
                      }}
                      className="w-full h-32 sm:h-36 rounded-xl overflow-hidden relative shadow-sm flex items-end p-3 text-white cursor-pointer active:scale-[0.99] transition select-none"
                      style={{
                        borderRadius: radius,
                        background: `linear-gradient(135deg, ${colors.primary || "#046BD2"}, ${colors.secondary || "#045CB4"})`,
                      }}
                    >
                      {activeImg ? (
                        <>
                          <img
                            src={activeImg}
                            alt={bannerTitle}
                            onError={(e) => {
                              const target = e.currentTarget;
                              const fallback =
                                autoNiche?.hero_image ||
                                fallbackBanner ||
                                "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80";
                              if (target.src !== fallback) {
                                target.src = fallback;
                              }
                            }}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none" />
                        </>
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/10 pointer-events-none" />
                      )}

                      <div className="relative z-10 pr-12">
                        <span
                          className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded backdrop-blur-md shadow-xs inline-block"
                          style={{
                            backgroundColor: colors.secondary || "rgba(0,0,0,0.6)",
                            color: "#FFFFFF",
                          }}
                        >
                          {bannerBadge}
                        </span>
                        <h4 className="font-extrabold text-sm mt-1 text-white drop-shadow leading-snug line-clamp-2">
                          {bannerTitle}
                        </h4>
                        <span className="text-[10px] text-white/90 underline font-semibold mt-0.5 block">
                          {bannerButton}
                        </span>
                      </div>

                      {/* On-Emulator Floating Edit Banner Button */}
                      {onEditBanner && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditBanner();
                          }}
                          className="absolute top-2.5 right-2.5 z-20 px-2 py-1 bg-white/95 hover:bg-white text-slate-800 rounded-lg text-[10px] font-bold shadow-md backdrop-blur-xs flex items-center gap-1 transition-all hover:scale-105 active:scale-95 border border-slate-200/80 cursor-pointer"
                          title="Click to edit hero banner image"
                        >
                          <span className="text-[11px]">✏️</span>
                          <span>Edit</span>
                        </button>
                      )}
                    </div>

                    {/* Perks Strip */}
                    <div className="mt-2.5 bg-slate-50 border border-slate-200/80 rounded-xl py-1.5 px-3 flex items-center justify-between text-[9px] text-slate-600 font-semibold shadow-xs">
                      <div className="flex items-center gap-1">
                        <Package className="w-3 h-3 text-blue-500" />
                        <span>Free Shipping</span>
                      </div>
                      <div className="w-[1px] h-3 bg-slate-200" />
                      <div className="flex items-center gap-1 text-emerald-600">
                        <Check className="w-3 h-3" />
                        <span>100% Genuine</span>
                      </div>
                      <div className="w-[1px] h-3 bg-slate-200" />
                      <div className="flex items-center gap-1 text-amber-600">
                        <Sparkles className="w-3 h-3" />
                        <span>Fast Dispatch</span>
                      </div>
                    </div>
                  </div>
                );
              }

              if (sec.type === "categories") {
                return (
                  <div key={idx} className="px-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs tracking-tight">Categories</span>
                      <button
                        type="button"
                        onClick={() => setActiveTab("categories")}
                        className="text-[10px] text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
                      >
                        See all
                      </button>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                      {cats.map((c: any) => {
                        const imgUrl =
                          c.image?.src || (typeof c.image === "string" ? c.image : null);

                        return (
                          <button
                            key={c.id || c.name}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(c.name);
                              showToast(`Filtered by ${c.name}`);
                            }}
                            className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group active:scale-95 transition"
                          >
                            <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center shadow-sm group-hover:border-indigo-400">
                              {imgUrl ? (
                                <img
                                  src={imgUrl}
                                  alt={c.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition"
                                />
                              ) : (
                                <div
                                  className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
                                  style={{ backgroundColor: colors.primary || "#E91E63" }}
                                >
                                  {c.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] font-medium text-slate-700 truncate max-w-[56px] text-center">
                              {c.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              if (sec.type === "product_rail") {
                return (
                  <div key={idx} className="px-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs tracking-tight">
                        {sec.title || "Store Products"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {filteredProducts.length} items
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {filteredProducts.map((prod: any) => {
                        const prodImg =
                          prod.images?.[0]?.src ||
                          prod.images?.[0] ||
                          prod.image ||
                          null;
                        const isFavorited = wishlist.has(prod.id);

                        return (
                          <div
                            key={prod.id}
                            className="border border-slate-100 rounded-xl p-2 flex flex-col justify-between shadow-xs hover:shadow-md transition bg-white"
                            style={{
                              backgroundColor: colors.surface || "#FAFAFA",
                              borderRadius: radius,
                            }}
                          >
                            <div className="w-full h-24 sm:h-26 bg-white rounded-lg mb-2 flex items-center justify-center text-slate-400 overflow-hidden relative border border-slate-100/60">
                              {prodImg ? (
                                <img
                                  src={typeof prodImg === "string" ? prodImg : prodImg.src}
                                  alt={prod.title || prod.name}
                                  className="w-full h-full object-cover hover:scale-105 transition duration-300"
                                />
                              ) : (
                                <Sparkles className="w-6 h-6 text-slate-300" />
                              )}

                              {features.wishlist !== false && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleWishlist(prod.id, prod.title || prod.name);
                                  }}
                                  className="absolute top-1.5 right-1.5 p-1 bg-white/90 backdrop-blur-md rounded-full shadow-xs active:scale-90 transition cursor-pointer"
                                  title="Add to wishlist"
                                >
                                  <Heart
                                    className={`w-3.5 h-3.5 transition ${
                                      isFavorited
                                        ? "fill-rose-500 text-rose-500"
                                        : "text-slate-400 hover:text-rose-500"
                                    }`}
                                  />
                                </button>
                              )}
                            </div>

                            <div>
                              <p
                                className="font-semibold text-[11px] truncate"
                                style={{ color: colors.text }}
                                title={prod.title || prod.name}
                              >
                                {prod.title || prod.name}
                              </p>

                              {features.reviews && (
                                <div className="flex items-center gap-1 mt-0.5 text-[9.5px] font-bold text-amber-500">
                                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                  <span>4.9 (48)</span>
                                </div>
                              )}

                              <div className="flex items-center justify-between mt-1.5">
                                <span
                                  className="font-black text-xs"
                                  style={{ color: colors.primary || "#E91E63" }}
                                >
                                  {currencySymbol}
                                  {prod.price}
                                </span>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addToCart(prod);
                                  }}
                                  className="px-2.5 py-1 text-white font-bold text-[10px] shadow-xs active:scale-95 transition cursor-pointer flex items-center gap-0.5"
                                  style={{
                                    backgroundColor: colors.primary || "#E91E63",
                                    borderRadius: buttonRadius,
                                  }}
                                >
                                  <Plus className="w-3 h-3 stroke-[3]" />
                                  <span>Add</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}

        {/* ─── TAB VIEW: CATEGORIES ─── */}
        {activeTab === "categories" && (
          <div className="flex-1 overflow-y-auto no-scrollbar pb-18 p-4 space-y-3">
            <div className="flex items-center justify-between pb-1">
              <h3 className="font-bold text-sm text-slate-900">All Categories</h3>
              <span className="text-[10px] text-slate-400">{cats.length} available</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {cats.map((c: any) => (
                <button
                  key={c.id || c.name}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(c.name);
                    setActiveTab("home");
                    showToast(`Opened ${c.name}`);
                  }}
                  className="p-3 rounded-xl border border-slate-100 bg-white shadow-xs hover:shadow-sm text-left active:scale-98 transition cursor-pointer flex flex-col justify-between h-24"
                  style={{ borderRadius: radius }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-xs"
                    style={{ backgroundColor: colors.primary || "#E91E63" }}
                  >
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">{c.name}</h4>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {c.count || "15+"} products
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB VIEW: CART ─── */}
        {activeTab === "cart" && (
          <div className="flex-1 overflow-y-auto no-scrollbar pb-20 p-4 flex flex-col justify-between">
            {cartItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3 my-auto">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">Your Cart is Empty</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tap the &ldquo;Add&rdquo; button on any product to preview live cart checkout!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("home")}
                  className="px-4 py-2 rounded-xl text-white font-bold text-xs shadow-sm active:scale-95 transition cursor-pointer"
                  style={{ backgroundColor: colors.primary || "#E91E63" }}
                >
                  Explore Catalog
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="font-bold text-sm text-slate-900">Your Shopping Bag</h3>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {cartCount} items
                  </span>
                </div>

                <div className="space-y-2">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl border border-slate-100 bg-white flex items-center justify-between shadow-xs"
                      style={{ borderRadius: radius }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center text-slate-400 flex-shrink-0">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-slate-800 truncate max-w-[120px]">
                            {item.title}
                          </p>
                          <span
                            className="font-bold text-[11px]"
                            style={{ color: colors.primary || "#E91E63" }}
                          >
                            {currencySymbol}
                            {item.price}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 bg-slate-100 px-1.5 py-0.5 rounded-lg">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, -1)}
                          className="p-1 hover:bg-white rounded active:scale-90 transition cursor-pointer"
                        >
                          <Minus className="w-2.5 h-2.5 text-slate-600" />
                        </button>
                        <span className="text-xs font-bold text-slate-800 min-w-3 text-center">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, 1)}
                          className="p-1 hover:bg-white rounded active:scale-90 transition cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5 text-slate-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bill Summary */}
                <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-bold text-slate-800">
                      {currencySymbol}
                      {cartSubtotal}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Shipping</span>
                    <span className="font-bold text-emerald-600">FREE</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-900 font-extrabold text-sm pt-1 border-t">
                    <span>Total</span>
                    <span style={{ color: colors.primary || "#E91E63" }}>
                      {currencySymbol}
                      {cartSubtotal}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    showToast(
                      `Demo: Real payments connect to your ${currency} Gateway in Step 9!`
                    )
                  }
                  className="w-full py-2.5 rounded-xl text-white font-bold text-xs shadow-md active:scale-98 transition cursor-pointer flex items-center justify-center gap-1.5 mt-2"
                  style={{ backgroundColor: colors.primary || "#E91E63" }}
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB VIEW: PROFILE ─── */}
        {activeTab === "profile" && (
          <div className="flex-1 overflow-y-auto no-scrollbar pb-18 p-4 space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-100 shadow-xs">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-sm shadow-sm"
                style={{ backgroundColor: colors.primary || "#E91E63" }}
              >
                JD
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900">Store Member</h4>
                <span className="inline-block mt-0.5 px-2 py-0.2 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded">
                  Active Member
                </span>
              </div>
            </div>

            <div className="space-y-1">
              {[
                {
                  icon: Package,
                  label: "My Orders",
                  badge: "2 Active",
                  action: () => showToast("Simulating Order Tracking..."),
                },
                {
                  icon: Heart,
                  label: "Wishlist Items",
                  badge: `${wishlist.size} Saved`,
                  action: () => showToast(`You have ${wishlist.size} items in wishlist`),
                },
                {
                  icon: MapPin,
                  label: "Shipping Addresses",
                  action: () => showToast("Managing saved delivery addresses"),
                },
                {
                  icon: Bell,
                  label: "Push Notifications",
                  badge: "Enabled",
                  action: () => showToast("Push notifications enabled"),
                },
                {
                  icon: Settings,
                  label: "App Preferences",
                  action: () => showToast("Opening App Settings"),
                },
              ].map((item, i) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={item.action}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white hover:bg-slate-50 transition border border-slate-100 shadow-2xs text-left cursor-pointer active:scale-98"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-semibold text-xs text-slate-800">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {item.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Nav Bar with Rounded Bottom Corners & Home Indicator */}
        <div
          className="absolute bottom-0 left-0 right-0 border-t z-20 rounded-b-[36px] sm:rounded-b-[40px] flex flex-col pt-2 pb-2 px-4 shadow-lg backdrop-blur-md"
          style={{
            backgroundColor: colors.surface || "#FAFAFA",
            borderColor: "rgba(0,0,0,0.06)",
          }}
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveTab("home")}
              className={`flex flex-col items-center text-[9px] font-semibold transition active:scale-95 cursor-pointer ${
                activeTab === "home"
                  ? "font-bold scale-105"
                  : "text-slate-400 hover:text-slate-600"
              }`}
              style={{
                color: activeTab === "home" ? colors.primary || "#E91E63" : undefined,
              }}
            >
              <Home className="w-4 h-4" />
              <span className="mt-0.5">Home</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("categories")}
              className={`flex flex-col items-center text-[9px] font-semibold transition active:scale-95 cursor-pointer ${
                activeTab === "categories"
                  ? "font-bold scale-105"
                  : "text-slate-400 hover:text-slate-600"
              }`}
              style={{
                color: activeTab === "categories" ? colors.primary || "#E91E63" : undefined,
              }}
            >
              <Search className="w-4 h-4" />
              <span className="mt-0.5">Categories</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("cart")}
              className={`flex flex-col items-center text-[9px] font-semibold transition active:scale-95 cursor-pointer relative ${
                activeTab === "cart"
                  ? "font-bold scale-105"
                  : "text-slate-400 hover:text-slate-600"
              }`}
              style={{
                color: activeTab === "cart" ? colors.primary || "#E91E63" : undefined,
              }}
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-3.5 h-3.5 px-0.5 bg-rose-500 text-white rounded-full text-[8px] font-black flex items-center justify-center shadow-xs animate-pulse">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="mt-0.5">Cart</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className={`flex flex-col items-center text-[9px] font-semibold transition active:scale-95 cursor-pointer ${
                activeTab === "profile"
                  ? "font-bold scale-105"
                  : "text-slate-400 hover:text-slate-600"
              }`}
              style={{
                color: activeTab === "profile" ? colors.primary || "#E91E63" : undefined,
              }}
            >
              <User className="w-4 h-4" />
              <span className="mt-0.5">Profile</span>
            </button>
          </div>

          {/* Home indicator bar for modern authentic smartphone feel */}
          <div className="w-16 h-0.5 bg-slate-300 rounded-full mx-auto mt-1.5" />
        </div>
      </div>
    </div>
  );
}
