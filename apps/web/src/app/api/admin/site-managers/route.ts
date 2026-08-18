import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/route-auth";
import { createAuditLog, fetchProfiles, fetchSites, getSupabaseAdminClient, mapSiteManagerRecord } from "@/lib/server/live-data";

async function resolveSiteName(siteIdOrName: string) {
  const value = siteIdOrName.trim();
  if (!value) return "";

  const sites = await fetchSites();
  const matched = sites.find((site) => site.id === value || site.name === value);
  return matched?.name ?? value;
}

export async function GET() {
  try {
    await requireApiRole("admin");
    const profiles = await fetchProfiles();
    return NextResponse.json({
      siteManagers: profiles.filter((profile) => profile.role === "host").map((profile) => mapSiteManagerRecord(profile))
    });
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
      phone?: string;
      siteId?: string;
    };

    if (!body.email?.trim() || !body.name?.trim()) {
      return NextResponse.json({ message: "Name and email are required." }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ message: "Supabase is not configured for the web app." }, { status: 500 });
    }

    const { data: created, error: createError } = await supabase.auth.admin.inviteUserByEmail(body.email.trim(), {
      redirectTo: process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/site-manager/login`
        : undefined,
      data: {
        full_name: body.name.trim(),
        role: "host"
      }
    });

    if (createError || !created.user) {
      return NextResponse.json({ message: createError?.message ?? "Unable to create site manager." }, { status: 400 });
    }

    const siteName = await resolveSiteName(body.siteId ?? "");
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        company_name: siteName || null,
        email: body.email.trim(),
        full_name: body.name.trim(),
        is_active: body.isActive !== false,
        phone_number: body.phone?.trim() || null,
        role: "host"
      })
      .eq("id", created.user.id);

    if (profileError) {
      await supabase.auth.admin.deleteUser(created.user.id);
      return NextResponse.json({ message: profileError.message }, { status: 400 });
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
      phone: body.phone?.trim() ?? "",
      siteId: siteName,
      siteName,
      isActive: body.isActive !== false
    });
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
