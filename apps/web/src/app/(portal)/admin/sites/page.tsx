"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, MapPin, Pencil } from "lucide-react";
import { toast } from "sonner";
import { fetchJson } from "@/lib/api";
import { getVisitorSiteImage } from "@/lib/visitor-sites";
import type { SiteRecord } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export default function AdminSitesPage() {
  const queryClient = useQueryClient();
  const [selectedSite, setSelectedSite] = useState<SiteRecord | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-sites"],
    queryFn: () => fetchJson<{ sites: SiteRecord[] }>("/api/admin/sites")
  });

  useEffect(() => {
    if (!image) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(image);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const updateSite = useMutation({
    mutationFn: async () => {
      if (!selectedSite) return;
      const form = new FormData();
      form.set("name", name);
      form.set("address", address);
      if (image) form.set("image", image);

      return fetchJson(`/api/admin/sites/${selectedSite.id}`, {
        method: "PATCH",
        body: form
      });
    },
    onSuccess: async () => {
      toast.success("Site updated successfully.");
      setSelectedSite(null);
      setImage(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-sites"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to update the site.");
    }
  });

  function openEditor(site: SiteRecord) {
    setSelectedSite(site);
    setName(site.name);
    setAddress(site.address);
    setImage(null);
    setPreviewUrl("");
  }

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Sites</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Site</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.sites.map((site) => (
              <TableRow key={site.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-white">
                      <Image
                        src={site.imageUrl || getVisitorSiteImage(site.name)}
                        alt={`${site.name} building`}
                        fill
                        sizes="56px"
                        className="object-contain"
                      />
                    </div>
                    <span className="font-medium">{site.name}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-sm whitespace-normal text-muted-foreground">
                  {site.address || "Address not added"}
                </TableCell>
                <TableCell>{site.isActive ? "Active" : "Inactive"}</TableCell>
                <TableCell className="text-right">
                  <Button type="button" size="sm" variant="outline" onClick={() => openEditor(site)}>
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && data?.sites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  No sites available.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={Boolean(selectedSite)} onOpenChange={(open) => !open && setSelectedSite(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Site</DialogTitle>
            <DialogDescription>Update the site name, address, and building photograph.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-5">
            <div className="relative h-64 overflow-hidden rounded-2xl border border-border bg-white">
              <Image
                src={previewUrl || selectedSite?.imageUrl || getVisitorSiteImage(selectedSite?.name ?? "")}
                alt="Site photograph preview"
                fill
                sizes="560px"
                className="object-contain"
                unoptimized={Boolean(previewUrl)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="site-name">Site Name</Label>
              <Input id="site-name" value={name} maxLength={120} onChange={(event) => setName(event.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="site-address">
                <MapPin className="size-4" />
                Address
              </Label>
              <Textarea
                id="site-address"
                value={address}
                maxLength={500}
                className="min-h-24"
                placeholder="Enter the complete site address"
                onChange={(event) => setAddress(event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="site-image">
                <ImageIcon className="size-4" />
                Site Photo
              </Label>
              <Input
                id="site-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="h-11 py-2"
                onChange={(event) => setImage(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP. Maximum 3 MB.</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelectedSite(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={updateSite.isPending || name.trim().length < 2}
              onClick={() => updateSite.mutate()}
            >
              {updateSite.isPending ? "Saving..." : "Save Site"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
