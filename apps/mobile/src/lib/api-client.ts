import type { SessionRole, SessionState } from "../store/session-store";
import type { AuditItem, MasterData, NotificationItem, UserRecord, VisitRecord } from "../types/vms";
import { supabase } from "./supabase";

type RawRole = "admin" | "site_manager" | "host" | "receptionist";
type RawVisitStatus =
  | "INVITED"
  | "QR_SHARED"
  | "ARRIVED"
  | "VERIFIED"
  | "CHECKED_IN"
  | "ACCESS_GRANTED"
  | "CANCELLED"
  | "DENIED"
  | "EXITED"
  | "CHECKED_OUT";

type ProfileRow = {
  employee_id: string | null;
  company_name: string | null;
  email: string | null;
  full_name: string;
  id: string;
  is_active: boolean | null;
  phone_number: string | null;
  role: RawRole;
};

type VisitRow = {
  building: string;
  category: string | null;
  checked_in_at: string | null;
  company: string;
  email: string | null;
  exited_at: string | null;
  floor: string;
  host_name: string;
  host_user_id: string;
  id: string;
  mobile: string | null;
  notes: string | null;
  purpose: string;
  room: string;
  scheduled_at: string;
  status: RawVisitStatus;
  visitor_name: string;
};

type MasterDataRow = {
  kind: keyof MasterData;
  sort_order: number | null;
  value: string;
};

type AuditRow = {
  action: string;
  actor_name: string | null;
  actor_role: RawRole | null;
  created_at: string;
  detail: string | null;
  id: string;
  target_id: string | null;
  target_table: string;
};

type NotificationRow = {
  created_at: string;
  id: string;
  is_read: boolean | null;
  message: string;
  target_roles: RawRole[] | null;
  title: string;
  user_id: string | null;
};

function normalizeRole(role: RawRole | null | undefined): SessionRole {
  if (role === "admin") {
    return "admin";
  }
  return "site_manager";
}

function assertAuthorizedProfile(profile: ProfileRow) {
  if (profile.is_active === false || (profile.role !== "admin" && profile.role !== "host" && profile.role !== "site_manager")) {
    throw new Error("This account is not authorized to use this application.");
  }
}

function normalizeTargetRoles(roles: RawRole[] | null | undefined): SessionRole[] {
  if (!roles?.length) {
    return ["admin", "site_manager"];
  }

  return Array.from(new Set(roles.map((role) => normalizeRole(role))));
}

function normalizeVisitStatus(row: Pick<VisitRow, "checked_in_at" | "exited_at" | "status">): VisitRecord["status"] | null {
  if (row.status === "CANCELLED" || row.status === "DENIED") {
    return null;
  }
  if (row.exited_at || row.status === "EXITED" || row.status === "CHECKED_OUT") {
    return "CHECKED_OUT";
  }
  return "CHECKED_IN";
}

function toVisitRecord(row: VisitRow): VisitRecord | null {
  const status = normalizeVisitStatus(row);

  if (!status) {
    return null;
  }

  return {
    id: row.id,
    visitorName: row.visitor_name,
    company: row.company,
    purpose: row.purpose,
    category: row.category ?? "Walk-In",
    mobile: row.mobile ?? "",
    email: row.email ?? "",
    siteManagerId: row.host_user_id,
    siteManagerName: row.host_name,
    building: row.building,
    floor: row.floor,
    room: row.room,
    createdAt: row.checked_in_at ?? row.scheduled_at,
    status,
    checkedInAt: row.checked_in_at ?? row.scheduled_at,
    checkedOutAt: row.exited_at,
    notes: row.notes ?? undefined
  };
}

function toUserRecord(row: ProfileRow): UserRecord {
  return {
    id: row.id,
    name: row.full_name,
    email: row.email ?? "",
    employeeId: row.employee_id ?? "",
    mobileNumber: row.phone_number ?? "",
    role: normalizeRole(row.role),
    siteName: row.company_name ?? "",
    status: row.is_active === false ? "inactive" : "active"
  };
}

function toAuditItem(row: AuditRow): AuditItem {
  return {
    id: row.id,
    createdAt: row.created_at,
    actorName: row.actor_name ?? "System",
    actorRole: normalizeRole(row.actor_role),
    action: row.action,
    target: row.target_table,
    targetId: row.target_id ?? "",
    detail: row.detail ?? row.action
  };
}

function toNotificationItem(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    createdAt: row.created_at,
    targetRoles: normalizeTargetRoles(row.target_roles),
    readBy: row.is_read && row.user_id ? [row.user_id] : []
  };
}

function removeDuplicateNotifications(items: NotificationItem[]) {
  const seen = new Map<string, number>();
  return items.filter((item) => {
    const key = `${item.title.trim().toLowerCase()}|${item.message.trim().toLowerCase()}`;
    const createdAt = new Date(item.createdAt).getTime();
    const previous = seen.get(key);
    if (previous !== undefined && Math.abs(previous - createdAt) <= 10_000) {
      return false;
    }
    seen.set(key, createdAt);
    return true;
  });
}

async function getProfile(userId: string): Promise<ProfileRow> {
  const primaryQuery = await supabase
    .from("profiles")
    .select("id, full_name, role, email, company_name, employee_id, phone_number, is_active")
    .eq("id", userId)
    .single();

  if (!primaryQuery.error && primaryQuery.data) {
    return primaryQuery.data as ProfileRow;
  }

  const fallbackQuery = shouldRetryWithoutEmployeeId(primaryQuery.error)
    ? await supabase
        .from("profiles")
        .select("id, full_name, role, email, company_name, phone_number, is_active")
        .eq("id", userId)
        .single()
    : primaryQuery;

  if (fallbackQuery.error || !fallbackQuery.data) {
    throw new Error("Your user profile could not be found. Please contact the AIHP VMS administrator.");
  }

  return {
    employee_id: null,
    ...(fallbackQuery.data as Omit<ProfileRow, "employee_id">)
  };
}

function shouldRetryWithoutEmployeeId(error: { message?: string } | null) {
  return Boolean(error?.message?.toLowerCase().includes("employee_id"));
}

async function loadVisits() {
  const { data, error } = await supabase
    .from("visits")
    .select(
      "id, visitor_name, company, purpose, category, mobile, email, host_user_id, host_name, building, floor, room, scheduled_at, status, checked_in_at, exited_at, notes"
    )
    .order("scheduled_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((item) => toVisitRecord(item as VisitRow))
    .filter((item): item is VisitRecord => Boolean(item));
}

export const apiClient = {
  async restoreSession(): Promise<SessionState | null> {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return null;
    }

    const profile = await getProfile(session.user.id);
    assertAuthorizedProfile(profile);

    return {
      accessToken: session.access_token,
      email: session.user.email ?? profile.email ?? "",
      userId: session.user.id,
      name: profile.full_name,
      role: normalizeRole(profile.role),
      siteName: profile.company_name ?? ""
    };
  },

  async login(email: string, password: string): Promise<SessionState> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.user || !data.session) {
      throw new Error(error?.message ?? "Unable to sign in.");
    }

    const profile = await getProfile(data.user.id);
    try {
      assertAuthorizedProfile(profile);
    } catch (error) {
      await supabase.auth.signOut();
      throw error;
    }

    return {
      accessToken: data.session.access_token,
      email: data.user.email ?? profile.email ?? "",
      userId: data.user.id,
      name: profile.full_name,
      role: normalizeRole(profile.role),
      siteName: profile.company_name ?? ""
    };
  },

  async verifyAdminPassword(email: string, password: string) {
    const session = await this.login(email, password);
    if (session.role !== "admin") {
      await this.logout();
      throw new Error("Only an admin account can open Visitor Check-In / Check-Out.");
    }
    return session;
  },

  async requestPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      throw new Error(error.message);
    }
  },

  async logout() {
    await supabase.auth.signOut();
  },

  async listVisits() {
    return loadVisits();
  },

  async updateVisitNotes(visitId: string, notes: string) {
    await invokeWebApi(`/api/admin/visitors/${visitId}`, {
      body: JSON.stringify({ rejectionReason: notes.trim() }),
      method: "PATCH"
    });
  },

  async checkOutVisit(visitId: string) {
    await invokeWebApi(`/api/visits/${visitId}/check-out`, { method: "POST" });
  },

  async getNotifications(userId: string, role: SessionRole) {
    let query = supabase
      .from("notifications")
      .select("id, title, message, created_at, target_roles, user_id, is_read")
      .order("created_at", { ascending: false });

    query = role === "admin"
      ? query.contains("target_roles", ["admin"]).is("user_id", null)
      : query.eq("user_id", userId);

    const { data, error } = await query.limit(20);

    if (error) {
      throw new Error(error.message);
    }

    return removeDuplicateNotifications(
      (data ?? []).map((item) => toNotificationItem(item as NotificationRow))
    );
  },

  async markNotificationRead(notificationId: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) {
      throw new Error(error.message);
    }
  },

  async getAuditLogs() {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("id, created_at, actor_name, actor_role, action, target_table, target_id, detail")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((item) => toAuditItem(item as AuditRow));
  },

  async getMasterData(): Promise<MasterData> {
    const { data, error } = await supabase
      .from("master_data")
      .select("kind, value, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("value", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const result: MasterData = {
      buildings: [],
      floors: [],
      rooms: [],
      purposes: [],
      categories: []
    };

    for (const item of (data ?? []) as MasterDataRow[]) {
      result[item.kind].push(item.value);
    }

    return result;
  },

  async getUsers() {
    const primaryQuery = await supabase
      .from("profiles")
      .select("id, full_name, role, email, company_name, employee_id, phone_number, is_active")
      .order("full_name", { ascending: true });

    if (!primaryQuery.error) {
      return (primaryQuery.data ?? []).map((item) => toUserRecord(item as ProfileRow));
    }

    if (!shouldRetryWithoutEmployeeId(primaryQuery.error)) {
      throw new Error(primaryQuery.error.message);
    }

    const fallbackQuery = await supabase
      .from("profiles")
      .select("id, full_name, role, email, company_name, phone_number, is_active")
      .order("full_name", { ascending: true });

    if (fallbackQuery.error) {
      throw new Error(fallbackQuery.error.message);
    }

    return (fallbackQuery.data ?? []).map((item) =>
      toUserRecord({
        employee_id: null,
        ...(item as Omit<ProfileRow, "employee_id">)
      })
    );
  },

  async createManagedUser(payload: CreateManagedUserPayload) {
    return invokeAdminUserFunction({
      ...payload,
      action: "create",
      role: payload.role === "site_manager" ? "host" : payload.role
    });
  },

  async updateManagedUser(payload: UpdateManagedUserPayload) {
    return invokeAdminUserFunction({
      ...payload,
      action: "update"
    });
  },

  async changeManagedUserPassword(userId: string, password: string) {
    return invokeAdminUserFunction({
      action: "change_password",
      password,
      userId
    });
  }
};

export type CreateManagedUserPayload = {
  email: string;
  employeeId: string;
  fullName: string;
  mobileNumber: string;
  password: string;
  role: SessionRole;
  siteName: string;
};

export type UpdateManagedUserPayload = {
  email: string;
  employeeId: string;
  fullName: string;
  mobileNumber: string;
  siteName: string;
  userId: string;
};

async function invokeAdminUserFunction(payload: Record<string, unknown>) {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Your session expired. Please sign in again.");
  }

  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: payload,
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  });

  if (error) {
    const detailedMessage = await extractFunctionErrorMessage(error);
    throw new Error(detailedMessage || error.message);
  }

  if (data?.error) {
    throw new Error(String(data.error));
  }

  return data;
}

async function extractFunctionErrorMessage(error: unknown) {
  if (!error || typeof error !== "object" || !("context" in error)) {
    return "";
  }

  const context = (error as { context?: unknown }).context;
  if (!context || typeof context !== "object" || !("json" in context)) {
    return "";
  }

  try {
    const payload = await (context as Response).json() as { error?: string; message?: string };
    return payload.error || payload.message || "";
  } catch {
    return "";
  }
}

async function invokeWebApi(path: string, init: RequestInit) {
  const baseUrl = process.env.EXPO_PUBLIC_WEB_BASE_URL?.replace(/\/$/, "");
  if (!baseUrl) throw new Error("The web service URL is not configured.");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Your session expired. Please sign in again.");
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, ...init.headers }
  });
  const result = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) throw new Error(result.message ?? "Unable to complete the request.");
  return result;
}
