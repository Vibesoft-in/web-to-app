"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { getUserData, saveUserData } from "@/lib/user-data-store";

interface SignupClientProps {
  initialTheme?: string;
  initialPlan?: string;
  searchParams?: any;
}

export function SignupClient({ initialTheme, initialPlan }: SignupClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryUrl = searchParams.get("url") || "";
  const queryPlatform = searchParams.get("platform") || "";
  const queryRedirect = searchParams.get("redirect") || "";
  const clientQueryTheme = searchParams.get("theme")?.toLowerCase() || initialTheme || "";
  const clientQueryPlan = searchParams.get("plan")?.toLowerCase() || initialPlan || "";

  // Form states - ALWAYS start empty unless explicitly provided in URL query parameters.
  // Never write or prefill unwritten website URLs, dummy emails, or mock data!
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState(() => queryUrl || "");
  const [platform, setPlatform] = useState<string>(() => {
    const p = queryPlatform.toLowerCase();
    if (p === "woo" || p === "woocommerce") return "woocommerce";
    if (p === "shopify") return "shopify";
    if (p === "wordpress" || p === "wp") return "wordpress";
    return "";
  });
  const [websiteName, setWebsiteName] = useState("");

  // UI & Feedback states
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Platform verification state
  const [isManualSelection, setIsManualSelection] = useState(false);
  const [badgeStatus, setBadgeStatus] = useState<string>("Auto-Detect");
  const [badgeStyle, setBadgeStyle] = useState<{ border?: string; color?: string; background?: string }>({});
  const [checkingPlatform, setCheckingPlatform] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "checking" | "matched" | "mismatched" | "unsupported" | null;
    title?: string;
    message?: string;
    detectedPlatform?: string | null;
    canQuickSwitch?: boolean;
  }>({ type: null });

  const activeAbortController = useRef<AbortController | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Check if user is already authenticated
  useEffect(() => {
    let isMounted = true;
    const checkActiveSession = async () => {
      try {
        const meRes = await apiClient("/api/auth/me");
        if (meRes?.user && isMounted) {
          if (meRes.user.is_super_admin || meRes.user.email === "admin@webintoapp.com") {
            window.location.href = "http://localhost:8000/admin";
            return;
          }
          if (meRes.user.has_built_apps) {
            router.replace("/dashboard");
          } else if (meRes.user.latest_draft?.ulid && meRes.user.latest_draft.setup_step !== "build" && meRes.user.latest_draft.setup_step !== "completed" && meRes.user.latest_draft.status !== "completed") {
            const step = meRes.user.latest_draft.setup_step || "platform";
            router.replace(`/dashboard/apps/${meRes.user.latest_draft.ulid}/setup/${step}`);
          } else {
            router.replace("/dashboard/apps/new");
          }
        }
      } catch {}
    };

    checkActiveSession();
    return () => {
      isMounted = false;
    };
  }, [router]);

  // Clear any unwritten or stale dummy data on mount so it never pollutes the form
  useEffect(() => {
    if (!queryUrl) {
      try {
        localStorage.removeItem("appifyhub_temp_store_url");
        localStorage.removeItem("appifyhub_website_url");
        localStorage.removeItem("appifyhub_pending_app");
        const raw = localStorage.getItem("appifyhub_user_store_data");
        if (raw) {
          const parsed = JSON.parse(raw);
          delete parsed.website_url;
          delete parsed.platform;
          delete parsed.store_name;
          delete parsed.name;
          delete parsed.email;
          delete parsed.phone;
          localStorage.setItem("appifyhub_user_store_data", JSON.stringify(parsed));
        }
      } catch {}
    }
  }, [queryUrl]);

  // Persist plan / theme if selected
  useEffect(() => {
    if (clientQueryPlan) {
      try {
        localStorage.setItem("appifyhub_selected_plan", clientQueryPlan);
      } catch {}
    }
  }, [clientQueryPlan]);

  // Auto-detect platform when websiteUrl changes
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const cleanUrl = websiteUrl.trim();
    if (!cleanUrl || cleanUrl.length < 4 || !cleanUrl.includes(".")) {
      setFeedback({ type: null });
      setCheckingPlatform(false);
      setBadgeStatus("Auto-Detect");
      setBadgeStyle({});
      return;
    }

    debounceTimer.current = setTimeout(() => {
      runPlatformCheck(cleanUrl, platform, isManualSelection);
    }, 450);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [websiteUrl]);

  const runPlatformCheck = async (urlToCheck: string, currentPlatform: string, manual: boolean) => {
    if (activeAbortController.current) {
      activeAbortController.current.abort();
    }
    const controller = new AbortController();
    activeAbortController.current = controller;

    setCheckingPlatform(true);
    setFeedback({
      type: "checking",
      title: "Detecting website platform from URL...",
    });

    try {
      const response = await fetch("/api/check-platform-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          url: urlToCheck,
          platform: currentPlatform,
          manual: manual,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        setFeedback({ type: null });
        setCheckingPlatform(false);
        return;
      }

      setCheckingPlatform(false);

      if (data.is_custom || data.detected_platform === "custom" || data.is_supported === false) {
        setPlatform("");
        setIsManualSelection(false);
        setBadgeStatus("Custom Platform");
        setBadgeStyle({
          border: "1px solid #F2B9B0",
          color: "#8C2517",
          background: "#FDF3F1",
        });
        setFeedback({
          type: "unsupported",
          title: "Custom Platform Detected",
          message:
            data.message ||
            "Custom Platform Detected: This website appears to be built on a custom platform. AppifyHub only converts websites built on WooCommerce, Shopify, or WordPress.",
        });
      } else if (data.auto_platform && (!manual || !currentPlatform)) {
        setPlatform(data.auto_platform);
        setBadgeStatus("Auto-Selected");
        setBadgeStyle({
          border: "1px solid #B8E0A6",
          color: "#235817",
          background: "#F2F8ED",
        });
        const detectedName =
          data.auto_platform.charAt(0).toUpperCase() + data.auto_platform.slice(1);
        setFeedback({
          type: "matched",
          title: "Platform Automatically Selected",
          message: `Website verified: Automatically detected and selected ${detectedName}.`,
          detectedPlatform: data.auto_platform,
        });
      } else if (data.matched === false) {
        const detectedName = data.detected_platform
          ? data.detected_platform.charAt(0).toUpperCase() + data.detected_platform.slice(1)
          : "";
        const canSwitch =
          data.detected_platform &&
          ["woocommerce", "shopify", "wordpress"].includes(data.detected_platform);

        setFeedback({
          type: "mismatched",
          title: "Platform Mismatch",
          message: data.message,
          detectedPlatform: data.detected_platform,
          canQuickSwitch: canSwitch,
        });
      } else {
        setBadgeStatus(manual ? "Manual Selection" : "Auto-Selected");
        setBadgeStyle({
          border: "1px solid #B8E0A6",
          color: "#235817",
          background: "#F2F8ED",
        });
        setFeedback({
          type: "matched",
          title: "Platform Verified",
          message: data.message || "Website URL matches selected platform.",
          detectedPlatform: data.detected_platform,
        });
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setCheckingPlatform(false);
        setFeedback({ type: null });
      }
    }
  };

  const handleSelectPlatform = (targetPlatform: string) => {
    setIsManualSelection(true);
    setPlatform(targetPlatform);
    setBadgeStatus("Manual Selection");
    setBadgeStyle({});

    const cleanUrl = websiteUrl.trim();
    if (cleanUrl.length >= 4 && cleanUrl.includes(".")) {
      runPlatformCheck(cleanUrl, targetPlatform, true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }
    if (!websiteUrl.trim() || !websiteUrl.includes(".")) {
      setErrorMessage("Please enter a valid website URL for conversion.");
      return;
    }
    if (feedback.type === "unsupported") {
      setErrorMessage(
        "Custom Platform Detected: This website appears to be built on a custom platform. AppifyHub only converts websites built on WooCommerce, Shopify, or WordPress."
      );
      return;
    }
    if (!platform) {
      setErrorMessage(
        "Please select a website platform (WooCommerce, Shopify, or WordPress)."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanUrl = websiteUrl.trim().startsWith("http")
        ? websiteUrl.trim()
        : `https://${websiteUrl.trim()}`;

      const finalBusinessName =
        websiteName.trim() || `${name.trim()}'s Store`;

      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        password: password,
        website_url: cleanUrl,
        platform: platform,
        website_name: websiteName.trim() || null,
        business_name: finalBusinessName,
      };

      const signupRes = await apiClient("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // Synchronize centralized store for all subsequent pages
      saveUserData({
        website_url: cleanUrl,
        platform: platform === "shopify" ? "shopify" : "woo",
        store_name: finalBusinessName,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        plan: clientQueryPlan || undefined,
        theme: clientQueryTheme || undefined,
      });

      // If backend automatically created the app during registration, route directly to setup
      if (signupRes?.app?.ulid) {
        const params = new URLSearchParams();
        if (clientQueryPlan) params.set("plan", clientQueryPlan);
        if (clientQueryTheme) params.set("theme", clientQueryTheme);
        const qs = params.toString();
        const targetUrl = `/dashboard/apps/${signupRes.app.ulid}/setup/connect${qs ? `?${qs}` : ""}`;
        router.push(targetUrl);
        router.refresh();
        return;
      }

      // Fallback: Redirect to new app creation with all parameters
      const params = new URLSearchParams();
      params.set("url", cleanUrl);
      params.set("platform", platform === "shopify" ? "shopify" : "woo");
      if (websiteName.trim()) params.set("name", websiteName.trim());
      if (clientQueryPlan) params.set("plan", clientQueryPlan);
      if (clientQueryTheme) params.set("theme", clientQueryTheme);

      const qs = params.toString();
      const targetUrl = `/dashboard/apps/new?${qs}`;
      router.push(targetUrl);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(
        err.message || "Failed to create account. Please check the details and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRedirectToConvert =
    queryRedirect === "/convert" ||
    queryRedirect.includes("convert") ||
    Boolean(queryUrl);

  return (
    <div className="auth-layout" style={{ minHeight: "100vh", background: "#FFFFFF" }}>
      <div className="auth-page-wrapper">
        {/* Top Auth Nav Bar */}
        <header className="auth-nav-bar">
          <div className="auth-nav-inner">
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

            <Link href="/" className="auth-back-link">
              <svg
                width="15"
                height="15"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="13" y1="8" x2="3" y2="8" />
                <polyline points="7 12 3 8 7 4" />
              </svg>
              <span>Back to Website</span>
            </Link>
          </div>
        </header>

        {/* Flash Notifications */}
        <div className="auth-flash-wrapper">
          {errorMessage && (
            <div className="global-alert alert-error" style={{ borderRadius: "8px", margin: "1rem 0" }}>
              {errorMessage}
            </div>
          )}
        </div>

        {/* Main Authentication Content */}
        <main className="auth-main-content">
          <div className="auth-card-wrapper">
            <div className="auth-card">
              {/* Card Header */}
              <div className="auth-card-header">
                <div className="auth-eyebrow-pill">
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
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                  <span>Account Setup</span>
                </div>
                <h1 className="auth-main-title">
                  Create Your <em>Account</em>
                </h1>
                <p className="auth-subtitle">
                  Register to run the website compatibility check and begin compiling your native
                  mobile application.
                </p>
              </div>

              {/* Context Banner for Converter Redirect */}
              {isRedirectToConvert && (
                <div className="auth-context-banner">
                  <div className="auth-context-icon">
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
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div className="auth-context-text">
                    <strong>Ready to Analyze Your Website</strong>
                    <span>
                      Once registered, you&apos;ll immediately proceed to the Compatibility Analyzer.
                    </span>
                  </div>
                </div>
              )}

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="auth-form" noValidate>
                {/* Full Name Field */}
                <div className="auth-field-group">
                  <label htmlFor="name" className="auth-label">
                    Full Name
                  </label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
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
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      autoComplete="name"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="auth-input"
                    />
                  </div>
                </div>

                {/* Email Address Field */}
                <div className="auth-field-group">
                  <label htmlFor="email" className="auth-label">
                    Email Address
                  </label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
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
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </span>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      autoComplete="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="auth-input"
                    />
                  </div>
                </div>

                {/* Phone Number Field (Optional) */}
                <div className="auth-field-group">
                  <div className="auth-label-row">
                    <label htmlFor="phone" className="auth-label">
                      Phone Number
                    </label>
                    <span className="auth-badge-optional">Optional</span>
                  </div>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
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
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </span>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      autoComplete="tel"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="auth-input"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="auth-field-group">
                  <label htmlFor="password" className="auth-label">
                    Password
                  </label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
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
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      required
                      autoComplete="new-password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="auth-input auth-password-input"
                    />
                    <button
                      type="button"
                      className="auth-toggle-pwd"
                      aria-label="Toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Section Divider: Website & Store Details */}
                <div className="auth-section-divider">
                  <div className="divider-line" />
                  <span className="divider-title">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    Website Details for Conversion
                  </span>
                  <div className="divider-line" />
                </div>

                {/* Website / Store URL Field */}
                <div className="auth-field-group">
                  <div className="auth-label-row">
                    <label htmlFor="website_url" className="auth-label">
                      Website / Store URL <span className="required-star">*</span>
                    </label>
                    <span className="auth-badge-required">Auto-Analyzed</span>
                  </div>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
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
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                    </span>
                    <input
                      type="url"
                      id="website_url"
                      name="website_url"
                      required
                      autoComplete="url"
                      placeholder="https://yourstore.com"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      className="auth-input"
                    />
                  </div>
                  <p className="auth-field-hint">
                    Your website address to be scanned and converted into a native app.
                  </p>
                </div>

                {/* Platform Selection Field */}
                <div className="auth-field-group">
                  <div className="auth-label-row">
                    <label className="auth-label">
                      Website Platform <span className="required-star">*</span>
                    </label>
                    <span
                      className="auth-badge-required"
                      id="platformBadgeStatus"
                      style={badgeStyle}
                    >
                      {badgeStatus}
                    </span>
                  </div>
                  <div className="auth-platform-options">
                    {/* WooCommerce */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectPlatform("woocommerce")}
                      className={`auth-platform-radio-card ${
                        platform === "woocommerce" ? "is-active" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="platform"
                        value="woocommerce"
                        checked={platform === "woocommerce"}
                        readOnly
                        style={{ display: "none" }}
                      />
                      <div className="platform-radio-header">
                        <span className="platform-icon-tag icon-woo">Woo</span>
                        <span className="radio-custom-dot" />
                      </div>
                      <div className="platform-radio-body">
                        <span className="platform-opt-title">WooCommerce</span>
                        <span className="platform-opt-desc">WordPress Store</span>
                      </div>
                    </div>

                    {/* Shopify */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectPlatform("shopify")}
                      className={`auth-platform-radio-card ${
                        platform === "shopify" ? "is-active" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="platform"
                        value="shopify"
                        checked={platform === "shopify"}
                        readOnly
                        style={{ display: "none" }}
                      />
                      <div className="platform-radio-header">
                        <span className="platform-icon-tag icon-shopify">Shopify</span>
                        <span className="radio-custom-dot" />
                      </div>
                      <div className="platform-radio-body">
                        <span className="platform-opt-title">Shopify</span>
                        <span className="platform-opt-desc">Cloud eCommerce</span>
                      </div>
                    </div>

                    {/* WordPress */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectPlatform("wordpress")}
                      className={`auth-platform-radio-card ${
                        platform === "wordpress" ? "is-active" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="platform"
                        value="wordpress"
                        checked={platform === "wordpress"}
                        readOnly
                        style={{ display: "none" }}
                      />
                      <div className="platform-radio-header">
                        <span className="platform-icon-tag icon-wp">WordPress</span>
                        <span className="radio-custom-dot" />
                      </div>
                      <div className="platform-radio-body">
                        <span className="platform-opt-title">WordPress</span>
                        <span className="platform-opt-desc">Content &amp; Blog CMS</span>
                      </div>
                    </div>
                  </div>

                  {/* Live Platform & URL Verification Feedback */}
                  {feedback.type && (
                    <div className="platform-match-feedback">
                      {feedback.type === "checking" && (
                        <div className="feedback-inner is-checking">
                          <span className="feedback-spinner" />
                          <span>{feedback.title}</span>
                        </div>
                      )}

                      {feedback.type === "unsupported" && (
                        <div className="feedback-inner is-unsupported">
                          <span className="feedback-badge-icon">✕</span>
                          <div className="feedback-text-wrap">
                            <strong>{feedback.title}</strong>
                            <p>{feedback.message}</p>
                          </div>
                        </div>
                      )}

                      {feedback.type === "matched" && (
                        <div className="feedback-inner is-matched">
                          <span className="feedback-badge-icon">✓</span>
                          <div className="feedback-text-wrap">
                            <strong>{feedback.title}</strong>
                            <p>{feedback.message}</p>
                          </div>
                        </div>
                      )}

                      {feedback.type === "mismatched" && (
                        <div className="feedback-inner is-mismatched">
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "0.75rem",
                              flex: 1,
                            }}
                          >
                            <span className="feedback-badge-icon">⚠️</span>
                            <div className="feedback-text-wrap">
                              <strong>{feedback.title}</strong>
                              <p>{feedback.message}</p>
                            </div>
                          </div>
                          {feedback.canQuickSwitch && feedback.detectedPlatform && (
                            <button
                              type="button"
                              className="btn-quick-switch"
                              onClick={() => handleSelectPlatform(feedback.detectedPlatform!)}
                            >
                              Switch to{" "}
                              {feedback.detectedPlatform.charAt(0).toUpperCase() +
                                feedback.detectedPlatform.slice(1)}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Website / Store Name (Optional) */}
                <div className="auth-field-group">
                  <div className="auth-label-row">
                    <label htmlFor="website_name" className="auth-label">
                      Store / Brand Name
                    </label>
                    <span className="auth-badge-optional">Optional</span>
                  </div>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
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
                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <path d="M16 10a4 4 0 0 1-8 0" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      id="website_name"
                      name="website_name"
                      autoComplete="organization"
                      placeholder="e.g. Maison Lumière"
                      value={websiteName}
                      onChange={(e) => setWebsiteName(e.target.value)}
                      className="auth-input"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="auth-actions">
                  <button type="submit" disabled={isSubmitting} className="btn-auth-submit">
                    <span>
                      {isSubmitting ? "Creating Account..." : "Create Account & Proceed"}
                    </span>
                    <svg
                      className="btn-arrow"
                      width="15"
                      height="15"
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
                  </button>
                </div>
              </form>

              {/* Divider & Switch to Login */}
              <div className="auth-footer-switch">
                <span className="switch-prompt">Already have an account?</span>
                <Link
                  href={
                    queryRedirect
                      ? `/login?redirect=${encodeURIComponent(queryRedirect)}`
                      : "/login"
                  }
                  className="switch-link"
                >
                  <span>Sign In</span>
                  <svg
                    width="14"
                    height="14"
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
              </div>
            </div>
          </div>
        </main>

        {/* Auth Footer */}
        <footer className="auth-footer">
          <p>&copy; 2026 AppifyHub Platform. Native iOS &amp; Android App Compilation Suite.</p>
        </footer>
      </div>
    </div>
  );
}
