import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createAuditLog, createNotification, fetchProfileByEmail, fetchVisits, getSupabaseAdminClient } from "@/lib/server/live-data";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const [profile, visits] = await Promise.all([fetchProfileByEmail(session.email), fetchVisits()]);
  const { id } = await params;
  const visit = visits.find((item) => item.id === id);

  if (!visit) {
    return NextResponse.json({ message: "Visit not found." }, { status: 404 });
  }

  if (session.role === "site_manager" && visit.siteManagerId !== profile?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ message: "Supabase is not configured for the web app." }, { status: 500 });
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("visits").update({ checked_in_at: now, status: "CHECKED_IN" }).eq("id", id);
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  await Promise.all([
    createAuditLog({
      action: "CHECK_IN",
      actorName: session.email,
      actorRole: session.role,
      detail: `Checked in visitor ${visit.visitorName}`,
      targetId: id,
      targetTable: "visits"
    }),
    createNotification({
      title: "Visitor Checked-In",
      message: `${visit.visitorName} has checked in.`,
      targetRoles: ["admin", "site_manager"],
      userId: visit.siteManagerId
    })
  ]);

  const updated = (await fetchVisits()).find((item) => item.id === id);
  return NextResponse.json(updated ?? visit);
}
