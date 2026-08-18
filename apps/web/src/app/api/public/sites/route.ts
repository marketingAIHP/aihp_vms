import { NextResponse } from "next/server";
import { fetchSites } from "@/lib/server/live-data";

export async function GET() {
  try {
    const sites = await fetchSites();
    return NextResponse.json({ sites }, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch {
    return NextResponse.json({ message: "Sites are temporarily unavailable." }, { status: 503 });
  }
}
