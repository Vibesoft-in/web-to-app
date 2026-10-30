import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_BASE_URL = process.env.BACKEND_API_URL || "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;

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
      // Ignore backend logout errors, always clear cookie
    }
  }

  cookieStore.delete("auth_token");

  const res = NextResponse.json({ message: "Logged out successfully", user: null });
  res.cookies.set({
    name: "auth_token",
    value: "",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  res.cookies.delete("auth_token");

  return res;
}
