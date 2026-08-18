"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchJson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AdminSiteManagersPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    siteId: "site-1",
    isActive: true,
  });

  const { data } = useQuery({
    queryKey: ["admin-site-managers"],
    queryFn: () => fetchJson<{ siteManagers: Array<Record<string, string | boolean>> }>("/api/admin/site-managers"),
  });

  const createSiteManager = useMutation({
    mutationFn: () =>
      fetchJson("/api/admin/site-managers", {
        method: "POST",
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      toast.success("Site Manager created.");
      setForm({ name: "", email: "", phone: "", siteId: "site-1", isActive: true });
      queryClient.invalidateQueries({ queryKey: ["admin-site-managers"] });
    },
  });

  const toggleSiteManager = useMutation({
    mutationFn: (payload: { id: string; isActive: boolean }) =>
      fetchJson(`/api/admin/site-managers/${payload.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: payload.isActive }),
      }),
    onSuccess: () => {
      toast.success("Site Manager updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-site-managers"] });
    },
  });

  const deleteSiteManager = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/admin/site-managers/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Site Manager deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-site-managers"] });
    },
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Site Managers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Site Manager</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.siteManagers.map((manager) => (
                <TableRow key={String(manager.id)}>
                  <TableCell>
                    <div className="font-medium">{String(manager.name)}</div>
                    <div className="text-xs text-muted-foreground">{String(manager.email)}</div>
                  </TableCell>
                  <TableCell>{String(manager.phone)}</TableCell>
                  <TableCell>{String(manager.siteName)}</TableCell>
                  <TableCell>{manager.isActive ? "Active" : "Inactive"}</TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleSiteManager.mutate({ id: String(manager.id), isActive: !manager.isActive })}
                    >
                      {manager.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteSiteManager.mutate(String(manager.id))}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Create Site Manager</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} />
          <Input placeholder="Email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} />
          <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))} />
          <Input placeholder="Site Id" value={form.siteId} onChange={(e) => setForm((c) => ({ ...c, siteId: e.target.value }))} />
          <Button className="w-full" onClick={() => createSiteManager.mutate()}>
            Create Site Manager
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
