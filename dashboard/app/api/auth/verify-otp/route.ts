import { NextRequest, NextResponse } from "next/server";

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
  const submittedOtp = (body.otp || "").trim();

  if (!email || !submittedOtp) {
    return NextResponse.json(
      { error: { code: "INVALID_REQUEST", message: "Email and OTP code are required." } },
      { status: 422 }
    );
  }

  // 1. Try Laravel backend first
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(`${BACKEND_BASE_URL}/api/auth/verify-otp`, {
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
      const res = NextResponse.json(data);
      res.cookies.set({
        name: `email_verified_${Buffer.from(email).toString("base64url")}`,
        value: "true",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60,
      });
      return res;
    }

    if (response.status === 422) {
      return NextResponse.json(
        data.error || { code: "INVALID_OTP", message: data.message || "Invalid verification code." },
        { status: 422 }
      );
    }
  } catch {
    // Backend offline / serverless mode: verify with fallback cookie
  }

  // 2. Direct Cookie-based verification fallback
  const cookieName = `otp_auth_${Buffer.from(email).toString("base64url")}`;
  const cookieValue = req.cookies.get(cookieName)?.value;

  const isDevBypass = process.env.NODE_ENV !== "production" && (submittedOtp === "123456" || submittedOtp === "999999");

  if (!cookieValue && !isDevBypass) {
    return NextResponse.json(
      { error: { code: "EXPIRED_OTP", message: "Verification code expired or not found. Please click 'Resend Code'." } },
      { status: 422 }
    );
  }

  if (cookieValue) {
    const parts = cookieValue.split(":");
    if (parts.length >= 3) {
      const expiresAt = parseInt(parts[0], 10);
      const actualOtp = parts[2];

      const isValid = (submittedOtp === actualOtp && Date.now() <= expiresAt) || isDevBypass;

      if (!isValid) {
        return NextResponse.json(
          { error: { code: "INVALID_OTP", message: "Incorrect verification code. Please check your email and try again." } },
          { status: 422 }
        );
      }
    }
  }

  const res = NextResponse.json({
    success: true,
    message: "Email verified successfully! You can now complete your registration.",
    email,
    verified_at: new Date().toISOString(),
  });

  // Mark email verified in cookie for 1 hour
  res.cookies.set({
    name: `email_verified_${Buffer.from(email).toString("base64url")}`,
    value: "true",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });

  return res;
}
