import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/route-auth";
import { formatIndiaDate, indiaToday } from "@/lib/format";
import { fetchAssignedSites, fetchNotifications, fetchProfileByEmail, fetchVisits, mapNotification } from "@/lib/server/live-data";

export async function GET(request: Request) {
  try {
    const session = await requireApiRole("site_manager");
    const profile = await fetchProfileByEmail(session.email);
    const assignedSites = profile ? await fetchAssignedSites(profile) : [];
    const siteFilter = new URL(request.url).searchParams.get("site")?.trim();
    const allowedSiteNames = assignedSites.map((site) => site.name);
    if (!allowedSiteNames.length) return NextResponse.json({ message: "No sites are assigned to this site manager." }, { status: 403 });
    if (siteFilter && !allowedSiteNames.includes(siteFilter)) return NextResponse.json({ message: "Unauthorized site." }, { status: 403 });
    const [visits, notifications] = await Promise.all([
      fetchVisits(),
      fetchNotifications()
    ]);

    const scopedVisits = visits.filter((visit) => allowedSiteNames.includes(visit.siteName) && (!siteFilter || visit.siteName === siteFilter));
    const today = indiaToday();

    return NextResponse.json({
      summary: {
        todaysVisitors: scopedVisits.filter((visit) => formatIndiaDate(visit.checkInAt) === today).length,
        checkedInVisitors: scopedVisits.filter((visit) => visit.status === "CHECKED_IN" && formatIndiaDate(visit.checkInAt) === today).length,
        checkedOutVisitors: scopedVisits.filter((visit) => visit.status === "CHECKED_OUT" && formatIndiaDate(visit.checkOutAt ?? "") === today).length,
        totalVisitors: scopedVisits.length
      },
      sites: assignedSites.map(({ id, name }) => ({ id, name })),
      selectedSite: siteFilter ?? "all",
      visits: scopedVisits.slice(0, 5),
      notifications: notifications
        .map((item) => mapNotification(item))
        .filter((item) => item.userId === profile?.id)
        .slice(0, 10)
    });
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
