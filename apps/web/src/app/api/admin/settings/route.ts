import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/route-auth";
import { fetchSettings, updateSettings } from "@/lib/server/live-data";

export async function GET() {
  try {
    await requireApiRole("admin");
    return NextResponse.json(await fetchSettings());
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireApiRole("admin");
    const body = (await request.json()) as Partial<{
      companyAddress: string;
      companyName: string;
      securityMode: string;
      supportEmail: string;
      visitorPolicy: string;
    }>;

    const next = await updateSettings(
      {
        companyName: typeof body.companyName === "string" ? body.companyName : undefined,
        companyAddress: typeof body.companyAddress === "string" ? body.companyAddress : undefined,
        supportEmail: typeof body.supportEmail === "string" ? body.supportEmail : undefined,
        visitorPolicy: typeof body.visitorPolicy === "string" ? body.visitorPolicy : undefined,
        securityMode:
          body.securityMode === "standard" || body.securityMode === "strict" ? body.securityMode : undefined
      },
      { email: session.email }
    );

    return NextResponse.json(next);
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
