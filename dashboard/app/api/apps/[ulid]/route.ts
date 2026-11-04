import { NextRequest, NextResponse } from "next/server";
import { serverFetch } from "@/lib/server-api";

export async function GET(
  req: NextRequest,
  { params }: { params: { ulid: string } }
) {
  try {
    const res = await serverFetch(`/api/apps/${params.ulid}`);
    if (res.error) {
      return NextResponse.json(
        { error: res.error.message || "App not found" },
        { status: res.status || 404 }
      );
    }
    return NextResponse.json(res.data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch application" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { ulid: string } }
) {
  try {
    const res = await serverFetch(`/api/apps/${params.ulid}`, {
      method: "DELETE",
    });

    if (res.error) {
      return NextResponse.json(
        { error: res.error.message || "Failed to delete application" },
        { status: res.status || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: res.data?.message || "Application deleted successfully",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error deleting application" },
      { status: 500 }
    );
  }
}
