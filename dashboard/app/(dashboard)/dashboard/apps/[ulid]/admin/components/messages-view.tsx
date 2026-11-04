"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  MessageSquare,
  Search,
  Star,
  Clock,
  Check,
  RotateCcw,
  Send,
  Sparkles,
  Info,
  ChevronLeft,
  Package,
  ExternalLink,
  User,
  Coffee,
} from "lucide-react";

interface MessagesViewProps {
  rawOrders: any[];
  rawCustomers: any[];
  currencySymbol: string;
  storeDomain: string;
  storeUrl?: string;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  onSelectOrder?: (order: any) => void;
}

export function MessagesView({
  rawOrders,
  rawCustomers,
  currencySymbol,
  storeDomain,
  storeUrl,
  showToast,
  onSelectOrder,
}: MessagesViewProps) {
  const [boxFilter, setBoxFilter] = useState<"open" | "snoozed" | "done">("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [savedRepliesOpen, setSavedRepliesOpen] = useState(false);
  const [showContextOnMobile, setShowContextOnMobile] = useState(false);

  // Template answers from Mavora
  const savedReplies = [
    {
      title: "Tracking update",
      text: "Thanks for checking in! Your parcel left us with the 4 PM courier and the tracking can take a day to wake up. If it hasn't moved by tomorrow evening, I'll chase it for you.",
    },
    {
      title: "Grind changed",
      text: "All sorted — I've changed it to whole bean before dispatch. Enjoy!",
    },
    {
      title: "Club box skipped",
      text: "Done — I've skipped your next delivery box. Nothing is charged until the one after.",
    },
    {
      title: "Wholesale run",
      text: "Happy to add that to Tuesday's run. Tomás will pack it this afternoon so it goes out immediately.",
    },
    {
      title: "Grinder care",
      text: "A squeak at fine settings usually means a little coffee oil on the burr carrier. Brush it out and run a handful of grinder cleaner — if it keeps on, we'll swap the burrs under warranty.",
    },
  ];

  // Dynamically generate conversations from real customer orders
  const initialConvos = useMemo(() => {
    if (!Array.isArray(rawOrders) || rawOrders.length === 0) return [];

    return rawOrders.slice(0, 15).map((order: any, idx: number) => {
      const id = `convo-${order.id}`;
      const customerName = `${order.billing?.first_name || "Customer"} ${order.billing?.last_name || `#${order.id}`}`.trim();
      const email = order.billing?.email || `customer-${order.id}@${storeDomain || "store.com"}`;
      const city = order.billing?.city || "London";
      const state = order.billing?.state || "UK";
      const total = order.total || "28.50";
      const orderNumber = order.number || order.id;

      // Realistic inquiries tied to order context
      const subjects = [
        `Tracking inquiry for order #${orderNumber}`,
        `Grind preference on order #${orderNumber}`,
        `Delivery address confirmation`,
        `Question about delivery dates`,
        `Wholesale invoice request`,
      ];
      const subject = subjects[idx % subjects.length];

      const inquiryMessages = [
        `Hi team, just checking when order #${orderNumber} is scheduled for courier dispatch? Thanks!`,
        `Hello! Could I get whole beans instead of filter grind for order #${orderNumber} if it hasn't been packed yet?`,
        `Hi, please note our front gate code is 4921 for the delivery of order #${orderNumber}.`,
        `Loved our last batch! Has order #${orderNumber} shipped yet?`,
        `Hi, could we get a VAT invoice with our business details for order #${orderNumber}?`,
      ];

      const customerMsg = inquiryMessages[idx % inquiryMessages.length];
      const hasTeamReply = idx % 3 === 0;

      const messages = [
        {
          id: `m-${order.id}-1`,
          from: "customer",
          sender: customerName,
          text: customerMsg,
          time: `${idx * 2 + 1}h ago`,
          at: new Date(Date.now() - (idx * 2 + 1) * 3600000),
        },
      ];

      if (hasTeamReply) {
        messages.push({
          id: `m-${order.id}-2`,
          from: "team",
          sender: "You",
          text: `Hi ${order.billing?.first_name || "there"}! ${savedReplies[idx % savedReplies.length].text}`,
          time: `${idx * 2}h ago`,
          at: new Date(Date.now() - idx * 2 * 3600000),
        });
      }

      return {
        id,
        orderId: order.id,
        orderNumber,
        customerName,
        email,
        city,
        state,
        total,
        subject,
        status: idx === 1 ? "snoozed" : idx === 3 ? "done" : "open",
        starred: idx === 0,
        unread: !hasTeamReply && idx < 4,
        tag: idx % 4 === 0 ? "wholesale" : idx % 3 === 0 ? "subscription" : "order",
        messages,
        order,
      };
    });
  }, [rawOrders, storeDomain]);

  // Working conversation state with additions/updates
  const [convos, setConvos] = useState<any[]>(initialConvos);

  useEffect(() => {
    if (initialConvos.length > 0 && convos.length === 0) {
      setConvos(initialConvos);
    }
  }, [initialConvos]);

  // Set default selected conversation
  useEffect(() => {
    if (!selectedConvoId && convos.length > 0) {
      const firstOpen = convos.find((c) => c.status === boxFilter) || convos[0];
      setSelectedConvoId(firstOpen.id);
    }
  }, [convos, boxFilter, selectedConvoId]);

  // Filtered convos for current folder & search
  const filteredConvos = useMemo(() => {
    return convos.filter((c) => {
      if (c.status !== boxFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = c.customerName.toLowerCase().includes(q);
        const matchesSubject = c.subject.toLowerCase().includes(q);
        const matchesMsg = c.messages.some((m: any) => m.text.toLowerCase().includes(q));
        return matchesName || matchesSubject || matchesMsg;
      }
      return true;
    });
  }, [convos, boxFilter, searchQuery]);

  const activeConvo = useMemo(() => {
    return convos.find((c) => c.id === selectedConvoId) || null;
  }, [convos, selectedConvoId]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConvo?.messages]);

  const handleSendReply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || !activeConvo) return;

    const newMsg = {
      id: `m-reply-${Date.now()}`,
      from: "team",
      sender: "You",
      text: replyText.trim(),
      time: "Just now",
      at: new Date(),
    };

    setConvos((prev) =>
      prev.map((c) =>
        c.id === activeConvo.id
          ? {
              ...c,
              unread: false,
              messages: [...c.messages, newMsg],
            }
          : c
      )
    );

    setReplyText("");
    showToast("Reply sent", "success");
  };

  const handleToggleStar = (convoId: string) => {
    setConvos((prev) =>
      prev.map((c) => (c.id === convoId ? { ...c, starred: !c.starred } : c))
    );
  };

  const handleUpdateStatus = (convoId: string, newStatus: "open" | "snoozed" | "done") => {
    setConvos((prev) =>
      prev.map((c) => (c.id === convoId ? { ...c, status: newStatus } : c))
    );
    showToast(newStatus === "done" ? "Conversation marked done" : newStatus === "snoozed" ? "Conversation snoozed" : "Conversation reopened", "info");
  };

  return (
    <div className="space-y-6">
      {/* Sub-Header */}
      <div className="flex items-center justify-between border-b border-[#E6E1D8] dark:border-[#2C2D2B] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#8A857D] dark:text-[#9A958D] mb-1">
            <span>Grow</span>
            <span>/</span>
            <span className="text-[#1A1917] dark:text-[#F5F2EB] font-medium">Messages</span>
          </div>
          <h1 className="text-2xl font-serif text-[#1A1917] dark:text-[#F5F2EB] tracking-tight">Messages</h1>
        </div>
      </div>

      {/* Main 3-Column Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[720px]">
        {/* COLUMN 1: Conversation List (3.5 cols) */}
        <div className="md:col-span-4 lg:col-span-4 bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl flex flex-col overflow-hidden shadow-sm">
          {/* Top segment & search */}
          <div className="p-3 border-b border-[#E6E1D8] dark:border-[#2C2D2B] space-y-2.5">
            <div className="flex items-center bg-[#F0ECE1] dark:bg-[#252625] p-1 rounded-lg text-xs font-medium">
              {(["open", "snoozed", "done"] as const).map((box) => {
                const count = convos.filter((c) => c.status === box && (box !== "open" || c.unread)).length;
                return (
                  <button
                    key={box}
                    onClick={() => setBoxFilter(box)}
                    className={`flex-1 py-1.5 rounded capitalize transition-all flex items-center justify-center gap-1.5 ${
                      boxFilter === box
                        ? "bg-white dark:bg-[#333533] text-[#1A1917] dark:text-[#F5F2EB] shadow-xs font-semibold"
                        : "text-[#8A857D] hover:text-[#1A1917]"
                    }`}
                  >
                    <span>{box}</span>
                    {count > 0 && (
                      <span className="px-1.5 py-0.2 bg-[#525B44] text-white rounded-full text-[10px]">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A857D]" />
              <input
                type="text"
                placeholder="Search messages…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg text-[#1A1917] dark:text-[#F5F2EB] placeholder-[#8A857D] focus:outline-none focus:border-[#525B44]"
              />
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#E6E1D8]/60 dark:divide-[#2C2D2B]/60">
            {filteredConvos.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8A857D]">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="font-medium text-[#1A1917] dark:text-[#F5F2EB]">Inbox zero</p>
                <p className="mt-1">Every customer has an answer.</p>
              </div>
            ) : (
              filteredConvos.map((convo) => {
                const isSelected = convo.id === selectedConvoId;
                const lastMsg = convo.messages[convo.messages.length - 1];

                return (
                  <div
                    key={convo.id}
                    onClick={() => {
                      setSelectedConvoId(convo.id);
                      if (convo.unread) {
                        setConvos((prev) =>
                          prev.map((c) => (c.id === convo.id ? { ...c, unread: false } : c))
                        );
                      }
                    }}
                    className={`p-3.5 cursor-pointer transition-colors flex items-start gap-3 relative ${
                      isSelected
                        ? "bg-[#F0ECE1] dark:bg-[#252625]"
                        : "hover:bg-[#F0ECE1]/50 dark:hover:bg-[#252625]/50"
                    }`}
                  >
                    {/* Unread indicator dot */}
                    {convo.unread && (
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#525B44]" />
                    )}

                    {/* Avatar initials */}
                    <div className="w-8 h-8 rounded-full bg-[#525B44]/15 text-[#525B44] dark:text-[#949F83] font-semibold text-xs flex items-center justify-center shrink-0">
                      {convo.customerName.charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-xs truncate ${convo.unread ? "font-semibold text-[#1A1917] dark:text-[#F5F2EB]" : "font-medium text-[#4A4742] dark:text-[#C5C0B6]"}`}>
                          {convo.customerName}
                        </span>
                        <span className="text-[10px] text-[#8A857D] shrink-0 font-mono">
                          {lastMsg?.time}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 mb-1">
                        {convo.starred && <Star className="w-3 h-3 fill-[#D97706] text-[#D97706] shrink-0" />}
                        <p className="text-xs text-[#1A1917] dark:text-[#F5F2EB] truncate font-medium">
                          {convo.subject}
                        </p>
                      </div>

                      <p className="text-[11px] text-[#8A857D] dark:text-[#9A958D] truncate">
                        {lastMsg?.from === "team" ? "You: " : ""}
                        {lastMsg?.text}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 2: Message Thread (5.5 cols) */}
        <div className="md:col-span-8 lg:col-span-5 bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl flex flex-col overflow-hidden shadow-sm">
          {activeConvo ? (
            <>
              {/* Thread Header */}
              <div className="p-3.5 border-b border-[#E6E1D8] dark:border-[#2C2D2B] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#525B44]/15 text-[#525B44] dark:text-[#949F83] font-semibold text-xs flex items-center justify-center shrink-0">
                    {activeConvo.customerName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-[#1A1917] dark:text-[#F5F2EB] truncate">
                      {activeConvo.subject}
                    </h3>
                    <p className="text-[11px] text-[#8A857D] dark:text-[#9A958D] flex items-center gap-1.5">
                      <span>{activeConvo.customerName}</span>
                      <span>·</span>
                      <span className="capitalize px-1.5 py-0.2 rounded bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] text-[10px]">
                        {activeConvo.tag}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggleStar(activeConvo.id)}
                    className="p-1.5 text-[#8A857D] hover:text-[#D97706] rounded-lg transition-colors"
                    title={activeConvo.starred ? "Unstar" : "Star"}
                  >
                    <Star className={`w-4 h-4 ${activeConvo.starred ? "fill-[#D97706] text-[#D97706]" : ""}`} />
                  </button>

                  {activeConvo.status === "open" ? (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(activeConvo.id, "snoozed")}
                        className="p-1.5 text-[#8A857D] hover:text-[#1A1917] rounded-lg transition-colors"
                        title="Snooze"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(activeConvo.id, "done")}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#525B44] dark:text-[#949F83] bg-[#525B44]/10 rounded-lg hover:bg-[#525B44]/20 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Done</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus(activeConvo.id, "open")}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#8A857D] bg-[#F0ECE1] dark:bg-[#252625] rounded-lg hover:text-[#1A1917] transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reopen</span>
                    </button>
                  )}

                  {/* Toggle Context Panel for tablet/mobile */}
                  <button
                    onClick={() => setShowContextOnMobile(!showContextOnMobile)}
                    className="lg:hidden p-1.5 text-[#8A857D] hover:text-[#1A1917] rounded-lg"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages Bubble List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex items-center justify-center">
                  <span className="text-[10px] font-mono text-[#8A857D] bg-white dark:bg-[#252625] px-2.5 py-0.5 rounded-full border border-[#E6E1D8] dark:border-[#2C2D2B]">
                    Today
                  </span>
                </div>

                {activeConvo.messages.map((msg: any) => {
                  const isTeam = msg.from === "team";

                  return (
                    <div key={msg.id} className={`flex items-end gap-2.5 ${isTeam ? "justify-end" : "justify-start"}`}>
                      {!isTeam && (
                        <div className="w-7 h-7 rounded-full bg-[#525B44]/15 text-[#525B44] dark:text-[#949F83] font-semibold text-[11px] flex items-center justify-center shrink-0">
                          {activeConvo.customerName.charAt(0)}
                        </div>
                      )}

                      <div
                        className={`max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed space-y-1 shadow-xs ${
                          isTeam
                            ? "bg-[#525B44] text-white rounded-br-xs"
                            : "bg-white dark:bg-[#252625] text-[#1A1917] dark:text-[#F5F2EB] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-bl-xs"
                        }`}
                      >
                        <p>{msg.text}</p>
                        <span className={`block text-[10px] text-right font-mono ${isTeam ? "text-white/70" : "text-[#8A857D]"}`}>
                          {msg.sender} · {msg.time}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Composer */}
              <form onSubmit={handleSendReply} className="p-3 bg-white dark:bg-[#252625] border-t border-[#E6E1D8] dark:border-[#2C2D2B] space-y-2">
                <textarea
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                  placeholder={`Reply to ${activeConvo.customerName.split(" ")[0]}…`}
                  className="w-full text-xs p-2.5 bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg text-[#1A1917] dark:text-[#F5F2EB] placeholder-[#8A857D] focus:outline-none focus:border-[#525B44] resize-none"
                />

                <div className="flex items-center justify-between gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setSavedRepliesOpen(!savedRepliesOpen)}
                      className="flex items-center gap-1.5 px-2 py-1 text-xs text-[#8A857D] hover:text-[#1A1917] rounded hover:bg-[#F0ECE1] dark:hover:bg-[#333533] transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#525B44] dark:text-[#949F83]" />
                      <span>Saved replies</span>
                    </button>

                    {/* Saved replies popup */}
                    {savedRepliesOpen && (
                      <div className="absolute bottom-8 left-0 w-64 bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl shadow-xl p-1 z-30 space-y-0.5">
                        {savedReplies.map((r, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setReplyText(r.text);
                              setSavedRepliesOpen(false);
                            }}
                            className="w-full text-left px-2.5 py-1.5 text-xs text-[#4A4742] dark:text-[#C5C0B6] hover:bg-[#F0ECE1] dark:hover:bg-[#333533] rounded-lg transition-colors"
                          >
                            <p className="font-medium text-[#1A1917] dark:text-[#F5F2EB]">{r.title}</p>
                            <p className="text-[10px] text-[#8A857D] truncate">{r.text}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline text-[10px] text-[#8A857D]">⏎ send · ⇧⏎ newline</span>
                    <button
                      type="submit"
                      disabled={!replyText.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#525B44] text-white rounded-lg hover:bg-[#434B37] disabled:opacity-50 transition-colors shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  </div>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-[#8A857D]">
              <MessageSquare className="w-10 h-10 opacity-30 mb-2" />
              <p className="font-medium text-[#1A1917] dark:text-[#F5F2EB]">Pick a conversation</p>
              <p className="mt-1">Choose one from the inbox to read and reply.</p>
            </div>
          )}
        </div>

        {/* COLUMN 3: Context Panel (3 cols) */}
        <div className={`lg:col-span-3 space-y-4 ${showContextOnMobile ? "block" : "hidden lg:block"}`}>
          {activeConvo ? (
            <>
              {/* Customer summary */}
              <div className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#525B44]/15 text-[#525B44] dark:text-[#949F83] font-semibold text-sm flex items-center justify-center shrink-0">
                    {activeConvo.customerName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-[#1A1917] dark:text-[#F5F2EB] truncate">
                      {activeConvo.customerName}
                    </h4>
                    <p className="text-xs text-[#8A857D] truncate">{activeConvo.email}</p>
                    <p className="text-[11px] text-[#8A857D]">{activeConvo.city}, {activeConvo.state}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E6E1D8] dark:border-[#2C2D2B] flex items-center justify-between text-xs">
                  <span className="text-[#8A857D]">Customer status</span>
                  <span className="font-medium text-[#525B44] dark:text-[#949F83] capitalize">
                    {activeConvo.tag === "wholesale" ? "Wholesale Café" : "Direct Consumer"}
                  </span>
                </div>
              </div>

              {/* Connected Order */}
              {activeConvo.order && (
                <div
                  onClick={() => onSelectOrder && onSelectOrder(activeConvo.order)}
                  className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] hover:border-[#525B44] rounded-xl p-4 shadow-sm space-y-2.5 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-serif font-medium text-[#1A1917] dark:text-[#F5F2EB]">
                      The order
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#8A857D] group-hover:text-[#525B44]" />
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-sm font-semibold text-[#1A1917] dark:text-[#F5F2EB]">
                      #{activeConvo.orderNumber}
                    </span>
                    <span className="font-mono text-xs font-medium text-[#525B44] dark:text-[#949F83]">
                      {currencySymbol}{parseFloat(activeConvo.total).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-[#8A857D]">
                    <span className="capitalize px-1.5 py-0.2 rounded bg-white dark:bg-[#252625] border border-[#E6E1D8] text-[10px]">
                      {activeConvo.order.status || "processing"}
                    </span>
                    <span>·</span>
                    <span>{activeConvo.order.line_items?.length || 2} items</span>
                  </div>
                </div>
              )}

              {/* Store VIP Club / Membership */}
              <div className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl p-4 shadow-sm space-y-2">
                <div className="flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-[#525B44]" />
                  <h4 className="text-xs font-serif font-medium text-[#1A1917] dark:text-[#F5F2EB]">
                    Coffee Subscription
                  </h4>
                </div>
                <p className="text-xs text-[#4A4742] dark:text-[#C5C0B6]">
                  <b>Active</b> · 2 bags a month
                </p>
                <p className="text-[11px] text-[#8A857D]">
                  Next delivery scheduled for courier dispatch on the 1st
                </p>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
