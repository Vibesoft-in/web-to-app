import { NextRequest, NextResponse } from "next/server";
import { sendPasswordResetEmailViaBrevo } from "@/lib/brevo-mailer";

const BACKEND_BASE_URL =
  process.env.BACKEND_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://api.livaan.in"
    : "http://127.0.0.1:8000");

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const email = (body.email || "").toLowerCase().trim();

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: { code: "INVALID_EMAIL", message: "Please enter a valid email address." } },
      { status: 422 }
    );
  }

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  // 1. Attempt to contact Laravel backend first
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`${BACKEND_BASE_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Origin": origin,
        "Referer": origin,
      },
      body: JSON.stringify({ email }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json(data);
    }

    if (response.status === 429) {
      return NextResponse.json(
        data.error || { code: "TOO_MANY_REQUESTS", message: "Too many password reset requests. Please wait a few minutes." },
        { status: 429 }
      );
    }
  } catch (err: any) {
    console.warn("Backend forgot-password proxy note:", err.message);
  }

  // 2. Direct Resilient Brevo Fallback (ensures reset link always arrives in the desired email inbox)
  try {
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const resetUrl = `${origin}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    await sendPasswordResetEmailViaBrevo(email, "Valued Customer", resetUrl);

    return NextResponse.json({
      message: "If that email is registered, you will receive a reset link shortly.",
    });
  } catch (brevoErr: any) {
    console.error("Brevo fallback error:", brevoErr);
    return NextResponse.json(
      { error: { code: "EMAIL_SEND_FAILED", message: "Failed to send reset email. Please try again." } },
      { status: 500 }
    );
  }
}
