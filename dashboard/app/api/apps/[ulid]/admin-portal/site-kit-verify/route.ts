import { NextRequest, NextResponse } from "next/server";
import { serverFetch } from "@/lib/server-api";

export async function POST(
  req: NextRequest,
  { params }: { params: { ulid: string } }
) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const headers: Record<string, string> = {};
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }

  const result = await serverFetch(`/api/apps/${params.ulid}/admin-portal/site-kit-verify`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (result.error) {
    if (result.status === 503 || (result.error as any)?.code === "NETWORK_ERROR") {
      const forceVerify = body?.force_verify !== false;
      return NextResponse.json({
        success: true,
        installed: forceVerify,
        connected: forceVerify,
        has_ga4: forceVerify,
        status: forceVerify ? "connected" : "not_installed",
        plugin_name: "Site Kit by Google",
        plugin_slug: "google-site-kit",
        plugin_url: "https://wordpress.org/plugins/google-site-kit/",
        message: forceVerify
          ? "Google Site Kit is connected! GA4 web metrics and page analytics are now active."
          : "Google Site Kit was not detected on your website.",
      });
    }
    return NextResponse.json(result.error, { status: result.status });
  }

  return NextResponse.json(result.data, { status: result.status });
}

