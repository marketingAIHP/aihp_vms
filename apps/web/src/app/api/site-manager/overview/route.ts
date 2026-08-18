import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/route-auth";
import { fetchNotifications, fetchProfileByEmail, fetchVisits, mapNotification } from "@/lib/server/live-data";

export async function GET() {
  try {
    const session = await requireApiRole("site_manager");
    const [profile, visits, notifications] = await Promise.all([
      fetchProfileByEmail(session.email),
      fetchVisits(),
      fetchNotifications()
    ]);

    const assignedSite = profile?.company_name ?? "";
    const scopedVisits = visits.filter((visit) => visit.siteName === assignedSite || visit.siteManagerId === profile?.id);
    const today = new Date().toDateString();

    return NextResponse.json({
      summary: {
        todaysVisitors: scopedVisits.filter((visit) => new Date(visit.checkInAt).toDateString() === today).length,
        checkedInVisitors: scopedVisits.filter((visit) => visit.status === "CHECKED_IN").length,
        checkedOutVisitors: scopedVisits.filter((visit) => visit.status === "CHECKED_OUT").length,
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
