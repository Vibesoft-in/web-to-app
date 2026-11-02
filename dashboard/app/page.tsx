"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { clearUserData } from "@/lib/user-data-store";

export default function HomePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isYearly, setIsYearly] = useState(false);

  const { data: authData } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiClient("/api/auth/me"),
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const handlePageShow = () => {
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
  const isAppDraft = (appItem: any) => {
    const builds = appItem?.builds || [];
    const hasReadyBuild = builds.some((b: any) => b.is_ready || b.status === "ready");
    return Boolean(
      !appItem?.is_completed &&
      !hasReadyBuild &&
      appItem?.status !== "completed" &&
      appItem?.status !== "live" &&
      appItem?.status !== "active"
    );
  };

  const hasPreviouslyBuiltApps = Boolean(
    user?.has_built_apps ||
    (apps.length > 0 && apps.some((a: any) => !isAppDraft(a)))
  );

  const latestDraft = user?.latest_draft || apps.find((a: any) => isAppDraft(a));
  const draftHref = latestDraft?.ulid
    ? `/dashboard/apps/${latestDraft.ulid}/setup/${latestDraft.setup_step || "platform"}`
    : "/dashboard/apps/new";

  const primaryTargetHref = hasPreviouslyBuiltApps ? "/dashboard" : draftHref;

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

  const convertTargetHref = user
    ? isAdmin
      ? "http://localhost:8000/admin"
      : primaryTargetHref
    : "/signup";

  return (
    <div className="home-page-root">
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
            <Link href="/" className="nav-link active">
              Home
            </Link>
            <Link href="/how-it-works" className="nav-link">
              How It Works
            </Link>
            <Link href="/themes" className="nav-link">
              Themes
            </Link>
            <Link href="/pricing" className="nav-link">
              Pricing
            </Link>
            <Link href="/support" className="nav-link">
              Support
            </Link>
          </nav>

          <div className="header-actions">
            {user ? (
              <>
                <Link
                  href={isAdmin ? "http://localhost:8000/admin" : primaryTargetHref}
                  className="btn-outline"
                >
                  <span>
                    {isAdmin
                      ? "Admin Oversight"
                      : hasPreviouslyBuiltApps
                      ? "Dashboard"
                      : latestDraft
                      ? "Resume App"
                      : "Create App"}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-text"
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
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
          2. MAIN PAGE CONTENT
          =================================================== */}
      <main className="page-body">
        <div className="home-page-wrapper">
          {/* ─── 1. HERO SECTION ─── */}
          <section className="hero-section">
            <div className="hero-container">
              <div className="hero-content">
                <span className="eyebrow-tag">WEBSITE &rarr; MOBILE APP</span>
                <h1 className="hero-heading">
                  Your Website.
                  <br />
                  Now in an <em>App</em>.
                </h1>
                <p className="hero-description">
                  Turn your WordPress, WooCommerce or Shopify website into a beautiful
                  mobile app &mdash; quickly, easily and without coding.
                </p>
                <div className="hero-action">
                  <Link href={convertTargetHref} className="btn-action-pill">
                    <span>Convert My Website</span>
                    <svg
                      width="15"
                      height="15"
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
            </div>
          </section>

          {/* ─── 2. PLATFORMS & TRUST ECOSYSTEM SECTION ─── */}
          <section className="trust-platforms-section">
            <div className="trust-platforms-container">
              {/* Section Eyebrow */}
              <div className="trust-intro-bar">
                <span className="trust-eyebrow">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Supported Platforms &amp; Native Sync
                </span>
              </div>

              {/* Platforms Row: 3 Elevated Interactive Cards */}
              <div className="platforms-cards-strip">
                {/* WordPress Card */}
                <Link
                  href={
                    user
                      ? isAdmin
                        ? "http://localhost:8000/admin"
                        : "/dashboard/apps/new?platform=woo"
                      : "/signup?platform=wordpress"
                  }
                  className="platform-pill-card platform-pill-card-wp"
                  style={{ textDecoration: "none", color: "inherit", display: "flex" }}
                >
                  <div className="platform-main-info">
                    <div className="platform-logo-badge">
                      <img
                        src="/assets/icons/wordpress.svg"
                        alt="WordPress Logo"
                        className="platform-logo-img platform-logo-wordpress"
                        width={34}
                        height={34}
                      />
                    </div>
                    <div className="platform-details">
                      <span className="platform-name">WordPress</span>
                      <span className="platform-sub">Any WordPress Website</span>
                    </div>
                  </div>
                  <span className="platform-badge-pill">Native Sync</span>
                </Link>

                {/* WooCommerce Card */}
                <Link
                  href={
                    user
                      ? isAdmin
                        ? "http://localhost:8000/admin"
                        : "/dashboard/apps/new?platform=woo"
                      : "/signup?platform=woocommerce"
                  }
                  className="platform-pill-card platform-pill-card-woo"
                  style={{ textDecoration: "none", color: "inherit", display: "flex" }}
                >
                  <div className="platform-main-info">
                    <div className="platform-logo-badge">
                      <img
                        src="/assets/icons/woocommerce.svg"
                        alt="WooCommerce Logo"
                        className="platform-logo-img platform-logo-woocommerce"
                        width={44}
                        height={28}
                      />
                    </div>
                    <div className="platform-details">
                      <span className="platform-name">WooCommerce</span>
                      <span className="platform-sub">Your Online Store</span>
                    </div>
                  </div>
                  <span className="platform-badge-pill">Store Engine</span>
                </Link>

                {/* Shopify Card */}
                <Link
                  href={
                    user
                      ? isAdmin
                        ? "http://localhost:8000/admin"
                        : "/dashboard/apps/new?platform=shopify"
                      : "/signup?platform=shopify"
                  }
                  className="platform-pill-card platform-pill-card-shopify"
                  style={{ textDecoration: "none", color: "inherit", display: "flex" }}
                >
                  <div className="platform-main-info">
                    <div className="platform-logo-badge">
                      <img
                        src="/assets/icons/shopify.svg"
                        alt="Shopify Logo"
                        className="platform-logo-img platform-logo-shopify"
                        width={30}
                        height={36}
                      />
                    </div>
                    <div className="platform-details">
                      <span className="platform-name">Shopify</span>
                      <span className="platform-sub">Your Shopify Store</span>
                    </div>
                  </div>
                  <span className="platform-badge-pill">Direct Connect</span>
                </Link>
              </div>
            </div>
          </section>

          {/* ─── 3. WHY CHOOSE APPIFYHUB SECTION ─── */}
          <section className="why-choose-section" id="why-choose">
            <div className="why-choose-container">
              {/* Section Header */}
              <div className="why-choose-header">
                <div className="why-choose-eyebrow-row">
                  <span className="why-choose-eyebrow-line" />
                  <span className="why-choose-eyebrow-pill">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    WHY CHOOSE US
                  </span>
                  <span className="why-choose-eyebrow-line" />
                </div>
                <h2 className="why-choose-title">
                  Why Choose <em>AppifyHub</em>?
                </h2>
              </div>

              {/* Content Layout: 3D Visual on Left, 6 Compact Cards Grid on Right */}
              <div className="why-choose-content-layout">
                {/* Left Visual Showcase Column */}
                <div className="why-choose-visual-col">
                  <div className="why-visual-frame">
                    <div className="why-visual-inner">
                      <img
                        src="/assets/images/why_choose_devices.jpg"
                        alt="Seamless Website and Mobile App Synchronization"
                        className="why-visual-img"
                        loading="lazy"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Cards Grid: 2 columns x 3 rows */}
                <div className="why-choose-cards-grid">
                  {/* Card 01 */}
                  <div className="why-card">
                    <div className="why-card-icon-wrap">
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
                        <ellipse cx="12" cy="5" rx="9" ry="3" />
                        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                      </svg>
                    </div>
                    <div className="why-card-body">
                      <div className="why-card-header">
                        <span className="why-card-num">01</span>
                        <h3 className="why-card-title">Same Database</h3>
                      </div>
                      <p className="why-card-desc">Live database sync with zero delays.</p>
                    </div>
                  </div>

                  {/* Card 02 */}
                  <div className="why-card">
                    <div className="why-card-icon-wrap">
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
                        <rect x="2" y="4" width="20" height="12" rx="2" />
                        <line x1="2" y1="20" x2="22" y2="20" />
                      </svg>
                    </div>
                    <div className="why-card-body">
                      <div className="why-card-header">
                        <span className="why-card-num">02</span>
                        <h3 className="why-card-title">Independent App Experience</h3>
                      </div>
                      <p className="why-card-desc">Web updates never alter your mobile app.</p>
                    </div>
                  </div>

                  {/* Card 03 */}
                  <div className="why-card">
                    <div className="why-card-icon-wrap">
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
                        <path d="M4 8h4v-2a2 2 0 1 1 4 0v2h4a2 2 0 0 1 2 2v4h-2a2 2 0 1 0 0 4h2v4a2 2 0 0 1-2 2h-4v-2a2 2 0 1 0-4 0v2H4a2 2 0 0 1-2-2v-4h2a2 2 0 1 0 0-4H2v-4a2 2 0 0 1 2-2z" />
                      </svg>
                    </div>
                    <div className="why-card-body">
                      <div className="why-card-header">
                        <span className="why-card-num">03</span>
                        <h3 className="why-card-title">Add Features Your Way</h3>
                      </div>
                      <p className="why-card-desc">Push alerts, WhatsApp, loyalty and coupons.</p>
                    </div>
                  </div>

                  {/* Card 04 */}
                  <div className="why-card">
                    <div className="why-card-icon-wrap">
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
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </div>
                    <div className="why-card-body">
                      <div className="why-card-header">
                        <span className="why-card-num">04</span>
                        <h3 className="why-card-title">We Check Before We Build</h3>
                      </div>
                      <p className="why-card-desc">Deep audit for seamless app compatibility.</p>
                    </div>
                  </div>

                  {/* Card 05 */}
                  <div className="why-card">
                    <div className="why-card-icon-wrap">
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
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                    </div>
                    <div className="why-card-body">
                      <div className="why-card-header">
                        <span className="why-card-num">05</span>
                        <h3 className="why-card-title">App-Ready Setup</h3>
                      </div>
                      <p className="why-card-desc">API tuning and speed optimization.</p>
                    </div>
                  </div>

                  {/* Card 06 */}
                  <div className="why-card">
                    <div className="why-card-icon-wrap">
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
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </div>
                    <div className="why-card-body">
                      <div className="why-card-header">
                        <span className="why-card-num">06</span>
                        <h3 className="why-card-title">Built Around Your Business</h3>
                      </div>
                      <p className="why-card-desc">Modern themes tailored to your brand.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ─── 4. VERIFIED TRACK RECORD SECTION ─── */}
          <section className="verified-metrics-section">
            <div className="verified-metrics-container">
              {/* Subtle Section Divider */}
              <div className="trust-subtle-divider">
                <span className="trust-divider-line" />
                <span className="trust-divider-chip">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  Verified Track Record
                </span>
                <span className="trust-divider-line" />
              </div>

              {/* Impact Metrics Row: 4 Balanced Cards */}
              <div className="metrics-grid">
                {/* Stat 1 */}
                <div className="metric-box">
                  <div className="metric-icon-wrap">
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                      <line x1="12" y1="18" x2="12.01" y2="18" />
                    </svg>
                  </div>
                  <span className="metric-number">
                    2,500<span className="metric-accent">+</span>
                  </span>
                  <span className="metric-label">Mobile Apps Built</span>
                  <span className="metric-sub">Android &amp; iOS Apps</span>
                </div>

                {/* Stat 2 */}
                <div className="metric-box">
                  <div className="metric-icon-wrap">
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <polyline points="9 12 11 14 15 10" />
                    </svg>
                  </div>
                  <span className="metric-number">
                    99.8<span className="metric-accent">%</span>
                  </span>
                  <span className="metric-label">Store Approval Rate</span>
                  <span className="metric-sub">Google &amp; Apple Compliant</span>
                </div>

                {/* Stat 3 */}
                <div className="metric-box">
                  <div className="metric-icon-wrap">
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      <polyline points="17 6 23 6 23 12" />
                    </svg>
                  </div>
                  <span className="metric-number">
                    3.4<span className="metric-accent">x</span>
                  </span>
                  <span className="metric-label">Conversion Boost</span>
                  <span className="metric-sub">Vs. Mobile Browser</span>
                </div>

                {/* Stat 4 */}
                <div className="metric-box">
                  <div className="metric-icon-wrap">
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </div>
                  <span className="metric-number">
                    <span className="metric-accent">&lt;</span> 15
                    <span className="metric-accent">m</span>
                  </span>
                  <span className="metric-label">Average Setup Time</span>
                  <span className="metric-sub">Zero Code Required</span>
                </div>
              </div>
            </div>
          </section>

          {/* ─── 5. HOW IT WORKS SECTION ─── */}
          <section className="how-it-works-section" id="how-it-works">
            <div className="how-container">
              {/* Left Lifestyle Visual */}
              <div className="how-visual">
                <div className="how-image-frame">
                  <img
                    src="/assets/images/how_it_works_converter.png"
                    alt="From Website to App illustration showing laptop converting to mobile app"
                    className="img-responsive"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Right Step Process */}
              <div className="how-content">
                <span className="eyebrow-tag">HOW IT WORKS</span>
                <h2 className="section-heading">
                  From Website to App
                  <br />
                  in Simple Steps
                </h2>

                <div className="steps-timeline">
                  {/* Step 01 */}
                  <div className="step-card is-visible">
                    <div className="step-marker">
                      <div className="step-icon-bubble">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#78593D"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                      </div>
                    </div>
                    <div className="step-number">01</div>
                    <div className="step-text">
                      <h3 className="step-title">Enter Website</h3>
                      <p className="step-desc">Add your existing website URL.</p>
                    </div>
                  </div>

                  {/* Step 02 */}
                  <div className="step-card is-visible">
                    <div className="step-marker">
                      <div className="step-icon-bubble">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#78593D"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                      </div>
                    </div>
                    <div className="step-number">02</div>
                    <div className="step-text">
                      <h3 className="step-title">Analyze</h3>
                      <p className="step-desc">We check your website's compatibility.</p>
                    </div>
                  </div>

                  {/* Step 03 */}
                  <div className="step-card is-visible">
                    <div className="step-marker">
                      <div className="step-icon-bubble">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#78593D"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="13.5" cy="6.5" r=".5" fill="#78593D" />
                          <circle cx="17.5" cy="10.5" r=".5" fill="#78593D" />
                          <circle cx="8.5" cy="7.5" r=".5" fill="#78593D" />
                          <circle cx="6.5" cy="12.5" r=".5" fill="#78593D" />
                          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="step-number">03</div>
                    <div className="step-text">
                      <h3 className="step-title">Choose Theme</h3>
                      <p className="step-desc">Select a design and features for your app.</p>
                    </div>
                  </div>

                  {/* Step 04 */}
                  <div className="step-card is-visible">
                    <div className="step-marker">
                      <div className="step-icon-bubble">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#78593D"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                          <line x1="1" y1="10" x2="23" y2="10" />
                        </svg>
                      </div>
                    </div>
                    <div className="step-number">04</div>
                    <div className="step-text">
                      <h3 className="step-title">Make Payment</h3>
                      <p className="step-desc">Complete your order securely.</p>
                    </div>
                  </div>

                  {/* Step 05 */}
                  <div className="step-card is-visible">
                    <div className="step-marker">
                      <div className="step-icon-bubble">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#78593D"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                          <line x1="12" y1="18" x2="12.01" y2="18" />
                        </svg>
                      </div>
                    </div>
                    <div className="step-number">05</div>
                    <div className="step-text">
                      <h3 className="step-title">Get Your App</h3>
                      <p className="step-desc">Receive your Android &amp; iOS app.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ─── 6. NATIVE CAPABILITIES & FEATURES GRID ─── */}
          <section className="features-grid-section" id="features">
            <div className="features-container">
              <div className="features-header text-center">
                <span className="eyebrow-tag">BUILT FOR MOBILE PERFORMANCE</span>
                <h2 className="section-heading">Everything You Need in a Native App</h2>
                <p className="section-subheading">
                  Don't settle for sluggish web wrappers. AppifyHub builds high-speed,
                  native mobile experiences that elevate your brand and drive repeat purchases.
                </p>
              </div>

              <div className="features-grid">
                {/* Feature 1 */}
                <div className="feature-card">
                  <div className="feature-icon-box">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#78593D"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>
                  <span className="feature-badge">70% Open Rate</span>
                  <h3 className="feature-title">Instant Push Notifications</h3>
                  <p className="feature-desc">
                    Re-engage cart abandoners and send personalized alerts for flash sales,
                    back-in-stock items, and order updates straight to user lockscreens.
                  </p>
                </div>

                {/* Feature 2 */}
                <div className="feature-card">
                  <div className="feature-icon-box">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#78593D"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 004 11m0 0a8 8 0 008 8c.706 0 1.396-.062 2.064-.18" />
                    </svg>
                  </div>
                  <span className="feature-badge">1-Tap Login</span>
                  <h3 className="feature-title">Biometric Authentication</h3>
                  <p className="feature-desc">
                    Frictionless FaceID and Fingerprint access allows return shoppers to browse
                    and check out instantly without typing passwords.
                  </p>
                </div>

                {/* Feature 3 */}
                <div className="feature-card">
                  <div className="feature-icon-box">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#78593D"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="23 4 23 10 17 10" />
                      <polyline points="1 20 1 14 7 14" />
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                  </div>
                  <span className="feature-badge">Bidirectional</span>
                  <h3 className="feature-title">Real-Time Catalog Sync</h3>
                  <p className="feature-desc">
                    All products, inventories, pricing, discounts, and customer orders stay in
                    synchronized lockstep with your website database.
                  </p>
                </div>

                {/* Feature 4 */}
                <div className="feature-card">
                  <div className="feature-icon-box">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#78593D"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                    </svg>
                  </div>
                  <span className="feature-badge">60fps Smooth</span>
                  <h3 className="feature-title">Offline Browsing &amp; Cache</h3>
                  <p className="feature-desc">
                    Smart client caching ensures fast navigation, smooth animations, and product
                    catalog browsing even with intermittent mobile signals.
                  </p>
                </div>

                {/* Feature 5 */}
                <div className="feature-card">
                  <div className="feature-icon-box">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#78593D"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                  </div>
                  <span className="feature-badge">3x Conversion</span>
                  <h3 className="feature-title">Native 1-Click Checkout</h3>
                  <p className="feature-desc">
                    Streamlined checkout with support for Apple Pay, Google Pay, Razorpay, Stripe,
                    and saved addresses dramatically slashes checkout abandonment.
                  </p>
                </div>

                {/* Feature 6 */}
                <div className="feature-card">
                  <div className="feature-icon-box">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#78593D"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <span className="feature-badge">99.8% Passed</span>
                  <h3 className="feature-title">App Store &amp; Play Store Ready</h3>
                  <p className="feature-desc">
                    Receive fully compliant Google Play (.aab) and iOS (.ipa) builds with
                    end-to-end guidance to guarantee immediate marketplace approval.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ─── 7. CHOOSE A THEME SECTION ─── */}
          <section className="theme-showcase-section" id="themes">
            <div className="theme-showcase-container">
              <div className="theme-content">
                <span className="eyebrow-tag">SAME DATA, DIFFERENT STYLES.</span>
                <h2 className="section-heading">
                  Choose a Theme
                  <br />
                  That Fits Your Brand.
                </h2>
                <p className="theme-description">
                  Your website content, products and data remain the same. Select a design style
                  that matches your business.
                </p>
                <div className="theme-action">
                  <Link href="/themes" className="btn-action-pill">
                    <span>Explore Themes</span>
                    <svg
                      width="15"
                      height="15"
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

              <div className="theme-visual">
                <div className="theme-image-wrapper">
                  <img
                    src="/assets/images/theme_phones_showcase.jpg"
                    alt="Three mobile app theme styles Minimal, Modern, and Trendy"
                    className="img-responsive theme-img"
                    loading="lazy"
                  />
                  {/* Clickable phone hotspots directly on the visual */}
                  <div className="theme-phones-hotspots" aria-label="Interactive Phone Themes">
                    <Link
                      href="/themes?theme=minimal"
                      className="theme-phone-hotspot"
                      aria-label="View Minimal Theme"
                      title="View Minimal Theme"
                    />
                    <Link
                      href="/themes?theme=modern"
                      className="theme-phone-hotspot"
                      aria-label="View Modern Theme"
                      title="View Modern Theme"
                    />
                    <Link
                      href="/themes?theme=trendy"
                      className="theme-phone-hotspot"
                      aria-label="View Trendy Theme"
                      title="View Trendy Theme"
                    />
                  </div>
                </div>
                {/* Interactive Pills corresponding to the 3 themes */}
                <div className="theme-pill-tags">
                  <Link
                    href="/themes?theme=minimal"
                    className="theme-pill theme-pill-interactive"
                    aria-label="Explore Minimal Theme"
                    title="Explore Minimal Theme"
                  >
                    <span>Minimal</span>
                  </Link>
                  <Link
                    href="/themes?theme=modern"
                    className="theme-pill theme-pill-interactive"
                    aria-label="Explore Modern Theme"
                    title="Explore Modern Theme"
                  >
                    <span>Modern</span>
                  </Link>
                  <Link
                    href="/themes?theme=trendy"
                    className="theme-pill theme-pill-interactive"
                    aria-label="Explore Trendy Theme"
                    title="Explore Trendy Theme"
                  >
                    <span>Trendy</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* ─── 8. NATIVE APP VS MOBILE BROWSER COMPARISON ─── */}
          <section className="comparison-section" id="comparison">
            <div className="comparison-container">
              <div className="comparison-header text-center">
                <span className="eyebrow-tag">THE NATIVE ADVANTAGE</span>
                <h2 className="section-heading">Why Your Store Needs a Mobile App</h2>
                <p className="section-subheading">
                  Compare standard responsive mobile browsing with an authentic native iOS and
                  Android app built with AppifyHub.
                </p>
              </div>

              <div className="comparison-table-wrapper">
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th className="col-feature">Key Capability</th>
                      <th className="col-web">Mobile Web Browser</th>
                      <th className="col-native">AppifyHub Native App</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="feature-name">
                        <strong>Push Notifications</strong>
                        <span>Direct promotional &amp; cart recovery messages</span>
                      </td>
                      <td className="val-web">
                        <span className="badge-dim">Disabled or Unreliable on iOS</span>
                      </td>
                      <td className="val-native">
                        <span className="badge-gold">✓ Unlimited Direct-to-Lockscreen</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="feature-name">
                        <strong>Home Screen Real Estate</strong>
                        <span>Presence on the user's personal device</span>
                      </td>
                      <td className="val-web">
                        <span className="badge-dim">Lost in Safari/Chrome tabs</span>
                      </td>
                      <td className="val-native">
                        <span className="badge-gold">✓ Permanent Dedicated App Icon</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="feature-name">
                        <strong>Checkout Experience</strong>
                        <span>Speed and friction during customer payment</span>
                      </td>
                      <td className="val-web">
                        <span className="badge-dim">Multi-page slow forms (68% drop-off)</span>
                      </td>
                      <td className="val-native">
                        <span className="badge-gold">✓ 1-Tap Biometric (Apple/Google Pay)</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="feature-name">
                        <strong>Navigation Speed &amp; Gestures</strong>
                        <span>Smoothness of browsing products and categories</span>
                      </td>
                      <td className="val-web">
                        <span className="badge-dim">Laggy 3-5s DOM reloads</span>
                      </td>
                      <td className="val-native">
                        <span className="badge-gold">
                          ✓ Instant 60fps Native Hardware Acceleration
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="feature-name">
                        <strong>Customer Retention Rate</strong>
                        <span>Likelihood of customers making a second purchase</span>
                      </td>
                      <td className="val-web">
                        <span className="badge-dim">Low (~12% repeat rate)</span>
                      </td>
                      <td className="val-native">
                        <span className="badge-gold">✓ 3.4x Higher Repeat Purchases</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="feature-name">
                        <strong>App Store Discoverability</strong>
                        <span>Distribution across Apple App Store and Google Play</span>
                      </td>
                      <td className="val-web">
                        <span className="badge-dim">Zero Marketplace Presence</span>
                      </td>
                      <td className="val-native">
                        <span className="badge-gold">✓ Certified Marketplace Visibility</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ─── 9. PRICING & PLANS SECTION (PRESERVED ORIGINAL INR PRICING) ─── */}
          <section className="pricing-section" id="pricing">
            <span id="plans" className="sr-only" />
            <div className="pricing-container">
              <div className="pricing-header text-center">
                <span className="eyebrow-tag">SIMPLE &amp; TRANSPARENT PLANS</span>
                <h2 className="section-heading">Invest in Your Mobile Growth</h2>
                <p className="section-subheading">
                  No hidden transaction percentages. Lifetime app ownership with zero revenue
                  commissions.
                </p>

                {/* Billing Toggle */}
                <div className="pricing-toggle-wrap">
                  <span className={`toggle-label ${!isYearly ? "font-bold" : ""}`}>
                    Standard One-Time
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsYearly(!isYearly)}
                    className={`pricing-switch ${isYearly ? "active" : ""}`}
                    aria-label="Toggle annual billing"
                    role="switch"
                    aria-checked={isYearly}
                  >
                    <span className="switch-handle" />
                  </button>
                  <span className={`toggle-label ${isYearly ? "font-bold" : ""}`}>
                    Annual License <span className="save-tag">Save 20%</span>
                  </span>
                </div>
              </div>

              <div className="pricing-cards-grid">
                {/* Starter App */}
                <div className="pricing-card">
                  <div className="plan-header">
                    <h3 className="plan-name">Starter App</h3>
                    <p className="plan-tagline">
                      Ideal for single Android store apps with standard features.
                    </p>
                    <div className="plan-price-wrap">
                      <span className="currency">₹</span>
                      <span className="price-val">{isYearly ? "3,999" : "4,999"}</span>
                      <span className="period">{isYearly ? "/ year" : " one-time"}</span>
                    </div>
                    <div className="text-[11px] text-amber-800/80 font-medium mt-1">
                      Approx. $50 USD &bull; Lifetime App Files
                    </div>
                  </div>
                  <ul className="plan-features">
                    <li>
                      <span className="check-icon">✓</span> Android App (.aab / .apk files)
                    </li>
                    <li>
                      <span className="check-icon">✓</span> Standard Clean Theme Layout
                    </li>
                    <li>
                      <span className="check-icon">✓</span> Push Notifications (Basic)
                    </li>
                    <li>
                      <span className="check-icon">✓</span> Standard App Icon &amp; Splash Screen
                    </li>
                    <li>
                      <span className="check-icon">✓</span> Real-Time Product &amp; Order Sync
                    </li>
                    <li>
                      <span className="check-icon">✓</span> 3 Months Technical Support
                    </li>
                  </ul>
                  <Link
                    href={
                      user
                        ? isAdmin
                          ? "http://localhost:8000/admin"
                          : "/dashboard/apps/new?plan=starter-app"
                        : "/signup?plan=starter-app"
                    }
                    className="btn-plan btn-plan-outline"
                  >
                    Get Started
                  </Link>
                </div>

                {/* Pro Combo (Featured) */}
                <div className="pricing-card featured">
                  <div className="featured-badge">MOST POPULAR</div>
                  <div className="plan-header">
                    <h3 className="plan-name">Pro Combo</h3>
                    <p className="plan-tagline">
                      Complete mobile presence for Android and iOS devices.
                    </p>
                    <div className="plan-price-wrap">
                      <span className="currency">₹</span>
                      <span className="price-val">{isYearly ? "7,199" : "8,999"}</span>
                      <span className="period">{isYearly ? "/ year" : " one-time"}</span>
                    </div>
                    <div className="text-[11px] text-amber-900 font-bold mt-1">
                      Approx. $90 USD &bull; Lifetime App Files
                    </div>
                  </div>
                  <ul className="plan-features">
                    <li>
                      <span className="check-icon">✓</span>{" "}
                      <strong>Both Android &amp; iOS Apps</strong>
                    </li>
                    <li>
                      <span className="check-icon">✓</span> All Premium Themes Included
                    </li>
                    <li>
                      <span className="check-icon">✓</span>{" "}
                      <strong>Native Push Notifications</strong>
                    </li>
                    <li>
                      <span className="check-icon">✓</span> Payment Gateway Sync &amp; 1-Tap Checkout
                    </li>
                    <li>
                      <span className="check-icon">✓</span> Custom Branding &amp; Full Color Palette
                    </li>
                    <li>
                      <span className="check-icon">✓</span> WhatsApp &amp; In-App Chat Integration
                    </li>
                    <li>
                      <span className="check-icon">✓</span>{" "}
                      <strong>6 Months Priority Support</strong>
                    </li>
                  </ul>
                  <Link
                    href={
                      user
                        ? isAdmin
                          ? "http://localhost:8000/admin"
                          : "/dashboard/apps/new?plan=pro-combo"
                        : "/signup?plan=pro-combo"
                    }
                    className="btn-plan btn-plan-primary"
                  >
                    Get Pro Combo
                  </Link>
                </div>

                {/* Enterprise Suite */}
                <div className="pricing-card">
                  <div className="plan-header">
                    <h3 className="plan-name">Enterprise Suite</h3>
                    <p className="plan-tagline">
                      For high-scale commerce sites requiring full integration.
                    </p>
                    <div className="plan-price-wrap">
                      <span className="currency">₹</span>
                      <span className="price-val">{isYearly ? "11,999" : "14,999"}</span>
                      <span className="period">{isYearly ? "/ year" : " one-time"}</span>
                    </div>
                    <div className="text-[11px] text-amber-800/80 font-medium mt-1">
                      Approx. $150 USD &bull; Lifetime App Files
                    </div>
                  </div>
                  <ul className="plan-features">
                    <li>
                      <span className="check-icon">✓</span>{" "}
                      <strong>Both Android &amp; iOS Apps Included</strong>
                    </li>
                    <li>
                      <span className="check-icon">✓</span> All Premium Add-ons &amp; Themes Included
                    </li>
                    <li>
                      <span className="check-icon">✓</span> Priority App Store &amp; Play Store
                      Publishing
                    </li>
                    <li>
                      <span className="check-icon">✓</span> Dedicated Technical App Manager
                    </li>
                    <li>
                      <span className="check-icon">✓</span> Custom ERP &amp; API Integrations
                    </li>
                    <li>
                      <span className="check-icon">✓</span> 1 Year Dedicated Support &amp; Updates
                    </li>
                  </ul>
                  <Link
                    href={
                      user
                        ? isAdmin
                          ? "http://localhost:8000/admin"
                          : "/dashboard/apps/new?plan=enterprise-suite"
                        : "/signup?plan=enterprise-suite"
                    }
                    className="btn-plan btn-plan-outline"
                  >
                    Get Enterprise
                  </Link>
                </div>
              </div>

              <div className="text-center mt-10">
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 text-sm font-bold text-amber-900 hover:text-amber-950 underline underline-offset-4 transition"
                >
                  <span>
                    Looking for full plan comparison, add-ons, or interactive calculator? Explore
                    Full Pricing &rarr;
                  </span>
                </Link>
              </div>
            </div>
          </section>

          {/* ─── 10. SOCIAL PROOF & TESTIMONIALS ─── */}
          <section className="testimonials-section">
            <div className="testimonials-container">
              <div className="testimonials-header text-center">
                <span className="eyebrow-tag">VERIFIED RESULTS</span>
                <h2 className="section-heading">Loved by Fast-Growing E-Commerce Brands</h2>
                <p className="section-subheading">
                  See how digital merchants unlocked explosive customer retention and revenue
                  with AppifyHub.
                </p>
              </div>

              <div className="testimonials-grid">
                {/* Testimonial 1 */}
                <div className="testimonial-card">
                  <div className="testimonial-stars">★★★★★</div>
                  <p className="testimonial-quote">
                    &ldquo;Our mobile conversion rate increased by 280% within the first 3 weeks of
                    launching our iOS and Android apps. Push notifications alone brought us $42,000
                    in recovered carts.&rdquo;
                  </p>
                  <div className="testimonial-footer">
                    <div className="author-details">
                      <h4 className="author-name">Elena Rostova</h4>
                      <p className="author-title">Founder, Maison Lumière &bull; WooCommerce</p>
                    </div>
                    <span className="author-metric">+280% Revenue</span>
                  </div>
                </div>

                {/* Testimonial 2 */}
                <div className="testimonial-card">
                  <div className="testimonial-stars">★★★★★</div>
                  <p className="testimonial-quote">
                    &ldquo;Zero coding required. In less than 15 minutes our entire Shopify catalog
                    of 1,200 products was converted into a boutique mobile experience. Customers
                    constantly compliment how clean it feels.&rdquo;
                  </p>
                  <div className="testimonial-footer">
                    <div className="author-details">
                      <h4 className="author-name">Marcus Vance</h4>
                      <p className="author-title">Co-Founder, Artisan Leather &bull; Shopify</p>
                    </div>
                    <span className="author-metric">68% Open Rate</span>
                  </div>
                </div>

                {/* Testimonial 3 */}
                <div className="testimonial-card">
                  <div className="testimonial-stars">★★★★★</div>
                  <p className="testimonial-quote">
                    &ldquo;AppifyHub handled our Apple App Store and Google Play publication with
                    zero rejections on the first attempt. The real-time sync with our WordPress blog
                    is completely seamless.&rdquo;
                  </p>
                  <div className="testimonial-footer">
                    <div className="author-details">
                      <h4 className="author-name">Sofia Chen</h4>
                      <p className="author-title">
                        Digital Director, The Minimalist Edit &bull; WordPress
                      </p>
                    </div>
                    <span className="author-metric">4.9 ★ App Store</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ─── 12. READY TO GET STARTED (BOTTOM CTA) ─── */}
          <section className="bottom-cta-section">
            <div className="bottom-cta-container">
              <div className="bottom-cta-content">
                <span className="eyebrow-tag">READY TO GET STARTED?</span>
                <h2 className="section-heading">
                  Turn Your Website
                  <br />
                  into a Mobile App Today.
                </h2>
                <p className="bottom-cta-description">
                  No coding required. Works seamlessly with WordPress, WooCommerce and Shopify.
                </p>
                <div className="bottom-cta-action">
                  <Link href={convertTargetHref} className="btn-action-pill">
                    <span>Convert My Website</span>
                    <svg
                      width="15"
                      height="15"
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

              <div className="bottom-cta-visual">
                <div className="bottom-cta-frame">
                  <img
                    src="/assets/images/bottom_cta_phone.jpg"
                    alt="Smartphone on travertine stone displaying mobile store"
                    className="img-responsive"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* ===================================================
          3. GLOBAL APPIFYHUB FOOTER
          =================================================== */}
      <footer className="app-footer">
        <div className="footer-inner">
          <div className="footer-top-grid">
            {/* Brand Info */}
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

            {/* Product Links */}
            <div className="footer-col">
              <h4 className="footer-title">Product</h4>
              <ul className="footer-links">
                <li>
                  <Link href="/how-it-works">How It Works</Link>
                </li>
                <li>
                  <Link href="/#features">Features</Link>
                </li>
                <li>
                  <Link href="/themes">Themes</Link>
                </li>
                <li>
                  <Link href="/pricing">Pricing</Link>
                </li>
              </ul>
            </div>

            {/* Platform Links */}
            <div className="footer-col">
              <h4 className="footer-title">Platform</h4>
              <ul className="footer-links">
                <li>
                  <Link href={user ? "/dashboard/apps/new?platform=woo" : "/signup?platform=wordpress"}>
                    WordPress
                  </Link>
                </li>
                <li>
                  <Link href={user ? "/dashboard/apps/new?platform=woo" : "/signup?platform=woocommerce"}>
                    WooCommerce
                  </Link>
                </li>
                <li>
                  <Link href={user ? "/dashboard/apps/new?platform=shopify" : "/signup?platform=shopify"}>
                    Shopify
                  </Link>
                </li>
              </ul>
            </div>

            {/* Social Links */}
            <div className="footer-col footer-col-social">
              <div className="social-icons">
                {/* Facebook */}
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-btn"
                  aria-label="Facebook"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>
                {/* Instagram */}
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
                {/* YouTube */}
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-btn"
                  aria-label="YouTube"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z" />
                    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="#F5F1EB" />
                  </svg>
                </a>
                {/* LinkedIn */}
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-btn"
                  aria-label="LinkedIn"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 2a2 2 0 1 1-2 2 2 2 0 0 1 2-2z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Footer Bottom Bar */}
          <div className="footer-bottom-bar">
            <p className="copyright">&copy; 2026 AppifyHub. All rights reserved.</p>
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
