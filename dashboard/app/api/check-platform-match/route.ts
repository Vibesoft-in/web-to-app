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

    let detectedPlatform: string | null = null;
    let isCustom = false;
    let urlLower = rawUrl.toLowerCase();

    // Fast domain signature checks
    if (urlLower.includes("myshopify.com") || urlLower.includes("shopify")) {
      detectedPlatform = "shopify";
    } else if (urlLower.includes("woocommerce") || urlLower.includes("woo")) {
      detectedPlatform = "woocommerce";
    } else if (urlLower.includes("wordpress.com") || urlLower.includes("wp.")) {
      detectedPlatform = "wordpress";
    } else if (
      urlLower.includes("wix.com") ||
      urlLower.includes("wixsite.com") ||
      urlLower.includes("squarespace.com") ||
      urlLower.includes("webflow.io") ||
      urlLower.includes("bigcommerce.com")
    ) {
      detectedPlatform = "custom";
      isCustom = true;
    }

    // If not determined by URL string, inspect page headers and HTML
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

        // Check for Shopify
        if (
          text.includes("cdn.shopify.com") ||
          text.includes("window.shopify") ||
          text.includes("shopify.theme") ||
          text.includes("shopify-payment-button") ||
          serverHeader.includes("cloudflare") && text.includes("myshopify")
        ) {
          detectedPlatform = "shopify";
        }
        // Check for WooCommerce (WordPress + WooCommerce indicators)
        else if (
          text.includes("woocommerce") ||
          text.includes("wc-ajax") ||
          text.includes("wp-content/plugins/woocommerce") ||
          text.includes("add-to-cart") && text.includes("wp-content")
        ) {
          detectedPlatform = "woocommerce";
        }
        // Check for generic WordPress
        else if (
          text.includes("wp-content") ||
          text.includes("wp-includes") ||
          text.includes('name="generator" content="wordpress') ||
          text.includes("wp-json")
        ) {
          detectedPlatform = "wordpress";
        }
        // Check for Wix, Squarespace, etc.
        else if (
          text.includes("wix.com") ||
          text.includes("squarespace.com") ||
          text.includes("webflow.com") ||
          text.includes("prestashop") ||
          text.includes("magento") ||
          text.includes("bigcommerce")
        ) {
          detectedPlatform = "custom";
          isCustom = true;
        }
      } catch (e) {
        // If fetch fails or timeouts, fallback gracefully to selected platform if present
        if (selectedPlatform && ["woocommerce", "shopify", "wordpress"].includes(selectedPlatform)) {
          detectedPlatform = selectedPlatform;
        }
      }
    }

    if (!detectedPlatform) {
      if (selectedPlatform && ["woocommerce", "shopify", "wordpress"].includes(selectedPlatform)) {
        detectedPlatform = selectedPlatform;
      } else {
        detectedPlatform = "woocommerce";
      }
    }

    if (detectedPlatform === "custom" || isCustom) {
      return NextResponse.json({
        success: true,
        detected_platform: "custom",
        is_custom: true,
        is_supported: false,
        matched: false,
        message:
          "This website appears to be built on a custom platform. We currently only convert websites built on WooCommerce, Shopify, or WordPress.",
      });
    }

    const finalPlatform = detectedPlatform || "woocommerce";
    const matched = !selectedPlatform || selectedPlatform === finalPlatform;
    const detectedName =
      finalPlatform.charAt(0).toUpperCase() + finalPlatform.slice(1);
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
