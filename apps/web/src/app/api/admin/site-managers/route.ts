import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/route-auth";
import { createAuditLog, fetchAssignedSites, fetchProfiles, fetchSites, getSupabaseAdminClient, mapSiteManagerRecord } from "@/lib/server/live-data";

export async function GET() {
  try {
    await requireApiRole("admin");
    const profiles = await fetchProfiles();
    const managers = profiles.filter((profile) => profile.role === "host");
    const assigned = await Promise.all(managers.map(async (profile) => mapSiteManagerRecord(profile, await fetchAssignedSites(profile))));
    return NextResponse.json({ siteManagers: assigned });
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireApiRole("admin");
    const body = (await request.json()) as {
      email?: string;
      isActive?: boolean;
      name?: string;
      password?: string;
      siteIds?: string[];
      siteId?: string; // accepted for old clients
    };

    const requestedSiteIds = Array.from(new Set((body.siteIds?.length ? body.siteIds : body.siteId ? [body.siteId] : []).map((id) => id.trim()).filter(Boolean)));
    if (!body.email?.trim() || !body.name?.trim() || !requestedSiteIds.length || !body.password || body.password.length < 8) {
      return NextResponse.json({ message: "Name, email, assigned site, and a password of at least 8 characters are required." }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ message: "Supabase is not configured for the web app." }, { status: 500 });
    }

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: body.email.trim(),
      password: body.password,
      email_confirm: true,
      user_metadata: {
        full_name: body.name.trim(),
        role: "host"
      }
    });

    if (createError || !created.user) {
      return NextResponse.json({ message: createError?.message ?? "Unable to create site manager." }, { status: 400 });
    }

    const sites = await fetchSites({ includeImages: false });
    const assignedSites = requestedSiteIds.map((id) => sites.find((site) => site.id === id || site.name === id)).filter((site): site is (typeof sites)[number] => Boolean(site));
    if (assignedSites.length !== requestedSiteIds.length) {
      await supabase.auth.admin.deleteUser(created.user.id);
      return NextResponse.json({ message: "One or more selected sites are invalid." }, { status: 400 });
    }
    const siteName = assignedSites[0]?.name ?? "";
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: created.user.id,
        company_name: siteName || null,
        email: body.email.trim(),
        full_name: body.name.trim(),
        is_active: body.isActive !== false,
        phone_number: null,
        role: "host"
      });

    if (profileError) {
      await supabase.auth.admin.deleteUser(created.user.id);
      return NextResponse.json({ message: profileError.message }, { status: 400 });
    }
    const { error: assignmentError } = await supabase.from("site_manager_site_assignments").insert(
      assignedSites.map((site) => ({ manager_id: created.user.id, site_id: site.id }))
    );
    if (assignmentError) {
      await supabase.auth.admin.deleteUser(created.user.id);
      return NextResponse.json({ message: assignmentError.message }, { status: 400 });
    }

    await createAuditLog({
      action: "CREATE_SITE_MANAGER",
      actorName: session.email,
      actorRole: "admin",
      detail: `Created site manager ${body.email.trim()}`,
      targetId: created.user.id,
      targetTable: "profiles"
    });

    return NextResponse.json({
      id: created.user.id,
      name: body.name.trim(),
      email: body.email.trim(),
      phone: "",
      siteId: assignedSites[0]?.id ?? "",
      siteName,
      siteIds: assignedSites.map((site) => site.id),
      siteNames: assignedSites.map((site) => site.name),
      isActive: body.isActive !== false
    });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "Unauthorized";
    return NextResponse.json(
      { message: unauthorized ? "Unauthorized" : error instanceof Error ? error.message : "Unable to create site manager." },
      { status: unauthorized ? 401 : 500 }
    );
  }
}
