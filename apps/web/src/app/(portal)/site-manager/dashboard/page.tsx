"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";
import { indiaToday } from "@/lib/format";
import { MetricCard } from "@/components/app/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function SiteManagerDashboardPage() {
  const today = indiaToday();
  const [site, setSite] = useState("all");
  const { data } = useQuery({
    queryKey: ["site-manager-overview", site],
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
        sites: Array<{ id: string; name: string }>;
      }>(`/api/site-manager/overview${site === "all" ? "" : `?site=${encodeURIComponent(site)}`}`),
  });

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="max-w-sm"><Select value={site} onValueChange={setSite}><SelectTrigger><SelectValue placeholder="Filter by site" /></SelectTrigger><SelectContent><SelectItem value="all">All assigned sites</SelectItem>{data.sites.map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard href={`/site-manager/visitors?date=${today}`} label="Today's Visitors" value={data.summary.todaysVisitors} helper="Checked in today" />
        <MetricCard href={`/site-manager/visitors?status=CHECKED_IN&date=${today}`} label="Checked In" value={data.summary.checkedInVisitors} helper="Checked in today" />
        <MetricCard href={`/site-manager/visitors?status=CHECKED_OUT&date=${today}`} label="Checked Out" value={data.summary.checkedOutVisitors} helper="Checked out today" />
        <MetricCard href="/site-manager/visitors" label="Total Visitors" value={data.summary.totalVisitors} helper="All walk-in records for your site" />
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
