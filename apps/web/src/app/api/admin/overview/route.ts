import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/route-auth";
import { buildMonthlyTrends, fetchAuditLogs, fetchProfiles, fetchSites, fetchVisitSummary, fetchVisits, mapAudit } from "@/lib/server/live-data";

export async function GET() {
  try {
    await requireApiRole("admin");

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [recentVisits, profiles, sites, auditLogs, visitSummary] = await Promise.all([
      fetchVisits({ from: sixMonthsAgo.toISOString() }),
      fetchProfiles(),
      fetchSites({ includeImages: false }),
      fetchAuditLogs(50),
      fetchVisitSummary()
    ]);

    const activeSiteManagers = profiles.filter((profile) => profile.role === "host" && profile.is_active !== false);
    const summary = {
      ...visitSummary,
      totalSites: sites.length,
      totalSiteManagers: activeSiteManagers.length
    };
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
      trends: buildMonthlyTrends(recentVisits),
      distribution: [
        { name: "Checked In", value: visitSummary.checkedIn },
        { name: "Checked Out", value: visitSummary.checkedOut }
      ],
      recentActivity: visitorActivity.map((item) => mapAudit(item))
    });
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
