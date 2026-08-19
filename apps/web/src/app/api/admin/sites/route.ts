import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/route-auth";
import { fetchSites } from "@/lib/server/live-data";

export async function GET(request: NextRequest) {
  try {
    await requireApiRole("admin");
    const includeImages = request.nextUrl.searchParams.get("includeImages") !== "false";
    return NextResponse.json({ sites: await fetchSites({ includeImages }) });
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
