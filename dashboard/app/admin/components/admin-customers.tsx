"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Eye,
  ArrowRightLeft,
  Mail,
  Shield,
  Phone,
  Building2,
  Smartphone,
  CreditCard,
  X,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Download,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Receipt,
  Package,
  Layers,
  History,
  FileText,
  BadgeCheck,
  Globe,
  Tag,
  DollarSign,
  Send,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  PackagePlus,
  Play,
  Check,
  FileCode,
  Cpu,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { PlanPricingCard } from "./plan-pricing-card";

export interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  tenantId: number;
  tenantName: string;
  storeUrl?: string;
  healthScore: "Healthy" | "Needs Attention" | "At Risk" | "Inactive";
  healthScoreValue: number; // 0 - 100
  segment:
    | "Free"
    | "Paid"
    | "Enterprise"
    | "High-Revenue"
    | "Multiple Apps"
    | "Inactive (30d)"
    | "Failed Builds"
    | "Upcoming Renewal";
  ltv: number; // in INR
  appsCount: number;
  joinedDate: string;
  verified: boolean;
  avatarColor: string;
  isBlocked?: boolean;
  blockedReason?: string;
  blockedAt?: string;
}

export interface CustomerDetailData {
  plan: {
    name: string;
    tier: string;
    price: string;
    billingCycle: "Annual" | "Monthly" | "Lifetime";
    status: "Active" | "Expiring Soon" | "Expired" | "Trial";
    startDate: string;
    expireDate: string;
    daysLeft: number;
    autoRenew: boolean;
    paymentMethod: string;
    lastPaymentDate: string;
  };
  invoices: Array<{
    invoiceId: string;
    date: string;
    description: string;
    amount: number;
    orderId: string;
    gateway: string;
    status: "Paid" | "Settled" | "Pending" | "Refunded";
  }>;
  addons: Array<{
    id: string;
    name: string;
    appName: string;
    price: number;
    purchasedDate: string;
    status: "Active" | "Configured";
    licenseKey: string;
  }>;
  apps: Array<{
    id: string;
    name: string;
    package: string;
    platform: string;
    version: string;
    status: "Live" | "Building" | "In Development" | "Build Failed";
    lastBuildDate: string;
    downloadsCount: number;
  }>;
  history: Array<{
    id: string;
    event: string;
    detail: string;
    timestamp: string;
    actor: string;
    severity?: "info" | "success" | "warning" | "danger";
  }>;
}

const CUSTOMERS_DATA: CustomerRecord[] = [
  {
    id: "usr_101",
    name: "Sanskriti Mishra",
    email: "sanskriti123@gmail.com",
    phone: "+91 9528109040",
    tenantId: 2,
    tenantName: "Sanskriti Store Global",
    storeUrl: "https://sanskritistore.com",
    healthScore: "At Risk",
    healthScoreValue: 48,
    segment: "Failed Builds",
    ltv: 14999,
    appsCount: 1,
    joinedDate: "Nov 14, 2026",
    verified: true,
    avatarColor: "bg-rose-600",
  },
  {
    id: "usr_102",
    name: "Rahul Sharma",
    email: "rahul.sharma@fashionhub.in",
    phone: "+91 9822334455",
    tenantId: 4,
    tenantName: "Fashion Hub India",
    storeUrl: "https://fashionhub.in",
    healthScore: "Healthy",
    healthScoreValue: 94,
    segment: "High-Revenue",
    ltv: 42997,
    appsCount: 3,
    joinedDate: "Oct 22, 2026",
    verified: true,
    avatarColor: "bg-indigo-600",
  },
  {
    id: "usr_103",
    name: "Megha Bahukhandi",
    email: "meghabahukhandi@gmail.com",
    phone: "+91 9811223344",
    tenantId: 3,
    tenantName: "Megha Boutique",
    storeUrl: "https://meghaboutique.shop",
    healthScore: "Needs Attention",
    healthScoreValue: 62,
    segment: "Upcoming Renewal",
    ltv: 7999,
    appsCount: 1,
    joinedDate: "Nov 02, 2026",
    verified: false,
    avatarColor: "bg-amber-600",
  },
  {
    id: "usr_104",
    name: "Vikram Malhotra",
    email: "vikram@malhotratextiles.com",
    phone: "+91 9988776655",
    tenantId: 5,
    tenantName: "Malhotra Luxury Silks",
    storeUrl: "https://malhotratextiles.com",
    healthScore: "Healthy",
    healthScoreValue: 98,
    segment: "Enterprise",
    ltv: 59996,
    appsCount: 4,
    joinedDate: "Sep 15, 2026",
    verified: true,
    avatarColor: "bg-purple-600",
  },
  {
    id: "usr_105",
    name: "Pooja Varma",
    email: "pooja.varma@organicbliss.co",
    phone: "+91 9123456789",
    tenantId: 6,
    tenantName: "Organic Bliss Care",
    storeUrl: "https://organicbliss.co",
    healthScore: "Inactive",
    healthScoreValue: 22,
    segment: "Inactive (30d)",
    ltv: 0,
    appsCount: 0,
    joinedDate: "Oct 01, 2026",
    verified: true,
    avatarColor: "bg-slate-500",
  },
  {
    id: "usr_106",
    name: "Anand Rathi",
    email: "anand.rathi@urbanstreet.in",
    phone: "+91 9711002233",
    tenantId: 7,
    tenantName: "Urban Street Footwear",
    storeUrl: "https://urbanstreet.in",
    healthScore: "Healthy",
    healthScoreValue: 88,
    segment: "Paid",
    ltv: 7999,
    appsCount: 1,
    joinedDate: "Nov 08, 2026",
    verified: true,
    avatarColor: "bg-emerald-600",
  },
  {
    id: "usr_107",
    name: "Deepak Choudhary",
    email: "deepak@choudharycrafts.com",
    phone: "+91 9411223344",
    tenantId: 8,
    tenantName: "Handicrafts Emporium",
    storeUrl: "https://choudharycrafts.com",
    healthScore: "Needs Attention",
    healthScoreValue: 65,
    segment: "Free",
    ltv: 0,
    appsCount: 1,
    joinedDate: "Nov 12, 2026",
    verified: true,
    avatarColor: "bg-sky-600",
  },
];

const SEGMENT_CHART_DATA = [
  { name: "Paid Customers", count: 418, color: "#4F46E5" },
  { name: "Free Customers", count: 680, color: "#94A3B8" },
  { name: "Enterprise Pro", count: 85, color: "#1E1B4B" },
  { name: "High-Revenue", count: 65, color: "#10B981" },
];

// Helper to provide detailed mock information for each customer
function getCustomerDetailData(cust: CustomerRecord): CustomerDetailData {
  switch (cust.id) {
    case "usr_101":
      return {
        plan: {
          name: "Pro Combo",
          tier: "Pro Combo",
          price: "₹8,999",
          billingCycle: "Lifetime",
          status: "Active",
          startDate: "Nov 14, 2026",
          expireDate: "Perpetual (No Expiration)",
          daysLeft: 999,
          autoRenew: false,
          paymentMethod: "Razorpay (UPI / HDFC Bank)",
          lastPaymentDate: "Nov 14, 2026",
        },
        invoices: [
          {
            invoiceId: "INV-2026-0881",
            date: "Nov 14, 2026",
            description: "Pro Combo Lifetime License Purchase",
            amount: 14999,
            orderId: "order_PW9812481",
            gateway: "Razorpay",
            status: "Paid",
          },
        ],
        addons: [
          {
            id: "addon_101",
            name: "Apple iOS IPA Package",
            appName: "Sanskriti Luxe App",
            price: 2999,
            purchasedDate: "Nov 15, 2026",
            status: "Configured",
            licenseKey: "W2A-IOS-849102",
          },
          {
            id: "addon_102",
            name: "Dedicated Cloud Build Server",
            appName: "Sanskriti Luxe App",
            price: 1999,
            purchasedDate: "Nov 16, 2026",
            status: "Active",
            licenseKey: "W2A-BLD-992144",
          },
        ],
        apps: [
          {
            id: "app_201",
            name: "Sanskriti Luxe App",
            package: "com.sanskriti.store",
            platform: "WooCommerce REST API v3",
            version: "v1.0.4",
            status: "Build Failed",
            lastBuildDate: "Nov 19, 2026 01:10 PM",
            downloadsCount: 14,
          },
        ],
        history: [
          {
            id: "h_1",
            event: "Build #104 Failed",
            detail: "Keystore signature mismatch in release variant execution",
            timestamp: "Today at 01:12 PM",
            actor: "Build Automation",
            severity: "danger",
          },
          {
            id: "h_2",
            event: "Build Runner Triggered",
            detail: "Android APK build task dispatched to Dedicated Cloud Runner",
            timestamp: "Today at 01:10 PM",
            actor: "Customer (Sanskriti Mishra)",
            severity: "info",
          },
          {
            id: "h_3",
            event: "Add-on Purchased",
            detail: "Dedicated Cloud Build Server (₹1,999) activated",
            timestamp: "Nov 16, 2026 05:20 PM",
            actor: "Razorpay Webhook",
            severity: "success",
          },
          {
            id: "h_4",
            event: "Add-on Purchased",
            detail: "Apple iOS IPA Package (₹2,999) added to tenant #2",
            timestamp: "Nov 15, 2026 11:45 AM",
            actor: "Razorpay Webhook",
            severity: "success",
          },
          {
            id: "h_5",
            event: "Annual Subscription Activated",
            detail: "Growth Fashion Tier subscribed for ₹14,999 via Razorpay UPI",
            timestamp: "Nov 14, 2026 10:15 AM",
            actor: "Payment Gateway",
            severity: "success",
          },
        ],
      };

    case "usr_102":
      return {
        plan: {
          name: "Growth Fashion Tier",
          tier: "Growth",
          price: "₹14,999 / year",
          billingCycle: "Annual",
          status: "Active",
          startDate: "Oct 22, 2026",
          expireDate: "Oct 22, 2027",
          daysLeft: 337,
          autoRenew: true,
          paymentMethod: "Razorpay (Credit Card)",
          lastPaymentDate: "Oct 22, 2026",
        },
        invoices: [
          {
            invoiceId: "INV-2026-0610",
            date: "Oct 22, 2026",
            description: "Growth Fashion Annual Tier",
            amount: 14999,
            orderId: "order_PW7712049",
            gateway: "Razorpay",
            status: "Paid",
          },
          {
            invoiceId: "INV-2026-0622",
            date: "Oct 25, 2026",
            description: "Push Notifications Pro + iOS App Bundle",
            amount: 3998,
            orderId: "order_PW7890124",
            gateway: "Razorpay",
            status: "Paid",
          },
          {
            invoiceId: "INV-2026-0714",
            date: "Nov 05, 2026",
            description: "White-label Branding Removal Pack",
            amount: 24000,
            orderId: "order_PW8129481",
            gateway: "Razorpay",
            status: "Paid",
          },
        ],
        addons: [
          {
            id: "addon_201",
            name: "Apple iOS App Store Bundle",
            appName: "Fashion Hub Mobile",
            price: 2999,
            purchasedDate: "Oct 25, 2026",
            status: "Active",
            licenseKey: "W2A-IOS-449102",
          },
          {
            id: "addon_202",
            name: "Push Notifications Pro (FCM Unlimited)",
            appName: "Fashion Hub Mobile",
            price: 999,
            purchasedDate: "Oct 25, 2026",
            status: "Active",
            licenseKey: "W2A-FCM-109283",
          },
          {
            id: "addon_203",
            name: "White-label Branding Removal",
            appName: "Fashion Hub Mobile",
            price: 9999,
            purchasedDate: "Nov 05, 2026",
            status: "Active",
            licenseKey: "W2A-WLB-901824",
          },
        ],
        apps: [
          {
            id: "app_101",
            name: "Fashion Hub Mobile",
            package: "com.fashionhub.app",
            platform: "WooCommerce REST API v3",
            version: "v2.1.0",
            status: "Live",
            lastBuildDate: "Nov 18, 2026 04:30 PM",
            downloadsCount: 1420,
          },
          {
            id: "app_102",
            name: "Fashion Hub Men",
            package: "com.fashionhub.men",
            platform: "WooCommerce REST API v3",
            version: "v1.4.0",
            status: "Live",
            lastBuildDate: "Nov 12, 2026 02:15 PM",
            downloadsCount: 680,
          },
          {
            id: "app_103",
            name: "Fashion Hub Clearance",
            package: "com.fashionhub.outlet",
            platform: "Shopify Storefront API",
            version: "v1.0.1",
            status: "In Development",
            lastBuildDate: "Nov 02, 2026 11:00 AM",
            downloadsCount: 35,
          },
        ],
        history: [
          {
            id: "h_21",
            event: "New APK & AAB Generated",
            detail: "Production release build v2.1.0 signed successfully",
            timestamp: "Yesterday at 04:36 PM",
            actor: "Build Automation",
            severity: "success",
          },
          {
            id: "h_22",
            event: "White-label Addon Configured",
            detail: "Powered by WebIntoApp banner removed from all 3 apps",
            timestamp: "Nov 05, 2026 06:14 PM",
            actor: "Super Admin",
            severity: "info",
          },
          {
            id: "h_23",
            event: "Push Notification Broadcast",
            detail: "Dispatched promotional alert to 1,420 registered mobile devices",
            timestamp: "Nov 01, 2026 08:00 PM",
            actor: "Rahul Sharma",
            severity: "info",
          },
        ],
      };

    case "usr_103":
      return {
        plan: {
          name: "Starter Tier",
          tier: "Starter",
          price: "₹7,999 / year",
          billingCycle: "Annual",
          status: "Expiring Soon",
          startDate: "Nov 02, 2025",
          expireDate: "Nov 30, 2026",
          daysLeft: 11,
          autoRenew: false,
          paymentMethod: "Razorpay (NetBanking)",
          lastPaymentDate: "Nov 02, 2025",
        },
        invoices: [
          {
            invoiceId: "INV-2025-0914",
            date: "Nov 02, 2025",
            description: "Starter Tier Annual License",
            amount: 7999,
            orderId: "order_PW3391024",
            gateway: "Razorpay",
            status: "Paid",
          },
        ],
        addons: [],
        apps: [
          {
            id: "app_301",
            name: "Megha Boutique",
            package: "com.meghaboutique.shop",
            platform: "Shopify Storefront",
            version: "v1.0.2",
            status: "Live",
            lastBuildDate: "Nov 05, 2026 10:20 AM",
            downloadsCount: 310,
          },
        ],
        history: [
          {
            id: "h_31",
            event: "Renewal Alert Sent",
            detail: "Subscription expiration reminder dispatched via email and WhatsApp",
            timestamp: "Today at 09:00 AM",
            actor: "Billing Automation",
            severity: "warning",
          },
          {
            id: "h_32",
            event: "App Manifest Updated",
            detail: "Splash banner and primary theme updated",
            timestamp: "Nov 05, 2026 10:15 AM",
            actor: "Megha Bahukhandi",
            severity: "info",
          },
        ],
      };

    case "usr_104":
      return {
        plan: {
          name: "Enterprise Pro Suite",
          tier: "Enterprise",
          price: "₹59,996 / year",
          billingCycle: "Annual",
          status: "Active",
          startDate: "Sep 15, 2026",
          expireDate: "Sep 15, 2027",
          daysLeft: 300,
          autoRenew: true,
          paymentMethod: "Corporate Wire / Razorpay Corporate",
          lastPaymentDate: "Sep 15, 2026",
        },
        invoices: [
          {
            invoiceId: "INV-2026-0410",
            date: "Sep 15, 2026",
            description: "Enterprise Pro Suite (Multi-Store License)",
            amount: 59996,
            orderId: "order_PW5519284",
            gateway: "Razorpay Corporate",
            status: "Paid",
          },
        ],
        addons: [
          {
            id: "addon_401",
            name: "Enterprise Dedicated Cloud Runner",
            appName: "All 4 Stores",
            price: 12000,
            purchasedDate: "Sep 15, 2026",
            status: "Active",
            licenseKey: "W2A-ENT-901824",
          },
          {
            id: "addon_402",
            name: "Biometric Authentication Suite",
            appName: "Malhotra Luxury Silks",
            price: 4999,
            purchasedDate: "Sep 16, 2026",
            status: "Active",
            licenseKey: "W2A-BIO-449102",
          },
        ],
        apps: [
          {
            id: "app_401",
            name: "Malhotra Luxury Silks",
            package: "com.malhotra.luxury",
            platform: "Custom REST API",
            version: "v3.2.0",
            status: "Live",
            lastBuildDate: "Nov 10, 2026 03:00 PM",
            downloadsCount: 5400,
          },
          {
            id: "app_402",
            name: "Malhotra Bridal Wear",
            package: "com.malhotra.bridal",
            platform: "WooCommerce REST API v3",
            version: "v2.0.1",
            status: "Live",
            lastBuildDate: "Nov 08, 2026 12:45 PM",
            downloadsCount: 2900,
          },
          {
            id: "app_403",
            name: "Malhotra Fabrics Wholesale",
            package: "com.malhotra.wholesale",
            platform: "Custom ERP Sync",
            version: "v1.5.0",
            status: "Live",
            lastBuildDate: "Oct 28, 2026 06:10 PM",
            downloadsCount: 1100,
          },
          {
            id: "app_404",
            name: "Malhotra International",
            package: "com.malhotra.global",
            platform: "Shopify Storefront",
            version: "v1.0.0",
            status: "Live",
            lastBuildDate: "Oct 15, 2026 11:30 AM",
            downloadsCount: 890,
          },
        ],
        history: [
          {
            id: "h_41",
            event: "Enterprise SLA Check",
            detail: "Zero downtime reported across 4 applications, 99.98% API uptime",
            timestamp: "Today at 08:00 AM",
            actor: "System Sentinel",
            severity: "success",
          },
          {
            id: "h_42",
            event: "App v3.2.0 Published",
            detail: "Google Play Store automated deployment completed",
            timestamp: "Nov 10, 2026 03:15 PM",
            actor: "Super Admin",
            severity: "success",
          },
        ],
      };

    default:
      return {
        plan: {
          name: "Starter Tier",
          tier: "Starter",
          price: "Free Trial",
          billingCycle: "Monthly",
          status: "Trial",
          startDate: cust.joinedDate,
          expireDate: "Dec 31, 2026",
          daysLeft: 42,
          autoRenew: false,
          paymentMethod: "None on file",
          lastPaymentDate: "N/A",
        },
        invoices: [],
        addons: [],
        apps: [],
        history: [
          {
            id: "h_def_1",
            event: "Account Created",
            detail: `Customer ${cust.name} joined platform under Tenant #${cust.tenantId}`,
            timestamp: cust.joinedDate,
            actor: "Registration System",
            severity: "info",
          },
        ],
      };
  }
}

export function AdminCustomers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHealth, setSelectedHealth] = useState<string>("all");
  const [selectedSegment, setSelectedSegment] = useState<string>("all");

  // Selected customer for full-page detail view
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [detailTab, setDetailTab] = useState<"plan" | "billing" | "addons" | "apps" | "history">("plan");

  // Sensitive action state
  const [impersonateTarget, setImpersonateTarget] = useState<CustomerRecord | null>(null);

  // Live overrides for Plan, Blocked status, and Audit History
  const [customerPlanOverrides, setCustomerPlanOverrides] = useState<Record<string, CustomerDetailData["plan"]>>({});
  const [customerBlockedOverrides, setCustomerBlockedOverrides] = useState<Record<string, { isBlocked: boolean; reason?: string }>>({});
  const [customerHistoryOverrides, setCustomerHistoryOverrides] = useState<Record<string, any[]>>({});

  // Block Customer Modal State
  const [blockModalTarget, setBlockModalTarget] = useState<CustomerRecord | null>(null);
  const [blockReason, setBlockReason] = useState<string>("Account suspended by Super Administrator");
  const [isSubmittingBlock, setIsSubmittingBlock] = useState<boolean>(false);

  // Revoke Subscription Modal State
  const [revokeModalTarget, setRevokeModalTarget] = useState<CustomerRecord | null>(null);
  const [revokeReason, setRevokeReason] = useState<string>("Subscription revoked by Super Administrator");
  const [isSubmittingRevoke, setIsSubmittingRevoke] = useState<boolean>(false);

  const handleOpenBlockModal = (customer: CustomerRecord) => {
    setBlockModalTarget(customer);
    setBlockReason("Account suspended by Super Administrator");
  };

  const handleConfirmBlock = async () => {
    if (!blockModalTarget) return;
    setIsSubmittingBlock(true);

    const targetNumericId = blockModalTarget.id.replace("usr_", "");
    try {
      await fetch(`/api/admin/users/${targetNumericId}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: blockReason }),
      });
    } catch {}

    setCustomerBlockedOverrides((prev) => ({
      ...prev,
      [blockModalTarget.id]: { isBlocked: true, reason: blockReason },
    }));

    const newHistoryItem = {
      id: "h_blk_" + Date.now(),
      event: "Account & Email Blocked",
      detail: `Customer email (${blockModalTarget.email}) suspended by Super Admin. Future sign-in attempts will be rejected and automated security alert emails will be dispatched. Reason: ${blockReason}`,
      timestamp: "Just now",
      actor: "Super Admin",
      severity: "danger",
    };
    setCustomerHistoryOverrides((prev) => ({
      ...prev,
      [blockModalTarget.id]: [newHistoryItem, ...(prev[blockModalTarget.id] || [])],
    }));

    setIsSubmittingBlock(false);
    setBlockModalTarget(null);
  };

  const handleUnblockCustomer = async (customer: CustomerRecord) => {
    if (!confirm(`Are you sure you want to unblock ${customer.name} (${customer.email})?`)) return;

    const targetNumericId = customer.id.replace("usr_", "");
    try {
      await fetch(`/api/admin/users/${targetNumericId}/unblock`, {
        method: "POST",
      });
    } catch {}

    setCustomerBlockedOverrides((prev) => ({
      ...prev,
      [customer.id]: { isBlocked: false },
    }));

    const newHistoryItem = {
      id: "h_unblk_" + Date.now(),
      event: "Account Unblocked",
      detail: `Customer email (${customer.email}) unblocked by Super Admin. Full sign-in and platform access restored.`,
      timestamp: "Just now",
      actor: "Super Admin",
      severity: "success",
    };
    setCustomerHistoryOverrides((prev) => ({
      ...prev,
      [customer.id]: [newHistoryItem, ...(prev[customer.id] || [])],
    }));
  };

  const handleOpenRevokeSubscriptionModal = (customer: CustomerRecord) => {
    setRevokeModalTarget(customer);
    setRevokeReason("Subscription revoked by Super Administrator");
  };

  const handleConfirmRevokeSubscription = async () => {
    if (!revokeModalTarget) return;
    setIsSubmittingRevoke(true);

    const targetNumericId = revokeModalTarget.id.replace("usr_", "");
    try {
      await fetch(`/api/admin/users/${targetNumericId}/revoke-subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: revokeReason }),
      });
    } catch {}

    setCustomerPlanOverrides((prev) => ({
      ...prev,
      [revokeModalTarget.id]: {
        name: "Free Tier (Revoked by Admin)",
        tier: "Free",
        price: "₹0",
        billingCycle: "Monthly",
        status: "Expired",
        startDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        expireDate: "Revoked Immediately",
        daysLeft: 0,
        autoRenew: false,
        paymentMethod: "Revoked by Super Administrator",
        lastPaymentDate: "N/A",
      },
    }));

    const newHistoryItem = {
      id: "h_rev_" + Date.now(),
      event: "Subscription Revoked",
      detail: `Super Admin revoked active subscription and paid license entitlements even though remaining time was present. Reason: ${revokeReason}. Reverted to Free tier.`,
      timestamp: "Just now",
      actor: "Super Admin",
      severity: "danger",
    };
    setCustomerHistoryOverrides((prev) => ({
      ...prev,
      [revokeModalTarget.id]: [newHistoryItem, ...(prev[revokeModalTarget.id] || [])],
    }));

    setIsSubmittingRevoke(false);
    setRevokeModalTarget(null);
  };

  // Email composer modal state
  const [emailTarget, setEmailTarget] = useState<CustomerRecord | null>(null);
  const [emailForm, setEmailForm] = useState({
    from: "support@webintoapp.com",
    subject: "",
    template: "custom",
    body: "",
    isHighPriority: false,
    sendCopy: true,
  });
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccessMessage, setEmailSuccessMessage] = useState<string | null>(null);

  const handleOpenEmailModal = (customer: CustomerRecord) => {
    setEmailTarget(customer);
    setEmailForm({
      from: "support@webintoapp.com",
      subject: `[WebIntoApp] Direct update for ${customer.name}`,
      template: "custom",
      body: `Hello ${customer.name},\n\nWe are reaching out regarding your account and mobile application services under ${customer.tenantName}.\n\nPlease let us know if you have any questions or require dedicated technical support.\n\nBest regards,\nSuper Admin Team\nWebIntoApp Platform`,
      isHighPriority: false,
      sendCopy: true,
    });
    setEmailSuccessMessage(null);
  };

  const handleTemplateChange = (tpl: string) => {
    if (!emailTarget) return;
    let newSubject = "";
    let newBody = "";

    switch (tpl) {
      case "build_update":
        newSubject = `[Build Status] Mobile app compilation update for ${emailTarget.tenantName}`;
        newBody = `Hi ${emailTarget.name},\n\nWe wanted to share a status update regarding the mobile application builds for your account (${emailTarget.tenantName}).\n\nOur automated runners have finished verifying your assets. You can log into your portal at your convenience to download your Android APK/AAB or review the build artifacts.\n\nBest regards,\nBuild & Engineering Team\nWebIntoApp`;
        break;
      case "renewal":
        newSubject = `[Subscription Notice] Account status & renewal for ${emailTarget.tenantName}`;
        newBody = `Hi ${emailTarget.name},\n\nThis is a friendly notification regarding your active subscription plan for ${emailTarget.tenantName}.\n\nPlease review your billing dashboard to ensure uninterrupted app updates, push notification delivery, and automated store deployments.\n\nBest regards,\nBilling & Accounts Team\nWebIntoApp`;
        break;
      case "health_check":
        newSubject = `[Account Health] Priority assistance for ${emailTarget.name}`;
        newBody = `Hello ${emailTarget.name},\n\nOur system sentinel noticed a health alert on your tenant account (${emailTarget.tenantName}). We are here to help resolve any configuration or store publish challenges you may be experiencing.\n\nPlease reply directly to this message or reply with convenient times for a support check-in.\n\nWarm regards,\nSuper Admin Support\nWebIntoApp`;
        break;
      default:
        newSubject = `[WebIntoApp] Direct update for ${emailTarget.name}`;
        newBody = `Hello ${emailTarget.name},\n\nWe are reaching out regarding your account and mobile application services under ${emailTarget.tenantName}.\n\nPlease let us know if you have any questions or require dedicated technical support.\n\nBest regards,\nSuper Admin Team\nWebIntoApp Platform`;
        break;
    }

    setEmailForm((prev) => ({
      ...prev,
      template: tpl,
      subject: newSubject,
      body: newBody,
    }));
  };

  const handleSendEmail = () => {
    if (!emailForm.subject.trim() || !emailForm.body.trim()) {
      alert("Please enter both a subject and an email body.");
      return;
    }
    setIsSendingEmail(true);
    setTimeout(() => {
      setIsSendingEmail(false);
      setEmailSuccessMessage(`Email successfully dispatched to ${emailTarget?.email}`);
      setTimeout(() => {
        setEmailSuccessMessage(null);
        setEmailTarget(null);
      }, 1500);
    }, 700);
  };

  // Customer add-ons state (allows Super Admin to assign/revoke add-ons dynamically)
  const [customerAddonsOverrides, setCustomerAddonsOverrides] = useState<
    Record<
      string,
      Array<{
        id: string;
        name: string;
        appName: string;
        price: number;
        status: string;
        licenseKey: string;
      }>
    >
  >({});

  // Assign Add-on modal state
  const [isAssignAddonOpen, setIsAssignAddonOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    addonName: "Apple iOS IPA Package & Signing",
    price: 2999,
    appName: "All Connected Apps",
    status: "Configured",
    licenseKey: "W2A-IOS-849102",
    isFreeOverride: false,
    notes: "Assigned by Super Administrator",
  });

  const PLATFORM_MARKETPLACE_ADDONS = [
    { name: "Apple iOS IPA Package & Signing", price: 2999, defaultKey: "W2A-IOS" },
    { name: "Dedicated Cloud Build Server", price: 1999, defaultKey: "W2A-BLD" },
    { name: "White-label Branding Removal", price: 9999, defaultKey: "W2A-WHT" },
    { name: "Push Notifications Pro (FCM)", price: 999, defaultKey: "W2A-PSH" },
    { name: "WhatsApp Order Updates Sync", price: 1499, defaultKey: "W2A-WAP" },
    { name: "Biometric Authentication Suite", price: 2499, defaultKey: "W2A-BIO" },
    { name: "Automated Google Play Store Publisher", price: 2999, defaultKey: "W2A-PLY" },
    { name: "Offline Local Storage & Cache", price: 999, defaultKey: "W2A-OFL" },
    { name: "Custom Domain & SSL Mapping", price: 1299, defaultKey: "W2A-SSL" },
  ];

  const handleOpenAssignAddon = (cust: CustomerRecord, linkedApps: Array<{ name: string }>) => {
    const defaultApp = linkedApps.length > 0 ? linkedApps[0].name : "All Connected Apps";
    const initialAddon = PLATFORM_MARKETPLACE_ADDONS[0];
    setAssignForm({
      addonName: initialAddon.name,
      price: initialAddon.price,
      appName: defaultApp,
      status: "Configured",
      licenseKey: `${initialAddon.defaultKey}-${Math.floor(100000 + Math.random() * 900000)}`,
      isFreeOverride: false,
      notes: "Assigned by Super Administrator",
    });
    setIsAssignAddonOpen(true);
  };

  const handleSelectAddonName = (name: string) => {
    const match = PLATFORM_MARKETPLACE_ADDONS.find((a) => a.name === name);
    if (match) {
      setAssignForm((prev) => ({
        ...prev,
        addonName: match.name,
        price: match.price,
        licenseKey: `${match.defaultKey}-${Math.floor(100000 + Math.random() * 900000)}`,
      }));
    }
  };

  const handleAssignAddonConfirm = (customerId: string, defaultAddons: CustomerDetailData["addons"]) => {
    const currentList = customerAddonsOverrides[customerId] ?? defaultAddons;
    const newAddonItem = {
      id: "addon_" + Date.now(),
      name: assignForm.addonName,
      appName: assignForm.appName,
      price: assignForm.isFreeOverride ? 0 : Number(assignForm.price) || 0,
      status: assignForm.status,
      licenseKey: assignForm.licenseKey.trim() || `W2A-LIC-${Math.floor(100000 + Math.random() * 900000)}`,
    };

    setCustomerAddonsOverrides((prev) => ({
      ...prev,
      [customerId]: [newAddonItem, ...currentList],
    }));

    setIsAssignAddonOpen(false);
  };

  const handleRevokeAddon = (customerId: string, addonId: string, defaultAddons: CustomerDetailData["addons"]) => {
    if (!confirm("Are you sure you want to revoke this add-on from this customer?")) return;
    const currentList = customerAddonsOverrides[customerId] ?? defaultAddons;
    setCustomerAddonsOverrides((prev) => ({
      ...prev,
      [customerId]: currentList.filter((a) => a.id !== addonId),
    }));
  };

  // Customer apps state (allows Super Admin to trigger builds and track compiled outputs)
  const [customerAppsOverrides, setCustomerAppsOverrides] = useState<
    Record<
      string,
      Array<{
        id: string;
        name: string;
        package: string;
        platform: string;
        version: string;
        status: "Live" | "Building" | "In Development" | "Build Failed";
        lastBuildDate: string;
        downloadsCount: number;
      }>
    >
  >({});

  // App build modal state
  const [buildModalApp, setBuildModalApp] = useState<{
    id: string;
    name: string;
    package: string;
    platform: string;
    version: string;
    status: "Live" | "Building" | "In Development" | "Build Failed";
    lastBuildDate: string;
    downloadsCount: number;
  } | null>(null);

  const [buildTargetFormat, setBuildTargetFormat] = useState<"apk" | "aab" | "ipa">("apk");
  const [buildRunner, setBuildRunner] = useState<string>("runner_01");
  const [isBuildingApp, setIsBuildingApp] = useState(false);
  const [buildProgressStep, setBuildProgressStep] = useState<number>(0);
  const [buildCompletedApp, setBuildCompletedApp] = useState<boolean>(false);

  // App download modal state
  const [downloadModalApp, setDownloadModalApp] = useState<{
    id: string;
    name: string;
    package: string;
    platform: string;
    version: string;
    status: "Live" | "Building" | "In Development" | "Build Failed";
    lastBuildDate: string;
    downloadsCount: number;
  } | null>(null);

  const triggerFileDownload = (fileName: string, content: string = "WebIntoApp Mobile Build Package Binary") => {
    const blob = new Blob([content], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenBuildModal = (app: any) => {
    setBuildModalApp(app);
    setBuildTargetFormat("apk");
    setBuildRunner("runner_01");
    setIsBuildingApp(false);
    setBuildProgressStep(0);
    setBuildCompletedApp(false);
  };

  const handleStartCloudBuild = (customerId: string, defaultApps: CustomerDetailData["apps"]) => {
    if (!buildModalApp) return;
    setIsBuildingApp(true);
    setBuildProgressStep(1);

    setTimeout(() => {
      setBuildProgressStep(2);
    }, 600);

    setTimeout(() => {
      setBuildProgressStep(3);
    }, 1200);

    setTimeout(() => {
      setBuildProgressStep(4);
      setIsBuildingApp(false);
      setBuildCompletedApp(true);

      // Increment version patch e.g. v2.1.0 -> v2.1.1
      const parts = buildModalApp.version.replace("v", "").split(".");
      const newVersion = parts.length === 3
        ? `v${parts[0]}.${parts[1]}.${Number(parts[2]) + 1}`
        : `${buildModalApp.version}.1`;

      const currentList = customerAppsOverrides[customerId] ?? defaultApps;
      const updatedList = currentList.map((a) =>
        a.id === buildModalApp.id
          ? {
              ...a,
              version: newVersion,
              status: "Live" as const,
              lastBuildDate: "Just now",
              downloadsCount: a.downloadsCount + 1,
            }
          : a
      );

      setCustomerAppsOverrides((prev) => ({
        ...prev,
        [customerId]: updatedList,
      }));

      // Automatically dispatch Build Ready notification email via Brevo to customer
      if (selectedCustomer?.email) {
        try {
          fetch("http://127.0.0.1:8000/api/test/email/build-success", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: selectedCustomer.email,
              app_name: buildModalApp.name,
            }),
          }).catch(() => {});
        } catch {}
      }
    }, 1900);
  };

  const filteredCustomers = useMemo(() => {
    return CUSTOMERS_DATA.filter((c) => {
      if (selectedHealth !== "all" && c.healthScore !== selectedHealth) return false;
      if (selectedSegment !== "all" && c.segment !== selectedSegment) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.tenantName.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q))
      );
    });
  }, [searchQuery, selectedHealth, selectedSegment]);

  const getHealthBadge = (health: string, score: number) => {
    switch (health) {
      case "Healthy":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Healthy ({score}%)
          </span>
        );
      case "Needs Attention":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Needs Attention ({score}%)
          </span>
        );
      case "At Risk":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            At Risk ({score}%)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Inactive ({score}%)
          </span>
        );
    }
  };

  const renderEmailModal = () => {
    if (!emailTarget) return null;

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
        <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 flex flex-col max-h-[84vh] sm:max-h-[86vh] overflow-hidden my-auto animate-in zoom-in-95">
          {/* Modal Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Send Email to Customer</h3>
                <span className="text-[11px] text-slate-500">
                  To: <strong className="text-slate-800 font-semibold">{emailTarget.name}</strong> &lt;{emailTarget.email}&gt;
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                if (!isSendingEmail) setEmailTarget(null);
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              disabled={isSendingEmail}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-5 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-3.5 flex-1 text-xs">
            {emailSuccessMessage ? (
              <div className="py-8 px-4 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-slate-900">Email Dispatched Successfully!</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">{emailSuccessMessage}</p>
              </div>
            ) : (
              <>
                {/* Sender & Template Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">From Address</label>
                    <select
                      value={emailForm.from}
                      onChange={(e) => setEmailForm({ ...emailForm, from: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                    >
                      <option value="support@webintoapp.com">Support &lt;support@webintoapp.com&gt;</option>
                      <option value="billing@webintoapp.com">Billing &lt;billing@webintoapp.com&gt;</option>
                      <option value="engineering@webintoapp.com">Engineering &lt;engineering@webintoapp.com&gt;</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Quick Template</label>
                    <select
                      value={emailForm.template}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                    >
                      <option value="custom">Custom Message</option>
                      <option value="build_update">Mobile Build &amp; Deployment Status</option>
                      <option value="renewal">Subscription &amp; Renewal Reminder</option>
                      <option value="health_check">Account Health &amp; Support Advisory</option>
                    </select>
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Subject</label>
                  <input
                    type="text"
                    value={emailForm.subject}
                    onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                    placeholder="e.g. Important update regarding your application"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* Body Textarea */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">Message Content</label>
                    <span className="text-[10px] text-slate-400">Recipient will receive standard HTML/text email</span>
                  </div>
                  <textarea
                    rows={6}
                    value={emailForm.body}
                    onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                    placeholder="Type your message to the customer..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 font-sans min-h-[140px] leading-relaxed resize-y"
                  />
                </div>

                {/* Options */}
                <div className="pt-2 space-y-2 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailForm.isHighPriority}
                      onChange={(e) => setEmailForm({ ...emailForm, isHighPriority: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-xs text-slate-700 font-medium">Flag as high-priority notification</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailForm.sendCopy}
                      onChange={(e) => setEmailForm({ ...emailForm, sendCopy: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-xs text-slate-700 font-medium">
                      Archive copy to Super Admin mailbox (admin@webintoapp.com)
                    </span>
                  </label>
                </div>
              </>
            )}
          </div>

          {/* Modal Footer */}
          {!emailSuccessMessage && (
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2 flex-shrink-0 bg-slate-50/90">
              <button
                type="button"
                onClick={() => setEmailTarget(null)}
                disabled={isSendingEmail}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={isSendingEmail}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-60"
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Email</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBlockModal = () => {
    if (!blockModalTarget) return null;

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-rose-200 flex flex-col overflow-hidden my-auto animate-in zoom-in-95">
          <div className="p-5 border-b border-rose-100 bg-rose-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <Shield className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Block Customer &amp; Email</h3>
                <p className="text-[11px] text-slate-500 font-mono">{blockModalTarget.email}</p>
              </div>
            </div>
            <button
              onClick={() => setBlockModalTarget(null)}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 leading-relaxed space-y-1.5">
              <strong className="block font-bold">Security &amp; Access Policy:</strong>
              <p>
                Blocking this email address will immediately revoke active sessions. If this user attempts to log in or register with this email, the login will be rejected and an automated security email notification will be dispatched to <strong>{blockModalTarget.email}</strong>.
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Administrative Reason
              </label>
              <textarea
                rows={3}
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="e.g. Terms violation, fraudulent chargeback, security risk..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setBlockModalTarget(null)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmittingBlock}
              onClick={handleConfirmBlock}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmittingBlock ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Blocking...</span>
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5" />
                  <span>Block Email &amp; Suspend Access</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderRevokeModal = () => {
    if (!revokeModalTarget) return null;
    const currentPlan = customerPlanOverrides[revokeModalTarget.id] ?? getCustomerDetailData(revokeModalTarget).plan;

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-rose-200 flex flex-col overflow-hidden my-auto animate-in zoom-in-95">
          <div className="p-5 border-b border-rose-100 bg-rose-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <XCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Revoke / Remove Subscription</h3>
                <p className="text-[11px] text-slate-500">{revokeModalTarget.name} ({revokeModalTarget.tenantName})</p>
              </div>
            </div>
            <button
              onClick={() => setRevokeModalTarget(null)}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 leading-relaxed space-y-1.5">
              <strong className="block font-bold">Administrative Plan Revocation:</strong>
              <p>
                You are about to revoke <strong>{currentPlan.name}</strong> ({currentPlan.tier} Tier, {currentPlan.daysLeft} days remaining / {currentPlan.billingCycle} License).
              </p>
              <p className="text-[11px] text-amber-800">
                This will immediately terminate all paid plan entitlements, disable APK/AAB build artifact downloads, and revert all customer applications to the standard Free tier even though time remains.
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Revocation Reason (Logged &amp; Sent to Customer)
              </label>
              <textarea
                rows={3}
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="e.g. Account audit, requested termination, policy breach..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setRevokeModalTarget(null)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmittingRevoke}
              onClick={handleConfirmRevokeSubscription}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmittingRevoke ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Revoking...</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Revoke Subscription Immediately</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // FULL PAGE CUSTOMER DETAIL VIEW (Triggered by "View Details")
  // ═══════════════════════════════════════════════════════════════════════
  if (selectedCustomer) {
    const baseDetails = getCustomerDetailData(selectedCustomer);
    const plan = customerPlanOverrides[selectedCustomer.id] ?? baseDetails.plan;
    const isCustomerBlocked = customerBlockedOverrides[selectedCustomer.id]?.isBlocked ?? selectedCustomer.isBlocked ?? false;
    const blockedReason = customerBlockedOverrides[selectedCustomer.id]?.reason ?? selectedCustomer.blockedReason;
    const history = [
      ...(customerHistoryOverrides[selectedCustomer.id] || []),
      ...baseDetails.history,
    ];
    const details = {
      ...baseDetails,
      plan,
      history,
    };
    const customerAddons = customerAddonsOverrides[selectedCustomer.id] ?? details.addons;
    const customerApps = customerAppsOverrides[selectedCustomer.id] ?? details.apps;

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* ── TOP BREADCRUMB & BACK NAVIGATION ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedCustomer(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
              <span>Back to Customers</span>
            </button>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
              Tenant #{selectedCustomer.tenantId} • {selectedCustomer.tenantName}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Block / Unblock Action Button */}
            {isCustomerBlocked ? (
              <button
                type="button"
                onClick={() => handleUnblockCustomer(selectedCustomer)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition shadow-2xs cursor-pointer"
                title={`Unblock ${selectedCustomer.email}`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Unblock Account</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenBlockModal(selectedCustomer)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition shadow-2xs cursor-pointer"
                title={`Block ${selectedCustomer.email}`}
              >
                <Shield className="w-3.5 h-3.5 text-rose-600" />
                <span>Block Email</span>
              </button>
            )}

            <button
              onClick={() => setImpersonateTarget(selectedCustomer)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition shadow-2xs cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
              <span>Impersonate Tenant</span>
            </button>
            <button
              onClick={() => handleOpenEmailModal(selectedCustomer)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition shadow-2xs cursor-pointer"
              title={`Send email to ${selectedCustomer.email}`}
            >
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>Email</span>
            </button>
            <button
              onClick={() => {
                setDetailTab("addons");
                handleOpenAssignAddon(selectedCustomer, details.apps);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition shadow-2xs cursor-pointer"
              title="Assign an add-on to this customer"
            >
              <PackagePlus className="w-3.5 h-3.5 text-indigo-600" />
              <span>Assign Add-on</span>
            </button>
          </div>
        </div>

        {/* ── BLOCKED ACCOUNT BANNER ── */}
        {isCustomerBlocked && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0 font-bold">
                <Shield className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <strong className="block text-xs font-bold text-rose-900 uppercase tracking-wide">
                  Account &amp; Email Suspended by Super Administrator
                </strong>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  Sign-in attempts with <strong>{selectedCustomer.email}</strong> will be rejected and an automated notification will be sent to their email. {blockedReason ? `(Reason: ${blockedReason})` : ""}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleUnblockCustomer(selectedCustomer)}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer flex-shrink-0 shadow-2xs"
            >
              Unblock Account
            </button>
          </div>
        )}

        {/* ── CUSTOMER PROFILE HEADER CARD ── */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div
                className={`w-14 h-14 rounded-2xl ${selectedCustomer.avatarColor} text-white font-black text-xl flex items-center justify-center shadow-md flex-shrink-0`}
              >
                {selectedCustomer.name.charAt(0)}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {selectedCustomer.name}
                  </h1>
                  {selectedCustomer.verified && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Verified
                    </span>
                  )}
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {selectedCustomer.segment}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1.5 font-medium">
                  <button
                    onClick={() => handleOpenEmailModal(selectedCustomer)}
                    className="flex items-center gap-1 font-mono hover:text-indigo-600 transition cursor-pointer"
                    title={`Send email to ${selectedCustomer.email}`}
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedCustomer.email}</span>
                  </button>
                  {selectedCustomer.phone && (
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {selectedCustomer.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {selectedCustomer.tenantName} (Tenant #{selectedCustomer.tenantId})
                  </span>
                  {selectedCustomer.storeUrl && (
                    <a
                      href={selectedCustomer.storeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>{selectedCustomer.storeUrl.replace("https://", "")}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Health Score Pill */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Account Health
              </span>
              <div>{getHealthBadge(selectedCustomer.healthScore, selectedCustomer.healthScoreValue)}</div>
            </div>
          </div>
        </div>

        {/* ── 4 KEY TELEMETRY CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Active Subscription
              </span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                {details.plan.tier || details.plan.name}
              </span>
            </div>
            <PlanPricingCard
              tier={details.plan.tier || details.plan.name}
              variant="telemetry"
              className="mt-1"
            />
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Plan Expiration
            </span>
            <div className="text-lg font-black text-slate-900 mt-1">
              {details.plan.expireDate}
            </div>
            <span
              className={`text-xs font-bold ${
                details.plan.daysLeft < 30 ? "text-amber-600" : "text-slate-500"
              }`}
            >
              {details.plan.daysLeft} days remaining
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Customer LTV
            </span>
            <div className="text-lg font-black text-indigo-700 mt-1">
              ₹{selectedCustomer.ltv.toLocaleString()}
            </div>
            <span className="text-xs text-slate-400">
              {details.invoices.length} invoices settled
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Apps &amp; Add-ons
            </span>
            <div className="text-lg font-black text-slate-900 mt-1">
              {customerApps.length} Apps • {customerAddons.length} Add-ons
            </div>
            <span className="text-xs text-slate-400">
              Joined {selectedCustomer.joinedDate}
            </span>
          </div>
        </div>

        {/* ── DETAIL TABS NAVIGATION ── */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 overflow-x-auto">
          <button
            onClick={() => setDetailTab("plan")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              detailTab === "plan"
                ? "bg-white text-indigo-700 shadow-2xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Plan &amp; Expiry</span>
          </button>
          <button
            onClick={() => setDetailTab("billing")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              detailTab === "billing"
                ? "bg-white text-indigo-700 shadow-2xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Billing &amp; Invoices ({details.invoices.length})</span>
          </button>
          <button
            onClick={() => setDetailTab("addons")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              detailTab === "addons"
                ? "bg-white text-indigo-700 shadow-2xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Purchased Add-ons ({customerAddons.length})</span>
          </button>
          <button
            onClick={() => setDetailTab("apps")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              detailTab === "apps"
                ? "bg-white text-indigo-700 shadow-2xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile Apps ({customerApps.length})</span>
          </button>
          <button
            onClick={() => setDetailTab("history")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              detailTab === "history"
                ? "bg-white text-indigo-700 shadow-2xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit History ({details.history.length})</span>
          </button>
        </div>

        {/* ── TAB CONTENT ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6">
          {/* TAB 1: PLAN & EXPIRY DETAILS */}
          {detailTab === "plan" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Active Subscription Plan &amp; Expiry Information
                  </h3>
                  <p className="text-xs text-slate-500">
                    Full entitlement, validity cycle, renewal settings, and payment details
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    details.plan.status === "Active"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : details.plan.status === "Expiring Soon"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {details.plan.status}
                </span>
              </div>

              {/* Full Featured Plan Pricing Box matching screenshot */}
              <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Current Entitled Plan Tier
                    </span>
                    <h4 className="text-lg font-black text-slate-900 mt-0.5">{details.plan.name}</h4>
                  </div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 w-fit">
                    {details.plan.tier || "Growth"} Tier
                  </span>
                </div>

                <div className="mt-4 max-w-sm">
                  <PlanPricingCard tier={details.plan.tier || details.plan.name} variant="card" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <span className="text-xs font-black uppercase text-slate-500 tracking-wider block">
                    Plan Specifications &amp; Billing
                  </span>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Plan Tier:</span>
                    <strong className="text-slate-900">{details.plan.name}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Price &amp; Cadence:</span>
                    <strong className="text-slate-900">{details.plan.price}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Billing Cycle:</span>
                    <strong className="text-slate-900">{details.plan.billingCycle}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Auto-Renewal:</span>
                    <span
                      className={`font-bold ${
                        details.plan.autoRenew ? "text-emerald-600" : "text-slate-500"
                      }`}
                    >
                      {details.plan.autoRenew ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <span className="text-xs font-black uppercase text-slate-500 tracking-wider block">
                    Validity &amp; Expiration
                  </span>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Subscription Started:</span>
                    <strong className="text-slate-900">{details.plan.startDate}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Expiration Date:</span>
                    <strong className="text-indigo-700 font-bold">
                      {details.plan.expireDate}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Days Remaining:</span>
                    <strong className="text-slate-900">
                      {details.plan.daysLeft} days
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Payment Method:</span>
                    <strong className="text-slate-900">
                      {details.plan.paymentMethod}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Alert if expiring soon */}
              {details.plan.daysLeft < 30 && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-amber-800 font-medium">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>
                      This customer's plan expires in {details.plan.daysLeft} days. An automated renewal notice has been queued.
                    </span>
                  </div>
                  <button
                    onClick={() => alert(`Renewal reminder dispatched to ${selectedCustomer.email}`)}
                    className="px-3 py-1 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 whitespace-nowrap"
                  >
                    Send Renewal Notice
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BILLING & INVOICES */}
          {detailTab === "billing" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Billing &amp; Invoice History
                  </h3>
                  <p className="text-xs text-slate-500">
                    All transactions, invoices, and payment gateway receipts
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-700 font-mono">
                  Total Spent: ₹{selectedCustomer.ltv.toLocaleString()}
                </span>
              </div>

              {details.invoices.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No billing invoices on record for this customer.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-2.5">Invoice #</th>
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5">Description</th>
                        <th className="px-4 py-2.5">Amount</th>
                        <th className="px-4 py-2.5">Gateway Order</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5 text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {details.invoices.map((inv) => (
                        <tr key={inv.invoiceId} className="hover:bg-slate-50/60 transition">
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">
                            {inv.invoiceId}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{inv.date}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {inv.description}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">
                            ₹{inv.amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                            {inv.orderId} ({inv.gateway})
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => alert(`Downloading Invoice ${inv.invoiceId}`)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                            >
                              <Download className="w-3 h-3" />
                              <span>PDF</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PURCHASED ADD-ONS */}
          {detailTab === "addons" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Purchased Add-on Features
                  </h3>
                  <p className="text-xs text-slate-500">
                    Activated platform capabilities, licenses, and store add-ons
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">
                    {customerAddons.length} Active Add-ons
                  </span>
                  <button
                    onClick={() => handleOpenAssignAddon(selectedCustomer, details.apps)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Assign Add-on</span>
                  </button>
                </div>
              </div>

              {customerAddons.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs space-y-3">
                  <p>No add-on packages purchased or assigned yet for this tenant.</p>
                  <button
                    onClick={() => handleOpenAssignAddon(selectedCustomer, details.apps)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Assign First Add-on</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {customerAddons.map((ad) => (
                    <div
                      key={ad.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3 hover:border-slate-300 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-indigo-600" />
                            {ad.name}
                          </h4>
                          <span className="text-[11px] text-slate-500 mt-0.5 block">
                            Assigned to: <strong className="text-slate-700 font-semibold">{ad.appName}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {ad.status}
                          </span>
                          <button
                            onClick={() => handleRevokeAddon(selectedCustomer.id, ad.id, details.addons)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Revoke Add-on from Customer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200/60 font-mono">
                        <span className="text-slate-400">Key: {ad.licenseKey}</span>
                        <strong className="text-slate-900 font-sans">
                          {ad.price === 0 ? (
                            <span className="text-emerald-600 font-bold">Complimentary (Free)</span>
                          ) : (
                            `₹${ad.price.toLocaleString()}`
                          )}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MOBILE APPLICATIONS */}
          {detailTab === "apps" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Linked Mobile Applications
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configured builds, packages, and connected eCommerce store backends
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-700">
                  {customerApps.length} Total Apps
                </span>
              </div>

              {customerApps.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No mobile applications configured yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-2.5">App Name</th>
                        <th className="px-4 py-2.5">Package ID</th>
                        <th className="px-4 py-2.5">Platform Backend</th>
                        <th className="px-4 py-2.5">Version</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5">Last Build</th>
                        <th className="px-4 py-2.5 text-right">Downloads</th>
                        <th className="px-4 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customerApps.map((app) => (
                        <tr key={app.id} className="hover:bg-slate-50/60 transition">
                          <td className="px-4 py-3 font-bold text-slate-900">
                            {app.name}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                            {app.package}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{app.platform}</td>
                          <td className="px-4 py-3 font-mono text-slate-600 text-[11px]">
                            {app.version}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                app.status === "Live"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : app.status === "Build Failed"
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-indigo-50 text-indigo-700"
                              }`}
                            >
                              {app.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-[11px]">
                            {app.lastBuildDate}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                            {app.downloadsCount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenBuildModal(app)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200 transition cursor-pointer"
                                title="Trigger cloud build for this app"
                              >
                                <Play className="w-3 h-3 fill-indigo-600 text-indigo-600" />
                                <span>Build</span>
                              </button>
                              <button
                                onClick={() => setDownloadModalApp(app)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-200 transition cursor-pointer"
                                title="Download APK / AAB binaries"
                              >
                                <Download className="w-3 h-3" />
                                <span>Download</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: AUDIT & ACTIVITY HISTORY */}
          {detailTab === "history" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Customer Audit &amp; Event History
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chronological activity log, build triggers, and billing events
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {details.history.map((h) => (
                  <div key={h.id} className="py-3.5 flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">
                          {h.event}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">
                          by {h.actor}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{h.detail}</p>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap">
                      {h.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── EMAIL COMPOSER MODAL ── */}
        {renderEmailModal()}

        {/* ── BLOCK CUSTOMER MODAL ── */}
        {renderBlockModal()}

        {/* ── REVOKE SUBSCRIPTION MODAL ── */}
        {renderRevokeModal()}

        {/* ── ASSIGN ADD-ON MODAL ── */}
        {isAssignAddonOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] sm:max-h-[94vh] overflow-hidden my-auto animate-in zoom-in-95">
              {/* Header */}
              <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                    <PackagePlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Assign Platform Add-on</h3>
                    <span className="text-[11px] text-slate-500">
                      Target: <strong className="text-slate-800 font-semibold">{selectedCustomer.name}</strong> (Tenant #{selectedCustomer.tenantId})
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsAssignAddonOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-4 py-3 sm:px-5 sm:py-3.5 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-2.5 flex-1 text-xs">
                {/* Select Add-on */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-0.5 text-[11px]">Select Marketplace Add-on</label>
                  <select
                    value={assignForm.addonName}
                    onChange={(e) => handleSelectAddonName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 font-medium"
                  >
                    {PLATFORM_MARKETPLACE_ADDONS.map((addon) => (
                      <option key={addon.name} value={addon.name}>
                        {addon.name} — ₹{addon.price.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Application */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-0.5 text-[11px]">Assign to Application</label>
                  <select
                    value={assignForm.appName}
                    onChange={(e) => setAssignForm({ ...assignForm, appName: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                  >
                    <option value="All Connected Apps">All Connected Apps</option>
                    {customerApps.map((app) => (
                      <option key={app.id} value={app.name}>
                        {app.name} ({app.platform})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Billing / Fee Override */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-0.5 text-[11px]">Billing Amount (₹)</label>
                    <input
                      type="number"
                      value={assignForm.isFreeOverride ? 0 : assignForm.price}
                      disabled={assignForm.isFreeOverride}
                      onChange={(e) => setAssignForm({ ...assignForm, price: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-0.5 text-[11px]">Activation Status</label>
                    <select
                      value={assignForm.status}
                      onChange={(e) => setAssignForm({ ...assignForm, status: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                    >
                      <option value="Configured">Configured</option>
                      <option value="Active">Active</option>
                      <option value="Pending Setup">Pending Setup</option>
                    </select>
                  </div>
                </div>

                {/* Free entitlement override checkbox */}
                <div className="pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assignForm.isFreeOverride}
                      onChange={(e) => setAssignForm({ ...assignForm, isFreeOverride: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-xs text-slate-700 font-medium">
                      Complimentary Grant (₹0 / 100% Admin Exemption)
                    </span>
                  </label>
                </div>

                {/* License Key */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-0.5 text-[11px]">Generated License Key</label>
                  <input
                    type="text"
                    value={assignForm.licenseKey}
                    onChange={(e) => setAssignForm({ ...assignForm, licenseKey: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono focus:outline-hidden"
                  />
                </div>

                {/* Admin Notes */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-0.5 text-[11px]">Admin Audit Note</label>
                  <input
                    type="text"
                    value={assignForm.notes}
                    onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                    placeholder="e.g. Granted for VIP client renewal"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2 flex-shrink-0 bg-slate-50/90">
                <button
                  type="button"
                  onClick={() => setIsAssignAddonOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleAssignAddonConfirm(selectedCustomer.id, details.addons)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  <span>Assign to Customer</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TRIGGER CLOUD BUILD MODAL ── */}
        {buildModalApp && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 flex flex-col max-h-[84vh] sm:max-h-[86vh] overflow-hidden my-auto animate-in zoom-in-95">
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                    <Play className="w-4 h-4 fill-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Trigger Cloud App Build</h3>
                    <span className="text-[11px] text-slate-500">
                      App: <strong className="text-slate-800 font-semibold">{buildModalApp.name}</strong> • Current Version: <span className="font-mono text-indigo-600">{buildModalApp.version}</span>
                    </span>
                  </div>
                </div>
                {!isBuildingApp && (
                  <button
                    onClick={() => setBuildModalApp(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="p-4 sm:p-5 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-4 flex-1 text-xs">
                {/* App Summary Card */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="font-medium text-slate-500">Package Identifier:</span>
                    <span className="font-mono text-slate-800 font-semibold">{buildModalApp.package}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="font-medium text-slate-500">Connected Store Backend:</span>
                    <span className="text-slate-800 font-semibold">{buildModalApp.platform}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="font-medium text-slate-500">Target Tenant:</span>
                    <span className="text-slate-800 font-semibold">{selectedCustomer.tenantName} (#{selectedCustomer.tenantId})</span>
                  </div>
                </div>

                {/* Target Package Format */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1.5">Select Build Output Format</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={isBuildingApp}
                      onClick={() => setBuildTargetFormat("apk")}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        buildTargetFormat === "apk"
                          ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-1 ring-indigo-600"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>Android APK</span>
                        {buildTargetFormat === "apk" && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Direct device sideloading</span>
                    </button>

                    <button
                      type="button"
                      disabled={isBuildingApp}
                      onClick={() => setBuildTargetFormat("aab")}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        buildTargetFormat === "aab"
                          ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-1 ring-indigo-600"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>Play AAB</span>
                        {buildTargetFormat === "aab" && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Google Play Console upload</span>
                    </button>

                    <button
                      type="button"
                      disabled={isBuildingApp}
                      onClick={() => setBuildTargetFormat("ipa")}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        buildTargetFormat === "ipa"
                          ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-1 ring-indigo-600"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>Apple iOS IPA</span>
                        {buildTargetFormat === "ipa" && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">TestFlight / Enterprise</span>
                    </button>
                  </div>
                </div>

                {/* Cloud Build Runner Engine */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Dedicated Cloud Build Runner</label>
                  <select
                    value={buildRunner}
                    disabled={isBuildingApp}
                    onChange={(e) => setBuildRunner(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden font-medium"
                  >
                    <option value="runner_01">Google Cloud Build Standard (4 vCPU, 16GB RAM) • Priority Queue</option>
                    <option value="runner_02">Dedicated High-Performance Farm Runner (8 vCPU, 32GB RAM)</option>
                    <option value="runner_03">AWS CodeBuild Fast-Track • Enterprise Pool</option>
                  </select>
                </div>

                {/* Active Build Status Progression */}
                {isBuildingApp && (
                  <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200 space-y-2.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-indigo-900 flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                        Compilation in Progress...
                      </span>
                      <span className="font-mono text-xs font-bold text-indigo-700">
                        {buildProgressStep === 1 && "25%"}
                        {buildProgressStep === 2 && "55%"}
                        {buildProgressStep === 3 && "80%"}
                        {buildProgressStep === 4 && "100%"}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-indigo-200/60 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                        style={{
                          width:
                            buildProgressStep === 1
                              ? "25%"
                              : buildProgressStep === 2
                              ? "55%"
                              : buildProgressStep === 3
                              ? "80%"
                              : "100%",
                        }}
                      />
                    </div>

                    {/* Build step text */}
                    <div className="text-[11px] font-mono text-indigo-700">
                      {buildProgressStep === 1 && "• Step 1/4: Initializing cloud container and resolving Gradle dependencies..."}
                      {buildProgressStep === 2 && "• Step 2/4: Compiling Web2App native shell & bundling web assets..."}
                      {buildProgressStep === 3 && "• Step 3/4: Code signing with customer keystore & running ProGuard/R8..."}
                      {buildProgressStep === 4 && "• Step 4/4: Generating binary package & uploading to artifact registry..."}
                    </div>
                  </div>
                )}

                {/* Build Completed Success View */}
                {buildCompletedApp && !isBuildingApp && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2.5 animate-in fade-in">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Cloud Build Succeeded &amp; Package Compiled!</span>
                    </div>
                    <p className="text-[11px] text-emerald-700">
                      App version incremented to <strong className="font-mono text-emerald-900">v{buildModalApp.version.replace("v","")}.1</strong>. The release package has been generated and is ready for download.
                    </p>
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          triggerFileDownload(
                            `${buildModalApp.package}-release-${buildModalApp.version}.${buildTargetFormat}`
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download {buildTargetFormat.toUpperCase()} ({buildModalApp.package})</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2 flex-shrink-0 bg-slate-50/90">
                <button
                  type="button"
                  disabled={isBuildingApp}
                  onClick={() => setBuildModalApp(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                >
                  {buildCompletedApp ? "Close" : "Cancel"}
                </button>
                {!buildCompletedApp && (
                  <button
                    type="button"
                    disabled={isBuildingApp}
                    onClick={() => handleStartCloudBuild(selectedCustomer.id, details.apps)}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isBuildingApp ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Compiling on Cloud...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Start Cloud Build</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── DOWNLOAD PACKAGES MODAL ── */}
        {downloadModalApp && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 flex flex-col max-h-[84vh] sm:max-h-[86vh] overflow-hidden my-auto animate-in zoom-in-95">
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center flex-shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Download Application Packages</h3>
                    <span className="text-[11px] text-slate-500">
                      App: <strong className="text-slate-800 font-semibold">{downloadModalApp.name}</strong> • Version: <span className="font-mono text-slate-700">{downloadModalApp.version}</span>
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setDownloadModalApp(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-5 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-3.5 flex-1 text-xs">
                {/* Information Card */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{downloadModalApp.name}</div>
                    <div className="font-mono text-[11px] text-slate-500">{downloadModalApp.package}</div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {downloadModalApp.status}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">Last build: {downloadModalApp.lastBuildDate}</div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Available Compiled Artifacts
                  </span>

                  {/* Artifact 1: Android APK */}
                  <div className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 transition bg-white flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-black text-xs">
                        APK
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Android APK (Universal Release)</div>
                        <div className="text-[11px] text-slate-500">
                          18.4 MB • Signed with Keystore • Ready for direct sideloading &amp; testing
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        triggerFileDownload(
                          `${downloadModalApp.package}-v${downloadModalApp.version}-release.apk`,
                          "Web2App Production Android APK Release Binary"
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>

                  {/* Artifact 2: Google Play AAB */}
                  <div className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 transition bg-white flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-black text-xs">
                        AAB
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Google Play App Bundle (.aab)</div>
                        <div className="text-[11px] text-slate-500">
                          14.2 MB • Target API 34 • Optimized for Google Play Console submission
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        triggerFileDownload(
                          `${downloadModalApp.package}-v${downloadModalApp.version}.aab`,
                          "Web2App Google Play App Bundle Binary"
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-xs transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>

                  {/* Artifact 3: Build Manifest & Keystore SHA-256 */}
                  <div className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 transition bg-white flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-black text-xs">
                        JSON
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Build Manifest &amp; Keystore Hashes</div>
                        <div className="text-[11px] text-slate-500">
                          12 KB • Package configuration, SHA-256 fingerprint, and platform permissions
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        triggerFileDownload(
                          `${downloadModalApp.package}-manifest.json`,
                          JSON.stringify(
                            {
                              appName: downloadModalApp.name,
                              packageId: downloadModalApp.package,
                              version: downloadModalApp.version,
                              platformBackend: downloadModalApp.platform,
                              lastBuild: downloadModalApp.lastBuildDate,
                              keystoreSha256: "8F:3A:91:D2:7C:E5:41:09:BA:66:33:1B:74:DE:90:5E:AA:C1:28:4F",
                              tenant: {
                                id: selectedCustomer.tenantId,
                                name: selectedCustomer.tenantName,
                                customer: selectedCustomer.name,
                              },
                            },
                            null,
                            2
                          )
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between flex-shrink-0 bg-slate-50/90">
                <span className="text-[11px] text-slate-400">
                  Total available storage: 32.6 MB
                </span>
                <button
                  type="button"
                  onClick={() => setDownloadModalApp(null)}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold cursor-pointer shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── SENSITIVE ACTION: IMPERSONATION CONFIRMATION MODAL ── */}
        {impersonateTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl border border-amber-200 w-full max-w-md p-6 animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">
                Confirm Sensitive Action: Account Impersonation
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                You are about to start an impersonated session as{" "}
                <b>{impersonateTarget.name}</b> ({impersonateTarget.tenantName}).
                An audit log entry will be permanently recorded for security compliance.
              </p>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  onClick={() => setImpersonateTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    alert(
                      `Impersonation session initiated for Tenant #${impersonateTarget.tenantId}. Redirecting to tenant view.`
                    );
                    setImpersonateTarget(null);
                    window.open(`/dashboard`, "_blank");
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-sm"
                >
                  Confirm &amp; Log In As Tenant
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MAIN CUSTOMER DIRECTORY LIST VIEW
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            Customer Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage registered clients, tenant health scores, and platform subscriptions.
          </p>
        </div>

        <button
          onClick={() => alert("Customer Segment Report exported to CSV.")}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs font-bold transition shadow-2xs self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* ── CUSTOMER HEALTH SCORE & SEGMENTATION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Score Overview Cards */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-slate-900">
              Customer Health
            </h3>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
              74% Healthy
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/60 text-center">
              <span className="text-2xl font-black text-emerald-700 block">74%</span>
              <span className="text-xs font-bold text-emerald-800 mt-0.5 block">Healthy</span>
              <span className="text-[10px] text-emerald-600 block">923</span>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/60 text-center">
              <span className="text-2xl font-black text-amber-700 block">16%</span>
              <span className="text-xs font-bold text-amber-800 mt-0.5 block">Attention</span>
              <span className="text-[10px] text-amber-600 block">200</span>
            </div>

            <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200/60 text-center">
              <span className="text-2xl font-black text-rose-700 block">7%</span>
              <span className="text-xs font-bold text-rose-800 mt-0.5 block">At Risk</span>
              <span className="text-[10px] text-rose-600 block">87</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-100/60 border border-slate-200/60 text-center">
              <span className="text-2xl font-black text-slate-600 block">3%</span>
              <span className="text-xs font-bold text-slate-700 mt-0.5 block">Inactive</span>
              <span className="text-[10px] text-slate-400 block">38</span>
            </div>
          </div>
        </div>

        {/* Customer Segmentation Mini Donut */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 mb-2">
              Segmentation
            </h3>

            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={SEGMENT_CHART_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={58}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {SEGMENT_CHART_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {SEGMENT_CHART_DATA.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-slate-600 truncate">{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CUSTOMER DIRECTORY & FILTERS ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Filters Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, email, phone or store..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {/* Health Filter */}
            <select
              value={selectedHealth}
              onChange={(e) => setSelectedHealth(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
            >
              <option value="all">All Health Scores</option>
              <option value="Healthy">Healthy</option>
              <option value="Needs Attention">Needs Attention</option>
              <option value="At Risk">At Risk</option>
              <option value="Inactive">Inactive</option>
            </select>

            {/* Segment Filter */}
            <select
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
            >
              <option value="all">All Dynamic Segments</option>
              <option value="Paid">Paid Customers</option>
              <option value="Free">Free Customers</option>
              <option value="Enterprise">Enterprise Pro</option>
              <option value="High-Revenue">High-Revenue</option>
              <option value="Failed Builds">With Failed Builds</option>
              <option value="Upcoming Renewal">Upcoming Renewal</option>
              <option value="Inactive (30d)">Inactive (30 Days)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50/80 text-[11px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Customer</th>
                <th className="px-6 py-3.5">Tenant Organization</th>
                <th className="px-6 py-3.5">Health Score</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    No customers match the active filters.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const isCustBlocked = customerBlockedOverrides[cust.id]?.isBlocked ?? cust.isBlocked;
                  return (
                    <tr
                      key={cust.id}
                      onClick={() => setSelectedCustomer(cust)}
                      className={`hover:bg-indigo-50/50 cursor-pointer transition-colors group select-none ${
                        isCustBlocked ? "bg-rose-50/30" : ""
                      }`}
                      title={`Click anywhere to view full details for ${cust.name}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl ${
                              isCustBlocked ? "bg-rose-600" : cust.avatarColor
                            } text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform`}
                          >
                            {cust.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors flex items-center gap-1.5 flex-wrap">
                              <span>{cust.name}</span>
                              {cust.verified && (
                                <span title="Verified Email">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                </span>
                              )}
                              {isCustBlocked && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 uppercase tracking-wide">
                                  Blocked
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 font-mono">{cust.email}</div>
                            {cust.phone && (
                              <div className="text-[11px] text-slate-400">{cust.phone}</div>
                            )}
                          </div>
                        </div>
                      </td>

                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {cust.tenantName}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Tenant #{cust.tenantId}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {getHealthBadge(cust.healthScore, cust.healthScoreValue)}
                    </td>

                    {/* ── HORIZONTAL TAB ACTION: VIEW DETAILS ── */}
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomer(cust);
                        }}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 group-hover:bg-indigo-600 text-indigo-700 group-hover:text-white text-xs font-bold transition border border-indigo-200/80 group-hover:border-indigo-600 shadow-2xs cursor-pointer"
                        title="View complete customer details, plans, expiry, billing, add-ons, and history"
                      >
                        <Eye className="w-3.5 h-3.5 group-hover:scale-110 transition-transform text-indigo-600 group-hover:text-white" />
                        <span>View Details</span>
                        <ArrowRight className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── EMAIL COMPOSER MODAL ── */}
      {renderEmailModal()}

      {/* ── BLOCK CUSTOMER MODAL ── */}
      {renderBlockModal()}

      {/* ── REVOKE SUBSCRIPTION MODAL ── */}
      {renderRevokeModal()}
    </div>
  );
}
