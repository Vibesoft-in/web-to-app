import { NextRequest, NextResponse } from "next/server";
import { serverFetch } from "@/lib/server-api";

export async function POST(
  req: NextRequest,
  { params }: { params: { ulid: string } }
) {
  try {
    const body = await req.json();
    const result = await serverFetch(`/api/apps/${params.ulid}/payment/create-order`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (result.error) {
      return NextResponse.json(result.error, { status: result.status });
    }

    return NextResponse.json(result.data);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to create Razorpay order: " + err.message },
      { status: 500 }
    );
  }
}
