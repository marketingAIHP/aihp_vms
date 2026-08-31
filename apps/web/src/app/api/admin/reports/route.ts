import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/route-auth";
import { buildReportSummary, fetchProfiles, fetchSites, fetchVisits } from "@/lib/server/live-data";

export async function GET(request: NextRequest) {
  try {
    await requireApiRole("admin");
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;
    const site = searchParams.get("site") ?? undefined;
    const siteManagerId = searchParams.get("siteManager") ?? undefined;
    const requestedStatus = searchParams.get("status");
    const status = requestedStatus === "CHECKED_IN" || requestedStatus === "CHECKED_OUT" ? requestedStatus : undefined;

    const [visits, profiles, sites] = await Promise.all([
      fetchVisits({ from, site, siteManagerId, status, to }),
      fetchProfiles(),
      fetchSites({ includeImages: false })
    ]);
    const activeSiteManagers = profiles.filter((profile) => profile.role === "host" && profile.is_active !== false);

    return NextResponse.json({
      summary: buildReportSummary(visits, sites.length, activeSiteManagers.length),
      reportRows: visits,
      filterOptions: {
        sites: sites.map((site) => ({ id: site.id, name: site.name })),
        siteManagers: activeSiteManagers.map((profile) => ({
          id: profile.id,
          name: profile.full_name,
          siteName: profile.company_name ?? ""
        }))
      }
    });
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
