import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { serverFetch } from "@/lib/server-api";

export async function GET() {
  const token = cookies().get("auth_token")?.value;
  if (!token) {
    return NextResponse.json({ user: null });
  }

  try {
    const result = await serverFetch("/api/user");

    if (!result.error && result.data) {
      return NextResponse.json({ user: result.data });
    }

    if (result.status === 401) {
      const res = NextResponse.json({ user: null });
      res.cookies.delete("auth_token");
      res.cookies.delete("auth_user");
      return res;
    }
  } catch (err) {
    // Backend unreachable (e.g. running on Vercel preview)
  }

  // Fallback to auth_user cookie if backend is offline / on Vercel preview
  const cachedUser = cookies().get("auth_user")?.value;
  if (cachedUser) {
    try {
      return NextResponse.json({ user: JSON.parse(cachedUser) });
    } catch {}
  }

  return NextResponse.json({ user: null });
}

