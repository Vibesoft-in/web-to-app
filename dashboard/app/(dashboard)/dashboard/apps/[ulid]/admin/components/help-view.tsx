"use client";

import { useState, useMemo } from "react";
import {
  HelpCircle,
  Search,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  Command,
  Flame,
  ShoppingBag,
  RotateCcw,
  Store,
  CreditCard,
  User,
  ExternalLink,
} from "lucide-react";

interface HelpViewProps {
  userName?: string;
  storeDomain?: string;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

export function HelpView({
  userName = "Noor",
  storeDomain,
  showToast,
}: HelpViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [openFaqIndices, setOpenFaqIndices] = useState<number[]>([0]);

  // Support request form state
  const [reqTopic, setReqTopic] = useState("Orders & fulfilment");
  const [reqSubject, setReqSubject] = useState("");
  const [reqDetails, setReqDetails] = useState("");

  // Tickets history
  const [tickets, setTickets] = useState([
    {
      id: "t-1",
      topic: "Orders & fulfilment",
      subject: "Label thermal printer paper sizing",
      status: "answered",
      time: "2 days ago",
    },
  ]);

  const topics = [
    { id: "orders", icon: ShoppingBag, name: "Orders & fulfilment", desc: "The board, packing slips, refunds" },
    { id: "inventory", icon: Package, name: "Inventory & stock", desc: "Stock queue, batches, reorder points" },
    { id: "club", icon: RotateCcw, name: "Tide Club", desc: "Subscriptions, skips, renewals" },
    { id: "wholesale", icon: Store, name: "Café accounts", desc: "Trade prices, weekly runs, invoices" },
    { id: "money", icon: CreditCard, name: "Payments & payouts", desc: "When money lands, fees, taxes" },
    { id: "account", icon: User, name: "Your account", desc: "Team seats, plans, security" },
  ];

  const faqs = [
    {
      topic: "orders",
      q: "How does an order move through the board?",
      a: "Paid orders wait for fulfillment. Moving an order advances it to Processing; once packed, it moves to Complete. Click the advance button on any card or drag it whenever reality runs ahead of schedule.",
    },
    {
      topic: "orders",
      q: "Can I change a grind after someone has ordered?",
      a: "Yes, until the order is packed. Open the order from the board, note the grind change for production, and message the customer from Messages — the saved reply 'Grind changed' is provided for exactly this.",
    },
    {
      topic: "orders",
      q: "How do refunds work?",
      a: "Open the order drawer and choose Refund. The money returns to the original payment card within 3–5 working days. If bags were returned unopened, tick 'Restock inventory' so units return to available stock.",
    },
    {
      topic: "inventory",
      q: "What does 'Today live' calculate?",
      a: "It aggregates all active customer orders awaiting fulfillment across your connected website catalog.",
    },
    {
      topic: "inventory",
      q: "When does a product count as running low?",
      a: "When the available stock left after fulfilling open orders drops to or below its configured reorder point. The 'Lasts' column divides available units by the last fortnight's daily sales pace.",
    },
    {
      topic: "club",
      q: "A subscriber's renewal failed. What happens next?",
      a: "The customer receives an automated notification to update their payment method. Once updated, the subscription resumes and the box enters the next upcoming dispatch schedule.",
    },
    {
      topic: "club",
      q: "Can club members pause or skip a month?",
      a: "Yes, members can pause or skip anytime before the cut-off date without cancelling their membership. Paused subscribers appear under Customers with a paused badge.",
    },
    {
      topic: "wholesale",
      q: "How are wholesale café orders handled?",
      a: "Café accounts receive trade pricing and bulk packaging options. Wholesale deliveries can be grouped onto specific delivery runs so trade parcels bypass standard courier queues.",
    },
    {
      topic: "money",
      q: "When do card payouts land in our bank?",
      a: "Online card takings settle to your designated business bank account within 2 business days. In-person reader payments settle the following business morning.",
    },
    {
      topic: "account",
      q: "How many teammates can sign in?",
      a: "Starter includes 2 seats, Growth provides 6 seats, and Scale supports up to 20 seats. You can invite colleagues with Admin or Staff access under Settings › Team.",
    },
    {
      topic: "account",
      q: "Can I export order and product history to CSV?",
      a: "Yes! Every primary screen — Orders, Products, Customers, and Insights — includes an 'Export CSV' button to download filtered reports anytime.",
    },
  ];

  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      if (selectedTopic && faq.topic !== selectedTopic) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return faq.q.toLowerCase().includes(q) || faq.a.toLowerCase().includes(q);
      }
      return true;
    });
  }, [faqs, selectedTopic, searchQuery]);

  const toggleFaq = (idx: number) => {
    setOpenFaqIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqSubject.trim() || reqDetails.trim().length < 10) {
      showToast("Please provide a subject and at least a sentence of details", "error");
      return;
    }
    const newTicket = {
      id: `t-${Date.now()}`,
      topic: reqTopic,
      subject: reqSubject.trim(),
      status: "waiting",
      time: "Just now",
    };
    setTickets((prev) => [newTicket, ...prev]);
    setReqSubject("");
    setReqDetails("");
    showToast("Request sent — we’ll reply by email", "success");
  };

  return (
    <div className="space-y-6">
      {/* Sub-Header */}
      <div className="flex items-center justify-between border-b border-[#E6E1D8] dark:border-[#2C2D2B] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#8A857D] dark:text-[#9A958D] mb-1">
            <span>Account</span>
            <span>/</span>
            <span className="text-[#1A1917] dark:text-[#F5F2EB] font-medium">Help</span>
          </div>
          <h1 className="text-2xl font-serif text-[#1A1917] dark:text-[#F5F2EB] tracking-tight">Help & Guides</h1>
        </div>
      </div>

      {/* Hero Search Section */}
      <div className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-sm max-w-3xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-serif text-[#1A1917] dark:text-[#F5F2EB] tracking-tight">
          How can we help, {userName.split(" ")[0]}?
        </h2>
        <p className="text-xs sm:text-sm text-[#8A857D] dark:text-[#9A958D] max-w-md mx-auto">
          Operational answers for running your store — and real merchant support a message away.
        </p>

        <div className="relative max-w-lg mx-auto pt-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A857D]" />
          <input
            type="text"
            placeholder="Search refunds, courier cutoff, stock planning, subscriptions…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl text-[#1A1917] dark:text-[#F5F2EB] placeholder-[#8A857D] focus:outline-none focus:border-[#525B44] shadow-xs"
          />
        </div>
      </div>

      {/* Topic Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {topics.map((t) => {
          const Icon = t.icon;
          const isSelected = selectedTopic === t.id;

          return (
            <button
              key={t.id}
              onClick={() => setSelectedTopic(isSelected ? null : t.id)}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? "bg-white dark:bg-[#252625] border-[#525B44] dark:border-[#949F83] shadow-sm ring-1 ring-[#525B44]"
                  : "bg-[#FAF8F5] dark:bg-[#1A1B1A] border-[#E6E1D8] dark:border-[#2C2D2B] hover:border-[#8A857D]"
              }`}
            >
              <span className="w-8 h-8 rounded-lg bg-[#525B44]/10 text-[#525B44] dark:text-[#949F83] flex items-center justify-center mb-2">
                <Icon className="w-4 h-4" />
              </span>
              <p className="font-serif font-medium text-xs text-[#1A1917] dark:text-[#F5F2EB]">{t.name}</p>
              <p className="text-[10px] text-[#8A857D] dark:text-[#9A958D] mt-0.5 line-clamp-1">{t.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Main Help Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: FAQs (7 cols) */}
        <div className="lg:col-span-7 bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E6E1D8] dark:border-[#2C2D2B] pb-3">
            <h3 className="text-base font-serif font-medium text-[#1A1917] dark:text-[#F5F2EB]">
              {selectedTopic
                ? topics.find((t) => t.id === selectedTopic)?.name
                : searchQuery
                ? `${filteredFaqs.length} answers`
                : "Common questions"}
            </h3>

            {selectedTopic && (
              <button
                onClick={() => setSelectedTopic(null)}
                className="text-xs text-[#525B44] dark:text-[#949F83] hover:underline"
              >
                All topics
              </button>
            )}
          </div>

          <ul className="divide-y divide-[#E6E1D8]/60 dark:divide-[#2C2D2B]/60">
            {filteredFaqs.length === 0 ? (
              <li className="py-8 text-center text-xs text-[#8A857D]">
                No answers found matching “{searchQuery}”. Send us a request below!
              </li>
            ) : (
              filteredFaqs.map((faq, idx) => {
                const isOpen = openFaqIndices.includes(idx);

                return (
                  <li key={idx} className="py-3">
                    <button
                      onClick={() => toggleFaq(idx)}
                      className="w-full flex items-center justify-between gap-3 text-left group"
                    >
                      <span className="text-xs sm:text-sm font-medium text-[#1A1917] dark:text-[#F5F2EB] group-hover:text-[#525B44] dark:group-hover:text-[#949F83] transition-colors">
                        {faq.q}
                      </span>
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[#8A857D] transition-transform duration-200 ${
                          isOpen ? "rotate-45" : ""
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </span>
                    </button>

                    {isOpen && (
                      <p className="text-xs text-[#4A4742] dark:text-[#C5C0B6] leading-relaxed pt-2 pr-6">
                        {faq.a}
                      </p>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>

        {/* Right: Help Side (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Status Card */}
          <div className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl p-4 shadow-sm flex items-center gap-3">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#525B44] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#525B44]" />
            </span>
            <div className="text-xs">
              <p className="font-semibold text-[#1A1917] dark:text-[#F5F2EB]">All systems normal</p>
              <p className="text-[#8A857D] text-[11px]">Storefront, payments and courier links connected</p>
            </div>
          </div>

          {/* Send us a request */}
          <form
            onSubmit={handleSupportSubmit}
            className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl p-5 shadow-sm space-y-3"
          >
            <div>
              <h4 className="text-sm font-serif font-medium text-[#1A1917] dark:text-[#F5F2EB]">Send us a request</h4>
              <p className="text-[11px] text-[#8A857D]">A team member responds within 1 working day.</p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-[#4A4742] dark:text-[#C5C0B6] block mb-1 font-medium">Topic</label>
                <select
                  value={reqTopic}
                  onChange={(e) => setReqTopic(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg text-[#1A1917] dark:text-[#F5F2EB] focus:outline-none focus:border-[#525B44]"
                >
                  {topics.map((t) => (
                    <option key={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[#4A4742] dark:text-[#C5C0B6] block mb-1 font-medium">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="What's going on?"
                  value={reqSubject}
                  onChange={(e) => setReqSubject(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg text-[#1A1917] dark:text-[#F5F2EB] focus:outline-none focus:border-[#525B44]"
                />
              </div>

              <div>
                <label className="text-[#4A4742] dark:text-[#C5C0B6] block mb-1 font-medium">Details</label>
                <textarea
                  rows={3}
                  required
                  placeholder="What happened, and what did you expect?"
                  value={reqDetails}
                  onChange={(e) => setReqDetails(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg text-[#1A1917] dark:text-[#F5F2EB] focus:outline-none focus:border-[#525B44]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-[#525B44] text-white rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 hover:bg-[#434B37] transition-colors shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send request</span>
              </button>
            </div>
          </form>

          {/* Keyboard Shortcuts */}
          <div className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl p-5 shadow-sm space-y-3">
            <h4 className="text-sm font-serif font-medium text-[#1A1917] dark:text-[#F5F2EB]">Keyboard shortcuts</h4>

            <div className="space-y-2 text-xs">
              {[
                { label: "Search everything", keys: ["⌘", "K"] },
                { label: "Go to orders", keys: ["G", "O"] },
                { label: "Go to products", keys: ["G", "P"] },
                { label: "Go to messages", keys: ["G", "M"] },
                { label: "Close modal / drawer", keys: ["Esc"] },
              ].map((sc, i) => (
                <div key={i} className="flex items-center justify-between text-[#4A4742] dark:text-[#C5C0B6]">
                  <span>{sc.label}</span>
                  <div className="flex items-center gap-1">
                    {sc.keys.map((k, kIdx) => (
                      <kbd
                        key={kIdx}
                        className="px-1.5 py-0.5 bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded font-mono text-[10px] text-[#1A1917] dark:text-[#F5F2EB]"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
