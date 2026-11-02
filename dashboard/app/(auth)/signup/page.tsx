export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { SignupClient } from "./signup-client";

interface SignupPageProps {
  searchParams?: {
    theme?: string;
    plan?: string;
    redirect?: string;
    url?: string;
    platform?: string;
  };
}

export default function SignupPage({ searchParams }: SignupPageProps) {
  const initialTheme = searchParams?.theme;
  const initialPlan = searchParams?.plan;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] p-4">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#78593D]" />
            <span className="text-xs font-semibold text-[#7E756B]">Loading registration...</span>
          </div>
        </div>
      }
    >
      <SignupClient initialTheme={initialTheme} initialPlan={initialPlan} />
    </Suspense>
  );
}
