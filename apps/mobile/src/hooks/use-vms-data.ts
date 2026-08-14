import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../lib/api-client";
import type { AuditItem, MasterData, NotificationItem, UserRecord, VisitRecord } from "../types/vms";

const emptyMasterData: MasterData = {
  buildings: [],
  floors: [],
  rooms: [],
  purposes: [],
  categories: []
};

type VmsDataState = {
  auditLogs: AuditItem[];
  error: string | null;
  loading: boolean;
  masterData: MasterData;
  notifications: NotificationItem[];
  users: UserRecord[];
  visits: VisitRecord[];
};

export function useVmsData() {
  const { session } = useAuth();
  const [state, setState] = useState<VmsDataState>({
    auditLogs: [],
    error: null,
    loading: true,
    masterData: emptyMasterData,
    notifications: [],
    users: [],
    visits: []
  });

  async function refresh() {
    if (!session) {
      setState((current) => ({ ...current, loading: false }));
      return;
    }

    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const [visits, masterData, notifications] = await Promise.all([
        apiClient.listVisits(),
        apiClient.getMasterData(),
        apiClient.getNotifications()
      ]);
      const [users, auditLogs] = session.role === "admin"
        ? await Promise.all([apiClient.getUsers(), apiClient.getAuditLogs()])
        : [[], []];

      setState({
        auditLogs,
        error: null,
        loading: false,
        masterData,
        notifications,
        users,
        visits
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Unable to load data.",
        loading: false
      }));
    }
  }

  useEffect(() => {
    void refresh();
  }, [session?.role, session?.userId]);

  return {
    ...state,
    refresh
  };
}
