"use server";

import { redirect } from "next/navigation";
import { clearSession, setSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/auth/supabase";
import type { AppRole } from "@/lib/types";

const DEMO_AUTH_ENABLED = process.env.NODE_ENV !== "production" && process.env.ENABLE_DEMO_AUTH === "true";
const demoCredentials = {
  admin: {
    email: process.env.DEMO_ADMIN_EMAIL ?? "",
    password: process.env.DEMO_ADMIN_PASSWORD ?? "",
    name: "AIHP Admin",
  },
  site_manager: {
    email: process.env.DEMO_SITE_MANAGER_EMAIL ?? "",
    password: process.env.DEMO_SITE_MANAGER_PASSWORD ?? "",
    name: "Meera Site Manager",
  },
} as const;

function isConfiguredDemoCredential(credential: (typeof demoCredentials)[AppRole]) {
  return DEMO_AUTH_ENABLED && Boolean(credential.email && credential.password);
}

type ProfileRole = "admin" | "site_manager" | "host" | "receptionist" | null;

function normalizeProfileRole(role: ProfileRole): AppRole | null {
  if (role === "admin") return "admin";
  if (role === "host" || role === "site_manager") return "site_manager";
  return null;
}

function getRoleLabel(role: AppRole) {
  return role === "admin" ? "Admin" : "Site Manager";
}

async function getVerifiedUserProfileRole(supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>, userId: string) {
  if (!supabase) {
    throw new Error("Supabase environment variables are missing and the provided credentials are not a demo account.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("role, full_name, email, is_active")
    .eq("id", userId)
    .single();

  if (error || !data) {
    throw new Error("Your user profile could not be found. Please contact the AIHP VMS administrator.");
  }

  const role = normalizeProfileRole((data.role as ProfileRole) ?? null);
  if (!role || data.is_active === false) {
    throw new Error("This account is not authorized to use this application.");
  }

  return {
    role,
    fullName: (data.full_name as string | null) ?? null,
    email: (data.email as string | null) ?? null,
  };
}

export async function loginAction(input: {
  role: AppRole;
  email: string;
  password: string;
  rememberMe: boolean;
}) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const demo = demoCredentials[input.role];
  const demoAdmin = demoCredentials.admin;
  const demoSiteManager = demoCredentials.site_manager;

  if (isConfiguredDemoCredential(demo) && normalizedEmail === demo.email && input.password === demo.password) {
    await setSession({
      email: demo.email,
      name: demo.name,
      role: input.role,
      rememberMe: input.rememberMe,
    });
    return { redirectTo: input.role === "admin" ? "/admin/dashboard" : "/site-manager/dashboard" };
  }

  if (
    (isConfiguredDemoCredential(demoAdmin) &&
      normalizedEmail === demoAdmin.email &&
      input.password === demoAdmin.password &&
      input.role !== "admin") ||
    (isConfiguredDemoCredential(demoSiteManager) &&
      normalizedEmail === demoSiteManager.email &&
      input.password === demoSiteManager.password &&
      input.role !== "site_manager")
  ) {
    const actualRole = normalizedEmail === demoAdmin.email ? "admin" : "site_manager";
    throw new Error(`This account is assigned to ${getRoleLabel(actualRole)}. Please choose the correct role and try again.`);
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    throw new Error(
      DEMO_AUTH_ENABLED
        ? "Supabase environment variables are missing and the provided credentials are not a demo account."
        : "Supabase environment variables are missing."
    );
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "Invalid credentials.");
  }

  const profile = await getVerifiedUserProfileRole(supabase, data.user.id);

  if (profile.role !== input.role) {
    await supabase.auth.signOut();
    throw new Error(`This account is assigned to ${getRoleLabel(profile.role)}. Please choose the correct role and try again.`);
  }

  await setSession({
    email: data.user.email ?? profile.email ?? input.email,
    name: profile.fullName ?? (data.user.user_metadata?.full_name as string | undefined) ?? data.user.email ?? "AIHP User",
    role: profile.role,
    rememberMe: input.rememberMe,
  });

  return { redirectTo: profile.role === "admin" ? "/admin/dashboard" : "/site-manager/dashboard" };
}

export async function logoutAction() {
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  await clearSession();
  redirect("/");
}

export async function forgotPasswordAction(input: { email: string; role: AppRole }) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    if (DEMO_AUTH_ENABLED) {
      return {
        ok: true,
        message: "Demo mode is enabled. Use the demo password shown on the login page.",
      };
    }

    throw new Error("Supabase environment variables are missing.");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
    redirectTo: process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/${input.role}/login`
      : undefined,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    ok: true,
    message: "Password reset instructions have been sent to the provided email address.",
  };
}
