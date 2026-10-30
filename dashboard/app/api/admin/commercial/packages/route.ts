import { NextResponse } from "next/server";
import { serverFetch } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await serverFetch("/api/admin/commercial/packages");
  if (result.error) {
    return NextResponse.json(result.error, { status: result.status });
  }
  return NextResponse.json(result.data);
}
