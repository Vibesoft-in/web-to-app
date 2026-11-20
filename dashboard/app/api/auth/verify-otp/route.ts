import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE_URL = process.env.BACKEND_API_URL || "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/auth/verify-otp`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        data.error || { code: "VERIFY_FAILED", message: data.message || "Invalid verification code." },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { code: "SERVER_ERROR", message: err.message || "Failed to connect to verification service." },
      { status: 500 }
    );
  }
}
