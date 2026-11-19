"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin");
  }, [router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      <span className="text-xs text-slate-500 font-semibold ml-3">Redirecting to Super Admin Panel...</span>
    </div>
  );
}
