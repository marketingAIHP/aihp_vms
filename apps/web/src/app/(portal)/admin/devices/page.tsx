"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchJson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SiteRecord } from "@/lib/types";

type Device = { id: string; serial_number: string; site_name: string; created_at: string };

export default function AdminDevicesPage() {
  const queryClient = useQueryClient();
  const [serialNumber, setSerialNumber] = useState("");
  const [siteName, setSiteName] = useState("");
  const { data: devicesData, isLoading } = useQuery({ queryKey: ["admin-devices"], queryFn: () => fetchJson<{ devices: Device[] }>("/api/admin/devices") });
  const { data: sitesData } = useQuery({ queryKey: ["admin-sites", "device-registration"], queryFn: () => fetchJson<{ sites: SiteRecord[] }>("/api/admin/sites?includeImages=false") });
  const registerDevice = useMutation({
    mutationFn: () => fetchJson<{ device: Device }>("/api/admin/devices", { method: "POST", body: JSON.stringify({ serialNumber, siteName }) }),
    onSuccess: async () => {
      setSerialNumber("");
      setSiteName("");
      toast.success("Device registered successfully.");
      await queryClient.invalidateQueries({ queryKey: ["admin-devices"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to register device.")
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <Card className="border-border/70">
        <CardHeader><CardTitle>Register Site Device</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2">
            <Label htmlFor="device-serial">Device Serial No.</Label>
            <Input id="device-serial" value={serialNumber} maxLength={120} placeholder="Enter device serial number" onChange={(event) => setSerialNumber(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Assigned Site</Label>
            <Select value={siteName} onValueChange={setSiteName}>
              <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
              <SelectContent>{sitesData?.sites.filter((site) => site.isActive).map((site) => <SelectItem key={site.id} value={site.name}>{site.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button className="w-full" disabled={!serialNumber.trim() || !siteName || registerDevice.isPending} onClick={() => registerDevice.mutate()}>
            {registerDevice.isPending ? "Registering..." : "Register Device"}
          </Button>
        </CardContent>
      </Card>
      <Card className="border-border/70">
        <CardHeader><CardTitle>Registered Devices</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Serial No.</TableHead><TableHead>Assigned Site</TableHead><TableHead>Registered</TableHead></TableRow></TableHeader>
            <TableBody>
              {devicesData?.devices.map((device) => <TableRow key={device.id}><TableCell className="font-medium">{device.serial_number}</TableCell><TableCell>{device.site_name}</TableCell><TableCell className="text-muted-foreground">{new Date(device.created_at).toLocaleString()}</TableCell></TableRow>)}
              {!isLoading && devicesData?.devices.length === 0 ? <TableRow><TableCell className="py-10 text-center text-muted-foreground" colSpan={3}>No devices registered yet.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
