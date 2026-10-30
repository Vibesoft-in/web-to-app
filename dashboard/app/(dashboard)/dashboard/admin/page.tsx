"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ExternalLink, ShieldCheck } from "lucide-react";

export default function AdminRedirectPage() {
  useEffect(() => {
    // Automatically redirect creator of the website to Filament Admin on port 8000
    window.location.href = "http://localhost:8000/admin";
  }, []);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 shadow-sm mb-5">
        <ShieldCheck className="w-8 h-8" />
      </div>

      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
        Redirecting to Creator Admin Panel...
      </h1>
      <p className="text-sm text-slate-500 max-w-md mt-2 leading-relaxed">
        Connecting to the unified WebIntoApp Super Admin &amp; Filament Commercial Portal at port 8000.
      </p>

      <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
        <a
          href="http://localhost:8000/admin"
          className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition shadow-md shadow-amber-800/20 flex items-center gap-2"
        >
          <span>Open Filament Admin Panel</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <Link
          href="/"
          className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
        >
          Return to Main Website
        </Link>
      </div>
    </div>
  );
}
