import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AppRole, ReportSummary, SettingsRecord, SiteManagerRecord, SiteRecord, VisitRecord } from "@/lib/types";
import {
  extractLegacyPhotoUrl,
  extractPhotoStoragePath,
  getVisibleVisitNotes
} from "@/lib/server/visit-note-metadata";

type RawRole = "admin" | "host" | "receptionist" | "site_manager";
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
  company_name: string | null;
  email: string | null;
  employee_id?: string | null;
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
  created_at?: string | null;
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

type NotificationRow = {
  created_at: string;
  id: string;
  is_read: boolean | null;
  message: string;
  target_roles: RawRole[] | null;
  title: string;
  user_id: string | null;
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

type MasterDataRow = {
  address?: string | null;
  id?: string;
  image_path?: string | null;
  is_active?: boolean | null;
  kind: string;
  sort_order: number | null;
  value: string;
};

const DEFAULT_SETTINGS: SettingsRecord = {
  companyName: "AIHP Visitor Management System",
  companyAddress: "",
  supportEmail: "support@aihpvms.local",
  notificationChannels: ["email", "sms", "whatsapp"],
  visitorPolicy:
    "Walk-in visitors must register using the reception QR. Check-in and check-out are tracked against site access rules.",
  securityMode: "strict"
};

let supabaseAdminClient: SupabaseClient<any> | null | undefined;

export function getSupabaseAdminClient() {
  if (supabaseAdminClient !== undefined) {
    return supabaseAdminClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    supabaseAdminClient = null;
    return null;
  }

  supabaseAdminClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  return supabaseAdminClient;
}

export function normalizeRole(role: RawRole | null | undefined): AppRole {
  return role === "admin" ? "admin" : "site_manager";
}

export function normalizeVisitStatus(row: Pick<VisitRow, "checked_in_at" | "exited_at" | "status">): VisitRecord["status"] | null {
  if (row.status === "CANCELLED" || row.status === "DENIED") {
    return null;
  }
  if (row.exited_at || row.status === "EXITED" || row.status === "CHECKED_OUT") {
    return "CHECKED_OUT";
  }
  return "CHECKED_IN";
}

async function resolveVisitPhotoUrl(notes: string | null) {
  const storagePath = extractPhotoStoragePath(notes);
  if (storagePath) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return undefined;
    }

    const { data, error } = await supabase.storage.from("visitor-photos").createSignedUrl(storagePath, 60 * 10);
    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  }

  const legacyPublicUrl = extractLegacyPhotoUrl(notes);
  return legacyPublicUrl || undefined;
}

export async function mapVisitRecord(row: VisitRow, includePhoto = false): Promise<VisitRecord | null> {
  const status = normalizeVisitStatus(row);
  if (!status) {
    return null;
  }

  const photoUrl = includePhoto ? await resolveVisitPhotoUrl(row.notes) : undefined;

  return {
    id: row.id,
    visitorName: row.visitor_name,
    mobileNumber: row.mobile ?? "",
    email: row.email ?? "",
    companyName: row.company,
    purposeOfVisit: row.purpose,
    personToMeet: row.host_name,
    remarks: getVisibleVisitNotes(row.notes),
    siteId: row.building,
    siteName: row.building,
    siteManagerId: row.host_user_id,
    siteManagerName: row.host_name,
    photoUrl,
    status,
    checkInAt: row.checked_in_at ?? row.scheduled_at,
    checkOutAt: row.exited_at ?? undefined
  };
}

export function mapSiteManagerRecord(row: ProfileRow): SiteManagerRecord {
  return {
    id: row.id,
    name: row.full_name,
    email: row.email ?? "",
    phone: row.phone_number ?? "",
    siteId: row.company_name ?? "",
    siteName: row.company_name ?? "",
    isActive: row.is_active !== false
  };
}

export function mapNotification(row: NotificationRow) {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    createdAt: row.created_at,
    roleTargets: Array.from(new Set((row.target_roles ?? []).map((role) => normalizeRole(role)))),
    read: row.is_read ?? false,
    userId: row.user_id
  };
}

export function mapAudit(row: AuditRow) {
  return {
    id: row.id,
    action: row.action,
    detail: row.detail ?? "",
    actorEmail: row.actor_name ?? "System",
    createdAt: row.created_at,
    actorRole: normalizeRole(row.actor_role)
  };
}

export function buildMonthlyTrends(visits: VisitRecord[]) {
  const formatter = new Intl.DateTimeFormat("en", { month: "short" });
  const buckets = new Map<string, number>();

  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date();
    date.setMonth(date.getMonth() - index);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    buckets.set(key, 0);
  }

  for (const visit of visits) {
    const date = new Date(visit.checkInAt);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  return Array.from(buckets.entries()).map(([key, count]) => {
    const [year, month] = key.split("-");
    return {
      month: formatter.format(new Date(Number(year), Number(month), 1)),
      visitors: count
    };
  });
}

export function buildReportSummary(visits: VisitRecord[], totalSites: number, totalSiteManagers: number): ReportSummary {
  const today = new Date().toDateString();
  return {
    visitorsToday: visits.filter((visit) => new Date(visit.checkInAt).toDateString() === today).length,
    checkedIn: visits.filter((visit) => visit.status === "CHECKED_IN").length,
    checkedOut: visits.filter((visit) => visit.status === "CHECKED_OUT").length,
    totalVisitors: visits.length,
    totalSites,
    totalSiteManagers
  };
}

export async function fetchProfiles() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase is not configured for the web app.");
  }

  const primaryQuery = await supabase
    .from("profiles")
    .select("id, full_name, role, email, company_name, employee_id, phone_number, is_active")
    .order("full_name", { ascending: true });

  if (!primaryQuery.error) {
    return (primaryQuery.data ?? []) as ProfileRow[];
  }

  if (!primaryQuery.error.message?.toLowerCase().includes("employee_id")) {
    throw new Error(primaryQuery.error.message);
  }

  const fallbackQuery = await supabase
    .from("profiles")
    .select("id, full_name, role, email, company_name, phone_number, is_active")
    .order("full_name", { ascending: true });

  if (fallbackQuery.error) {
    throw new Error(fallbackQuery.error.message);
  }

  return ((fallbackQuery.data ?? []) as Omit<ProfileRow, "employee_id">[]).map((item) => ({
    employee_id: null,
    ...item
  }));
}

export async function fetchProfileByEmail(email: string) {
  const profiles = await fetchProfiles();
  return profiles.find((profile) => profile.email?.trim().toLowerCase() === email.trim().toLowerCase()) ?? null;
}

export async function fetchVisits(options?: { includePhotos?: boolean }) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase is not configured for the web app.");
  }

  const { data, error } = await supabase
    .from("visits")
    .select("id, visitor_name, company, purpose, category, mobile, email, host_user_id, host_name, building, floor, room, scheduled_at, status, checked_in_at, exited_at, notes, created_at")
    .order("scheduled_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const visits = await Promise.all(
    ((data ?? []) as VisitRow[]).map((item) => mapVisitRecord(item, options?.includePhotos === true))
  );
  return visits.filter((item): item is VisitRecord => Boolean(item));
}

export async function fetchNotifications() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase is not configured for the web app.");
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, message, created_at, target_roles, user_id, is_read")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as NotificationRow[];
}

export async function fetchAuditLogs(limit = 30) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase is not configured for the web app.");
  }

  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, created_at, actor_name, actor_role, action, target_table, target_id, detail")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AuditRow[];
}

export async function fetchSites(options?: { includeImages?: boolean }): Promise<SiteRecord[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase is not configured for the web app.");
  }

  const { data, error } = await supabase
    .from("master_data")
    .select("id, kind, value, address, image_path, is_active, sort_order")
    .eq("kind", "buildings")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("value", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as MasterDataRow[];
  const signedUrls = new Map<string, string>();
  if (options?.includeImages !== false) {
    const imagePaths = Array.from(new Set(rows.map((item) => item.image_path).filter((path): path is string => Boolean(path))));
    if (imagePaths.length) {
      const signedImages = await supabase.storage.from("site-images").createSignedUrls(imagePaths, 60 * 30);
      if (!signedImages.error) {
        signedImages.data?.forEach((item, index) => {
          if (item.signedUrl) signedUrls.set(imagePaths[index], item.signedUrl);
        });
      }
    }
  }

  return rows.map((item) => ({
        id: item.id ?? item.value,
        name: item.value,
        address: item.address ?? "",
        imageUrl: item.image_path ? signedUrls.get(item.image_path) : undefined,
        isActive: item.is_active !== false
  }));
}

export async function fetchSiteStoragePath(siteId: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase is not configured for the web app.");
  }

  const { data, error } = await supabase
    .from("master_data")
    .select("image_path")
    .eq("id", siteId)
    .eq("kind", "buildings")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data?.image_path as string | null | undefined) ?? null;
}

export async function fetchSettings(): Promise<SettingsRecord> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase is not configured for the web app.");
  }

  const { data, error } = await supabase
    .from("audit_logs")
    .select("detail")
    .eq("target_table", "settings")
    .eq("action", "UPDATE_SETTINGS")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.detail) {
    return DEFAULT_SETTINGS;
  }

  try {
    return {
      ...DEFAULT_SETTINGS,
      ...(JSON.parse(data.detail) as Partial<SettingsRecord>)
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updateSettings(patch: Partial<SettingsRecord>, actor: { email: string }) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase is not configured for the web app.");
  }

  const current = await fetchSettings();
  const next = { ...current, ...patch };

  const { error } = await supabase.from("audit_logs").insert({
    actor_name: actor.email,
    actor_role: "admin",
    action: "UPDATE_SETTINGS",
    detail: JSON.stringify(next),
    target_id: null,
    target_table: "settings"
  });

  if (error) {
    throw new Error(error.message);
  }

  return next;
}

export async function createAuditLog(input: {
  action: string;
  actorName: string;
  actorRole: AppRole;
  detail: string;
  targetId?: string | null;
  targetTable: string;
}) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase is not configured for the web app.");
  }

  const { error } = await supabase.from("audit_logs").insert({
    actor_name: input.actorName,
    actor_role: input.actorRole === "site_manager" ? "host" : input.actorRole,
    action: input.action,
    detail: input.detail,
    target_id: input.targetId ?? null,
    target_table: input.targetTable
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function createNotification(input: {
  message: string;
  title: string;
  targetRoles: AppRole[];
  userId?: string | null;
}) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase is not configured for the web app.");
  }

  const { error } = await supabase.from("notifications").insert({
    title: input.title,
    message: input.message,
    target_roles: input.targetRoles.map((role) => (role === "site_manager" ? "host" : role)),
    user_id: input.userId ?? null
  });

  if (error) {
    throw new Error(error.message);
  }
}
