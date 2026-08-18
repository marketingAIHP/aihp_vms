"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";
import { exportRowsToCsv, exportRowsToExcel, exportRowsToPdf } from "@/lib/exports";
import { MetricCard } from "@/components/app/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";

const columnLabels: Record<string, string> = {
  visitorName: "Visitor",
  siteManagerName: "Person To Meet",
  siteName: "Site",
  companyName: "Company",
  purposeOfVisit: "Purpose",
  status: "Status",
  checkInAt: "Check-In",
  checkOutAt: "Check-Out",
};

function formatReportValue(column: string, value: unknown) {
  if (value == null || value === "") return "-";
  if (column === "checkInAt" || column === "checkOutAt") {
    return formatDateTime(String(value));
  }
  return String(value);
}

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
  const reportRows = data.reportRows.map((row) =>
    Object.fromEntries(columns.map((column) => [column, formatReportValue(column, row[column])]))
  );
  const exportColumns = columns.map((column) => columnLabels[column] ?? column);
  const exportRows = reportRows.map((row) =>
    Object.fromEntries(columns.map((column) => [columnLabels[column] ?? column, row[column]]))
  );

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
            <Button variant="outline" onClick={() => exportRowsToPdf("aihp-vms-admin-report", exportColumns, exportRows)}>Export PDF</Button>
            <Button variant="outline" onClick={() => exportRowsToExcel("aihp-vms-admin-report", exportRows)}>Export Excel</Button>
            <Button onClick={() => exportRowsToCsv("aihp-vms-admin-report", exportRows)}>Export CSV</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column}>{columnLabels[column] ?? column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportRows.map((row, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={column}>{String(row[column] ?? "-")}</TableCell>
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
