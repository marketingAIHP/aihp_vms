import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/route-auth";
import { buildMonthlyTrends, buildReportSummary, fetchAuditLogs, fetchProfiles, fetchSites, fetchVisits, mapAudit } from "@/lib/server/live-data";

export async function GET() {
  try {
    await requireApiRole("admin");

    const [visits, profiles, sites, auditLogs] = await Promise.all([
      fetchVisits(),
      fetchProfiles(),
      fetchSites({ includeImages: false }),
      fetchAuditLogs(50)
    ]);

    const activeSiteManagers = profiles.filter((profile) => profile.role === "host" && profile.is_active !== false);
    const summary = buildReportSummary(visits, sites.length, activeSiteManagers.length);
    const seenActivity = new Set<string>();
    const visitorActivity = auditLogs.filter((item) => {
      if (item.target_table !== "visits") return false;
      if (!["CHECK_IN", "CHECK_OUT", "UPDATE_VISITOR", "DELETE_VISITOR"].includes(item.action)) return false;
      const key = `${item.action}:${item.target_id ?? item.detail}`;
      if (seenActivity.has(key)) return false;
      seenActivity.add(key);
      return true;
    }).slice(0, 6);

    return NextResponse.json({
      summary,
      trends: buildMonthlyTrends(visits),
      distribution: [
        { name: "Checked In", value: summary.checkedIn },
        { name: "Checked Out", value: summary.checkedOut }
      ],
      recentActivity: visitorActivity.map((item) => mapAudit(item))
    });
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
