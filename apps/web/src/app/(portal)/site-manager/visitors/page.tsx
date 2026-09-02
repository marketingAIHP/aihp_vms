"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";

export default function SiteManagerVisitorsPage() {
  const [search, setSearch] = useState("");
  const { data } = useQuery({
    queryKey: ["site-manager-visitors", search],
    queryFn: () =>
      fetchJson<{
        visits: Array<Record<string, string>>;
      }>(`/api/site-manager/visitors?search=${encodeURIComponent(search)}`),
  });

  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-4">
        <CardTitle>Visitors</CardTitle>
        <Input placeholder="Search visitors, phone, company" value={search} onChange={(e) => setSearch(e.target.value)} />
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
