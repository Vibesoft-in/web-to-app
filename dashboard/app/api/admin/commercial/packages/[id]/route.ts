import { NextRequest, NextResponse } from "next/server";
import { serverFetch } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const result = await serverFetch(`/api/admin/commercial/packages/${params.id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (result.error) {
    return NextResponse.json(result.error, { status: result.status });
  }
  return NextResponse.json(result.data);
}
