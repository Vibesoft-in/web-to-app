import { NextRequest, NextResponse } from "next/server";
import { serverFetch } from "@/lib/server-api";

export async function POST(
  req: NextRequest,
  { params }: { params: { ulid: string } }
) {
  let body = {};
  try {
    body = await req.json();
  } catch {}

  const headers: Record<string, string> = {};
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }

  const result = await serverFetch(`/api/apps/${params.ulid}/admin-portal/terawallet-verify`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (result.error) {
    return NextResponse.json(result.error, { status: result.status });
  }

  return NextResponse.json(result.data, { status: result.status });
}

