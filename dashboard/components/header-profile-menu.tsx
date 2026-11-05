"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, LogOut, User, ChevronDown } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { clearUserData } from "@/lib/user-data-store";

interface HeaderProfileMenuProps {
  user?: any;
  onLogout?: () => void;
}

export function HeaderProfileMenu({ user: propUser, onLogout }: HeaderProfileMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // If user prop is not provided, fetch current user state
  const { data: authData } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiClient("/api/auth/me"),
    enabled: propUser === undefined,
    retry: false,
    staleTime: 30000,
  });

  const user = propUser !== undefined ? propUser : authData?.user;

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 180);
  };

  const handleLogout = async () => {
    setIsOpen(false);
    if (onLogout) {
      onLogout();
      return;
    }

    try {
      clearUserData();
      await apiClient("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignored
    } finally {
      window.location.href = "/";
    }
  };

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" className="btn-text">
          Login
        </Link>
        <Link href="/signup" className="btn-outline">
          <span>Get Started</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="8" x2="13" y2="8" />
            <polyline points="9 4 13 8 9 12" />
          </svg>
        </Link>
      </div>
    );
  }

  // Generate initials from name or email
  const displayName = user.name || user.email?.split("@")[0] || "User";
  const initials = (
    user.name
      ? user.name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .slice(0, 2)
      : user.email?.slice(0, 2) || "U"
  ).toUpperCase();

  return (
    <div
      ref={dropdownRef}
      className="relative inline-block text-left"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Profile Avatar Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User Profile Menu"
        className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full border border-[#EBE6DF] hover:border-[#78593D]/40 bg-white hover:bg-[#FAF7F2] transition shadow-xs focus:outline-none focus:ring-2 focus:ring-[#78593D]/30 cursor-pointer select-none"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#78593D] to-[#5A412A] text-white flex items-center justify-center font-bold text-xs shadow-inner flex-shrink-0">
          {initials || <User className="w-4 h-4 text-white" />}
        </div>
        <span className="text-xs font-bold text-slate-800 max-w-[110px] truncate hidden sm:inline-block">
          {displayName}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[#78593D]" : ""
          }`}
        />
      </button>

      {/* Profile Dropdown Menu - EXACTLY 2 Options */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-white border border-[#EBE6DF] shadow-xl shadow-stone-900/10 p-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {/* User Info Header */}
          <div className="px-3 py-2 border-b border-slate-100 mb-1">
            <p className="text-xs font-bold text-slate-900 truncate">
              {displayName}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {user.email || ""}
            </p>
          </div>

          <div className="space-y-0.5">
            {/* Option 1: Dashboard */}
            <Link
              href="/dashboard"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-[#78593D] hover:bg-[#FAF7F2] transition group"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-500 group-hover:text-[#78593D] transition-colors" />
              <span>Dashboard</span>
            </Link>

            {/* Option 2: Logout */}
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer group"
            >
              <LogOut className="w-4 h-4 text-rose-500 group-hover:text-rose-700 transition-colors" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
