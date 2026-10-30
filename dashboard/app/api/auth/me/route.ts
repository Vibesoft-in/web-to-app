import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { serverFetch } from "@/lib/server-api";

export async function GET() {
  const token = cookies().get("auth_token")?.value;
  if (!token) {
    return NextResponse.json({ user: null });
  }

  const result = await serverFetch("/api/user");

  if (result.error || !result.data) {
    const res = NextResponse.json({ user: null });
    res.cookies.delete("auth_token");
    return res;
  }

  return NextResponse.json({ user: result.data });
}
