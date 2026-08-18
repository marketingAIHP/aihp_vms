import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/route-auth";
import { createAuditLog, fetchVisits, getSupabaseAdminClient } from "@/lib/server/live-data";
import { mergeVisibleNotesWithProtectedMetadata } from "@/lib/server/visit-note-metadata";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiRole("admin");
    const body = (await request.json()) as { rejectionReason?: string };
    const notes = body.rejectionReason?.trim();
    const { id } = await params;

    if (!notes) {
      return NextResponse.json({ message: "Visitor notes are required." }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ message: "Supabase is not configured for the web app." }, { status: 500 });
    }

    const { data: existingVisit, error: existingVisitError } = await supabase
      .from("visits")
      .select("notes")
      .eq("id", id)
      .single();

    if (existingVisitError || !existingVisit) {
      return NextResponse.json({ message: existingVisitError?.message ?? "Visitor not found." }, { status: 404 });
    }

    const mergedNotes = mergeVisibleNotesWithProtectedMetadata(
      (existingVisit as { notes?: string | null }).notes ?? null,
      notes
    );

    const { error } = await supabase.from("visits").update({ notes: mergedNotes }).eq("id", id);
    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    await createAuditLog({
      action: "UPDATE_VISIT",
      actorName: session.email,
      actorRole: "admin",
      detail: `Updated visitor ${id}`,
      targetId: id,
      targetTable: "visits"
    });

    const updated = (await fetchVisits()).find((visit) => visit.id === id);
    if (!updated) {
      return NextResponse.json({ message: "Visitor not found." }, { status: 404 });
    }

    return NextResponse.json(updated);
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

    const { error } = await supabase.from("visits").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    await createAuditLog({
      action: "DELETE_VISIT",
      actorName: session.email,
      actorRole: "admin",
      detail: `Deleted visitor ${id}`,
      targetId: id,
      targetTable: "visits"
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
