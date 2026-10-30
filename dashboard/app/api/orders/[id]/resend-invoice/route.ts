import { NextResponse } from "next/server";
import { serverFetch } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  let body = {};
  try {
    body = await request.json();
  } catch {}

  const result = await serverFetch(`/api/orders/${params.id}/resend-invoice`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (result.error) {
    return NextResponse.json(result.error, { status: result.status });
  }

  return NextResponse.json(result.data);
}
