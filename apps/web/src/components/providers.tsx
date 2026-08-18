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
    const scheduleRefresh = () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      refreshTimer = setTimeout(() => {
        void queryClient.invalidateQueries();
      }, 150);
    };

    const channel = supabase
      .channel("web-vms-live-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "visits" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        (payload: { eventType: string; new: Record<string, unknown> }) => {
          scheduleRefresh();
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
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
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
