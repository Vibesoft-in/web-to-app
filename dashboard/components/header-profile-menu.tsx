"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  Check,
  ChevronDown,
  LayoutDashboard,
  Loader2,
  LogOut,
  Sliders,
  User,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { clearUserData } from "@/lib/user-data-store";

interface HeaderProfileMenuProps {
  user?: any;
  onLogout?: () => void;
  forceMode?: "dashboard" | "website";
}

export function HeaderProfileMenu({ user: propUser, onLogout, forceMode }: HeaderProfileMenuProps) {
  const router = useRouter();
  const pathname = usePathname() || "";
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Edit profile form state
  const [editName, setEditName] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editTenantName, setEditTenantName] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync profile data and listen for cross-component updates (Requirement 4)
  useEffect(() => {
    const handleProfileUpdate = (e: any) => {
      if (e.detail?.avatar_url !== undefined) {
        setEditAvatarUrl(e.detail.avatar_url);
        setImgError(false);
      }
      if (e.detail?.name !== undefined) {
        setEditName(e.detail.name);
      }
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    };
    window.addEventListener("user-profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("user-profile-updated", handleProfileUpdate);
  }, [queryClient]);

  // Determine current page context: dashboard vs main website
  const isDashboard = forceMode === "dashboard" || (forceMode !== "website" && pathname.startsWith("/dashboard"));

  // If user prop is not provided, fetch current user state
  const { data: authData } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiClient("/api/auth/me"),
    enabled: propUser === undefined,
    retry: false,
    staleTime: 30000,
  });

  const user = propUser !== undefined ? propUser : authData?.user;

  // Sync edit profile values when user is available
  useEffect(() => {
    if (user) {
      setEditName(user.name || "");
      setEditAvatarUrl(user.avatar_url || "");
      setEditTenantName(user.tenant?.name || "");
    }
  }, [user]);

  // Lock background scrolling when Edit Profile modal is active
  useEffect(() => {
    if (isEditModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isEditModalOpen]);

  // Support browser Back button to dismiss modal sequentially
  useEffect(() => {
    const handlePopState = () => {
      if (isEditModalOpen) {
        setIsEditModalOpen(false);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isEditModalOpen]);

  const openEditModal = () => {
    setIsOpen(false);
    setIsEditModalOpen(true);
    if (typeof window !== "undefined") {
      window.history.pushState({ modal: "edit-profile" }, "");
    }
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    if (typeof window !== "undefined" && window.history.state?.modal === "edit-profile") {
      window.history.back();
    }
  };

  // Close dropdown on click outside & Escape key (Admin Change 7)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
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
    }, 200);
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
      queryClient.setQueryData(["auth", "me"], { user: null });
      queryClient.removeQueries({ queryKey: ["auth", "me"] });
      window.location.href = "/";
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await apiClient("/api/user/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: editName.trim(),
          avatar_url: editAvatarUrl.trim(),
          tenant_name: editTenantName.trim(),
        }),
      });

      // Update TanStack query cache immediately
      queryClient.setQueryData(["auth", "me"], (old: any) => {
        if (!old?.user) return old;
        return {
          ...old,
          user: {
            ...old.user,
            name: editName.trim(),
            avatar_url: editAvatarUrl.trim(),
            tenant: {
              ...(old.user.tenant || {}),
              name: editTenantName.trim(),
            },
          },
        };
      });

      // Synchronize with LocalStorage and broadcast to all pages and headers (Requirement 4)
      if (typeof window !== "undefined") {
        if (editAvatarUrl.trim()) {
          localStorage.setItem("appifyhub_user_avatar", editAvatarUrl.trim());
        } else {
          localStorage.removeItem("appifyhub_user_avatar");
        }
        window.dispatchEvent(
          new CustomEvent("user-profile-updated", {
            detail: {
              name: editName.trim(),
              avatar_url: editAvatarUrl.trim(),
              tenant_name: editTenantName.trim(),
            },
          })
        );
      }

      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });

      setSaveSuccess(true);
      setTimeout(() => {
        closeEditModal();
        setSaveSuccess(false);
      }, 900);
    } catch (err: any) {
      setSaveError(err.message || "Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Please select an image smaller than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setEditAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
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

  // Generate display name and initials
  const displayName = user.name || user.email?.split("@")[0] || "Client Account";
  const initials = (
    user.name
      ? user.name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .slice(0, 2)
      : user.email?.slice(0, 2) || "CA"
  ).toUpperCase();

  const cachedLocalAvatar = typeof window !== "undefined" ? localStorage.getItem("appifyhub_user_avatar") : null;
  const userAvatar = editAvatarUrl || user?.avatar_url || cachedLocalAvatar;

  return (
    <>
      <div
        ref={dropdownRef}
        className="relative inline-block text-left z-30"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Profile Avatar Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label="User Account Menu"
          className="flex items-center gap-2.5 p-1.5 pl-2 pr-3 rounded-2xl border border-slate-200 hover:border-[#78593D]/50 bg-white hover:bg-[#FAF7F2] transition shadow-xs focus:outline-none focus:ring-2 focus:ring-[#78593D]/20 cursor-pointer select-none"
        >
          {/* Avatar Image or Styled Initials */}
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden bg-gradient-to-br from-[#78593D] to-[#5A412A] text-white flex items-center justify-center font-bold text-xs shadow-inner flex-shrink-0 border border-black/5">
            {userAvatar && !imgError ? (
              <img
                src={userAvatar}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          {/* User Name & Email */}
          <div className="text-left hidden sm:block max-w-[140px] truncate">
            <span className="text-xs font-extrabold text-slate-900 block leading-tight truncate">
              {displayName}
            </span>
            <span className="text-[10px] text-slate-400 block leading-tight truncate font-medium">
              {user.email || ""}
            </span>
          </div>

          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
              isOpen ? "rotate-180 text-[#78593D]" : ""
            }`}
          />
        </button>

        {/* ── PROFILE DROPDOWN MENU ── */}
        {isOpen && (
          <div
            role="menu"
            aria-orientation="vertical"
            className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white border border-[#EBE6DF] shadow-xl shadow-stone-900/10 p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
          >
            {/* User Header Summary */}
            <div className="px-3.5 py-3 border-b border-slate-100 mb-1.5 bg-[#FAF7F2] rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#78593D] to-[#5A412A] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs border border-white">
                  {userAvatar && !imgError ? (
                    <img
                      src={userAvatar}
                      alt={displayName}
                      className="w-full h-full object-cover"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-900 truncate">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {user.email || ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              {/* Context-Based Menu Options */}
              {!isDashboard ? (
                /* ── MAIN WEBSITE MODE: EXACTLY TWO OPTIONS (Dashboard & Logout) ── */
                <>
                  <Link
                    href="/dashboard"
                    role="menuitem"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-[#78593D] hover:bg-[#FAF7F2] transition group cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-[#EFEAE2] text-slate-600 group-hover:text-[#78593D] flex items-center justify-center transition-colors">
                      <LayoutDashboard className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block leading-tight">Dashboard</span>
                      <span className="text-[10px] text-slate-400 font-normal block leading-tight">
                        Go to app workspace
                      </span>
                    </div>
                  </Link>

                  <div className="h-px bg-slate-100 my-1" />

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer group text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-rose-50 group-hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors">
                      <LogOut className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block leading-tight">Logout</span>
                      <span className="text-[10px] text-rose-400 font-normal block leading-tight">
                        End active session
                      </span>
                    </div>
                  </button>
                </>
              ) : (
                /* ── DASHBOARD MODE: EXACTLY TWO OPTIONS (Settings, Logout) ── */
                <>
                  {/* Option 1: Settings */}
                  <Link
                    href="/dashboard/settings"
                    role="menuitem"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-[#78593D] hover:bg-[#FAF7F2] transition group cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-[#EFEAE2] text-slate-600 group-hover:text-[#78593D] flex items-center justify-center transition-colors">
                      <Sliders className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block leading-tight">Settings</span>
                      <span className="text-[10px] text-slate-400 font-normal block leading-tight">
                        Account &amp; preferences
                      </span>
                    </div>
                  </Link>

                  <div className="h-px bg-slate-100 my-1" />

                  {/* Option 2: Logout */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer group text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-rose-50 group-hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors">
                      <LogOut className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block leading-tight">Logout</span>
                      <span className="text-[10px] text-rose-400 font-normal block leading-tight">
                        End active session
                      </span>
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── EDIT PROFILE MODAL (PORTAL TO BODY TO PREVENT ANY CLIPPING/STACKING ISSUES) ── */}
      {isEditModalOpen && mounted && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEditModal();
          }}
        >
          <div
            className="bg-white rounded-2xl border border-[#EBE6DF] shadow-2xl max-w-md w-full relative animate-in zoom-in-95 duration-200 p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1 & 2. Modal Header & Supporting Description */}
            <div className="flex items-start justify-between gap-3 pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] text-[#78593D] flex items-center justify-center border border-[#EBE6DF] flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">Edit Account Profile</h3>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">Update your public name and profile avatar</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {saveSuccess && (
              <div className="mb-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Profile updated successfully! Refreshing header...</span>
              </div>
            )}

            {saveError && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold">
                {saveError}
              </div>
            )}

            <form id="edit-profile-form" onSubmit={handleSaveProfile} className="space-y-3">
              {/* 3 & 4. Avatar Preview & Upload Area */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FAF7F2] border border-[#EBE6DF]">
                <div className="relative w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-[#78593D] to-[#5A412A] text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0 border border-white">
                  {editAvatarUrl ? (
                    <img
                      src={editAvatarUrl}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                      onError={() => setEditAvatarUrl("")}
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block leading-tight">Profile Avatar</span>
                    <span className="text-[10px] text-slate-400 block leading-tight">JPG, PNG, GIF or WebP</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-[#EBE6DF] hover:bg-slate-50 text-[11px] font-bold text-[#78593D] cursor-pointer shadow-2xs transition">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Upload Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                    {editAvatarUrl && (
                      <button
                        type="button"
                        onClick={() => setEditAvatarUrl("")}
                        className="px-2 py-1.5 text-[10px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg font-bold transition cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 5. Full Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs sm:text-sm focus:border-[#78593D] focus:outline-none focus:ring-1 focus:ring-[#78593D]/30 transition"
                />
              </div>

              {/* 6 & 7. Email Address (Read-only) + Restriction Notice */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user.email || ""}
                  disabled
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-xs sm:text-sm cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block leading-tight">
                  Email is linked to your login credentials and cannot be changed here.
                </span>
              </div>

              {/* 8. Avatar URL alternative (Optional) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Or Image Web URL (Optional)
                </label>
                <input
                  type="url"
                  value={editAvatarUrl.startsWith("data:") ? "" : editAvatarUrl}
                  onChange={(e) => setEditAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs sm:text-sm focus:border-[#78593D] focus:outline-none focus:ring-1 focus:ring-[#78593D]/30 transition"
                />
              </div>

              {/* 9 & 10. Modal Actions (Cancel & Save Changes) */}
              <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-[#78593D] hover:bg-[#624730] transition flex items-center gap-1.5 disabled:opacity-60 cursor-pointer shadow-xs"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
