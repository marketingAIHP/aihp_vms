import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/route-auth";
import { fetchProfileByEmail, fetchVisits } from "@/lib/server/live-data";

export async function GET(request: NextRequest) {
  try {
    const session = await requireApiRole("site_manager");
    const [profile, visits] = await Promise.all([fetchProfileByEmail(session.email), fetchVisits()]);
    const search = new URL(request.url).searchParams.get("search")?.trim().toLowerCase();
    const assignedSite = profile?.company_name ?? "";

    const scopedVisits = visits
      .filter((visit) => visit.siteName === assignedSite || visit.siteManagerId === profile?.id)
      .filter((visit) => {
        if (!search) return true;
        return [visit.visitorName, visit.mobileNumber, visit.companyName, visit.personToMeet]
          .join(" ")
          .toLowerCase()
          .includes(search);
      });

    return NextResponse.json({ visits: scopedVisits });
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
