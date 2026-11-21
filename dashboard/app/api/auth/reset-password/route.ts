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

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        data.errors?.password?.[0] ||
        data.errors?.token?.[0] ||
        data.errors?.email?.[0] ||
        data.error?.message ||
        data.message ||
        "Failed to reset password. Please verify the reset link or request a new one.";

      return NextResponse.json(
        data.error || { code: "RESET_FAILED", message: errorMsg },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Unable to reach authentication server. Please try again." } },
      { status: 500 }
    );
  }
}
