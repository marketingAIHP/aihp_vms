"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";
import { exportRowsToCsv, exportRowsToExcel, exportRowsToPdf } from "@/lib/exports";
import { MetricCard } from "@/components/app/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function vehicleNumberFromRemarks(value: unknown) {
  const match = String(value ?? "").match(/(?:^|\n)Vehicle Number:\s*(.+)/i);
  return match?.[1]?.trim() || "-";
}

export default function SiteManagerReportsPage() {
  const [site, setSite] = useState("all");
  const { data } = useQuery({
    queryKey: ["site-manager-reports", site],
    queryFn: () =>
      fetchJson<{
        visits: Array<Record<string, unknown>>;
        stats: { total: number; checkedIn: number; checkedOut: number };
        sites: Array<{ id: string; name: string }>;
      }>(`/api/site-manager/reports${site === "all" ? "" : `?site=${encodeURIComponent(site)}`}`),
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
  const selectedSiteLabel = site === "all" ? "All assigned sites" : site;
  const reportMetadata = {
    title: `AIHP VMS Site Visitor Report - ${selectedSiteLabel}`,
    filters: {
      "Report Scope": "All available visitor records",
      Site: selectedSiteLabel,
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
          <div className="space-y-2">
            <CardTitle>Download Reports</CardTitle>
            <div className="max-w-sm">
              <Select value={site} onValueChange={setSite}>
                <SelectTrigger aria-label="Filter report by site"><SelectValue placeholder="Select site" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assigned sites</SelectItem>
                  {data.sites.map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3">
            <Button disabled={!reportRows.length} variant="outline" onClick={() => exportRowsToPdf("AIHP_VMS_Site_Manager_Visitor_Report", Object.keys(reportRows[0] ?? {}), reportRows, reportMetadata)}>PDF</Button>
            <Button disabled={!reportRows.length} variant="outline" onClick={() => exportRowsToExcel("AIHP_VMS_Site_Manager_Visitor_Report", reportRows, reportMetadata)}>Excel</Button>
            <Button disabled={!reportRows.length} onClick={() => exportRowsToCsv("AIHP_VMS_Site_Manager_Visitor_Report", reportRows, reportMetadata)}>CSV</Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Choose a site, then download only that site&apos;s walk-in visitor report. Select all assigned sites to export the combined report.</p>
        </CardContent>
      </Card>
    </div>
  );
}
