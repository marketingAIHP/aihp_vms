import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/route-auth";
import { formatIndiaDate } from "@/lib/format";
import { fetchProfileByEmail, fetchVisits } from "@/lib/server/live-data";

export async function GET(request: NextRequest) {
  try {
    const session = await requireApiRole("site_manager");
    const profile = await fetchProfileByEmail(session.email);
    const assignedSite = profile?.company_name?.trim();
    if (!assignedSite) {
      return NextResponse.json({ message: "No site is assigned to this site manager." }, { status: 403 });
    }
    const visits = await fetchVisits({ site: assignedSite });
    const searchParams = new URL(request.url).searchParams;
    const search = searchParams.get("search")?.trim().toLowerCase();
    const status = searchParams.get("status")?.trim();
    const legacyDate = searchParams.get("date")?.trim();
    const fromDate = searchParams.get("fromDate")?.trim() || legacyDate;
    const toDate = searchParams.get("toDate")?.trim() || legacyDate;
    const scopedVisits = visits.filter((visit) => {
        if (status && visit.status !== status) return false;
        const checkInDate = formatIndiaDate(visit.checkInAt ?? "");
        if ((fromDate || toDate) && !checkInDate) return false;
        if (fromDate && checkInDate < fromDate) return false;
        if (toDate && checkInDate > toDate) return false;
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
