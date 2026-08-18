"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";
import { exportRowsToCsv, exportRowsToExcel, exportRowsToPdf } from "@/lib/exports";
import { MetricCard } from "@/components/app/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
            <Button variant="outline" onClick={() => exportRowsToPdf("visitor-management-site-manager-report", Object.keys(data.visits[0] ?? {}), data.visits)}>PDF</Button>
            <Button variant="outline" onClick={() => exportRowsToExcel("visitor-management-site-manager-report", data.visits)}>Excel</Button>
            <Button onClick={() => exportRowsToCsv("visitor-management-site-manager-report", data.visits)}>CSV</Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Use the export controls above for site-level walk-in visitor reports.</p>
        </CardContent>
      </Card>
    </div>
  );
}
