import { NextRequest, NextResponse } from "next/server";
import dns from "dns";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let rawUrl = (body.url || "").trim();
    const selectedPlatform = (body.platform || "").trim().toLowerCase();
    const isManual = Boolean(body.manual);

    if (!rawUrl || rawUrl.length < 4 || !rawUrl.includes(".")) {
      return NextResponse.json({
        success: false,
        is_invalid: true,
        detected_platform: "invalid",
        title: "Invalid Website Entry",
        message: "Please enter a valid website URL (e.g. yourstore.com).",
      });
    }

    if (!/^https?:\/\//i.test(rawUrl)) {
      rawUrl = "https://" + rawUrl;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      return NextResponse.json({
        success: false,
        is_invalid: true,
        detected_platform: "invalid",
        title: "Invalid Website Entry",
        message: "Invalid website URL format. Please check for typos and enter a valid domain (e.g. yourstore.com).",
      });
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const domainParts = hostname.split(".");
    const tld = domainParts[domainParts.length - 1];

    // Basic domain syntax check: needs at least 2 parts, valid TLD with 2+ letters
    if (
      domainParts.length < 2 ||
      !tld ||
      tld.length < 2 ||
      !/^[a-z]+$/i.test(tld) ||
      domainParts.some((p) => !p || p.length === 0)
    ) {
      return NextResponse.json({
        success: false,
        is_invalid: true,
        detected_platform: "invalid",
        title: "Invalid Website Entry",
        message: `Invalid website entry: "${hostname}" is not a valid domain name. Please check for typos.`,
      });
    }

    // 1. DNS Resolution Check: Verify domain actually exists on the internet
    try {
      await dns.promises.lookup(hostname);
    } catch (dnsErr: any) {
      return NextResponse.json({
        success: false,
        is_invalid: true,
        detected_platform: "invalid",
        title: "Invalid Website Entry",
        message: `Invalid Website Entry: This website could not be found or reached (${hostname}). Please verify the domain and ensure your store is live.`,
      });
    }

    let detectedPlatform: "woocommerce" | "shopify" | "wordpress" | "custom" | null = null;
    let isCustom = false;
    const urlLower = rawUrl.toLowerCase();

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

    // If not determined by fast check, fetch page headers and HTML to inspect platform
    if (!detectedPlatform) {
      let response: Response | null = null;
      let text = "";

      // Try HTTPS first, fallback to HTTP if SSL handshake/port fails
      for (const proto of ["https://", "http://"]) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4500);
          const targetUrl = proto + hostname + (parsedUrl.pathname !== "/" ? parsedUrl.pathname : "");

          const res = await fetch(targetUrl, {
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
          response = res;
          text = (await res.text()).slice(0, 500000).toLowerCase();
          break;
        } catch (fetchErr) {
          // Continue to HTTP fallback
        }
      }

      // If site could not be reached via both HTTPS and HTTP, it's an invalid/unreachable entry
      if (!response) {
        return NextResponse.json({
          success: false,
          is_invalid: true,
          detected_platform: "invalid",
          title: "Invalid Website Entry",
          message: `Invalid Website Entry: This website could not be reached (${hostname}). Please check the URL and ensure the website is online.`,
        });
      }

      // If response returned 404 Not Found
      if (response.status === 404) {
        return NextResponse.json({
          success: false,
          is_invalid: true,
          detected_platform: "invalid",
          title: "Invalid Website Entry",
          message: `Invalid Website Entry: This website returned 404 Not Found (${hostname}). Please verify the domain.`,
        });
      }

      const headers = response.headers;
      const serverHeader = (headers.get("server") || "").toLowerCase();
      const poweredBy = (headers.get("x-powered-by") || "").toLowerCase();

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
      // 4. Site is LIVE and REACHABLE, but not Woo/Shopify/WP -> Genuine Custom Platform!
      else {
        detectedPlatform = "custom";
        isCustom = true;
      }
    }

    // Custom Platform response (site is verified live, but unsupported platform)
    if (!detectedPlatform || detectedPlatform === "custom" || isCustom) {
      return NextResponse.json({
        success: true,
        detected_platform: "custom",
        is_custom: true,
        is_supported: false,
        matched: false,
        title: "Custom Platform Detected",
        message:
          "Custom Platform Detected: This website appears to be built on a custom platform. AppifyHub only converts websites built on WooCommerce, Shopify, or WordPress.",
      });
    }

    // Supported platform detected (woocommerce, shopify, or wordpress)
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
      { success: false, is_invalid: true, message: err.message || "Failed to verify website." },
      { status: 500 }
    );
  }
}
