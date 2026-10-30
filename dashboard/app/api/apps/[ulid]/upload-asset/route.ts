import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_BASE_URL = process.env.BACKEND_API_URL || "http://127.0.0.1:8000";

export async function POST(
  req: NextRequest,
  { params }: { params: { ulid: string } }
) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;

    const formData = await req.formData();

    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${BACKEND_BASE_URL}/api/apps/${params.ulid}/upload-asset`, {
      method: "POST",
      headers,
      body: formData,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        data.error || { code: "UPLOAD_FAILED", message: data.message || "Failed to upload asset" },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { code: "SERVER_ERROR", message: err.message || "Upload failed" },
      { status: 500 }
    );
  }
}
