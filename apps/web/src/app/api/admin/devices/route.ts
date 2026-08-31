import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/route-auth";
import { createAuditLog, getSupabaseAdminClient } from "@/lib/server/live-data";

const MAX_SERIAL_LENGTH = 120;
const MAX_SITE_LENGTH = 120;

export async function GET() {
  try {
    await requireApiRole("admin");
    const supabase = getSupabaseAdminClient();
    if (!supabase) throw new Error("Device service is unavailable.");

    const { data, error } = await supabase
      .from("site_devices")
      .select("id, serial_number, site_name, activation_code, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ devices: data ?? [] });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "Unauthorized";
    return NextResponse.json({ message: unauthorized ? "Unauthorized" : "Unable to load devices." }, { status: unauthorized ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiRole("admin", request);
    const body = await request.json() as { serialNumber?: unknown; siteName?: unknown };
    const serialNumber = typeof body.serialNumber === "string" ? body.serialNumber.trim() : "";
    const siteName = typeof body.siteName === "string" ? body.siteName.trim() : "";
    if (!serialNumber || serialNumber.length > MAX_SERIAL_LENGTH || !siteName || siteName.length > MAX_SITE_LENGTH) {
      return NextResponse.json({ message: "Enter a valid device serial number and assigned site." }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) throw new Error("Device service is unavailable.");
    const activationCode = randomUUID().replaceAll("-", "").toUpperCase();
    const { data, error } = await supabase
      .from("site_devices")
      .upsert(
        { serial_number: serialNumber, site_name: siteName, activation_code: activationCode },
        { onConflict: "serial_number" }
      )
      .select("id, serial_number, site_name, activation_code, created_at")
      .single();
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });

    await createAuditLog({
      action: "REGISTER_DEVICE",
      actorName: session.email,
      actorRole: "admin",
      detail: `Registered or reassigned device ${serialNumber} to ${siteName}`,
      targetId: data.id,
      targetTable: "site_devices"
    });
    return NextResponse.json({ device: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error && error.message === "Unauthorized" ? "Unauthorized" : "Unable to register device." }, { status: 500 });
  }
}
