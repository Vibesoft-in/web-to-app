"use client";

import { useState, useMemo } from "react";
import {
  Package,
  Search,
  Filter,
  Download,
  Plus,
  Flame,
  AlertTriangle,
  Layers,
  Eye,
  Edit2,
  Archive,
  Grid,
  List,
  Copy,
  ExternalLink,
  ChevronRight,
  Check,
  X,
  Sparkles,
} from "lucide-react";

interface ProductsViewProps {
  rawProducts: any[];
  rawOrders: any[];
  currencySymbol: string;
  storeDomain: string;
  storeUrl?: string;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  onSelectProduct?: (product: any) => void;
}

export function ProductsView({
  rawProducts,
  rawOrders,
  currencySymbol,
  storeDomain,
  storeUrl,
  showToast,
  onSelectProduct,
}: ProductsViewProps) {
  const [subTab, setSubTab] = useState<"catalogue" | "stock" | "collections">("catalogue");
  const [searchQuery, setSearchQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("any");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Selected product for slide-over drawer
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [editablePrice, setEditablePrice] = useState<string>("");

  // Product price and stock overrides in local state
  const [productOverrides, setProductOverrides] = useState<Record<string, { price?: number; stock?: number; status?: string }>>({});

  // Collections state
  const [collections, setCollections] = useState<Array<{ id: string; name: string; text: string; featured: boolean; tone: string }>>([
    { id: "single-origin", name: "Single origins", text: "Seasonal microlots roasted light for pour-over and filter.", featured: true, tone: "amber" },
    { id: "house-espresso", name: "House espresso", text: "Rich, forgiving roasts built for milk drinks and daily pots.", featured: true, tone: "coral" },
    { id: "brew-gear", name: "Brew gear", text: "Hand grinders, scales, drippers and paper filters.", featured: false, tone: "olive" },
    { id: "gift-boxes", name: "Tasting sets & gifts", text: "Curated duos and seasonal gift boxes.", featured: false, tone: "sky" },
  ]);
  const [newCollModalOpen, setNewCollModalOpen] = useState(false);
  const [newCollName, setNewCollName] = useState("");
  const [newCollDesc, setNewCollDesc] = useState("");

  // Normalized product list
  const normalizedProducts = useMemo(() => {
    if (!Array.isArray(rawProducts) || rawProducts.length === 0) return [];
    return rawProducts.map((p: any, idx: number) => {
      const id = String(p.id ?? idx + 1);
      const override = productOverrides[id] || {};
      const rawPrice = override.price ?? Number(p.price ?? p.regular_price ?? p.variants?.[0]?.price ?? 20);
      const stock = override.stock ?? (p.stock_quantity !== null && p.stock_quantity !== undefined ? Number(p.stock_quantity) : (p.in_stock === false ? 0 : 24 - (idx % 20)));
      const name = p.name ?? p.title ?? `Product #${id}`;
      const sku = p.sku || `LT-${(1000 + idx)}`;
      const status = override.status ?? (p.status === "draft" ? "draft" : p.status === "archived" ? "archived" : "active");
      const kind = p.categories?.[0]?.name?.toLowerCase()?.includes("gear") || name.toLowerCase().includes("grinder") || name.toLowerCase().includes("filter")
        ? "gear"
        : name.toLowerCase().includes("gift") || name.toLowerCase().includes("sub")
        ? "gift"
        : "beans";
      const image =
        (typeof p.image_url === "string" && p.image_url.trim()) ||
        (typeof p.image === "string" && p.image.trim()) ||
        (p.image?.src && typeof p.image.src === "string" ? p.image.src.trim() : null) ||
        (Array.isArray(p.images) && p.images.length > 0
          ? (typeof p.images[0] === "string" ? p.images[0].trim() : (p.images[0]?.src || null))
          : null) ||
        (Array.isArray(p.image_urls) && p.image_urls.length > 0 ? p.image_urls[0] : null) ||
        (typeof p.thumbnail === "string" && p.thumbnail.trim()) ||
        (p.thumbnail?.src && typeof p.thumbnail.src === "string" ? p.thumbnail.src.trim() : null) ||
        null;
      const reorderAt = 8;
      const cost = Math.round(rawPrice * 0.42 * 100) / 100;

      return {
        id,
        raw: p,
        name,
        sku,
        price: rawPrice,
        cost,
        stock,
        reorderAt,
        status,
        kind,
        image,
        tagline: p.short_description?.replace(/<[^>]*>/g, "")?.slice(0, 70) || (kind === "beans" ? "Washed microlot · notes of citrus & stone fruit" : "Specialty roastery release"),
        notes: kind === "beans" ? ["Peach", "Bergamot", "Honey"] : ["Precision", "Specialty", "Durable"],
        unit: kind === "beans" ? "250g bag" : "unit",
        collections: idx % 2 === 0 ? ["single-origin"] : ["house-espresso"],
      };
    });
  }, [rawProducts, productOverrides]);

  // Filtered catalogue
  const filteredProducts = useMemo(() => {
    let list = normalizedProducts;
    if (kindFilter !== "any") {
      list = list.filter((p) => p.kind === kindFilter);
    }
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q)
      );
    }
    return list;
  }, [normalizedProducts, kindFilter, statusFilter, searchQuery]);

  // Stock KPI cards
  const stockMetrics = useMemo(() => {
    const totalCost = normalizedProducts.reduce((sum, p) => sum + Math.max(0, p.stock) * p.cost, 0);
    const totalUnits = normalizedProducts.reduce((sum, p) => sum + Math.max(0, p.stock), 0);
    const lowStockItems = normalizedProducts.filter((p) => p.stock <= p.reorderAt);
    const coffeeItems = normalizedProducts.filter((p) => p.kind === "beans");
    const openOrdersCount = Array.isArray(rawOrders) ? rawOrders.filter((o) => o.status === "processing" || o.status === "pending").length : 0;

    return {
      totalCost,
      totalUnits,
      lowStockCount: lowStockItems.length,
      lowStockNames: lowStockItems.map((p) => p.name).slice(0, 2).join(", ") + (lowStockItems.length > 2 ? "…" : ""),
      coffeeCount: coffeeItems.length,
      claimedCount: openOrdersCount * 2,
    };
  }, [normalizedProducts, rawOrders]);

  // Stock table rows
  const stockRows = useMemo(() => {
    let list = [...normalizedProducts];
    if (onlyLowStock) {
      list = list.filter((p) => p.stock <= p.reorderAt);
    }
    return list.sort((a, b) => a.stock - b.stock);
  }, [normalizedProducts, onlyLowStock]);

  const handleOpenDrawer = (product: any) => {
    setSelectedProduct(product);
    setEditablePrice(String(product.price));
  };

  const handleSavePrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const num = parseFloat(editablePrice);
    if (isNaN(num) || num <= 0) {
      showToast("Please enter a valid price above 0", "error");
      return;
    }
    setProductOverrides((prev) => ({
      ...prev,
      [selectedProduct.id]: {
        ...prev[selectedProduct.id],
        price: num,
      },
    }));
    setSelectedProduct((prev: any) => ({ ...prev, price: num }));
    showToast(`Price updated to ${currencySymbol}${num.toFixed(2)}`, "success");
  };

  const handleUpdateStatus = (newStatus: string) => {
    if (!selectedProduct) return;
    setProductOverrides((prev) => ({
      ...prev,
      [selectedProduct.id]: {
        ...prev[selectedProduct.id],
        status: newStatus,
      },
    }));
    setSelectedProduct((prev: any) => ({ ...prev, status: newStatus }));
    showToast(`Product set to ${newStatus}`, "info");
  };

  const handleRestockProduct = (productId: string, amount: number = 12) => {
    setProductOverrides((prev) => {
      const curStock = prev[productId]?.stock ?? normalizedProducts.find((p) => p.id === productId)?.stock ?? 0;
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          stock: curStock + amount,
        },
      };
    });
    showToast(`Booked in +${amount} units for stock`, "success");
  };

  const handleCopySku = (sku: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(sku);
      showToast(`SKU ${sku} copied to clipboard`, "info");
    }
  };

  const handleToggleCollFeatured = (collId: string) => {
    setCollections((prev) =>
      prev.map((c) => (c.id === collId ? { ...c, featured: !c.featured } : c))
    );
    showToast("Collection homepage display updated", "info");
  };

  const handleExportCsv = () => {
    if (normalizedProducts.length === 0) {
      showToast("No products to export", "error");
      return;
    }
    const headers = ["Product ID", "Name", "SKU", "Kind", "Price", "Cost", "Stock", "Reorder Level", "Status"];
    const rows = normalizedProducts.map((p) => [
      `"${p.id}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.sku}"`,
      `"${p.kind}"`,
      p.price.toFixed(2),
      p.cost.toFixed(2),
      p.stock,
      p.reorderAt,
      `"${p.status}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `products-catalogue-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Product catalogue exported as CSV", "success");
  };

  return (
    <div className="space-y-6">
      {/* Sub-Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E1D8] dark:border-[#2C2D2B] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#8A857D] dark:text-[#9A958D] mb-1">
            <span>Store</span>
            <span>/</span>
            <span className="text-[#1A1917] dark:text-[#F5F2EB] font-medium">Products</span>
          </div>
          <h1 className="text-2xl font-serif text-[#1A1917] dark:text-[#F5F2EB] tracking-tight">Products</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-[#4A4742] dark:text-[#C5C0B6] bg-white dark:bg-[#1E1F1E] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg hover:border-[#8A857D] transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => {
              if (storeUrl) window.open(`${storeUrl}/wp-admin/post-new.php?post_type=product`, "_blank");
              else showToast("Add products directly on your connected store admin", "info");
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-white bg-[#525B44] hover:bg-[#434B37] rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add product</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <div className="inline-flex p-1 bg-[#F0ECE1] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl text-xs font-medium">
          <button
            onClick={() => setSubTab("catalogue")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              subTab === "catalogue"
                ? "bg-white dark:bg-[#252625] text-[#1A1917] dark:text-[#F5F2EB] shadow-sm font-semibold"
                : "text-[#8A857D] dark:text-[#9A958D] hover:text-[#1A1917]"
            }`}
          >
            Catalogue ({normalizedProducts.length})
          </button>
          <button
            onClick={() => setSubTab("stock")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              subTab === "stock"
                ? "bg-white dark:bg-[#252625] text-[#1A1917] dark:text-[#F5F2EB] shadow-sm font-semibold"
                : "text-[#8A857D] dark:text-[#9A958D] hover:text-[#1A1917]"
            }`}
          >
            Stock {stockMetrics.lowStockCount > 0 && <span className="ml-1.5 px-1.5 py-0.2 bg-[#A0522D] text-white rounded-full text-[10px]">{stockMetrics.lowStockCount}</span>}
          </button>
          <button
            onClick={() => setSubTab("collections")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              subTab === "collections"
                ? "bg-white dark:bg-[#252625] text-[#1A1917] dark:text-[#F5F2EB] shadow-sm font-semibold"
                : "text-[#8A857D] dark:text-[#9A958D] hover:text-[#1A1917]"
            }`}
          >
            Collections ({collections.length})
          </button>
        </div>
      </div>

      {/* TAB 1: CATALOGUE */}
      {subTab === "catalogue" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] p-2.5 rounded-xl">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[200px] flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A857D]" />
                <input
                  type="text"
                  placeholder="Name, origin or SKU…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg text-[#1A1917] dark:text-[#F5F2EB] placeholder-[#8A857D] focus:outline-none focus:border-[#525B44]"
                />
              </div>

              {/* Type chips */}
              <div className="flex items-center gap-1 bg-white dark:bg-[#252625] p-1 border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg text-xs">
                {[
                  { id: "any", label: "Everything" },
                  { id: "beans", label: "Coffee" },
                  { id: "gear", label: "Brew gear" },
                  { id: "gift", label: "Gifts & club" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setKindFilter(item.id)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      kindFilter === item.id
                        ? "bg-[#525B44] text-white font-medium"
                        : "text-[#8A857D] dark:text-[#9A958D] hover:text-[#1A1917]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg text-[#4A4742] dark:text-[#C5C0B6] focus:outline-none focus:border-[#525B44]"
              >
                <option value="active">Live only</option>
                <option value="draft">Drafts</option>
                <option value="archived">Archived</option>
                <option value="all">All statuses</option>
              </select>

              {/* View toggle */}
              <div className="flex items-center bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded ${viewMode === "grid" ? "bg-[#F0ECE1] dark:bg-[#333533] text-[#1A1917] dark:text-[#F5F2EB]" : "text-[#8A857D]"}`}
                  title="Grid view"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded ${viewMode === "list" ? "bg-[#F0ECE1] dark:bg-[#333533] text-[#1A1917] dark:text-[#F5F2EB]" : "text-[#8A857D]"}`}
                  title="List view"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[#8A857D] dark:text-[#9A958D] px-1">
            <span>Showing {filteredProducts.length} product{filteredProducts.length === 1 ? "" : "s"}</span>
          </div>

          {/* Grid View */}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((product) => {
                const isSoldOut = product.stock <= 0;
                const isLow = product.stock > 0 && product.stock <= product.reorderAt;

                return (
                  <div
                    key={product.id}
                    onClick={() => handleOpenDrawer(product)}
                    className="group bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] hover:border-[#8A857D] dark:hover:border-[#525B44] rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-md flex flex-col justify-between"
                  >
                    <div className="relative aspect-square bg-[#F0ECE1] dark:bg-[#252625] overflow-hidden flex items-center justify-center">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                            const fb = e.currentTarget.parentElement?.querySelector(".prod-grid-fb") as HTMLElement;
                            if (fb) fb.style.display = "flex";
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : null}
                      <div className={`prod-grid-fb w-full h-full ${product.image ? "hidden" : "flex"} items-center justify-center bg-[#F0ECE1] dark:bg-[#252625]`}>
                        <Package className="w-12 h-12 text-[#8A857D]/40" />
                      </div>
                      {product.status !== "active" && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-medium bg-black/60 text-white rounded backdrop-blur-sm z-10">
                          {product.status}
                        </span>
                      )}
                    </div>

                    <div className="p-3.5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <h3 className="text-sm font-medium text-[#1A1917] dark:text-[#F5F2EB] group-hover:text-[#525B44] dark:group-hover:text-[#949F83] transition-colors line-clamp-1">
                            {product.name}
                          </h3>
                          <span className="font-mono text-sm font-semibold text-[#1A1917] dark:text-[#F5F2EB] shrink-0">
                            {currencySymbol}{product.price.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-[#8A857D] dark:text-[#9A958D] line-clamp-1 mb-2">
                          {product.tagline}
                        </p>

                        {/* Tasting notes */}
                        {product.notes?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {product.notes.map((n: string, i: number) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 text-[10px] bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] text-[#4A4742] dark:text-[#C5C0B6] rounded"
                              >
                                {n}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-[#E6E1D8] dark:border-[#2C2D2B] flex items-center justify-between text-xs">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            isSoldOut
                              ? "bg-[#C4554D]/10 text-[#C4554D] border border-[#C4554D]/20"
                              : isLow
                              ? "bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20"
                              : "bg-[#525B44]/10 text-[#525B44] dark:text-[#949F83] border border-[#525B44]/20"
                          }`}
                        >
                          {isSoldOut ? "Sold out" : `${product.stock} in stock`}
                        </span>
                        <span className="text-[11px] text-[#8A857D] dark:text-[#9A958D] font-mono">
                          {product.sku}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F0ECE1] dark:bg-[#252625] text-[#8A857D] dark:text-[#9A958D] font-medium border-b border-[#E6E1D8] dark:border-[#2C2D2B]">
                  <tr>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                    <th className="py-2.5 px-3">Stock Status</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E1D8] dark:divide-[#2C2D2B]">
                  {filteredProducts.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => handleOpenDrawer(p)}
                      className="hover:bg-[#F0ECE1]/50 dark:hover:bg-[#252625]/50 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded bg-[#E6E1D8] dark:bg-[#333533] overflow-hidden shrink-0 flex items-center justify-center relative">
                          {p.image ? (
                            <img
                              src={p.image}
                              alt=""
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = "none";
                                const fb = e.currentTarget.parentElement?.querySelector(".prod-list-fb") as HTMLElement;
                                if (fb) fb.style.display = "flex";
                              }}
                              className="w-full h-full object-cover"
                            />
                          ) : null}
                          <div className={`prod-list-fb w-full h-full ${p.image ? "hidden" : "flex"} items-center justify-center`}>
                            <Package className="w-4 h-4 text-[#8A857D]" />
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-[#1A1917] dark:text-[#F5F2EB]">{p.name}</p>
                          <p className="text-[10px] text-[#8A857D] dark:text-[#9A958D]">{p.tagline}</p>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#4A4742] dark:text-[#C5C0B6]">{p.sku}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-[#1A1917] dark:text-[#F5F2EB]">
                        {currencySymbol}{p.price.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            p.stock <= 0
                              ? "bg-[#C4554D]/10 text-[#C4554D]"
                              : p.stock <= p.reorderAt
                              ? "bg-[#D97706]/10 text-[#D97706]"
                              : "bg-[#525B44]/10 text-[#525B44] dark:text-[#949F83]"
                          }`}
                        >
                          {p.stock <= 0 ? "Sold out" : `${p.stock} in stock`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 capitalize text-[#8A857D] dark:text-[#9A958D]">{p.kind}</td>
                      <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleRestockProduct(p.id, 12)}
                          className="px-2 py-1 text-[11px] bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded text-[#525B44] dark:text-[#949F83] hover:border-[#525B44]"
                        >
                          + Restock
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

      {/* TAB 2: STOCK & SHELF */}
      {subTab === "stock" && (
        <div className="space-y-6">
          {/* 4 Stock KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] p-4 rounded-xl shadow-sm">
              <span className="text-xs text-[#8A857D] dark:text-[#9A958D] block mb-1">Stock value at cost</span>
              <p className="text-xl font-mono font-semibold text-[#1A1917] dark:text-[#F5F2EB]">
                {currencySymbol}{stockMetrics.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-[11px] text-[#8A857D] dark:text-[#9A958D] mt-1 block">
                {stockMetrics.totalUnits} units on hand
              </span>
            </div>

            <div className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] p-4 rounded-xl shadow-sm">
              <span className="text-xs text-[#8A857D] dark:text-[#9A958D] block mb-1">Roasted coffee on shelf</span>
              <p className="text-xl font-mono font-semibold text-[#525B44] dark:text-[#949F83]">
                {stockMetrics.coffeeCount} coffees
              </p>
              <span className="text-[11px] text-[#8A857D] dark:text-[#9A958D] mt-1 block">
                Freshly stocked
              </span>
            </div>

            <div className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] p-4 rounded-xl shadow-sm">
              <span className="text-xs text-[#8A857D] dark:text-[#9A958D] block mb-1">Under reorder point</span>
              <p className="text-xl font-mono font-semibold text-[#D97706]">
                {stockMetrics.lowStockCount} items
              </p>
              <span className="text-[11px] text-[#8A857D] dark:text-[#9A958D] mt-1 block truncate">
                {stockMetrics.lowStockNames || "All healthy"}
              </span>
            </div>

            <div className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] p-4 rounded-xl shadow-sm">
              <span className="text-xs text-[#8A857D] dark:text-[#9A958D] block mb-1">Claimed by open orders</span>
              <p className="text-xl font-mono font-semibold text-[#1A1917] dark:text-[#F5F2EB]">
                {stockMetrics.claimedCount} bags
              </p>
              <span className="text-[11px] text-[#8A857D] dark:text-[#9A958D] mt-1 block">
                Not packed yet
              </span>
            </div>
          </div>

          {/* Shelf & Store-room table */}
          <div className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#E6E1D8] dark:border-[#2C2D2B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-serif text-[#1A1917] dark:text-[#F5F2EB]">Shelf & store-room</h3>
                <p className="text-xs text-[#8A857D] dark:text-[#9A958D]">Sorted by inventory health and reorder limits</p>
              </div>

              <button
                onClick={() => setOnlyLowStock(!onlyLowStock)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  onlyLowStock
                    ? "bg-[#D97706]/10 border-[#D97706] text-[#D97706]"
                    : "bg-white dark:bg-[#252625] border-[#E6E1D8] dark:border-[#2C2D2B] text-[#4A4742] dark:text-[#C5C0B6]"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Running low only</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F0ECE1] dark:bg-[#252625] text-[#8A857D] dark:text-[#9A958D] font-medium border-b border-[#E6E1D8] dark:border-[#2C2D2B]">
                  <tr>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3 text-right">On hand</th>
                    <th className="py-2.5 px-3 text-right">Claimed</th>
                    <th className="py-2.5 px-3">Stock level</th>
                    <th className="py-2.5 px-3">Days left</th>
                    <th className="py-2.5 px-3 text-right">Reorder at</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E1D8] dark:divide-[#2C2D2B]">
                  {stockRows.map((product) => {
                    const maxStock = Math.max(product.reorderAt * 3, product.stock, 1);
                    const pct = Math.min(100, Math.round((product.stock / maxStock) * 100));
                    const isLow = product.stock <= product.reorderAt;
                    const daysLeft = product.stock > 0 ? Math.max(1, Math.round(product.stock / 2)) : 0;

                    return (
                      <tr key={product.id} className="hover:bg-[#F0ECE1]/50 dark:hover:bg-[#252625]/50 transition-colors">
                        <td className="py-3 px-3">
                          <p className="font-medium text-[#1A1917] dark:text-[#F5F2EB]">{product.name}</p>
                          <span className="font-mono text-[10px] text-[#8A857D] dark:text-[#9A958D]">{product.sku}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-[#1A1917] dark:text-[#F5F2EB]">
                          {product.stock}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[#8A857D] dark:text-[#9A958D]">
                          {product.stock > 0 ? "-2" : "0"}
                        </td>
                        <td className="py-3 px-3 min-w-[140px]">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-[11px] w-6">{product.stock}</span>
                            <div className="flex-1 h-2 bg-[#E6E1D8] dark:bg-[#333533] rounded-full overflow-hidden relative">
                              <div
                                className={`h-full rounded-full transition-all ${isLow ? "bg-[#D97706]" : "bg-[#525B44]"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${
                              product.stock <= 0
                                ? "bg-[#C4554D]/10 text-[#C4554D]"
                                : isLow
                                ? "bg-[#D97706]/10 text-[#D97706]"
                                : "text-[#4A4742] dark:text-[#C5C0B6]"
                            }`}
                          >
                            {product.stock <= 0 ? "Under a day" : `${daysLeft} days`}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[#8A857D] dark:text-[#9A958D]">
                          {product.reorderAt}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleRestockProduct(product.id, 12)}
                            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                              isLow
                                ? "bg-[#525B44] text-white hover:bg-[#434B37]"
                                : "bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] text-[#4A4742] dark:text-[#C5C0B6] hover:border-[#8A857D]"
                            }`}
                          >
                            {product.kind === "beans" ? "Roast batch" : "Restock"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COLLECTIONS */}
      {subTab === "collections" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((coll) => {
              const collProducts = normalizedProducts.filter((p) => p.collections.includes(coll.id));
              const sales30d = collProducts.reduce((sum, p) => sum + p.price * 8, 0);

              return (
                <div
                  key={coll.id}
                  className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl p-5 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-8 h-8 rounded-lg bg-[#525B44]/10 text-[#525B44] dark:text-[#949F83] flex items-center justify-center">
                        <Layers className="w-4 h-4" />
                      </span>
                      <h3 className="text-base font-serif font-medium text-[#1A1917] dark:text-[#F5F2EB]">{coll.name}</h3>
                    </div>
                    <p className="text-xs text-[#8A857D] dark:text-[#9A958D] mb-4 leading-relaxed">{coll.text}</p>

                    <div className="grid grid-cols-2 gap-3 py-3 border-y border-[#E6E1D8] dark:border-[#2C2D2B] text-xs mb-4">
                      <div>
                        <span className="text-[#8A857D] dark:text-[#9A958D] block text-[11px]">Products</span>
                        <span className="font-mono font-medium text-sm text-[#1A1917] dark:text-[#F5F2EB]">{collProducts.length}</span>
                      </div>
                      <div>
                        <span className="text-[#8A857D] dark:text-[#9A958D] block text-[11px]">Est. 30d Sales</span>
                        <span className="font-mono font-medium text-sm text-[#525B44] dark:text-[#949F83]">
                          {currencySymbol}{sales30d.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-[#4A4742] dark:text-[#C5C0B6]">
                      <input
                        type="checkbox"
                        checked={coll.featured}
                        onChange={() => handleToggleCollFeatured(coll.id)}
                        className="rounded border-[#E6E1D8] text-[#525B44] focus:ring-[#525B44]"
                      />
                      <span>On homepage</span>
                    </label>

                    <button
                      onClick={() => {
                        setKindFilter("any");
                        setSubTab("catalogue");
                        setSearchQuery(coll.name.split(" ")[0]);
                      }}
                      className="flex items-center gap-1 text-xs font-medium text-[#525B44] dark:text-[#949F83] hover:underline"
                    >
                      <span>View products</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* New Collection Card */}
            <button
              onClick={() => setNewCollModalOpen(true)}
              className="border-2 border-dashed border-[#E6E1D8] dark:border-[#2C2D2B] hover:border-[#525B44] dark:hover:border-[#949F83] rounded-xl p-5 flex flex-col items-center justify-center text-center group transition-colors min-h-[200px]"
            >
              <div className="w-10 h-10 rounded-full bg-[#F0ECE1] dark:bg-[#252625] group-hover:bg-[#525B44]/10 text-[#8A857D] group-hover:text-[#525B44] flex items-center justify-center mb-2 transition-colors">
                <Plus className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-medium text-[#1A1917] dark:text-[#F5F2EB] group-hover:text-[#525B44] transition-colors">
                New collection
              </h4>
              <p className="text-xs text-[#8A857D] dark:text-[#9A958D] mt-1 max-w-[200px]">
                Group coffees and gear into a curated shelf
              </p>
            </button>
          </div>
        </div>
      )}

      {/* PRODUCT DETAIL DRAWER */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-[#FAF8F5] dark:bg-[#1A1B1A] h-full shadow-2xl border-l border-[#E6E1D8] dark:border-[#2C2D2B] flex flex-col justify-between overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              {/* Drawer Hero */}
              <div className="relative aspect-video bg-[#F0ECE1] dark:bg-[#252625] border-b border-[#E6E1D8] dark:border-[#2C2D2B] overflow-hidden flex items-center justify-center">
                {selectedProduct.image ? (
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.name || ""}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                      const fb = e.currentTarget.parentElement?.querySelector(".prod-drawer-fb") as HTMLElement;
                      if (fb) fb.style.display = "flex";
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : null}
                <div className={`prod-drawer-fb w-full h-full ${selectedProduct.image ? "hidden" : "flex"} items-center justify-center`}>
                  <Package className="w-16 h-16 text-[#8A857D]/30" />
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-5 space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs px-2 py-0.5 bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded text-[#8A857D]">
                      {selectedProduct.sku}
                    </span>
                    <span className="text-xs capitalize text-[#8A857D]">
                      {selectedProduct.kind}
                    </span>
                  </div>
                  <h2 className="text-xl font-serif text-[#1A1917] dark:text-[#F5F2EB] font-semibold">
                    {selectedProduct.name}
                  </h2>
                  <p className="text-xs text-[#8A857D] dark:text-[#9A958D] mt-1">
                    {selectedProduct.tagline}
                  </p>
                </div>

                {/* Status Segmented */}
                <div className="bg-[#F0ECE1] dark:bg-[#252625] p-1 rounded-lg flex items-center text-xs font-medium">
                  {["active", "draft", "archived"].map((st) => (
                    <button
                      key={st}
                      onClick={() => handleUpdateStatus(st)}
                      className={`flex-1 py-1.5 rounded capitalize transition-all ${
                        selectedProduct.status === st
                          ? "bg-white dark:bg-[#333533] text-[#1A1917] dark:text-[#F5F2EB] shadow-xs font-semibold"
                          : "text-[#8A857D] hover:text-[#1A1917]"
                      }`}
                    >
                      {st === "active" ? "Live" : st}
                    </button>
                  ))}
                </div>

                {/* Price Editor */}
                <form onSubmit={handleSavePrice} className="p-3.5 bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl space-y-2">
                  <span className="text-xs font-medium text-[#4A4742] dark:text-[#C5C0B6]">
                    Retail Price per {selectedProduct.unit}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#8A857D]">
                        {currencySymbol}
                      </span>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={editablePrice}
                        onChange={(e) => setEditablePrice(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 text-xs font-mono bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg text-[#1A1917] dark:text-[#F5F2EB] focus:outline-none focus:border-[#525B44]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-1.5 text-xs font-medium bg-[#525B44] text-white rounded-lg hover:bg-[#434B37] transition-colors"
                    >
                      Save price
                    </button>
                  </div>
                  <p className="text-[11px] text-[#8A857D] dark:text-[#9A958D]">
                    Estimated margin: {Math.round((1 - selectedProduct.cost / (parseFloat(editablePrice) || 1)) * 100)}% at {currencySymbol}{selectedProduct.cost.toFixed(2)} cost
                  </p>
                </form>

                {/* Metrics 2-column */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl">
                    <span className="text-[#8A857D] block mb-1">Sold (30 days)</span>
                    <p className="text-base font-mono font-semibold text-[#1A1917] dark:text-[#F5F2EB]">24 units</p>
                    <span className="text-[11px] text-[#525B44] dark:text-[#949F83]">
                      {currencySymbol}{(selectedProduct.price * 24).toFixed(2)}
                    </span>
                  </div>

                  <div className="p-3 bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl">
                    <span className="text-[#8A857D] block mb-1">Available stock</span>
                    <p className="text-base font-mono font-semibold text-[#1A1917] dark:text-[#F5F2EB]">
                      {selectedProduct.stock} units
                    </p>
                    <span className="text-[11px] text-[#8A857D]">
                      Reorder level: {selectedProduct.reorderAt}
                    </span>
                  </div>
                </div>

                {/* Tasting notes */}
                {selectedProduct.notes?.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-medium text-[#4A4742] dark:text-[#C5C0B6]">Characteristics & Tasting Notes</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProduct.notes.map((n: string, i: number) => (
                        <span key={i} className="px-2 py-1 text-xs bg-[#F0ECE1] dark:bg-[#252625] text-[#1A1917] dark:text-[#F5F2EB] rounded-lg">
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Actions */}
            <div className="p-4 bg-white dark:bg-[#252625] border-t border-[#E6E1D8] dark:border-[#2C2D2B] flex items-center gap-2">
              <button
                onClick={() => handleRestockProduct(selectedProduct.id, 12)}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium bg-[#525B44] text-white rounded-lg hover:bg-[#434B37] transition-colors"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>{selectedProduct.kind === "beans" ? "Roast a batch (+12)" : "Book stock (+12)"}</span>
              </button>
              <button
                onClick={() => handleCopySku(selectedProduct.sku)}
                className="px-3 py-2 text-xs font-medium bg-[#F0ECE1] dark:bg-[#333533] text-[#4A4742] dark:text-[#C5C0B6] rounded-lg hover:text-[#1A1917] transition-colors flex items-center gap-1.5"
                title="Copy SKU"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>SKU</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW COLLECTION MODAL */}
      {newCollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-serif font-semibold text-[#1A1917] dark:text-[#F5F2EB]">New collection</h3>
              <button onClick={() => setNewCollModalOpen(false)} className="text-[#8A857D] hover:text-[#1A1917]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#8A857D] dark:text-[#9A958D]">
              Group related coffees, teas, or merch into a dedicated shelf on your store.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[#4A4742] dark:text-[#C5C0B6] block mb-1">Collection Name</label>
                <input
                  type="text"
                  placeholder="e.g. Summer Harvest"
                  value={newCollName}
                  onChange={(e) => setNewCollName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg text-[#1A1917] dark:text-[#F5F2EB] focus:outline-none focus:border-[#525B44]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#4A4742] dark:text-[#C5C0B6] block mb-1">Tagline / Description</label>
                <textarea
                  rows={2}
                  placeholder="A short subtitle shown on the shelf…"
                  value={newCollDesc}
                  onChange={(e) => setNewCollDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg text-[#1A1917] dark:text-[#F5F2EB] focus:outline-none focus:border-[#525B44]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setNewCollModalOpen(false)}
                className="px-3.5 py-2 text-xs text-[#8A857D] hover:text-[#1A1917]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!newCollName.trim()) {
                    showToast("Please enter a collection name", "error");
                    return;
                  }
                  const id = newCollName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                  setCollections((prev) => [
                    ...prev,
                    {
                      id,
                      name: newCollName.trim(),
                      text: newCollDesc.trim() || "Curated seasonal collection.",
                      featured: false,
                      tone: "olive",
                    },
                  ]);
                  setNewCollName("");
                  setNewCollDesc("");
                  setNewCollModalOpen(false);
                  showToast("Collection created", "success");
                }}
                className="px-4 py-2 text-xs font-medium bg-[#525B44] text-white rounded-lg hover:bg-[#434B37]"
              >
                Create collection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
