// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const allowedOrigins = new Set(
  (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);
const MAX_BODY_BYTES = 16 * 1024;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function shouldRetryWithoutEmployeeId(message: string | undefined) {
  return Boolean(message?.toLowerCase().includes("employee_id"));
}

function normalizeManagedRole(role: unknown) {
  const value = String(role ?? "").trim().toLowerCase();
  if (value === "site_manager") {
    return "host";
  }
  if (value === "admin" || value === "host" || value === "receptionist") {
    return value;
  }
  return "";
}

function missingEnvVars() {
  return [
    !supabaseUrl ? "SUPABASE_URL" : "",
    !serviceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY" : "",
    !anonKey ? "SUPABASE_ANON_KEY" : ""
  ].filter(Boolean);
}

Deno.serve(async (request) => {
  const corsHeaders = buildCorsHeaders(request);
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      status: corsHeaders ? 200 : 403,
      headers: corsHeaders ?? {}
    });
  }

  if (request.headers.get("origin") && !corsHeaders) {
    return json({ error: "Origin is not allowed." }, 403);
  }

  try {
    const missingVars = missingEnvVars();
    if (missingVars.length > 0) {
      return json({ error: "The user administration service is not configured." }, 500, corsHeaders);
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed." }, 405, corsHeaders);
    }

    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return json({ error: "Request is too large." }, 413, corsHeaders);
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization header." }, 401, corsHeaders);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    const {
      data: { user: caller },
      error: callerError
    } = await userClient.auth.getUser();

    if (callerError || !caller) {
      return json({ error: "Invalid session." }, 401, corsHeaders);
    }

    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from("profiles")
      .select("role, is_active")
      .eq("id", caller.id)
      .single();

    if (callerProfileError || callerProfile?.role !== "admin" || callerProfile.is_active === false) {
      return json({ error: "Only active admins can manage staff accounts." }, 403, corsHeaders);
    }

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return json({ error: "Request is too large." }, 413, corsHeaders);
    }

    const payload = (() => {
      try {
        return JSON.parse(rawBody);
      } catch {
        return null;
      }
    })();
    if (!payload || typeof payload !== "object") {
      return json({ error: "Request body must be valid JSON." }, 400, corsHeaders);
    }

    const action = payload.action ?? "create";
    const managedRole = normalizeManagedRole(payload.role);

    if (action === "create") {
      if (!payload.email || !payload.fullName || !payload.password) {
        return json({ error: "Email, full name, and password are required." }, 400, corsHeaders);
      }

      if (!isValidEmail(payload.email) || !isValidText(payload.fullName, 120) || !isValidPassword(payload.password)) {
        return json({ error: "One or more user fields are invalid." }, 400, corsHeaders);
      }

      if (!managedRole) {
        return json({ error: "A valid role is required." }, 400, corsHeaders);
      }

      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        email_confirm: true,
        user_metadata: {
          full_name: payload.fullName,
          role: managedRole
        }
      });

      if (createError || !created.user) {
        return json({ error: "Unable to create auth user." }, 400, corsHeaders);
      }

      let profileError = (
        await adminClient
          .from("profiles")
          .upsert({
            id: created.user.id,
            company_name: managedRole === "admin" ? null : (payload.siteName || null),
            created_by: caller.id,
            email: payload.email,
            employee_id: payload.employeeId || null,
            full_name: payload.fullName,
            is_active: true,
            phone_number: payload.mobileNumber || null,
            role: managedRole
          })
      ).error;

      if (shouldRetryWithoutEmployeeId(profileError?.message)) {
        profileError = (
          await adminClient
            .from("profiles")
            .upsert({
              id: created.user.id,
              company_name: managedRole === "admin" ? null : (payload.siteName || null),
              created_by: caller.id,
              email: payload.email,
              full_name: payload.fullName,
              is_active: true,
              phone_number: payload.mobileNumber || null,
              role: managedRole
            })
        ).error;
      }

      if (profileError) {
        await adminClient.auth.admin.deleteUser(created.user.id);
        return json({ error: "Unable to create the user profile." }, 400, corsHeaders);
      }

      await createAuditLog(caller, "CREATE_USER", `Created ${managedRole} account for ${payload.fullName}`, created.user.id);
      return json({ ok: true, userId: created.user.id }, 200, corsHeaders);
    }

    if (action === "update") {
      if (!payload.userId) {
        return json({ error: "User id is required." }, 400, corsHeaders);
      }

      if (!isValidUuid(payload.userId)) {
        return json({ error: "User id is invalid." }, 400, corsHeaders);
      }

      if (!payload.email || !payload.fullName) {
        return json({ error: "Email and full name are required." }, 400, corsHeaders);
      }

      if (!isValidEmail(payload.email) || !isValidText(payload.fullName, 120)) {
        return json({ error: "One or more user fields are invalid." }, 400, corsHeaders);
      }

      const { data: existingProfile, error: existingProfileError } = await adminClient
        .from("profiles")
        .select("email, full_name, role")
        .eq("id", payload.userId)
        .single();

      if (existingProfileError || !existingProfile) {
        return json({ error: "Existing profile could not be found." }, 404, corsHeaders);
      }

      if (payload.userId === caller.id && managedRole && managedRole !== "admin") {
        return json({ error: "Admins cannot demote their own account." }, 400, corsHeaders);
      }

      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(payload.userId, {
        email: payload.email,
        user_metadata: {
          full_name: payload.fullName,
          ...(managedRole ? { role: managedRole } : {})
        }
      });

      if (authUpdateError) {
        return json({ error: "Unable to update the auth user." }, 400, corsHeaders);
      }

      const profilePatch: Record<string, unknown> = {
        company_name: managedRole === "admin" ? null : (payload.siteName ?? null),
        email: payload.email,
        employee_id: payload.employeeId || null,
        full_name: payload.fullName,
        phone_number: payload.mobileNumber || null
      };

      if (managedRole) {
        profilePatch.role = managedRole;
      }

      if (typeof payload.isActive === "boolean") {
        profilePatch.is_active = payload.isActive;
      }

      let profileError = (
        await adminClient
          .from("profiles")
          .update(profilePatch)
          .eq("id", payload.userId)
      ).error;

      if (shouldRetryWithoutEmployeeId(profileError?.message)) {
        const { employee_id, ...fallbackPatch } = profilePatch as Record<string, unknown>;
        profileError = (
          await adminClient
            .from("profiles")
            .update(fallbackPatch)
            .eq("id", payload.userId)
        ).error;
      }

      if (profileError) {
        await adminClient.auth.admin.updateUserById(payload.userId, {
          email: existingProfile.email ?? undefined,
          user_metadata: {
            full_name: existingProfile.full_name,
            role: existingProfile.role
          }
        });
        return json({ error: "Unable to update the user profile." }, 400, corsHeaders);
      }

      await createAuditLog(caller, "UPDATE_USER", `Updated account for ${payload.fullName}`, payload.userId);
      return json({ ok: true, userId: payload.userId }, 200, corsHeaders);
    }

    if (action === "change_password") {
      if (!payload.userId || !payload.password) {
        return json({ error: "User id and password are required." }, 400, corsHeaders);
      }

      if (!isValidUuid(payload.userId) || !isValidPassword(payload.password)) {
        return json({ error: "User id or password is invalid." }, 400, corsHeaders);
      }

      const { error: passwordError } = await adminClient.auth.admin.updateUserById(payload.userId, {
        password: payload.password
      });

      if (passwordError) {
        return json({ error: "Unable to update the password." }, 400, corsHeaders);
      }

      await createAuditLog(caller, "CHANGE_PASSWORD", "Updated a managed user password", payload.userId);
      return json({ ok: true, userId: payload.userId }, 200, corsHeaders);
    }

    if (action === "delete") {
      if (!payload.userId) {
        return json({ error: "User id is required." }, 400, corsHeaders);
      }

      if (!isValidUuid(payload.userId) || payload.userId === caller.id) {
        return json({ error: "The selected user cannot be deleted." }, 400, corsHeaders);
      }

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(payload.userId);
      if (deleteError) {
        return json({ error: "Unable to delete the user." }, 400, corsHeaders);
      }

      await createAuditLog(caller, "DELETE_USER", "Deleted a managed user account", payload.userId);
      return json({ ok: true, userId: payload.userId }, 200, corsHeaders);
    }

    return json({ error: "Unsupported action." }, 400, corsHeaders);
  } catch {
    return json({ error: "Unable to process the user administration request." }, 500, corsHeaders);
  }
});

async function createAuditLog(caller: any, action: string, detail: string, targetId: string) {
  await adminClient.from("audit_logs").insert({
    actor_name: caller.user_metadata.full_name ?? caller.email ?? "Admin",
    actor_role: "admin",
    actor_user_id: caller.id,
    action,
    detail,
    target_id: targetId,
    target_table: "profiles"
  });
}

function isValidEmail(value: unknown) {
  const email = String(value ?? "").trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidText(value: unknown, maximum: number) {
  const text = String(value ?? "").trim();
  return text.length > 0 && text.length <= maximum;
}

function isValidPassword(value: unknown) {
  const password = String(value ?? "");
  return password.length >= 8 && password.length <= 128;
}

function isValidUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value ?? ""));
}

function buildCorsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) {
    return null;
  }

  return {
    ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
}

function json(body: Record<string, any>, status = 200, corsHeaders: Record<string, string> | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...(corsHeaders ?? {}),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
