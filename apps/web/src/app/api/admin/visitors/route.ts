import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/route-auth";
import { fetchAuditLogs, fetchVisits, mapAudit } from "@/lib/server/live-data";

export async function GET(request: NextRequest) {
  try {
    await requireApiRole("admin");
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim().toLowerCase();
    const status = searchParams.get("status")?.trim();
    const site = searchParams.get("site")?.trim();
    const date = searchParams.get("date")?.trim();

    const [visits, auditLogs] = await Promise.all([fetchVisits(), fetchAuditLogs(10)]);

    const filtered = visits.filter((visit) => {
      if (date && !visit.checkInAt.startsWith(date)) return false;
      if (site && visit.siteName !== site && visit.siteId !== site) return false;
      if (status && visit.status !== status) return false;
      if (search) {
        const haystack = [
          visit.visitorName,
          visit.mobileNumber,
          visit.email,
          visit.companyName,
          visit.personToMeet,
          visit.siteName,
          visit.siteManagerName
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    return NextResponse.json({ visitors: filtered, auditLogs: auditLogs.map((item) => mapAudit(item)) });
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
