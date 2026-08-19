"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";
import { formatCount, formatDateTime } from "@/lib/format";
import { MetricCard } from "@/components/app/metric-card";
import { VisitorStatusChart, VisitorTrendChart } from "@/components/app/analytics-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AdminDashboardPage() {
  const todayParts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Kolkata",
    year: "numeric",
  }).formatToParts(new Date());
  const today = ["year", "month", "day"]
    .map((type) => todayParts.find((part) => part.type === type)?.value)
    .join("-");
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fetchJson<{
      summary: {
        visitorsToday: number;
        checkedIn: number;
        checkedOut: number;
        totalVisitors: number;
        totalSites: number;
        totalSiteManagers: number;
      };
      trends: Array<{ month: string; visitors: number }>;
      distribution: Array<{ name: string; value: number }>;
      recentActivity: Array<{ id: string; action: string; detail: string; actorEmail: string; createdAt: string }>;
    }>("/api/admin/overview"),
  });

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard href={`/admin/visitors?date=${today}`} label="Today's Visitors" value={formatCount(data.summary.visitorsToday)} helper="Across all active sites" />
        <MetricCard href="/admin/visitors?status=CHECKED_IN" label="Visitors Checked In" value={formatCount(data.summary.checkedIn)} helper="Currently inside the premises" />
        <MetricCard href="/admin/visitors?status=CHECKED_OUT" label="Visitors Checked Out" value={formatCount(data.summary.checkedOut)} helper="Visits completed successfully" />
        <MetricCard href="/admin/visitors" label="Total Visitors" value={formatCount(data.summary.totalVisitors)} helper="All walk-in visits in the system" />
        <MetricCard href="/admin/sites" label="Total Sites" value={formatCount(data.summary.totalSites)} helper="Configured sites" />
        <MetricCard href="/admin/site-managers" label="Site Managers" value={formatCount(data.summary.totalSiteManagers)} helper="Active site manager accounts" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <VisitorTrendChart data={data.trends} />
        <VisitorStatusChart data={data.distribution} />
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Recent Visitor Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead className="text-right">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentActivity.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.action}</TableCell>
                  <TableCell>{item.actorEmail}</TableCell>
                  <TableCell>{item.detail}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatDateTime(item.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
