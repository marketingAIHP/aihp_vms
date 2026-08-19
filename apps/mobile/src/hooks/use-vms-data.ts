import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../lib/api-client";
import { supabase } from "../lib/supabase";
import type { AuditItem, MasterData, NotificationItem, UserRecord, VisitRecord } from "../types/vms";

const emptyMasterData: MasterData = {
  buildings: [],
  floors: [],
  rooms: [],
  purposes: [],
  categories: []
};

let realtimeChannelSequence = 0;

type VmsDataPayload = {
  auditLogs: AuditItem[];
  masterData: MasterData;
  notifications: NotificationItem[];
  users: UserRecord[];
  visits: VisitRecord[];
};

export function useVmsData() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["vms-data", session?.userId, session?.role] as const;
  const query = useQuery<VmsDataPayload>({
    queryKey,
    enabled: Boolean(session),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    queryFn: async () => {
      if (!session) throw new Error("Your session expired. Please sign in again.");
      const [visits, masterData, notifications, adminData] = await Promise.all([
        apiClient.listVisits(),
        apiClient.getMasterData(),
        apiClient.getNotifications(session.userId, session.role),
        session.role === "admin"
          ? Promise.all([apiClient.getUsers(), apiClient.getAuditLogs()])
          : Promise.resolve([[], []] as [UserRecord[], AuditItem[]])
      ]);
      const [users, auditLogs] = adminData;
      return {
        auditLogs,
        masterData,
        notifications,
        users,
        visits
      };
    }
  });
  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query.refetch]);

  useEffect(() => {
    if (!session) {
      return;
    }

    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      refreshTimer = setTimeout(() => {
        void queryClient.invalidateQueries({
          queryKey: ["vms-data", session.userId, session.role]
        });
      }, 150);
    };

    const channel = supabase
      .channel(`vms-live-${session.userId}-${++realtimeChannelSequence}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "visits" },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      void supabase.removeChannel(channel);
    };
  }, [queryClient, session?.role, session?.userId]);

  return {
    auditLogs: query.data?.auditLogs ?? [],
    error: query.error instanceof Error ? query.error.message : null,
    loading: query.isPending,
    masterData: query.data?.masterData ?? emptyMasterData,
    notifications: query.data?.notifications ?? [],
    users: query.data?.users ?? [],
    visits: query.data?.visits ?? [],
    refresh
  };
}
