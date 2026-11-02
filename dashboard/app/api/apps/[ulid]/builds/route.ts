import { NextRequest, NextResponse } from "next/server";
import { serverFetch } from "@/lib/server-api";

export async function GET(
  req: NextRequest,
  { params }: { params: { ulid: string } }
) {
  const headers: Record<string, string> = {};
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }

  const result = await serverFetch(`/api/apps/${params.ulid}/builds`, {
    headers,
  });

  if (result.error) {
    return NextResponse.json(result.error, { status: result.status });
  }

  return NextResponse.json(result.data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { ulid: string } }
) {
  const headers: Record<string, string> = {};
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }

  const result = await serverFetch(`/api/apps/${params.ulid}/builds`, {
    method: "POST",
    headers,
  });

  if (result.error) {
    return NextResponse.json(result.error, { status: result.status });
  }

  return NextResponse.json(result.data, { status: result.status });
}
