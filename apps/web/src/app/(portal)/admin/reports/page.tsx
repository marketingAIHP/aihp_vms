"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";
import { exportRowsToCsv, exportRowsToExcel, exportRowsToPdf } from "@/lib/exports";
import { MetricCard } from "@/components/app/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";

const columnLabels: Record<string, string> = {
  visitorName: "Visitor",
  mobileNumber: "Phone Number",
  siteManagerName: "Person To Meet",
  siteName: "Site",
  companyName: "Company",
  purposeOfVisit: "Purpose",
  status: "Status",
  checkInAt: "Check-In",
  checkOutAt: "Check-Out",
  vehicleNumber: "Vehicle Number",
};

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function reportDate(row: Record<string, unknown>) {
  const value = row.checkInAt;
  const date = value ? new Date(String(value)) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function vehicleNumberFromRemarks(value: unknown) {
  const match = String(value ?? "").match(/(?:^|\n)Vehicle Number:\s*(.+)/i);
  return match?.[1]?.trim() || "-";
}

function formatReportValue(column: string, value: unknown, row: Record<string, unknown>) {
  if (column === "vehicleNumber") return vehicleNumberFromRemarks(row.remarks);
  if (value == null || value === "") return "-";
  if (column === "checkInAt" || column === "checkOutAt") {
    return formatDateTime(String(value));
  }
  return String(value);
}

export default function AdminReportsPage() {
  const now = new Date();
  const [period, setPeriod] = useState("monthly");
  const [month, setMonth] = useState(String(now.getMonth()));
  const [quarter, setQuarter] = useState(String(Math.floor(now.getMonth() / 3) + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [fromDate, setFromDate] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`);
  const [toDate, setToDate] = useState(now.toISOString().slice(0, 10));
  const [site, setSite] = useState("all");
  const [siteManager, setSiteManager] = useState("all");
  const [status, setStatus] = useState("all");
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
        filterOptions: {
          sites: Array<{ id: string; name: string }>;
          siteManagers: Array<{ id: string; name: string; siteName: string }>;
        };
      }>("/api/admin/reports"),
  });

  const sourceRows = useMemo(() => data?.reportRows ?? [], [data?.reportRows]);
  const sites = data?.filterOptions.sites ?? [];
  const managers = useMemo(
    () => (data?.filterOptions.siteManagers ?? []).filter((manager) => site === "all" || manager.siteName === site),
    [data?.filterOptions.siteManagers, site]
  );
  const filteredSourceRows = useMemo(() => sourceRows.filter((row) => {
    const date = reportDate(row);
    if (!date) return false;
    if (site !== "all" && row.siteName !== site) return false;
    if (siteManager !== "all" && row.siteManagerId !== siteManager) return false;
    if (status !== "all" && row.status !== status) return false;
    if (period === "monthly") return date.getFullYear() === Number(year) && date.getMonth() === Number(month);
    if (period === "quarterly") return date.getFullYear() === Number(year) && Math.floor(date.getMonth() / 3) + 1 === Number(quarter);
    if (period === "yearly") return date.getFullYear() === Number(year);
    const from = new Date(`${fromDate}T00:00:00`);
    const to = new Date(`${toDate}T23:59:59.999`);
    return date >= from && date <= to;
  }), [fromDate, month, period, quarter, site, siteManager, sourceRows, status, toDate, year]);

  if (!data) return null;

  const columns = ["visitorName", "mobileNumber", "siteManagerName", "siteName", "companyName", "purposeOfVisit", "vehicleNumber", "status", "checkInAt", "checkOutAt"];
  const reportRows = filteredSourceRows.map((row) =>
    Object.fromEntries(columns.map((column) => [column, formatReportValue(column, row[column], row)]))
  );
  const exportColumns = columns.map((column) => columnLabels[column] ?? column);
  const exportRows = reportRows.map((row) =>
    Object.fromEntries(columns.map((column) => [columnLabels[column] ?? column, row[column]]))
  );
  const periodLabel = period === "monthly"
    ? `${monthNames[Number(month)]} ${year}`
    : period === "quarterly"
      ? `Q${quarter} ${year}`
      : period === "yearly"
        ? year
        : `${fromDate}_to_${toDate}`;
  const exportName = `AIHP_VMS_Admin_Visitor_Report_${periodLabel}_${site === "all" ? "All_Sites" : site}`.replace(/[^a-zA-Z0-9_-]+/g, "_");
  const reportMetadata = {
    title: `AIHP VMS Admin Visitor Report - ${periodLabel}`,
    filters: {
      "Report Type": `${period.charAt(0).toUpperCase()}${period.slice(1)} Visitor Report`,
      "Period / Date Range": period === "custom" ? `${fromDate} to ${toDate}` : periodLabel,
      Site: site === "all" ? "All Sites" : site,
      "Site Manager / Employee": siteManager === "all"
        ? "All Site Managers"
        : managers.find((manager) => manager.id === siteManager)?.name ?? siteManager,
      Status: status === "all" ? "All Statuses" : status.replaceAll("_", " "),
      "Generated At": new Date().toLocaleString(),
      "Total Records": exportRows.length,
    },
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Daily Report" value={data.summary.visitorsToday} helper="Visitors checked in today" />
        <MetricCard label="Checked-In" value={data.summary.checkedIn + data.summary.checkedOut} helper="Checked-in and completed activity" />
        <MetricCard label="Filtered Report" value={reportRows.length} helper="Records matching selected filters" />
        <MetricCard label="Custom Range Ready" value="Yes" helper="Export filters can be applied client-side" />
      </div>

      <Card className="border-border/70">
        <CardHeader><CardTitle>Report Filters</CardTitle></CardHeader>
        <CardContent className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-3 [&_[data-slot=select-trigger]]:h-11 [&_[data-slot=select-trigger]]:w-full">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger><SelectValue placeholder="Time period" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem><SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
          {period === "monthly" ? <Select value={month} onValueChange={setMonth}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{monthNames.map((name, index) => <SelectItem key={name} value={String(index)}>{name}</SelectItem>)}</SelectContent></Select> : null}
          {period === "quarterly" ? <Select value={quarter} onValueChange={setQuarter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[1, 2, 3, 4].map((value) => <SelectItem key={value} value={String(value)}>Q{value}</SelectItem>)}</SelectContent></Select> : null}
          {period !== "custom" ? <Select value={year} onValueChange={setYear}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: 8 }, (_, index) => now.getFullYear() - index).map((value) => <SelectItem key={value} value={String(value)}>{value}</SelectItem>)}</SelectContent></Select> : null}
          {period === "custom" ? <><Input className="h-11 w-full" aria-label="From date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /><Input className="h-11 w-full" aria-label="To date" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></> : null}
          <Select value={site} onValueChange={(value) => { setSite(value); setSiteManager("all"); }}><SelectTrigger><SelectValue placeholder="Site" /></SelectTrigger><SelectContent><SelectItem value="all">All Sites</SelectItem>{sites.map((option) => <SelectItem key={option.id} value={option.name}>{option.name}</SelectItem>)}</SelectContent></Select>
          <Select value={siteManager} onValueChange={setSiteManager}><SelectTrigger><SelectValue placeholder="Site Manager" /></SelectTrigger><SelectContent><SelectItem value="all">All Site Managers</SelectItem>{managers.map((manager) => <SelectItem key={manager.id} value={manager.id}>{manager.name}</SelectItem>)}</SelectContent></Select>
          <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="CHECKED_IN">Checked In</SelectItem><SelectItem value="CHECKED_OUT">Checked Out</SelectItem></SelectContent></Select>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle>Report Exports</CardTitle>
          <div className="flex flex-wrap gap-3">
            <Button disabled={!exportRows.length} variant="outline" onClick={() => exportRowsToPdf(exportName, exportColumns, exportRows, reportMetadata)}>Export PDF</Button>
            <Button disabled={!exportRows.length} variant="outline" onClick={() => exportRowsToExcel(exportName, exportRows, reportMetadata)}>Export Excel</Button>
            <Button disabled={!exportRows.length} onClick={() => exportRowsToCsv(exportName, exportRows, reportMetadata)}>Export CSV</Button>
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
              {!reportRows.length ? <TableRow><TableCell className="py-10 text-center text-muted-foreground" colSpan={columns.length}>No visitor records match the selected filters.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
