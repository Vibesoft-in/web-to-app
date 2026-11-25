import { NextRequest, NextResponse } from "next/server";
import { serverFetch } from "@/lib/server-api";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await serverFetch(`/api/admin/users/${params.id}/block`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (result.error) {
      return NextResponse.json(result.error, { status: result.status });
    }

    return NextResponse.json(result.data);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to block customer: " + err.message },
      { status: 500 }
    );
  }
}
