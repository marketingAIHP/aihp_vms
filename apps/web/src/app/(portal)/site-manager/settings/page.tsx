"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SiteManagerSettingsPage() {
  const { data } = useQuery({
    queryKey: ["site-manager-settings"],
    queryFn: () =>
      fetchJson<{
        companyName: string;
        companyAddress: string;
        supportEmail: string;
        visitorPolicy: string;
        securityMode: string;
      }>("/api/admin/settings"),
  });

  if (!data) return null;

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p><span className="font-medium text-foreground">Company:</span> {data.companyName}</p>
        <p><span className="font-medium text-foreground">Address:</span> {data.companyAddress}</p>
        <p><span className="font-medium text-foreground">Support Email:</span> {data.supportEmail}</p>
        <p><span className="font-medium text-foreground">Policy:</span> {data.visitorPolicy}</p>
        <p><span className="font-medium text-foreground">Security Mode:</span> {data.securityMode}</p>
      </CardContent>
    </Card>
  );
}
