import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/route-auth";
import { createAuditLog, fetchSites, getSupabaseAdminClient } from "@/lib/server/live-data";

async function resolveSiteName(siteIdOrName: string | undefined) {
  const value = siteIdOrName?.trim();
  if (!value) return undefined;

  const sites = await fetchSites({ includeImages: false });
  const matched = sites.find((site) => site.id === value || site.name === value);
  return matched?.name ?? value;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole("admin");
    const body = (await request.json()) as {
      email?: string;
      isActive?: boolean;
      name?: string;
      password?: string;
      phone?: string;
      siteIds?: string[];
      siteId?: string; // accepted for old clients
    };
    const { id } = await params;
    const supabase = getSupabaseAdminClient();

    if (!supabase) {
      return NextResponse.json({ message: "Supabase is not configured for the web app." }, { status: 500 });
    }

    if (body.password !== undefined) {
      if (body.password.length < 8) {
        return NextResponse.json({ message: "Password must be at least 8 characters." }, { status: 400 });
      }
      const { error: passwordError } = await supabase.auth.admin.updateUserById(id, { password: body.password });
      if (passwordError) return NextResponse.json({ message: passwordError.message }, { status: 400 });
    }

    const profilePatch: Record<string, string | boolean | null> = {};
    if (typeof body.name === "string") profilePatch.full_name = body.name.trim();
    if (typeof body.email === "string") profilePatch.email = body.email.trim();
    if (typeof body.phone === "string") profilePatch.phone_number = body.phone.trim() || null;
    if (typeof body.isActive === "boolean") profilePatch.is_active = body.isActive;

    const requestedSiteIds = body.siteIds?.length ? body.siteIds : body.siteId !== undefined ? [body.siteId] : undefined;
    if (requestedSiteIds !== undefined) {
      const sites = await fetchSites({ includeImages: false });
      const assignedSites = Array.from(new Set(requestedSiteIds.map((value) => value.trim()).filter(Boolean)))
        .map((id) => sites.find((site) => site.id === id || site.name === id))
        .filter((site): site is (typeof sites)[number] => Boolean(site));
      if (!assignedSites.length || assignedSites.length !== new Set(requestedSiteIds).size) {
        return NextResponse.json({ message: "Select at least one valid site." }, { status: 400 });
      }
      profilePatch.company_name = assignedSites[0].name;
      const { error: removeError } = await supabase.from("site_manager_site_assignments").delete().eq("manager_id", id);
      if (removeError) return NextResponse.json({ message: removeError.message }, { status: 400 });
      const { error: assignmentError } = await supabase.from("site_manager_site_assignments").insert(assignedSites.map((site) => ({ manager_id: id, site_id: site.id })));
      if (assignmentError) return NextResponse.json({ message: assignmentError.message }, { status: 400 });
    }

    if (Object.keys(profilePatch).length === 0 && body.password === undefined) {
      return NextResponse.json({ message: "No changes were provided." }, { status: 400 });
    }

    const { error } = await supabase.from("profiles").update(profilePatch).eq("id", id).eq("role", "host");
    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    await createAuditLog({
      action: "UPDATE_SITE_MANAGER",
      actorName: session.email,
      actorRole: "admin",
      detail: `Updated site manager ${id}`,
      targetId: id,
      targetTable: "profiles"
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole("admin");
    const { id } = await params;
    const supabase = getSupabaseAdminClient();

    if (!supabase) {
      return NextResponse.json({ message: "Supabase is not configured for the web app." }, { status: 500 });
    }

    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    await createAuditLog({
      action: "DELETE_SITE_MANAGER",
      actorName: session.email,
      actorRole: "admin",
      detail: `Deleted site manager ${id}`,
      targetId: id,
      targetTable: "profiles"
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
