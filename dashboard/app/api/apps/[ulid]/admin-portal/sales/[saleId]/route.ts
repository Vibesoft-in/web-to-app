import { NextRequest, NextResponse } from "next/server";
import { serverFetch } from "@/lib/server-api";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { ulid: string; saleId: string } }
) {
  const result = await serverFetch(
    `/api/apps/${params.ulid}/admin-portal/sales/${params.saleId}`,
    {
      method: "DELETE",
    }
  );

  if (result.error) {
    return NextResponse.json(result.error, { status: result.status });
  }

  return NextResponse.json(result.data);
}
