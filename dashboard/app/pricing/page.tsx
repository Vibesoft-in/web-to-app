"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { saveUserData, clearUserData } from "@/lib/user-data-store";
import { HeaderProfileMenu } from "@/components/header-profile-menu";

interface PlanOption {
  id: string;
  name: string;
  priceOnetime: number;
  priceAnnual: number;
  desc: string;
  badge?: string;
  isFeatured?: boolean;
  features: string[];
}

interface ThemeOption {
  id: number;
  name: string;
  price: number;
  desc: string;
}

interface AddonOption {
  id: number;
  name: string;
  price: number;
  desc: string;
}

const CORE_PLANS: PlanOption[] = [
  {
    id: "starter-app",
    name: "Starter App",
    priceOnetime: 4999,
    priceAnnual: 3999,
    desc: "Ideal for single Android store apps with standard features.",
    features: [
      "Android App (APK + AAB)",
      "Push Notifications (Basic)",
      "Standard App Icon & Splash",
      "3 Months Support",
    ],
  },
  {
    id: "pro-combo",
    name: "Pro Combo",
    priceOnetime: 8999,
    priceAnnual: 7199,
    desc: "Complete mobile presence for Android and iOS devices.",
    badge: "MOST POPULAR",
    isFeatured: true,
    features: [
      "Android & iOS Apps",
      "Native Push Notifications",
      "Payment Gateway Sync",
      "Custom Branding & Theming",
      "6 Months Support",
    ],
  },
  {
    id: "enterprise-suite",
    name: "Enterprise Suite",
    priceOnetime: 14999,
    priceAnnual: 11999,
    desc: "For high-scale commerce sites requiring full integration.",
    features: [
      "Android & iOS Apps",
      "All Add-ons Included",
      "Priority App Store Publishing",
      "Dedicated App Manager",
      "1 Year Support & Updates",
    ],
  },
];

const THEME_OPTIONS: ThemeOption[] = [
  { id: 0, name: "Default Theme", price: 0, desc: "Included with Plan (₹0)" },
  { id: 1, name: "Minimal", price: 0, desc: "Free Included" },
  { id: 2, name: "Trendy", price: 1499, desc: "+₹1,499" },
  { id: 6, name: "Modern", price: 1999, desc: "+₹1,999" },
];

const ADDON_OPTIONS: AddonOption[] = [
  {
    id: 1,
    name: "OneSignal Push Notifications",
    price: 999,
    desc: "Engage users with automated cart recovery and broadcast messages.",
  },
  {
    id: 2,
    name: "WhatsApp Direct Chat",
    price: 499,
    desc: "Floating instant WhatsApp customer support inside mobile app.",
  },
  {
    id: 3,
    name: "Advanced In-App Analytics",
    price: 1299,
    desc: "Real-time telemetry, user session recording, and drop-off analysis.",
  },
  {
    id: 4,
    name: "Google AdMob Integration",
    price: 1499,
    desc: "Monetize free app downloads with banner and interstitial ads.",
  },
];

const FAQS = [
  {
    q: "Do you take any percentage or commission from our sales?",
    a: "No. Never. We believe your revenue belongs entirely to your business. AppifyHub charges zero transaction fees and zero sales commissions. All customer payments pass directly through your existing payment processors (Stripe, Razorpay, PayPal, etc.).",
  },
  {
    q: "Will the mobile apps be published under my own developer accounts?",
    a: "Yes. Your apps are published under your company's own Apple Developer Program and Google Play Console accounts. You retain 100% ownership, brand credibility, and direct control over customer reviews and store presence.",
  },
  {
    q: "What happens when I update products, prices, or inventory on my website?",
    a: "All catalog data, prices, descriptions, and stock quantities sync automatically in real time using our live API connection layer. You never need to duplicate content or manually update your app.",
  },
  {
    q: "What if Apple or Google requires modifications during review?",
    a: "Our team includes store approval assistance with every plan. If Apple or Google requests any metadata adjustments, screenshots revisions, or technical compliance modifications, our engineers make the necessary updates at no additional charge until your app is live.",
  },
  {
    q: "Can I start with the Starter Plan and upgrade to Pro Combo later?",
    a: "Absolutely. You can start with Starter (Android) and easily upgrade to Pro Combo whenever you are ready to expand to iOS devices. You only pay the difference between the two plan tiers.",
  },
  {
    q: "Do I need any programming or coding experience to manage the app?",
    a: "Zero coding knowledge is needed. AppifyHub provides an intuitive visual dashboard where you can trigger push notifications, preview themes, view analytics, and manage configurations with simple point-and-click controls.",
  },
];

export default function PricingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Auth check for header actions
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

  const handleLogout = async () => {
    try {
      clearUserData();
      await apiClient("/api/auth/logout", { method: "POST" });
    } finally {
      queryClient.setQueryData(["auth", "me"], { user: null });
      queryClient.removeQueries({ queryKey: ["auth", "me"] });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      window.location.reload();
    }
  };

  // Billing Toggle State (One-Time vs Annual)
  const [isAnnual, setIsAnnual] = useState(false);

  // Calculator State
  const [selectedPlanId, setSelectedPlanId] = useState<string>("pro-combo");
  const [selectedThemeId, setSelectedThemeId] = useState<number>(0);
  const [selectedAddonIds, setSelectedAddonIds] = useState<number[]>([]);

  // FAQ Accordion State
  const [openFaqIndices, setOpenFaqIndices] = useState<number[]>([]);

  const toggleFaq = (idx: number) => {
    setOpenFaqIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleToggleAddon = (id: number) => {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Calculator Calculations
  const activePlan = useMemo(() => {
    return CORE_PLANS.find((p) => p.id === selectedPlanId) || CORE_PLANS[1];
  }, [selectedPlanId]);

  const activeTheme = useMemo(() => {
    return THEME_OPTIONS.find((t) => t.id === selectedThemeId) || THEME_OPTIONS[0];
  }, [selectedThemeId]);

  const selectedAddons = useMemo(() => {
    return ADDON_OPTIONS.filter((a) => selectedAddonIds.includes(a.id));
  }, [selectedAddonIds]);

  const subtotal = useMemo(() => {
    const planPrice = isAnnual ? activePlan.priceAnnual : activePlan.priceOnetime;
    const themePrice = activeTheme.price;
    const addonsPrice = selectedAddons.reduce((sum, a) => sum + a.price, 0);
    return planPrice + themePrice + addonsPrice;
  }, [isAnnual, activePlan, activeTheme, selectedAddons]);

  const gstTax = useMemo(() => Math.round(subtotal * 0.18), [subtotal]);
  const estimatedTotal = useMemo(() => subtotal + gstTax, [subtotal, gstTax]);

  const getGetStartedHref = (planSlug: string) => {
    if (user) {
      if (user.latest_draft?.ulid) {
        return `/dashboard/apps/${user.latest_draft.ulid}/setup/payment?plan=${encodeURIComponent(planSlug)}`;
      }
      return `/dashboard/apps/new?plan=${encodeURIComponent(planSlug)}`;
    }
    return `/register?redirect=%2Fconvert&plan=${encodeURIComponent(planSlug)}`;
  };

  return (
    <div className="site-layout">
      {/* ── TOP GLOBAL HEADER ── */}
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
            <Link href="/" className="nav-link">Home</Link>
            <Link href="/how-it-works" className="nav-link">How It Works</Link>
            <Link href="/themes" className="nav-link">Themes</Link>
            <Link href="/pricing" className="nav-link active">Pricing</Link>
            <Link href="/#faq" className="nav-link">Support</Link>
          </nav>

          <div className="header-actions" style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <HeaderProfileMenu user={user} onLogout={handleLogout} />
          </div>
        </div>
      </header>

      {/* ── MAIN PAGE CONTENT ── */}
      <main className="page-body">
        <div className="pricing-page-wrapper">
          {/* 1. HERO SECTION */}
          <section className="pricing-hero-section">
            <div className="pricing-page-container">
              <div className="pricing-hero-content">
                <div className="pricing-eyebrow-pill">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <span>TRANSPARENT &amp; PREDICTABLE PRICING</span>
                </div>
                <h1 className="pricing-hero-title">
                  Simple Investment, <em>Limitless Mobile Growth</em>
                </h1>
                <p className="pricing-hero-subheading">
                  Turn your WordPress, WooCommerce, or Shopify store into high-converting native iOS &amp; Android apps. No recurring sales commissions, no hidden publishing penalties.
                </p>

                {/* Billing Cycle Selector Switch */}
                <div className="pricing-billing-switch-wrap">
                  <span
                    className={`billing-label ${!isAnnual ? "is-active" : ""}`}
                    onClick={() => setIsAnnual(false)}
                    style={{ cursor: "pointer" }}
                  >
                    One-Time License
                  </span>
                  <button
                    type="button"
                    className={`pricing-billing-toggle ${isAnnual ? "active" : ""}`}
                    onClick={() => setIsAnnual(!isAnnual)}
                    aria-label="Toggle annual support plan"
                    role="switch"
                    aria-checked={isAnnual}
                  >
                    <span className="billing-toggle-thumb" />
                  </button>
                  <span
                    className={`billing-label ${isAnnual ? "is-active" : ""}`}
                    onClick={() => setIsAnnual(true)}
                    style={{ cursor: "pointer" }}
                  >
                    Annual Care Plan <span className="billing-save-tag">Save 20%</span>
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* 2. CORE PLANS GRID */}
          <section className="pricing-cards-section" id="plansCatalog">
            <div className="pricing-page-container">
              <div className="pricing-grid-cards">
                {CORE_PLANS.map((plan) => {
                  const currentPrice = isAnnual ? plan.priceAnnual : plan.priceOnetime;
                  const usdApprox = Math.round(currentPrice / 100);

                  return (
                    <article
                      key={plan.id}
                      className={`pricing-card-box ${plan.isFeatured ? "is-featured" : ""}`}
                    >
                      {plan.badge && (
                        <div className="pricing-featured-badge">{plan.badge}</div>
                      )}

                      <div className="card-head">
                        <span className="card-plan-tier">{plan.id.toUpperCase()}</span>
                        <h2 className="card-plan-name">{plan.name}</h2>
                        <p className="card-plan-desc">{plan.desc}</p>

                        <div className="card-price-display">
                          <span className="price-currency">₹</span>
                          <span className="price-amount">
                            {currentPrice.toLocaleString("en-IN")}
                          </span>
                          <span className="price-billing-period">
                            {isAnnual ? "/ year (billed annually)" : "one-time license"}
                          </span>
                        </div>
                        <div className="price-usd-equivalent">
                          Approx. ${usdApprox} USD &middot; Lifetime App Files
                        </div>
                      </div>

                      <div className="card-divider" />

                      <ul className="card-features-list">
                        {plan.features.map((feat, idx) => (
                          <li key={idx}>
                            <span className="feat-check-icon">✓</span>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="card-action-wrap">
                        <Link
                          href={getGetStartedHref(plan.id)}
                          onClick={() => {
                            saveUserData({
                              plan: plan.id,
                              plan_name: plan.name,
                              plan_price: `₹${currentPrice.toLocaleString("en-IN")}`,
                            });
                          }}
                          className={`btn-pricing-action ${
                            plan.isFeatured ? "btn-pricing-primary" : "btn-pricing-outline"
                          }`}
                        >
                          <span>Get Started With {plan.name} &rarr;</span>
                        </Link>
                        <span className="card-sub-guarantee">
                          Instant project setup &middot; Full source delivery
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 3. INTERACTIVE CUSTOM APP CONFIGURATOR & CALCULATOR */}
          <section className="pricing-calculator-section" id="appCalculator">
            <div className="pricing-page-container">
              <div className="calculator-header text-center">
                <span className="pricing-eyebrow-pill">INTERACTIVE CONFIGURATOR</span>
                <h2 className="calc-section-title">Customize Your Exact App Package</h2>
                <p className="calc-section-sub">
                  Select your base plan and combine powerful growth add-ons to see your transparent final cost immediately.
                </p>
              </div>

              <div className="pricing-calc-box-layout">
                {/* Left: Interactive Selectors */}
                <div className="calc-controls-pane">
                  {/* Step 1: Base Architecture Plan */}
                  <div className="calc-group">
                    <label className="calc-group-label">
                      <span className="calc-step-num">1</span>
                      <span>Choose Base Architecture Plan</span>
                    </label>
                    <div className="calc-plan-pills-grid">
                      {CORE_PLANS.map((plan) => {
                        const isChecked = selectedPlanId === plan.id;
                        const planPrice = isAnnual ? plan.priceAnnual : plan.priceOnetime;
                        return (
                          <label key={plan.id} className="calc-plan-pill-item">
                            <input
                              type="radio"
                              name="calc_plan_id"
                              value={plan.id}
                              checked={isChecked}
                              onChange={() => setSelectedPlanId(plan.id)}
                            />
                            <div className="plan-pill-content">
                              <div className="plan-pill-header">
                                <strong className="plan-pill-name">{plan.name}</strong>
                                <span className="plan-pill-price">
                                  ₹{planPrice.toLocaleString("en-IN")}
                                </span>
                              </div>
                              <p className="plan-pill-brief">{plan.desc}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 2: Visual Theme Choice */}
                  <div className="calc-group">
                    <label className="calc-group-label">
                      <span className="calc-step-num">2</span>
                      <span>Select Design Theme</span>
                    </label>
                    <div className="calc-themes-selector-grid">
                      {THEME_OPTIONS.map((theme) => {
                        const isChecked = selectedThemeId === theme.id;
                        return (
                          <label key={theme.id} className="calc-theme-choice-item">
                            <input
                              type="radio"
                              name="calc_theme_id"
                              value={theme.id}
                              checked={isChecked}
                              onChange={() => setSelectedThemeId(theme.id)}
                            />
                            <div className="theme-choice-box">
                              <strong>{theme.name}</strong>
                              <span>{theme.desc}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 3: Add-Ons Selection */}
                  <div className="calc-group">
                    <label className="calc-group-label">
                      <span className="calc-step-num">3</span>
                      <span>Select Growth &amp; Engagement Add-Ons</span>
                    </label>
                    <div className="calc-addons-list">
                      {ADDON_OPTIONS.map((addon) => {
                        const isChecked = selectedAddonIds.includes(addon.id);
                        return (
                          <label key={addon.id} className="calc-addon-check-card">
                            <input
                              type="checkbox"
                              name="calc_addon_ids[]"
                              value={addon.id}
                              checked={isChecked}
                              onChange={() => handleToggleAddon(addon.id)}
                            />
                            <div className="addon-check-body">
                              <div className="addon-info">
                                <strong className="addon-title">{addon.name}</strong>
                                <p className="addon-desc">{addon.desc}</p>
                              </div>
                              <div className="addon-price-badge">
                                +₹{addon.price.toLocaleString("en-IN")}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right: Real-Time Summary Receipt */}
                <div className="calc-summary-pane">
                  <div className="calc-receipt-card">
                    <div className="receipt-header">
                      <h3 className="receipt-title">Package Summary</h3>
                      <span className="receipt-sub">Real-Time Configuration</span>
                    </div>

                    <div className="receipt-items-list" id="receiptItemsList">
                      <div className="receipt-row" id="receiptPlanRow">
                        <span className="row-label">
                          Base Plan: <strong>{activePlan.name}</strong>
                        </span>
                        <span className="row-amount">
                          ₹{(isAnnual ? activePlan.priceAnnual : activePlan.priceOnetime).toLocaleString("en-IN")}
                        </span>
                      </div>

                      {activeTheme.price > 0 && (
                        <div className="receipt-row" id="receiptThemeRow">
                          <span className="row-label">
                            Theme: <strong>{activeTheme.name}</strong>
                          </span>
                          <span className="row-amount">
                            ₹{activeTheme.price.toLocaleString("en-IN")}
                          </span>
                        </div>
                      )}

                      {selectedAddons.map((addon) => (
                        <div key={addon.id} className="receipt-row addon-row">
                          <span className="row-label">+ {addon.name}</span>
                          <span className="row-amount">
                            ₹{addon.price.toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="receipt-divider" />

                    <div className="receipt-calc-totals">
                      <div className="totals-subrow">
                        <span>Subtotal</span>
                        <strong>₹{subtotal.toLocaleString("en-IN")}</strong>
                      </div>
                      <div className="totals-subrow">
                        <span>Taxes &amp; GST (18%)</span>
                        <span>₹{gstTax.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="totals-main-row">
                        <span>Estimated Total</span>
                        <strong className="total-big-val">
                          ₹{estimatedTotal.toLocaleString("en-IN")}
                        </strong>
                      </div>
                    </div>

                    <div className="receipt-action-wrap">
                      <Link
                        href={getGetStartedHref(selectedPlanId)}
                        onClick={() => {
                          saveUserData({
                            plan: selectedPlanId,
                            plan_name: activePlan.name,
                            plan_price: `₹${(isAnnual ? activePlan.priceAnnual : activePlan.priceOnetime).toLocaleString("en-IN")}`,
                            theme: activeTheme.name,
                            theme_id: activeTheme.id,
                            addons: selectedAddonIds,
                          });
                        }}
                        className="btn-receipt-checkout"
                      >
                        <span>Proceed With This Configuration &rarr;</span>
                      </Link>
                      <p className="receipt-guarantee-note">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        <span>14-Day Store Acceptance Guarantee Included</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 4. DETAILED FEATURE COMPARISON TABLE */}
          <section className="pricing-comparison-table-section">
            <div className="pricing-page-container">
              <div className="comparison-header text-center">
                <span className="pricing-eyebrow-pill">FULL CAPABILITIES MATRIX</span>
                <h2 className="comp-title">Compare All Plan Specifications</h2>
                <p className="comp-sub">
                  A clear, side-by-side feature comparison to help you choose with confidence.
                </p>
              </div>

              <div className="pricing-matrix-card">
                <div className="table-responsive-wrap">
                  <table className="pricing-matrix-table">
                    <thead>
                      <tr>
                        <th className="col-feature-spec">Features &amp; Capabilities</th>
                        <th className="col-plan text-center">
                          <div className="th-plan-name">Starter App</div>
                          <div className="th-plan-price">₹4,999</div>
                        </th>
                        <th className="col-plan text-center th-highlight">
                          <div className="th-featured-pill">POPULAR</div>
                          <div className="th-plan-name">Pro Combo</div>
                          <div className="th-plan-price">₹8,999</div>
                        </th>
                        <th className="col-plan text-center">
                          <div className="th-plan-name">Enterprise Suite</div>
                          <div className="th-plan-price">₹14,999</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Category: Platforms & Builds */}
                      <tr className="matrix-cat-row">
                        <td colSpan={4}>1. Mobile Platforms &amp; Application Builds</td>
                      </tr>
                      <tr>
                        <td>Android Production App (.aab / .apk)</td>
                        <td className="text-center"><span className="matrix-check">✓</span></td>
                        <td className="text-center highlight-cell"><span className="matrix-check">✓</span></td>
                        <td className="text-center"><span className="matrix-check">✓</span></td>
                      </tr>
                      <tr>
                        <td>iOS Production App (.ipa / TestFlight)</td>
                        <td className="text-center"><span className="matrix-cross">&times;</span></td>
                        <td className="text-center highlight-cell"><span className="matrix-check">✓</span></td>
                        <td className="text-center"><span className="matrix-check">✓</span></td>
                      </tr>
                      <tr>
                        <td>Tablet &amp; iPad Optimized Viewport</td>
                        <td className="text-center"><span className="matrix-cross">&times;</span></td>
                        <td className="text-center highlight-cell"><span className="matrix-check">✓</span></td>
                        <td className="text-center"><span className="matrix-check">✓</span></td>
                      </tr>
                      <tr>
                        <td>Supported Stores / Brands Connected</td>
                        <td className="text-center">1 Store</td>
                        <td className="text-center highlight-cell">1 Store</td>
                        <td className="text-center">Up to 3 Stores</td>
                      </tr>

                      {/* Category: Design & Mobile UX */}
                      <tr className="matrix-cat-row">
                        <td colSpan={4}>2. Design, Themes &amp; Native UX</td>
                      </tr>
                      <tr>
                        <td>Curated Mobile Theme Selection</td>
                        <td className="text-center">Standard Minimalist</td>
                        <td className="text-center highlight-cell">All 5 Premium Themes</td>
                        <td className="text-center">All Themes + Bespoke Styling</td>
                      </tr>
                      <tr>
                        <td>Custom Splash Screen &amp; App Icon Design</td>
                        <td className="text-center"><span className="matrix-check">✓</span></td>
                        <td className="text-center highlight-cell"><span className="matrix-check">✓</span></td>
                        <td className="text-center"><span className="matrix-check">✓</span></td>
                      </tr>
                      <tr>
                        <td>Biometric Login (FaceID &amp; TouchID)</td>
                        <td className="text-center"><span className="matrix-cross">&times;</span></td>
                        <td className="text-center highlight-cell"><span className="matrix-check">✓</span></td>
                        <td className="text-center"><span className="matrix-check">✓</span></td>
                      </tr>
                      <tr>
                        <td>Offline Caching &amp; Fast Re-engagement</td>
                        <td className="text-center">Basic</td>
                        <td className="text-center highlight-cell">Advanced</td>
                        <td className="text-center">Enterprise Local Sync</td>
                      </tr>

                      {/* Category: Commerce & Sync */}
                      <tr className="matrix-cat-row">
                        <td colSpan={4}>3. E-Commerce &amp; Real-Time Data Sync</td>
                      </tr>
                      <tr>
                        <td>Real-Time Two-Way Product &amp; Order Sync</td>
                        <td className="text-center"><span className="matrix-check">✓</span></td>
                        <td className="text-center highlight-cell"><span className="matrix-check">✓</span></td>
                        <td className="text-center"><span className="matrix-check">✓</span></td>
                      </tr>
                      <tr>
                        <td>Native In-App 1-Click Fast Checkout</td>
                        <td className="text-center"><span className="matrix-check">✓</span></td>
                        <td className="text-center highlight-cell"><span className="matrix-check">✓</span></td>
                        <td className="text-center"><span className="matrix-check">✓</span></td>
                      </tr>
                      <tr>
                        <td>Payment Gateways (Razorpay, Stripe, PayPal, COD)</td>
                        <td className="text-center"><span className="matrix-check">✓</span></td>
                        <td className="text-center highlight-cell"><span className="matrix-check">✓</span></td>
                        <td className="text-center"><span className="matrix-check">✓</span></td>
                      </tr>
                      <tr>
                        <td>Customer Wishlist &amp; Saved Items</td>
                        <td className="text-center"><span className="matrix-cross">&times;</span></td>
                        <td className="text-center highlight-cell"><span className="matrix-check">✓</span></td>
                        <td className="text-center"><span className="matrix-check">✓</span></td>
                      </tr>

                      {/* Category: Marketing & Growth */}
                      <tr className="matrix-cat-row">
                        <td colSpan={4}>4. Retention, Marketing &amp; Add-Ons</td>
                      </tr>
                      <tr>
                        <td>Push Notification Quota</td>
                        <td className="text-center">5,000 / mo</td>
                        <td className="text-center highlight-cell"><strong>Unlimited</strong></td>
                        <td className="text-center"><strong>Unlimited</strong> + Priority Delivery</td>
                      </tr>
                      <tr>
                        <td>Automated Abandoned Cart Push Triggers</td>
                        <td className="text-center"><span className="matrix-cross">&times;</span></td>
                        <td className="text-center highlight-cell"><span className="matrix-check">✓</span></td>
                        <td className="text-center"><span className="matrix-check">✓</span></td>
                      </tr>
                      <tr>
                        <td>WhatsApp Direct Customer Support Floating Chat</td>
                        <td className="text-center"><span className="matrix-cross">&times;</span> (Optional Add-on)</td>
                        <td className="text-center highlight-cell"><span className="matrix-check">✓</span> Included</td>
                        <td className="text-center"><span className="matrix-check">✓</span> Included</td>
                      </tr>
                      <tr>
                        <td>Advanced In-App Analytics &amp; User Drop-off</td>
                        <td className="text-center"><span className="matrix-cross">&times;</span></td>
                        <td className="text-center highlight-cell">Standard Analytics</td>
                        <td className="text-center"><span className="matrix-check">✓</span> Full Telemetry Included</td>
                      </tr>

                      {/* Category: Publishing & Support */}
                      <tr className="matrix-cat-row">
                        <td colSpan={4}>5. Publishing, Updates &amp; Support</td>
                      </tr>
                      <tr>
                        <td>App Store &amp; Play Store Submission Guidance</td>
                        <td className="text-center">Step-by-step Guides</td>
                        <td className="text-center highlight-cell">Assisted Submission</td>
                        <td className="text-center"><strong>White-Glove Submission</strong></td>
                      </tr>
                      <tr>
                        <td>Apple &amp; Google Review Approval Guarantee</td>
                        <td className="text-center"><span className="matrix-check">✓</span></td>
                        <td className="text-center highlight-cell"><span className="matrix-check">✓</span></td>
                        <td className="text-center"><span className="matrix-check">✓</span></td>
                      </tr>
                      <tr>
                        <td>Support Window &amp; Updates Included</td>
                        <td className="text-center">3 Months Email Support</td>
                        <td className="text-center highlight-cell">6 Months Priority Support</td>
                        <td className="text-center">1 Year Dedicated Manager &amp; SLA</td>
                      </tr>
                      <tr>
                        <td>Action</td>
                        <td className="text-center">
                          <Link href={getGetStartedHref("starter-app")} className="btn-matrix-action">
                            Choose Starter
                          </Link>
                        </td>
                        <td className="text-center highlight-cell">
                          <Link href={getGetStartedHref("pro-combo")} className="btn-matrix-action is-primary">
                            Choose Pro Combo
                          </Link>
                        </td>
                        <td className="text-center">
                          <Link href={getGetStartedHref("enterprise-suite")} className="btn-matrix-action">
                            Choose Enterprise
                          </Link>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          {/* 5. APPIFYHUB VS TRADITIONAL DEVELOPMENT */}
          <section className="pricing-comparison-agency-section">
            <div className="pricing-page-container">
              <div className="agency-header text-center">
                <span className="pricing-eyebrow-pill">COST VS VALUE COMPARISON</span>
                <h2 className="agency-title">Why Smart Brands Choose AppifyHub</h2>
                <p className="agency-sub">
                  See how AppifyHub compares against mobile development agencies and basic webview wrappers.
                </p>
              </div>

              <div className="agency-comparison-cards-grid">
                {/* Card 1: Traditional Agency */}
                <div className="agency-compare-card">
                  <div className="agency-card-tag">TRADITIONAL AGENCY</div>
                  <h3 className="agency-card-cost">$25,000+</h3>
                  <p className="agency-card-timing">4 to 6 months turnaround</p>
                  <ul className="agency-points-list">
                    <li className="negative">&times; Massive upfront engineering budgets</li>
                    <li className="negative">&times; Costly ongoing monthly retainers ($1,500/mo+)</li>
                    <li className="negative">&times; Complex custom code that breaks on store updates</li>
                    <li className="negative">&times; Lengthy delays before initial release</li>
                  </ul>
                </div>

                {/* Card 2: AppifyHub (Highlighted Hero) */}
                <div className="agency-compare-card is-appifyhub-highlight">
                  <div className="agency-card-tag highlight-tag">APPIFYHUB PLATFORM</div>
                  <h3 className="agency-card-cost">Starting at ₹4,999</h3>
                  <p className="agency-card-timing">Ready in 48 hours</p>
                  <ul className="agency-points-list">
                    <li className="positive">&check; Transparent one-time investment with zero commissions</li>
                    <li className="positive">&check; Native, 60fps smooth iOS and Android performance</li>
                    <li className="positive">&check; Seamless automatic 2-way sync with your existing store</li>
                    <li className="positive">&check; 100% store approval guarantee &amp; full app ownership</li>
                  </ul>
                  <Link href={getGetStartedHref("pro-combo")} className="btn-agency-cta">
                    Start Converting Now &rarr;
                  </Link>
                </div>

                {/* Card 3: Generic Webview Wrappers */}
                <div className="agency-compare-card">
                  <div className="agency-card-tag">GENERIC WEBVIEW WRAPPERS</div>
                  <h3 className="agency-card-cost">$19 - $49 / mo</h3>
                  <p className="agency-card-timing">Recurring subscription</p>
                  <ul className="agency-points-list">
                    <li className="negative">&times; Sluggish web frames that feel like a browser window</li>
                    <li className="negative">&times; High rejection rates by Apple App Store (Guideline 4.2)</li>
                    <li className="negative">&times; No native biometrics, push reliability, or fluid UI</li>
                    <li className="negative">&times; Cancel your subscription and your app shuts down</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* 6. FREQUENTLY ASKED QUESTIONS */}
          <section className="pricing-faq-section" id="faq">
            <div className="pricing-page-container">
              <div className="faq-header text-center">
                <span className="pricing-eyebrow-pill">HAVE QUESTIONS?</span>
                <h2 className="faq-heading">Frequently Asked Questions</h2>
                <p className="faq-sub">
                  Clear answers to common questions about pricing, app publishing, and store ownership.
                </p>
              </div>

              <div className="faq-accordion-list">
                {FAQS.map((faq, idx) => {
                  const isOpen = openFaqIndices.includes(idx);
                  return (
                    <div key={idx} className={`faq-item ${isOpen ? "active" : ""}`}>
                      <button
                        type="button"
                        className="faq-question"
                        onClick={() => toggleFaq(idx)}
                        aria-expanded={isOpen}
                      >
                        <span>{faq.q}</span>
                        <span className="faq-chevron">&darr;</span>
                      </button>
                      <div className="faq-answer">
                        <p>{faq.a}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 7. FINAL CALL TO ACTION */}
          <section className="pricing-final-cta-section">
            <div className="pricing-page-container">
              <div className="pricing-cta-card">
                <span className="pricing-eyebrow-pill" style={{ background: "#FFFFFF" }}>
                  READY TO EXPAND
                </span>
                <h2 className="pricing-cta-title">Turn Your Store Into an App Today</h2>
                <p className="pricing-cta-lead">
                  Test your website compatibility in under 30 seconds, select your favorite theme, and start converting your mobile visitors into loyal app buyers.
                </p>
                <div className="pricing-cta-buttons">
                  <Link href="/compatibility" className="btn-pricing-cta-primary">
                    <span>Analyze My Website Free &rarr;</span>
                  </Link>
                  <a href="#plansCatalog" className="btn-pricing-cta-secondary">
                    <span>View Plans Again &uarr;</span>
                  </a>
                </div>
                <div className="pricing-cta-trust-strip">
                  <span>WordPress &middot; WooCommerce &middot; Shopify Compatible</span>
                  <span className="dot-sep">&bull;</span>
                  <span>No Credit Card Required For Compatibility Test</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* ── GLOBAL APPIFYHUB FOOTER ── */}
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
                <li><Link href="/how-it-works">How It Works</Link></li>
                <li><Link href="/#features">Features</Link></li>
                <li><Link href="/themes">Themes</Link></li>
                <li><Link href="/pricing">Pricing</Link></li>
              </ul>
            </div>

            {/* Platform Links */}
            <div className="footer-col">
              <h4 className="footer-title">Platform</h4>
              <ul className="footer-links">
                <li><Link href="/convert?platform=wordpress">WordPress</Link></li>
                <li><Link href="/convert?platform=woocommerce">WooCommerce</Link></li>
                <li><Link href="/convert?platform=shopify">Shopify</Link></li>
              </ul>
            </div>

            {/* Social Links */}
            <div className="footer-col footer-col-social">
              <div className="social-icons">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-btn" aria-label="Facebook">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-btn" aria-label="Instagram">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </a>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="social-btn" aria-label="YouTube">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z" />
                    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="#F5F1EB" />
                  </svg>
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-btn" aria-label="LinkedIn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 2a2 2 0 1 1-2 2 2 2 0 0 1 2-2z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="footer-bottom-bar">
            <p className="copyright">&copy; 2026 AppifyHub. All rights reserved.</p>
            <div className="footer-legal">
              <Link href="/privacy">Privacy Policy</Link>
              <span className="sep">|</span>
              <Link href="/terms">Terms &amp; Conditions</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
