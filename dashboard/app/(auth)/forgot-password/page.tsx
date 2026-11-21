"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient } from "@/lib/api-client";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";

const forgotSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotFormData = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotFormData) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSubmittedEmail(data.email.trim());

    try {
      await apiClient("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setSubmitted(true);
    } catch (err: any) {
      if (err.status === 429) {
        setErrorMsg("Too many reset attempts. Please wait a few minutes before trying again.");
      } else {
        // Still treat as dispatched to avoid enumeration while saving the email state
        setSubmitted(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to sign in</span>
        </Link>

        {submitted ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-emerald-200">
              <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Check your inbox</h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                We have dispatched a password reset link to:
              </p>
              <div className="mt-2 inline-block px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 font-bold text-xs text-slate-900">
                {submittedEmail}
              </div>
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                Click the link in the email to set a new password. If you don&apos;t see it, be sure to check your spam or promotions folder.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="text-xs font-bold text-[#78593D] hover:underline cursor-pointer"
              >
                Send to a different email address &rarr;
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Reset your password
              </h1>
              <p className="text-sm text-slate-500 mt-2">
                Enter your registered email and we&apos;ll send you recovery instructions.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs mb-4">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="name@store.com"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-rose-600 mt-1">{errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-white bg-[#78593D] hover:bg-[#634830] transition shadow-md shadow-[#78593D]/20 flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer active:scale-98"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Sending reset link...</span>
                  </>
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
