import { NextResponse } from "next/server";
import { serverFetch } from "@/lib/server-api";

export async function GET() {
  try {
    const result = await serverFetch("/api/admin/users");

    if (result.error) {
      return NextResponse.json(result.error, { status: result.status });
    }

    return NextResponse.json(result.data);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch admin users: " + err.message },
      { status: 500 }
    );
  }
}
