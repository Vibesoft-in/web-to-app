import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const url = new URL(request.url);
    const isDownload = url.searchParams.get("download") === "1" || url.searchParams.get("format") === "pdf";

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";
    const token = cookies().get("auth_token")?.value;

    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const endpoint = isDownload
      ? `${backendUrl}/api/orders/${params.id}/invoice/download`
      : `${backendUrl}/api/orders/${params.id}/invoice`;

    const res = await fetch(endpoint, {
      cache: "no-store",
      headers,
    });

    if (isDownload) {
      const buffer = await res.arrayBuffer();
      const disposition = res.headers.get("content-disposition") || `attachment; filename="Invoice-ORD-${params.id}.pdf"`;
      return new Response(buffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": disposition,
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    const html = await res.text();
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Could not generate invoice.", details: error.message },
      { status: 500 }
    );
  }
}
