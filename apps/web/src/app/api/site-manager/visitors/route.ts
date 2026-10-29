import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/route-auth";
import { formatIndiaDate } from "@/lib/format";
import { fetchAssignedSites, fetchProfileByEmail, fetchVisits } from "@/lib/server/live-data";

export async function GET(request: NextRequest) {
  try {
    const session = await requireApiRole("site_manager");
    const profile = await fetchProfileByEmail(session.email);
    const assignedSites = profile ? await fetchAssignedSites(profile) : [];
    const allowedSiteNames = assignedSites.map((site) => site.name);
    if (!allowedSiteNames.length) return NextResponse.json({ message: "No sites are assigned to this site manager." }, { status: 403 });
    const visits = await fetchVisits();
    const searchParams = new URL(request.url).searchParams;
    const search = searchParams.get("search")?.trim().toLowerCase();
    const status = searchParams.get("status")?.trim();
    const legacyDate = searchParams.get("date")?.trim();
    const fromDate = searchParams.get("fromDate")?.trim() || legacyDate;
    const toDate = searchParams.get("toDate")?.trim() || legacyDate;
    const site = searchParams.get("site")?.trim();
    if (site && !allowedSiteNames.includes(site)) return NextResponse.json({ message: "Unauthorized site." }, { status: 403 });
    const scopedVisits = visits.filter((visit) => {
        if (!allowedSiteNames.includes(visit.siteName)) return false;
        if (site && visit.siteName !== site) return false;
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

    return NextResponse.json({ visits: scopedVisits, sites: assignedSites.map(({ id, name }) => ({ id, name })), selectedSite: site ?? "all" });
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
