"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Store,
  Users,
  Bell,
  CreditCard,
  Palette,
  Truck,
  Target,
  Download,
  UserPlus,
  Check,
  Shield,
  Lock,
  Sun,
  Moon,
  Laptop,
  AlertTriangle,
  RefreshCw,
  X,
} from "lucide-react";

interface SettingsViewProps {
  storeName: string;
  storeDomain: string;
  storeUrl?: string;
  currencySymbol: string;
  portalData?: any;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

export function SettingsView({
  storeName,
  storeDomain,
  storeUrl,
  currencySymbol,
  portalData,
  showToast,
}: SettingsViewProps) {
  const [subTab, setSubTab] = useState<"store" | "team" | "notifications" | "plan" | "appearance">("store");

  // Form State: The shop
  const [storeForm, setStoreForm] = useState({
    name: storeName || "My Online Store",
    email: `orders@${storeDomain || "lowtide.coffee"}`,
    phone: "+44 (0) 20 7946 0912",
    timezone: "London / GMT",
    address: "Unit 4, Phoenix Wharf, Maritime Way, London SE10 0NF",
    flatShipping: "3.50",
    freeShippingOver: "40.00",
    carrier: "Royal Mail Tracked 24",
    pickupTime: "16:00",
    dailyGoal: 1500,
  });

  const [initialStoreForm, setInitialStoreForm] = useState(storeForm);
  const isDirty = JSON.stringify(storeForm) !== JSON.stringify(initialStoreForm);

  // Team state
  const [teamMembers, setTeamMembers] = useState([
    { id: "1", name: "Noor Al-Mansoor", email: `noor@${storeDomain || "lowtide.coffee"}`, role: "Store Manager", access: "Owner", active: true },
    { id: "2", name: "Tomás Vega", email: `tomas@${storeDomain || "lowtide.coffee"}`, role: "Production & Floor", access: "Admin", active: true },
    { id: "3", name: "Aisha Chen", email: `aisha@${storeDomain || "lowtide.coffee"}`, role: "Customer & Wholesale Care", access: "Staff", active: true },
  ]);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Staff");

  // Notification toggles
  const [notifications, setNotifications] = useState({
    orders: true,
    stock: true,
    messages: true,
    wholesale: true,
    digest: false,
  });

  // Plan state
  const [currentPlan, setCurrentPlan] = useState<"starter" | "growth" | "scale">("growth");
  const [themePreference, setThemePreference] = useState<"light" | "dark" | "system">("light");

  const handleSaveStoreSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setInitialStoreForm(storeForm);
    showToast("Store and shipping settings saved", "success");
  };

  const handleDiscardChanges = () => {
    setStoreForm(initialStoreForm);
    showToast("Changes discarded", "info");
  };

  const handleToggleMember = (id: string) => {
    setTeamMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, active: !m.active } : m))
    );
    showToast("Team member access updated", "info");
  };

  const handleChangeMemberAccess = (id: string, access: string) => {
    setTeamMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, access } : m))
    );
    showToast(`Access updated to ${access}`, "info");
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      showToast("Please provide both name and email", "error");
      return;
    }
    const newMember = {
      id: String(Date.now()),
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      role: "Operations Associate",
      access: inviteRole,
      active: true,
    };
    setTeamMembers((prev) => [...prev, newMember]);
    setInviteName("");
    setInviteEmail("");
    setInviteModalOpen(false);
    showToast(`Invitation sent to ${newMember.email}`, "success");
  };

  const handleToggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      showToast(`Notification ${updated[key] ? "enabled" : "disabled"}`, "info");
      return updated;
    });
  };

  const handleDownloadInvoice = (month: string) => {
    showToast(`Receipt downloaded for ${month}`, "success");
  };

  return (
    <div className="space-y-6">
      {/* Sub-Header */}
      <div className="flex items-center justify-between border-b border-[#E6E1D8] dark:border-[#2C2D2B] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#8A857D] dark:text-[#9A958D] mb-1">
            <span>Account</span>
            <span>/</span>
            <span className="text-[#1A1917] dark:text-[#F5F2EB] font-medium">Settings</span>
          </div>
          <h1 className="text-2xl font-serif text-[#1A1917] dark:text-[#F5F2EB] tracking-tight">Settings</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <div className="inline-flex p-1 bg-[#F0ECE1] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl text-xs font-medium shrink-0">
          {[
            { id: "store", label: "Store" },
            { id: "team", label: "Team" },
            { id: "notifications", label: "Notifications" },
            { id: "plan", label: "Plan & billing" },
            { id: "appearance", label: "Appearance" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                subTab === tab.id
                  ? "bg-white dark:bg-[#252625] text-[#1A1917] dark:text-[#F5F2EB] shadow-sm font-semibold"
                  : "text-[#8A857D] dark:text-[#9A958D] hover:text-[#1A1917]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: THE SHOP / STORE */}
      {subTab === "store" && (
        <form onSubmit={handleSaveStoreSettings} className="space-y-6 max-w-3xl">
          {/* Shop Details */}
          <div className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-serif font-medium text-[#1A1917] dark:text-[#F5F2EB]">The shop</h3>
              <p className="text-xs text-[#8A857D] dark:text-[#9A958D]">How customers see you on receipts, packing slips and invoices.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-medium text-[#4A4742] dark:text-[#C5C0B6] block mb-1">Store Name</label>
                <input
                  type="text"
                  value={storeForm.name}
                  onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg text-[#1A1917] dark:text-[#F5F2EB] focus:outline-none focus:border-[#525B44]"
                />
              </div>

              <div>
                <label className="font-medium text-[#4A4742] dark:text-[#C5C0B6] block mb-1">Customer Support Email</label>
                <input
                  type="email"
                  value={storeForm.email}
                  onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg text-[#1A1917] dark:text-[#F5F2EB] focus:outline-none focus:border-[#525B44]"
                />
              </div>

              <div>
                <label className="font-medium text-[#4A4742] dark:text-[#C5C0B6] block mb-1">Phone</label>
                <input
                  type="tel"
                  value={storeForm.phone}
                  onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg text-[#1A1917] dark:text-[#F5F2EB] focus:outline-none focus:border-[#525B44]"
                />
              </div>

              <div>
                <label className="font-medium text-[#4A4742] dark:text-[#C5C0B6] block mb-1">Time Zone</label>
                <select
                  value={storeForm.timezone}
                  onChange={(e) => setStoreForm({ ...storeForm, timezone: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg text-[#1A1917] dark:text-[#F5F2EB] focus:outline-none focus:border-[#525B44]"
                >
                  <option>London / GMT</option>
                  <option>Eastern Time (ET)</option>
                  <option>Central Time (CT)</option>
                  <option>Pacific Time (PT)</option>
                  <option>Central European Time (CET)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="font-medium text-[#4A4742] dark:text-[#C5C0B6] block mb-1">Store & Dispatch Address</label>
                <input
                  type="text"
                  value={storeForm.address}
                  onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg text-[#1A1917] dark:text-[#F5F2EB] focus:outline-none focus:border-[#525B44]"
                />
              </div>
            </div>
          </div>

          {/* Shipping */}
          <div className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-serif font-medium text-[#1A1917] dark:text-[#F5F2EB]">Shipping & Courier</h3>
              <p className="text-xs text-[#8A857D] dark:text-[#9A958D]">What a parcel costs and when the courier arrives.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-medium text-[#4A4742] dark:text-[#C5C0B6] block mb-1">Flat Rate Shipping</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#8A857D]">{currencySymbol}</span>
                  <input
                    type="number"
                    step="0.5"
                    value={storeForm.flatShipping}
                    onChange={(e) => setStoreForm({ ...storeForm, flatShipping: e.target.value })}
                    className="w-full pl-7 pr-3 py-2 bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg text-[#1A1917] dark:text-[#F5F2EB] focus:outline-none focus:border-[#525B44]"
                  />
                </div>
                <span className="text-[11px] text-[#8A857D] mt-1 block">Charged on orders under free shipping</span>
              </div>

              <div>
                <label className="font-medium text-[#4A4742] dark:text-[#C5C0B6] block mb-1">Free Shipping Threshold</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#8A857D]">{currencySymbol}</span>
                  <input
                    type="number"
                    step="5"
                    value={storeForm.freeShippingOver}
                    onChange={(e) => setStoreForm({ ...storeForm, freeShippingOver: e.target.value })}
                    className="w-full pl-7 pr-3 py-2 bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg text-[#1A1917] dark:text-[#F5F2EB] focus:outline-none focus:border-[#525B44]"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-[#4A4742] dark:text-[#C5C0B6] block mb-1">Primary Carrier</label>
                <input
                  type="text"
                  value={storeForm.carrier}
                  onChange={(e) => setStoreForm({ ...storeForm, carrier: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg text-[#1A1917] dark:text-[#F5F2EB] focus:outline-none focus:border-[#525B44]"
                />
              </div>

              <div>
                <label className="font-medium text-[#4A4742] dark:text-[#C5C0B6] block mb-1">Daily Pickup Time</label>
                <input
                  type="time"
                  value={storeForm.pickupTime}
                  onChange={(e) => setStoreForm({ ...storeForm, pickupTime: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg text-[#1A1917] dark:text-[#F5F2EB] focus:outline-none focus:border-[#525B44]"
                />
                <span className="text-[11px] text-[#8A857D] mt-1 block">Courier countdown in header counts to this</span>
              </div>
            </div>
          </div>

          {/* Daily Goal Slider */}
          <div className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl p-5 shadow-sm space-y-3">
            <div>
              <h3 className="text-base font-serif font-medium text-[#1A1917] dark:text-[#F5F2EB]">Daily revenue goal</h3>
              <p className="text-xs text-[#8A857D] dark:text-[#9A958D]">The dashed target line on the dashboard bar chart and the Today progress ring.</p>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <input
                type="range"
                min="500"
                max="5000"
                step="50"
                value={storeForm.dailyGoal}
                onChange={(e) => setStoreForm({ ...storeForm, dailyGoal: Number(e.target.value) })}
                className="flex-1 accent-[#525B44] cursor-pointer"
              />
              <span className="font-mono font-semibold text-lg text-[#525B44] dark:text-[#949F83] min-w-[90px] text-right">
                {currencySymbol}{storeForm.dailyGoal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Save Bar */}
          <div className="flex items-center justify-between p-4 bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl">
            <span className="text-xs text-[#8A857D]">
              {isDirty ? "You have unsaved changes" : "All changes saved"}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDiscardChanges}
                disabled={!isDirty}
                className="px-3.5 py-1.5 text-xs text-[#8A857D] hover:text-[#1A1917] disabled:opacity-40 transition-colors"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={!isDirty}
                className="px-4 py-1.5 text-xs font-medium bg-[#525B44] text-white rounded-lg hover:bg-[#434B37] disabled:opacity-40 transition-colors shadow-xs"
              >
                Save changes
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: TEAM */}
      {subTab === "team" && (
        <div className="space-y-6 max-w-3xl">
          <div className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-serif font-medium text-[#1A1917] dark:text-[#F5F2EB]">Team seats</h3>
                <p className="text-xs text-[#8A857D] dark:text-[#9A958D]">
                  {teamMembers.filter((m) => m.active).length} of 6 seats active on the Growth plan
                </p>
              </div>

              <button
                onClick={() => setInviteModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#525B44] text-white rounded-lg hover:bg-[#434B37] transition-colors shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Invite</span>
              </button>
            </div>

            {/* Quota Bar */}
            <div className="h-2 bg-[#E6E1D8] dark:bg-[#2C2D2B] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#525B44] rounded-full"
                style={{ width: `${(teamMembers.filter((m) => m.active).length / 6) * 100}%` }}
              />
            </div>

            {/* Team Members List */}
            <ul className="divide-y divide-[#E6E1D8]/60 dark:divide-[#2C2D2B]/60 text-xs">
              {teamMembers.map((member) => (
                <li key={member.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#525B44]/15 text-[#525B44] dark:text-[#949F83] font-semibold text-xs flex items-center justify-center shrink-0">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-[#1A1917] dark:text-[#F5F2EB]">
                        {member.name} {member.id === "1" && <span className="text-[10px] text-[#8A857D] italic">(you)</span>}
                      </p>
                      <p className="text-[11px] text-[#8A857D]">
                        {member.role} · {member.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {member.access === "Owner" ? (
                      <span className="px-2 py-0.5 rounded bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] text-[10px] font-medium text-[#8A857D]">
                        Owner
                      </span>
                    ) : (
                      <select
                        value={member.access}
                        onChange={(e) => handleChangeMemberAccess(member.id, e.target.value)}
                        className="px-2 py-1 text-xs bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded text-[#4A4742] dark:text-[#C5C0B6]"
                      >
                        <option>Admin</option>
                        <option>Staff</option>
                      </select>
                    )}

                    {member.access !== "Owner" && (
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={member.active}
                          onChange={() => handleToggleMember(member.id)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-[#E6E1D8] dark:bg-[#333533] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#525B44] relative" />
                      </label>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* TAB 3: NOTIFICATIONS */}
      {subTab === "notifications" && (
        <div className="space-y-6 max-w-3xl">
          <div className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-serif font-medium text-[#1A1917] dark:text-[#F5F2EB]">
                What lands in the bell
              </h3>
              <p className="text-xs text-[#8A857D] dark:text-[#9A958D]">
                Real-time activity alerts across your store floor.
              </p>
            </div>

            <ul className="divide-y divide-[#E6E1D8]/60 dark:divide-[#2C2D2B]/60 text-xs">
              {[
                { key: "orders", title: "New orders", desc: "Every web order the moment it is paid and enters the fulfilment queue." },
                { key: "stock", title: "Running low stock alerts", desc: "When a coffee or brew tool drops below its reorder point." },
                { key: "messages", title: "Customer messages", desc: "A new conversation or reply in the inbox." },
                { key: "wholesale", title: "Café accounts", desc: "Orders and requests from wholesale trade accounts." },
                { key: "digest", title: "Morning digest", desc: "Yesterday’s takings and today’s order digest sent daily at 7 AM." },
              ].map((item) => (
                <li key={item.key} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-[#1A1917] dark:text-[#F5F2EB]">{item.title}</p>
                    <p className="text-[11px] text-[#8A857D] dark:text-[#9A958D] mt-0.5">{item.desc}</p>
                  </div>

                  <label className="flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notifications[item.key as keyof typeof notifications]}
                      onChange={() => handleToggleNotification(item.key as keyof typeof notifications)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#E6E1D8] dark:bg-[#333533] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#525B44] relative" />
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* TAB 4: PLAN & BILLING */}
      {subTab === "plan" && (
        <div className="space-y-6 max-w-4xl">
          {/* Current Month Usage */}
          <div className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-serif font-medium text-[#1A1917] dark:text-[#F5F2EB]">This month</h3>
                <p className="text-xs text-[#8A857D]">Growth plan · renews on the 1st of next month</p>
              </div>
              <span className="font-mono text-xl font-semibold text-[#525B44] dark:text-[#949F83]">
                Unlimited orders
              </span>
            </div>
          </div>

          {/* Plan Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: "starter", name: "Starter", price: "29", seats: 2, perks: ["Up to 2 seats", "Basic fulfilment board", "Daily sales summaries"] },
              { id: "growth", name: "Growth", price: "79", seats: 6, perks: ["Up to 6 seats", "Live fulfilment & Kanban", "Customer messaging", "Full Insights & heatmap"] },
              { id: "scale", name: "Scale", price: "199", seats: 20, perks: ["Up to 20 seats", "Multi-store management", "Priority courier webhooks", "Inventory forecasting engine"] },
            ].map((p) => {
              const isCurrent = currentPlan === p.id;
              return (
                <div
                  key={p.id}
                  className={`rounded-xl p-5 border flex flex-col justify-between transition-all ${
                    isCurrent
                      ? "bg-white dark:bg-[#252625] border-[#525B44] dark:border-[#949F83] shadow-md ring-1 ring-[#525B44]"
                      : "bg-[#FAF8F5] dark:bg-[#1A1B1A] border-[#E6E1D8] dark:border-[#2C2D2B]"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif font-medium text-base text-[#1A1917] dark:text-[#F5F2EB]">{p.name}</h4>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#525B44]/10 text-[#525B44] dark:text-[#949F83]">
                          Current plan
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-mono font-semibold text-[#1A1917] dark:text-[#F5F2EB]">{currencySymbol}{p.price}</span>
                      <span className="text-xs text-[#8A857D]">/ month</span>
                    </div>

                    <ul className="space-y-2 text-xs">
                      {p.perks.map((perk, i) => (
                        <li key={i} className="flex items-center gap-2 text-[#4A4742] dark:text-[#C5C0B6]">
                          <Check className="w-3.5 h-3.5 text-[#525B44] dark:text-[#949F83] shrink-0" />
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={() => {
                        if (!isCurrent) {
                          setCurrentPlan(p.id as any);
                          showToast(`Moved to ${p.name} plan`, "success");
                        }
                      }}
                      disabled={isCurrent}
                      className={`w-full py-2 text-xs font-medium rounded-lg transition-colors ${
                        isCurrent
                          ? "bg-[#F0ECE1] dark:bg-[#333533] text-[#8A857D] cursor-default"
                          : "bg-[#525B44] text-white hover:bg-[#434B37] shadow-xs"
                      }`}
                    >
                      {isCurrent ? "Your plan" : `Move to ${p.name}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Billing Receipts History */}
          <div className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl p-5 shadow-sm space-y-3">
            <div>
              <h3 className="text-base font-serif font-medium text-[#1A1917] dark:text-[#F5F2EB]">Billing history</h3>
              <p className="text-xs text-[#8A857D]">Paid via primary corporate card</p>
            </div>

            <ul className="divide-y divide-[#E6E1D8]/60 dark:divide-[#2C2D2B]/60 text-xs">
              {["October 2026", "September 2026", "August 2026", "July 2026"].map((month, idx) => (
                <li key={idx} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[#1A1917] dark:text-[#F5F2EB]">{month}</p>
                    <p className="text-[11px] text-[#8A857D]">Growth plan · Paid on 1st</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-[#1A1917] dark:text-[#F5F2EB]">
                      {currencySymbol}79.00
                    </span>
                    <button
                      onClick={() => handleDownloadInvoice(month)}
                      className="p-1.5 text-[#8A857D] hover:text-[#1A1917] transition-colors"
                      title="Download receipt"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* TAB 5: APPEARANCE & SYNC */}
      {subTab === "appearance" && (
        <div className="space-y-6 max-w-3xl">
          <div className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-serif font-medium text-[#1A1917] dark:text-[#F5F2EB]">Theme</h3>
              <p className="text-xs text-[#8A857D] dark:text-[#9A958D]">Adjust the interface styling for your device.</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "light", label: "Light", icon: Sun },
                { id: "dark", label: "Dark", icon: Moon },
                { id: "system", label: "Match system", icon: Laptop },
              ].map((th) => {
                const Icon = th.icon;
                const isSelected = themePreference === th.id;
                return (
                  <button
                    key={th.id}
                    onClick={() => {
                      setThemePreference(th.id as any);
                      showToast(`Theme set to ${th.label}`, "info");
                    }}
                    className={`p-4 rounded-xl border text-center transition-all ${
                      isSelected
                        ? "bg-white dark:bg-[#252625] border-[#525B44] dark:border-[#949F83] shadow-sm"
                        : "bg-[#F0ECE1]/50 dark:bg-[#1E1F1E] border-transparent hover:border-[#E6E1D8]"
                    }`}
                  >
                    <Icon className="w-5 h-5 mx-auto mb-2 text-[#525B44] dark:text-[#949F83]" />
                    <span className="text-xs font-medium text-[#1A1917] dark:text-[#F5F2EB] block">{th.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Connected Store Integration Status */}
          <div className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl p-5 shadow-sm space-y-3">
            <div>
              <h3 className="text-base font-serif font-medium text-[#1A1917] dark:text-[#F5F2EB]">Store connection</h3>
              <p className="text-xs text-[#8A857D] dark:text-[#9A958D]">Connected store endpoint for live inventory and orders.</p>
            </div>

            <div className="p-3 bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[#8A857D]">Active Domain:</span>
                <span className="font-mono font-medium text-[#1A1917] dark:text-[#F5F2EB]">{storeDomain || "store.com"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A857D]">Connection Status:</span>
                <span className="text-[#525B44] dark:text-[#949F83] font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#525B44]" />
                  <span>Authenticated & Syncing</span>
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  showToast("Store connection refreshed and cache re-synced", "success");
                }}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#525B44] dark:text-[#949F83] bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg hover:border-[#525B44] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Force re-sync store data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INVITE TEAM MEMBER MODAL */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <form
            onSubmit={handleInviteSubmit}
            className="w-full max-w-md bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-serif font-semibold text-[#1A1917] dark:text-[#F5F2EB]">Invite teammate</h3>
              <button type="button" onClick={() => setInviteModalOpen(false)} className="text-[#8A857D] hover:text-[#1A1917]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#8A857D] dark:text-[#9A958D]">
              They'll receive an email invitation to access your store's admin dashboard.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-[#4A4742] dark:text-[#C5C0B6] block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Elena Rostova"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg text-[#1A1917] dark:text-[#F5F2EB] focus:outline-none focus:border-[#525B44]"
                />
              </div>

              <div>
                <label className="font-medium text-[#4A4742] dark:text-[#C5C0B6] block mb-1">Email address</label>
                <input
                  type="email"
                  required
                  placeholder="elena@domain.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg text-[#1A1917] dark:text-[#F5F2EB] focus:outline-none focus:border-[#525B44]"
                />
              </div>

              <div>
                <label className="font-medium text-[#4A4742] dark:text-[#C5C0B6] block mb-1">Role / Permissions</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg text-[#1A1917] dark:text-[#F5F2EB] focus:outline-none focus:border-[#525B44]"
                >
                  <option value="Staff">Staff (Fulfilment, Stock & Messages)</option>
                  <option value="Admin">Admin (Full store access & Settings)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="px-3.5 py-2 text-xs text-[#8A857D] hover:text-[#1A1917]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium bg-[#525B44] text-white rounded-lg hover:bg-[#434B37]"
              >
                Send invitation
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
