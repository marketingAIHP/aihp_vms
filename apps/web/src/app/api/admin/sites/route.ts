import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/route-auth";
import { fetchSites } from "@/lib/server/live-data";

export async function GET() {
  try {
    await requireApiRole("admin");
    return NextResponse.json({ sites: await fetchSites() });
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
