"use client";

import Link from "next/link";
import { Suspense, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { clearUserData } from "@/lib/user-data-store";
import { HeaderProfileMenu } from "@/components/header-profile-menu";
import {
  CreditCard,
  Layers,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Plus,
  Receipt,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = usePathname();

  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiClient("/api/auth/me"),
    retry: false,
  });

  const handleLogout = async () => {
    try {
      clearUserData();
      await apiClient("/api/auth/logout", { method: "POST" });
    } finally {
      queryClient.setQueryData(["auth", "me"], { user: null });
      queryClient.removeQueries({ queryKey: ["auth", "me"] });
      window.location.href = "/login";
    }
  };

  const user = userData?.user;
  const isAdmin = Boolean(user?.is_super_admin || user?.email === "admin@webintoapp.com");

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/login");
    }
  }, [isUserLoading, user, router]);

  // Synchronize profile photo update across entire dashboard header (Requirement 4)
  useEffect(() => {
    const handleProfileUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    };
    window.addEventListener("user-profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("user-profile-updated", handleProfileUpdate);
  }, [queryClient]);

  const { data: appsData } = useQuery({
    queryKey: ["apps"],
    queryFn: async () => {
      try {
        const res = await apiClient("/api/apps");
        return Array.isArray(res) ? res : res.apps || [];
      } catch {
        return [];
      }
    },
    enabled: Boolean(user && !isAdmin),
  });

  const apps = appsData || [];

  const isAppDraft = (appItem: any) => {
    const builds = appItem?.builds || [];
    const hasReadyBuild = builds.some((b: any) => b.is_ready || b.status === "ready");
    return Boolean(
      !appItem?.is_completed &&
      !hasReadyBuild &&
      appItem?.status !== "completed" &&
      appItem?.status !== "live" &&
      appItem?.status !== "active"
    );
  };

  const hasPreviouslyBuiltApps = Boolean(
    user?.has_built_apps ||
    (apps.length > 0 && apps.some((a: any) => !isAppDraft(a)))
  );

  const latestDraft = user?.latest_draft || apps.find((a: any) => isAppDraft(a));
  const draftHref = latestDraft?.ulid
    ? `/dashboard/apps/${latestDraft.ulid}/setup/${latestDraft.setup_step || "platform"}`
    : "/dashboard/apps/new";

  const dashboardHref = "/dashboard";

  const isAdminSection = pathname.startsWith("/dashboard/admin");
  const isBilling = pathname.startsWith("/dashboard/billing");
  const isSettings = pathname.startsWith("/dashboard/settings");
  const isAddons = pathname.startsWith("/dashboard/addons");
  const isApps = !isBilling && !isSettings && !isAddons && !isAdminSection;

  const isAppAdminPortal = /^\/dashboard\/apps\/[^/]+\/admin/.test(pathname);
  if (isAppAdminPortal) {
    return <><Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading...</div>}>{children}</Suspense></>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full">
      <header className="bg-white border-b border-slate-200 w-full relative z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-8">
            <Link href={dashboardHref} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0 ${
                  isAdmin
                    ? "bg-gradient-to-tr from-[#78593D] to-[#4A3728] shadow-[#78593D]/20"
                    : "bg-gradient-to-tr from-[#78593D] via-[#8E6D4E] to-[#C2A88F] shadow-[#78593D]/20"
                }`}
              >
                {isAdmin ? (
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-amber-200" />
                ) : (
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg text-slate-900 tracking-tight">
                  WebIntoApp
                </span>
                {isAdmin && (
                  <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                    Super Admin
                  </span>
                )}
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link
                href="/dashboard"
                className={`py-5 transition ${
                  isApps
                    ? "text-[#78593D] border-b-2 border-[#78593D] font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/addons"
                className={`py-5 transition ${
                  isAddons
                    ? "text-[#78593D] border-b-2 border-[#78593D] font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Add-ons &amp; Store
              </Link>
              <Link
                href="/dashboard/billing"
                className={`py-5 transition ${
                  isBilling
                    ? "text-[#78593D] border-b-2 border-[#78593D] font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Billing &amp; Invoices
              </Link>
              <Link
                href="/dashboard/settings"
                className={`py-5 transition ${
                  isSettings
                    ? "text-[#78593D] border-b-2 border-[#78593D] font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Settings
              </Link>
              {isAdmin && (
                <a
                  href="http://localhost:8000/admin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-5 text-amber-900 font-bold hover:text-amber-800 transition flex items-center gap-1.5"
                  title="Open backend system administration in new tab"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>Filament Admin ↗</span>
                </a>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/dashboard/apps/new"
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-[#78593D] hover:bg-[#634830] text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Create App</span>
            </Link>

            <div className="hidden sm:block h-6 w-px bg-slate-200" />

            <HeaderProfileMenu user={user} onLogout={handleLogout} />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 md:pb-8">
        <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading...</div>}>{children}</Suspense>
      </main>

      {/* Modern Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-2 py-2 flex items-center justify-around shadow-lg shadow-slate-900/10">
        <Link
          href="/dashboard"
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition px-2 py-1 rounded-xl ${
            isApps ? "text-[#78593D] font-bold" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Layers className="w-5 h-5" />
          <span>Dashboard</span>
        </Link>

        <Link
          href="/dashboard/addons"
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition px-2 py-1 rounded-xl ${
            isAddons ? "text-[#78593D] font-bold" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span>Add-ons</span>
        </Link>

        <Link
          href="/dashboard/apps/new"
          className="flex flex-col items-center gap-0.5 text-[10px] font-semibold text-[#78593D] px-1 py-1 -mt-4"
        >
          <div className="w-10 h-10 rounded-full bg-[#78593D] text-white flex items-center justify-center shadow-lg shadow-[#78593D]/30">
            <Plus className="w-5 h-5" />
          </div>
          <span>New</span>
        </Link>

        <Link
          href="/dashboard/billing"
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition px-2 py-1 rounded-xl ${
            isBilling ? "text-[#78593D] font-bold" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span>Billing</span>
        </Link>

        <Link
          href="/dashboard/settings"
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition px-2 py-1 rounded-xl ${
            isSettings ? "text-[#78593D] font-bold" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <LogOut className="w-5 h-5" />
          <span>Account</span>
        </Link>
      </nav>
    </div>
  );
}
