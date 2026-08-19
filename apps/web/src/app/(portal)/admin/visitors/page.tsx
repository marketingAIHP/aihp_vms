"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchJson } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { SiteRecord } from "@/lib/types";

export default function AdminVisitorsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [site, setSite] = useState("");
  const [date, setDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["admin-visitors", search, status, site, date],
    queryFn: () =>
      fetchJson<{
        visitors: Array<Record<string, string>>;
        auditLogs: Array<{ id: string; detail: string; createdAt: string }>;
      }>(`/api/admin/visitors?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}&site=${encodeURIComponent(site)}&date=${encodeURIComponent(date)}`),
  });
  const { data: sitesData } = useQuery({
    queryKey: ["admin-sites", "visitor-filters"],
    queryFn: () => fetchJson<{ sites: SiteRecord[] }>("/api/admin/sites?includeImages=false"),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setStatus(params.get("status") ?? "");
    setDate(params.get("date") ?? "");
  }, []);

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; notes: string }) =>
      fetchJson(`/api/admin/visitors/${payload.id}`, {
        method: "PATCH",
        body: JSON.stringify({ rejectionReason: payload.notes }),
      }),
    onSuccess: () => {
      toast.success("Visitor details updated.");
      setEditNotes("");
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-visitors"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/admin/visitors/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Visitor deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-visitors"] });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/visits/${id}/check-out`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success("Visitor checked out.");
      queryClient.invalidateQueries({ queryKey: ["admin-visitors"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to check out visitor."),
  });

  const selectedVisitor = useMemo(
    () => data?.visitors.find((visitor) => visitor.id === selectedId) ?? null,
    [data?.visitors, selectedId]
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
      <Card className="border-border/70">
        <CardHeader className="space-y-4">
          <CardTitle>Visitor Management</CardTitle>
          <div className="grid gap-3 md:grid-cols-3">
            <Input placeholder="Search visitor, email, phone, site" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={status || "all"} onValueChange={(value) => setStatus(value === "all" ? "" : value)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Filter by status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="CHECKED_IN">Checked In</SelectItem>
                <SelectItem value="CHECKED_OUT">Checked Out</SelectItem>
              </SelectContent>
            </Select>
            <Select value={site || "all"} onValueChange={(value) => setSite(value === "all" ? "" : value)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Filter by site" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                {sitesData?.sites.filter((item) => item.isActive).map((item) => (
                  <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Visitor</TableHead>
                <TableHead>Site Manager</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>History</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.visitors.map((visitor) => (
                <TableRow key={visitor.id}>
                  <TableCell>
                    <div className="font-medium">{visitor.visitorName}</div>
                    <div className="text-xs text-muted-foreground">{visitor.companyName}</div>
                  </TableCell>
                  <TableCell>{visitor.siteManagerName}</TableCell>
                  <TableCell><Badge variant="outline">{visitor.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {visitor.checkInAt ? `In: ${formatDateTime(visitor.checkInAt)}` : "Not checked in"}
                    <br />
                    {visitor.checkOutAt ? `Out: ${formatDateTime(visitor.checkOutAt)}` : "No check-out yet"}
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => setSelectedId(visitor.id)}>
                      Edit
                    </Button>
                    {visitor.status === "CHECKED_IN" ? (
                      <Button disabled={checkOutMutation.isPending} size="sm" variant="outline" onClick={() => checkOutMutation.mutate(visitor.id)}>
                        Check-Out
                      </Button>
                    ) : null}
                    <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(visitor.id)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Edit visitor details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedVisitor ? (
              <>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{selectedVisitor.visitorName}</p>
                  <p className="text-sm text-muted-foreground">{selectedVisitor.email || selectedVisitor.mobileNumber}</p>
                </div>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Update notes or visit comments"
                />
                <Button onClick={() => selectedId && updateMutation.mutate({ id: selectedId, notes: editNotes })}>
                  Save changes
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select a visitor row to view and update details.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Visit history and logs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.auditLogs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-border/70 p-3">
                <p className="text-sm">{log.detail}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
