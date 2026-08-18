import { NextResponse } from "next/server";
import { getRateLimitState } from "@/lib/server/public-rate-limit";
import { getSupabaseAdminClient } from "@/lib/server/live-data";
import {
  exceedsContentLength,
  isValidSiteToken,
  MAX_JSON_BODY_BYTES,
  normalizePhone
} from "@/lib/server/public-visitor-validation";

type VisitRow = {
  building: string;
  checked_in_at: string | null;
  company: string;
  exited_at: string | null;
  id: string;
  host_user_id: string;
  mobile: string | null;
  status: string;
  visitor_name: string;
};

function toVisitResponse(visit: VisitRow) {
  return {
    id: visit.id,
    visitorName: visit.visitor_name,
    companyName: visit.company,
    checkInAt: visit.checked_in_at ?? "",
    status: visit.exited_at || visit.status === "EXITED" || visit.status === "CHECKED_OUT" ? "CHECKED_OUT" : "CHECKED_IN"
  };
}

async function findLatestVisit(
  supabase: any,
  phoneNumber: string,
  siteToken: string
) {
  const { data, error } = await supabase
    .from("visits")
    .select("id, visitor_name, company, mobile, building, host_user_id, checked_in_at, exited_at, status")
    .eq("building", siteToken)
    .eq("mobile", normalizePhone(phoneNumber))
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(error.message);
  }

  const visits = (data ?? []) as VisitRow[];

  return {
    activeVisit: visits.find((item) => item.status === "CHECKED_IN" && !item.exited_at) ?? null,
    lastVisit: visits[0] ?? null
  };
}

async function notifyCheckout(
  supabase: any,
  visit: VisitRow
) {
  const message = `${visit.visitor_name} checked out from ${visit.building}.`;
  const notifications = [
    {
      title: "Visitor Checked-Out",
      message,
      target_roles: ["admin"]
    }
  ];
  const { data: manager } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", visit.host_user_id)
    .maybeSingle();

  if (manager?.role === "host" || manager?.role === "site_manager") {
    notifications.push({
      user_id: visit.host_user_id,
      title: "Visitor Checked-Out",
      message,
      target_roles: ["host"]
    } as any);
  }

  await supabase.from("notifications").insert(notifications as any);
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ message: "Visitor check-out is temporarily unavailable." }, { status: 503 });
    }

    const rateLimit = await getRateLimitState(request, "public-checkout", supabase);
    if (rateLimit.limited) {
      return NextResponse.json(
        { message: "Too many check-out attempts. Please try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) }
        }
      );
    }

    if (exceedsContentLength(request, MAX_JSON_BODY_BYTES)) {
      return NextResponse.json({ message: "Request is too large." }, { status: 413 });
    }

    const body = await request.json();
    const phoneNumber = normalizePhone(body.phoneNumber);
    const siteToken = String(body.siteToken ?? "").trim();
    const action = String(body.action ?? "lookup");

    if (!phoneNumber) {
      return NextResponse.json({ message: "Phone number is required." }, { status: 400 });
    }

    if (!isValidSiteToken(siteToken)) {
      return NextResponse.json({ message: "Site token is required." }, { status: 400 });
    }

    if (action !== "lookup" && action !== "checkout") {
      return NextResponse.json({ message: "Invalid action." }, { status: 400 });
    }

    const { activeVisit, lastVisit } = await findLatestVisit(supabase, phoneNumber, siteToken);

    if (action === "lookup") {
      if (!activeVisit) {
        if (lastVisit?.exited_at || lastVisit?.status === "EXITED" || lastVisit?.status === "CHECKED_OUT") {
          return NextResponse.json({ visit: toVisitResponse(lastVisit), message: "You have already checked out." });
        }

        return NextResponse.json({
          visit: null,
          message: "No Active Visit Found.\nPlease check in before entering the site."
        });
      }

      return NextResponse.json({ visit: toVisitResponse(activeVisit) });
    }

    if (!activeVisit) {
      if (lastVisit?.exited_at || lastVisit?.status === "EXITED" || lastVisit?.status === "CHECKED_OUT") {
        return NextResponse.json({ visit: toVisitResponse(lastVisit), message: "You have already checked out." });
      }

      return NextResponse.json({
        visit: null,
        message: "No Active Visit Found.\nPlease check in before entering the site."
      });
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("visits")
      .update({
        exited_at: now,
        status: "EXITED"
      })
      .eq("id", activeVisit.id)
      .eq("status", "CHECKED_IN")
      .is("exited_at", null)
      .select("id, visitor_name, company, mobile, building, host_user_id, checked_in_at, exited_at, status")
      .single();

    if (error || !data) {
      return NextResponse.json({ message: "Unable to complete visitor check-out." }, { status: 500 });
    }

    await notifyCheckout(supabase, data as VisitRow);

    return NextResponse.json({
      visit: toVisitResponse(data as VisitRow),
      message: "Visit Completed Successfully"
    });
  } catch {
    return NextResponse.json({ message: "Unable to complete visitor check-out." }, { status: 500 });
  }
}
