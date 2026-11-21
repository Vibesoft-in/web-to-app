import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_BASE_URL = process.env.BACKEND_API_URL || "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  const headerToken = authHeader?.replace(/^Bearer\s+/i, "").trim();
  const token =
    headerToken ||
    cookieStore.get("auth_token")?.value ||
    cookieStore.get("appifyhub_auth_token")?.value ||
    cookieStore.get("token")?.value;

  if (token) {
    try {
      await fetch(`${BACKEND_BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });
    } catch {
      // Ignore backend logout errors, always clear cookies
    }
  }

  const res = NextResponse.json({ message: "Logged out successfully", user: null });

  const authCookies = [
    "auth_token",
    "auth_user",
    "appifyhub_auth_token",
    "appifyhub_token",
    "token",
  ];

  for (const name of authCookies) {
    try {
      cookieStore.delete(name);
    } catch {}

    res.cookies.set({
      name,
      value: "",
      path: "/",
      expires: new Date(0),
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return res;
}
