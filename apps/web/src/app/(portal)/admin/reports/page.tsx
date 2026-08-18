"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";
import { exportRowsToCsv, exportRowsToExcel, exportRowsToPdf } from "@/lib/exports";
import { MetricCard } from "@/components/app/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AdminReportsPage() {
  const { data } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: () =>
      fetchJson<{
        summary: {
          visitorsToday: number;
          checkedIn: number;
          checkedOut: number;
          totalVisitors: number;
          totalSites: number;
          totalSiteManagers: number;
        };
        reportRows: Array<Record<string, unknown>>;
      }>("/api/admin/reports"),
  });

  if (!data) return null;

  const columns = ["visitorName", "siteManagerName", "siteName", "companyName", "purposeOfVisit", "status", "checkInAt", "checkOutAt"];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Daily Report" value={data.summary.visitorsToday} helper="Visitors checked in today" />
        <MetricCard label="Checked-In" value={data.summary.checkedIn + data.summary.checkedOut} helper="Checked-in and completed activity" />
        <MetricCard label="Monthly Report" value={data.reportRows.length} helper="Report dataset rows" />
        <MetricCard label="Custom Range Ready" value="Yes" helper="Export filters can be applied client-side" />
      </div>

      <Card className="border-border/70">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle>Report Exports</CardTitle>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => exportRowsToPdf("aihp-vms-admin-report", columns, data.reportRows)}>Export PDF</Button>
            <Button variant="outline" onClick={() => exportRowsToExcel("aihp-vms-admin-report", data.reportRows)}>Export Excel</Button>
            <Button onClick={() => exportRowsToCsv("aihp-vms-admin-report", data.reportRows)}>Export CSV</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.reportRows.map((row, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={column}>{String(row[column] ?? "")}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
