import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { serverFetch } from "@/lib/server-api";

export async function GET(req: NextRequest) {
  const cookieStore = cookies();
  const headerToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const token =
    headerToken ||
    cookieStore.get("auth_token")?.value ||
    cookieStore.get("appifyhub_auth_token")?.value ||
    cookieStore.get("token")?.value;

  const cachedUserStr = cookieStore.get("auth_user")?.value;
  let cachedUser: any = null;
  if (cachedUserStr) {
    try {
      cachedUser = JSON.parse(cachedUserStr);
    } catch {}
  }

  // If no token exists, the user is definitively unauthenticated
  if (!token) {
    const res = NextResponse.json({ user: null });
    if (cachedUserStr) {
      try {
        res.cookies.delete("auth_user");
      } catch {}
    }
    return res;
  }

  try {
    const result = await serverFetch("/api/user", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!result.error && result.data) {
      const res = NextResponse.json({ user: result.data });
      // Refresh cached user cookie
      res.cookies.set({
        name: "auth_user",
        value: JSON.stringify(result.data),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      return res;
    }

    // Genuinely revoked or expired token
    if (result.status === 401) {
      const res = NextResponse.json({ user: null, session_expired: true }, { status: 401 });
      res.cookies.delete("auth_token");
      res.cookies.delete("auth_user");
      return res;
    }

    // If backend gave 500/502/503 (server or database error), DO NOT log user out if token is present
    if (cachedUser) {
      return NextResponse.json({ user: cachedUser, is_cached: true });
    }

    // If no cached user and backend is down, return 503 error rather than { user: null }
    return NextResponse.json(
      { error: "Backend temporarily unavailable", user: null },
      { status: 503 }
    );
  } catch {
    // Backend unreachable / network timeout
    if (cachedUser) {
      return NextResponse.json({ user: cachedUser, is_cached: true });
    }
    return NextResponse.json(
      { error: "Backend service unreachable", user: null },
      { status: 503 }
    );
  }
}

