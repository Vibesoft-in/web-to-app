"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

const STEPS = [
  { id: "step-01", num: "01", name: "Enter Website", tag: "DISCOVERY & INITIATION" },
  { id: "step-02", num: "02", name: "Platform Selection", tag: "PLATFORM SELECTION" },
  { id: "step-03", num: "03", name: "Compatibility", tag: "COMPATIBILITY VERIFICATION" },
  { id: "step-04", num: "04", name: "Secure Connect", tag: "CREDENTIAL INTEGRATION" },
  { id: "step-05", num: "05", name: "Technical Help", tag: "NOT READY YET?", isWarning: true },
  { id: "step-06", num: "06", name: "Choose Theme", tag: "DESIGN & THEMES" },
  { id: "step-07", num: "07", name: "Add Features", tag: "MODULAR CAPABILITIES" },
  { id: "step-08", num: "08", name: "Data Connection", tag: "DATA ARCHITECTURE" },
  { id: "step-09", num: "09", name: "Independent App", tag: "INDEPENDENT INTERFACES" },
  { id: "step-10", num: "10", name: "Checkout", tag: "ORDER & CHECKOUT" },
  { id: "step-11", num: "11", name: "App Build", tag: "BUILD & PACKAGING" },
  { id: "step-12", num: "12", name: "Testing", tag: "QUALITY ASSURANCE" },
  { id: "step-13", num: "13", name: "Launch", tag: "STORE PUBLICATION" },
];

export default function HowItWorksPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<"down" | "up">("down");
  const [exitingIndex, setExitingIndex] = useState<number | null>(null);
  const isTransitioningRef = useRef(false);
  const wheelCooldownRef = useRef(false);
  const wheelAccumulatorRef = useRef(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const activateStep = useCallback(
    (nextIdx: number, dir: "down" | "up" = "down") => {
      if (nextIdx < 0 || nextIdx >= STEPS.length || nextIdx === currentStep) return;
      if (isTransitioningRef.current) return;

      isTransitioningRef.current = true;
      setDirection(dir);
      setExitingIndex(currentStep);
      setCurrentStep(nextIdx);

      const padNum = String(nextIdx + 1).padStart(2, "0");
      if (typeof window !== "undefined" && window.history && window.history.replaceState) {
        window.history.replaceState(null, "", "#step-" + padNum);
      }

      setTimeout(() => {
        setExitingIndex(null);
        isTransitioningRef.current = false;
      }, 290);
    },
    [currentStep]
  );

  // Wheel listener for sticky stage
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const topOffset = window.innerWidth <= 1024 ? 70 : 75;
      const isStageInView =
        rect.top <= topOffset + 30 && rect.bottom >= window.innerHeight - 30;

      if (!isStageInView) {
        wheelAccumulatorRef.current = 0;
        return;
      }

      if (e.deltaY > 0) {
        if (currentStep < STEPS.length - 1) {
          e.preventDefault();
          wheelAccumulatorRef.current += e.deltaY;
          if (
            wheelAccumulatorRef.current >= 30 &&
            !isTransitioningRef.current &&
            !wheelCooldownRef.current
          ) {
            wheelAccumulatorRef.current = 0;
            wheelCooldownRef.current = true;
            activateStep(currentStep + 1, "down");
            setTimeout(() => {
              wheelCooldownRef.current = false;
            }, 300);
          }
        } else {
          wheelAccumulatorRef.current = 0;
        }
      } else if (e.deltaY < 0) {
        if (currentStep > 0) {
          e.preventDefault();
          wheelAccumulatorRef.current += e.deltaY;
          if (
            wheelAccumulatorRef.current <= -30 &&
            !isTransitioningRef.current &&
            !wheelCooldownRef.current
          ) {
            wheelAccumulatorRef.current = 0;
            wheelCooldownRef.current = true;
            activateStep(currentStep - 1, "up");
            setTimeout(() => {
              wheelCooldownRef.current = false;
            }, 300);
          }
        } else {
          wheelAccumulatorRef.current = 0;
        }
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [currentStep, activateStep]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const topOffset = window.innerWidth <= 1024 ? 70 : 75;
      const isStageInView =
        rect.top <= topOffset + 40 && rect.bottom >= window.innerHeight - 40;

      if (!isStageInView) return;

      if (e.key === "ArrowDown" || e.key === "PageDown") {
        if (currentStep < STEPS.length - 1) {
          e.preventDefault();
          activateStep(currentStep + 1, "down");
        }
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        if (currentStep > 0) {
          e.preventDefault();
          activateStep(currentStep - 1, "up");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, activateStep]);

  // Touch navigation for mobile
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length === 1) {
        const touchEndY = e.changedTouches[0].clientY;
        const diff = touchStartY - touchEndY;
        if (Math.abs(diff) > 35 && !isTransitioningRef.current) {
          if (diff > 0 && currentStep < STEPS.length - 1) {
            activateStep(currentStep + 1, "down");
          } else if (diff < 0 && currentStep > 0) {
            activateStep(currentStep - 1, "up");
          }
        }
      }
    };

    wrapper.addEventListener("touchstart", handleTouchStart, { passive: true });
    wrapper.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      wrapper.removeEventListener("touchstart", handleTouchStart);
      wrapper.removeEventListener("touchend", handleTouchEnd);
    };
  }, [currentStep, activateStep]);

  // Hash deeplink on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      const match = hash.match(/^step-(\d{2})$/);
      if (match) {
        const stepNum = parseInt(match[1], 10);
        if (stepNum >= 1 && stepNum <= STEPS.length) {
          setTimeout(() => activateStep(stepNum - 1, "down"), 150);
        }
      }
    }
  }, [activateStep]);

  return (
    <div className="site-layout">
      {/* ── Top Global Header ── */}
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
            <Link href="/how-it-works" className="nav-link active">
              How It Works
            </Link>
            <Link href="/themes" className="nav-link">
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

      {/* ── Main Page Content ── */}
      <main className="page-body">
        <div className="hiw-page-wrapper">
          {/* 1. HERO SECTION */}
          <section className="hiw-hero-section">
            <div className="hiw-container">
              <div className="hiw-hero-content">
                <div className="hiw-eyebrow-pill">
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
                  <span>HOW APPIFYHUB WORKS</span>
                </div>
                <h1 className="hiw-hero-title">
                  From Your Website to <em>Your App</em>
                </h1>
                <p className="hiw-hero-subtitle">
                  See how AppifyHub analyzes your existing website, connects your business data, prepares your website for app integration, and turns it into a dedicated mobile experience.
                </p>
                <div className="hiw-hero-actions">
                  <Link href="/signup" className="btn-hiw-primary">
                    <span>Start With Your Website &rarr;</span>
                  </Link>
                  <a href="#process-start" className="btn-hiw-secondary">
                    <span>Explore the Process &darr;</span>
                  </a>
                </div>
              </div>

              {/* Hero Visual Showcase */}
              <div className="hiw-hero-visual-wrap">
                <div className="hiw-hero-media-frame">
                  <img
                    src="/assets/images/how_it_works_hero.jpg"
                    alt="From Website to API to Mobile App Architecture"
                    className="hiw-hero-media-img"
                  />
                </div>
                <div className="hiw-hero-caption-strip">
                  <div className="hiw-caption-node">
                    <span className="caption-dot"></span>
                    <span className="caption-text">1. Existing Website</span>
                  </div>
                  <div className="hiw-caption-arrow">&rarr;</div>
                  <div className="hiw-caption-node">
                    <span className="caption-dot"></span>
                    <span className="caption-text">2. API Connection Layer</span>
                  </div>
                  <div className="hiw-caption-arrow">&rarr;</div>
                  <div className="hiw-caption-node">
                    <span className="caption-dot"></span>
                    <span className="caption-text">3. Dedicated Mobile App</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 2. INTRODUCTION: THE FOUNDATION */}
          <section className="hiw-intro-section" id="process-start">
            <div className="hiw-container">
              <div className="hiw-intro-box">
                <div className="hiw-section-badge">HOW IT WORKS</div>
                <h2 className="hiw-section-heading">Your Website Already Has the Foundation.</h2>
                <p className="hiw-intro-lead">
                  Your website already contains your products, content, customers, business information and workflows. AppifyHub connects the right parts of that existing system to a dedicated mobile app instead of forcing you to rebuild your business from scratch.
                </p>

                <div className="hiw-clarification-card">
                  <div className="clarification-icon">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  </div>
                  <div className="clarification-content">
                    <strong>Architecture Principle:</strong>
                    <span>The mobile app and website have separate, specialized user interfaces while sharing supported business data through secure APIs and integrations.</span>
                  </div>
                </div>

                {/* Editorial Pipeline Diagram */}
                <div className="hiw-foundation-pipeline">
                  <div className="pipeline-card">
                    <span className="pipeline-step-num">01</span>
                    <h3 className="pipeline-title">Your Existing Website</h3>
                    <p className="pipeline-desc">Stores, catalog, articles, customers, and active orders.</p>
                  </div>
                  <div className="pipeline-connector">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </div>
                  <div className="pipeline-card highlight-card">
                    <span className="pipeline-step-num">02</span>
                    <h3 className="pipeline-title">AppifyHub Integration</h3>
                    <p className="pipeline-desc">Secure REST API bridge, credential auth &amp; schema mapping.</p>
                  </div>
                  <div className="pipeline-connector">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </div>
                  <div className="pipeline-card">
                    <span className="pipeline-step-num">03</span>
                    <h3 className="pipeline-title">Your Mobile App</h3>
                    <p className="pipeline-desc">High-performance iOS and Android native experience.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 3. INTRODUCTORY CONTENT BEFORE SCROLL WORKFLOW */}
          <section className="hiw-workflow-intro-section" id="workflow-start">
            <div className="hiw-container">
              <div className="hiw-workflow-intro-box">
                <span className="hiw-step-tag">END-TO-END CONVERSION WORKFLOW</span>
                <h2 className="hiw-workflow-heading">From Website to App</h2>
                <p className="hiw-workflow-desc">
                  Follow the complete process as AppifyHub takes your existing website through compatibility, integration, customization and app preparation.
                </p>
              </div>
            </div>
          </section>

          {/* 4. STEP-BY-STEP SCROLL-DRIVEN EXPERIENCE */}
          <div className="hiw-scroll-story-wrapper" id="processStoryWrapper" ref={wrapperRef}>
            {/* 13 Invisible / Structural Scroll Triggers defining the vertical scroll track */}
            <div className="hiw-triggers-track" aria-hidden="true">
              {STEPS.map((s, idx) => (
                <div key={s.id} className="hiw-scroll-trigger" id={s.id} data-step-index={idx}></div>
              ))}
            </div>

            {/* Sticky Viewport Stage (Desktop: 30-35% Left, 65-70% Right) */}
            <div className="hiw-sticky-viewport">
              <div className="hiw-container hiw-sticky-grid">
                {/* LEFT: PROCESS FLOW */}
                <aside className="hiw-process-nav" aria-label="Process Step Navigation">
                  <div className="hiw-nav-sticky-box">
                    <div className="hiw-nav-header-row">
                      <span className="nav-title">PROCESS FLOW</span>
                      <span className="nav-active-name-mobile" id="mobileStepName">
                        {STEPS[currentStep].num} — {STEPS[currentStep].name}
                      </span>
                      <span className="nav-step-badge" id="navStepProgressBadge">
                        {STEPS[currentStep].num} / {String(STEPS.length).padStart(2, "0")}
                      </span>
                    </div>
                    <ul className="hiw-nav-list" id="hiwNavList">
                      {STEPS.map((s, idx) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => activateStep(idx, idx > currentStep ? "down" : "up")}
                            className={`hiw-nav-link ${currentStep === idx ? "active" : ""}`}
                            style={{ background: "none", border: "none", textAlign: "left", width: "100%", cursor: "pointer" }}
                          >
                            <span>{s.num}</span> {s.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </aside>

                {/* RIGHT: SINGLE STAGE CONTENT WINDOW */}
                <div className="hiw-stage-column">
                  <div className="hiw-single-stage-window" id="hiwStageWindow" aria-live="polite">
                    {/* STEP 01: Enter Website */}
                    <article
                      className={`hiw-stage-panel ${currentStep === 0 ? "is-active" : ""} ${
                        exitingIndex === 0 ? (direction === "down" ? "is-exiting-up" : "is-exiting-down") : ""
                      }`}
                      style={{
                        visibility: currentStep === 0 ? "visible" : "hidden",
                        opacity: currentStep === 0 ? 1 : 0,
                        pointerEvents: currentStep === 0 ? "auto" : "none",
                      }}
                    >
                      <div className="hiw-step-meta">
                        <span className="hiw-step-num">01</span>
                        <span className="hiw-step-tag">DISCOVERY &amp; INITIATION</span>
                      </div>
                      <div className="hiw-step-grid">
                        <div className="hiw-step-text-col">
                          <h2 className="hiw-step-heading">Start With the Website You Already Have</h2>
                          <p className="hiw-step-desc">
                            Enter your existing website URL and select the platform your business uses. We use your existing website as the starting point instead of asking you to build a completely new digital system.
                          </p>
                          <div className="hiw-step-bullets">
                            <div className="bullet-item"><span className="bullet-check">&bull;</span><span>Supported platforms: <strong>WordPress</strong>, <strong>WooCommerce</strong>, and <strong>Shopify</strong>.</span></div>
                            <div className="bullet-item"><span className="bullet-check">&bull;</span><span>Zero disruption to your live storefront or existing customer web traffic.</span></div>
                          </div>
                          <div className="hiw-step-action-row">
                            <Link href="/signup" className="btn-step-action">
                              <span>Check Compatibility &rarr;</span>
                            </Link>
                          </div>
                        </div>
                        <div className="hiw-step-visual-col">
                          <div className="hiw-ui-mockup-card">
                            <div className="mockup-header-row">
                              <span className="mockup-dot"></span>
                              <span className="mockup-dot"></span>
                              <span className="mockup-dot"></span>
                              <span className="mockup-title-sub">Website Analyzer</span>
                            </div>
                            <div className="mockup-input-box">
                              <span className="mockup-icon">&#127760;</span>
                              <span className="mockup-url-val">https://yourstore.com</span>
                              <span className="mockup-pill-verified">HTTPS</span>
                            </div>
                            <div className="mockup-btn-preview">
                              <span>Analyze Compatibility &rarr;</span>
                            </div>
                            <div className="mockup-footer-note">
                              Instant server-side SSL check &amp; CMS platform detection.
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>

                    {/* STEP 02: Platform Selection */}
                    <article
                      className={`hiw-stage-panel ${currentStep === 1 ? "is-active" : ""} ${
                        exitingIndex === 1 ? (direction === "down" ? "is-exiting-up" : "is-exiting-down") : ""
                      }`}
                      style={{
                        visibility: currentStep === 1 ? "visible" : "hidden",
                        opacity: currentStep === 1 ? 1 : 0,
                        pointerEvents: currentStep === 1 ? "auto" : "none",
                      }}
                    >
                      <div className="hiw-step-meta">
                        <span className="hiw-step-num">02</span>
                        <span className="hiw-step-tag">PLATFORM SELECTION</span>
                      </div>
                      <div className="hiw-step-grid hiw-grid-reversed">
                        <div className="hiw-step-visual-col">
                          <div className="hiw-platform-triad">
                            <Link href="/signup?platform=wordpress" className="hiw-platform-card">
                              <div className="triad-logo-box">
                                <img src="/assets/icons/wordpress.svg" alt="WordPress" width={32} height={32} />
                              </div>
                              <div className="triad-info">
                                <h4>WordPress</h4>
                                <span>Any WordPress Website</span>
                              </div>
                              <span className="triad-badge">Native Sync</span>
                            </Link>
                            <Link href="/signup?platform=woocommerce" className="hiw-platform-card">
                              <div className="triad-logo-box">
                                <img src="/assets/icons/woocommerce.svg" alt="WooCommerce" width={38} height={26} />
                              </div>
                              <div className="triad-info">
                                <h4>WooCommerce</h4>
                                <span>Your Online Store</span>
                              </div>
                              <span className="triad-badge">Store Engine</span>
                            </Link>
                            <Link href="/signup?platform=shopify" className="hiw-platform-card">
                              <div className="triad-logo-box">
                                <img src="/assets/icons/shopify.svg" alt="Shopify" width={28} height={34} />
                              </div>
                              <div className="triad-info">
                                <h4>Shopify</h4>
                                <span>Your Shopify Store</span>
                              </div>
                              <span className="triad-badge">Direct Connect</span>
                            </Link>
                          </div>
                        </div>
                        <div className="hiw-step-text-col">
                          <h2 className="hiw-step-heading">Choose Your Platform</h2>
                          <p className="hiw-step-desc">
                            AppifyHub supports tailored integration flows depending on how your website is built. Whether you run a content site on WordPress, an eCommerce catalog on WooCommerce, or a direct Shopify storefront, each engine uses its native API pipeline.
                          </p>
                          <p className="hiw-step-subtext">
                            The exact same verified compatibility engine is used throughout AppifyHub to ensure seamless authentication and schema continuity.
                          </p>
                          <div className="hiw-step-action-row">
                            <Link href="/signup" className="btn-step-action">
                              <span>Select Your Engine &rarr;</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>

                    {/* STEP 03: Compatibility */}
                    <article
                      className={`hiw-stage-panel ${currentStep === 2 ? "is-active" : ""} ${
                        exitingIndex === 2 ? (direction === "down" ? "is-exiting-up" : "is-exiting-down") : ""
                      }`}
                      style={{
                        visibility: currentStep === 2 ? "visible" : "hidden",
                        opacity: currentStep === 2 ? 1 : 0,
                        pointerEvents: currentStep === 2 ? "auto" : "none",
                      }}
                    >
                      <div className="hiw-step-meta">
                        <span className="hiw-step-num">03</span>
                        <span className="hiw-step-tag">COMPATIBILITY VERIFICATION</span>
                      </div>
                      <div className="hiw-step-grid">
                        <div className="hiw-step-text-col">
                          <h2 className="hiw-step-heading">We Check Before We Build</h2>
                          <p className="hiw-step-desc">
                            We don't simply wrap your website in an app container. First, our automated analyzer evaluates whether your website has the necessary technical foundation for a reliable, fast native mobile application.
                          </p>
                          <div className="hiw-audit-params-list">
                            <div className="audit-param-pill"><span>Platform Architecture</span></div>
                            <div className="audit-param-pill"><span>HTTPS / SSL Encryption</span></div>
                            <div className="audit-param-pill"><span>REST API Availability</span></div>
                            <div className="audit-param-pill"><span>API Authentication</span></div>
                            <div className="audit-param-pill"><span>Mobile Viewport &amp; Layout</span></div>
                            <div className="audit-param-pill"><span>Data Accessibility</span></div>
                            <div className="audit-param-pill"><span>Product &amp; Content Taxonomy</span></div>
                            <div className="audit-param-pill"><span>Navigation Integrity</span></div>
                          </div>
                          <p className="hiw-step-disclaimer">
                            <em>Process guarantee:</em> Every compatibility parameter is diagnosed live against standard Web &amp; REST protocols.
                          </p>
                        </div>
                        <div className="hiw-step-visual-col">
                          <div className="hiw-report-card-preview">
                            <div className="report-top-banner">
                              <span className="report-badge">LIVE EVALUATION</span>
                              <h4>Technical Readiness Checklist</h4>
                            </div>
                            <div className="report-items-table">
                              <div className="report-row"><span className="item-name">Platform</span><span className="item-val is-good">&check; WordPress / WooCommerce / Shopify</span></div>
                              <div className="report-row"><span className="item-name">SSL / HTTPS</span><span className="item-val is-good">&check; Active &amp; Valid Certificate</span></div>
                              <div className="report-row"><span className="item-name">API Access</span><span className="item-val is-good">&check; Available &amp; Accessible</span></div>
                              <div className="report-row"><span className="item-name">Mobile Responsiveness</span><span className="item-val is-good">&check; Compatible Viewport</span></div>
                              <div className="report-row"><span className="item-name">Data Access</span><span className="item-val is-good">&check; Live Sync Ready</span></div>
                              <div className="report-row"><span className="item-name">App Readiness</span><span className="item-val is-good">&check; Ready for Native Build</span></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>

                    {/* STEP 04: Secure Connect */}
                    <article
                      className={`hiw-stage-panel ${currentStep === 3 ? "is-active" : ""} ${
                        exitingIndex === 3 ? (direction === "down" ? "is-exiting-up" : "is-exiting-down") : ""
                      }`}
                      style={{
                        visibility: currentStep === 3 ? "visible" : "hidden",
                        opacity: currentStep === 3 ? 1 : 0,
                        pointerEvents: currentStep === 3 ? "auto" : "none",
                      }}
                    >
                      <div className="hiw-step-meta">
                        <span className="hiw-step-num">04</span>
                        <span className="hiw-step-tag">CREDENTIAL INTEGRATION</span>
                      </div>
                      <div className="hiw-step-grid hiw-grid-reversed">
                        <div className="hiw-step-visual-col">
                          <div className="hiw-api-accordion-box">
                            <div className="api-preview-card">
                              <div className="acc-summary">
                                <span className="acc-platform">WordPress REST API</span>
                                <span className="acc-badge">Application Passwords</span>
                              </div>
                              <p className="acc-desc">Connects via standard application credentials. Does not store your master login password.</p>
                            </div>
                            <div className="api-preview-card">
                              <div className="acc-summary">
                                <span className="acc-platform">WooCommerce REST API</span>
                                <span className="acc-badge">Read / Write Keys</span>
                              </div>
                              <p className="acc-desc">Direct Consumer Key &amp; Secret authentication generated in WooCommerce settings.</p>
                            </div>
                            <div className="api-preview-card">
                              <div className="acc-summary">
                                <span className="acc-platform">Shopify Admin API</span>
                                <span className="acc-badge">Scoped Access</span>
                              </div>
                              <p className="acc-desc">Connects using custom app tokens with scoped access to products, orders and customers.</p>
                            </div>
                          </div>
                        </div>
                        <div className="hiw-step-text-col">
                          <h2 className="hiw-step-heading">Connect Your Website Securely</h2>
                          <p className="hiw-step-desc">
                            Once your website passes initial checks, AppifyHub securely connects to the platform using its supported APIs and authentication methods.
                          </p>
                          <p className="hiw-step-desc">
                            All credentials are encrypted server-side with AES-256-CBC, never exposed in frontend code, and only minimum necessary scopes are requested.
                          </p>
                          <div className="hiw-step-action-row">
                            <Link href="/signup" className="btn-step-action">
                              <span>View Compatibility Setup &rarr;</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>

                    {/* STEP 05: Technical Help */}
                    <article
                      className={`hiw-stage-panel ${currentStep === 4 ? "is-active" : ""} ${
                        exitingIndex === 4 ? (direction === "down" ? "is-exiting-up" : "is-exiting-down") : ""
                      }`}
                      style={{
                        visibility: currentStep === 4 ? "visible" : "hidden",
                        opacity: currentStep === 4 ? 1 : 0,
                        pointerEvents: currentStep === 4 ? "auto" : "none",
                      }}
                    >
                      <div className="hiw-step-meta">
                        <span className="hiw-step-num">05</span>
                        <span className="hiw-step-tag hiw-tag-warning">NOT READY YET?</span>
                      </div>
                      <div className="hiw-step-grid">
                        <div className="hiw-step-text-col">
                          <h2 className="hiw-step-heading">We Don't Just Say "Not Compatible."</h2>
                          <p className="hiw-step-desc">
                            If your website needs technical improvements before an app can be built, our analyzer pinpoints exactly what needs attention instead of leaving you with a dead end.
                          </p>
                          <p className="hiw-step-subtext">
                            Whether your store needs REST API endpoints enabled, SSL certificate installation, or viewport optimization, we provide specific guidance and an improvement request flow to prepare your site for app integration.
                          </p>
                          <div className="hiw-step-action-row">
                            <Link href="/signup" className="btn-step-action btn-step-warning">
                              <span>Request Website Improvements &rarr;</span>
                            </Link>
                          </div>
                        </div>
                        <div className="hiw-step-visual-col">
                          <div className="hiw-needs-attention-card">
                            <div className="attention-header">
                              <span className="attention-icon">&excl;</span>
                              <h4>Technical Diagnostics Sample</h4>
                            </div>
                            <div className="attention-items">
                              <div className="attention-row is-warn"><span className="row-label">API Access</span><span className="row-status">&Delta; Needs configuration in admin</span></div>
                              <div className="attention-row is-warn"><span className="row-label">Mobile Experience</span><span className="row-status">&Delta; Viewport meta tag needs tuning</span></div>
                              <div className="attention-row is-ok"><span className="row-label">Required Data</span><span className="row-status">&check; Products &amp; inventory available</span></div>
                            </div>
                            <div className="attention-footer">
                              We assist you in configuring requirements without forcing full rebuilds.
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>

                    {/* STEP 06: Choose Theme */}
                    <article
                      className={`hiw-stage-panel ${currentStep === 5 ? "is-active" : ""} ${
                        exitingIndex === 5 ? (direction === "down" ? "is-exiting-up" : "is-exiting-down") : ""
                      }`}
                      style={{
                        visibility: currentStep === 5 ? "visible" : "hidden",
                        opacity: currentStep === 5 ? 1 : 0,
                        pointerEvents: currentStep === 5 ? "auto" : "none",
                      }}
                    >
                      <div className="hiw-step-meta">
                        <span className="hiw-step-num">06</span>
                        <span className="hiw-step-tag">DESIGN &amp; THEMES</span>
                      </div>
                      <div className="hiw-step-grid hiw-grid-reversed">
                        <div className="hiw-step-visual-col">
                          <div className="hiw-theme-showcase-frame">
                            <img
                              src="/assets/images/theme_phones_showcase.jpg"
                              alt="Native Mobile App Themes Showcase"
                              className="hiw-theme-showcase-img"
                            />
                          </div>
                          <div className="hiw-theme-badges-row">
                            <span className="theme-pill">MINIMAL</span>
                            <span className="theme-pill">MODERN</span>
                            <span className="theme-pill">TRENDY</span>
                            <span className="theme-pill">COMMERCE</span>
                          </div>
                        </div>
                        <div className="hiw-step-text-col">
                          <h2 className="hiw-step-heading">Choose How Your App Should Look</h2>
                          <p className="hiw-step-desc">
                            Once your website is ready, choose a professionally designed app theme that matches your brand identity, product presentation, and business aesthetics.
                          </p>
                          <div className="hiw-step-bullets">
                            <div className="bullet-item"><span className="bullet-check">&bull;</span><span>Customizable brand colors, typography and logo assets.</span></div>
                            <div className="bullet-item"><span className="bullet-check">&bull;</span><span>Native tab bars, smooth category sliders and curated hero banners.</span></div>
                            <div className="bullet-item"><span className="bullet-check">&bull;</span><span>Optimized layouts tailored for eCommerce conversions and reading.</span></div>
                          </div>
                          <div className="hiw-step-action-row">
                            <Link href="/themes" className="btn-step-action">
                              <span>Explore Themes &rarr;</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>

                    {/* STEP 07: Add Features */}
                    <article
                      className={`hiw-stage-panel ${currentStep === 6 ? "is-active" : ""} ${
                        exitingIndex === 6 ? (direction === "down" ? "is-exiting-up" : "is-exiting-down") : ""
                      }`}
                      style={{
                        visibility: currentStep === 6 ? "visible" : "hidden",
                        opacity: currentStep === 6 ? 1 : 0,
                        pointerEvents: currentStep === 6 ? "auto" : "none",
                      }}
                    >
                      <div className="hiw-step-meta">
                        <span className="hiw-step-num">07</span>
                        <span className="hiw-step-tag">MODULAR CAPABILITIES</span>
                      </div>
                      <div className="hiw-step-grid">
                        <div className="hiw-step-text-col">
                          <h2 className="hiw-step-heading">Your App. Your Features.</h2>
                          <p className="hiw-step-desc">
                            Every business needs different functionality. Choose only the features that make sense for your customers, keeping your app fast, lightweight, and clutter-free.
                          </p>
                          <p className="hiw-step-subtext">
                            Start with essential catalog synchronization and add push marketing, direct messaging, or loyalty systems whenever your business requires them.
                          </p>
                        </div>
                        <div className="hiw-step-visual-col">
                          <div className="hiw-features-editorial-grid">
                            <div className="feature-editorial-item">
                              <span className="feature-icon">&#128276;</span>
                              <div>
                                <h4>Push Notifications</h4>
                                <p>Send instant order updates, flash deals, and cart reminders directly to device lock screens.</p>
                              </div>
                            </div>
                            <div className="feature-editorial-item">
                              <span className="feature-icon">&#128172;</span>
                              <div>
                                <h4>WhatsApp Chat</h4>
                                <p>Enable one-tap customer support and inquiry chats straight from the product screen.</p>
                              </div>
                            </div>
                            <div className="feature-editorial-item">
                              <span className="feature-icon">&#128200;</span>
                              <div>
                                <h4>Analytics &amp; Metrics</h4>
                                <p>Track in-app conversions, user journeys, retention rates, and active screens.</p>
                              </div>
                            </div>
                            <div className="feature-editorial-item">
                              <span className="feature-icon">&#127991;</span>
                              <div>
                                <h4>Coupons &amp; Offers</h4>
                                <p>Redeem exclusive in-app discount vouchers and flash sale codes at native checkout.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>

                    {/* STEP 08: Data Connection */}
                    <article
                      className={`hiw-stage-panel ${currentStep === 7 ? "is-active" : ""} ${
                        exitingIndex === 7 ? (direction === "down" ? "is-exiting-up" : "is-exiting-down") : ""
                      }`}
                      style={{
                        visibility: currentStep === 7 ? "visible" : "hidden",
                        opacity: currentStep === 7 ? 1 : 0,
                        pointerEvents: currentStep === 7 ? "auto" : "none",
                      }}
                    >
                      <div className="hiw-step-meta">
                        <span className="hiw-step-num">08</span>
                        <span className="hiw-step-tag">DATA ARCHITECTURE</span>
                      </div>
                      <div className="hiw-architecture-header-center">
                        <h2 className="hiw-step-heading">One Business. Connected Data.</h2>
                        <p className="hiw-step-desc">
                          Your website and app do not need completely separate business databases. The app connects to existing business data through APIs and integrations, avoiding duplicate data systems.
                        </p>
                      </div>
                      <div className="hiw-data-diagram-card">
                        <div className="diagram-top-node">
                          <div className="diagram-badge-title">
                            <span className="db-icon">&#128452;</span>
                            <strong>EXISTING BUSINESS DATA</strong>
                          </div>
                          <div className="diagram-entities-chips">
                            <span>Products</span>
                            <span>Orders</span>
                            <span>Customers</span>
                            <span>Categories</span>
                            <span>Inventory</span>
                          </div>
                        </div>
                        <div className="diagram-conduit-bridge">
                          <span className="conduit-line"></span>
                          <div className="conduit-label-box">
                            <span className="conduit-pulse"></span>
                            <span>SECURE REST API &amp; WEBHOOK BRIDGE</span>
                          </div>
                          <span className="conduit-line"></span>
                        </div>
                        <div className="diagram-destinations-row">
                          <div className="dest-col">
                            <div className="dest-card">
                              <span className="dest-type">BROWSER DESKTOP &amp; MOBILE</span>
                              <h4>Website Storefront</h4>
                              <p>Continues operating normally without schema changes or database migration.</p>
                            </div>
                          </div>
                          <div className="dest-sync-indicator">
                            <span>&harr; Live Sync &harr;</span>
                          </div>
                          <div className="dest-col">
                            <div className="dest-card highlight-dest">
                              <span className="dest-type">NATIVE IOS &amp; ANDROID</span>
                              <h4>AppifyHub Mobile App</h4>
                              <p>Accesses identical inventory, user accounts, and order histories directly via API.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>

                    {/* STEP 09: Independent App */}
                    <article
                      className={`hiw-stage-panel ${currentStep === 8 ? "is-active" : ""} ${
                        exitingIndex === 8 ? (direction === "down" ? "is-exiting-up" : "is-exiting-down") : ""
                      }`}
                      style={{
                        visibility: currentStep === 8 ? "visible" : "hidden",
                        opacity: currentStep === 8 ? 1 : 0,
                        pointerEvents: currentStep === 8 ? "auto" : "none",
                      }}
                    >
                      <div className="hiw-step-meta">
                        <span className="hiw-step-num">09</span>
                        <span className="hiw-step-tag">INDEPENDENT INTERFACES</span>
                      </div>
                      <div className="hiw-step-grid">
                        <div className="hiw-step-text-col">
                          <h2 className="hiw-step-heading">Your Website Can Change Without Rebuilding Your App</h2>
                          <p className="hiw-step-desc">
                            Your website and mobile app are designed as separate user experiences. Frontend changes to your website generally do not change the app's UI because the two interfaces are decoupled.
                          </p>
                          <p className="hiw-step-subtext">
                            Redesigning your website's header, banner images, or landing page layout will not disrupt your app's native navigation or mobile performance.
                          </p>
                        </div>
                        <div className="hiw-step-visual-col">
                          <div className="hiw-decoupled-ui-card">
                            <div className="decoupled-box">
                              <div className="ui-panel left-panel">
                                <div className="panel-header">Website UI</div>
                                <p className="panel-desc">Desktop &amp; Mobile Responsive Web Frontend</p>
                              </div>
                              <div className="decoupled-vs-divider">
                                <span>&ne;</span>
                                <small>Separate UI</small>
                              </div>
                              <div className="ui-panel right-panel">
                                <div className="panel-header">Mobile App UI</div>
                                <p className="panel-desc">Native Swift &amp; Kotlin Mobile Interface</p>
                              </div>
                            </div>
                            <div className="decoupled-bridge-footer">
                              <span className="bridge-check">&check;</span>
                              <span>Both connected to the same live product &amp; order data via REST APIs</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>

                    {/* STEP 10: Checkout */}
                    <article
                      className={`hiw-stage-panel ${currentStep === 9 ? "is-active" : ""} ${
                        exitingIndex === 9 ? (direction === "down" ? "is-exiting-up" : "is-exiting-down") : ""
                      }`}
                      style={{
                        visibility: currentStep === 9 ? "visible" : "hidden",
                        opacity: currentStep === 9 ? 1 : 0,
                        pointerEvents: currentStep === 9 ? "auto" : "none",
                      }}
                    >
                      <div className="hiw-step-meta">
                        <span className="hiw-step-num">10</span>
                        <span className="hiw-step-tag">ORDER &amp; CHECKOUT</span>
                      </div>
                      <div className="hiw-step-grid hiw-grid-reversed">
                        <div className="hiw-step-visual-col">
                          <div className="hiw-checkout-mockup-card">
                            <div className="checkout-mockup-header">
                              <span className="cart-icon">&#128722;</span>
                              <h4>Configuration Summary</h4>
                            </div>
                            <div className="checkout-line-items">
                              <div className="checkout-row">
                                <span>Selected Platform (WooCommerce / Shopify)</span>
                                <span className="row-price">Connected</span>
                              </div>
                              <div className="checkout-row">
                                <span>App Theme (Modern Minimalist)</span>
                                <span className="row-price">Included</span>
                              </div>
                              <div className="checkout-row">
                                <span>Push Notifications &amp; WhatsApp Integration</span>
                                <span className="row-price">Selected</span>
                              </div>
                              <div className="checkout-row is-total">
                                <span>Total App Package</span>
                                <span className="row-total-val">Transparent Plan</span>
                              </div>
                            </div>
                            <div className="checkout-note">
                              Prices dynamically calculated from our database-driven pricing tier.
                            </div>
                          </div>
                        </div>
                        <div className="hiw-step-text-col">
                          <h2 className="hiw-step-heading">Transparent Ordering &amp; Secure Checkout</h2>
                          <p className="hiw-step-desc">
                            Before completing your order, review every detail: selected platform, native theme, configured feature set, add-ons, publishing options, and total price.
                          </p>
                          <p className="hiw-step-subtext">
                            Complete payment securely via integrated gateways (Razorpay / Stripe) with server-side HMAC verification. No surprise fees or hidden sales commissions.
                          </p>
                          <div className="hiw-step-action-row">
                            <Link href="/plans" className="btn-step-action">
                              <span>View Pricing Plans &rarr;</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>

                    {/* STEP 11: App Build */}
                    <article
                      className={`hiw-stage-panel ${currentStep === 10 ? "is-active" : ""} ${
                        exitingIndex === 10 ? (direction === "down" ? "is-exiting-up" : "is-exiting-down") : ""
                      }`}
                      style={{
                        visibility: currentStep === 10 ? "visible" : "hidden",
                        opacity: currentStep === 10 ? 1 : 0,
                        pointerEvents: currentStep === 10 ? "auto" : "none",
                      }}
                    >
                      <div className="hiw-step-meta">
                        <span className="hiw-step-num">11</span>
                        <span className="hiw-step-tag">BUILD &amp; PACKAGING</span>
                      </div>
                      <div className="hiw-step-grid hiw-grid-reversed">
                        <div className="hiw-step-visual-col">
                          <div className="hiw-build-pipeline-card">
                            <div className="pipeline-flow-vertical">
                              <div className="flow-stage is-done">
                                <span className="stage-num">&check;</span>
                                <span className="stage-name">Configuration Validation</span>
                              </div>
                              <div className="flow-stage is-done">
                                <span className="stage-num">&check;</span>
                                <span className="stage-name">API Integration &amp; Secrets Injected</span>
                              </div>
                              <div className="flow-stage is-active">
                                <span className="stage-num">&bull;</span>
                                <span className="stage-name">Native Binary Compilation (Android &amp; iOS)</span>
                              </div>
                              <div className="flow-stage">
                                <span className="stage-num">&bull;</span>
                                <span className="stage-name">Automated Quality Checks</span>
                              </div>
                              <div className="flow-stage">
                                <span className="stage-num">&bull;</span>
                                <span className="stage-name">Artifact Delivery &amp; Publishing Prep</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="hiw-step-text-col">
                          <h2 className="hiw-step-heading">We Prepare Your App</h2>
                          <p className="hiw-step-desc">
                            After payment and configuration, the selected setup enters our preparation and compilation pipeline.
                          </p>
                          <p className="hiw-step-desc">
                            Depending on your selected package, this includes generating Android APK / AAB binaries, compiling iOS release packages, injecting app icons, branding splash screens, and binding push notification keys.
                          </p>
                        </div>
                      </div>
                    </article>

                    {/* STEP 12: Testing */}
                    <article
                      className={`hiw-stage-panel ${currentStep === 11 ? "is-active" : ""} ${
                        exitingIndex === 11 ? (direction === "down" ? "is-exiting-up" : "is-exiting-down") : ""
                      }`}
                      style={{
                        visibility: currentStep === 11 ? "visible" : "hidden",
                        opacity: currentStep === 11 ? 1 : 0,
                        pointerEvents: currentStep === 11 ? "auto" : "none",
                      }}
                    >
                      <div className="hiw-step-meta">
                        <span className="hiw-step-num">12</span>
                        <span className="hiw-step-tag">QUALITY ASSURANCE</span>
                      </div>
                      <div className="hiw-step-grid">
                        <div className="hiw-step-text-col">
                          <h2 className="hiw-step-heading">Test Before You Go Live</h2>
                          <p className="hiw-step-desc">
                            Every generated app is rigorously tested against your live website integration and selected features before final delivery or submission to Google Play and Apple App Store.
                          </p>
                          <div className="hiw-qa-checklist">
                            <div className="qa-item"><span className="qa-mark">&check;</span><span>Smooth native bottom navigation &amp; deep linking</span></div>
                            <div className="qa-item"><span className="qa-mark">&check;</span><span>Real-time catalog synchronization &amp; image caching</span></div>
                            <div className="qa-item"><span className="qa-mark">&check;</span><span>Cart, checkout, and payment gateway functionality</span></div>
                            <div className="qa-item"><span className="qa-mark">&check;</span><span>Push notification delivery on physical devices</span></div>
                          </div>
                        </div>
                        <div className="hiw-step-visual-col">
                          <div className="hiw-qa-pipeline-card">
                            <div className="qa-stages-row">
                              <div className="qa-stage-box"><span className="qa-stage-label">BUILD</span><strong>Compiled</strong></div>
                              <span className="qa-arrow">&rarr;</span>
                              <div className="qa-stage-box"><span className="qa-stage-label">TEST</span><strong>Verified</strong></div>
                              <span className="qa-arrow">&rarr;</span>
                              <div className="qa-stage-box"><span className="qa-stage-label">REVIEW</span><strong>Approved</strong></div>
                              <span className="qa-arrow">&rarr;</span>
                              <div className="qa-stage-box is-highlight"><span className="qa-stage-label">FINALIZE</span><strong>Ready</strong></div>
                            </div>
                            <div className="qa-badge-note">
                              Full quality assurance guarantee prior to store publication.
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>

                    {/* STEP 13: Launch */}
                    <article
                      className={`hiw-stage-panel ${currentStep === 12 ? "is-active" : ""} ${
                        exitingIndex === 12 ? (direction === "down" ? "is-exiting-up" : "is-exiting-down") : ""
                      }`}
                      style={{
                        visibility: currentStep === 12 ? "visible" : "hidden",
                        opacity: currentStep === 12 ? 1 : 0,
                        pointerEvents: currentStep === 12 ? "auto" : "none",
                      }}
                    >
                      <div className="hiw-step-meta">
                        <span className="hiw-step-num">13</span>
                        <span className="hiw-step-tag">STORE PUBLICATION</span>
                      </div>
                      <div className="hiw-step-grid hiw-grid-reversed">
                        <div className="hiw-step-visual-col">
                          <div className="hiw-launch-showcase-card">
                            <div className="launch-icon-badge">&#128640;</div>
                            <h4>Published to Your Store Accounts</h4>
                            <p>Google Play Store &amp; Apple App Store listings are published under your company developer account for 100% brand ownership.</p>
                            <div className="launch-badges-row">
                              <span className="launch-pill">Google Play Ready</span>
                              <span className="launch-pill">Apple App Store Ready</span>
                            </div>
                          </div>
                        </div>
                        <div className="hiw-step-text-col">
                          <h2 className="hiw-step-heading">Launch &amp; Scale Your Mobile Channel</h2>
                          <p className="hiw-step-desc">
                            Your app is delivered, signed, and ready for deployment. Your customers can download your native app directly from the App Store and Google Play.
                          </p>
                          <p className="hiw-step-subtext">
                            Enjoy higher conversion rates, instant push notifications, and loyal returning customers—all powered by your existing website foundation.
                          </p>
                          <div className="hiw-step-action-row">
                            <Link href="/signup" className="btn-step-action">
                              <span>Begin With Your Website &rarr;</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 5. FINAL RESULT FULL-WIDTH SHOWCASE */}
          <section className="hiw-final-result-section">
            <div className="hiw-container">
              <div className="hiw-result-showcase-box">
                <span className="hiw-eyebrow-accent">THE OUTCOME</span>
                <h2 className="hiw-result-heading">Your Website. Now in an App.</h2>
                <p className="hiw-result-lead">
                  You already built your business online. AppifyHub helps turn that existing foundation into a dedicated mobile experience without rebuilding everything from scratch.
                </p>

                <div className="hiw-result-diagram-row">
                  <div className="result-node">
                    <span className="node-tag">FOUNDATION</span>
                    <h4>Existing Website</h4>
                    <p>WordPress &middot; WooCommerce &middot; Shopify</p>
                  </div>
                  <div className="result-divider-arrow">&rarr;</div>
                  <div className="result-node highlight-node">
                    <span className="node-tag">TECHNOLOGY</span>
                    <h4>API Data Bridge</h4>
                    <p>Real-Time REST Synchronization</p>
                  </div>
                  <div className="result-divider-arrow">&rarr;</div>
                  <div className="result-node">
                    <span className="node-tag">EXPERIENCE</span>
                    <h4>Dedicated Mobile App</h4>
                    <p>iOS &middot; Android &middot; High Conversion</p>
                  </div>
                </div>

                <div className="hiw-result-cta-wrap">
                  <Link href="/signup" className="btn-hiw-primary btn-large">
                    <span>Check Website Compatibility &rarr;</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* ── Global AppifyHub Footer ── */}
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
              <p className="brand-tagline">Turn your website into a powerful mobile experience.</p>
            </div>

            {/* Product Links */}
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

            {/* Platform Links */}
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
