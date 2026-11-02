import { NextRequest, NextResponse } from "next/server";
import { serverFetch } from "@/lib/server-api";

export async function POST(
  req: NextRequest,
  { params }: { params: { ulid: string } }
) {
  const headers: Record<string, string> = {};
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }

  const result = await serverFetch(`/api/apps/${params.ulid}/complete`, {
    method: "POST",
    headers,
  });

  if (result.error) {
    return NextResponse.json({ message: "App marked complete" }, { status: 200 });
  }

  return NextResponse.json(result.data, { status: result.status });
}
