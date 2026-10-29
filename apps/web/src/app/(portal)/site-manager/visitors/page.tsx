"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function SiteManagerVisitorsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(() => (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("status") ?? ""));
  const [fromDate, setFromDate] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("fromDate") ?? params.get("date") ?? "";
  });
  const [toDate, setToDate] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("toDate") ?? params.get("date") ?? "";
  });
  const [site, setSite] = useState("all");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setStatus(params.get("status") ?? "");
    const linkedDate = params.get("date") ?? "";
    setFromDate(params.get("fromDate") ?? linkedDate);
    setToDate(params.get("toDate") ?? linkedDate);
  }, []);

  const { data } = useQuery({
    queryKey: ["site-manager-visitors", search, status, fromDate, toDate, site],
    queryFn: () =>
      fetchJson<{
        visits: Array<Record<string, string>>;
        sites: Array<{ id: string; name: string }>;
      }>(`/api/site-manager/visitors?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}${site === "all" ? "" : `&site=${encodeURIComponent(site)}`}`),
  });

  const title = useMemo(() => {
    if (fromDate || toDate) return "Visitors by Check-In Date";
    return "Visitors";
  }, [fromDate, toDate]);

  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-4">
        <CardTitle>{title}</CardTitle>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="grid gap-1 text-xs font-medium text-muted-foreground">
            <span>Site</span>
            <Select value={site} onValueChange={setSite}><SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All assigned sites</SelectItem>{data?.sites.map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}</SelectContent></Select>
          </div>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            <span>Search</span>
            <Input className="h-10" placeholder="Visitors, phone, company" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <div className="grid gap-1 text-xs font-medium text-muted-foreground">
            <span>Status</span>
            <Select value={status || "all"} onValueChange={(value) => setStatus(value === "all" ? "" : value)}>
              <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Filter by status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="CHECKED_IN">Checked In</SelectItem>
                <SelectItem value="CHECKED_OUT">Checked Out</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            <span>From date</span>
            <Input className="h-10" aria-label="Check-in from date" max={toDate || undefined} type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            <span>To date</span>
            <Input className="h-10" aria-label="Check-in to date" min={fromDate || undefined} type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </label>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Visitor</TableHead>
              <TableHead>Person To Meet</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Visit Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.visits.map((visit) => (
              <TableRow key={visit.id} className={visit.status === "CHECKED_IN" ? "bg-emerald-50/70 hover:bg-emerald-100/70" : "bg-red-50/70 hover:bg-red-100/70"}>
                <TableCell>
                  <div className="font-medium">{visit.visitorName}</div>
                  <div className="text-xs text-muted-foreground">{visit.companyName}</div>
                </TableCell>
                <TableCell>{visit.personToMeet}</TableCell>
                <TableCell><Badge className={visit.status === "CHECKED_IN" ? "border-emerald-300 bg-emerald-100 text-emerald-800" : "border-red-300 bg-red-100 text-red-800"} variant="outline">{visit.status}</Badge></TableCell>
                <TableCell>{formatDateTime(visit.checkInAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
