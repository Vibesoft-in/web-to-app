"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface ThemeMeta {
  id: number;
  slug: string;
  name: string;
  category: string;
  badge: string;
  price: string;
  description: string;
  capabilities: string[];
  specs: string[];
  colors: {
    primary: string;
    accent: string;
    bg: string;
    card: string;
    text: string;
    muted: string;
    border: string;
  };
}

const THEMES_CONFIG: Record<string, ThemeMeta> = {
  minimal: {
    id: 1,
    slug: "minimal",
    name: "Minimal",
    category: "MINIMAL",
    badge: "Minimal Style",
    price: "Included in Plan",
    description:
      "A clean, whitespace-focused mobile experience designed for minimalist online stores and lifestyle brands.",
    capabilities: [
      "Clean Navigation",
      "Hero Product Display",
      "Category Carousels",
      "1-Tap Quick Cart",
      "Minimal Typography",
    ],
    specs: [
      "Real-Time Two-Way REST API Bridge",
      "SSL Encrypted Checkout (Apple Pay & Google Pay)",
      "Automated Push Notifications & Alerts",
      "Offline Cache Engine with Instant Image CDN",
      "Direct App Store & Google Play Binary Submission",
    ],
    colors: {
      primary: "#252525",
      accent: "#B69A78",
      bg: "#FBF9F7",
      card: "#FFFFFF",
      text: "#1C1917",
      muted: "#78716C",
      border: "#E7E5E4",
    },
  },
  modern: {
    id: 6,
    slug: "modern",
    name: "Modern",
    category: "MODERN",
    badge: "Modern Style",
    price: "₹1,999",
    description:
      "A contemporary, refined mobile shopping experience with rich typography and curated storytelling layouts.",
    capabilities: [
      "Editorial Typography",
      "Storytelling Layouts",
      "Curated Collections",
      "Refined Gallery Cards",
      "VIP Membership Sync",
    ],
    specs: [
      "Editorial Storytelling Native Engine",
      "Instant Wishlist & Curated Collections",
      "Bi-directional WooCommerce / Shopify Sync",
      "High-Fidelity Product Zoom & Gallery",
      "Direct Binary Build for Android & iOS",
    ],
    colors: {
      primary: "#18181B",
      accent: "#78593D",
      bg: "#F4F4F5",
      card: "#FFFFFF",
      text: "#09090B",
      muted: "#71717A",
      border: "#E4E4E7",
    },
  },
  trendy: {
    id: 2,
    slug: "trendy",
    name: "Trendy",
    category: "TRENDY",
    badge: "Trendy Style",
    price: "₹1,499",
    description:
      "A bold, energetic high-contrast mobile design built for trending boutique fashion and beauty brands.",
    capabilities: [
      "Dynamic Hero Banners",
      "Lookbook Grid",
      "Instant Wishlist",
      "Discount Badges",
      "Size & Color Selector",
    ],
    specs: [
      "Dynamic Lookbook Grid Animations",
      "Instant Flash-Sale Countdown Engine",
      "Multi-Currency & International Gateway Support",
      "Full Offline Product Browsing Engine",
      "One-Click App Store Publishing Pipeline",
    ],
    colors: {
      primary: "#0F172A",
      accent: "#E11D48",
      bg: "#F8FAFC",
      card: "#FFFFFF",
      text: "#0F172A",
      muted: "#64748B",
      border: "#E2E8F0",
    },
  },
  elite: {
    id: 4,
    slug: "elite",
    name: "Elite Dark Luxe",
    category: "PREMIUM",
    badge: "Premium Exclusive",
    price: "Included in Premium",
    description:
      "An ultra-premium obsidian dark theme with brushed amber-gold accents designed for luxury and high-ticket eCommerce.",
    capabilities: [
      "Obsidian Dark Mode",
      "Brushed Gold Accents",
      "VIP Member Badges",
      "Haptic Micro-interactions",
      "Cinzel Luxury Typography",
    ],
    specs: [
      "Obsidian Deep Contrast Mobile UI",
      "Curated Luxury Lookbook & Story Panels",
      "Exclusive High-Roller Flash Deal Carousel",
      "Bi-directional Inventory & Order Tracking",
      "Dedicated App Admin Panel Remote Management",
    ],
    colors: {
      primary: "#D97706",
      accent: "#F59E0B",
      bg: "#0B0F19",
      card: "#111827",
      text: "#F9FAFB",
      muted: "#9CA3AF",
      border: "#1F2937",
    },
  },
};

interface CartItem {
  id: number;
  name: string;
  price: string;
  art: string;
  qty: number;
}

export default function ThemeLiveDemoPage() {
  const params = useParams();
  const slugParam = (params?.slug as string)?.toLowerCase() || "minimal";
  const theme = THEMES_CONFIG[slugParam] || THEMES_CONFIG.minimal;

  const [activeTab, setActiveTab] = useState<"home" | "shop" | "favorites" | "cart" | "profile">("home");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [toastText, setToastText] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([
    { id: 101, name: "Nordic Lounge Chair", price: "₹18,400", art: "🛍️", qty: 1 },
    { id: 102, name: "Amara Ceramic Lamp", price: "₹6,800", art: "🛍️", qty: 1 },
  ]);
  const [activeSheetProduct, setActiveSheetProduct] = useState<{
    id: number;
    name: string;
    category: string;
    price: string;
    rating: string;
    reviews: number;
    description: string;
    badge: string;
    art: string;
  } | null>(null);

  useEffect(() => {
    document.title = `Live Demo: ${theme.name} | AppifyHub`;
  }, [theme.name]);

  const leftPanelRef = useRef<HTMLElement>(null);

  // When user scrolls anywhere in the display, scroll the left panel while phone stays fixed
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (window.innerWidth <= 900) return; // Allow natural document scroll on mobile

      // If user is scrolling inside the phone's scrollable view, let the phone screen scroll
      const target = e.target as HTMLElement | null;
      if (target && target.closest(".app-mock-body-views")) {
        return;
      }

      const panel = leftPanelRef.current;
      if (!panel) return;

      const maxScroll = panel.scrollHeight - panel.clientHeight;
      if (maxScroll > 0) {
        const atBottom = panel.scrollTop >= maxScroll - 1 && e.deltaY > 0;
        const atTop = panel.scrollTop <= 1 && e.deltaY < 0;

        if (!atBottom && !atTop) {
          e.preventDefault();
          panel.scrollTop += e.deltaY;
        } else if (e.deltaY > 0 && !atBottom) {
          e.preventDefault();
          panel.scrollTop += e.deltaY;
        } else if (e.deltaY < 0 && !atTop) {
          e.preventDefault();
          panel.scrollTop += e.deltaY;
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (window.innerWidth <= 900) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }

      const panel = leftPanelRef.current;
      if (!panel) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        panel.scrollTop += 60;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        panel.scrollTop -= 60;
      } else if (e.key === "PageDown" || (e.key === " " && !e.shiftKey)) {
        e.preventDefault();
        panel.scrollTop += 240;
      } else if (e.key === "PageUp" || (e.key === " " && e.shiftKey)) {
        e.preventDefault();
        panel.scrollTop -= 240;
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const showPhoneToast = (msg: string) => {
    setToastText(msg);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 1800);
  };

  const handleAddToCart = (name: string, price: string, art: string) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.name === name);
      if (existing) {
        return prev.map((i) => (i.name === name ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { id: Date.now(), name, price, art, qty: 1 }];
    });
    showPhoneToast("Added to Bag ✓");
  };

  const updateQty = (id: number, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0)
    );
  };

  const totalCartCount = cartItems.reduce((acc, curr) => acc + curr.qty, 0);

  const calculateSubtotal = () => {
    const sum = cartItems.reduce((acc, curr) => {
      const num = parseInt(curr.price.replace(/[^\d]/g, ""), 10) || 0;
      return acc + num * curr.qty;
    }, 0);
    return "₹" + sum.toLocaleString("en-IN");
  };

  const productsList = [
    {
      id: 101,
      name: "Nordic Lounge Chair",
      category: "sofas",
      categoryLabel: "Sofas",
      price: "₹18,400",
      oldPrice: "₹22,000",
      rating: "4.9",
      reviews: 64,
      description: "Solid white-oak frame tailored with textured bouclé wool upholstery. Ergonomic low-slung comfort.",
      badge: "Bestseller",
      art: "🛍️",
    },
    {
      id: 102,
      name: "Amara Ceramic Lamp",
      category: "lighting",
      categoryLabel: "Lighting",
      price: "₹6,800",
      oldPrice: "₹8,500",
      rating: "4.8",
      reviews: 42,
      description: "Hand-turned stoneware base with speckled sand glaze and oatmeal linen shade. Warm dimmable LED.",
      badge: "New",
      art: "🛍️",
    },
    {
      id: 103,
      name: "Travertine Coffee Table",
      category: "tables",
      categoryLabel: "Tables",
      price: "₹24,500",
      oldPrice: "₹29,000",
      rating: "5.0",
      reviews: 28,
      description: "Natural Italian travertine stone with bullnose honed edges and balanced pillar pedestal base.",
      badge: "Limited",
      art: "🛍️",
    },
    {
      id: 104,
      name: "Minimalist Stoneware Vase",
      category: "decor",
      categoryLabel: "Decor",
      price: "₹3,200",
      oldPrice: "₹4,000",
      rating: "4.7",
      reviews: 53,
      description: "Sculptural organic silhouette designed for dry botanical arrangements and architectural centerpieces.",
      badge: "",
      art: "🛍️",
    },
  ];

  const filteredProducts = productsList.filter((p) => {
    const matchesCat = activeCategory === "all" || p.category === activeCategory;
    const matchesSearch = !searchFilter || p.name.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div
      className="themes-marketplace-wrapper is-demo-mode"
      style={
        {
          "--app-primary": darkMode ? "#FBF9F7" : theme.colors.primary,
          "--app-accent": theme.colors.accent,
          "--app-bg": darkMode ? "#18181B" : theme.colors.bg,
          "--app-card": darkMode ? "#27272A" : theme.colors.card,
          "--app-text": darkMode ? "#F4F4F5" : theme.colors.text,
          "--app-muted": darkMode ? "#A1A1AA" : theme.colors.muted,
          "--app-border": darkMode ? "#3F3F46" : theme.colors.border,
        } as React.CSSProperties
      }
    >
      {/* Top Global Header */}
      <header className="app-header">
        <div className="header-inner">
          <Link href="/" className="brand-logo" aria-label="AppifyHub Home">
            <svg
              className="brand-icon"
              width="26"
              height="26"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M16 3L3 27H11L16 17L21 27H29L16 3Z" fill="#78593D" />
              <path d="M16 11L11.5 20H20.5L16 11Z" fill="#C2A88F" />
            </svg>
            <span className="brand-text">AppifyHub</span>
          </Link>

          <nav className="main-nav" aria-label="Main Navigation">
            <Link href="/" className="nav-link">
              Home
            </Link>
            <Link href="/how-it-works" className="nav-link">
              How It Works
            </Link>
            <Link href="/themes" className="nav-link active">
              Themes
            </Link>
            <Link href="/plans" className="nav-link">
              Plans
            </Link>
            <Link href="/support" className="nav-link">
              Support
            </Link>
          </nav>

          <div className="header-actions">
            <Link href="/login" className="btn-text">
              Login
            </Link>
            <Link href="/signup" className="btn-outline">
              <span>Get Started</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="8" x2="13" y2="8" />
                <polyline points="9 4 13 8 9 12" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="page-body">
        <div className="theme-showcase-page">
          <div className="theme-showcase-container">
            {/* LEFT: THEME SPECIFICATION & ACTION PANEL */}
            <aside
              className="theme-info-panel no-scrollbar"
              id="themeInfoPanel"
              ref={leftPanelRef}
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              <Link href="/themes" className="btn-back-themes">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                <span>Back to Themes</span>
              </Link>

              <div className="theme-header-block">
                <div className="theme-category-pill">{theme.category}</div>
                <h1 className="theme-title">{theme.name}</h1>
                <p className="theme-desc">{theme.description}</p>
              </div>

              <div className="theme-capabilities-block">
                <h4 className="capabilities-title">INCLUDED THEME CAPABILITIES</h4>
                <ul className="capabilities-list">
                  {theme.capabilities.map((cap, i) => (
                    <li key={i}>
                      <span className="cap-check">✓</span>
                      <span>{cap}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Native Architecture Checklist */}
              <div
                className="theme-capabilities-block"
                style={{ borderBottom: "none", marginBottom: "0.75rem" }}
              >
                <h4 className="capabilities-title">NATIVE SPECIFICATIONS</h4>
                <ul className="capabilities-list">
                  {theme.specs.map((spec, i) => (
                    <li key={i}>
                      <span className="cap-check">✓</span>
                      <span>{spec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Interactivity Hint */}
              <div
                style={{
                  background: "#EFEAE7",
                  borderLeft: "3px solid #4E522C",
                  padding: "0.6rem 0.8rem",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  color: "#403A32",
                  lineHeight: "1.45",
                  marginBottom: "1rem",
                }}
              >
                <strong>Interactive Demo:</strong> Tap anywhere inside the phone
                screen to test the live app experience &mdash; switch tabs,
                filter categories, add items to cart, or toggle dark mode!
              </div>

              <div className="theme-action-box">
                <div className="theme-price-display">
                  <span className="price-label">Price:</span>
                  <strong className="price-value">{theme.price}</strong>
                </div>

                <Link
                  href={`/signup?theme=${theme.slug}`}
                  className="btn-select-theme-primary"
                  style={{ textDecoration: "none", display: "flex", justifyContent: "center" }}
                  onClick={() => {
                    try {
                      localStorage.setItem(
                        "appifyhub_selected_theme",
                        JSON.stringify({
                          name: theme.name,
                          slug: theme.slug,
                          price: theme.price,
                          badge: theme.badge,
                          selectedByUser: true,
                        })
                      );
                    } catch {}
                  }}
                >
                  <span>Select This Theme &rarr;</span>
                </Link>

                <div className="theme-switch-inline" style={{ marginTop: "1.2rem" }}>
                  <label
                    className="switch-inline-label"
                    style={{
                      display: "block",
                      marginBottom: "0.4rem",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#403A32",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Switch Theme Preview:
                  </label>
                  <div className="theme-switch-grid-cards">
                    {Object.values(THEMES_CONFIG).map((t) => (
                      <Link
                        key={t.slug}
                        href={`/themes/${t.slug}/demo`}
                        className={`theme-switch-card-item ${t.slug === theme.slug ? "is-current" : ""}`}
                        title={`Preview ${t.name}`}
                      >
                        <span className="switch-card-emoji">🛍️</span>
                        <div className="switch-card-text">
                          <span className="switch-card-name">{t.name}</span>
                          <span className="switch-card-cat">{t.category}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            {/* RIGHT: COMPLETE PHONE PREVIEW (STICKY IN VIEWPORT) */}
            <main className="theme-preview-stage" id="themePreviewStage">
              <div className="preview-stage-header">
                <span className="preview-badge-pill">
                  <span className="pulse-dot"></span>
                  <span>LIVE SIMULATION &bull; TAP TO INTERACT</span>
                </span>
                <span className="preview-aspect-hint">{theme.badge}</span>
              </div>

              {/* Scaled Smartphone Frame */}
              <div className="showcase-smartphone-frame">
                <div className="phone-speaker-bar"></div>
                <div className="phone-island-pill">
                  <span className="island-camera"></span>
                </div>

                {/* Screen Canvas */}
                <div
                  className="showcase-screen-canvas"
                  id="demoPhoneCanvas"
                  style={{
                    backgroundColor: "var(--app-bg)",
                    color: "var(--app-text)",
                  }}
                >
                  {/* Dynamic Island Toast */}
                  <div
                    className={`app-mock-toast ${toastVisible ? "is-visible" : ""}`}
                    id="demoPhoneToast"
                  >
                    <span className="app-mock-toast-dot"></span>
                    <span id="demoPhoneToastText">{toastText}</span>
                  </div>

                  {/* 1. Status Bar */}
                  <div className="app-mock-status-bar">
                    <span className="status-time" id="demoClockTime">
                      9:41
                    </span>
                    <div className="status-icons">
                      <span className="status-signal">&#9679;&#9679;&#9679;&#9679;</span>
                      <span className="status-wifi">&#9650;</span>
                      <span className="status-battery">100% &#128267;</span>
                    </div>
                  </div>

                  {/* 2. Brand Header */}
                  <header
                    className="app-mock-header"
                    style={{
                      backgroundColor: "var(--app-card)",
                      borderColor: "var(--app-border)",
                    }}
                  >
                    <div
                      className="app-mock-brand"
                      style={{ cursor: "pointer" }}
                      onClick={() => setActiveTab("home")}
                      title="Go to Home"
                    >
                      <h3 className="mock-brand-name">LUMIÈRE</h3>
                      <span className="mock-brand-sub">{theme.name} Living</span>
                    </div>
                    <div className="app-mock-header-icons">
                      <button
                        type="button"
                        className="mock-icon-btn"
                        id="btnToggleSearch"
                        title="Search items"
                        onClick={() => setSearchOpen(!searchOpen)}
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                        >
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="mock-icon-btn mock-cart-wrap"
                        id="btnHeaderCart"
                        title="View Cart"
                        onClick={() => setActiveTab("cart")}
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                        >
                          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                          <line x1="3" y1="6" x2="21" y2="6" />
                          <path d="M16 10a4 4 0 0 1-8 0" />
                        </svg>
                        <span className="mock-cart-badge" id="demoHeaderCartCount">
                          {totalCartCount}
                        </span>
                      </button>
                    </div>
                  </header>

                  {/* Search Bar */}
                  {searchOpen && (
                    <div className="app-mock-search-bar" id="demoSearchBar">
                      <input
                        type="text"
                        id="demoSearchInput"
                        className="app-mock-search-input"
                        placeholder="Search LUMIÈRE products..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        autoFocus
                      />
                      <span
                        className="app-mock-search-close"
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchFilter("");
                        }}
                        title="Close Search"
                      >
                        &times;
                      </span>
                    </div>
                  )}

                  {/* Body Views */}
                  <div className="app-mock-body-views">
                    {/* VIEW 1: HOME */}
                    {activeTab === "home" && (
                      <div className="app-mock-view is-active" id="view-home">
                        <div
                          className="app-mock-hero-banner"
                          onClick={() => setActiveTab("shop")}
                          title="Click to explore collection"
                        >
                          <span className="mock-hero-badge">Curated 2026</span>
                          <h4 className="mock-hero-title">New Autumn Arrivals</h4>
                          <p className="mock-hero-subtitle">
                            Sculpted furniture and warm ceramic lighting.
                          </p>
                          <span className="mock-hero-btn">
                            Explore Collection &rarr;
                          </span>
                        </div>

                        {/* Category Chips */}
                        <div className="app-mock-categories">
                          <span className="mock-section-label">
                            Categories (Tap to filter)
                          </span>
                          <div className="mock-category-chips">
                            {["all", "sofas", "lighting", "decor", "tables"].map((cat) => (
                              <span
                                key={cat}
                                className={`mock-cat-chip ${activeCategory === cat ? "is-active" : ""}`}
                                onClick={() => setActiveCategory(cat)}
                              >
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Featured Products */}
                        <div className="app-mock-products-section">
                          <div className="mock-products-header">
                            <span className="mock-section-label">
                              Featured Products
                            </span>
                            <span
                              className="mock-see-all"
                              style={{ cursor: "pointer" }}
                              onClick={() => setActiveTab("shop")}
                            >
                              See All &rarr;
                            </span>
                          </div>
                          <div className="mock-products-grid" id="homeProductsGrid">
                            {filteredProducts.slice(0, 2).map((item) => (
                              <div
                                key={item.id}
                                className="mock-product-card"
                                onClick={() => setActiveSheetProduct(item)}
                              >
                                <div className="mock-card-media">
                                  {item.badge && (
                                    <span className="mock-item-badge">
                                      {item.badge}
                                    </span>
                                  )}
                                  <div className="mock-item-artwork">
                                    <span className="artwork-emoji">{item.art}</span>
                                  </div>
                                </div>
                                <div className="mock-card-info">
                                  <div className="mock-card-meta">
                                    <span className="mock-cat-sub">
                                      {item.categoryLabel}
                                    </span>
                                    <span className="mock-rating">
                                      &#9733; {item.rating}
                                    </span>
                                  </div>
                                  <h6 className="mock-item-name">{item.name}</h6>
                                  <div className="mock-card-price-row">
                                    <div className="mock-prices">
                                      <span className="mock-curr-price">
                                        {item.price}
                                      </span>
                                      {item.oldPrice && (
                                        <span className="mock-old-price">
                                          {item.oldPrice}
                                        </span>
                                      )}
                                    </div>
                                    <span
                                      className="mock-add-btn"
                                      title="Add to Bag"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddToCart(item.name, item.price, item.art);
                                      }}
                                    >
                                      +
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Promo Strip */}
                        <div
                          className="app-mock-offer-strip"
                          onClick={() => showPhoneToast("10% Coupon Applied! ⚡")}
                          title="Tap to apply code"
                        >
                          <span className="offer-icon">&#9889;</span>
                          <span className="offer-text">
                            Special Collection &bull; Tap to Apply 10% Off
                          </span>
                        </div>
                      </div>
                    )}

                    {/* VIEW 2: SHOP */}
                    {activeTab === "shop" && (
                      <div className="app-mock-view is-active" id="view-shop">
                        <div
                          style={{
                            padding: "0.4rem 0.65rem 0.2rem",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span className="mock-section-label" style={{ margin: 0 }}>
                            All Products ({filteredProducts.length})
                          </span>
                          <span
                            style={{
                              fontSize: "0.5rem",
                              color: "var(--app-muted)",
                            }}
                          >
                            &#9881; Filtered
                          </span>
                        </div>

                        <div className="app-mock-categories" style={{ paddingTop: "0.1rem" }}>
                          <div className="mock-category-chips">
                            {["all", "sofas", "lighting", "decor", "tables"].map((cat) => (
                              <span
                                key={cat}
                                className={`mock-cat-chip ${activeCategory === cat ? "is-active" : ""}`}
                                onClick={() => setActiveCategory(cat)}
                              >
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="app-mock-products-section" style={{ paddingTop: "0.2rem" }}>
                          <div className="mock-products-grid" id="shopProductsGrid">
                            {filteredProducts.map((item) => (
                              <div
                                key={item.id}
                                className="mock-product-card"
                                onClick={() => setActiveSheetProduct(item)}
                              >
                                <div className="mock-card-media">
                                  {item.badge && (
                                    <span className="mock-item-badge">
                                      {item.badge}
                                    </span>
                                  )}
                                  <div className="mock-item-artwork">
                                    <span className="artwork-emoji">{item.art}</span>
                                  </div>
                                </div>
                                <div className="mock-card-info">
                                  <div className="mock-card-meta">
                                    <span className="mock-cat-sub">
                                      {item.categoryLabel}
                                    </span>
                                    <span className="mock-rating">
                                      &#9733; {item.rating}
                                    </span>
                                  </div>
                                  <h6 className="mock-item-name">{item.name}</h6>
                                  <div className="mock-card-price-row">
                                    <div className="mock-prices">
                                      <span className="mock-curr-price">
                                        {item.price}
                                      </span>
                                      {item.oldPrice && (
                                        <span className="mock-old-price">
                                          {item.oldPrice}
                                        </span>
                                      )}
                                    </div>
                                    <span
                                      className="mock-add-btn"
                                      title="Add to Bag"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddToCart(item.name, item.price, item.art);
                                      }}
                                    >
                                      +
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* VIEW 3: FAVORITES */}
                    {activeTab === "favorites" && (
                      <div className="app-mock-view is-active" id="view-favorites">
                        <div
                          style={{
                            padding: "0.4rem 0.65rem 0.2rem",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span className="mock-section-label" style={{ margin: 0 }}>
                            Wishlist &amp; Saved ❤️
                          </span>
                          <span
                            style={{
                              fontSize: "0.5rem",
                              color: "var(--app-muted)",
                            }}
                          >
                            2 Items
                          </span>
                        </div>
                        <div
                          style={{
                            padding: "0.3rem 0.65rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.35rem",
                          }}
                        >
                          <div className="app-cart-item">
                            <div className="app-cart-item-art">🛍️</div>
                            <div className="app-cart-item-details">
                              <h6 className="app-cart-item-name">Nordic Lounge Chair</h6>
                              <span className="app-cart-item-price">₹18,400</span>
                            </div>
                            <button
                              type="button"
                              className="sheet-btn-add"
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.5rem" }}
                              onClick={() => {
                                handleAddToCart("Nordic Lounge Chair", "₹18,400", "🛍️");
                                showPhoneToast("Moved to Bag ✓");
                              }}
                            >
                              + Bag
                            </button>
                          </div>
                          <div className="app-cart-item">
                            <div className="app-cart-item-art">🛍️</div>
                            <div className="app-cart-item-details">
                              <h6 className="app-cart-item-name">Amara Ceramic Lamp</h6>
                              <span className="app-cart-item-price">₹6,800</span>
                            </div>
                            <button
                              type="button"
                              className="sheet-btn-add"
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.5rem" }}
                              onClick={() => {
                                handleAddToCart("Amara Ceramic Lamp", "₹6,800", "🛍️");
                                showPhoneToast("Moved to Bag ✓");
                              }}
                            >
                              + Bag
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* VIEW 4: CART */}
                    {activeTab === "cart" && (
                      <div className="app-mock-view is-active" id="view-cart">
                        <div className="app-cart-view">
                          <div className="app-cart-header">
                            <h4 className="app-cart-title">
                              Your Bag (<span>{totalCartCount}</span>)
                            </h4>
                            <span
                              style={{
                                fontSize: "0.48rem",
                                color: "#10B981",
                                fontWeight: 700,
                              }}
                            >
                              🚚 Free Shipping
                            </span>
                          </div>

                          <div
                            className="app-cart-items-container"
                            id="cartItemsList"
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.35rem",
                            }}
                          >
                            {cartItems.map((item) => (
                              <div key={item.id} className="app-cart-item">
                                <div className="app-cart-item-art">{item.art}</div>
                                <div className="app-cart-item-details">
                                  <h6 className="app-cart-item-name">{item.name}</h6>
                                  <span className="app-cart-item-price">
                                    {item.price}
                                  </span>
                                </div>
                                <div className="app-cart-qty-ctrl">
                                  <button
                                    type="button"
                                    className="cart-qty-btn"
                                    onClick={() => updateQty(item.id, -1)}
                                  >
                                    &minus;
                                  </button>
                                  <span className="cart-qty-val">{item.qty}</span>
                                  <button
                                    type="button"
                                    className="cart-qty-btn"
                                    onClick={() => updateQty(item.id, 1)}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="app-cart-summary">
                            <div className="cart-sum-row">
                              <span>Subtotal</span>
                              <strong>{calculateSubtotal()}</strong>
                            </div>
                            <div className="cart-sum-row">
                              <span>Shipping</span>
                              <span style={{ color: "#10B981", fontWeight: 700 }}>
                                FREE
                              </span>
                            </div>
                            <div className="cart-sum-row total">
                              <span>Total</span>
                              <strong>{calculateSubtotal()}</strong>
                            </div>

                            <button
                              type="button"
                              className="btn-mock-checkout"
                              onClick={() => showPhoneToast("Opening Native Gateway 🔐")}
                            >
                              Proceed to Native Checkout &rarr;
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* VIEW 5: PROFILE */}
                    {activeTab === "profile" && (
                      <div className="app-mock-view is-active" id="view-profile">
                        <div className="app-profile-view">
                          <div className="profile-card">
                            <div className="profile-avatar">AM</div>
                            <div className="profile-info">
                              <h5>Alex Morgan</h5>
                              <span>Prime Member &bull; Connected</span>
                            </div>
                          </div>

                          <div className="profile-options-list">
                            <div
                              className="profile-opt-row"
                              onClick={() => showPhoneToast("Viewing Order History")}
                            >
                              <span>📦 My Orders</span>
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: "var(--app-muted)",
                                }}
                              >
                                &rarr;
                              </span>
                            </div>
                            <div
                              className="profile-opt-row"
                              onClick={() => showPhoneToast("Saved Addresses synced")}
                            >
                              <span>📍 Saved Addresses</span>
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: "var(--app-muted)",
                                }}
                              >
                                &rarr;
                              </span>
                            </div>
                            <div className="profile-opt-row">
                              <span>🌙 Dark Mode Preview</span>
                              <div
                                className={`profile-switch ${darkMode ? "is-on" : ""}`}
                                onClick={() => {
                                  setDarkMode(!darkMode);
                                  showPhoneToast(!darkMode ? "Dark Mode ON" : "Dark Mode OFF");
                                }}
                              >
                                <span className="profile-switch-handle"></span>
                              </div>
                            </div>
                            <div className="profile-opt-row">
                              <span>🔔 Push Notifications</span>
                              <div
                                className="profile-switch is-on"
                                onClick={(e) => {
                                  e.currentTarget.classList.toggle("is-on");
                                  showPhoneToast("Notification preferences updated");
                                }}
                              >
                                <span className="profile-switch-handle"></span>
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              textAlign: "center",
                              padding: "0.4rem",
                              background: "var(--app-card)",
                              border: "1px solid var(--app-border)",
                              borderRadius: "8px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.5rem",
                                fontWeight: 700,
                                color: "#4E522C",
                              }}
                            >
                              100% Native Architecture
                            </span>
                            <p
                              style={{
                                fontSize: "0.45rem",
                                color: "var(--app-muted)",
                                margin: "2px 0 0",
                              }}
                            >
                              Swift &bull; Kotlin &bull; WooCommerce / Shopify API Bridge
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Native Bottom Sheet Modal */}
                  {activeSheetProduct && (
                    <div
                      className="app-mock-sheet-backdrop"
                      style={{ display: "flex" }}
                      onClick={(e) => {
                        if (e.target === e.currentTarget) {
                          setActiveSheetProduct(null);
                        }
                      }}
                    >
                      <div className="app-mock-sheet">
                        <div className="sheet-drag-handle"></div>
                        <div className="sheet-header-row">
                          <h4 className="sheet-title">{activeSheetProduct.name}</h4>
                          <button
                            type="button"
                            className="sheet-close-btn"
                            onClick={() => setActiveSheetProduct(null)}
                          >
                            &times;
                          </button>
                        </div>
                        <div className="sheet-artwork">{activeSheetProduct.art}</div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.48rem",
                              fontWeight: 700,
                              color: "var(--app-accent)",
                              textTransform: "uppercase",
                            }}
                          >
                            {activeSheetProduct.category}
                          </span>
                          <span
                            style={{
                              fontSize: "0.5rem",
                              fontWeight: 700,
                              color: "#F59E0B",
                            }}
                          >
                            ★ {activeSheetProduct.rating} ({activeSheetProduct.reviews} reviews)
                          </span>
                        </div>
                        <p className="sheet-desc">{activeSheetProduct.description}</p>
                        <div className="sheet-price-row">
                          <strong
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "var(--app-primary)",
                            }}
                          >
                            {activeSheetProduct.price}
                          </strong>
                          <button
                            type="button"
                            className="sheet-btn-add"
                            onClick={() => {
                              handleAddToCart(
                                activeSheetProduct.name,
                                activeSheetProduct.price,
                                activeSheetProduct.art
                              );
                              setActiveSheetProduct(null);
                            }}
                          >
                            Add to Bag &rarr;
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bottom Navigation */}
                  <nav
                    className="app-mock-bottom-nav"
                    style={{
                      backgroundColor: "var(--app-card)",
                      borderColor: "var(--app-border)",
                    }}
                  >
                    <div
                      className={`mock-nav-tab ${activeTab === "home" ? "is-active" : ""}`}
                      onClick={() => setActiveTab("home")}
                      title="Home"
                    >
                      <span className="mock-tab-icon">
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                        >
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                      </span>
                      <span className="mock-tab-label">Home</span>
                    </div>

                    <div
                      className={`mock-nav-tab ${activeTab === "shop" ? "is-active" : ""}`}
                      onClick={() => setActiveTab("shop")}
                      title="Shop"
                    >
                      <span className="mock-tab-icon">
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                        >
                          <rect x="3" y="3" width="7" height="7" />
                          <rect x="14" y="3" width="7" height="7" />
                          <rect x="14" y="14" width="7" height="7" />
                          <rect x="3" y="14" width="7" height="7" />
                        </svg>
                      </span>
                      <span className="mock-tab-label">Shop</span>
                    </div>

                    <div
                      className={`mock-nav-tab ${activeTab === "favorites" ? "is-active" : ""}`}
                      onClick={() => setActiveTab("favorites")}
                      title="Favorites"
                    >
                      <span className="mock-tab-icon">
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                        >
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                      </span>
                      <span className="mock-tab-label">Favorites</span>
                    </div>

                    <div
                      className={`mock-nav-tab ${activeTab === "cart" ? "is-active" : ""}`}
                      onClick={() => setActiveTab("cart")}
                      title="Cart"
                    >
                      <span className="mock-tab-icon">
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                        >
                          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                          <line x1="3" y1="6" x2="21" y2="6" />
                          <path d="M16 10a4 4 0 0 1-8 0" />
                        </svg>
                      </span>
                      <span className="mock-tab-label">Cart</span>
                    </div>

                    <div
                      className={`mock-nav-tab ${activeTab === "profile" ? "is-active" : ""}`}
                      onClick={() => setActiveTab("profile")}
                      title="Account"
                    >
                      <span className="mock-tab-icon">
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </span>
                      <span className="mock-tab-label">Account</span>
                    </div>
                  </nav>
                </div>
              </div>
            </main>
          </div>
        </div>
      </main>

      {/* Global Footer */}
      <footer className="app-footer">
        <div className="footer-inner">
          <div className="footer-top-grid">
            <div className="footer-col footer-col-brand">
              <Link href="/" className="brand-logo" aria-label="AppifyHub Home">
                <svg
                  className="brand-icon"
                  width="24"
                  height="24"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M16 3L3 27H11L16 17L21 27H29L16 3Z" fill="#78593D" />
                  <path d="M16 11L11.5 20H20.5L16 11Z" fill="#C2A88F" />
                </svg>
                <span className="brand-text">AppifyHub</span>
              </Link>
              <p className="brand-tagline">
                Turn your website into a powerful mobile experience.
              </p>
            </div>

            <div className="footer-col">
              <h4 className="footer-title">Product</h4>
              <ul className="footer-links">
                <li>
                  <Link href="/how-it-works">How It Works</Link>
                </li>
                <li>
                  <Link href="/themes">Themes</Link>
                </li>
                <li>
                  <Link href="/plans">Plans &amp; Add-ons</Link>
                </li>
                <li>
                  <Link href="/support">Support</Link>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <h4 className="footer-title">Platform</h4>
              <ul className="footer-links">
                <li>
                  <Link href="/signup?platform=wordpress">WordPress</Link>
                </li>
                <li>
                  <Link href="/signup?platform=woocommerce">WooCommerce</Link>
                </li>
                <li>
                  <Link href="/signup?platform=shopify">Shopify</Link>
                </li>
              </ul>
            </div>

            <div className="footer-col footer-col-social">
              <div className="social-icons">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-btn"
                  aria-label="Facebook"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-btn"
                  aria-label="Instagram"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-btn"
                  aria-label="YouTube"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z" />
                    <polygon
                      points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"
                      fill="#F5F1EB"
                    />
                  </svg>
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-btn"
                  aria-label="LinkedIn"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 2a2 2 0 1 1-2 2 2 2 0 0 1 2-2z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="footer-bottom-bar">
            <p className="copyright">
              &copy; 2026 AppifyHub. All rights reserved.
            </p>
            <div className="footer-legal">
              <a href="#privacy">Privacy Policy</a>
              <span className="sep">|</span>
              <a href="#terms">Terms &amp; Conditions</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
