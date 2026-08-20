import { getSession } from "@/lib/auth/session";
import type { AppRole, AppSession } from "@/lib/types";
import { getSupabaseAdminClient } from "@/lib/server/live-data";

export async function getApiSession(request?: Request): Promise<AppSession | null> {
  const browserSession = await getSession();
  if (browserSession) return browserSession;

  const authorization = request?.headers.get("authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const profileResult = await supabase.from("profiles").select("full_name, email, role, is_active").eq("id", user.id).maybeSingle();
  const profile = profileResult.data as { email?: string | null; full_name?: string | null; is_active?: boolean | null; role?: string | null } | null;
  if (profileResult.error || !profile || profile.is_active === false) return null;
  const role = profile.role === "admin" ? "admin" : profile.role === "host" || profile.role === "site_manager" ? "site_manager" : null;
  if (!role) return null;
  return { email: profile.email ?? user.email ?? "", name: profile.full_name ?? "User", rememberMe: false, role };
}

export async function requireApiRole(role: AppRole, request?: Request): Promise<AppSession> {
  const session = await getApiSession(request);
  if (!session || session.role !== role) {
    throw new Error("Unauthorized");
  }
  return session;
}
