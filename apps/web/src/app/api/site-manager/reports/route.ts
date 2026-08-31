import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/route-auth";
import { fetchProfileByEmail, fetchVisits } from "@/lib/server/live-data";

export async function GET() {
  try {
    const session = await requireApiRole("site_manager");
    const profile = await fetchProfileByEmail(session.email);
    const scopedVisits = await fetchVisits({ site: profile?.company_name ?? "" });

    return NextResponse.json({
      visits: scopedVisits,
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
