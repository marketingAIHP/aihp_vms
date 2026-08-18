"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchJson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () =>
      fetchJson<{
        companyName: string;
        companyAddress: string;
        supportEmail: string;
        visitorPolicy: string;
        securityMode: string;
      }>("/api/admin/settings"),
  });
  const [draft, setDraft] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () =>
      fetchJson("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify(draft),
      }),
    onSuccess: () => {
      toast.success("Settings saved.");
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
  });

  if (!data) return null;

  const merged = { ...data, ...draft };

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Input value={merged.companyName} onChange={(e) => setDraft((c) => ({ ...c, companyName: e.target.value }))} />
        <Input value={merged.supportEmail} onChange={(e) => setDraft((c) => ({ ...c, supportEmail: e.target.value }))} />
        <Input value={merged.companyAddress} onChange={(e) => setDraft((c) => ({ ...c, companyAddress: e.target.value }))} className="md:col-span-2" />
        <Textarea value={merged.visitorPolicy} onChange={(e) => setDraft((c) => ({ ...c, visitorPolicy: e.target.value }))} className="md:col-span-2 min-h-40" />
        <Input value={merged.securityMode} onChange={(e) => setDraft((c) => ({ ...c, securityMode: e.target.value }))} />
        <div className="md:col-span-2">
          <Button onClick={() => mutation.mutate()}>Save Settings</Button>
        </div>
      </CardContent>
    </Card>
  );
}

