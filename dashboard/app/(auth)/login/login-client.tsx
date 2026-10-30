"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient } from "@/lib/api-client";
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

const THEME_NAMES: Record<string, { name: string; price: string }> = {
  minimal: { name: "Minimal", price: "Included in Plan" },
  modern: { name: "Modern", price: "₹1,999" },
  trendy: { name: "Trendy", price: "₹1,499" },
};

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
  const clientQueryTheme = searchParams.get("theme")?.toLowerCase();

  const effectiveTheme = (clientQueryTheme || initialTheme || "").toLowerCase();

  const [selectedTheme, setSelectedTheme] = useState<string | null>(() => {
    if (effectiveTheme && THEME_NAMES[effectiveTheme]) {
      return effectiveTheme;
    }
    return null;
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (clientQueryTheme && THEME_NAMES[clientQueryTheme]) {
      setSelectedTheme(clientQueryTheme);
    } else if (initialTheme && THEME_NAMES[initialTheme.toLowerCase()]) {
      setSelectedTheme(initialTheme.toLowerCase());
    } else {
      try {
        const saved = localStorage.getItem("appifyhub_selected_theme");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.slug && THEME_NAMES[parsed.slug]) {
            setSelectedTheme(parsed.slug);
          }
        }
      } catch {}
    }
  }, [clientQueryTheme, initialTheme]);

  const navigateByAccountState = (currentUser: any, explicitRedirect?: string | null) => {
    if (currentUser?.is_super_admin || currentUser?.email === "admin@webintoapp.com") {
      window.location.href = "http://localhost:8000/admin";
      return;
    }

    // 1. Returning user with at least 1 completed app -> Dashboard
    if (currentUser?.has_built_apps) {
      if (explicitRedirect && !explicitRedirect.includes("/dashboard/apps/new")) {
        router.push(explicitRedirect);
      } else {
        router.push("/dashboard");
      }
      return;
    }

    // 2. User with an incomplete draft -> Resume from last saved step
    if (currentUser?.latest_draft?.ulid) {
      const step = currentUser.latest_draft.setup_step || "platform";
      router.push(`/dashboard/apps/${currentUser.latest_draft.ulid}/setup/${step}`);
      return;
    }

    // 3. User with no completed app and no draft -> App builder wizard
    router.push(explicitRedirect || "/dashboard/apps/new");
  };

  // Check if user is already authenticated when visiting /login
  useEffect(() => {
    let isMounted = true;
    const checkActiveSession = async () => {
      // Don't auto-redirect if user explicitly wants to switch accounts
      if (searchParams.get("switch") === "true") return;

      try {
        const meRes = await apiClient("/api/auth/me");
        if (meRes?.user && isMounted) {
          navigateByAccountState(meRes.user, searchParams.get("redirect"));
        }
      } catch {}
    };

    checkActiveSession();
    return () => {
      isMounted = false;
    };
  }, [router, searchParams]);

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
        navigateByAccountState(res.user, searchParams.get("redirect"));
      } else {
        router.push("/dashboard/apps/new");
      }
      router.refresh();
    } catch (err: any) {
      if (err.code === "EMAIL_NOT_VERIFIED") {
        setErrorMessage("Please verify your email address before logging in.");
      } else {
        setErrorMessage(err.message || "Invalid email or password.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentThemeInfo = selectedTheme ? THEME_NAMES[selectedTheme] : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <div className="text-center mb-6">
          <Link href="/" className="inline-block mb-3">
            <span className="text-2xl font-black bg-gradient-to-r from-amber-700 via-amber-800 to-stone-900 bg-clip-text text-transparent">
              AppifyHub
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Sign in to your account
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your mobile apps, active themes, and store sync
          </p>
        </div>



        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                {...register("email")}
                type="email"
                placeholder="name@store.com"
                className={`w-full pl-11 pr-4 py-2.5 rounded-xl border text-sm transition focus:outline-none focus:ring-2 ${
                  errors.email
                    ? "border-rose-300 focus:ring-rose-200 bg-rose-50/20"
                    : "border-slate-200 focus:border-amber-800 focus:ring-amber-100"
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-rose-600 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-amber-800 hover:text-amber-950 transition"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                className={`w-full pl-11 pr-11 py-2.5 rounded-xl border text-sm transition focus:outline-none focus:ring-2 ${
                  errors.password
                    ? "border-rose-300 focus:ring-rose-200 bg-rose-50/20"
                    : "border-slate-200 focus:border-amber-800 focus:ring-amber-100"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700 transition"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-rose-600 mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3.5 px-4 rounded-xl font-bold text-white bg-amber-900 hover:bg-amber-950 focus:ring-4 focus:ring-amber-200 transition shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-7 text-center text-sm text-slate-500">
          Don't have an account yet?{" "}
          <Link
            href={`/signup${selectedTheme ? `?theme=${selectedTheme}` : ""}`}
            className="font-semibold text-amber-900 hover:text-amber-950 transition"
          >
            Create free account
          </Link>
        </div>
      </div>
    </div>
  );
}
