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
  const [date, setDate] = useState(() => (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("date") ?? ""));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setStatus(params.get("status") ?? "");
    setDate(params.get("date") ?? "");
  }, []);

  const { data } = useQuery({
    queryKey: ["site-manager-visitors", search, status, date],
    queryFn: () =>
      fetchJson<{
        visits: Array<Record<string, string>>;
      }>(`/api/site-manager/visitors?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}&date=${encodeURIComponent(date)}`),
  });

  const title = useMemo(() => {
    if (status === "CHECKED_IN" && date) return "Today's Check-In Visitors";
    if (status === "CHECKED_OUT" && date) return "Today's Check-Out Visitors";
    if (date) return "Today's Visitors";
    return "Visitors";
  }, [date, status]);

  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-4">
        <CardTitle>{title}</CardTitle>
        <div className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Search visitors, phone, company" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={status || "all"} onValueChange={(value) => setStatus(value === "all" ? "" : value)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Filter by status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="CHECKED_IN">Checked In</SelectItem>
              <SelectItem value="CHECKED_OUT">Checked Out</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
