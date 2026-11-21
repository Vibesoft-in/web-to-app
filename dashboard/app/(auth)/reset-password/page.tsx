"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient } from "@/lib/api-client";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

const resetSchema = z
  .object({
    email: z.string().email("Please enter a valid email address"),
    token: z.string().min(1, "Password reset token is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    password_confirmation: z.string().min(8, "Please confirm your password"),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords do not match",
    path: ["password_confirmation"],
  });

type ResetFormData = z.infer<typeof resetSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryToken = searchParams.get("token") || "";
  const queryEmail = searchParams.get("email") || "";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      token: queryToken,
      email: queryEmail,
      password: "",
      password_confirmation: "",
    },
  });

  const onSubmit = async (data: ResetFormData) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiClient("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token: data.token,
          email: data.email,
          password: data.password,
          password_confirmation: data.password_confirmation,
        }),
      });

      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          "This password reset link is invalid or has expired. Please request a new recovery link."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-6 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm border border-emerald-200">
          <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Password Reset Successful
          </h2>
          <p className="text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
            Your account password has been updated successfully. You can now sign in with your new credentials.
          </p>
        </div>

        <div className="pt-4">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl font-bold text-white bg-[#78593D] hover:bg-[#634830] transition shadow-md shadow-[#78593D]/20 active:scale-98"
          >
            <span>Proceed to Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (!queryToken) {
    return (
      <div className="text-center py-6 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900">Missing Reset Token</h2>
          <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
            This password recovery link appears to be incomplete. Please check your email and click the full link, or request a new reset email.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#78593D] hover:bg-[#634830] transition shadow-sm"
          >
            <span>Request New Reset Link</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Create New Password
        </h1>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
          Choose a secure new password of at least 8 characters to protect your account.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 mb-4 animate-in fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block">{errorMessage}</span>
            <Link
              href="/forgot-password"
              className="text-[11px] underline font-bold hover:text-rose-900 block"
            >
              Request a new password reset email &rarr;
            </Link>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Hidden Token Input */}
        <input type="hidden" {...register("token")} />

        {/* Email Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Registered Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              {...register("email")}
              type="email"
              readOnly={Boolean(queryEmail)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm transition ${
                queryEmail ? "bg-slate-50 text-slate-700 cursor-not-allowed" : "bg-white text-slate-900"
              }`}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-rose-600 mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* New Password Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            New Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#78593D] focus:outline-none focus:ring-2 focus:ring-[#78593D]/10 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-rose-600 mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm New Password Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Confirm New Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              {...register("password_confirmation")}
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Re-enter your password"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#78593D] focus:outline-none focus:ring-2 focus:ring-[#78593D]/10 transition"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition"
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
          className="w-full py-3.5 px-4 rounded-xl font-bold text-white bg-[#78593D] hover:bg-[#634830] transition shadow-md shadow-[#78593D]/20 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer active:scale-98 mt-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Updating Password...</span>
            </>
          ) : (
            <>
              <span>Save &amp; Set New Password</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 sm:p-10">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
          <span>Back to sign in</span>
        </Link>

        <Suspense
          fallback={
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#78593D]" />
              <span className="text-xs text-slate-400 font-medium">Loading recovery details...</span>
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
