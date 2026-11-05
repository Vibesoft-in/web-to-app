"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
}

export function HeaderProfileMenu({ user: propUser, onLogout }: HeaderProfileMenuProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Edit profile form state
  const [editName, setEditName] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editTenantName, setEditTenantName] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  // Sync edit profile values when user is available
  useEffect(() => {
    if (user) {
      setEditName(user.name || "");
      setEditAvatarUrl(user.avatar_url || "");
      setEditTenantName(user.tenant?.name || "");
    }
  }, [user]);

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
      window.location.href = "/login";
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

      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });

      setSaveSuccess(true);
      setTimeout(() => {
        setIsEditModalOpen(false);
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

  const userAvatar = user.avatar_url || editAvatarUrl;

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
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
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

        {/* ── PROFILE DROPDOWN MENU - EXACTLY THREE OPTIONS ── */}
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
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={displayName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
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

              {/* Option 2: Edit Profile */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  setIsEditModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-[#78593D] hover:bg-[#FAF7F2] transition group cursor-pointer text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-[#EFEAE2] text-slate-600 group-hover:text-[#78593D] flex items-center justify-center transition-colors">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="block leading-tight">Edit Profile</span>
                  <span className="text-[10px] text-slate-400 font-normal block leading-tight">
                    Update name &amp; avatar
                  </span>
                </div>
              </button>

              <div className="h-px bg-slate-100 my-1" />

              {/* Option 3: Logout */}
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
            </div>
          </div>
        )}
      </div>

      {/* ── EDIT PROFILE MODAL ── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-[#EBE6DF] shadow-2xl max-w-md w-full p-6 sm:p-7 relative space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FAF7F2] text-[#78593D] flex items-center justify-center border border-[#EBE6DF]">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Edit Account Profile</h3>
                  <p className="text-xs text-slate-500">Update your public name and profile avatar</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Profile updated successfully! Refreshing header...</span>
              </div>
            )}

            {saveError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                {saveError}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Avatar Preview & Upload Area */}
              <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EBE6DF]">
                <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-[#78593D] to-[#5A412A] text-white flex items-center justify-center font-bold text-sm shadow-md flex-shrink-0 border-2 border-white">
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

                <div className="min-w-0 flex-1 space-y-1">
                  <span className="text-xs font-bold text-slate-800 block">Profile Avatar</span>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#EBE6DF] hover:bg-slate-50 text-[11px] font-bold text-[#78593D] cursor-pointer shadow-2xs transition">
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
                      className="text-[10px] text-rose-600 hover:underline block font-semibold cursor-pointer"
                    >
                      Remove Avatar
                    </button>
                  )}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  placeholder="e.g. John Doe"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#78593D] focus:outline-none focus:ring-2 focus:ring-[#78593D]/20 transition"
                />
              </div>

              {/* Email Address (Read-only) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user.email || ""}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-sm cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Email is linked to your login credentials and cannot be changed here.
                </span>
              </div>

              {/* Avatar URL alternative */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Or Image Web URL (Optional)
                </label>
                <input
                  type="url"
                  value={editAvatarUrl.startsWith("data:") ? "" : editAvatarUrl}
                  onChange={(e) => setEditAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#78593D] focus:outline-none focus:ring-2 focus:ring-[#78593D]/20 transition"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-[#78593D] hover:bg-[#634932] disabled:opacity-50 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
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
        </div>
      )}
    </>
  );
}
