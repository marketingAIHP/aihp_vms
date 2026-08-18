import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/route-auth";
import { fetchNotifications, fetchProfileByEmail, mapNotification } from "@/lib/server/live-data";

export async function GET() {
  try {
    const session = await requireApiRole("site_manager");
    const [profile, notifications] = await Promise.all([fetchProfileByEmail(session.email), fetchNotifications()]);

    return NextResponse.json(
      notifications
        .map((item) => mapNotification(item))
        .filter((item) => item.userId === profile?.id)
    );
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
