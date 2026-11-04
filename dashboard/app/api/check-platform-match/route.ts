import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let rawUrl = (body.url || "").trim();
    const selectedPlatform = (body.platform || "").trim().toLowerCase();
    const isManual = Boolean(body.manual);

    if (!rawUrl || rawUrl.length < 4 || !rawUrl.includes(".")) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid website URL." },
        { status: 400 }
      );
    }

    if (!/^https?:\/\//i.test(rawUrl)) {
      rawUrl = "https://" + rawUrl;
    }

    let detectedPlatform: "woocommerce" | "shopify" | "wordpress" | "custom" | null = null;
    let isCustom = false;
    let urlLower = rawUrl.toLowerCase();

    // Fast domain checks for known custom or non-ecommerce giants
    const knownCustomDomains = [
      "google.",
      "youtube.",
      "facebook.",
      "instagram.",
      "twitter.",
      "x.com",
      "apple.",
      "microsoft.",
      "linkedin.",
      "github.",
      "netflix.",
      "wikipedia.",
      "yahoo.",
      "amazon.",
      "reddit.",
      "wix.com",
      "wixsite.com",
      "squarespace.com",
      "webflow.io",
      "webflow.com",
      "bigcommerce.com",
      "weebly.com",
      "magento.",
      "prestashop.",
    ];

    if (knownCustomDomains.some((d) => urlLower.includes(d))) {
      detectedPlatform = "custom";
      isCustom = true;
    } else if (urlLower.includes("myshopify.com")) {
      detectedPlatform = "shopify";
    } else if (urlLower.includes("woocommerce.com")) {
      detectedPlatform = "woocommerce";
    } else if (urlLower.includes("wordpress.com") || urlLower.includes("wp.me")) {
      detectedPlatform = "wordpress";
    }

    // If not determined by fast check, inspect page headers and HTML
    if (!detectedPlatform) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(rawUrl, {
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 AppifyHub/1.0",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          signal: controller.signal,
          redirect: "follow",
        });

        clearTimeout(timeoutId);

        const headers = response.headers;
        const serverHeader = (headers.get("server") || "").toLowerCase();
        const poweredBy = (headers.get("x-powered-by") || "").toLowerCase();
        const text = (await response.text()).slice(0, 500000).toLowerCase();

        // 1. Check for Shopify
        if (
          text.includes("cdn.shopify.com") ||
          text.includes("window.shopify") ||
          text.includes("shopify.theme") ||
          text.includes("shopify-payment-button") ||
          headers.get("x-shopid") ||
          headers.get("x-shopify-stage") ||
          (serverHeader.includes("cloudflare") && text.includes("myshopify"))
        ) {
          detectedPlatform = "shopify";
        }
        // 2. Check for WooCommerce (WordPress + WooCommerce indicators)
        else if (
          text.includes("woocommerce") ||
          text.includes("wc-ajax") ||
          text.includes("wp-content/plugins/woocommerce") ||
          text.includes("woocommerce-price-amount") ||
          text.includes("woocommerce-cart") ||
          (text.includes("add-to-cart") && text.includes("wp-content"))
        ) {
          detectedPlatform = "woocommerce";
        }
        // 3. Check for generic WordPress
        else if (
          text.includes("wp-content") ||
          text.includes("wp-includes") ||
          text.includes('name="generator" content="wordpress') ||
          text.includes("wp-json") ||
          poweredBy.includes("wordpress") ||
          headers.get("link")?.includes("wp-json")
        ) {
          detectedPlatform = "wordpress";
        }
        // 4. Any other website is a Custom Platform!
        else {
          detectedPlatform = "custom";
          isCustom = true;
        }
      } catch (e) {
        // If fetch fails (timeout, blocked, DNS, SSL, etc.)
        // Cannot verify as WooCommerce, Shopify, or WordPress -> treat as custom
        detectedPlatform = "custom";
        isCustom = true;
      }
    }

    // If still null or anything else -> custom platform
    if (!detectedPlatform || detectedPlatform === "custom" || isCustom) {
      return NextResponse.json({
        success: true,
        detected_platform: "custom",
        is_custom: true,
        is_supported: false,
        matched: false,
        message:
          "Custom Platform Detected: This website appears to be built on a custom platform. AppifyHub only converts websites built on WooCommerce, Shopify, or WordPress.",
      });
    }

    // Now detectedPlatform is guaranteed to be "woocommerce", "shopify", or "wordpress"
    const matched = !selectedPlatform || selectedPlatform === detectedPlatform;
    const detectedName =
      detectedPlatform.charAt(0).toUpperCase() + detectedPlatform.slice(1);
    const selectedName = selectedPlatform
      ? selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)
      : "";

    if (!selectedPlatform || !isManual) {
      return NextResponse.json({
        success: true,
        auto_platform: detectedPlatform,
        detected_platform: detectedPlatform,
        is_custom: false,
        is_supported: true,
        matched: true,
        message: `Website verified: Automatically detected and selected ${detectedName}.`,
      });
    }

    if (!matched) {
      return NextResponse.json({
        success: true,
        auto_platform: null,
        detected_platform: detectedPlatform,
        is_custom: false,
        is_supported: true,
        matched: false,
        message: `The website appears to be built on ${detectedName.toUpperCase()}, but you have selected ${selectedName.toUpperCase()}.`,
      });
    }

    return NextResponse.json({
      success: true,
      auto_platform: detectedPlatform,
      detected_platform: detectedPlatform,
      is_custom: false,
      is_supported: true,
      matched: true,
      message: "Website URL matches selected platform.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Failed to detect platform." },
      { status: 500 }
    );
  }
}
