import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/server/live-data";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { activationCode?: unknown };
    const activationCode = typeof body.activationCode === "string" ? body.activationCode.trim().toUpperCase() : "";
    if (!/^[A-F0-9]{32}$/.test(activationCode)) {
      return NextResponse.json({ message: "Enter a valid device activation code." }, { status: 400 });
    }
    const supabase = getSupabaseAdminClient();
    if (!supabase) throw new Error("Service unavailable");
    const { data, error } = await supabase
      .from("site_devices")
      .select("site_name")
      .eq("activation_code", activationCode)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ message: "Activation code was not found." }, { status: 404 });
    return NextResponse.json({ siteName: data.site_name });
  } catch {
    return NextResponse.json({ message: "Unable to activate this device." }, { status: 500 });
  }
}
