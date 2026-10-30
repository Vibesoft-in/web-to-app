"use client";

import { useState, useEffect } from "react";
import { Eye, Edit3, Archive, Flame, Copy, X } from "lucide-react";

interface BestSellerModalProps {
  product: any | null;
  currencySymbol: string;
  onClose: () => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  onSavePrice?: (productId: string, newPrice: number) => void;
}

export function BestSellerModal({
  product,
  currencySymbol,
  onClose,
  showToast,
  onSavePrice,
}: BestSellerModalProps) {
  if (!product) return null;

  const [price, setPrice] = useState<string>(
    String(product.price ?? product.regular_price ?? 17)
  );
  const [status, setStatus] = useState<"live" | "draft" | "archived">(
    product.status === "draft"
      ? "draft"
      : product.status === "archived"
      ? "archived"
      : "live"
  );
  const [isCopied, setIsCopied] = useState(false);

  // Sync state if product changes
  useEffect(() => {
    setPrice(String(product.price ?? product.regular_price ?? 17));
    setStatus(
      product.status === "draft"
        ? "draft"
        : product.status === "archived"
        ? "archived"
        : "live"
    );
  }, [product]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const productName = product.name || "Undertow";
  const productSub =
    product.sub_category ||
    product.sub ||
    (product.category ? `${product.category} · Medium roast` : "House espresso · Medium roast");
  const productSku = product.sku || "LT-ESP-250";
  const productCategory = product.category || "Coffee";
  const productStock = product.stock_quantity ?? product.stock ?? 78;

  const productImage =
    (typeof product.image_url === "string" && product.image_url.trim()) ||
    (typeof product.image === "string" && product.image.trim()) ||
    (product.image?.src && typeof product.image.src === "string" ? product.image.src.trim() : null) ||
    (Array.isArray(product.images) && product.images.length > 0
      ? (typeof product.images[0] === "string" ? product.images[0].trim() : (product.images[0]?.src || null))
      : null) ||
    (Array.isArray(product.image_urls) && product.image_urls.length > 0 ? product.image_urls[0] : null) ||
    (typeof product.thumbnail === "string" && product.thumbnail.trim()) ||
    (product.thumbnail?.src && typeof product.thumbnail.src === "string" ? product.thumbnail.src.trim() : null) ||
    null;

  const handleSavePrice = () => {
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      showToast("Please enter a valid price.", "error");
      return;
    }
    if (onSavePrice) {
      onSavePrice(String(product.id || productSku), numericPrice);
    }
    showToast(
      `Price for "${productName}" updated to ${currencySymbol}${numericPrice}!`,
      "success"
    );
  };

  const handleRoastBatch = () => {
    const batchId = Math.floor(1000 + Math.random() * 9000);
    showToast(
      `🔥 Batch #${batchId} scheduled for roasting (${productName})!`,
      "success"
    );
  };

  const handleCopySku = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(productSku);
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    showToast(`SKU "${productSku}" copied to clipboard!`, "success");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] rounded-[32px] bg-white dark:bg-[#1f221b] border border-[#ded8ce] dark:border-[#33372c] p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Product Graphic Banner */}
        <div className="relative w-full h-[190px] rounded-[24px] bg-[#faeee5] dark:bg-[#2b211a] flex items-center justify-center overflow-hidden border border-[#f0ded3] dark:border-[#3d2f25]">
          {/* Close Button Top Right */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product view"
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-[#23241B] shadow-xs flex items-center justify-center border border-black/5 transition cursor-pointer z-10"
          >
            <X className="w-4 h-4 stroke-[2.2]" />
          </button>

          {/* Real Product Image from Store Website */}
          {productImage ? (
            <img
              src={productImage}
              alt={productName}
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
                const fb = e.currentTarget.parentElement?.querySelector(".modal-img-fallback") as HTMLElement;
                if (fb) fb.style.display = "flex";
              }}
              className="w-full h-full object-cover"
            />
          ) : null}

          {/* Fallback Graphic */}
          <div className={`modal-img-fallback w-full h-full ${productImage ? "hidden" : "flex"} items-center justify-center`}>
            {/* Centered Coffee Bean Icon */}
            <svg
              viewBox="0 0 64 64"
              className="w-20 h-20 text-[#8e5431] dark:text-[#be7b4f]"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Outer Bean Silhouette */}
              <path d="M 18 46 C 10 34 16 16 34 12 C 52 8 58 26 50 44 C 42 60 26 58 18 46 Z" />
              {/* S-curve crease */}
              <path d="M 34 12 C 28 26 38 38 32 52" />
            </svg>
          </div>

          {/* Bottom Right Swatch Dot */}
          <div className="absolute bottom-3.5 right-4 w-3.5 h-3.5 rounded-full bg-[#8e5431] dark:bg-[#be7b4f] shadow-xs z-10" />
        </div>

        {/* Product Title & Subtitle */}
        <div className="mt-5">
          <h3 className="text-[26px] font-black text-[#23241B] dark:text-[#f3f0e8] tracking-tight leading-tight">
            {productName}
          </h3>
          <p className="text-sm font-medium text-[#6f7060] dark:text-[#9a9c8f] mt-1">
            {productSub}
          </p>
        </div>

        {/* Badge Pills Row (SKU, Category, Stock) */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {/* SKU Pill */}
          <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-[#f3f1eb] dark:bg-[#2a2d24] text-[#23241B] dark:text-[#ded8ce]">
            {productSku}
          </span>

          {/* Category Pill */}
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#f3f1eb] dark:bg-[#2a2d24] text-[#23241B] dark:text-[#ded8ce]">
            {productCategory}
          </span>

          {/* Stock Status Pill */}
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#eaf5ee] dark:bg-[#1a2e22] text-[#296d43] dark:text-[#5cb87a] border border-[#d2e8d7] dark:border-[#264531]">
            {productStock} in stock
          </span>
        </div>

        {/* Status Segmented Control (Live / Draft / Archived) */}
        <div className="mt-4 p-1 rounded-2xl bg-[#f4f2ec] dark:bg-[#272a22] flex items-center gap-1 text-xs font-bold text-[#6f7060] dark:text-[#9a9c8f]">
          <button
            type="button"
            onClick={() => setStatus("live")}
            className={`flex-1 py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition ${
              status === "live"
                ? "bg-white dark:bg-[#1f221b] text-[#23241B] dark:text-white shadow-xs font-extrabold"
                : "hover:text-[#23241B] dark:hover:text-[#f3f0e8]"
            }`}
          >
            <Eye className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Live</span>
          </button>
          <button
            type="button"
            onClick={() => setStatus("draft")}
            className={`flex-1 py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition ${
              status === "draft"
                ? "bg-white dark:bg-[#1f221b] text-[#23241B] dark:text-white shadow-xs font-extrabold"
                : "hover:text-[#23241B] dark:hover:text-[#f3f0e8]"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Draft</span>
          </button>
          <button
            type="button"
            onClick={() => setStatus("archived")}
            className={`flex-1 py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition ${
              status === "archived"
                ? "bg-white dark:bg-[#1f221b] text-[#23241B] dark:text-white shadow-xs font-extrabold"
                : "hover:text-[#23241B] dark:hover:text-[#f3f0e8]"
            }`}
          >
            <Archive className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Archived</span>
          </button>
        </div>

        {/* Price Input & Save Row */}
        <div className="mt-4.5 space-y-1.5">
          <label className="text-xs font-bold text-[#6f7060] dark:text-[#9a9c8f] block">
            Price per 250 g bag
          </label>
          <div className="flex items-center gap-2.5">
            <div className="flex-1 h-12 flex items-center gap-2 px-4 rounded-2xl bg-[#fbf9f4] dark:bg-[#252820] border border-[#ded8ce] dark:border-[#363a2e] focus-within:border-[#557e2a] focus-within:bg-white dark:focus-within:bg-[#1f221b] focus-within:ring-2 focus-within:ring-[#557e2a]/20 transition">
              <span className="text-base font-extrabold text-[#23241B] dark:text-[#f3f0e8]">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-transparent text-base font-extrabold text-[#23241B] dark:text-[#f3f0e8] outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleSavePrice}
              className="h-12 px-5 rounded-2xl bg-white dark:bg-[#272a22] border border-[#ded8ce] dark:border-[#363a2e] text-xs font-extrabold text-[#23241B] dark:text-[#f3f0e8] hover:bg-[#f6f2ea] dark:hover:bg-[#30342a] transition shadow-xs flex-shrink-0"
            >
              Save price
            </button>
          </div>
        </div>

        {/* Bottom Action Buttons (Roast a batch + Copy SKU) */}
        <div className="mt-5 pt-2 flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRoastBatch}
            className="flex-1 h-12 rounded-2xl bg-[#4a6828] hover:bg-[#3f5721] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99]"
          >
            <Flame className="w-4 h-4 fill-white/20 stroke-[2.2]" />
            <span>Roast a batch</span>
          </button>

          <button
            type="button"
            onClick={handleCopySku}
            className="h-12 px-5 rounded-2xl border border-[#ded8ce] dark:border-[#363a2e] bg-white dark:bg-[#272a22] hover:bg-[#f6f2ea] dark:hover:bg-[#30342a] text-xs font-extrabold text-[#23241B] dark:text-[#f3f0e8] flex items-center justify-center gap-2 shadow-xs transition active:scale-[0.99] flex-shrink-0"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{isCopied ? "Copied!" : "Copy SKU"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
