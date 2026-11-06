import { NextRequest, NextResponse } from "next/server";
import { serverFetch } from "@/lib/server-api";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { ulid: string; categoryId: string } }
) {
  const result = await serverFetch(
    `/api/apps/${params.ulid}/admin-portal/categories/${params.categoryId}`,
    {
      method: "DELETE",
    }
  );

  if (result.error) {
    return NextResponse.json(result.error, { status: result.status });
  }

  return NextResponse.json(result.data);
}
