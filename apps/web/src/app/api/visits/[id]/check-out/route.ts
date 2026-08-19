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

  if (visit.status !== "CHECKED_IN" || visit.checkOutAt) {
    return NextResponse.json({ message: "This visitor has already checked out." }, { status: 409 });
  }

  if (session.role === "site_manager" && visit.siteManagerId !== profile?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ message: "Supabase is not configured for the web app." }, { status: 500 });
  }

  const now = new Date().toISOString();
  const { data: updatedRows, error } = await supabase
    .from("visits")
    .update({ exited_at: now, status: "EXITED" })
    .eq("id", id)
    .eq("status", "CHECKED_IN")
    .is("exited_at", null)
    .select("id");
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
  if (!updatedRows?.length) {
    return NextResponse.json({ message: "This visitor has already checked out." }, { status: 409 });
  }

  await Promise.all([
    createAuditLog({
      action: "CHECK_OUT",
      actorName: session.email,
      actorRole: session.role,
      detail: `Checked out visitor ${visit.visitorName}`,
      targetId: id,
      targetTable: "visits"
    }),
    createNotification({
      title: "Visitor Checked-Out",
      message: `${visit.visitorName} has checked out.`,
      targetRoles: ["admin", "site_manager"],
      userId: visit.siteManagerId
    })
  ]);

  const updated = (await fetchVisits()).find((item) => item.id === id);
  return NextResponse.json(updated ?? visit);
}
