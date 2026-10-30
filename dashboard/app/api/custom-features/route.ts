import { NextRequest, NextResponse } from "next/server";
import { serverFetch } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await serverFetch("/api/custom-features");
  if (result.error) {
    return NextResponse.json(result.error, { status: result.status });
  }
  return NextResponse.json(result.data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await serverFetch("/api/custom-features", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (result.error) {
    return NextResponse.json(result.error, { status: result.status });
  }
  return NextResponse.json(result.data, { status: 201 });
}
