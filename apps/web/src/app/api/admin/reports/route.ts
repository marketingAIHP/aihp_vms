import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/route-auth";
import { buildReportSummary, fetchProfiles, fetchSites, fetchVisits } from "@/lib/server/live-data";

export async function GET() {
  try {
    await requireApiRole("admin");

    const [visits, profiles, sites] = await Promise.all([
      fetchVisits(),
      fetchProfiles(),
      fetchSites({ includeImages: false })
    ]);
    const activeSiteManagers = profiles.filter((profile) => profile.role === "host" && profile.is_active !== false);

    return NextResponse.json({
      summary: buildReportSummary(visits, sites.length, activeSiteManagers.length),
      reportRows: visits
    });
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
