import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/route-auth";
import { fetchProfileByEmail, fetchVisits } from "@/lib/server/live-data";

export async function GET(request: NextRequest) {
  try {
    const session = await requireApiRole("site_manager");
    const profile = await fetchProfileByEmail(session.email);
    const visits = await fetchVisits({
      siteOrManager: { site: profile?.company_name ?? "", siteManagerId: profile?.id ?? "" }
    });
    const search = new URL(request.url).searchParams.get("search")?.trim().toLowerCase();
    const scopedVisits = visits.filter((visit) => {
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
