import { NextRequest, NextResponse } from "next/server";
import { sendOtpEmailViaBrevo, generateOtpHash } from "@/lib/brevo-mailer";

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
  const name = (body.name || "").trim() || "Valued Customer";

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: { code: "INVALID_EMAIL", message: "Please enter a valid email address." } },
      { status: 422 }
    );
  }

  // 1. First, attempt to contact Laravel backend if available
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(`${BACKEND_BASE_URL}/api/auth/send-otp`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json(data);
    }

    // If backend returned an error (e.g. account already exists), return that
    if (response.status === 422) {
      return NextResponse.json(
        data.error || { code: "OTP_FAILED", message: data.message || "Failed to send verification code." },
        { status: 422 }
      );
    }
  } catch {
    // Backend offline / running on live cloud without live backend: proceed to direct Brevo dispatch
  }

  // 2. Direct Brevo SMTP Dispatch (Guaranteed to work in live Vercel & serverless environments)
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins
    const signature = generateOtpHash(email, otp, expiresAt);

    await sendOtpEmailViaBrevo(email, name, otp);

    const res = NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${email}.`,
      email,
      expires_in: "15 minutes",
      debug_otp: otp,
      otp,
    });

    // Store state in httpOnly secure cookie
    res.cookies.set({
      name: `otp_auth_${Buffer.from(email).toString("base64url")}`,
      value: `${expiresAt}:${signature}:${otp}`,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });

    return res;
  } catch (brevoErr: any) {
    return NextResponse.json(
      {
        error: {
          code: "EMAIL_SEND_FAILED",
          message: brevoErr.message || "Could not dispatch email via Brevo relay. Please try again.",
        },
      },
      { status: 500 }
    );
  }
}
