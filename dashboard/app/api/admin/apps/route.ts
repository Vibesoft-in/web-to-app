import { NextResponse } from "next/server";
import { serverFetch } from "@/lib/server-api";

export async function GET() {
  try {
    const result = await serverFetch("/api/admin/apps");

    if (result.error) {
      return NextResponse.json(result.error, { status: result.status });
    }

    return NextResponse.json(result.data);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch admin apps: " + err.message },
      { status: 500 }
    );
  }
}
