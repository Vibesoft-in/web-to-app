"use client";

import { useState } from "react";
import Link from "next/link";

interface FaqItem {
  q: string;
  a: string;
  category: "setup" | "api" | "publishing" | "features";
}

const FAQ_DATA: FaqItem[] = [
  {
    category: "setup",
    q: "How does AppifyHub convert my website into a native mobile app?",
    a: "AppifyHub connects directly to your website's REST APIs (WordPress, WooCommerce, or Shopify) to pull your product catalog, categories, user accounts, and content into a real native Flutter-based mobile shell. This provides 60fps native performance, instant biometric login, and push notifications without clumsy web-view delays.",
  },
  {
    category: "setup",
    q: "Do I need any mobile app coding or technical experience?",
    a: "No coding is required at all. Our step-by-step setup wizard guides you through entering your website URL, choosing your preferred theme and branding colors, connecting your store keys, and generating your test build in minutes.",
  },
  {
    category: "api",
    q: "How do I connect WooCommerce or WordPress REST API keys?",
    a: "In your WordPress admin, navigate to WooCommerce > Settings > Advanced > REST API, and generate an API key with 'Read/Write' permissions. Copy the Consumer Key and Consumer Secret into your AppifyHub setup step. All keys are encrypted using AES-256-CBC and kept strictly confidential.",
  },
  {
    category: "api",
    q: "Will changes to my website products or inventory automatically sync with the app?",
    a: "Yes! Because the app communicates in real time via secure API pipelines, any changes to products, inventory counts, pricing, coupons, or order statuses on your website update inside the mobile app instantly.",
  },
  {
    category: "publishing",
    q: "How do Google Play Store and Apple App Store publishing work?",
    a: "Once your app build is generated, we provide production-ready Android App Bundles (.aab) and iOS application archives (.ipa). Depending on your plan (Pro or Enterprise), our submission engineers can also manage the entire developer console submission and approval process on your behalf.",
  },
  {
    category: "publishing",
    q: "What happens if Apple or Google requests changes during review?",
    a: "Our team provides dedicated review guarantee support. If the App Store review team requests metadata adjustments, screenshots, or demo accounts, our engineers will help make the necessary fixes and guide you through resubmission until approved.",
  },
  {
    category: "features",
    q: "How do push notifications work and is there a limit?",
    a: "Push notifications are powered by Firebase Cloud Messaging (FCM). You can broadcast unlimited promotional messages, flash sale announcements, and order status alerts directly from your AppifyHub dashboard to customer devices with 70%+ open rates.",
  },
  {
    category: "features",
    q: "Can I customize the colors, logos, and layout after launching?",
    a: "Yes. From your AppifyHub dashboard, you can change your accent colors, banner graphics, splash screen, and theme templates at any time without having to republish a new build to the app stores for minor visual updates.",
  },
];

export default function SupportPage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    website: "",
    platform: "woocommerce",
    category: "setup",
    priority: "normal",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<{ id: string; email: string } | null>(null);

  const filteredFaqs =
    activeCategory === "all"
      ? FAQ_DATA
      : FAQ_DATA.filter((item) => item.category === activeCategory);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const ticketId = "TK-" + Math.floor(100000 + Math.random() * 900000);
      setSubmittedTicket({ id: ticketId, email: formData.email });
      setIsSubmitting(false);
    }, 900);
  };

  return (
    <div className="home-page-root site-layout">
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
            <Link href="/themes" className="nav-link">
              Themes
            </Link>
            <Link href="/plans" className="nav-link">
              Plans
            </Link>
            <Link href="/support" className="nav-link active">
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

      {/* ===================================================
          2. MAIN CONTENT
          =================================================== */}
      <main className="page-body">
        <div className="support-page-wrapper">
          {/* ── Hero Section ── */}
          <section className="support-hero-section">
            <div className="support-container">
              <div className="support-hero-content text-center">
                <span className="eyebrow-tag">DEDICATED APP SUPPORT &amp; ASSISTANCE</span>
                <h1 className="section-heading" style={{ fontSize: "2.75rem", marginBottom: "1rem" }}>
                  How Can We Help You Today?
                </h1>
                <p className="section-subheading" style={{ maxWidth: "720px", margin: "0 auto 2.5rem" }}>
                  Whether you are converting your website, connecting store APIs, customizing theme styles, or publishing to Google Play and Apple App Store, our engineering team is here for you.
                </p>

                {/* Quick Action Badges */}
                <div className="support-quick-badges">
                  <a href="#ticket-form" className="quick-badge-pill">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>Submit a Support Ticket</span>
                  </a>
                  <a href="https://wa.me/919999999999" target="_blank" rel="noopener noreferrer" className="quick-badge-pill is-highlight">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67Z" />
                    </svg>
                    <span>Direct WhatsApp Chat</span>
                  </a>
                  <a href="#faq" className="quick-badge-pill">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span>Frequently Asked Questions</span>
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* ── Channel Cards Strip ── */}
          <section className="support-channels-section">
            <div className="support-container">
              <div className="channels-grid">
                {/* Channel 1: WhatsApp */}
                <div className="channel-card">
                  <div className="channel-icon-bubble whatsapp-bubble">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#25D366">
                      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2Z" />
                    </svg>
                  </div>
                  <span className="channel-tag">FASTEST RESPONSE</span>
                  <h3 className="channel-title">WhatsApp Live Chat</h3>
                  <p className="channel-desc">
                    Connect directly with an AppifyHub deployment engineer. Get instant troubleshooting for store API sync, live build checks, and urgent queries.
                  </p>
                  <div className="channel-meta">
                    <span className="meta-item">⚡ Typically replies in &lt; 5 mins</span>
                    <span className="meta-item">🕒 Mon–Sat: 9:00 AM – 8:00 PM IST</span>
                  </div>
                  <a
                    href="https://wa.me/919999999999?text=Hi%20AppifyHub%20Support,%20I%20need%20assistance%20with%20my%20mobile%20app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-channel-action whatsapp-btn"
                  >
                    <span>Chat on WhatsApp &rarr;</span>
                  </a>
                </div>

                {/* Channel 2: Email & Helpdesk */}
                <div className="channel-card">
                  <div className="channel-icon-bubble">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#78593D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>
                  <span className="channel-tag">IN-DEPTH AUDIT</span>
                  <h3 className="channel-title">Email &amp; Ticket Desk</h3>
                  <p className="channel-desc">
                    Send detailed bug reports, custom theme customization requests, API diagnostic logs, or publishing verification documents.
                  </p>
                  <div className="channel-meta">
                    <span className="meta-item">📧 support@appifyhub.com</span>
                    <span className="meta-item">⏱ Average response within 4 hours</span>
                  </div>
                  <a href="#ticket-form" className="btn-channel-action">
                    <span>Open Support Ticket &darr;</span>
                  </a>
                </div>

                {/* Channel 3: Store Diagnostics */}
                <div className="channel-card">
                  <div className="channel-icon-bubble">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#78593D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </div>
                  <span className="channel-tag">TECHNICAL READINESS</span>
                  <h3 className="channel-title">Compatibility Analysis</h3>
                  <p className="channel-desc">
                    Not sure if your WordPress, WooCommerce, or Shopify setup is ready? Run our free automated test or request our manual configuration audit.
                  </p>
                  <div className="channel-meta">
                    <span className="meta-item">🔍 Checks REST API, SSL, Viewport</span>
                    <span className="meta-item">🛡 100% Secure credential isolation</span>
                  </div>
                  <Link href="/how-it-works" className="btn-channel-action">
                    <span>Explore Setup Process &rarr;</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* ── System Status Banner ── */}
          <section className="status-strip-section">
            <div className="support-container">
              <div className="status-bar-box">
                <div className="status-indicator-col">
                  <span className="status-pulse-dot" />
                  <div>
                    <h4 className="status-title">All AppifyHub Systems Operational</h4>
                    <p className="status-sub">Cloud Build Servers, API Webhooks &amp; Notification Push Gateways running at 99.98% uptime</p>
                  </div>
                </div>
                <div className="status-metrics-row">
                  <div className="metric-badge">
                    <span className="metric-label">Build Engine</span>
                    <span className="metric-val">100% Online</span>
                  </div>
                  <div className="metric-badge">
                    <span className="metric-label">Catalog Sync</span>
                    <span className="metric-val">99.98%</span>
                  </div>
                  <div className="metric-badge">
                    <span className="metric-label">Push Gateway</span>
                    <span className="metric-val">Operational</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Ticket Submission Form Section ── */}
          <section className="ticket-form-section" id="ticket-form">
            <div className="support-container">
              <div className="form-card-wrap">
                <div className="form-card-header text-center">
                  <span className="eyebrow-tag">GET PRIORITY ASSISTANCE</span>
                  <h2 className="section-heading" style={{ fontSize: "2rem" }}>
                    Submit a Support Request
                  </h2>
                  <p className="section-subheading" style={{ maxWidth: "600px", margin: "0 auto" }}>
                    Fill out the form below. Our technical support engineers will review your request and get back to you with a resolution or next steps.
                  </p>
                </div>

                {submittedTicket ? (
                  <div className="ticket-success-box text-center">
                    <div className="success-icon-bubble">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <h3 className="success-heading">Ticket Created Successfully!</h3>
                    <p className="success-ticket-id">
                      Ticket ID: <strong>{submittedTicket.id}</strong>
                    </p>
                    <p className="success-desc">
                      We have received your request and dispatched an alert to our technical support team. A confirmation receipt and updates will be delivered to <strong>{submittedTicket.email}</strong>.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmittedTicket(null);
                        setFormData({
                          name: "",
                          email: "",
                          website: "",
                          platform: "woocommerce",
                          category: "setup",
                          priority: "normal",
                          message: "",
                        });
                      }}
                      className="btn-outline"
                      style={{ marginTop: "1.5rem" }}
                    >
                      Submit Another Request
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="support-form">
                    <div className="form-row form-row-2">
                      <div className="form-group">
                        <label className="form-label" htmlFor="user-name">Your Full Name *</label>
                        <input
                          id="user-name"
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g. Rahul Sharma"
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="user-email">Email Address *</label>
                        <input
                          id="user-email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="e.g. rahul@mybrand.com"
                          className="form-input"
                        />
                      </div>
                    </div>

                    <div className="form-row form-row-2">
                      <div className="form-group">
                        <label className="form-label" htmlFor="user-website">Website URL</label>
                        <input
                          id="user-website"
                          type="url"
                          value={formData.website}
                          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                          placeholder="https://yourstore.com"
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="user-platform">Store Platform</label>
                        <select
                          id="user-platform"
                          value={formData.platform}
                          onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                          className="form-select"
                        >
                          <option value="woocommerce">WooCommerce</option>
                          <option value="wordpress">WordPress</option>
                          <option value="shopify">Shopify</option>
                          <option value="custom">Custom Web Platform</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row form-row-2">
                      <div className="form-group">
                        <label className="form-label" htmlFor="user-category">Support Category *</label>
                        <select
                          id="user-category"
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="form-select"
                        >
                          <option value="setup">Initial Setup &amp; Onboarding</option>
                          <option value="api">Store API Credentials &amp; Sync</option>
                          <option value="build">App Build &amp; Testing (.aab / .ipa)</option>
                          <option value="publishing">Google Play &amp; App Store Publishing</option>
                          <option value="notifications">Push Notifications Setup</option>
                          <option value="billing">Plan Upgrades &amp; Billing</option>
                          <option value="other">Other Inquiry</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="user-priority">Priority</label>
                        <select
                          id="user-priority"
                          value={formData.priority}
                          onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                          className="form-select"
                        >
                          <option value="normal">Normal (Standard Assistance)</option>
                          <option value="high">High (Active Store / App Issue)</option>
                          <option value="urgent">Urgent (Production Critical)</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="user-message">Describe Your Issue or Question *</label>
                      <textarea
                        id="user-message"
                        required
                        rows={5}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Please provide details about what you need assistance with, any error messages encountered, or steps to reproduce..."
                        className="form-textarea"
                      />
                    </div>

                    <div className="form-actions-wrap text-center">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-action-pill"
                        style={{ border: "none", cursor: isSubmitting ? "wait" : "pointer" }}
                      >
                        {isSubmitting ? (
                          <span>Submitting Request...</span>
                        ) : (
                          <>
                            <span>Send Support Request</span>
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
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </section>

          {/* ── FAQ Section ── */}
          <section className="support-faq-section" id="faq">
            <div className="support-container">
              <div className="faq-header text-center">
                <span className="eyebrow-tag">ANSWERS AT A GLANCE</span>
                <h2 className="section-heading">Frequently Asked Questions</h2>
                <p className="section-subheading" style={{ maxWidth: "600px", margin: "0 auto 2rem" }}>
                  Find quick answers to common questions about AppifyHub mobile app creation, integration, and publishing.
                </p>

                {/* Filter Tabs */}
                <div className="faq-filter-pills">
                  <button
                    type="button"
                    onClick={() => setActiveCategory("all")}
                    className={`filter-pill ${activeCategory === "all" ? "active" : ""}`}
                  >
                    All Questions
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCategory("setup")}
                    className={`filter-pill ${activeCategory === "setup" ? "active" : ""}`}
                  >
                    Getting Started
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCategory("api")}
                    className={`filter-pill ${activeCategory === "api" ? "active" : ""}`}
                  >
                    Store &amp; API Sync
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCategory("publishing")}
                    className={`filter-pill ${activeCategory === "publishing" ? "active" : ""}`}
                  >
                    Store Publishing
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCategory("features")}
                    className={`filter-pill ${activeCategory === "features" ? "active" : ""}`}
                  >
                    Features &amp; Push
                  </button>
                </div>
              </div>

              {/* FAQ Accordion List */}
              <div className="faq-accordion-list">
                {filteredFaqs.map((faq, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div
                      key={idx}
                      className={`faq-accordion-item ${isOpen ? "is-open" : ""}`}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="faq-question-btn"
                        aria-expanded={isOpen}
                      >
                        <span className="faq-question-text">{faq.q}</span>
                        <span className="faq-icon-indicator">
                          {isOpen ? "−" : "+"}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="faq-answer-panel">
                          <p>{faq.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ── Bottom CTA ── */}
          <section className="cta-section">
            <div className="cta-container">
              <div className="cta-box">
                <div className="cta-content">
                  <h2 className="cta-heading">Ready to Launch Your Mobile App?</h2>
                  <p className="cta-description">
                    Join hundreds of online businesses that turned their website into high-converting iOS and Android apps with AppifyHub.
                  </p>
                  <div className="cta-buttons">
                    <Link href="/signup" className="btn-cta-primary">
                      <span>Start Building Now</span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="3" y1="8" x2="13" y2="8" />
                        <polyline points="9 4 13 8 9 12" />
                      </svg>
                    </Link>
                    <a
                      href="https://wa.me/919999999999"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-cta-secondary"
                    >
                      <span>Chat With Support</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* ===================================================
          3. GLOBAL FOOTER
          =================================================== */}
      <footer className="site-footer">
        <div className="footer-container">
          <div className="footer-main-grid">
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
                <li><Link href="/how-it-works">How It Works</Link></li>
                <li><Link href="/themes">Themes</Link></li>
                <li><Link href="/plans">Plans &amp; Add-ons</Link></li>
                <li><Link href="/support">Support</Link></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4 className="footer-title">Platform</h4>
              <ul className="footer-links">
                <li><Link href="/signup?platform=wordpress">WordPress</Link></li>
                <li><Link href="/signup?platform=woocommerce">WooCommerce</Link></li>
                <li><Link href="/signup?platform=shopify">Shopify</Link></li>
              </ul>
            </div>

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

      {/* Page Specific Styles */}
      <style jsx>{`
        .support-page-wrapper {
          padding-bottom: 3rem;
        }

        .support-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }

        .support-hero-section {
          padding: 4.5rem 0 3rem;
          background: linear-gradient(180deg, #FFFFFF 0%, #FBF9F6 100%);
          border-bottom: 1px solid var(--border-subtle);
        }

        .support-quick-badges {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .quick-badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.55rem 1.25rem;
          background: #FFFFFF;
          border: 1px solid var(--border-line);
          border-radius: var(--radius-pill);
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-heading);
          text-decoration: none;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
        }

        .quick-badge-pill:hover {
          border-color: var(--accent-bronze);
          color: var(--accent-bronze);
          transform: translateY(-1px);
        }

        .quick-badge-pill.is-highlight {
          background: #F0FDF4;
          border-color: #BBF7D0;
          color: #166534;
        }

        .quick-badge-pill.is-highlight:hover {
          border-color: #22C55E;
        }

        /* Channels Section */
        .support-channels-section {
          padding: 3.5rem 0;
        }

        .channels-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.75rem;
        }

        @media (max-width: 900px) {
          .channels-grid {
            grid-template-columns: 1fr;
          }
        }

        .channel-card {
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 2.25rem 2rem;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-soft);
          transition: all 0.25s ease;
        }

        .channel-card:hover {
          border-color: var(--accent-light-bronze);
          transform: translateY(-3px);
          box-shadow: 0 15px 35px -5px rgba(44, 38, 33, 0.1);
        }

        .channel-icon-bubble {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          background: var(--bg-bubble);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.25rem;
        }

        .channel-icon-bubble.whatsapp-bubble {
          background: #DCFCE7;
        }

        .channel-tag {
          font-size: 0.725rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: var(--accent-bronze);
          text-transform: uppercase;
          margin-bottom: 0.5rem;
        }

        .channel-title {
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--text-heading);
          margin-bottom: 0.75rem;
        }

        .channel-desc {
          font-size: 0.925rem;
          color: var(--text-body);
          line-height: 1.6;
          margin-bottom: 1.5rem;
          flex-grow: 1;
        }

        .channel-meta {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          margin-bottom: 1.5rem;
          padding-top: 1rem;
          border-top: 1px dashed var(--border-subtle);
        }

        .meta-item {
          font-size: 0.825rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .btn-channel-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.65rem 1.25rem;
          border-radius: var(--radius-sm);
          font-size: 0.9rem;
          font-weight: 600;
          background: var(--bg-strip);
          border: 1px solid var(--border-line);
          color: var(--text-heading);
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .btn-channel-action:hover {
          background: var(--text-heading);
          color: #FFFFFF;
          border-color: var(--text-heading);
        }

        .btn-channel-action.whatsapp-btn {
          background: #16A34A;
          color: #FFFFFF;
          border-color: #16A34A;
        }

        .btn-channel-action.whatsapp-btn:hover {
          background: #15803D;
          border-color: #15803D;
        }

        /* Status Strip */
        .status-strip-section {
          padding: 1.5rem 0 3rem;
        }

        .status-bar-box {
          background: #FFFFFF;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 1.25rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 2rem;
          flex-wrap: wrap;
        }

        .status-indicator-col {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .status-pulse-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #22C55E;
          box-shadow: 0 0 0 4px #DCFCE7;
          display: inline-block;
          flex-shrink: 0;
        }

        .status-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-heading);
          margin-bottom: 0.15rem;
        }

        .status-sub {
          font-size: 0.825rem;
          color: var(--text-muted);
        }

        .status-metrics-row {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .metric-badge {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .metric-label {
          font-size: 0.725rem;
          text-transform: uppercase;
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }

        .metric-val {
          font-size: 0.875rem;
          font-weight: 700;
          color: #166534;
        }

        /* Form Section */
        .ticket-form-section {
          padding: 3.5rem 0;
          background: #FDFBF8;
          border-top: 1px solid var(--border-subtle);
          border-bottom: 1px solid var(--border-subtle);
        }

        .form-card-wrap {
          max-width: 820px;
          margin: 0 auto;
          background: #FFFFFF;
          border: 1px solid var(--border-line);
          border-radius: 14px;
          padding: 3rem 3rem;
          box-shadow: 0 10px 30px -5px rgba(44, 38, 33, 0.05);
        }

        @media (max-width: 640px) {
          .form-card-wrap {
            padding: 2rem 1.25rem;
          }
        }

        .support-form {
          margin-top: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-row {
          display: grid;
          gap: 1.25rem;
        }

        .form-row-2 {
          grid-template-columns: 1fr 1fr;
        }

        @media (max-width: 640px) {
          .form-row-2 {
            grid-template-columns: 1fr;
          }
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .form-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-heading);
        }

        .form-input,
        .form-select,
        .form-textarea {
          width: 100%;
          padding: 0.65rem 0.9rem;
          border: 1px solid var(--border-line);
          border-radius: var(--radius-sm);
          font-family: inherit;
          font-size: 0.9rem;
          color: var(--text-heading);
          background: #FFFFFF;
          transition: border-color 0.2s ease;
        }

        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          outline: none;
          border-color: var(--accent-bronze);
          box-shadow: 0 0 0 3px rgba(120, 89, 61, 0.1);
        }

        .ticket-success-box {
          padding: 2.5rem 1rem;
        }

        .success-icon-bubble {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #E8F5E9;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.25rem;
        }

        .success-heading {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-heading);
          margin-bottom: 0.5rem;
        }

        .success-ticket-id {
          font-size: 1.1rem;
          color: var(--accent-bronze);
          margin-bottom: 1rem;
        }

        .success-desc {
          max-width: 520px;
          margin: 0 auto;
          font-size: 0.925rem;
          color: var(--text-body);
          line-height: 1.6;
        }

        /* FAQ Section */
        .support-faq-section {
          padding: 4.5rem 0;
        }

        .faq-filter-pills {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          flex-wrap: wrap;
          margin-bottom: 2.5rem;
        }

        .filter-pill {
          padding: 0.45rem 1.1rem;
          border-radius: var(--radius-pill);
          border: 1px solid var(--border-line);
          background: #FFFFFF;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-body);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-pill:hover {
          border-color: var(--accent-bronze);
          color: var(--accent-bronze);
        }

        .filter-pill.active {
          background: var(--text-heading);
          color: #FFFFFF;
          border-color: var(--text-heading);
        }

        .faq-accordion-list {
          max-width: 820px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .faq-accordion-item {
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          background: #FFFFFF;
          overflow: hidden;
          transition: border-color 0.2s ease;
        }

        .faq-accordion-item.is-open {
          border-color: var(--accent-light-bronze);
        }

        .faq-question-btn {
          width: 100%;
          text-align: left;
          padding: 1.25rem 1.5rem;
          background: none;
          border: none;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          cursor: pointer;
        }

        .faq-question-text {
          font-size: 1.05rem;
          font-weight: 600;
          color: var(--text-heading);
        }

        .faq-icon-indicator {
          font-size: 1.35rem;
          font-weight: 400;
          color: var(--accent-bronze);
          line-height: 1;
        }

        .faq-answer-panel {
          padding: 0 1.5rem 1.25rem;
          font-size: 0.925rem;
          color: var(--text-body);
          line-height: 1.65;
          border-top: 1px dashed var(--border-subtle);
          padding-top: 1rem;
        }
      `}</style>
    </div>
  );
}
