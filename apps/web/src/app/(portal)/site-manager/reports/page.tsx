"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";
import { exportRowsToCsv, exportRowsToExcel, exportRowsToPdf } from "@/lib/exports";
import { MetricCard } from "@/components/app/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function vehicleNumberFromRemarks(value: unknown) {
  const match = String(value ?? "").match(/(?:^|\n)Vehicle Number:\s*(.+)/i);
  return match?.[1]?.trim() || "-";
}

export default function SiteManagerReportsPage() {
  const { data } = useQuery({
    queryKey: ["site-manager-reports"],
    queryFn: () =>
      fetchJson<{
        visits: Array<Record<string, unknown>>;
        stats: { total: number; checkedIn: number; checkedOut: number };
      }>("/api/site-manager/reports"),
  });

  if (!data) return null;

  const reportRows = data.visits.map((visit) => ({
    "Visitor Name": visit.visitorName ?? "-",
    "Phone Number": visit.mobileNumber ?? "-",
    "Person To Meet": visit.siteManagerName ?? visit.personToMeet ?? "-",
    Site: visit.siteName ?? "-",
    Company: visit.companyName ?? "-",
    Purpose: visit.purposeOfVisit ?? "-",
    "Vehicle Number": vehicleNumberFromRemarks(visit.remarks),
    Status: visit.status ?? "-",
    "Check-In": visit.checkInAt ?? "-",
    "Check-Out": visit.checkOutAt ?? "-",
  }));
  const assignedSite = String(data.visits[0]?.siteName ?? "Assigned Site");
  const reportMetadata = {
    title: `AIHP VMS Site Visitor Report - ${assignedSite}`,
    filters: {
      "Report Scope": "All available visitor records",
      Site: assignedSite,
      "Generated At": new Date().toLocaleString(),
      "Total Records": reportRows.length,
    },
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Total Visitors" value={data.stats.total} helper="All visits for your site" />
        <MetricCard label="Checked-In" value={data.stats.checkedIn} helper="Active visitors" />
        <MetricCard label="Checked-Out" value={data.stats.checkedOut} helper="Completed visits" />
      </div>

      <Card className="border-border/70">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle>Download Reports</CardTitle>
          <div className="flex gap-3">
            <Button disabled={!reportRows.length} variant="outline" onClick={() => exportRowsToPdf("AIHP_VMS_Site_Manager_Visitor_Report", Object.keys(reportRows[0] ?? {}), reportRows, reportMetadata)}>PDF</Button>
            <Button disabled={!reportRows.length} variant="outline" onClick={() => exportRowsToExcel("AIHP_VMS_Site_Manager_Visitor_Report", reportRows, reportMetadata)}>Excel</Button>
            <Button disabled={!reportRows.length} onClick={() => exportRowsToCsv("AIHP_VMS_Site_Manager_Visitor_Report", reportRows, reportMetadata)}>CSV</Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Use the export controls above for site-level walk-in visitor reports.</p>
        </CardContent>
      </Card>
    </div>
  );
}
