import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/auth/supabase";
import type { AppRole, AppSession } from "@/lib/types";

const SESSION_COOKIE = "aihp_vms_session";
const DEMO_AUTH_ENABLED = process.env.NODE_ENV !== "production" && process.env.ENABLE_DEMO_AUTH === "true";
const DEMO_EMAILS = new Set(
  [process.env.DEMO_ADMIN_EMAIL, process.env.DEMO_SITE_MANAGER_EMAIL]
    .filter((email): email is string => Boolean(email))
    .map((email) => email.trim().toLowerCase())
);

function normalizeProfileRole(role: string | null | undefined): AppRole | null {
  if (role === "admin") return "admin";
  if (role === "host" || role === "site_manager") return "site_manager";
  return null;
}

export async function getSession(): Promise<AppSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as AppSession;

    if (DEMO_AUTH_ENABLED && DEMO_EMAILS.has(session.email.trim().toLowerCase())) {
      return session;
    }

    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return null;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || user.email?.trim().toLowerCase() !== session.email.trim().toLowerCase()) {
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, full_name, email, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile || profile.is_active === false) {
      return null;
    }

    const role = normalizeProfileRole(profile.role as string | null | undefined);
    if (!role || role !== session.role) {
      return null;
    }

    return {
      ...session,
      email: (profile.email as string | null) ?? user.email ?? session.email,
      name: (profile.full_name as string | null) ?? session.name,
      role,
    };
  } catch {
    return null;
  }
}

export async function setSession(session: AppSession) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: session.rememberMe ? 60 * 60 * 24 * 14 : 60 * 60 * 8,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function requireSession(role?: AppRole) {
  const session = await getSession();
  if (!session) {
    redirect(role === "site_manager" ? "/auth/site-manager/login" : "/auth/admin/login");
  }
  if (role && session.role !== role) {
    redirect(session.role === "admin" ? "/admin/dashboard" : "/site-manager/dashboard");
  }
  return session;
}
