"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SiteManagerNotificationsPage() {
  const { data } = useQuery({
    queryKey: ["site-manager-notifications"],
    queryFn: () =>
      fetchJson<Array<{ id: string; title: string; message: string; createdAt: string }>>("/api/site-manager/notifications"),
  });

  if (!data) return null;

  return (
    <div className="space-y-4">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications are available for your site right now.</p>
          ) : (
            data.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border/70 p-4">
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
