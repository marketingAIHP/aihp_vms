"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchJson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SiteRecord } from "@/lib/types";

export default function AdminSiteManagersPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    siteId: "",
    isActive: true,
  });
  const [editingManager, setEditingManager] = useState<Record<string, string | boolean> | null>(null);
  const [editName, setEditName] = useState("");
  const [editSiteId, setEditSiteId] = useState("");
  const [editPassword, setEditPassword] = useState("");

  const { data } = useQuery({
    queryKey: ["admin-site-managers"],
    queryFn: () => fetchJson<{ siteManagers: Array<Record<string, string | boolean>> }>("/api/admin/site-managers"),
  });
  const { data: sitesData } = useQuery({
    queryKey: ["admin-sites", "site-manager-form"],
    queryFn: () => fetchJson<{ sites: SiteRecord[] }>("/api/admin/sites?includeImages=false"),
  });

  const createSiteManager = useMutation({
    mutationFn: () =>
      fetchJson("/api/admin/site-managers", {
        method: "POST",
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      toast.success("Site Manager created.");
      setForm({ name: "", email: "", password: "", siteId: "", isActive: true });
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
  const editSiteManager = useMutation({
    mutationFn: () => {
      if (!editingManager) throw new Error("No site manager selected.");
      return fetchJson(`/api/admin/site-managers/${String(editingManager.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editName, siteId: editSiteId, ...(editPassword ? { password: editPassword } : {}) }),
      });
    },
    onSuccess: () => {
      toast.success("Site Manager updated.");
      setEditingManager(null); setEditPassword("");
      queryClient.invalidateQueries({ queryKey: ["admin-site-managers"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to update site manager."),
  });

  function openEditor(manager: Record<string, string | boolean>) {
    setEditingManager(manager);
    setEditName(String(manager.name));
    const site = sitesData?.sites.find((item) => item.name === String(manager.siteName));
    setEditSiteId(site?.id ?? String(manager.siteName));
    setEditPassword("");
  }

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
                  <TableCell>{String(manager.siteName)}</TableCell>
                  <TableCell>{manager.isActive ? "Active" : "Inactive"}</TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => openEditor(manager)}>Edit</Button>
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
          <Select value={form.siteId} onValueChange={(siteId) => setForm((current) => ({ ...current, siteId }))}>
            <SelectTrigger><SelectValue placeholder="Select assigned site" /></SelectTrigger>
            <SelectContent>{sitesData?.sites.filter((site) => site.isActive).map((site) => <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="password" placeholder="Password (minimum 8 characters)" value={form.password} onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))} />
          <Button className="w-full" disabled={!form.name.trim() || !form.email.trim() || !form.siteId || form.password.length < 8 || createSiteManager.isPending} onClick={() => createSiteManager.mutate()}>
            Create Site Manager
          </Button>
        </CardContent>
      </Card>

      <Dialog open={Boolean(editingManager)} onOpenChange={(open) => !open && setEditingManager(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Site Manager</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <Input placeholder="Name" value={editName} onChange={(event) => setEditName(event.target.value)} />
            <Select value={editSiteId} onValueChange={setEditSiteId}>
              <SelectTrigger><SelectValue placeholder="Select assigned site" /></SelectTrigger>
              <SelectContent>{sitesData?.sites.filter((site) => site.isActive).map((site) => <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="password" placeholder="New password (leave blank to keep current)" value={editPassword} onChange={(event) => setEditPassword(event.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingManager(null)}>Cancel</Button>
            <Button disabled={!editName.trim() || !editSiteId || (editPassword.length > 0 && editPassword.length < 8) || editSiteManager.isPending} onClick={() => editSiteManager.mutate()}>{editSiteManager.isPending ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
