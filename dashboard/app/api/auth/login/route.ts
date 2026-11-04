import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE_URL = process.env.BACKEND_API_URL || "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const response = await fetch(`${BACKEND_BASE_URL}/api/auth/login`, {
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
        data.errors?.email?.[0] ||
        data.errors?.password?.[0] ||
        data.message ||
        data.error?.message ||
        "The provided credentials are incorrect.";
      return NextResponse.json(
        data.error || { code: "INVALID_CREDENTIALS", message: errorMsg, errors: data.errors },
        { status: response.status }
      );
    }

    const { token, user } = data;

    // Set token in httpOnly secure cookie
    const res = NextResponse.json({
      message: "Logged in successfully",
      user,
    });

    res.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days (604,800s)
    });

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { code: "SERVER_ERROR", message: err.message || "Failed to process login" },
      { status: 500 }
    );
  }
}
