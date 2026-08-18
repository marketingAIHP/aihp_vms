"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";
import { MetricCard } from "@/components/app/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SiteManagerDashboardPage() {
  const { data } = useQuery({
    queryKey: ["site-manager-overview"],
    queryFn: () =>
      fetchJson<{
        summary: {
          todaysVisitors: number;
          checkedInVisitors: number;
          checkedOutVisitors: number;
          totalVisitors: number;
        };
        visits: Array<Record<string, string>>;
        notifications: Array<{ id: string; title: string; message: string }>;
      }>("/api/site-manager/overview"),
  });

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Today's Visitors" value={data.summary.todaysVisitors} helper="Checked in today" />
        <MetricCard label="Checked In" value={data.summary.checkedInVisitors} helper="Currently on site" />
        <MetricCard label="Checked Out" value={data.summary.checkedOutVisitors} helper="Completed visits" />
        <MetricCard label="Total Visitors" value={data.summary.totalVisitors} helper="All walk-in records for your site" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Recent Visitors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.visits.map((visit) => (
              <div key={visit.id} className="rounded-2xl border border-border/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{visit.visitorName}</p>
                    <p className="text-sm text-muted-foreground">{visit.companyName} • {visit.purposeOfVisit}</p>
                  </div>
                  <Badge variant="outline">{visit.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
