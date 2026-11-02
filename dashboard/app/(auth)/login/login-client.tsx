"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient } from "@/lib/api-client";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginClientProps {
  initialTheme?: string;
}

export function LoginClient({ initialTheme }: LoginClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryRedirect = searchParams.get("redirect") || "";

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigateByAccountState = (currentUser: any, explicitRedirect?: string | null) => {
    if (currentUser?.is_super_admin || currentUser?.email === "admin@webintoapp.com") {
      window.location.href = "http://localhost:8000/admin";
      return;
    }

    if (currentUser?.has_built_apps) {
      if (explicitRedirect && !explicitRedirect.includes("/dashboard/apps/new")) {
        router.push(explicitRedirect);
      } else {
        router.push("/dashboard");
      }
      return;
    }

    if (currentUser?.latest_draft?.ulid) {
      const step = currentUser.latest_draft.setup_step || "platform";
      router.push(`/dashboard/apps/${currentUser.latest_draft.ulid}/setup/${step}`);
      return;
    }

    router.push(explicitRedirect || "/dashboard/apps/new");
  };

  useEffect(() => {
    let isMounted = true;
    const checkActiveSession = async () => {
      if (searchParams.get("switch") === "true") return;

      try {
        const meRes = await apiClient("/api/auth/me");
        if (meRes?.user && isMounted) {
          navigateByAccountState(meRes.user, queryRedirect);
        }
      } catch {}
    };

    checkActiveSession();
    return () => {
      isMounted = false;
    };
  }, [router, queryRedirect, searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await apiClient("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (res?.user) {
        navigateByAccountState(res.user, queryRedirect);
        router.refresh();
      } else {
        router.push(queryRedirect || "/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

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

        {/* Main Content */}
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
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>Client Access</span>
                </div>
                <h1 className="auth-main-title">
                  Sign In to Your <em>Account</em>
                </h1>
                <p className="auth-subtitle">
                  Enter your credentials to access your app builds, analytics, and compatibility analysis.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
                {/* Email Address */}
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
                      {...register("email")}
                      type="email"
                      id="email"
                      placeholder="you@company.com"
                      className="auth-input"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-rose-600 mt-1">{errors.email.message}</p>
                  )}
                </div>

                {/* Password */}
                <div className="auth-field-group">
                  <div className="auth-label-row">
                    <label htmlFor="password" className="auth-label">
                      Password
                    </label>
                    <Link href="/forgot-password" className="auth-forgot-link">
                      Forgot password?
                    </Link>
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
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      {...register("password")}
                      type={showPassword ? "text" : "password"}
                      id="password"
                      placeholder="••••••••••••"
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
                  {errors.password && (
                    <p className="text-xs text-rose-600 mt-1">{errors.password.message}</p>
                  )}
                </div>

                {/* Submit */}
                <div className="auth-actions">
                  <button type="submit" disabled={isSubmitting} className="btn-auth-submit">
                    <span>{isSubmitting ? "Signing in..." : "Sign In to Dashboard"}</span>
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

              {/* Divider & Switch to Register */}
              <div className="auth-footer-switch">
                <span className="switch-prompt">Don&apos;t have an account yet?</span>
                <Link
                  href={
                    queryRedirect
                      ? `/register?redirect=${encodeURIComponent(queryRedirect)}`
                      : "/register?redirect=%2Fconvert"
                  }
                  className="switch-link"
                >
                  <span>Create an Account</span>
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
