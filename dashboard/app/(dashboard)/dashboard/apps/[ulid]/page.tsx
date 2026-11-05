"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function AppDetailsRoutePage() {
  const params = useParams();
  const router = useRouter();
  const ulid = params?.ulid as string;

  useEffect(() => {
    if (ulid) {
      router.replace(`/dashboard?app=${ulid}`);
    } else {
      router.replace("/dashboard");
    }
  }, [ulid, router]);

  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#78593D] border-t-transparent animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Loading Application Details...</span>
      </div>
    </div>
  );
}
