"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { clearUserData } from "@/lib/user-data-store";

interface ThemeItem {
  id: number;
  name: string;
  slug: string;
  category: "minimal" | "modern" | "trendy";
  badge: string;
  formatted_price: string;
  description: string;
  image: string;
  features: string[];
  demo_url: string;
  details_url: string;
  bestFor: string;
  visualStyle: string;
  highlights: string;
}

const THEMES: ThemeItem[] = [
  {
    id: 1,
    name: "Minimal",
    slug: "minimal",
    category: "minimal",
    badge: "Minimal Style",
    formatted_price: "Included in Plan",
    description:
      "A clean, whitespace-focused mobile experience designed for minimalist online stores and lifestyle brands.",
    image: "/assets/images/theme_modern_minimalist.jpg",
    features: [
      "Clean Navigation",
      "Hero Product Display",
      "Category Carousels",
      "1-Tap Quick Cart",
      "Minimal Typography",
    ],
    demo_url: "/themes/minimal/demo",
    details_url: "/themes/minimal/demo",
    bestFor: "Minimal Stores & Brands",
    visualStyle: "Minimal Style",
    highlights: "Clean Navigation, Hero Product Display, Category Carousels",
  },
  {
    id: 6,
    name: "Modern",
    slug: "modern",
    category: "modern",
    badge: "Modern Style",
    formatted_price: "₹1,999",
    description:
      "A contemporary, refined mobile shopping experience with rich typography and curated storytelling layouts.",
    image: "/assets/images/theme_elegant_store.jpg",
    features: [
      "Editorial Typography",
      "Storytelling Layouts",
      "Curated Collections",
      "Refined Gallery Cards",
      "VIP Membership Sync",
    ],
    demo_url: "/themes/modern/demo",
    details_url: "/themes/modern/demo",
    bestFor: "Modern Stores & Brands",
    visualStyle: "Modern Style",
    highlights:
      "Editorial Typography, Storytelling Layouts, Curated Collections",
  },
  {
    id: 2,
    name: "Trendy",
    slug: "trendy",
    category: "trendy",
    badge: "Trendy Style",
    formatted_price: "₹1,499",
    description:
      "A bold, energetic high-contrast mobile design built for trending boutique fashion and beauty brands.",
    image: "/assets/images/theme_vibrant_commerce.jpg",
    features: [
      "Dynamic Hero Banners",
      "Lookbook Grid",
      "Instant Wishlist",
      "Discount Badges",
      "Size & Color Selector",
    ],
    demo_url: "/themes/trendy/demo",
    details_url: "/themes/trendy/demo",
    bestFor: "Trendy Stores & Brands",
    visualStyle: "Trendy Style",
    highlights: "Dynamic Hero Banners, Lookbook Grid, Instant Wishlist",
  },
  {
    id: 4,
    name: "Elite Dark Luxe",
    slug: "elite",
    category: "elite" as any,
    badge: "Premium Exclusive",
    formatted_price: "Included in Premium",
    description:
      "An ultra-premium obsidian dark theme with brushed amber-gold accents designed for luxury and high-ticket eCommerce.",
    image: "/assets/images/theme_modern_minimalist.jpg",
    features: [
      "Obsidian Dark Mode",
      "Brushed Gold Accents",
      "VIP Member Badges",
      "Haptic Micro-interactions",
      "Cinzel Luxury Typography",
    ],
    demo_url: "/themes/elite/demo",
    details_url: "/themes/elite/demo",
    bestFor: "Luxury Brands & Premium Stores",
    visualStyle: "Elite Luxe Style",
    highlights: "Obsidian Dark Mode, Gold Accents, VIP Member Badges",
  },
];

export default function ThemesPage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedThemeId, setSelectedThemeId] = useState<number | null>(null);
  const [lightboxTheme, setLightboxTheme] = useState<ThemeItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string>("");
  const [showToast, setShowToast] = useState<boolean>(false);

  // Set document title
  useEffect(() => {
    document.title = "App Themes | AppifyHub";
  }, []);

  // Toast trigger helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 2200);
  };

  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: authData } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiClient("/api/auth/me"),
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [queryClient]);

  const user = authData?.user;
  const isAdmin = Boolean(user?.is_super_admin || user?.email === "admin@webintoapp.com");

  const { data: appsData } = useQuery({
    queryKey: ["apps"],
    queryFn: async () => {
      try {
        const res = await apiClient("/api/apps");
        return Array.isArray(res) ? res : res.apps || [];
      } catch {
        return [];
      }
    },
    enabled: Boolean(user && !isAdmin),
  });

  const apps = appsData || [];
  const hasPreviouslyBuiltApps = Boolean(
    apps.length > 0 &&
    apps.some((a: any) => {
      const bList = a.builds || [];
      return (
        bList.length > 0 ||
        a.status === "live" ||
        a.status === "active" ||
        a.status === "building" ||
        a.status === "paid" ||
        a.setup_step === "build"
      );
    })
  );

  const dashboardHref = apps.length > 0 ? "/dashboard" : "/dashboard/apps/new";

  const handleLogout = async () => {
    try {
      clearUserData();
      await apiClient("/api/auth/logout", { method: "POST" });
    } finally {
      queryClient.setQueryData(["auth", "me"], { user: null });
      queryClient.removeQueries({ queryKey: ["auth", "me"] });
      window.location.reload();
    }
  };

  // Select Theme handler: saves selection and redirects
  const handleSelectTheme = (theme: ThemeItem) => {
    setSelectedThemeId(theme.id);
    try {
      localStorage.setItem(
        "appifyhub_selected_theme",
        JSON.stringify({
          id: theme.id,
          name: theme.name,
          slug: theme.slug,
          price: theme.formatted_price,
          badge: theme.badge,
          selectedByUser: true,
        })
      );
    } catch {
      // Ignore if localStorage unavailable
    }

    if (user) {
      if (isAdmin) {
        triggerToast("Super Admin oversight active. Redirecting to Filament Admin...");
        window.location.href = "http://localhost:8000/admin";
        return;
      } else {
        triggerToast(`Selected ${theme.name}! Opening app builder...`);
        router.push(`/dashboard/apps/new?theme=${theme.slug}`);
      }
    } else {
      triggerToast(`Selected ${theme.name}! Redirecting to create account...`);
      router.push(`/signup?theme=${theme.slug}`);
    }
  };

  // Filtered themes list
  const filteredThemes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return THEMES.filter((theme) => {
      const matchesCategory =
        activeCategory === "all" || theme.category === activeCategory;
      const matchesSearch =
        !q ||
        theme.name.toLowerCase().includes(q) ||
        theme.description.toLowerCase().includes(q) ||
        theme.category.toLowerCase().includes(q) ||
        theme.features.some((f) => f.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  // Handle escape key to close lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxTheme(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Prevent background scroll when lightbox open
  useEffect(() => {
    if (lightboxTheme) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [lightboxTheme]);

  return (
    <div className="themes-marketplace-wrapper">
      {/* ===================================================
          1. TOP GLOBAL HEADER
          =================================================== */}
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
            <Link href="/pricing" className="nav-link">
              Pricing
            </Link>
            <Link href="/support" className="nav-link">
              Support
            </Link>
          </nav>

          <div className="header-actions" style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            {user ? (
              <>
                <Link
                  href={isAdmin ? "http://localhost:8000/admin" : dashboardHref}
                  className="btn-outline"
                >
                  <span>{isAdmin ? "Admin Oversight" : apps.length > 0 ? "Dashboard" : "Create App"}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-text"
                  style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </header>

      {/* ===================================================
          2. MAIN CONTENT
          =================================================== */}
      <main className="page-body">
        {/* ─── 1. HERO SECTION ─── */}
        <section className="themes-hero-section">
          <div className="themes-container">
            <div className="themes-hero-content">
              <div className="themes-eyebrow-pill">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span>APP TEMPLATE MARKETPLACE</span>
              </div>
              <h1 className="themes-hero-title">
                Choose Your <em>App Experience</em>
              </h1>
              <p className="themes-hero-subheading">
                Select a professionally designed mobile app theme that matches
                your brand, business and customers.
              </p>
              <p className="themes-hero-lead">
                Every theme is optimized for mobile and can be customized with
                your branding, content and selected features.
              </p>
            </div>

            {/* Filters & Search Bar */}
            <div className="themes-filter-search-toolbar">
              <div className="themes-category-filters" id="themeCategoryFilters">
                <button
                  type="button"
                  className={`filter-pill ${activeCategory === "all" ? "is-active" : ""}`}
                  onClick={() => {
                    setActiveCategory("all");
                    triggerToast("Category: All Themes");
                  }}
                >
                  All Themes
                </button>
                <button
                  type="button"
                  className={`filter-pill ${activeCategory === "minimal" ? "is-active" : ""}`}
                  onClick={() => {
                    setActiveCategory("minimal");
                    triggerToast("Category: Minimal");
                  }}
                >
                  Minimal
                </button>
                <button
                  type="button"
                  className={`filter-pill ${activeCategory === "modern" ? "is-active" : ""}`}
                  onClick={() => {
                    setActiveCategory("modern");
                    triggerToast("Category: Modern");
                  }}
                >
                  Modern
                </button>
                <button
                  type="button"
                  className={`filter-pill ${activeCategory === "trendy" ? "is-active" : ""}`}
                  onClick={() => {
                    setActiveCategory("trendy");
                    triggerToast("Category: Trendy");
                  }}
                >
                  Trendy
                </button>
                <button
                  type="button"
                  className={`filter-pill ${activeCategory === "elite" ? "is-active" : ""}`}
                  onClick={() => {
                    setActiveCategory("elite");
                    triggerToast("Category: Elite Dark Luxe (Premium Exclusive)");
                  }}
                >
                  Elite (Premium)
                </button>
              </div>

              <div className="themes-search-input-wrap">
                <svg
                  className="search-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  id="themeSearchInput"
                  className="theme-search-input"
                  placeholder="Search themes by name, style or feature..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ─── 2. THEME MARKETPLACE GRID ─── */}
        <section className="themes-grid-section" id="themeCatalog">
          <div className="themes-container">
            {/* Admin Policy Notice */}
            <div
              style={{
                background: "rgba(254, 243, 199, 0.6)",
                border: "1px solid #FCD34D",
                borderRadius: "16px",
                padding: "1rem 1.25rem",
                marginBottom: "2rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                fontSize: "0.85rem",
                color: "#78350F",
              }}
            >
              <span style={{ fontSize: "1.25rem" }}>👑</span>
              <div>
                <strong>Website Admin Theme Policy:</strong> The official free mobile theme is assigned directly by the Website Administrator. Standard users cannot change or swap themes. Theme switching and the exclusive 4th theme (<em>Elite Dark Luxe</em>) are unlocked on the <strong>Premium Plan</strong> or via Admin assignment.
              </div>
            </div>

            {filteredThemes.length > 0 ? (
              <div className="themes-marketplace-grid" id="themesMarketplaceGrid">
                {filteredThemes.map((theme) => {
                  const isSelected = selectedThemeId === theme.id;
                  return (
                    <article
                      key={theme.id}
                      className={`theme-card-block ${isSelected ? "is-selected" : ""}`}
                      data-theme-id={theme.id}
                      data-theme-name={theme.name}
                      data-category={theme.category}
                      onClick={() => handleSelectTheme(theme)}
                    >
                      {/* Visual Preview Frame */}
                      <div className="theme-card-media-wrap">
                        <div
                          className="theme-preview-link"
                          style={{ cursor: "pointer" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxTheme(theme);
                          }}
                        >
                          <Image
                            src={theme.image}
                            alt={`${theme.name} Mobile App Theme Preview`}
                            className="theme-preview-img"
                            width={600}
                            height={375}
                            priority={theme.id === 1}
                            unoptimized
                          />

                          <div className="theme-preview-overlay">
                            <div
                              style={{
                                display: "flex",
                                gap: "0.6rem",
                                alignItems: "center",
                                flexWrap: "wrap",
                                justifyContent: "center",
                                padding: "0.5rem",
                              }}
                            >
                              <span
                                className="overlay-badge"
                                style={{ cursor: "pointer" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLightboxTheme(theme);
                                }}
                              >
                                <svg
                                  width="15"
                                  height="15"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.2"
                                >
                                  <circle cx="11" cy="11" r="8" />
                                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                <span>Preview</span>
                              </span>
                              <Link
                                href={theme.demo_url}
                                className="overlay-badge"
                                style={{
                                  background: "#403A32",
                                  color: "#FFF",
                                  textDecoration: "none",
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg
                                  width="15"
                                  height="15"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.2"
                                >
                                  <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                                <span>Live Demo</span>
                              </Link>
                            </div>
                          </div>
                        </div>

                        <span className="theme-floating-badge">
                          {theme.badge}
                        </span>
                      </div>

                      {/* Card Info & Content */}
                      <div className="theme-card-body">
                        <div className="theme-card-meta-row">
                          <span className="theme-category-tag">
                            {theme.category.toUpperCase()}
                          </span>
                          <span className="theme-price-tag">
                            {theme.formatted_price}
                          </span>
                        </div>

                        <h2 className="theme-card-title">
                          <Link
                            href={theme.demo_url}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {theme.name}
                          </Link>
                        </h2>

                        <p className="theme-card-desc">{theme.description}</p>

                        {/* Key Feature Chips */}
                        <div className="theme-features-chips">
                          {theme.features.slice(0, 4).map((feat, fIdx) => (
                            <span key={fIdx} className="feature-chip">
                              &bull; {feat}
                            </span>
                          ))}
                        </div>

                        {/* Card Action Buttons */}
                        <div className="theme-card-actions-row">
                          <Link
                            href={theme.demo_url}
                            className="btn-theme-demo"
                            title="Try interactive demo"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                            >
                              <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                            <span>Live Demo</span>
                          </Link>

                          <div className="theme-select-form">
                            <button
                              type="button"
                              className={`btn-theme-select ${isSelected ? "is-active-btn" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectTheme(theme);
                              }}
                            >
                              <span>
                                {isSelected ? "Selected ✓" : "Select Theme"}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              /* Empty Search State */
              <div className="themes-empty-state" id="themesEmptyState">
                <span className="empty-icon">&#128269;</span>
                <h3>No matching themes found</h3>
                <p>
                  Try searching with another keyword or select &quot;All&quot; to
                  view all available themes.
                </p>
                <button
                  type="button"
                  className="btn-theme-reset"
                  onClick={() => {
                    setActiveCategory("all");
                    setSearchQuery("");
                  }}
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ─── 3. THEME COMPARISON SECTION ─── */}
        <section className="themes-comparison-section">
          <div className="themes-container">
            <div className="comparison-header-center">
              <span className="comparison-eyebrow">QUICK COMPARISON</span>
              <h2 className="comparison-heading">
                Find the Right Theme for Your Business
              </h2>
              <p className="comparison-sub">
                Compare styles, target industries, and native capabilities
                across our designs.
              </p>
            </div>

            <div className="comparison-table-card">
              <div className="table-responsive-wrapper">
                <table className="themes-compare-table">
                  <thead>
                    <tr>
                      <th>Theme Name</th>
                      <th>Best For</th>
                      <th>Visual Style</th>
                      <th>Key Highlights</th>
                      <th>Price</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {THEMES.map((theme) => {
                      const isSelected = selectedThemeId === theme.id;
                      return (
                        <tr key={theme.id}>
                          <td className="theme-name-cell">
                            <strong>{theme.name}</strong>
                            <span className="theme-cat-sub">{theme.name}</span>
                          </td>
                          <td>{theme.bestFor}</td>
                          <td>{theme.visualStyle}</td>
                          <td className="highlights-cell">
                            {theme.highlights}
                          </td>
                          <td className="price-cell">
                            <strong>{theme.formatted_price}</strong>
                          </td>
                          <td className="actions-cell">
                            <div className="table-actions-wrap">
                              <Link
                                href={theme.demo_url}
                                className="btn-tbl-demo"
                              >
                                Demo
                              </Link>
                              <button
                                type="button"
                                className="btn-tbl-select"
                                onClick={() => handleSelectTheme(theme)}
                              >
                                {isSelected ? "Selected ✓" : "Select"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 4. FINAL CALL TO ACTION ─── */}
        <section className="themes-final-cta-section">
          <div className="themes-container">
            <div className="themes-cta-card">
              <span className="themes-eyebrow-accent">READY TO LAUNCH</span>
              <h2 className="themes-cta-title">Found Your Style?</h2>
              <p className="themes-cta-lead">
                Choose a theme that fits your business, customize the features you
                need, and continue building your mobile app.
              </p>
              <div className="themes-cta-actions">
                <a href="#themeCatalog" className="btn-hiw-secondary">
                  <span>Choose a Theme &uarr;</span>
                </a>
                <Link href="/signup" className="btn-hiw-primary">
                  <span>Start With My Website &rarr;</span>
                </Link>
              </div>
              <div className="themes-cta-guarantee">
                <span>WordPress &middot; WooCommerce &middot; Shopify Compatible</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ===================================================
          3. QUICK PREVIEW LIGHTBOX MODAL
          =================================================== */}
      {lightboxTheme && (
        <div
          className="theme-lightbox-modal"
          id="themeLightboxModal"
          style={{ display: "flex" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setLightboxTheme(null);
            }
          }}
        >
          <div className="theme-lightbox-dialog">
            <button
              type="button"
              className="lightbox-close-btn"
              onClick={() => setLightboxTheme(null)}
              aria-label="Close Preview"
            >
              &times;
            </button>
            <div className="theme-lightbox-body">
              <div className="theme-lightbox-media">
                <Image
                  src={lightboxTheme.image}
                  alt={`${lightboxTheme.name} Theme Preview`}
                  className="lightbox-preview-img"
                  width={600}
                  height={400}
                  unoptimized
                />
              </div>
              <div className="theme-lightbox-info">
                <div className="lightbox-badge-row">
                  <span className="lightbox-cat-tag">
                    {lightboxTheme.category.toUpperCase()}
                  </span>
                  {lightboxTheme.badge && (
                    <span
                      className="lightbox-badge-tag"
                      style={{ display: "inline-block" }}
                    >
                      {lightboxTheme.badge}
                    </span>
                  )}
                </div>
                <h3 className="lightbox-title">{lightboxTheme.name}</h3>
                <p className="lightbox-desc">{lightboxTheme.description}</p>

                <div className="lightbox-price-box">
                  <span className="lightbox-price-label">Price</span>
                  <strong className="lightbox-price-val">
                    {lightboxTheme.formatted_price}
                  </strong>
                </div>

                <div className="lightbox-features-wrap">
                  <h4>Included Native Features</h4>
                  <ul className="lightbox-features-list">
                    {lightboxTheme.features.map((feat, fIdx) => (
                      <li key={fIdx}>{feat}</li>
                    ))}
                  </ul>
                </div>

                <div className="lightbox-actions-row">
                  <Link
                    href={lightboxTheme.demo_url}
                    className="btn-theme-demo"
                    style={{
                      flex: 1,
                      justifyContent: "center",
                      padding: "0.75rem 1rem",
                    }}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                    >
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <span>Launch Live Demo</span>
                  </Link>

                  <div style={{ flex: 1 }}>
                    <button
                      type="button"
                      className="btn-theme-select"
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        justifyContent: "center",
                      }}
                      onClick={() => {
                        handleSelectTheme(lightboxTheme);
                        setLightboxTheme(null);
                      }}
                    >
                      <span>
                        {selectedThemeId === lightboxTheme.id
                          ? "Selected ✓"
                          : "Select Theme"}
                      </span>
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: "0.75rem", textAlign: "center" }}>
                  <Link
                    href={lightboxTheme.demo_url}
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                      textDecoration: "underline",
                    }}
                  >
                    View Full Specifications &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          4. FLOATING MARKETPLACE TOAST
          =================================================== */}
      <div
        className={`theme-market-toast ${showToast ? "is-show" : ""}`}
        id="themeMarketToast"
      >
        <span className="market-toast-icon">&check;</span>
        <span id="themeMarketToastText">{toastMessage}</span>
      </div>

      {/* ===================================================
          5. GLOBAL FOOTER
          =================================================== */}
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
