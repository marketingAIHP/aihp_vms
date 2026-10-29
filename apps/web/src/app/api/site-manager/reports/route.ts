import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/route-auth";
import { fetchAssignedSites, fetchProfileByEmail, fetchVisits } from "@/lib/server/live-data";

export async function GET() {
  try {
    const session = await requireApiRole("site_manager");
    const profile = await fetchProfileByEmail(session.email);
    const assignedSites = profile ? await fetchAssignedSites(profile) : [];
    const allowedSiteNames = assignedSites.map((site) => site.name);
    if (!allowedSiteNames.length) {
      return NextResponse.json({ message: "No site is assigned to this site manager." }, { status: 403 });
    }
    const scopedVisits = (await fetchVisits()).filter((visit) => allowedSiteNames.includes(visit.siteName));

    return NextResponse.json({
      visits: scopedVisits,
      sites: assignedSites.map(({ id, name }) => ({ id, name })),
      stats: {
        total: scopedVisits.length,
        checkedIn: scopedVisits.filter((visit) => visit.status === "CHECKED_IN").length,
        checkedOut: scopedVisits.filter((visit) => visit.status === "CHECKED_OUT").length
      }
    });
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
