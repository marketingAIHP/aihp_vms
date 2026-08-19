"use client";

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getSupabaseBrowserClient } from "@/lib/auth/supabase-browser";

function RealtimeQuerySync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }

    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const pendingQueryKeys = new Set<string>();
    const scheduleRefresh = (keys: Set<string>) => {
      keys.forEach((key) => pendingQueryKeys.add(key));
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      refreshTimer = setTimeout(() => {
        void queryClient.invalidateQueries({
          predicate: (query) => pendingQueryKeys.has(String(query.queryKey[0]))
        });
        pendingQueryKeys.clear();
      }, 150);
    };

    const visitQueryKeys = new Set([
      "admin-overview",
      "admin-reports",
      "admin-visitors",
      "site-manager-overview",
      "site-manager-reports",
      "site-manager-visitors"
    ]);
    const notificationQueryKeys = new Set([
      "admin-overview",
      "site-manager-notifications",
      "site-manager-overview"
    ]);

    const channel = supabase
      .channel("web-vms-live-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "visits" },
        () => scheduleRefresh(visitQueryKeys)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        (payload: { eventType: string; new: Record<string, unknown> }) => {
          scheduleRefresh(notificationQueryKeys);
          if (payload.eventType === "INSERT") {
            const notification = payload.new as { message?: string; title?: string };
            toast.info(notification.title ?? "Visitor update", {
              description: notification.message ?? "A new visitor update is available."
            });
          }
        }
      )
      .subscribe();

    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <RealtimeQuerySync />
        <TooltipProvider>
          {children}
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
