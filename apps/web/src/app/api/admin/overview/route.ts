import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/route-auth";
import { buildMonthlyTrends, buildReportSummary, fetchAuditLogs, fetchProfiles, fetchSites, fetchVisits, mapAudit } from "@/lib/server/live-data";

export async function GET() {
  try {
    await requireApiRole("admin");

    const [visits, profiles, sites, auditLogs] = await Promise.all([
      fetchVisits(),
      fetchProfiles(),
      fetchSites(),
      fetchAuditLogs(6)
    ]);

    const activeSiteManagers = profiles.filter((profile) => profile.role === "host" && profile.is_active !== false);
    const summary = buildReportSummary(visits, sites.length, activeSiteManagers.length);

    return NextResponse.json({
      summary,
      trends: buildMonthlyTrends(visits),
      distribution: [
        { name: "Checked In", value: summary.checkedIn },
        { name: "Checked Out", value: summary.checkedOut }
      ],
      recentActivity: auditLogs.map((item) => mapAudit(item))
    });
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
