import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/route-auth";
import { formatIndiaDate, indiaToday } from "@/lib/format";
import { fetchNotifications, fetchProfileByEmail, fetchVisits, mapNotification } from "@/lib/server/live-data";

export async function GET() {
  try {
    const session = await requireApiRole("site_manager");
    const profile = await fetchProfileByEmail(session.email);
    const assignedSite = profile?.company_name ?? "";
    const [visits, notifications] = await Promise.all([
      fetchVisits({ site: assignedSite }),
      fetchNotifications()
    ]);

    const scopedVisits = visits;
    const today = indiaToday();

    return NextResponse.json({
      summary: {
        todaysVisitors: scopedVisits.filter((visit) => formatIndiaDate(visit.checkInAt) === today).length,
        checkedInVisitors: scopedVisits.filter((visit) => visit.status === "CHECKED_IN" && formatIndiaDate(visit.checkInAt) === today).length,
        checkedOutVisitors: scopedVisits.filter((visit) => visit.status === "CHECKED_OUT" && formatIndiaDate(visit.checkOutAt ?? "") === today).length,
        totalVisitors: scopedVisits.length
      },
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
