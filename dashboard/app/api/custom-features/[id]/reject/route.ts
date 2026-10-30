import { NextRequest, NextResponse } from "next/server";
import { serverFetch } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await serverFetch(`/api/custom-features/${params.id}/reject`, {
    method: "POST",
  });
  if (result.error) {
    return NextResponse.json(result.error, { status: result.status });
  }
  return NextResponse.json(result.data);
}
