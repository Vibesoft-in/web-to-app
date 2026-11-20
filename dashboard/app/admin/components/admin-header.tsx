"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Bell,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  User,
  Shield,
  Settings,
  LogOut,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

interface HeaderProps {
  onOpenSearch: () => void;
  criticalAlertCount: number;
  onSelectTab: (tab: any) => void;
}

export function AdminHeader({
  onOpenSearch,
  criticalAlertCount,
  onSelectTab,
}: HeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shadow-2xs">
      {/* Search Input Trigger */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center gap-3 px-3.5 py-2 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 text-xs sm:text-sm font-medium transition group"
        >
          <Search className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition" />
          <span className="flex-1 text-left truncate">
            Search customers, apps, builds, orders...
          </span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono font-bold bg-white text-slate-600 border border-slate-200 rounded-md shadow-2xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 ml-4">
        {/* Notifications Icon with Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white" />
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-extrabold text-sm text-slate-900">
                  Platform Notifications
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                  3 New
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="py-2.5 flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      Build #104 Failed for Mobile Store
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Keystore signature mismatch in release variant • 12m ago
                    </p>
                  </div>
                </div>
                <div className="py-2.5 flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      Order #ORD-9281 Settled via Razorpay
                    </p>
                    <p className="text-[10px] text-slate-500">
                      ₹14,999 Enterprise Tier plan activated • 45m ago
                    </p>
                  </div>
                </div>
                <div className="py-2.5 flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      Automated Snapshot Created
                    </p>
                    <p className="text-[10px] text-slate-500">
                      backup_20261119_120000.sqlite verified OK • 2h ago
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white font-bold text-xs flex items-center justify-center shadow-sm">
              SA
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-extrabold text-slate-900 leading-none">
                Super Admin
              </span>
              <span className="text-[10px] text-slate-500 leading-none mt-1">
                admin@webintoapp.com
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">
                  Super Admin
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  admin@webintoapp.com
                </p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    onSelectTab("settings");
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Settings</span>
                </button>
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    onSelectTab("security");
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                >
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span>Security</span>
                </button>
              </div>

              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-bold"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
