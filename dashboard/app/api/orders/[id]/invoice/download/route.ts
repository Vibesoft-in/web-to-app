import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";
    const token = cookies().get("auth_token")?.value;

    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${backendUrl}/api/orders/${params.id}/invoice/download`, {
      cache: "no-store",
      headers,
    });

    const buffer = await res.arrayBuffer();
    const disposition =
      res.headers.get("content-disposition") || `attachment; filename="Invoice-ORD-${params.id}.pdf"`;

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": disposition,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Could not download invoice.", details: error.message },
      { status: 500 }
    );
  }
}

