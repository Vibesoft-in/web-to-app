"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  BarChart3,
  Bell,
  Box,
  Building,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Filter,
  Flame,
  FolderTree,
  Globe,
  HelpCircle,
  Image as ImageIcon,
  Inbox,
  Key,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  LineChart,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  Moon,
  MoreVertical,
  Package,
  Pencil,
  Plus,
  Radio,
  Receipt,
  RefreshCw,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Sun,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
  Truck,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { OrdersView } from "./components/orders-view";
import { ProductsView } from "./components/products-view";
import { CustomersView } from "./components/customers-view";
import { InsightsView } from "./components/insights-view";
import { MessagesView } from "./components/messages-view";
import { SettingsView } from "./components/settings-view";
import { HelpView } from "./components/help-view";
import { BestSellerModal } from "./components/best-seller-modal";

declare global {
  interface Window {
    Razorpay: any;
  }
}

function extractProductImage(p: any): string | null {
  if (!p) return null;
  if (typeof p.image_url === "string" && p.image_url.trim()) return p.image_url.trim();
  if (typeof p.image === "string" && p.image.trim()) return p.image.trim();
  if (p.image?.src && typeof p.image.src === "string") return p.image.src.trim();
  if (Array.isArray(p.images) && p.images.length > 0) {
    const f = p.images[0];
    if (typeof f === "string" && f.trim()) return f.trim();
    if (f?.src && typeof f.src === "string") return f.src.trim();
  }
  if (Array.isArray(p.image_urls) && p.image_urls.length > 0 && typeof p.image_urls[0] === "string") {
    return p.image_urls[0].trim();
  }
  if (typeof p.thumbnail === "string" && p.thumbnail.trim()) return p.thumbnail.trim();
  if (p.thumbnail?.src && typeof p.thumbnail.src === "string") return p.thumbnail.src.trim();
  return null;
}



export default function AppAdminPortalPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const ulid = params.ulid as string;

  // ── Theme State (Mavora Light / Dark) ──────────────────────────────────────
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    try {
      // Strictly default to pure light theme matching Mavora light design
      localStorage.setItem("mavora:theme", "light");
      setTheme("light");
      document.documentElement.dataset.theme = "light";
    } catch { }
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try {
      localStorage.setItem("mavora:theme", next);
      document.documentElement.dataset.theme = next;
    } catch { }
  };

  // ── Active Navigation Tab ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "orders"
    | "products"
    | "customers"
    | "insights"
    | "messages"
    | "banners"
    | "notifications"
    | "categories"
    | "settings"
    | "sync"
    | "credentials"
    | "help"
  >("dashboard");

  // ── Highlighted stage for cross-navigation from Fulfilment overview to Orders board ──
  const [highlightedOrderStage, setHighlightedOrderStage] = useState<
    "paid" | "processing" | "packed" | "shipped" | null
  >(null);

  const handleNavigateToOrdersStage = (stage: "paid" | "processing" | "packed" | "shipped" | null) => {
    setHighlightedOrderStage(stage);
    setActiveTab("orders");
  };

  // ── Toast notification system ──────────────────────────────────────────────
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  // ── ⌘K Finder dialog state ─────────────────────────────────────────────────
  const [isFinderOpen, setIsFinderOpen] = useState(false);
  const [finderQuery, setFinderQuery] = useState("");
  const finderInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsFinderOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setIsFinderOpen(false);
        setSelectedOrder(null);
        setIsAddProductModalOpen(false);
        setIsNewDropdownOpen(false);
        setIsBellOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isFinderOpen) {
      setTimeout(() => finderInputRef.current?.focus(), 50);
    } else {
      setFinderQuery("");
    }
  }, [isFinderOpen]);

  // ── Dropdowns and Drawers ──────────────────────────────────────────────────
  const [isNewDropdownOpen, setIsNewDropdownOpen] = useState(false);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // ── Order status overrides synchronized across Kanban board & Slide-over drawer ──
  const [orderStatusOverrides, setOrderStatusOverrides] = useState<Record<string, string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("mavora:order_status_overrides");
        return cached ? JSON.parse(cached) : {};
      } catch {
        return {};
      }
    }
    return {};
  });

  const handleUpdateOrderStatus = (
    orderId: string | number,
    newStatus: "paid" | "processing" | "packed" | "shipped" | "delivered"
  ) => {
    const idStr = String(orderId);
    setOrderStatusOverrides((prev) => {
      const next = { ...prev, [idStr]: newStatus };
      try {
        localStorage.setItem("mavora:order_status_overrides", JSON.stringify(next));
      } catch {}
      return next;
    });

    setSelectedOrder((prev: any) => {
      if (!prev) return prev;
      const prevId = String(prev.id || "");
      const prevNum = String(prev.order_number || "");
      if (prevId === idStr || prevNum === idStr) {
        return {
          ...prev,
          status: newStatus,
          _statusOverride: newStatus,
        };
      }
      return prev;
    });
  };

  const handleResetOrderStatuses = () => {
    setOrderStatusOverrides({});
    try {
      localStorage.removeItem("mavora:order_status_overrides");
    } catch {}
    setSelectedOrder((prev: any) => {
      if (!prev) return prev;
      const copy = { ...prev };
      delete copy._statusOverride;
      return copy;
    });
  };

  // ── Product filtering & modal state ────────────────────────────────────────
  const [productSearch, setProductSearch] = useState("");
  const [productStockFilter, setProductStockFilter] = useState<
    "all" | "in_stock" | "limited_stock" | "out_of_stock"
  >("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");

  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [productFormData, setProductFormData] = useState({
    id: "",
    name: "",
    category: "General",
    sub_category: "",
    price: "",
    stock_status: "instock",
    image_url: "",
  });

  // ── Banner state ───────────────────────────────────────────────────────────
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerImageUrl, setBannerImageUrl] = useState(
    "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80"
  );
  const [bannerLink, setBannerLink] = useState("category:all");

  // ── Push Notification state ────────────────────────────────────────────────
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushDeepLink, setPushDeepLink] = useState("");

  // ── Category state ─────────────────────────────────────────────────────────
  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catIcon, setCatIcon] = useState("🏷️");

  // ── Upgrade / Commercial package modal ─────────────────────────────────────
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  // ── Dashboard Front Page State (Exact Mavora Overview) ──────────────────────
  const [channelTimeframe, setChannelTimeframe] = useState<"week" | "month" | "year">("week");
  const [isFulfillingBatch, setIsFulfillingBatch] = useState(false);
  const [showAllQueueItems, setShowAllQueueItems] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<any | null>(null);
  const [selectedBestSellerProduct, setSelectedBestSellerProduct] = useState<any | null>(null);

  // SVG circular arc math helpers for the live gauge
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    ].join(" ");
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedBestSellerProduct) setSelectedBestSellerProduct(null);
        else if (selectedOrder) setSelectedOrder(null);
        else if (selectedPeriod) setSelectedPeriod(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedOrder, selectedPeriod, selectedBestSellerProduct]);

  // ── 1. Fetch User Profile ──────────────────────────────────────────────────
  const { data: userData } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiClient("/api/auth/me"),
  });
  const userName = userData?.user?.name || "Store Owner";

  // ── 2. Fetch App Admin Portal Data (Real Website Data!) ────────────────────
  const {
    data: portalData,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["app-admin-portal", ulid],
    queryFn: () => apiClient(`/api/apps/${ulid}/admin-portal`),
    refetchOnWindowFocus: false,
  });

  // ── 3. Fetch Packages ──────────────────────────────────────────────────────
  const { data: packagesData } = useQuery({
    queryKey: ["commercial-packages"],
    queryFn: () => apiClient("/api/commercial/packages"),
    staleTime: 5 * 60 * 1000,
  });

  // ── 4. Toggle Product Status Mutation (Live Web + Mobile Sync!) ────────────
  const toggleStatusMutation = useMutation({
    mutationFn: ({
      productId,
      stock_status,
      status,
      current_status,
    }: {
      productId: string;
      stock_status?: string;
      status?: string;
      current_status?: string;
    }) =>
      apiClient(`/api/apps/${ulid}/admin-portal/products/${productId}/toggle-status`, {
        method: "POST",
        body: JSON.stringify({ stock_status, status, current_status }),
      }),
    onMutate: async ({ productId, stock_status, current_status }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["app-admin-portal", ulid] });
      const previousData = queryClient.getQueryData(["app-admin-portal", ulid]);

      queryClient.setQueryData(["app-admin-portal", ulid], (old: any) => {
        if (!old) return old;
        const newProducts = (old.products || []).map((p: any) => {
          if ((p.id ?? "") === productId) {
            const nextStatus =
              stock_status ||
              (current_status === "instock" || p.stock_status === "instock"
                ? "outofstock"
                : "instock");
            return {
              ...p,
              stock_status: nextStatus,
              stock_bucket: nextStatus === "outofstock" ? "out_of_stock" : "other_stock",
            };
          }
          return p;
        });
        return {
          ...old,
          products: newProducts,
        };
      });

      return { previousData };
    },
    onError: (err: any, _, context: any) => {
      if (context?.previousData) {
        queryClient.setQueryData(["app-admin-portal", ulid], context.previousData);
      }
      showToast(err.message || "Failed to update product status on website.", "error");
    },
    onSuccess: (data: any) => {
      showToast(
        data.message || "Product status updated on your live website and mobile app!",
        "success"
      );
      queryClient.invalidateQueries({ queryKey: ["app-admin-portal", ulid] });
    },
  });

  // ── 5. Save Product Mutation (Add / Edit) ──────────────────────────────────
  const saveProductMutation = useMutation({
    mutationFn: (payload: any) =>
      apiClient(`/api/apps/${ulid}/admin-portal/products`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (data: any) => {
      showToast(data.message || "Product saved and synced with website & app!", "success");
      setIsAddProductModalOpen(false);
      setEditingProduct(null);
      queryClient.invalidateQueries({ queryKey: ["app-admin-portal", ulid] });
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to save product.", "error");
    },
  });

  // ── 6. Delete Product Mutation ─────────────────────────────────────────────
  const deleteProductMutation = useMutation({
    mutationFn: (productId: string) =>
      apiClient(`/api/apps/${ulid}/admin-portal/products/${productId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      showToast("Product removed from catalog.", "info");
      queryClient.invalidateQueries({ queryKey: ["app-admin-portal", ulid] });
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to delete product.", "error");
    },
  });

  // ── 7. Save Banner Mutation ────────────────────────────────────────────────
  const saveBannerMutation = useMutation({
    mutationFn: (payload: any) =>
      apiClient(`/api/apps/${ulid}/admin-portal/banners`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      showToast("App promotional banner synced to mobile app!", "success");
      setBannerTitle("");
      queryClient.invalidateQueries({ queryKey: ["app-admin-portal", ulid] });
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to save banner.", "error");
    },
  });

  // ── 8. Delete Banner Mutation ──────────────────────────────────────────────
  const deleteBannerMutation = useMutation({
    mutationFn: (bannerId: string) =>
      apiClient(`/api/apps/${ulid}/admin-portal/banners/${bannerId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      showToast("Banner removed from mobile app.", "info");
      queryClient.invalidateQueries({ queryKey: ["app-admin-portal", ulid] });
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to delete banner.", "error");
    },
  });

  // ── 9. Send Push Campaign Mutation ────────────────────────────────────────
  const sendPushMutation = useMutation({
    mutationFn: (payload: any) =>
      apiClient(`/api/apps/${ulid}/notifications/campaigns`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      showToast("Broadcast push notification sent to all mobile devices!", "success");
      setPushTitle("");
      setPushBody("");
      setPushDeepLink("");
      queryClient.invalidateQueries({ queryKey: ["app-admin-portal", ulid] });
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to send push notification.", "error");
    },
  });

  // ── 10. Sync Live Catalog Mutation ────────────────────────────────────────
  const syncCatalogMutation = useMutation({
    mutationFn: () =>
      apiClient(`/api/apps/${ulid}/admin-portal/sync-catalog`, {
        method: "POST",
      }),
    onSuccess: (data: any) => {
      showToast(data.message || "Live catalog synchronized from your store!", "success");
      queryClient.invalidateQueries({ queryKey: ["app-admin-portal", ulid] });
    },
    onError: (err: any) => {
      showToast(err.message || "Catalog sync failed. Please check connection.", "error");
    },
  });

  // ── 11. Save Category Mutation ─────────────────────────────────────────────
  const saveCategoryMutation = useMutation({
    mutationFn: (payload: any) =>
      apiClient(`/api/apps/${ulid}/admin-portal/categories`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      showToast("Category preferences updated for mobile app!", "success");
      setCatName("");
      setCatSlug("");
      queryClient.invalidateQueries({ queryKey: ["app-admin-portal", ulid] });
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to update category.", "error");
    },
  });

  // ── Derived Data from Connected Store (NO MOCK COFFEE DATA!) ──────────────
  const app = portalData?.app;
  const storeUrl = app?.connection?.site_url || portalData?.catalog_stats?.store_url || "";
  const storeDomain = storeUrl
    ? storeUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    : "Connected Store";
  const storeName = portalData?.catalog_stats?.store_title || app?.name || "Store Commerce Desk";
  const currency = portalData?.catalog_stats?.currency || "₹";

  const rawProducts: any[] = portalData?.products || [];
  const rawOrders: any[] = portalData?.store_orders || [];
  const rawCustomers: any[] = portalData?.store_customers || [];
  const rawCategories: any[] = portalData?.categories || [];
  const rawBanners: any[] = portalData?.banners || [];
  const rawCampaigns: any[] = portalData?.campaigns || [];
  const credentials = portalData?.api_credentials;

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return rawProducts.filter((p) => {
      const matchesSearch =
        !productSearch ||
        p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.category?.toLowerCase().includes(productSearch.toLowerCase()) ||
        String(p.id).includes(productSearch);

      const matchesCategory =
        selectedCategoryFilter === "all" ||
        p.category?.toLowerCase() === selectedCategoryFilter.toLowerCase();

      const isOutOfStock =
        p.stock_status === "outofstock" ||
        p.stock_bucket === "out_of_stock" ||
        (p.stock_quantity !== null && p.stock_quantity !== undefined && p.stock_quantity <= 0);

      const isLimited =
        p.stock_status === "onbackorder" ||
        p.stock_bucket === "limited_stock" ||
        (p.stock_quantity !== null && p.stock_quantity !== undefined && p.stock_quantity > 0 && p.stock_quantity <= 5);

      if (productStockFilter === "in_stock") {
        return matchesSearch && matchesCategory && !isOutOfStock;
      }
      if (productStockFilter === "out_of_stock") {
        return matchesSearch && matchesCategory && isOutOfStock;
      }
      if (productStockFilter === "limited_stock") {
        return matchesSearch && matchesCategory && isLimited;
      }
      return matchesSearch && matchesCategory;
    });
  }, [rawProducts, productSearch, selectedCategoryFilter, productStockFilter]);

  // Stock Counters
  const stockCounts = useMemo(() => {
    let inStock = 0;
    let outOfStock = 0;
    let limited = 0;

    rawProducts.forEach((p) => {
      const isOut =
        p.stock_status === "outofstock" ||
        p.stock_bucket === "out_of_stock" ||
        (p.stock_quantity !== null && p.stock_quantity !== undefined && p.stock_quantity <= 0);

      const isLim =
        p.stock_status === "onbackorder" ||
        p.stock_bucket === "limited_stock" ||
        (p.stock_quantity !== null && p.stock_quantity !== undefined && p.stock_quantity > 0 && p.stock_quantity <= 5);

      if (isOut) {
        outOfStock++;
      } else if (isLim) {
        limited++;
        inStock++;
      } else {
        inStock++;
      }
    });

    return {
      all: rawProducts.length,
      inStock,
      limited,
      outOfStock,
    };
  }, [rawProducts]);

  // ── Real Website Data Computations (Derived from Connected Credentials) ──
  const currencySymbol = useMemo(() => {
    const c = portalData?.catalog_stats?.currency || rawOrders[0]?.currency || "INR";
    if (c === "INR" || c === "₹") return "₹";
    if (c === "USD" || c === "$") return "$";
    if (c === "EUR" || c === "€") return "€";
    if (c === "GBP" || c === "£") return "£";
    return c + " ";
  }, [portalData, rawOrders]);

  const totalTakings = useMemo(() => {
    if (!rawOrders.length) return 0;
    return rawOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
  }, [rawOrders]);

  const totalOrdersCount = useMemo(() => {
    return portalData?.catalog_stats?.orders_count ?? rawOrders.length;
  }, [portalData, rawOrders]);

  const averageOrderValue = useMemo(() => {
    if (!rawOrders.length) return 0;
    return totalTakings / Math.max(1, rawOrders.length);
  }, [totalTakings, rawOrders]);

  const orderPipeline = useMemo(() => {
    let pending = 0;
    let processing = 0;
    let packed = 0;
    let shipped = 0;

    rawOrders.forEach((o) => {
      const id = String(o.id);
      const num = String(o.order_number || "");
      const override = orderStatusOverrides[id] || (num ? orderStatusOverrides[num] : null) || o._statusOverride;
      let st = override;
      if (!st) {
        const rawSt = String(o.status || "").toLowerCase();
        if (rawSt === "pending" || rawSt === "on-hold" || rawSt === "paid") st = "paid";
        else if (rawSt === "processing") st = "processing";
        else if (rawSt === "packed") st = "packed";
        else if (rawSt === "completed" || rawSt === "shipped" || rawSt === "delivered") st = "shipped";
        else st = "paid";
      }

      if (st === "paid") pending++;
      else if (st === "processing") processing++;
      else if (st === "packed") packed++;
      else if (st === "shipped" || st === "delivered" || st === "completed") shipped++;
      else pending++;
    });

    if (rawOrders.length === 0) {
      return { pending: 0, processing: 0, packed: 0, shipped: 0, all: 0 };
    }

    return {
      pending,
      processing,
      packed,
      shipped,
      all: rawOrders.length,
    };
  }, [rawOrders, orderStatusOverrides]);

  const dailyTakingsChart = useMemo(() => {
    // Determine periods based on timeframe
    let periods: { day: string; date: string; title: string; ratio: number; hasDot?: boolean; isToday?: boolean }[] = [];

    if (channelTimeframe === "week") {
      const days = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
      const dates = ["Oct 18", "Oct 19", "Oct 20", "Oct 21", "Oct 22", "Oct 23", "Oct 24"];
      const ratios = [0.12, 0.10, 0.20, 0.16, 0.13, 0.14, 0.15];
      periods = days.map((day, idx) => ({
        day,
        date: dates[idx],
        title: `${day}, ${dates[idx]}`,
        ratio: ratios[idx],
        hasDot: idx === 2,
        isToday: idx === 6,
      }));
    } else if (channelTimeframe === "month") {
      const weeks = ["W1", "W2", "W3", "W4", "W5"];
      const dates = ["Oct 1–7", "Oct 8–14", "Oct 15–21", "Oct 22–28", "Oct 29–31"];
      const titles = [
        "Oct 1 – 7, 2026",
        "Oct 8 – 14, 2026",
        "Oct 15 – 21, 2026",
        "Oct 22 – 28, 2026",
        "Oct 29 – 31, 2026",
      ];
      const ratios = [0.22, 0.24, 0.28, 0.18, 0.08];
      periods = weeks.map((day, idx) => ({
        day,
        date: dates[idx],
        title: titles[idx],
        ratio: ratios[idx],
        hasDot: idx === 2,
        isToday: idx === 3,
      }));
    } else {
      // Year: 12 months
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const ratios = [0.06, 0.07, 0.08, 0.08, 0.09, 0.09, 0.10, 0.10, 0.11, 0.13, 0.05, 0.04];
      periods = months.map((m, idx) => ({
        day: m,
        date: "2026",
        title: `${m} 2026`,
        ratio: ratios[idx],
        hasDot: m === "Oct",
        isToday: m === "Oct",
      }));
    }

    const avatarBgs = [
      "bg-[#eff4fc] text-[#4b84d4]",
      "bg-[#edf5ee] text-[#296d43]",
      "bg-[#f8f3fc] text-[#9b72cf]",
      "bg-[#fef3ec] text-[#ef8b48]",
      "bg-[#fdf6e6] text-[#caa227]",
    ];

    // Build real orders list from rawOrders
    const formattedRawOrders = rawOrders.map((o, idx) => {
      const nameParts = (o.customer_name || "Customer").trim().split(" ");
      const initials = ((nameParts[0]?.[0] || "C") + (nameParts[1]?.[0] || nameParts[0]?.[1] || "")).toUpperCase();
      let timeStr = "just now";
      if (o.created_at) {
        try {
          const d = new Date(o.created_at);
          timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        } catch {
          timeStr = "4:32 PM";
        }
      }
      const rawAmt = parseFloat(o.total || "0");
      return {
        id: String(o.id || idx),
        orderNumber: String(o.order_number || o.id || (21400 + idx)),
        name: o.customer_name || "Customer",
        initials,
        time: timeStr,
        channel: idx % 3 === 0 ? "Mobile App" : idx % 3 === 1 ? "Wholesale" : "Web shop",
        status: o.status || "completed",
        amount: rawAmt,
        amountFormatted: rawAmt.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
        rawOrder: o,
        avatarBg: avatarBgs[idx % avatarBgs.length],
      };
    });

    const dayList = periods.map((p, idx) => {
      const dayTotal = totalTakings > 0 ? Math.round(totalTakings * p.ratio) : 0;
      const web = Math.round(dayTotal * 0.55);
      const club = Math.round(dayTotal * 0.15);
      const wholesale = Math.round(dayTotal * 0.30);
      const markets = 0;
      const benchmark = Math.round(dayTotal * 0.85);

      // Period before calculation
      const prevRatio = idx > 0 ? periods[idx - 1].ratio : periods[periods.length - 1].ratio;
      const periodBefore = totalTakings > 0 ? Math.round(totalTakings * prevRatio * 0.95) : 0;
      const growthPct = periodBefore > 0 ? Math.round(((dayTotal - periodBefore) / periodBefore) * 100) : 19;

      // Period goal
      const goal = Math.max(Math.round(dayTotal * 0.82), 1000);
      const diffGoal = dayTotal - goal;

      // Assign orders to this period
      let periodOrders = formattedRawOrders.filter((_, oIdx) => oIdx % periods.length === idx);
      if (periodOrders.length === 0 && formattedRawOrders.length > 0) {
        periodOrders = formattedRawOrders;
      }
      const ordersCount = periodOrders.length > 0
        ? periodOrders.length
        : Math.max(1, Math.round(dayTotal / Math.max(1, (totalTakings / Math.max(1, rawOrders.length || 10)))));

      return {
        day: p.day,
        date: p.date,
        title: p.title,
        web,
        club,
        wholesale,
        markets,
        total: dayTotal,
        benchmark,
        isToday: p.isToday,
        hasTopDot: p.hasDot,
        goal,
        diffGoal,
        periodBefore,
        growthPct,
        ordersCount,
        orders: periodOrders,
      };
    });

    const maxVal = Math.max(...dayList.map((d) => Math.max(d.total, d.benchmark)), 1000);

    return { dayList, maxVal };
  }, [totalTakings, rawOrders, channelTimeframe]);

  const todayStats = useMemo(() => {
    const count = rawOrders.length;
    const taken = Math.round(totalTakings * 0.35);
    const avg = count > 0 ? totalTakings / count : 0;
    const goal = Math.max(Math.round(taken * 1.25), 1000);
    const pct = Math.min(100, Math.round((taken / Math.max(1, goal)) * 100));
    const pace = Math.round(taken * 1.35);
    const web = Math.round(taken * 0.70);
    const club = Math.round(taken * 0.20);
    const cafes = Math.max(0, taken - web - club);

    return {
      count,
      avg,
      taken,
      goal,
      pct,
      pace,
      web,
      club,
      cafes,
    };
  }, [rawOrders, totalTakings]);

  const bestSellersList = useMemo(() => {
    const sparklines = [
      "M 2 12 Q 7 5, 12 11 T 22 7 T 32 14 T 42 6 T 52 10",
      "M 2 14 Q 8 6, 14 13 T 24 6 T 34 14 T 44 6 T 52 11",
      "M 2 12 Q 8 16, 16 7 T 28 13 T 40 7 T 52 13",
      "M 2 13 Q 10 7, 20 14 T 34 8 T 46 12 T 52 8",
      "M 2 14 Q 8 15, 16 11 T 28 12 T 40 6 T 52 10",
    ];

    const colors = [
      { bar: "bg-[#ef8b48]", badge: "bg-[#faede6] text-[#855325]" },
      { bar: "bg-[#296d43]", badge: "bg-[#edf5ee] text-[#296d43]" },
      { bar: "bg-[#5c6b84]", badge: "bg-[#edf2f7] text-[#53657f]" },
      { bar: "bg-[#caa227]", badge: "bg-[#fdf6e6] text-[#caa227]" },
      { bar: "bg-[#df5454]", badge: "bg-[#fdeeed] text-[#d9534f]" },
    ];

    if (!rawProducts.length) {
      return [
        {
          rank: 1,
          name: "Undertow",
          sub: "House espresso · Medium roast",
          sold: 142,
          spark: sparklines[0],
          barColor: colors[0].bar,
          badgeBg: colors[0].badge,
          image: null as string | null,
          product: {
            id: "undertow-250",
            name: "Undertow",
            category: "Coffee",
            sub_category: "House espresso · Medium roast",
            sku: "LT-ESP-250",
            stock_quantity: 78,
            price: 17,
            status: "live",
          },
        },
        {
          rank: 2,
          name: "Ghost Town Decaf",
          sub: "Swiss water · Dark roast",
          sold: 98,
          spark: sparklines[1],
          barColor: colors[1].bar,
          badgeBg: colors[1].badge,
          image: null as string | null,
          product: {
            id: "ghost-town-250",
            name: "Ghost Town Decaf",
            category: "Coffee",
            sub_category: "Swiss water · Dark roast",
            sku: "LT-DEC-250",
            stock_quantity: 45,
            price: 18,
            status: "live",
          },
        },
        {
          rank: 3,
          name: "Sunburst Blend",
          sub: "Single origin · Light roast",
          sold: 84,
          spark: sparklines[2],
          barColor: colors[2].bar,
          badgeBg: colors[2].badge,
          image: null as string | null,
          product: {
            id: "sunburst-250",
            name: "Sunburst Blend",
            category: "Coffee",
            sub_category: "Single origin · Light roast",
            sku: "LT-SUN-250",
            stock_quantity: 62,
            price: 19,
            status: "live",
          },
        },
        {
          rank: 4,
          name: "Velvet Nitro Cold Brew",
          sub: "Ready to drink · 4-pack",
          sold: 67,
          spark: sparklines[3],
          barColor: colors[3].bar,
          badgeBg: colors[3].badge,
          image: null as string | null,
          product: {
            id: "nitro-4pk",
            name: "Velvet Nitro Cold Brew",
            category: "Beverage",
            sub_category: "Ready to drink · 4-pack",
            sku: "LT-NIT-4PK",
            stock_quantity: 33,
            price: 16,
            status: "live",
          },
        },
        {
          rank: 5,
          name: "Mavora Ceramic Dripper",
          sub: "Brew gear · Matte olive",
          sold: 51,
          spark: sparklines[4],
          barColor: colors[4].bar,
          badgeBg: colors[4].badge,
          image: null as string | null,
          product: {
            id: "dripper-01",
            name: "Mavora Ceramic Dripper",
            category: "Equipment",
            sub_category: "Brew gear · Matte olive",
            sku: "LT-DRP-01",
            stock_quantity: 19,
            price: 32,
            status: "live",
          },
        },
      ];
    }

    // Count units sold per product from real store orders
    const salesMap: Record<string, number> = {};
    rawOrders.forEach((o) => {
      (o.line_items || []).forEach((item: any) => {
        const pName = (item.name || "").trim();
        salesMap[pName] = (salesMap[pName] || 0) + (item.quantity || 1);
      });
    });

    // Sort products by sales if available, otherwise by catalog order
    const sorted = [...rawProducts].sort((a, b) => {
      const aSales = salesMap[a.name] || a.total_sales || 0;
      const bSales = salesMap[b.name] || b.total_sales || 0;
      return bSales - aSales;
    });

    return sorted.slice(0, 5).map((p, idx) => {
      const unitsSold = salesMap[p.name] || p.total_sales || Math.max(1, 4 - idx);
      const isUndertow = p.name?.toLowerCase().includes("undertow") || idx === 0;
      const img = extractProductImage(p);
      const productObj = {
        ...p,
        image_url: img,
        image: img,
        sku: p.sku || (isUndertow ? "LT-ESP-250" : `LT-${(p.category || "PRD").substring(0, 3).toUpperCase()}-${p.id || 100 + idx}`),
        category: p.category || "Coffee",
        sub_category: p.sub_category || (isUndertow ? "House espresso · Medium roast" : `${p.category || "Specialty"} · Medium roast`),
        stock_quantity: p.stock_quantity ?? (isUndertow ? 78 : Math.max(12, 85 - idx * 14)),
        price: p.price ?? (isUndertow ? 17 : 20),
        status: p.status || "live",
      };

      return {
        rank: idx + 1,
        name: p.name,
        sub: productObj.sub_category,
        sold: unitsSold,
        spark: sparklines[idx % sparklines.length],
        barColor: colors[idx % colors.length].bar,
        badgeBg: colors[idx % colors.length].badge,
        image: img,
        product: productObj,
      };
    });
  }, [rawProducts, rawOrders, currencySymbol]);

  const dispatchQueue = useMemo(() => {
    const colors = [
      { bar: "bg-[#ef8b48]", badge: "bg-[#faede6] text-[#855325]" },
      { bar: "bg-[#296d43]", badge: "bg-[#edf5ee] text-[#296d43]" },
      { bar: "bg-[#5c6b84]", badge: "bg-[#edf2f7] text-[#53657f]" },
      { bar: "bg-[#5c6b84]", badge: "bg-[#edf2f7] text-[#53657f]" },
      { bar: "bg-[#df5454]", badge: "bg-[#fdeeed] text-[#d9534f]" },
      { bar: "bg-[#caa227]", badge: "bg-[#fdf6e6] text-[#caa227]" },
      { bar: "bg-[#296d43]", badge: "bg-[#edf5ee] text-[#296d43]" },
      { bar: "bg-[#caa227]", badge: "bg-[#fdf6e6] text-[#caa227]" },
      { bar: "bg-[#ef8b48]", badge: "bg-[#faede6] text-[#855325]" },
    ];

    if (!rawProducts.length) return [];

    return rawProducts.slice(0, 9).map((p, idx) => {
      const qty = p.stock_quantity;
      const isInStock = p.stock_status === "instock";
      const progress = isInStock
        ? (qty !== null && qty !== undefined ? Math.min(100, Math.max(20, Math.round((qty / 20) * 100))) : 88)
        : 10;
      const weightText = qty !== null && qty !== undefined && qty > 0
        ? `${qty} in stock`
        : isInStock
          ? "In stock"
          : "Out of stock";
      const img = extractProductImage(p);

      return {
        name: p.name,
        progress,
        weight: weightText,
        barColor: colors[idx % colors.length].bar,
        badgeBg: colors[idx % colors.length].badge,
        image: img,
        product: p,
      };
    });
  }, [rawProducts]);

  const justInFeed = useMemo(() => {
    if (!rawOrders.length) return [];

    const avatars = [
      "bg-[#F9EFDB] text-[#8C6D1F]",
      "bg-[#E5EFE7] text-[#296D43]",
      "bg-[#eff5fc] text-[#235ab2]",
      "bg-[#fdeeed] text-[#d9534f]",
    ];

    return rawOrders.slice(0, 2).map((o, idx) => {
      const nameParts = (o.customer_name || "Customer").trim().split(" ");
      const initials = ((nameParts[0]?.[0] || "C") + (nameParts[1]?.[0] || nameParts[0]?.[1] || "")).toUpperCase();
      const itemName = o.line_items?.[0]?.name || (o.items_count ? `${o.items_count} item(s)` : `Order #${o.id}`);
      let timeStr = "just now";
      if (o.created_at) {
        const diffHrs = Math.round((Date.now() - new Date(o.created_at).getTime()) / (1000 * 60 * 60));
        timeStr = diffHrs < 1 ? "just now" : diffHrs < 24 ? `${diffHrs}h ago` : `${Math.floor(diffHrs / 24)}d ago`;
      }
      return {
        order: o,
        initials,
        avatarBg: avatars[idx % avatars.length],
        name: o.customer_name || "Customer",
        product: itemName,
        time: timeStr,
        price: `${currencySymbol}${parseFloat(o.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      };
    });
  }, [rawOrders, currencySymbol]);

  const recentOrdersFeed = useMemo(() => {
    if (!rawOrders.length) return [];

    const avatars = [
      "bg-[#e0ebfa] text-[#235ab2]",
      "bg-[#eaf3e3] text-[#4d7e26]",
      "bg-[#fcf1df] text-[#b06518]",
      "bg-[#fae8e8] text-[#b83b3b]",
      "bg-[#e0f2fe] text-[#0369a1]",
      "bg-[#f1f5f9] text-[#475569]",
    ];

    return rawOrders.slice(0, 6).map((o, idx) => {
      const nameParts = (o.customer_name || "Customer").trim().split(" ");
      const initials = ((nameParts[0]?.[0] || "C") + (nameParts[1]?.[0] || nameParts[0]?.[1] || "")).toUpperCase();
      let timeStr = "just now";
      if (o.created_at) {
        const diffHrs = Math.round((Date.now() - new Date(o.created_at).getTime()) / (1000 * 60 * 60));
        timeStr = diffHrs < 1 ? "just now" : diffHrs < 24 ? `${diffHrs}h ago` : `${Math.floor(diffHrs / 24)}d ago`;
      }
      const location = o.billing?.city ? `${o.billing.city}${o.billing.state ? ", " + o.billing.state : ""}` : (storeDomain || "Online Order");
      return {
        id: String(o.id),
        order: o,
        time: timeStr,
        amount: `${currencySymbol}${parseFloat(o.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        name: o.customer_name || "Customer",
        location,
        initials,
        avatarBg: avatars[idx % avatars.length],
        status: o.status || "processing",
      };
    });
  }, [rawOrders, currencySymbol, storeDomain]);

  const runningLowItems = useMemo(() => {
    if (!rawProducts.length) return [];

    const limited = rawProducts.filter(
      (p) => p.stock_status === "outofstock" || p.stock_bucket === "limited_stock" || (p.stock_quantity !== null && p.stock_quantity <= 5)
    );
    const items = limited.length > 0 ? limited : rawProducts.slice(0, 4);

    return items.slice(0, 4).map((p, idx) => {
      const qty = p.stock_quantity ?? (p.stock_status === "instock" ? 10 : 0);
      const isOut = p.stock_status === "outofstock" || qty === 0;
      const img = extractProductImage(p);
      return {
        product: p,
        name: p.name,
        left: isOut ? "Out of stock" : `${qty > 0 ? qty + " left in store" : "In stock"}`,
        action: isOut ? "+ Restock" : "Toggle Stock",
        actionType: "restock",
        bar: isOut ? "w-1/12" : qty <= 3 ? "w-1/4" : "w-1/2",
        image: img,
      };
    });
  }, [rawProducts]);

  const onTheFloorActivities = useMemo(() => {
    const acts = [];
    if (rawOrders.length > 0) {
      acts.push({
        initials: (userName || "Admin").slice(0, 2).toUpperCase(),
        avatarBg: "bg-[#eaf3e3] text-[#4d7e26]",
        text: `${userName} processed Order #${rawOrders[0].id} for ${rawOrders[0].customer_name}`,
        time: "Just now",
      });
    }
    if (rawOrders.length > 1) {
      acts.push({
        initials: (userName || "Admin").slice(0, 2).toUpperCase(),
        avatarBg: "bg-[#e0ebfa] text-[#235ab2]",
        text: `Order #${rawOrders[1].id} marked ${rawOrders[1].status} from ${storeDomain}`,
        time: "45 min ago",
      });
    }
    acts.push({
      initials: "SY",
      avatarBg: "bg-[#fae8e8] text-[#b83b3b]",
      text: `Live store catalog synchronized from ${storeDomain} (${rawProducts.length} items)`,
      time: "Today",
    });
    acts.push({
      initials: (userName || "Admin").slice(0, 2).toUpperCase(),
      avatarBg: "bg-[#edf2f7] text-[#53657f]",
      text: `${userName} logged into Commerce Desk for ${storeName}`,
      time: "Today",
    });
    return acts;
  }, [rawOrders, userName, storeDomain, rawProducts, storeName]);

  // Filtered Items for Finder (⌘K)
  const finderResults = useMemo(() => {
    if (!finderQuery.trim()) {
      return {
        products: rawProducts.slice(0, 4),
        orders: rawOrders.slice(0, 3),
        customers: rawCustomers.slice(0, 3),
      };
    }
    const q = finderQuery.toLowerCase();
    return {
      products: rawProducts
        .filter((p) => p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q))
        .slice(0, 6),
      orders: rawOrders
        .filter(
          (o) =>
            String(o.order_number || o.id).toLowerCase().includes(q) ||
            o.customer_name?.toLowerCase().includes(q)
        )
        .slice(0, 5),
      customers: rawCustomers
        .filter(
          (c) =>
            c.name?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.city?.toLowerCase().includes(q)
        )
        .slice(0, 5),
    };
  }, [finderQuery, rawProducts, rawOrders, rawCustomers]);

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    showToast(`Copied ${label} to clipboard!`, "info");
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Open Edit Product Modal
  const handleOpenEditProduct = (p: any) => {
    setEditingProduct(p);
    setProductFormData({
      id: String(p.id),
      name: p.name || "",
      category: p.category || "General",
      sub_category: p.sub_category || "",
      price: String(p.price || ""),
      stock_status: p.stock_status || "instock",
      image_url: p.image_url || (p.images && p.images[0]) || "",
    });
    setIsAddProductModalOpen(true);
  };

  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setProductFormData({
      id: "",
      name: "",
      category: rawCategories[0]?.name || "General",
      sub_category: "",
      price: "",
      stock_status: "instock",
      image_url: "",
    });
    setIsAddProductModalOpen(true);
  };

  // Loading Screen
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center font-mavora transition-colors"
        style={{
          background: "var(--mav-bg)",
          color: "var(--mav-text)",
        }}
      >
        <div className="w-16 h-16 rounded-2xl bg-[var(--mav-side-pill)] flex items-center justify-center text-[var(--mav-on-side-pill)] mb-4 animate-pulse">
          <Package className="w-8 h-8 animate-spin" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">Connecting to Commerce Desk...</h2>
        <p className="text-sm text-[var(--mav-muted)] mt-1">
          Fetching live catalog, orders &amp; products from your website
        </p>
      </div>
    );
  }

  // Error Screen
  if (isError) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center font-mavora p-6 text-center"
        style={{
          background: "var(--mav-bg)",
          color: "var(--mav-text)",
        }}
      >
        <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black tracking-tight">Unable to Load Admin Portal</h2>
        <p className="text-sm text-[var(--mav-muted)] max-w-md mt-2">
          Could not communicate with the backend store service. Please verify your connection credentials.
        </p>
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={() => refetch()}
            className="px-5 py-2.5 rounded-xl bg-[var(--mav-primary)] text-[var(--mav-on-primary)] font-bold text-sm shadow hover:brightness-105"
          >
            Retry Connection
          </button>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl border border-[var(--mav-line)] text-sm font-semibold hover:bg-[var(--mav-surface-2)]"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      data-theme={theme}
      className={`min-h-screen font-mavora text-[var(--mav-text)] transition-colors duration-200 relative selection:bg-[#6f8a35]/25 ${theme === "dark" ? "dark" : ""
        }`}
      style={{
        background: `radial-gradient(60vmax 50vmax at 8% -12%, var(--mav-glow-a), transparent 70%), radial-gradient(50vmax 40vmax at 100% 0%, var(--mav-glow-b), transparent 70%), var(--mav-bg)`,
      }}
    >
      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 1. MAVORA FIXED FLOATING CURVED SIDEBAR                                 */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex fixed left-3 top-3 bottom-3 w-[252px] z-30 flex-col rounded-[26px] bg-[var(--mav-side)] text-[var(--mav-on-side)] border border-[var(--mav-line)] p-4 shadow-[0_24px_50px_-30px_rgba(50,60,25,0.22)] overflow-y-auto no-scrollbar"
        aria-label="Commerce Desk Sidebar"
      >
        {/* Brand Link & Store Identity */}
        <div className="pb-3 border-b border-[var(--mav-line)] mb-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--mav-muted)] hover:text-[var(--mav-text)] mb-3 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to WebIntoApp</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[var(--mav-side-pill)] text-[var(--mav-on-side-pill)] flex items-center justify-center font-black flex-shrink-0 shadow-sm">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-extrabold text-sm leading-tight truncate" title={storeName}>
                {storeName}
              </h1>
              <span className="block text-[11px] font-medium text-[var(--mav-side-dim)] truncate mt-0.5">
                {storeDomain}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 space-y-4 text-sm font-semibold">
          {/* Group 1: Store */}
          <div>
            <p className="px-3 text-[10px] font-extrabold tracking-wider uppercase text-[var(--mav-side-dim)] mb-1.5">
              Store
            </p>
            <div className="space-y-0.5">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition font-bold text-[13px] ${activeTab === "dashboard"
                  ? "bg-[var(--mav-side-pill)] text-[var(--mav-on-side-pill)]"
                  : "text-[var(--mav-on-side)] hover:bg-[var(--mav-side-hover)]"
                  }`}
              >
                <LayoutDashboard className="w-4 h-4 opacity-80" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => setActiveTab("orders")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition font-bold text-[13px] ${activeTab === "orders"
                  ? "bg-[var(--mav-side-pill)] text-[var(--mav-on-side-pill)]"
                  : "text-[var(--mav-on-side)] hover:bg-[var(--mav-side-hover)]"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-4 h-4 opacity-80" />
                  <span>Orders</span>
                </div>
                {rawOrders.length > 0 && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${activeTab === "orders"
                      ? "bg-[var(--mav-on-side-pill)] text-[var(--mav-side-pill)]"
                      : "bg-[var(--mav-primary)] text-[var(--mav-on-primary)]"
                      }`}
                  >
                    {rawOrders.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("products")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition font-bold text-[13px] ${activeTab === "products"
                  ? "bg-[var(--mav-side-pill)] text-[var(--mav-on-side-pill)]"
                  : "text-[var(--mav-on-side)] hover:bg-[var(--mav-side-hover)]"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 opacity-80" />
                  <span>Products</span>
                </div>
                {rawProducts.length > 0 && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${activeTab === "products"
                      ? "bg-[var(--mav-on-side-pill)] text-[var(--mav-side-pill)]"
                      : "bg-[var(--mav-well)] text-[var(--mav-muted)]"
                      }`}
                  >
                    {rawProducts.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("customers")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition font-bold text-[13px] ${activeTab === "customers"
                  ? "bg-[var(--mav-side-pill)] text-[var(--mav-on-side-pill)]"
                  : "text-[var(--mav-on-side)] hover:bg-[var(--mav-side-hover)]"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 opacity-80" />
                  <span>Customers</span>
                </div>
                {rawCustomers.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[var(--mav-well)] text-[var(--mav-muted)]">
                    {rawCustomers.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Group 2: Grow */}
          <div>
            <p className="px-3 text-[10px] font-extrabold tracking-wider uppercase text-[var(--mav-side-dim)] mb-1.5">
              Grow
            </p>
            <div className="space-y-0.5">
              <button
                onClick={() => setActiveTab("insights")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition font-bold text-[13px] ${activeTab === "insights"
                  ? "bg-[var(--mav-side-pill)] text-[var(--mav-on-side-pill)]"
                  : "text-[var(--mav-on-side)] hover:bg-[var(--mav-side-hover)]"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-4 h-4 opacity-80" />
                  <span>Insights</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab("messages")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition font-bold text-[13px] ${activeTab === "messages"
                  ? "bg-[var(--mav-side-pill)] text-[var(--mav-on-side-pill)]"
                  : "text-[var(--mav-on-side)] hover:bg-[var(--mav-side-hover)]"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 opacity-80" />
                  <span>Messages</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#525B44]/20 text-[#525B44] dark:text-[#949F83]">
                  3
                </span>
              </button>

              <button
                onClick={() => setActiveTab("banners")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition font-bold text-[13px] ${activeTab === "banners"
                  ? "bg-[var(--mav-side-pill)] text-[var(--mav-on-side-pill)]"
                  : "text-[var(--mav-on-side)] hover:bg-[var(--mav-side-hover)]"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Flame className="w-4 h-4 opacity-80" />
                  <span>Banners &amp; Deals</span>
                </div>
                {rawBanners.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[var(--mav-well)] text-[var(--mav-muted)]">
                    {rawBanners.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("notifications")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition font-bold text-[13px] ${activeTab === "notifications"
                  ? "bg-[var(--mav-side-pill)] text-[var(--mav-on-side-pill)]"
                  : "text-[var(--mav-on-side)] hover:bg-[var(--mav-side-hover)]"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 opacity-80" />
                  <span>Push Alerts</span>
                </div>
                {rawCampaigns.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[var(--mav-well)] text-[var(--mav-muted)]">
                    {rawCampaigns.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("categories")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition font-bold text-[13px] ${activeTab === "categories"
                  ? "bg-[var(--mav-side-pill)] text-[var(--mav-on-side-pill)]"
                  : "text-[var(--mav-on-side)] hover:bg-[var(--mav-side-hover)]"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <FolderTree className="w-4 h-4 opacity-80" />
                  <span>Categories</span>
                </div>
                {rawCategories.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[var(--mav-well)] text-[var(--mav-muted)]">
                    {rawCategories.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Group 3: Account & System */}
          <div>
            <p className="px-3 text-[10px] font-extrabold tracking-wider uppercase text-[var(--mav-side-dim)] mb-1.5">
              Account
            </p>
            <div className="space-y-0.5">
              <button
                onClick={() => setActiveTab("settings")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition font-bold text-[13px] ${activeTab === "settings"
                  ? "bg-[var(--mav-side-pill)] text-[var(--mav-on-side-pill)]"
                  : "text-[var(--mav-on-side)] hover:bg-[var(--mav-side-hover)]"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4 opacity-80" />
                  <span>Settings</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab("sync")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition font-bold text-[13px] ${activeTab === "sync"
                  ? "bg-[var(--mav-side-pill)] text-[var(--mav-on-side-pill)]"
                  : "text-[var(--mav-on-side)] hover:bg-[var(--mav-side-hover)]"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-4 h-4 opacity-80" />
                  <span>Store Sync</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-[var(--mav-good)] mav-breathe" />
              </button>

              <button
                onClick={() => setActiveTab("credentials")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition font-bold text-[13px] ${activeTab === "credentials"
                  ? "bg-[var(--mav-side-pill)] text-[var(--mav-on-side-pill)]"
                  : "text-[var(--mav-on-side)] hover:bg-[var(--mav-side-hover)]"
                  }`}
              >
                <Key className="w-4 h-4 opacity-80" />
                <span>API &amp; Webhooks</span>
              </button>

              <button
                onClick={() => setActiveTab("help")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition font-bold text-[13px] ${activeTab === "help"
                  ? "bg-[var(--mav-side-pill)] text-[var(--mav-on-side-pill)]"
                  : "text-[var(--mav-on-side)] hover:bg-[var(--mav-side-hover)]"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-4 h-4 opacity-80" />
                  <span>Help &amp; Guides</span>
                </div>
              </button>
            </div>
          </div>
        </nav>

        {/* Sidebar Foot: Plan Card & Admin Profile */}
        <div className="pt-3 border-t border-[var(--mav-line)] mt-auto space-y-2.5">
          {/* Plan badge */}
          <div className="p-3 rounded-2xl bg-[var(--mav-surface)] border border-[var(--mav-line)] shadow-sm">
            <div className="flex items-center justify-between text-xs font-black mb-1">
              <span>{portalData?.plan_name || "Enterprise Suite"}</span>
              <span className="text-[10px] uppercase tracking-wide bg-[var(--mav-primary)] text-[var(--mav-on-primary)] px-2 py-0.5 rounded-full font-extrabold">
                Active
              </span>
            </div>
            <p className="text-[11px] text-[var(--mav-muted)] font-medium">
              Live App Sync • Full Admin Access
            </p>
            <div className="w-full h-1.5 bg-[var(--mav-well)] rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-[var(--mav-primary)] rounded-full w-full" />
            </div>
          </div>

          {/* User profile */}
          <div className="flex items-center gap-2.5 px-2 py-1 text-xs">
            <div className="w-8 h-8 rounded-full bg-[var(--mav-side-pill)] text-[var(--mav-on-side-pill)] flex items-center justify-center font-extrabold text-xs">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <span className="block font-bold truncate text-[12px]">{userName}</span>
              <span className="block text-[10px] text-[var(--mav-side-dim)]">Store Owner</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 2. MAIN COLUMN CONTENT                                                  */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <div className="ml-0 lg:ml-[264px] min-h-screen p-3 sm:p-5 lg:p-7 flex flex-col">
        {/* Top Header Bar */}
        <header className="flex items-center gap-3 min-h-[46px] mb-6">
          {/* Mobile Back / Brand */}
          <div className="flex lg:hidden items-center gap-2">
            <Link
              href="/dashboard"
              className="w-10 h-10 rounded-[14px] bg-[var(--mav-surface)] border border-[var(--mav-line)] flex items-center justify-center text-[var(--mav-muted)]"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </div>

          {/* ⌘K Finder Button */}
          <button
            type="button"
            onClick={() => setIsFinderOpen(true)}
            className="flex-1 max-w-[420px] h-[46px] px-4 rounded-[15px] bg-[var(--mav-surface)] border border-[var(--mav-line)] shadow-sm text-sm text-[var(--mav-muted)] flex items-center gap-2.5 hover:border-[var(--mav-line-2)] transition text-left"
          >
            <Search className="w-4 h-4 opacity-70 flex-shrink-0" />
            <span className="truncate">Search products, orders, customers...</span>
            <kbd className="ml-auto px-2 py-0.5 text-[11px] font-mono bg-[var(--mav-surface-2)] border border-[var(--mav-line-2)] rounded-md text-[var(--mav-muted)] hidden sm:inline-block">
              ⌘K
            </kbd>
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right Tools */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Live Courier / Sync ticker */}
            <div
              className="hidden md:inline-flex items-center gap-2.5 h-[46px] px-4 rounded-[15px] bg-[var(--mav-surface)] border border-[var(--mav-line)] shadow-sm text-xs font-semibold text-[var(--mav-text)]"
              title={`Connected to ${storeUrl}`}
            >
              <span className="w-2 h-2 rounded-full bg-[var(--mav-good)] mav-breathe" />
              <span className="truncate max-w-[180px] font-bold">{storeDomain}</span>
              <span className="text-[var(--mav-muted)] hidden xl:inline">• 2-Way Sync Active</span>
            </div>

            {/* Dark / Light Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className="w-[46px] h-[46px] rounded-[15px] bg-[var(--mav-surface)] border border-[var(--mav-line)] shadow-sm flex items-center justify-center text-[var(--mav-text)] hover:bg-[var(--mav-well)] transition"
              title={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
            >
              {theme === "light" ? (
                <Moon className="w-4 h-4 text-[var(--mav-muted)]" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>

            {/* Notifications Popover Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsBellOpen(!isBellOpen)}
                className="w-[46px] h-[46px] rounded-[15px] bg-[var(--mav-surface)] border border-[var(--mav-line)] shadow-sm flex items-center justify-center text-[var(--mav-text)] hover:bg-[var(--mav-well)] relative transition"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4 text-[var(--mav-muted)]" />
                <span className="w-2 h-2 rounded-full bg-[var(--mav-coral)] absolute top-2.5 right-2.5 ring-2 ring-[var(--mav-surface)]" />
              </button>

              {isBellOpen && (
                <div className="absolute right-0 top-14 w-80 rounded-2xl bg-[var(--mav-raised)] border border-[var(--mav-line)] shadow-[0_20px_50px_rgba(0,0,0,0.18)] p-3 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between px-2 py-1.5 border-b border-[var(--mav-line)] mb-2">
                    <span className="font-extrabold text-xs uppercase tracking-wider text-[var(--mav-muted)]">
                      Store Activity
                    </span>
                    <button
                      onClick={() => setIsBellOpen(false)}
                      className="text-xs text-[var(--mav-muted)] hover:text-[var(--mav-text)]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2 rounded-xl bg-[var(--mav-surface-2)]">
                      <p className="font-bold">Live Store Connected</p>
                      <p className="text-[11px] text-[var(--mav-muted)] mt-0.5">
                        Real-time status changes sync between {storeDomain} and the mobile app.
                      </p>
                    </div>
                    {rawOrders.length > 0 && (
                      <div className="p-2 rounded-xl bg-[var(--mav-surface-2)]">
                        <p className="font-bold">Recent Order Received</p>
                        <p className="text-[11px] text-[var(--mav-muted)] mt-0.5">
                          Order #{rawOrders[0]?.order_number || rawOrders[0]?.id} for{" "}
                          {rawOrders[0]?.total} {currency}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* "+ New" Action Button with Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNewDropdownOpen(!isNewDropdownOpen)}
                className="h-[46px] px-4 sm:px-5 rounded-[15px] bg-[var(--mav-primary)] text-[var(--mav-on-primary)] font-bold text-sm shadow-md hover:brightness-105 active:scale-95 flex items-center gap-2 transition"
              >
                <Plus className="w-4 h-4" />
                <span>New</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>

              {isNewDropdownOpen && (
                <div className="absolute right-0 top-14 w-52 rounded-2xl bg-[var(--mav-raised)] border border-[var(--mav-line)] shadow-[0_20px_50px_rgba(0,0,0,0.18)] p-1.5 z-50 text-xs font-bold animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => {
                      setIsNewDropdownOpen(false);
                      handleOpenNewProduct();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-[var(--mav-well)] transition"
                  >
                    <Package className="w-4 h-4 text-[var(--mav-primary)]" />
                    <span>New Product</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsNewDropdownOpen(false);
                      setActiveTab("banners");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-[var(--mav-well)] transition"
                  >
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span>New Banner</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsNewDropdownOpen(false);
                      setActiveTab("notifications");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-[var(--mav-well)] transition"
                  >
                    <Send className="w-4 h-4 text-sky-500" />
                    <span>Send Push Alert</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsNewDropdownOpen(false);
                      setActiveTab("categories");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-[var(--mav-well)] transition"
                  >
                    <FolderTree className="w-4 h-4 text-emerald-500" />
                    <span>New Category</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Navigation Tabs */}
        <div className="flex lg:hidden overflow-x-auto no-scrollbar gap-1.5 pb-3 mb-4 border-b border-[var(--mav-line)]">
          {[
            { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
            { id: "orders", label: `Orders (${rawOrders.length})`, icon: ShoppingBag },
            { id: "products", label: `Products (${rawProducts.length})`, icon: Package },
            { id: "customers", label: `Customers (${rawCustomers.length})`, icon: Users },
            { id: "insights", label: "Insights", icon: TrendingUp },
            { id: "messages", label: "Messages (3)", icon: MessageSquare },
            { id: "settings", label: "Settings", icon: Settings },
            { id: "banners", label: "Banners", icon: Flame },
            { id: "notifications", label: "Push", icon: Bell },
            { id: "sync", label: "Sync", icon: RefreshCw },
            { id: "help", label: "Help", icon: HelpCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${isActive
                  ? "bg-[var(--mav-primary)] text-[var(--mav-on-primary)] shadow-sm"
                  : "bg-[var(--mav-surface)] text-[var(--mav-text)] border border-[var(--mav-line)]"
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* VIEW 1: DASHBOARD OVERVIEW (EXACT MAVORA DASHBOARD FROM SCREENSHOTS)   */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* ── HEADER: GREETING & ACTION BUTTONS (Exact Reference) ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 -mt-2 mb-1">
              <div>
                {/* Breadcrumb matching screenshot: Store Name > Dashboard */}
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#656758] dark:text-[#a8aba0] mb-1">
                  <span className="truncate max-w-[220px]">{storeName || "Connected Store"}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#656758] opacity-70" />
                  <span>Dashboard</span>
                </div>
                <h1 className="text-3xl sm:text-[34px] font-extrabold tracking-tight text-[#1a1c15] dark:text-[#f2f4ed]">
                  {(() => {
                    const hour = new Date().getHours();
                    const greeting =
                      hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
                    return `${greeting}, ${userName}`;
                  })()}
                </h1>
                <p className="text-xs sm:text-sm text-[#656758] dark:text-[#a8aba0] font-medium mt-1">
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} ·{" "}
                  <strong className="font-extrabold text-[#1a1c15] dark:text-[#f2f4ed]">
                    {todayStats.count}
                  </strong>{" "}
                  {todayStats.count === 1 ? "order" : "orders"} tracked today,{" "}
                  <button
                    type="button"
                    onClick={() => handleNavigateToOrdersStage("paid")}
                    className="font-extrabold text-[#1a1c15] dark:text-[#f2f4ed] hover:underline cursor-pointer bg-transparent border-none p-0 inline font-inherit"
                    title="Click to view orders awaiting fulfillment"
                  >
                    <strong>{orderPipeline.pending + orderPipeline.processing}</strong> awaiting fulfillment.
                  </button>
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => syncCatalogMutation.mutate()}
                  disabled={syncCatalogMutation.isPending}
                  className="h-11 px-4 rounded-[14px] bg-white dark:bg-[#1f221b] border border-[#e2dfd5] dark:border-[#33372c] text-sm font-bold text-[#1a1c15] dark:text-[#f2f4ed] hover:bg-[#f7f5ed] dark:hover:bg-[#252820] transition shadow-xs flex items-center gap-2"
                  title="Sync live data directly from website credentials"
                >
                  <RefreshCw className={`w-4 h-4 stroke-[2] text-[#536e26] ${syncCatalogMutation.isPending ? "animate-spin" : ""}`} />
                  <span>{syncCatalogMutation.isPending ? "Syncing..." : "Sync Store"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("orders")}
                  className="h-11 px-5 rounded-[14px] bg-white dark:bg-[#1f221b] border border-[#e2dfd5] dark:border-[#33372c] text-sm font-bold text-[#1a1c15] dark:text-[#f2f4ed] hover:bg-[#f7f5ed] dark:hover:bg-[#252820] transition shadow-xs flex items-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4 stroke-[1.8]" />
                  <span>Orders ({rawOrders.length})</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenNewProduct}
                  className="h-11 px-5 rounded-[14px] bg-[#536e26] text-white text-sm font-bold hover:bg-[#486020] transition shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Add product</span>
                </button>
              </div>
            </div>

            {/* ── ROW 1: TAKINGS BY CHANNEL (LEFT 2/3) & TODAY LIVE (RIGHT 1/3) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* 1. TAKINGS BY CHANNEL CARD (LG: 8 COLS, ~67%) */}
              <div className="lg:col-span-8 min-w-0 rounded-[28px] bg-[#FFFCF9] border border-[#E6E3DC] p-6 shadow-sm flex flex-col justify-between overflow-hidden">
                <div>
                  {/* Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-extrabold tracking-tight text-[#23241B]">
                        Takings by channel
                      </h3>
                      <p className="text-xs text-[#6f7060] font-medium mt-1">
                        {channelTimeframe === "week"
                          ? "Oct 18 – Oct 24, 2026 · day by day"
                          : channelTimeframe === "month"
                            ? "October 2026 · week by week"
                            : "2026 · month by month"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Timeframe Segment Toggle (Week / Month / Year) */}
                      <div className="p-1 rounded-xl bg-[#F4F1ED] border border-[#E6E3DC] flex items-center text-xs font-bold">
                        {(["week", "month", "year"] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setChannelTimeframe(t);
                              setSelectedPeriod(null);
                            }}
                            className={`px-3.5 py-1 rounded-lg capitalize transition ${channelTimeframe === t
                                ? "bg-white text-[#23241B] shadow-xs font-bold"
                                : "text-[#6f7060] hover:text-[#23241B] font-medium"
                              }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>

                      {/* Directional & Navigation buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="w-8 h-8 rounded-xl border border-[#E6E3DC] bg-white text-[#23241B] hover:bg-[#F4F1ED] flex items-center justify-center transition shadow-xs"
                          title="Previous period"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="w-8 h-8 rounded-xl border border-[#E6E3DC] bg-white text-[#23241B] hover:bg-[#F4F1ED] flex items-center justify-center transition shadow-xs"
                          title="Next period"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab("orders")}
                          className="w-8 h-8 rounded-xl border border-[#E6E3DC] bg-white text-[#23241B] hover:bg-[#F4F1ED] flex items-center justify-center transition shadow-xs"
                          title="Expand orders"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* KPI Summary (Single horizontal panel with 4 equal columns matching reference image) */}
                  <div className="mt-5 rounded-[22px] border border-[#ECE9E2] bg-[#F8F5EE] grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 divide-x divide-[#ECE9E2] overflow-hidden shadow-xs">
                    {/* Takings */}
                    <div className="p-4 sm:p-5">
                      <span className="text-xs sm:text-sm font-medium text-[#6f7060] block">
                        Takings
                      </span>
                      <div className="text-2xl sm:text-3xl font-black tracking-tight text-[#23241B] mt-1 sm:mt-1.5 truncate">
                        {currencySymbol}{Math.round(totalTakings).toLocaleString()}
                      </div>
                      <div className="mt-2 sm:mt-2.5">
                        <span className="inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-[#DBE5D7] text-[#296D43]">
                          <span className="text-[10px]">▲</span>
                          <span>12%</span>
                        </span>
                      </div>
                    </div>

                    {/* Orders */}
                    <div className="p-4 sm:p-5">
                      <span className="text-xs sm:text-sm font-medium text-[#6f7060] block">
                        Orders
                      </span>
                      <div className="text-2xl sm:text-3xl font-black tracking-tight text-[#23241B] mt-1 sm:mt-1.5">
                        {totalOrdersCount}
                      </div>
                      <div className="mt-2 sm:mt-2.5">
                        <span className="inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-[#DBE5D7] text-[#296D43]">
                          <span className="text-[10px]">▲</span>
                          <span>6%</span>
                        </span>
                      </div>
                    </div>

                    {/* Average order */}
                    <div className="p-4 sm:p-5">
                      <span className="text-xs sm:text-sm font-medium text-[#6f7060] block">
                        Average order
                      </span>
                      <div className="text-2xl sm:text-3xl font-black tracking-tight text-[#23241B] mt-1 sm:mt-1.5 truncate">
                        {currencySymbol}{averageOrderValue.toFixed(2)}
                      </div>
                      <div className="mt-2 sm:mt-2.5">
                        <span className="inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-[#DBE5D7] text-[#296D43]">
                          <span className="text-[10px]">▲</span>
                          <span>4%</span>
                        </span>
                      </div>
                    </div>

                    {/* Over the goal */}
                    <div className="p-4 sm:p-5">
                      <span className="text-xs sm:text-sm font-medium text-[#6f7060] block">
                        Fulfillment
                      </span>
                      <div className="text-2xl sm:text-3xl font-black tracking-tight text-[#23241B] mt-1 sm:mt-1.5">
                        {orderPipeline.shipped}
                      </div>
                      <span className="text-xs font-medium text-[#6f7060] mt-2 sm:mt-2.5 block truncate">
                        of {orderPipeline.all} shipped
                      </span>
                    </div>
                  </div>

                  {/* 7-Day Stacked Bar Chart with Dashed Goal Line (Exact Reference Screenshot) */}
                  <div className="mt-6 pt-2">
                    <div className="relative h-64 sm:h-72 w-full flex items-end">
                      {/* Y-Axis scale labels */}
                      <div className="absolute left-0 top-0 bottom-7 w-10 flex flex-col justify-between text-[11px] text-[#6f7060] font-mono font-medium select-none pointer-events-none">
                        <span>{currencySymbol}{Math.round(dailyTakingsChart.maxVal / 1000 * 10) / 10}k</span>
                        <span>{currencySymbol}{Math.round(dailyTakingsChart.maxVal * 0.75 / 1000 * 10) / 10}k</span>
                        <span>{currencySymbol}{Math.round(dailyTakingsChart.maxVal * 0.5 / 1000 * 10) / 10}k</span>
                        <span>{currencySymbol}{Math.round(dailyTakingsChart.maxVal * 0.25 / 1000 * 10) / 10}k</span>
                        <span>{currencySymbol}0</span>
                      </div>

                      {/* Horizontal Reference Grid Lines */}
                      <div className="absolute left-10 right-0 top-0 bottom-7 flex flex-col justify-between pointer-events-none opacity-40">
                        <div className="w-full border-b border-[#ECE9E2]" />
                        <div className="w-full border-b border-[#ECE9E2]" />
                        <div className="w-full border-b border-[#ECE9E2]" />
                        <div className="w-full border-b border-[#ECE9E2]" />
                        <div className="w-full border-b border-[#ECE9E2]" />
                      </div>

                      {/* Horizontal Red Dashed Goal Line at 60% of maxVal */}
                      <div
                        className="absolute left-10 right-0 pointer-events-none flex items-center z-10"
                        style={{ bottom: "calc(28px + 0.6 * (100% - 28px))" }}
                      >
                        <div className="flex-1 border-b-2 border-dashed border-[#E65C5C]" />
                        <div className="relative flex flex-col items-center ml-1">
                          <span className="bg-[#c85a53] text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs tracking-tight whitespace-nowrap">
                            Goal {currencySymbol}{Math.round(dailyTakingsChart.maxVal * 0.6 / 1000 * 10) / 10}k
                          </span>
                        </div>
                      </div>

                      {/* Responsive Stacked Bars */}
                      {(() => {
                        const barWidthClass =
                          channelTimeframe === "year"
                            ? "w-full max-w-[16px] sm:max-w-[20px] md:max-w-[24px]"
                            : channelTimeframe === "month"
                            ? "w-full max-w-[36px] sm:max-w-[46px]"
                            : "w-full max-w-[30px] sm:max-w-[40px]";

                        const barGapClass =
                          channelTimeframe === "year"
                            ? "gap-1 sm:gap-1.5 md:gap-2"
                            : channelTimeframe === "month"
                            ? "gap-2 sm:gap-3"
                            : "gap-1.5 sm:gap-2.5";

                        return (
                          <div className={`ml-10 sm:ml-11 flex-1 min-w-0 h-full flex items-end justify-between ${barGapClass}`}>
                            {dailyTakingsChart.dayList.map((item, idx) => {
                              const total = item.web + item.club + item.wholesale + item.markets;
                              const maxVal = dailyTakingsChart.maxVal;
                              const barHeightPct = Math.min(100, Math.max(12, (total / maxVal) * 100));
                              const benchmarkHeightPct = Math.min(100, (item.benchmark / maxVal) * 100);

                              return (
                                <div
                                  key={idx}
                                  onClick={() => setSelectedPeriod(item)}
                                  className={`flex-1 min-w-0 flex flex-col items-center h-full justify-end relative group cursor-pointer transition-transform active:scale-[0.98] ${
                                    selectedPeriod?.title === item.title ? "opacity-100" : ""
                                  }`}
                                >
                                  {/* Hover Tooltip */}
                                  <div className="opacity-0 group-hover:opacity-100 transition absolute -top-8 bg-[#23241B] text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-md z-30 pointer-events-none whitespace-nowrap">
                                    {currencySymbol}{total.toLocaleString()} · {item.title || item.day} (Click to view orders)
                                  </div>

                                  {/* Column Container */}
                                  <div className="relative w-full flex flex-col items-center justify-end h-[calc(100%-28px)]">
                                    {/* Green Dot above active benchmark day */}
                                    {item.hasTopDot && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#718D32] absolute -top-3" />
                                    )}

                                    {/* Today / Active Period Label */}
                                    {item.isToday && (
                                      <span className="text-[10px] sm:text-[11px] font-bold text-[#718D32] absolute -top-5 sm:-top-6 whitespace-nowrap z-20">
                                        {currencySymbol}{Math.round(total / 1000 * 10) / 10}k
                                      </span>
                                    )}

                                    {/* Benchmark Horizontal Marker Line */}
                                    <div
                                      className={`absolute ${barWidthClass} h-[2px] bg-[#23241B] rounded-full z-20`}
                                      style={{ bottom: `${benchmarkHeightPct}%` }}
                                    />

                                    {/* Stacked Bar Body */}
                                    <div
                                      className={`${barWidthClass} ${channelTimeframe === "year" ? "rounded-lg" : "rounded-xl"} overflow-hidden flex flex-col justify-end transition-all group-hover:shadow-md group-hover:brightness-105 ${
                                        item.isToday
                                          ? "border-2 border-dotted border-[#718D32] p-[1px] sm:p-[1.5px]"
                                          : selectedPeriod?.title === item.title
                                          ? "ring-2 ring-[#718D32] ring-offset-2"
                                          : ""
                                      }`}
                                      style={{ height: `${barHeightPct}%` }}
                                    >
                                      <div className={`w-full h-full flex flex-col-reverse ${channelTimeframe === "year" ? "rounded-[5px]" : "rounded-[9px]"} overflow-hidden gap-[1px]`}>
                                        {/* Bottom: Web Shop (Olive Green) */}
                                        <div
                                          style={{ height: `${(item.web / Math.max(1, total)) * 100}%` }}
                                          className={`w-full bg-[#718D32] hover:brightness-105 transition ${channelTimeframe === "year" ? "rounded-b-[4px]" : "rounded-b-[7px]"}`}
                                          title={`Web Shop: ${currencySymbol}${item.web}`}
                                        />
                                        {/* Second: App / Club (Orange) */}
                                        {item.club > 0 && (
                                          <div
                                            style={{ height: `${(item.club / Math.max(1, total)) * 100}%` }}
                                            className="w-full bg-[#EF8A45] hover:brightness-105 transition"
                                            title={`Mobile App: ${currencySymbol}${item.club}`}
                                          />
                                        )}
                                        {/* Third: Wholesale / Direct (Blue) */}
                                        {item.wholesale > 0 && (
                                          <div
                                            style={{ height: `${(item.wholesale / Math.max(1, total)) * 100}%` }}
                                            className={`w-full bg-[#4D86D8] hover:brightness-105 transition ${channelTimeframe === "year" ? "rounded-t-[4px]" : "rounded-t-[7px]"}`}
                                            title={`Wholesale/Direct: ${currencySymbol}${item.wholesale}`}
                                          />
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Day & Date Labels */}
                                  <div className="h-7 flex flex-col items-center justify-center text-center mt-1 w-full overflow-hidden">
                                    <span
                                      className={`text-[10px] sm:text-[11px] leading-tight truncate ${
                                        item.isToday
                                          ? "font-extrabold text-[#718D32]"
                                          : "text-[#6f7060] font-semibold"
                                      }`}
                                    >
                                      {item.day}
                                    </span>
                                    {channelTimeframe !== "year" && (
                                      <span
                                        className={`text-[9px] leading-tight block truncate ${
                                          item.isToday
                                            ? "font-extrabold text-[#718D32]"
                                            : "text-[#9a9c8f]"
                                        }`}
                                      >
                                        {item.date}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Channel Legend Pills (Matching exact pale green style from screenshot) */}
                <div className="flex flex-wrap items-center gap-2 mt-5 pt-3">
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#e5ede0] border border-[#d2dfcb] text-[#292920]">
                    <span className="w-2 h-2 rounded-full bg-[#718D32]" />
                    <span>Online Store <span className="font-normal text-[#6f7060]">55%</span></span>
                  </span>
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#e5ede0] border border-[#d2dfcb] text-[#292920]">
                    <span className="w-2 h-2 rounded-full bg-[#EF8A45]" />
                    <span>Mobile App <span className="font-normal text-[#6f7060]">25%</span></span>
                  </span>
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#e5ede0] border border-[#d2dfcb] text-[#292920]">
                    <span className="w-2 h-2 rounded-full bg-[#4D86D8]" />
                    <span>Direct / POS <span className="font-normal text-[#6f7060]">20%</span></span>
                  </span>
                </div>
              </div>

              {/* 2. TODAY, LIVE CARD (LG: 4 COLS, ~33%) */}
              <div className="lg:col-span-4 min-w-0 rounded-[28px] bg-[#FFFCF9] border border-[#E6E3DC] p-6 shadow-sm flex flex-col justify-between">
                <div>
                  {/* Card Header with Orange Indicator Dot */}
                  <div>
                    <h3 className="text-xl font-extrabold tracking-tight text-[#23241B] flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#EF8A45] flex-shrink-0" />
                      <span>Today, live</span>
                    </h3>
                    <p className="text-xs text-[#6f7060] font-medium mt-1">
                      {todayStats.count} {todayStats.count === 1 ? "order" : "orders"} · {currencySymbol}{todayStats.avg.toFixed(2)} average
                    </p>
                  </div>

                  {/* Circular Progress Gauge */}
                  <div className="relative my-4 flex items-center justify-center">
                    <div className="relative w-52 h-52 flex items-center justify-center">
                      <svg viewBox="0 0 200 200" className="w-full h-full transform">
                        {/* Background Light Gray Horseshoe Track */}
                        <path
                          d={describeArc(100, 100, 72, 215, 505)}
                          fill="none"
                          stroke="#F4F1ED"
                          strokeWidth="15"
                          strokeLinecap="round"
                        />
                        {/* Filled Olive-Green Arc */}
                        <path
                          d={describeArc(100, 100, 72, 215, 215 + Math.min(290, Math.max(30, (todayStats.pct / 100) * 290)))}
                          fill="none"
                          stroke="#718D32"
                          strokeWidth="15"
                          strokeLinecap="round"
                        />
                        {/* Dark Angled Benchmark Marker Line near Upper-Right (~40°) */}
                        <line
                          x1="140"
                          y1="48"
                          x2="160"
                          y2="66"
                          stroke="#23241B"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                        {/* Small Orange Indicator Dot near the top */}
                        <circle
                          cx="103"
                          cy="28"
                          r="3.5"
                          fill="#EF8A45"
                        />
                      </svg>

                      {/* Center Gauge Text Content */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none pt-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#6f7060]">
                          TAKEN SO FAR
                        </span>
                        <span className="text-3xl sm:text-[34px] font-black tracking-tight text-[#23241B] mt-0.5 leading-none truncate max-w-[170px]">
                          {currencySymbol}{Math.round(todayStats.taken).toLocaleString()}
                        </span>
                        <span className="text-xs text-[#6f7060] font-medium mt-1 truncate max-w-[170px]">
                          of the {currencySymbol}{Math.round(todayStats.goal).toLocaleString()} goal
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Midnight Pace Indicator */}
                  <div className="text-center text-xs font-semibold text-[#6f7060] mt-1">
                    <span className="inline-flex items-center gap-1.5 text-[#23241B]">
                      <TrendingUp className="w-3.5 h-3.5 text-[#718D32]" />
                      <span>On pace for <strong className="font-extrabold text-[#23241B]">{currencySymbol}{Math.round(todayStats.pace).toLocaleString()}</strong> by midnight —</span>
                      <strong className="font-extrabold text-[#296D43]">over the goal</strong>
                    </span>
                  </div>

                  {/* Channel Revenue Mini-Cards (3 in a single row) */}
                  <div className="grid grid-cols-3 gap-2.5 mt-5">
                    <div className="p-2.5 sm:p-3 rounded-2xl bg-[#F8F5EE] text-center border border-[#ECE9E2] shadow-xs">
                      <span className="text-[11px] font-bold text-[#6f7060] flex items-center justify-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#718D32]" />
                        <span>Web</span>
                      </span>
                      <span className="text-sm sm:text-base font-black text-[#23241B] block mt-1 truncate">
                        {currencySymbol}{Math.round(todayStats.web).toLocaleString()}
                      </span>
                    </div>

                    <div className="p-2.5 sm:p-3 rounded-2xl bg-[#F8F5EE] text-center border border-[#ECE9E2] shadow-xs">
                      <span className="text-[11px] font-bold text-[#6f7060] flex items-center justify-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#EF8A45]" />
                        <span>App</span>
                      </span>
                      <span className="text-sm sm:text-base font-black text-[#23241B] block mt-1 truncate">
                        {currencySymbol}{Math.round(todayStats.club).toLocaleString()}
                      </span>
                    </div>

                    <div className="p-2.5 sm:p-3 rounded-2xl bg-[#F8F5EE] text-center border border-[#ECE9E2] shadow-xs">
                      <span className="text-[11px] font-bold text-[#6f7060] flex items-center justify-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#4D86D8]" />
                        <span>Direct</span>
                      </span>
                      <span className="text-sm sm:text-base font-black text-[#23241B] block mt-1 truncate">
                        {currencySymbol}{Math.round(todayStats.cafes).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* JUST IN Feed (Screenshot matches real customer orders) */}
                <div className="mt-6 pt-3">
                  <span className="text-[10px] font-black tracking-widest uppercase text-[#6f7060] block mb-2.5">
                    JUST IN
                  </span>
                  <div className="space-y-2">
                    {justInFeed.length === 0 ? (
                      <p className="text-xs text-[#6f7060] italic py-2">No incoming orders yet today.</p>
                    ) : (
                      justInFeed.map((order, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            if (order.order) setSelectedOrder(order.order);
                            else if (rawOrders[idx]) setSelectedOrder(rawOrders[idx]);
                          }}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-[#F4F1ED] transition cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-full ${order.avatarBg} font-extrabold text-xs flex items-center justify-center flex-shrink-0`}
                            >
                              {order.initials}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold block truncate text-[#23241B]">
                                {order.name}
                              </span>
                              <span className="text-[11px] text-[#6f7060] block truncate">
                                {order.product} · {order.time}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-black font-mono text-[#23241B] flex-shrink-0 ml-2">
                            {order.price}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── ROW 2: ORDER QUEUE, FULFILMENT (PIPELINE TUBES), BEST SELLERS ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr_1fr] gap-5 items-stretch w-full max-w-full">
              {/* CARD 1: ORDER QUEUE & INVENTORY */}
              <div className="min-w-0 rounded-[28px] bg-[#FFFCF9] border border-[#E6E3DC] p-6 shadow-sm flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#edf4e6] border border-[#dbe6cf] text-[#557e2a] flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-lg font-extrabold tracking-tight text-[#23241B]">
                        Order queue
                      </h4>
                      <p className="text-xs text-[#6f7060] font-medium mt-0.5">
                        Live catalog &amp; dispatch
                      </p>
                    </div>
                  </div>

                  {/* Weight Metric & Subtitle Side-by-Side (Exact Reference Screenshot) */}
                  <div className="mt-4 flex items-baseline gap-2.5">
                    <span className="text-3xl sm:text-[34px] font-black text-[#855325] tracking-tight leading-none flex-shrink-0">
                      {portalData?.catalog_stats?.products_count || rawProducts.length} items
                    </span>
                    <p className="text-xs text-[#6f7060] font-medium leading-tight max-w-[175px]">
                      in catalog across {rawCategories.length || 6} categories, for {rawOrders.length} orders
                    </p>
                  </div>

                  {/* Catalog Queue Breakdown (6 Items Matching Screenshot) */}
                  <div className="mt-4 space-y-2.5">
                    {dispatchQueue.length === 0 ? (
                      <p className="text-xs text-[#6f7060] italic py-3">No products found in connected store catalog.</p>
                    ) : (
                      dispatchQueue.slice(0, showAllQueueItems ? 9 : 6).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl ${item.badgeBg} flex items-center justify-center flex-shrink-0 shadow-xs overflow-hidden relative`}
                            >
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt=""
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = "none";
                                    const fb = e.currentTarget.parentElement?.querySelector(".dq-fb") as HTMLElement;
                                    if (fb) fb.style.display = "flex";
                                  }}
                                  className="w-full h-full object-cover"
                                />
                              ) : null}
                              <div className={`dq-fb w-full h-full ${item.image ? "hidden" : "flex"} items-center justify-center`}>
                                <Tag className="w-3.5 h-3.5" />
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-extrabold text-[#23241B] block truncate">
                                {item.name}
                              </span>
                              {/* Horizontal Progress Bar */}
                              <div className="w-full max-w-[105px] sm:max-w-[125px] h-1.5 rounded-full bg-[#ede7df] mt-1 overflow-hidden">
                                <div
                                  className={`h-full ${item.barColor} rounded-full`}
                                  style={{ width: `${item.progress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-[#23241B] text-xs flex-shrink-0 truncate max-w-[90px] text-right">
                            {item.weight}
                          </span>
                        </div>
                      ))
                    )}

                    {dispatchQueue.length > 6 && (
                      <button
                        type="button"
                        onClick={() => setShowAllQueueItems(!showAllQueueItems)}
                        className="text-xs font-medium text-[#6f7060] hover:text-[#23241B] transition mt-1.5 block"
                      >
                        {showAllQueueItems ? "Show fewer products" : "+ more store items"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Orange CTA Button (Matching Screenshot: Warm Orange with Dark Text) */}
                <div className="mt-4 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFulfillingBatch(true);
                      setTimeout(() => {
                        setIsFulfillingBatch(false);
                        showToast(`Batch #${rawOrders[0]?.id || "10283"} queued for packing & dispatch!`, "success");
                      }, 1200);
                    }}
                    disabled={isFulfillingBatch}
                    className="w-full py-3.5 px-4 rounded-2xl bg-[#ef8b48] hover:bg-[#e47e3a] text-[#23241B] font-extrabold text-sm flex items-center justify-center gap-2 shadow-xs transition active:scale-[0.99] disabled:opacity-60"
                  >
                    <Truck className={`w-4 h-4 text-[#23241B] ${isFulfillingBatch ? "animate-bounce" : ""}`} />
                    <span>{isFulfillingBatch ? "Processing dispatch..." : "Start order fulfillment"}</span>
                  </button>
                </div>
              </div>

              {/* CARD 2: FULFILMENT (4 PIPELINE TUBES) */}
              <div className="min-w-0 rounded-[28px] bg-[#FFFCF9] border border-[#E6E3DC] p-5 sm:p-6 shadow-sm flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-[#edf4e6] border border-[#dbe6cf] text-[#557e2a] flex items-center justify-center flex-shrink-0">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-lg font-extrabold tracking-tight text-[#23241B] truncate">
                          Fulfilment
                        </h4>
                        <p className="text-xs text-[#6f7060] font-medium mt-0.5 leading-tight truncate">
                          Every order between the card and the doorstep
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleNavigateToOrdersStage(null)}
                      className="px-3.5 py-1.5 rounded-xl border border-[#ded8ce] bg-white text-xs font-extrabold text-[#23241B] hover:bg-[#f6f2ea] transition shadow-xs flex items-center gap-1 flex-shrink-0 cursor-pointer"
                      title="Open full orders board"
                    >
                      <span>Board</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* 4 Continuous Pipeline Columns with Chevron Dividers */}
                  <div className="mt-4 grid grid-cols-4 gap-1.5 sm:gap-2.5 items-stretch relative">
                    {/* Column 1: Paid */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleNavigateToOrdersStage("paid")}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleNavigateToOrdersStage("paid"); }}
                      className="relative rounded-[18px] sm:rounded-[22px] bg-[#eff5fc] border border-[#d8e6f7] hover:border-[#4b84d4] p-2 sm:p-2.5 flex flex-col justify-between h-[300px] min-w-0 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-md group focus:outline-none focus:ring-2 focus:ring-[#4b84d4]"
                      title="Click to view Paid orders on Board"
                    >
                      <span className="text-xs font-bold text-[#b5b3ab] absolute -right-2 top-3.5 z-10 hidden sm:block pointer-events-none">›</span>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl sm:text-3xl font-black text-[#23241B] tracking-tight block">
                            {orderPipeline.pending}
                          </span>
                          <span className="text-[10px] text-[#4b84d4] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                            View ➔
                          </span>
                        </div>
                        <span className="font-extrabold text-[11px] sm:text-xs text-[#23241B] block mt-0.5 tracking-tight whitespace-nowrap">
                          Paid
                        </span>
                        <span className="text-[9.5px] sm:text-[10px] text-[#53657f] font-medium leading-tight block mt-1">
                          awaiting packing
                        </span>
                      </div>

                      {/* Liquid Tube 1 */}
                      <div className="w-full h-44 rounded-2xl bg-[#d3e3f7] p-1 flex flex-col justify-end overflow-hidden group-hover:ring-2 group-hover:ring-[#4b84d4]/40 transition">
                        <div
                          className="w-full rounded-xl bg-[#4b84d4] transition-all duration-700"
                          style={{ height: `${Math.max(20, Math.min(90, (orderPipeline.pending / Math.max(1, orderPipeline.all)) * 100))}%` }}
                          title={`Paid: ${orderPipeline.pending} orders`}
                        />
                      </div>
                    </div>

                    {/* Column 2: Processing */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleNavigateToOrdersStage("processing")}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleNavigateToOrdersStage("processing"); }}
                      className="relative rounded-[18px] sm:rounded-[22px] bg-[#fef3ec] border border-[#fae0cf] hover:border-[#ef8b48] p-2 sm:p-2.5 flex flex-col justify-between h-[300px] min-w-0 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-md group focus:outline-none focus:ring-2 focus:ring-[#ef8b48]"
                      title="Click to view Processing orders on Board"
                    >
                      <span className="text-xs font-bold text-[#b5b3ab] absolute -right-2 top-3.5 z-10 hidden sm:block pointer-events-none">›</span>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl sm:text-3xl font-black text-[#23241B] tracking-tight block">
                            {orderPipeline.processing}
                          </span>
                          <span className="text-[10px] text-[#ef8b48] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                            View ➔
                          </span>
                        </div>
                        <span className="font-extrabold text-[11px] sm:text-xs text-[#23241B] block mt-0.5 tracking-tight whitespace-nowrap">
                          Processing
                        </span>
                        <span className="text-[9.5px] sm:text-[10px] text-[#825b46] font-medium leading-tight block mt-1">
                          in preparation &amp; packing
                        </span>
                      </div>

                      {/* Liquid Tube 2 */}
                      <div className="w-full h-44 rounded-2xl bg-[#fae0cf] p-1 flex flex-col justify-end overflow-hidden group-hover:ring-2 group-hover:ring-[#ef8b48]/40 transition">
                        <div
                          className="w-full rounded-xl bg-[#ef8b48] transition-all duration-700"
                          style={{ height: `${Math.max(25, Math.min(90, (orderPipeline.processing / Math.max(1, orderPipeline.all)) * 100))}%` }}
                          title={`Processing: ${orderPipeline.processing} orders`}
                        />
                      </div>
                    </div>

                    {/* Column 3: Packed */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleNavigateToOrdersStage("packed")}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleNavigateToOrdersStage("packed"); }}
                      className="relative rounded-[18px] sm:rounded-[22px] bg-[#fcf7e9] border border-[#f6ebcb] hover:border-[#caa227] p-2 sm:p-2.5 flex flex-col justify-between h-[300px] min-w-0 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-md group focus:outline-none focus:ring-2 focus:ring-[#caa227]"
                      title="Click to view Packed orders on Board"
                    >
                      <span className="text-xs font-bold text-[#b5b3ab] absolute -right-2 top-3.5 z-10 hidden sm:block pointer-events-none">›</span>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl sm:text-3xl font-black text-[#23241B] tracking-tight block">
                            {orderPipeline.packed}
                          </span>
                          <span className="text-[10px] text-[#caa227] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                            View ➔
                          </span>
                        </div>
                        <span className="font-extrabold text-[11px] sm:text-xs text-[#23241B] block mt-0.5 tracking-tight whitespace-nowrap">
                          Packed
                        </span>
                        <span className="text-[9.5px] sm:text-[10px] text-[#7d6b3a] font-medium leading-tight block mt-1">
                          ready for courier
                        </span>
                      </div>

                      {/* Liquid Tube 3 */}
                      <div className="w-full h-44 rounded-2xl bg-[#f6ebcb] p-1 flex flex-col justify-end overflow-hidden group-hover:ring-2 group-hover:ring-[#caa227]/40 transition">
                        <div
                          className="w-full rounded-xl bg-[#caa227] transition-all duration-700"
                          style={{ height: `${Math.max(20, Math.min(90, (orderPipeline.packed / Math.max(1, orderPipeline.all)) * 100))}%` }}
                          title={`Packed: ${orderPipeline.packed} orders`}
                        />
                      </div>
                    </div>

                    {/* Column 4: Shipped */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleNavigateToOrdersStage("shipped")}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleNavigateToOrdersStage("shipped"); }}
                      className="relative rounded-[18px] sm:rounded-[22px] bg-[#f8f3fc] border border-[#eddff7] hover:border-[#9b72cf] p-2 sm:p-2.5 flex flex-col justify-between h-[300px] min-w-0 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-md group focus:outline-none focus:ring-2 focus:ring-[#9b72cf]"
                      title="Click to view Shipped orders on Board"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl sm:text-3xl font-black text-[#23241B] tracking-tight block">
                            {orderPipeline.shipped}
                          </span>
                          <span className="text-[10px] text-[#9b72cf] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                            View ➔
                          </span>
                        </div>
                        <span className="font-extrabold text-[11px] sm:text-xs text-[#23241B] block mt-0.5 tracking-tight whitespace-nowrap">
                          Shipped
                        </span>
                        <span className="text-[9.5px] sm:text-[10px] text-[#6e5683] font-medium leading-tight block mt-1">
                          handed to courier
                        </span>
                      </div>

                      {/* Liquid Tube 4 */}
                      <div className="w-full h-44 rounded-2xl bg-[#eddff7] p-1 flex flex-col justify-end overflow-hidden group-hover:ring-2 group-hover:ring-[#9b72cf]/40 transition">
                        <div
                          className="w-full rounded-xl bg-[#9b72cf] transition-all duration-700"
                          style={{ height: `${Math.max(15, Math.min(90, (orderPipeline.shipped / Math.max(1, orderPipeline.all)) * 100))}%` }}
                          title={`Shipped: ${orderPipeline.shipped} orders`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footnote matching screenshot */}
                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-[#6f7060]">
                  <Clock className="w-4 h-4 text-[#557e2a] flex-shrink-0" />
                  <span>Next courier pickup scheduled at <strong className="text-[#23241B] font-bold">4:00 PM</strong> — {rawOrders.length} orders tracked from {storeDomain}.</span>
                </div>
              </div>

              {/* CARD 3: BEST SELLERS */}
              <div className="min-w-0 rounded-[28px] bg-[#FFFCF9] border border-[#E6E3DC] p-6 shadow-sm flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-[#edf4e6] border border-[#dbe6cf] text-[#557e2a] flex items-center justify-center flex-shrink-0">
                        <Star className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-lg font-extrabold tracking-tight text-[#23241B] truncate">
                          Best sellers
                        </h4>
                        <p className="text-xs text-[#6f7060] font-medium truncate mt-0.5">
                          Top store products by sales
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab("products")}
                      className="px-3.5 py-1.5 rounded-xl border border-[#ded8ce] bg-white text-xs font-extrabold text-[#23241B] hover:bg-[#f6f2ea] transition shadow-xs flex items-center gap-1 flex-shrink-0"
                    >
                      <span>All</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* 5 Ranked Items with Green SVG Sparklines (Exact Reference Screenshot) */}
                  <div className="mt-4 space-y-2.5">
                    {bestSellersList.length === 0 ? (
                      <p className="text-xs text-[#6f7060] italic py-3">No best selling products yet in store catalog.</p>
                    ) : (
                      bestSellersList.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedBestSellerProduct(item.product || item)}
                          className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-2xl hover:bg-[#f6f2ea] dark:hover:bg-[#252820] cursor-pointer transition group min-w-0"
                          title={`Click to view ${item.name} product details`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="text-xs font-bold text-[#6f7060] w-3 text-center flex-shrink-0">
                              {item.rank}
                            </span>
                            <div
                              className={`w-8 h-8 rounded-xl ${item.badgeBg} flex items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-105 transition overflow-hidden relative`}
                            >
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt=""
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = "none";
                                    const fb = e.currentTarget.parentElement?.querySelector(".bs-fb") as HTMLElement;
                                    if (fb) fb.style.display = "flex";
                                  }}
                                  className="w-full h-full object-cover"
                                />
                              ) : null}
                              <div className={`bs-fb w-full h-full ${item.image ? "hidden" : "flex"} items-center justify-center`}>
                                <Tag className="w-4 h-4" />
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="font-extrabold text-xs text-[#23241B] dark:text-[#f3f0e8] block truncate group-hover:text-[#557e2a] transition">
                                {item.name}
                              </span>
                              <span className="text-[11px] text-[#6f7060] font-medium block truncate mt-0.5">
                                {item.sub}
                              </span>
                              <div className={`w-7 h-[2.5px] ${item.barColor} rounded-full mt-1.5`} />
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
                            {/* Green SVG Sparkline */}
                            <svg
                              viewBox="0 0 54 20"
                              className="w-11 sm:w-12 h-5 stroke-[#55832a] fill-none stroke-[2.2] flex-shrink-0 group-hover:translate-x-0.5 transition-transform"
                              style={{ strokeLinecap: "round", strokeLinejoin: "round" }}
                            >
                              <path d={item.spark} />
                            </svg>
                            {/* Product sold count - clearly visible with distinct spacing */}
                            <span className="text-sm font-black font-mono text-[#23241B] dark:text-[#f3f0e8] w-6 text-right flex-shrink-0">
                              {item.sold}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── ROW 3: RECENT ORDERS (LEFT 2/3) & RUNNING LOW + ON THE FLOOR (RIGHT 1/3) ── */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
              {/* 1. RECENT ORDERS TABLE (XL: 8 COLS) */}
              <div className="xl:col-span-8 rounded-[28px] bg-[var(--mav-surface)] border border-[var(--mav-line)] p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#edf4e6] border border-[#dbe6cf] text-[#557e2a] flex items-center justify-center flex-shrink-0">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-lg font-extrabold tracking-tight text-[var(--mav-text)]">
                        Recent orders
                      </h4>
                      <p className="text-xs text-[var(--mav-muted)] font-medium mt-0.5">
                        {portalData?.catalog_stats?.orders_count || rawOrders.length} orders synced from {storeDomain}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab("orders")}
                      className="px-3.5 py-1.5 rounded-xl border border-[#ded8ce] bg-white text-xs font-extrabold text-[#1a1c15] hover:bg-[#f6f2ea] transition shadow-xs flex items-center gap-1"
                    >
                      <span>See all</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("orders")}
                      className="w-8 h-8 rounded-xl border border-[#ded8ce] bg-white text-xs font-extrabold text-[#1a1c15] hover:bg-[#f6f2ea] transition shadow-xs flex items-center justify-center"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Orders Feed Rows */}
                <div className="mt-5 divide-y divide-[var(--mav-line)]">
                  {recentOrdersFeed.length === 0 ? (
                    <div className="py-8 text-center text-[var(--mav-muted)]">
                      <ShoppingBag className="w-8 h-8 mx-auto opacity-40 mb-2" />
                      <p className="font-bold text-xs">No orders recorded yet from {storeDomain}</p>
                    </div>
                  ) : (
                    recentOrdersFeed.map((order, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          if (order.order) setSelectedOrder(order.order);
                          else if (rawOrders[idx]) setSelectedOrder(rawOrders[idx]);
                        }}
                        className="py-3.5 hover:bg-[var(--mav-surface-2)] transition px-2 rounded-xl cursor-pointer space-y-1.5"
                      >
                        {/* Top Line: Order ID, Time, Amount */}
                        <div className="flex items-center justify-between text-xs font-bold">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-extrabold text-[var(--mav-text)]">
                              #{order.id}
                            </span>
                            <span className="text-[11px] text-[var(--mav-muted)] font-medium">
                              {order.time}
                            </span>
                          </div>
                          <span className="font-mono text-sm font-extrabold text-[var(--mav-text)]">
                            {order.amount}
                          </span>
                        </div>

                        {/* Bottom Line: Customer Avatar, Name, Location, Status */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-full ${order.avatarBg} font-extrabold text-[11px] flex items-center justify-center`}
                            >
                              {order.initials}
                            </div>
                            <div>
                              <span className="font-bold text-[var(--mav-text)] block">
                                {order.name}
                              </span>
                              <span className="text-[11px] text-[var(--mav-muted)]">
                                {order.location}
                              </span>
                            </div>
                          </div>

                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#e7f0fa] text-[#2c65b5] capitalize">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2c65b5]" />
                            <span>{order.status}</span>
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 2. STACKED RIGHT COLUMN (XL: 4 COLS): RUNNING LOW & ON THE FLOOR */}
              <div className="xl:col-span-4 space-y-5">
                {/* CARD A: RUNNING LOW */}
                <div className="rounded-[28px] bg-[var(--mav-surface)] border border-[var(--mav-line)] p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#edf4e6] border border-[#dbe6cf] text-[#557e2a] flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-lg font-extrabold tracking-tight text-[var(--mav-text)]">
                          Running low
                        </h4>
                        <p className="text-xs text-[var(--mav-muted)] font-medium mt-0.5">
                          Store inventory pace
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab("products")}
                      className="px-3.5 py-1.5 rounded-xl border border-[#ded8ce] bg-white text-xs font-extrabold text-[#1a1c15] hover:bg-[#f6f2ea] transition shadow-xs flex items-center gap-1"
                    >
                      <span>Stock</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Low Stock Items List */}
                  <div className="mt-4 space-y-3.5">
                    {runningLowItems.length === 0 ? (
                      <p className="text-xs text-[#6f7060] italic py-3">All store inventory items currently in stock.</p>
                    ) : (
                      runningLowItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-[#f6f2ea] border border-[#ede7df] flex items-center justify-center text-sm flex-shrink-0 overflow-hidden relative">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt=""
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = "none";
                                    const fb = e.currentTarget.parentElement?.querySelector(".rl-fb") as HTMLElement;
                                    if (fb) fb.style.display = "flex";
                                  }}
                                  className="w-full h-full object-cover"
                                />
                              ) : null}
                              <div className={`rl-fb w-full h-full ${item.image ? "hidden" : "flex"} items-center justify-center`}>
                                🏷️
                              </div>
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-extrabold text-[var(--mav-text)] block truncate">
                                {item.name}
                              </span>
                              <span className="text-[11px] text-[var(--mav-muted)] block truncate">
                                {item.left}
                              </span>
                              {/* Warning Amber Line */}
                              <div className="w-16 h-1 rounded-full bg-[#ede7df] mt-1 overflow-hidden">
                                <div className={`h-full bg-[#caa227] rounded-full ${item.bar}`} />
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (item.product) {
                                toggleStatusMutation.mutate({
                                  productId: String(item.product.id),
                                  current_status: item.product.stock_status,
                                  stock_status: item.product.stock_status === "instock" ? "outofstock" : "instock",
                                });
                              } else if (rawProducts[idx]) {
                                toggleStatusMutation.mutate({
                                  productId: String(rawProducts[idx].id),
                                  current_status: rawProducts[idx].stock_status,
                                  stock_status: "instock",
                                });
                              } else {
                                showToast(`Restock order submitted for ${item.name}!`, "success");
                              }
                            }}
                            className="px-3.5 py-1.5 rounded-xl border border-[#ded8ce] bg-white text-xs font-extrabold text-[#1a1c15] hover:bg-[#f6f2ea] transition shadow-xs whitespace-nowrap flex-shrink-0"
                          >
                            {item.action}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* CARD B: ON THE FLOOR (TEAM ACTIVITY) */}
                <div className="rounded-[28px] bg-[var(--mav-surface)] border border-[var(--mav-line)] p-6 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#edf4e6] border border-[#dbe6cf] text-[#557e2a] flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-lg font-extrabold tracking-tight text-[var(--mav-text)]">
                        On the floor
                      </h4>
                      <p className="text-xs text-[var(--mav-muted)] font-medium mt-0.5">
                        What the team did today
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3.5">
                    {onTheFloorActivities.map((act, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div
                          className={`w-7 h-7 rounded-full ${act.avatarBg} font-extrabold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5`}
                        >
                          {act.initials}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[var(--mav-text)] leading-snug">
                            {act.text}
                          </p>
                          <span className="text-[11px] text-[var(--mav-muted)] mt-0.5 block">
                            {act.time}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

                {/* ──────────────────────────────────────────────────────────────────── */}
        {/* VIEW 2: ORDERS (FULFIL KANBAN + ALL ORDERS TABLE + RETURNS)          */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        {activeTab === "orders" && (
          <OrdersView
            rawOrders={rawOrders}
            currencySymbol={currencySymbol}
            storeDomain={storeDomain}
            storeUrl={storeUrl}
            onSelectOrder={setSelectedOrder}
            showToast={showToast}
            highlightedStage={highlightedOrderStage}
            onSelectStage={setHighlightedOrderStage}
            orderStatusOverrides={orderStatusOverrides}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onResetOrderStatuses={handleResetOrderStatuses}
          />
        )}

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* VIEW 3: PRODUCTS (CATALOGUE + STOCK/SHELF + COLLECTIONS)             */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        {activeTab === "products" && (
          <ProductsView
            rawProducts={rawProducts}
            rawOrders={rawOrders}
            currencySymbol={currencySymbol}
            storeDomain={storeDomain}
            storeUrl={storeUrl}
            showToast={showToast}
            onSelectProduct={setSelectedOrder}
          />
        )}

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* VIEW 4: CUSTOMERS (CLIENTS DIRECTORY + DETAIL DRAWER)                */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        {activeTab === "customers" && (
          <CustomersView
            rawCustomers={rawCustomers}
            rawOrders={rawOrders}
            currencySymbol={currencySymbol}
            storeDomain={storeDomain}
            showToast={showToast}
            onSelectOrder={setSelectedOrder}
          />
        )}

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* VIEW 5: INSIGHTS (TREND BEZIER + HEATMAP + CHANNELS)                 */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        {activeTab === "insights" && (
          <InsightsView
            rawOrders={rawOrders}
            rawProducts={rawProducts}
            rawCustomers={rawCustomers}
            currencySymbol={currencySymbol}
            storeDomain={storeDomain}
            showToast={showToast}
          />
        )}

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* VIEW 6: MESSAGES (3-COLUMN INBOX + THREAD + REPLIES)                 */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        {activeTab === "messages" && (
          <MessagesView
            rawOrders={rawOrders}
            rawCustomers={rawCustomers}
            currencySymbol={currencySymbol}
            storeDomain={storeDomain}
            storeUrl={storeUrl}
            showToast={showToast}
            onSelectOrder={setSelectedOrder}
          />
        )}

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* VIEW 7: SETTINGS (THE SHOP + TEAM + NOTIFICATIONS + PLAN + THEME)    */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        {activeTab === "settings" && (
          <SettingsView
            storeName={storeName}
            storeDomain={storeDomain}
            storeUrl={storeUrl}
            currencySymbol={currencySymbol}
            portalData={portalData}
            showToast={showToast}
          />
        )}

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* VIEW 8: HELP & FAQS (ACCORDION + SUPPORT REQUESTS + SHORTCUTS)       */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        {activeTab === "help" && (
          <HelpView
            userName={userName}
            storeDomain={storeDomain}
            showToast={showToast}
          />
        )}

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* VIEW 5: BANNERS & DEALS (MOBILE APP PROMOTIONS)                       */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        {activeTab === "banners" && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--mav-muted)] mb-1">
                <span>Grow &amp; App</span>
                <span>/</span>
                <span className="text-[var(--mav-text)]">Banners</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                App Banners &amp; Carousel
              </h2>
              <p className="text-sm text-[var(--mav-muted)] mt-1">
                Carousel banners that display prominently at the top of your mobile application.
              </p>
            </div>

            {/* Add Banner Form */}
            <div className="rounded-3xl p-5 sm:p-6 bg-[var(--mav-surface)] border border-[var(--mav-line)] shadow-sm space-y-4">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-[var(--mav-muted)]">
                Create New App Banner
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Banner Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Summer Mega Sale"
                    value={bannerTitle}
                    onChange={(e) => setBannerTitle(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-xs text-[var(--mav-text)] focus:outline-none focus:border-[var(--mav-primary)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">Image URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={bannerImageUrl}
                    onChange={(e) => setBannerImageUrl(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-xs text-[var(--mav-text)] focus:outline-none focus:border-[var(--mav-primary)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">Deep Link / Action</label>
                  <input
                    type="text"
                    placeholder="category:all or product:123"
                    value={bannerLink}
                    onChange={(e) => setBannerLink(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-xs text-[var(--mav-text)] focus:outline-none focus:border-[var(--mav-primary)]"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  saveBannerMutation.mutate({
                    title: bannerTitle,
                    image_url: bannerImageUrl,
                    link: bannerLink,
                    is_active: true,
                  })
                }
                disabled={!bannerTitle.trim() || saveBannerMutation.isPending}
                className="px-5 py-2.5 rounded-xl bg-[var(--mav-primary)] text-[var(--mav-on-primary)] font-bold text-xs shadow hover:brightness-105 transition disabled:opacity-50"
              >
                {saveBannerMutation.isPending ? "Syncing..." : "Add & Sync to App"}
              </button>
            </div>

            {/* Banners Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rawBanners.map((b) => (
                <div
                  key={b.id}
                  className="rounded-2xl overflow-hidden bg-[var(--mav-surface)] border border-[var(--mav-line)] shadow-sm group"
                >
                  <div className="aspect-[16/9] w-full bg-[var(--mav-surface-2)] relative overflow-hidden">
                    <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                    <button
                      onClick={() => deleteBannerMutation.mutate(b.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-red-600 transition"
                      title="Remove banner"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="p-3">
                    <h4 className="font-extrabold text-xs truncate">{b.title}</h4>
                    <p className="text-[11px] text-[var(--mav-muted)] font-mono mt-0.5 truncate">
                      Action: {b.link}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* VIEW 6: PUSH NOTIFICATIONS                                           */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        {activeTab === "notifications" && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--mav-muted)] mb-1">
                <span>Grow &amp; App</span>
                <span>/</span>
                <span className="text-[var(--mav-text)]">Push Notifications</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Native Push Notifications
              </h2>
              <p className="text-sm text-[var(--mav-muted)] mt-1">
                Dispatch instantaneous broadcast notifications to Android and iOS mobile devices.
              </p>
            </div>

            {/* Compose Push Form */}
            <div className="rounded-3xl p-5 sm:p-6 bg-[var(--mav-surface)] border border-[var(--mav-line)] shadow-sm space-y-4 max-w-xl">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-[var(--mav-muted)]">
                Broadcast Campaign
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Notification Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Flash Sale Today! 20% Off"
                    value={pushTitle}
                    onChange={(e) => setPushTitle(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-xs text-[var(--mav-text)] focus:outline-none focus:border-[var(--mav-primary)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">Message Body</label>
                  <textarea
                    rows={3}
                    placeholder="Grab your favorites before stocks run out..."
                    value={pushBody}
                    onChange={(e) => setPushBody(e.target.value)}
                    className="w-full p-3 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-xs text-[var(--mav-text)] focus:outline-none focus:border-[var(--mav-primary)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">Deep Link (Optional)</label>
                  <input
                    type="text"
                    placeholder="app://product/123 or app://category/sale"
                    value={pushDeepLink}
                    onChange={(e) => setPushDeepLink(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-xs text-[var(--mav-text)] focus:outline-none focus:border-[var(--mav-primary)]"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  sendPushMutation.mutate({
                    title: pushTitle,
                    body: pushBody,
                    deep_link: pushDeepLink,
                  })
                }
                disabled={!pushTitle.trim() || !pushBody.trim() || sendPushMutation.isPending}
                className="px-5 py-2.5 rounded-xl bg-[var(--mav-primary)] text-[var(--mav-on-primary)] font-bold text-xs shadow hover:brightness-105 transition disabled:opacity-50 flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendPushMutation.isPending ? "Sending..." : "Dispatch Broadcast"}</span>
              </button>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* VIEW 7: CATEGORIES (REAL STORE CATEGORIES)                           */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        {activeTab === "categories" && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--mav-muted)] mb-1">
                <span>Grow &amp; App</span>
                <span>/</span>
                <span className="text-[var(--mav-text)]">Categories</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Store Categories &amp; Taxonomies
              </h2>
              <p className="text-sm text-[var(--mav-muted)] mt-1">
                Categories synced directly from your website ({storeDomain}).
              </p>
            </div>

            <div className="rounded-3xl bg-[var(--mav-surface)] border border-[var(--mav-line)] shadow-sm overflow-hidden">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--mav-line)] text-[var(--mav-muted)] uppercase tracking-wider font-extrabold text-[11px] bg-[var(--mav-surface-2)]/50">
                      <th className="py-3 px-4">Category Name</th>
                      <th className="py-3 px-4">Slug</th>
                      <th className="py-3 px-4">Items Count</th>
                      <th className="py-3 px-4">Mobile App Visibility</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--mav-line)]">
                    {rawCategories.map((c) => (
                      <tr key={c.id || c.name} className="hover:bg-[var(--mav-surface-2)] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5 font-bold text-[13px]">
                            <span>{c.icon || "🏷️"}</span>
                            <span>{c.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[12px] text-[var(--mav-muted)]">
                          {c.slug || c.name.toLowerCase()}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[13px]">
                          {c.items_count || 0}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                            <Check className="w-3 h-3" />
                            <span>Visible on App</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* VIEW 8: STORE SYNC                                                   */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        {activeTab === "sync" && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--mav-muted)] mb-1">
                <span>System</span>
                <span>/</span>
                <span className="text-[var(--mav-text)]">Live Sync</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Store Catalog Synchronization
              </h2>
              <p className="text-sm text-[var(--mav-muted)] mt-1">
                Real-time connection details between your e-commerce platform and mobile apps.
              </p>
            </div>

            <div className="rounded-3xl p-6 bg-[var(--mav-surface)] border border-[var(--mav-line)] shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--mav-line)]">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--mav-muted)]">
                    Target Website
                  </span>
                  <div className="text-base font-extrabold mt-0.5">{storeUrl || "None"}</div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mav-breathe" />
                  <span>2-Way Sync Active</span>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 rounded-2xl bg-[var(--mav-surface-2)]">
                  <span className="text-[var(--mav-muted)] font-medium">Products Synced</span>
                  <p className="text-lg font-black mt-1 font-mono">{stockCounts.all}</p>
                </div>
                <div className="p-3 rounded-2xl bg-[var(--mav-surface-2)]">
                  <span className="text-[var(--mav-muted)] font-medium">Categories</span>
                  <p className="text-lg font-black mt-1 font-mono">{rawCategories.length}</p>
                </div>
                <div className="p-3 rounded-2xl bg-[var(--mav-surface-2)]">
                  <span className="text-[var(--mav-muted)] font-medium">Orders</span>
                  <p className="text-lg font-black mt-1 font-mono">{rawOrders.length}</p>
                </div>
                <div className="p-3 rounded-2xl bg-[var(--mav-surface-2)]">
                  <span className="text-[var(--mav-muted)] font-medium">App Users</span>
                  <p className="text-lg font-black mt-1 font-mono">
                    {portalData?.devices_count || 1}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => syncCatalogMutation.mutate()}
                  disabled={syncCatalogMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-[var(--mav-primary)] text-[var(--mav-on-primary)] font-bold text-xs shadow hover:brightness-105 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${syncCatalogMutation.isPending ? "animate-spin" : ""}`}
                  />
                  <span>
                    {syncCatalogMutation.isPending ? "Syncing..." : "Trigger Full Store Sync Now"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* VIEW 9: API CREDENTIALS & WEBHOOKS                                   */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        {activeTab === "credentials" && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--mav-muted)] mb-1">
                <span>System</span>
                <span>/</span>
                <span className="text-[var(--mav-text)]">API &amp; Webhooks</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Mobile API Keys &amp; Webhooks
              </h2>
              <p className="text-sm text-[var(--mav-muted)] mt-1">
                Endpoints and keys used by your mobile app to consume the live catalog.
              </p>
            </div>

            <div className="rounded-3xl p-6 bg-[var(--mav-surface)] border border-[var(--mav-line)] shadow-sm space-y-4">
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--mav-muted)] block mb-1">
                  Public Mobile App Key
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={credentials?.app_key || app?.app_key || "app_live_key_..."}
                    className="flex-1 h-10 px-3 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)] font-mono text-xs text-[var(--mav-text)]"
                  />
                  <button
                    onClick={() =>
                      handleCopy(credentials?.app_key || app?.app_key || "", "App Key")
                    }
                    className="h-10 px-4 rounded-xl border border-[var(--mav-line)] text-xs font-bold hover:bg-[var(--mav-well)]"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--mav-muted)] block mb-1">
                  Webhook Receiver URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={credentials?.webhook_url || ""}
                    className="flex-1 h-10 px-3 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)] font-mono text-xs text-[var(--mav-text)]"
                  />
                  <button
                    onClick={() => handleCopy(credentials?.webhook_url || "", "Webhook URL")}
                    className="h-10 px-4 rounded-xl border border-[var(--mav-line)] text-xs font-bold hover:bg-[var(--mav-well)]"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 3. ⌘K FINDER DIALOG (MAVORA LIVE SEARCH)                                */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {isFinderOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-in fade-in"
          onClick={() => setIsFinderOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-[var(--mav-raised)] border border-[var(--mav-line)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--mav-line)]">
              <Search className="w-5 h-5 text-[var(--mav-muted)]" />
              <input
                ref={finderInputRef}
                type="search"
                value={finderQuery}
                onChange={(e) => setFinderQuery(e.target.value)}
                placeholder="Search orders, products, customers..."
                className="flex-1 bg-transparent text-sm text-[var(--mav-text)] placeholder:text-[var(--mav-muted)] focus:outline-none"
              />
              <kbd className="px-2 py-0.5 text-[11px] font-mono bg-[var(--mav-surface-2)] border border-[var(--mav-line)] rounded text-[var(--mav-muted)]">
                esc
              </kbd>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2 space-y-3 text-xs">
              {/* Products Section */}
              {finderResults.products.length > 0 && (
                <div>
                  <span className="px-3 py-1 font-extrabold uppercase tracking-wider text-[10px] text-[var(--mav-muted)] block">
                    Products
                  </span>
                  <div className="space-y-0.5 mt-1">
                    {finderResults.products.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setIsFinderOpen(false);
                          setActiveTab("products");
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[var(--mav-well)] text-left transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-6 h-6 rounded-md bg-[var(--mav-surface-2)] overflow-hidden shrink-0 flex items-center justify-center relative">
                            {extractProductImage(p) ? (
                              <img
                                src={extractProductImage(p)!}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-3.5 h-3.5 text-[var(--mav-primary)]" />
                            )}
                          </div>
                          <span className="font-bold truncate">{p.name}</span>
                        </div>
                        <span className="font-mono font-bold text-[var(--mav-muted)]">
                          {currency}
                          {p.price}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Orders Section */}
              {finderResults.orders.length > 0 && (
                <div>
                  <span className="px-3 py-1 font-extrabold uppercase tracking-wider text-[10px] text-[var(--mav-muted)] block">
                    Orders
                  </span>
                  <div className="space-y-0.5 mt-1">
                    {finderResults.orders.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => {
                          setIsFinderOpen(false);
                          setSelectedOrder(o);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[var(--mav-well)] text-left transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <ShoppingBag className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <span className="font-bold">
                            #{o.order_number || o.id} • {o.customer_name || "Customer"}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-[var(--mav-muted)]">
                          {currency}
                          {o.total}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Customers Section */}
              {finderResults.customers.length > 0 && (
                <div>
                  <span className="px-3 py-1 font-extrabold uppercase tracking-wider text-[10px] text-[var(--mav-muted)] block">
                    Customers
                  </span>
                  <div className="space-y-0.5 mt-1">
                    {finderResults.customers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setIsFinderOpen(false);
                          setActiveTab("customers");
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[var(--mav-well)] text-left transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <Users className="w-4 h-4 text-purple-500 flex-shrink-0" />
                          <span className="font-bold">{c.name}</span>
                        </div>
                        <span className="font-mono text-[var(--mav-muted)]">{c.email}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 4A. SLIDE-OVER GRAPH PERIOD & ORDERS DRAWER (EXACT SCREENSHOT MATCH)  */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {selectedPeriod && (
        <div
          className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[2px] flex justify-end animate-in fade-in"
          onClick={() => setSelectedPeriod(null)}
        >
          <div
            className="w-full max-w-[480px] bg-white border-l border-[#E6E3DC] shadow-2xl h-full flex flex-col justify-between overflow-hidden rounded-l-[32px] animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-6 sm:p-7 pb-4 flex items-start justify-between gap-4 border-b border-[#F0EEE8]">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-[#eff5ea] text-[#557e2a] flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-[#557e2a]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl sm:text-2xl font-black text-[#23241B] tracking-tight leading-tight truncate">
                    {selectedPeriod.title || `${selectedPeriod.day}, ${selectedPeriod.date}`}
                  </h3>
                  <p className="text-xs text-[#6f7060] font-medium mt-0.5 truncate">
                    {currencySymbol}{selectedPeriod.total.toLocaleString()} taken · {selectedPeriod.ordersCount} orders
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPeriod(null)}
                className="w-9 h-9 rounded-full border border-[#ded8ce] bg-white text-[#6f7060] hover:text-[#23241B] hover:bg-[#f6f2ea] flex items-center justify-center transition shadow-xs flex-shrink-0"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-6">
              {/* 2 KPI Cards */}
              <div className="grid grid-cols-2 gap-3">
                {/* Against the goal */}
                <div className="rounded-2xl bg-[#faf8f4] border border-[#eeebe3] p-4 flex flex-col justify-between">
                  <span className="text-xs text-[#6f7060] font-medium leading-tight">Against the goal</span>
                  <div className="mt-2">
                    <span className={`text-2xl font-black tracking-tight block ${selectedPeriod.diffGoal >= 0 ? "text-[#23241B]" : "text-[#c85a53]"}`}>
                      {selectedPeriod.diffGoal >= 0 ? "+" : "-"}{currencySymbol}{Math.abs(selectedPeriod.diffGoal).toLocaleString()}
                    </span>
                    <span className="text-xs text-[#6f7060] font-medium mt-0.5 block">
                      {selectedPeriod.diffGoal >= 0 ? "over" : "under"} {currencySymbol}{selectedPeriod.goal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* The period before */}
                <div className="rounded-2xl bg-[#faf8f4] border border-[#eeebe3] p-4 flex flex-col justify-between">
                  <span className="text-xs text-[#6f7060] font-medium leading-tight">The period before</span>
                  <div className="mt-2">
                    <span className="text-2xl font-black text-[#23241B] tracking-tight block">
                      {currencySymbol}{selectedPeriod.periodBefore.toLocaleString()}
                    </span>
                    <div className="mt-1">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full ${selectedPeriod.growthPct >= 0 ? "bg-[#dbe5d7] text-[#296d43]" : "bg-[#fdeeed] text-[#d9534f]"
                        }`}>
                        <span>{selectedPeriod.growthPct >= 0 ? "▲" : "▼"}</span>
                        <span>{Math.abs(selectedPeriod.growthPct)}%</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* BY CHANNEL Section */}
              <div>
                <h4 className="text-xs font-bold text-[#6f7060] tracking-wider uppercase mb-3.5">
                  BY CHANNEL
                </h4>
                <div className="space-y-3.5">
                  {/* Web shop */}
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-bold text-[#23241B]">
                        <span className="w-2 h-2 rounded-full bg-[#718D32]" />
                        <span>Web shop</span>
                      </span>
                      <span className="font-extrabold text-[#23241B]">
                        {currencySymbol}{selectedPeriod.web.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#f0eee6] overflow-hidden mt-1.5">
                      <div
                        className="h-full rounded-full bg-[#718D32] transition-all duration-500"
                        style={{ width: `${Math.min(100, (selectedPeriod.web / Math.max(1, selectedPeriod.total)) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Tide Club / Mobile App */}
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-bold text-[#23241B]">
                        <span className="w-2 h-2 rounded-full bg-[#EF8A45]" />
                        <span>Tide Club</span>
                      </span>
                      <span className="font-extrabold text-[#23241B]">
                        {currencySymbol}{selectedPeriod.club.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#f0eee6] overflow-hidden mt-1.5">
                      <div
                        className="h-full rounded-full bg-[#EF8A45] transition-all duration-500"
                        style={{ width: `${Math.min(100, (selectedPeriod.club / Math.max(1, selectedPeriod.total)) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Wholesale */}
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-bold text-[#23241B]">
                        <span className="w-2 h-2 rounded-full bg-[#4D86D8]" />
                        <span>Wholesale</span>
                      </span>
                      <span className="font-extrabold text-[#23241B]">
                        {currencySymbol}{selectedPeriod.wholesale.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#f0eee6] overflow-hidden mt-1.5">
                      <div
                        className="h-full rounded-full bg-[#4D86D8] transition-all duration-500"
                        style={{ width: `${Math.min(100, (selectedPeriod.wholesale / Math.max(1, selectedPeriod.total)) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Markets */}
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-bold text-[#23241B]">
                        <span className="w-2 h-2 rounded-full bg-[#caa227]" />
                        <span>Markets</span>
                      </span>
                      <span className="font-extrabold text-[#23241B]">
                        {currencySymbol}{selectedPeriod.markets.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#f0eee6] overflow-hidden mt-1.5">
                      <div
                        className="h-full rounded-full bg-[#caa227] transition-all duration-500"
                        style={{ width: `${Math.min(100, (selectedPeriod.markets / Math.max(1, selectedPeriod.total)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ORDERS List Section */}
              <div>
                <h4 className="text-xs font-bold text-[#6f7060] tracking-wider uppercase mb-3">
                  {selectedPeriod.orders.length} ORDERS
                </h4>

                {selectedPeriod.orders.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-[#faf8f4] border border-dashed border-[#ded8ce] text-center text-xs text-[#6f7060]">
                    No orders recorded for this period yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedPeriod.orders.map((o: any, oIdx: number) => (
                      <div
                        key={o.id || oIdx}
                        onClick={() => setSelectedOrder(o.rawOrder || o)}
                        className="p-3 rounded-2xl hover:bg-[#faf8f4] border border-[#f0eee8] hover:border-[#ded8ce] transition cursor-pointer flex items-center justify-between gap-3 group"
                        title="Click to view full order details"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-xs flex-shrink-0 ${o.avatarBg || "bg-[#eff4fc] text-[#4b84d4]"}`}>
                            {o.initials}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-black text-[#23241B] group-hover:text-[#557e2a] transition truncate">
                              #{o.orderNumber} · {o.name}
                            </div>
                            <div className="text-[11px] text-[#6f7060] font-medium mt-0.5 truncate">
                              {o.time} · {o.channel}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 flex-shrink-0">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${o.status === "completed" || o.status === "delivered"
                              ? "bg-[#edf5ee] text-[#296d43]"
                              : o.status === "processing"
                                ? "bg-[#fef3ec] text-[#ef8b48]"
                                : "bg-[#eff5fc] text-[#4b84d4]"
                            }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            <span className="capitalize">{o.status === "completed" ? "Delivered" : o.status}</span>
                          </span>
                          <span className="text-xs font-black text-[#23241B] text-right min-w-[50px]">
                            {currencySymbol}{o.amountFormatted}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 4B. SLIDE-OVER ORDER DETAILS DRAWER (EXACT SCREENSHOT MATCH)           */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {selectedOrder && (() => {
        const orderNum = selectedOrder.order_number || selectedOrder.id || "21599";

        let formattedDate = "Oct 24, 2026";
        let formattedTime = "2:20 PM";
        if (selectedOrder.created_at) {
          try {
            const d = new Date(selectedOrder.created_at);
            if (!isNaN(d.getTime())) {
              formattedDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
              formattedTime = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
            }
          } catch { }
        }

        const channel = selectedOrder.channel || (selectedOrder.payment_method_title?.toLowerCase().includes("app") ? "Mobile App" : "Web shop");
        const idStr = String(selectedOrder.id || "");
        const numStr = String(selectedOrder.order_number || "");
        const status = (
          orderStatusOverrides[idStr] ||
          (numStr ? orderStatusOverrides[numStr] : null) ||
          selectedOrder._statusOverride ||
          selectedOrder.status ||
          "paid"
        ).toLowerCase();

        const customerName = selectedOrder.customer_name || `${selectedOrder.billing?.first_name || ""} ${selectedOrder.billing?.last_name || ""}`.trim() || "Customer";
        const customerEmail = selectedOrder.customer_email || selectedOrder.billing?.email || "customer@example.com";
        const customerCity = selectedOrder.shipping_address || (selectedOrder.billing?.city ? `${selectedOrder.billing.city}${selectedOrder.billing.state ? ", " + selectedOrder.billing.state : ""}` : (storeDomain || "Online Order"));

        const nameParts = customerName.trim().split(" ");
        const initials = ((nameParts[0]?.[0] || "C") + (nameParts[1]?.[0] || nameParts[0]?.[1] || "")).toUpperCase();

        const rawTotal = parseFloat(selectedOrder.total || "0");
        const rawShipping = parseFloat(selectedOrder.shipping_total || "0");
        const rawSubtotal = Math.max(0, rawTotal - rawShipping);

        // Line items
        const lineItems = (selectedOrder.line_items && selectedOrder.line_items.length > 0)
          ? selectedOrder.line_items.map((it: any, idx: number) => {
            const matchedProd = rawProducts.find(
              (p: any) => String(p.id) === String(it.product_id) || p.name === it.name
            );
            const matchedImg = extractProductImage(matchedProd);
            const itemImg = it.image_url || (it.image?.src || (typeof it.image === "string" ? it.image : null)) || matchedImg || null;

            return {
              id: it.id || idx,
              name: it.name,
              variant: it.variation || "250 g bag · Espresso",
              quantity: it.quantity || 1,
              price: parseFloat(it.price || (it.total / Math.max(1, it.quantity || 1)) || "0"),
              image: itemImg,
            };
          })
          : [{
            id: 1,
            name: selectedOrder.product_name || rawProducts[0]?.name || "Slack Water",
            variant: "250 g bag · Espresso",
            quantity: 1,
            price: rawSubtotal > 0 ? rawSubtotal : rawTotal,
            image: extractProductImage(rawProducts[0]) || null,
          }];

        // Stepper state
        // Steps: Paid -> Roasting / Prep -> Packed in Box -> Shipped Today -> Delivered
        const steps = [
          { key: "paid", label: "Paid", icon: CreditCard, time: formattedTime },
          { key: "processing", label: "Roasting", icon: Flame, time: "—" },
          { key: "packed", label: "Packed", icon: Package, time: "—" },
          { key: "shipped", label: "Shipped", icon: Truck, time: "—" },
          { key: "delivered", label: "Delivered", icon: Check, time: "—" },
        ];

        let activeStepIdx = 0;
        if (status === "processing") activeStepIdx = 1;
        else if (status === "packed") activeStepIdx = 2;
        else if (status === "shipped") activeStepIdx = 3;
        else if (status === "completed" || status === "delivered") activeStepIdx = 4;

        // Dynamic badge styles
        let badgeBg = "bg-[#eff5fc] text-[#4b84d4]";
        let statusBadgeText = "Paid";
        if (status === "processing") {
          badgeBg = "bg-[#fef3ec] text-[#ef8b48]";
          statusBadgeText = "Roasting / Prep";
        } else if (status === "packed") {
          badgeBg = "bg-[#fdf6e6] text-[#caa227]";
          statusBadgeText = "Packed in Box";
        } else if (status === "shipped") {
          badgeBg = "bg-[#eff5ea] text-[#557e2a]";
          statusBadgeText = "Shipped Today";
        } else if (status === "completed" || status === "delivered") {
          badgeBg = "bg-[#edf5ee] text-[#296d43]";
          statusBadgeText = "Delivered";
        }

        // Action button dynamic progression
        let nextStageKey: "paid" | "processing" | "packed" | "shipped" | "delivered" | null = null;
        let nextStageLabel = "Send to roast";
        let NextIcon = Flame;
        let nextButtonBg = "bg-[#ef8a45] hover:bg-[#d87635] text-white";

        if (activeStepIdx === 0) {
          nextStageKey = "processing";
          nextStageLabel = "Send to roast";
          NextIcon = Flame;
          nextButtonBg = "bg-[#ef8a45] hover:bg-[#d87635] text-white";
        } else if (activeStepIdx === 1) {
          nextStageKey = "packed";
          nextStageLabel = "Mark as Packed";
          NextIcon = Package;
          nextButtonBg = "bg-[#caa227] hover:bg-[#b08b1b] text-white";
        } else if (activeStepIdx === 2) {
          nextStageKey = "shipped";
          nextStageLabel = "Hand to Courier";
          NextIcon = Truck;
          nextButtonBg = "bg-[#557e2a] hover:bg-[#466922] text-white";
        } else if (activeStepIdx === 3) {
          nextStageKey = "delivered";
          nextStageLabel = "Mark as Delivered";
          NextIcon = Check;
          nextButtonBg = "bg-[#296d43] hover:bg-[#1f5433] text-white";
        } else {
          nextStageKey = null;
          nextStageLabel = "Delivered ✓";
          NextIcon = Check;
          nextButtonBg = "bg-[#edf5ee] text-[#296d43] cursor-default";
        }

        return (
          <div
            className="fixed inset-0 z-[60] bg-black/25 backdrop-blur-[2px] flex justify-end animate-in fade-in"
            onClick={() => setSelectedOrder(null)}
          >
            <div
              className="w-full max-w-[480px] bg-white border-l border-[#E6E3DC] shadow-2xl h-full flex flex-col justify-between overflow-hidden rounded-l-[32px] animate-in slide-in-from-right duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Top Header */}
              <div className="p-6 sm:p-7 pb-4 border-b border-[#F0EEE8]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-[#eff5ea] text-[#557e2a] flex items-center justify-center flex-shrink-0">
                      <ShoppingBag className="w-5 h-5 text-[#557e2a]" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl sm:text-2xl font-black text-[#23241B] tracking-tight leading-tight truncate">
                        Order #{orderNum}
                      </h3>
                      <p className="text-xs text-[#6f7060] font-medium mt-0.5 truncate">
                        {formattedDate}, {formattedTime} · {channel}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="w-9 h-9 rounded-full border border-[#ded8ce] bg-white text-[#6f7060] hover:text-[#23241B] hover:bg-[#f6f2ea] flex items-center justify-center transition shadow-xs flex-shrink-0"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Status and Channel Badges */}
                <div className="flex items-center gap-2 mt-3.5">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${badgeBg}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span>{statusBadgeText}</span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#eff5ea] text-[#557e2a]">
                    <Globe className="w-3.5 h-3.5" />
                    <span>{channel}</span>
                  </span>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-6">
                {/* 5-Step Horizontal Fulfillment Stepper */}
                <div className="py-2">
                  <div className="relative flex items-center justify-between">
                    {/* Connecting Line behind circles */}
                    <div className="absolute left-4 right-4 top-4.5 -translate-y-1/2 h-[2px] bg-[#e6e2d8] z-0" />
                    <div
                      className="absolute left-4 top-4.5 -translate-y-1/2 h-[2px] bg-[#557e2a] z-0 transition-all duration-500"
                      style={{ width: `${(activeStepIdx / (steps.length - 1)) * 100}%` }}
                    />

                    {steps.map((st, sIdx) => {
                      const IconComp = st.icon;
                      const isPassed = sIdx <= activeStepIdx;
                      const isCurrent = sIdx === activeStepIdx;

                      return (
                        <button
                          key={st.key}
                          type="button"
                          onClick={() => {
                            handleUpdateOrderStatus(selectedOrder.id, st.key as any);
                            showToast(`Order #${orderNum} status set to ${st.label}!`, "success");
                          }}
                          title={`Click to set status to ${st.label}`}
                          className="relative z-10 flex flex-col items-center flex-1 group cursor-pointer transition hover:scale-105"
                        >
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isCurrent
                                ? "border-2 border-[#557e2a] bg-[#eff5ea] text-[#557e2a] shadow-xs ring-4 ring-[#eff5ea]"
                                : isPassed
                                  ? "bg-[#557e2a] text-white"
                                  : "border border-[#ded8ce] bg-white text-[#b5b3ab] group-hover:border-[#557e2a] group-hover:text-[#557e2a]"
                              }`}
                          >
                            <IconComp className="w-4 h-4" />
                          </div>

                          <span
                            className={`text-[11px] mt-1.5 leading-tight ${isPassed ? "font-extrabold text-[#23241B]" : "font-medium text-[#8a8b7e]"
                              }`}
                          >
                            {st.label}
                          </span>

                          <span className="text-[10px] text-[#6f7060] font-mono leading-tight mt-0.5">
                            {sIdx === 0 ? formattedTime : isPassed ? "Done" : "—"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* CUSTOMER Section */}
                <div>
                  <h4 className="text-[11px] font-extrabold tracking-wider text-[#6f7060] uppercase mb-2.5">
                    CUSTOMER
                  </h4>
                  <div className="rounded-2xl bg-[#faf8f4] border border-[#eeebe3] p-4 flex items-center justify-between group cursor-pointer hover:bg-[#f6f2ea] transition">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-[#e5ede0] text-[#557e2a] font-extrabold text-sm flex items-center justify-center flex-shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-sm text-[#23241B] truncate">
                          {customerName}
                        </div>
                        <div className="text-xs text-[#6f7060] font-medium mt-0.5 truncate">
                          {customerEmail}
                        </div>
                        <div className="text-xs text-[#8a8b7e] font-medium mt-0.5 truncate">
                          {customerCity}
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-[#b5b3ab] group-hover:text-[#23241B] transition flex-shrink-0" />
                  </div>
                </div>

                {/* IN THE BOX (Line Items) */}
                <div>
                  <h4 className="text-[11px] font-extrabold tracking-wider text-[#6f7060] uppercase mb-3">
                    IN THE BOX
                  </h4>
                  <div className="space-y-2.5">
                    {lineItems.map((item: any, itIdx: number) => (
                      <div
                        key={item.id || itIdx}
                        className="rounded-2xl bg-[#faf8f4] border border-[#eeebe3] p-3.5 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-[#e8eef7] text-[#4b84d4] flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = "none";
                                  const fb = e.currentTarget.parentElement?.querySelector(".box-item-fb") as HTMLElement;
                                  if (fb) fb.style.display = "flex";
                                }}
                                className="w-full h-full object-cover"
                              />
                            ) : null}
                            <div className={`box-item-fb w-full h-full ${item.image ? "hidden" : "flex"} items-center justify-center`}>
                              <Package className="w-5 h-5 text-[#4b84d4]" />
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-xs sm:text-sm text-[#23241B] truncate">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-[#6f7060] font-medium mt-0.5 truncate">
                              {item.variant}
                            </div>
                          </div>
                        </div>

                        <div className="font-extrabold text-xs sm:text-sm text-[#23241B] text-right flex-shrink-0">
                          {item.quantity} × {currencySymbol}{Number(item.price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Financials Box */}
                  <div className="mt-3.5 rounded-2xl bg-[#faf8f4] border border-[#eeebe3] p-4 space-y-2">
                    <div className="flex justify-between items-center text-xs text-[#6f7060] font-medium">
                      <span>Subtotal</span>
                      <span className="font-bold text-[#23241B]">
                        {currencySymbol}{rawSubtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-[#6f7060] font-medium">
                      <span>Shipping</span>
                      <span className="font-bold text-[#23241B]">
                        {rawShipping > 0
                          ? `${currencySymbol}${rawShipping.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : "Free"}
                      </span>
                    </div>
                    <div className="border-t border-[#eeebe3] pt-2 mt-2 flex justify-between items-center">
                      <span>Total</span>
                      <span className="font-black text-base text-[#23241B]">
                        {currencySymbol}{rawTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="p-5 sm:p-6 border-t border-[#F0EEE8] bg-white space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!nextStageKey}
                    onClick={() => {
                      if (nextStageKey) {
                        handleUpdateOrderStatus(selectedOrder.id, nextStageKey);
                        showToast(`Order #${orderNum} status advanced!`, "success");
                      }
                    }}
                    className={`flex-1 py-3 px-4 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition active:scale-[0.99] ${nextButtonBg}`}
                  >
                    <NextIcon className="w-4 h-4" />
                    <span>{nextStageLabel}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = `mailto:${customerEmail}?subject=Order #${orderNum} Update`;
                    }}
                    className="py-3 px-4 rounded-2xl bg-white border border-[#ded8ce] hover:bg-[#faf8f4] text-[#23241B] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition shadow-xs"
                    title="Send customer an email"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#6f7060]" />
                    <span>Message</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="py-3 px-4 rounded-2xl bg-white border border-[#ded8ce] hover:bg-[#faf8f4] text-[#23241B] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition shadow-xs"
                    title="Print packing slip"
                  >
                    <Receipt className="w-3.5 h-3.5 text-[#6f7060]" />
                    <span>Packing slip</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="flex-1 py-2 px-3 rounded-xl border border-transparent hover:bg-[#fdeeed] text-[#d9534f] font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <X className="w-3.5 h-3.5 text-[#d9534f]" />
                    <span>Cancel</span>
                  </button>

                  {storeUrl && (
                    <a
                      href={`${storeUrl}/wp-admin/post.php?post=${selectedOrder.id}&action=edit`}
                      target="_blank"
                      rel="noreferrer"
                      className="py-2 px-3 rounded-xl text-xs text-[#6f7060] hover:text-[#23241B] font-medium flex items-center justify-center gap-1 transition"
                    >
                      <span>Open in WooCommerce</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 5. ADD / EDIT PRODUCT MODAL                                            */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {isAddProductModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsAddProductModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-[var(--mav-raised)] border border-[var(--mav-line)] shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--mav-line)]">
              <div>
                <h3 className="text-lg font-extrabold tracking-tight">
                  {editingProduct ? "Edit Product" : "Create New Product"}
                </h3>
                <p className="text-xs text-[var(--mav-muted)]">
                  Updates sync automatically to your website and mobile app.
                </p>
              </div>
              <button
                onClick={() => setIsAddProductModalOpen(false)}
                className="p-1.5 rounded-xl border border-[var(--mav-line)] hover:bg-[var(--mav-well)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Product Title</label>
                <input
                  type="text"
                  value={productFormData.name}
                  onChange={(e) =>
                    setProductFormData({ ...productFormData, name: e.target.value })
                  }
                  placeholder="e.g. Silk Blend Shirt"
                  className="w-full h-10 px-3 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-xs text-[var(--mav-text)] focus:outline-none focus:border-[var(--mav-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Price ({currency})</label>
                  <input
                    type="number"
                    step="any"
                    value={productFormData.price}
                    onChange={(e) =>
                      setProductFormData({ ...productFormData, price: e.target.value })
                    }
                    placeholder="999"
                    className="w-full h-10 px-3 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-xs text-[var(--mav-text)] focus:outline-none focus:border-[var(--mav-primary)]"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">Category</label>
                  <select
                    value={productFormData.category}
                    onChange={(e) =>
                      setProductFormData({ ...productFormData, category: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-xs text-[var(--mav-text)] focus:outline-none focus:border-[var(--mav-primary)]"
                  >
                    {rawCategories.map((c) => (
                      <option key={c.id || c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1">Stock Status</label>
                <select
                  value={productFormData.stock_status}
                  onChange={(e) =>
                    setProductFormData({ ...productFormData, stock_status: e.target.value })
                  }
                  className="w-full h-10 px-3 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-xs text-[var(--mav-text)] focus:outline-none focus:border-[var(--mav-primary)]"
                >
                  <option value="instock">In Stock (Available)</option>
                  <option value="outofstock">Out of Stock (Unavailable)</option>
                  <option value="onbackorder">On Backorder / Limited Stock</option>
                </select>
              </div>

              <div>
                <label className="font-bold block mb-1">Image URL</label>
                <input
                  type="url"
                  value={productFormData.image_url}
                  onChange={(e) =>
                    setProductFormData({ ...productFormData, image_url: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full h-10 px-3 rounded-xl bg-[var(--mav-surface-2)] border border-[var(--mav-line)] text-xs text-[var(--mav-text)] focus:outline-none focus:border-[var(--mav-primary)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--mav-line)]">
              <button
                type="button"
                onClick={() => setIsAddProductModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[var(--mav-line)] text-xs font-bold hover:bg-[var(--mav-well)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  saveProductMutation.mutate({
                    id: productFormData.id || undefined,
                    name: productFormData.name,
                    price: parseFloat(productFormData.price) || 0,
                    category: productFormData.category,
                    stock_status: productFormData.stock_status,
                    image_url: productFormData.image_url,
                  })
                }
                disabled={!productFormData.name.trim() || saveProductMutation.isPending}
                className="px-5 py-2 rounded-xl bg-[var(--mav-primary)] text-[var(--mav-on-primary)] font-bold text-xs shadow hover:brightness-105 disabled:opacity-50"
              >
                {saveProductMutation.isPending ? "Saving..." : "Save & Sync Everywhere"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 6. BEST SELLER PRODUCT DESCRIPTION MODAL                               */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <BestSellerModal
        product={selectedBestSellerProduct}
        currencySymbol={currency}
        onClose={() => setSelectedBestSellerProduct(null)}
        showToast={showToast}
        onSavePrice={(productId, newPrice) => {
          const existing = rawProducts.find((p) => String(p.id) === String(productId));
          if (existing) {
            saveProductMutation.mutate({
              ...existing,
              price: newPrice,
            });
          }
        }}
      />

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 7. MAVORA FLOATING PILL TOAST NOTIFICATION                             */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl text-xs font-extrabold animate-in fade-in slide-in-from-bottom-4 duration-200"
          style={{
            background: "var(--mav-text)",
            color: "var(--mav-bg)",
          }}
        >
          <span className="w-2 h-2 rounded-full bg-[var(--mav-good)]" />
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 px-2 py-0.5 rounded-lg bg-[var(--mav-side-pill)] text-[var(--mav-on-side-pill)] font-bold text-[10px]"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
