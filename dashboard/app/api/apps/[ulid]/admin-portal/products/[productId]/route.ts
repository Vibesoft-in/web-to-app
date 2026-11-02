import { NextRequest, NextResponse } from "next/server";
import { serverFetch } from "@/lib/server-api";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { ulid: string; productId: string } }
) {
  const headers: Record<string, string> = {};
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }

  const result = await serverFetch(
    `/api/apps/${params.ulid}/admin-portal/products/${params.productId}`,
    {
      method: "DELETE",
      headers,
    }
  );

  if (result.error) {
    return NextResponse.json(result.error, { status: result.status });
  }

  return NextResponse.json(result.data, { status: result.status });
}
