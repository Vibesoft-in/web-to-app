"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient } from "@/lib/api-client";
import {
  AlertCircle,
  ArrowRight,
  Building,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
} from "lucide-react";

interface ThemeOption {
  slug: string;
  name: string;
  category: string;
  price: string;
  badge: string;
  tagline: string;
  features: string[];
  emoji: string;
  accent: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    slug: "minimal",
    name: "Minimal",
    category: "Minimal Style",
    price: "Included in Plan",
    badge: "Included in Plan",
    tagline: "Clean, whitespace-focused minimalist store layout",
    features: ["Clean Navigation", "Hero Product Display", "1-Tap Quick Cart"],
    emoji: "🛍️",
    accent: "#78593D",
  },
  {
    slug: "modern",
    name: "Modern",
    category: "Modern Style",
    price: "₹1,999",
    badge: "Modern Style",
    tagline: "Editorial typography & storytelling showcase layout",
    features: ["Editorial Typography", "Storytelling Layouts", "VIP Sync"],
    emoji: "✨",
    accent: "#252525",
  },
  {
    slug: "trendy",
    name: "Trendy",
    category: "Trendy Style",
    price: "₹1,499",
    badge: "Trendy Style",
    tagline: "High-contrast dynamic energetic boutique design",
    features: ["Dynamic Hero Banners", "Lookbook Grid", "Instant Wishlist"],
    emoji: "⚡",
    accent: "#E11D48",
  },
];

const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    business_name: z.string().min(2, "Business name is required").max(150),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(10, "Password must be at least 10 characters as per security guidelines"),
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords do not match",
    path: ["password_confirmation"],
  });

type SignupFormData = z.infer<typeof signupSchema>;

interface SignupClientProps {
  initialTheme?: string;
  initialPlan?: string;
}

export function SignupClient({ initialTheme, initialPlan }: SignupClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientQueryTheme = searchParams.get("theme")?.toLowerCase();
  const clientQueryPlan = searchParams.get("plan")?.toLowerCase();

  const effectiveTheme = (clientQueryTheme || initialTheme || "").toLowerCase();
  const effectivePlan = (clientQueryPlan || initialPlan || "").toLowerCase();

  const [selectedThemeSlug, setSelectedThemeSlug] = useState<string | null>(() => {
    if (effectiveTheme && THEME_OPTIONS.some((t) => t.slug === effectiveTheme)) {
      return effectiveTheme;
    }
    return null;
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Sync with URL query parameter or localStorage ONLY if user particularly selected a theme
  useEffect(() => {
    let explicitlySelectedSlug: string | null = null;

    if (clientQueryTheme && THEME_OPTIONS.some((t) => t.slug === clientQueryTheme)) {
      explicitlySelectedSlug = clientQueryTheme;
    } else if (initialTheme && THEME_OPTIONS.some((t) => t.slug === initialTheme.toLowerCase())) {
      explicitlySelectedSlug = initialTheme.toLowerCase();
    } else {
      try {
        const saved = localStorage.getItem("appifyhub_selected_theme");
        if (saved) {
          const parsed = JSON.parse(saved);
          // Only honor if explicitly selected by user beforehand
          if (parsed.selectedByUser && parsed.slug && THEME_OPTIONS.some((t) => t.slug === parsed.slug)) {
            explicitlySelectedSlug = parsed.slug;
          }
        }
      } catch {}
    }

    setSelectedThemeSlug(explicitlySelectedSlug);

    // ONLY persist if the user explicitly selected this theme!
    if (explicitlySelectedSlug) {
      const matched = THEME_OPTIONS.find((t) => t.slug === explicitlySelectedSlug);
      if (matched) {
        try {
          localStorage.setItem(
            "appifyhub_selected_theme",
            JSON.stringify({
              name: matched.name,
              slug: matched.slug,
              price: matched.price,
              badge: matched.badge,
              selectedByUser: true,
            })
          );
        } catch {}
      }
    }

    if (effectivePlan) {
      try {
        localStorage.setItem("appifyhub_selected_plan", effectivePlan);
      } catch {}
    } else {
      try {
        localStorage.removeItem("appifyhub_selected_plan");
        localStorage.removeItem("appifyhub_selected_plan_info");
        localStorage.removeItem("appifyhub_selected_plan_id");
      } catch {}
    }
  }, [clientQueryTheme, initialTheme, effectivePlan]);

  const activeTheme = selectedThemeSlug
    ? THEME_OPTIONS.find((t) => t.slug === selectedThemeSlug) || null
    : null;

  // Check if user is already authenticated when visiting /signup
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
          } else if (meRes.user.latest_draft?.ulid) {
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

  const handleClearSelectedTheme = () => {
    setSelectedThemeSlug(null);
    try {
      localStorage.removeItem("appifyhub_selected_theme");
    } catch {}
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiClient("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(data),
      });

      // Directly redirect new users to the app building steps (preserving explicit theme/plan choices)
      const params = new URLSearchParams();
      if (selectedThemeSlug) params.set("theme", selectedThemeSlug);
      if (effectivePlan) params.set("plan", effectivePlan);
      const qs = params.toString();
      const targetUrl = qs ? `/dashboard/apps/new?${qs}` : "/dashboard/apps/new";
      router.push(targetUrl);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(
        err.message || "Failed to create account. Please check the form and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block mb-3">
            <span className="text-2xl font-black bg-gradient-to-r from-amber-700 via-amber-800 to-stone-900 bg-clip-text text-transparent">
              AppifyHub
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Create Your Account
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Start your 14-day free trial. No credit card required.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
            <div className="flex-1">
              <span className="font-medium">{errorMessage}</span>
              {errorMessage.toLowerCase().includes("already been taken") && (
                <div className="mt-2.5 pt-2.5 border-t border-rose-200/60 flex items-center justify-between">
                  <span className="text-xs text-rose-600">Account already exists:</span>
                  <Link
                    href={`/login${selectedThemeSlug ? `?theme=${selectedThemeSlug}` : ""}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 hover:text-amber-950 bg-white px-2.5 py-1 rounded-lg border border-amber-300 shadow-xs"
                  >
                    <span>Sign In &rarr;</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Your Full Name
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                {...register("name")}
                type="text"
                placeholder="Jane Doe"
                className={`w-full pl-11 pr-4 py-2.5 rounded-xl border text-sm transition focus:outline-none focus:ring-2 ${
                  errors.name
                    ? "border-rose-300 focus:ring-rose-200 bg-rose-50/20"
                    : "border-slate-200 focus:border-amber-800 focus:ring-amber-100"
                }`}
              />
            </div>
            {errors.name && (
              <p className="text-xs text-rose-600 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Store / Business Name
            </label>
            <div className="relative">
              <Building className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                {...register("business_name")}
                type="text"
                placeholder="Glow Beauty Naturals"
                className={`w-full pl-11 pr-4 py-2.5 rounded-xl border text-sm transition focus:outline-none focus:ring-2 ${
                  errors.business_name
                    ? "border-rose-300 focus:ring-rose-200 bg-rose-50/20"
                    : "border-slate-200 focus:border-amber-800 focus:ring-amber-100"
                }`}
              />
            </div>
            {errors.business_name && (
              <p className="text-xs text-rose-600 mt-1">{errors.business_name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Business Email Address
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                {...register("email")}
                type="email"
                placeholder="jane@glowbeauty.com"
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
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Password (min. 10 chars)
            </label>
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <CheckCircle2 className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                {...register("password_confirmation")}
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••••••"
                className={`w-full pl-11 pr-11 py-2.5 rounded-xl border text-sm transition focus:outline-none focus:ring-2 ${
                  errors.password_confirmation
                    ? "border-rose-300 focus:ring-rose-200 bg-rose-50/20"
                    : "border-slate-200 focus:border-amber-800 focus:ring-amber-100"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700 transition"
                tabIndex={-1}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password_confirmation && (
              <p className="text-xs text-rose-600 mt-1">{errors.password_confirmation.message}</p>
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
                <span>Creating your account...</span>
              </>
            ) : (
              <>
                <span>Start Free Trial</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-7 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            href={`/login${selectedThemeSlug ? `?theme=${selectedThemeSlug}` : ""}`}
            className="font-semibold text-amber-900 hover:text-amber-950 transition"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
