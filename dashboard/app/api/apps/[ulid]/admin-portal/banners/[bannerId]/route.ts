import { NextRequest, NextResponse } from "next/server";
import { serverFetch } from "@/lib/server-api";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { ulid: string; bannerId: string } }
) {
  const result = await serverFetch(
    `/api/apps/${params.ulid}/admin-portal/banners/${params.bannerId}`,
    {
      method: "DELETE",
    }
  );

  if (result.error) {
    return NextResponse.json(result.error, { status: result.status });
  }

  return NextResponse.json(result.data);
}
