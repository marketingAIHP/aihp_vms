import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getRateLimitState } from "@/lib/server/public-rate-limit";
import { getSupabaseAdminClient } from "@/lib/server/live-data";
import { buildCheckInNotes } from "@/lib/server/visit-note-metadata";
import {
  ALLOWED_PHOTO_TYPES,
  exceedsContentLength,
  hasValidImageSignature,
  isValidSiteToken,
  MAX_CHECKIN_BODY_BYTES,
  MAX_PHOTO_BYTES,
  normalizePhone,
  readText
} from "@/lib/server/public-visitor-validation";

type ProfileRow = {
  company_name: string | null;
  full_name: string;
  id: string;
  role: "admin" | "host" | "site_manager";
};

const PURPOSE_OPTIONS = new Set([
  "Meeting",
  "Interview",
  "Delivery",
  "Vendor",
  "Maintenance",
  "Personal",
  "Other"
]);
const COMMUTE_OPTIONS = new Set(["Personal Vehicle", "Public Transport"]);

async function uploadVisitorPhoto(file: File, bytes: Uint8Array) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return "";
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `visitor-photos/${Date.now()}-${randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("visitor-photos").upload(path, bytes, {
    contentType: file.type || "image/jpeg",
    upsert: false
  });

  if (error) {
    throw new Error("Visitor photo upload failed");
  }

  return path;
}

async function resolveAssignedSiteManager(
  supabase: any,
  siteToken: string,
  personToMeet: string
) {
  const normalizedMeet = personToMeet.trim().toLowerCase();

  const siteQuery = await supabase
    .from("profiles")
    .select("id, full_name, company_name, role")
    .eq("role", "host")
    .eq("is_active", true)
    .eq("company_name", siteToken)
    .order("full_name", { ascending: true });

  if (siteQuery.error) {
    throw new Error(siteQuery.error.message);
  }

  const siteManagers = (siteQuery.data ?? []) as ProfileRow[];
  if (siteManagers.length > 0) {
    const matchedManager = siteManagers.find((item) => item.full_name.trim().toLowerCase() === normalizedMeet);
    return matchedManager ?? siteManagers[0];
  }

  const fallbackQuery = await supabase
    .from("profiles")
    .select("id, full_name, company_name, role")
    .eq("role", "admin")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (fallbackQuery.error) {
    throw new Error(fallbackQuery.error.message);
  }

  const fallbackManagers = (fallbackQuery.data ?? []) as ProfileRow[];
  if (fallbackManagers.length === 0) {
    throw new Error("No active account is available to record this check-in.");
  }

  const matchedManager = fallbackManagers.find((item) => item.full_name.trim().toLowerCase() === normalizedMeet);

  return matchedManager ?? fallbackManagers[0];
}

async function createNotifications(
  supabase: any,
  manager: ProfileRow,
  visitorName: string,
  building: string
) {
  const message = `${visitorName} checked in at ${building}.`;

  const notifications = [
    {
      title: "Visitor Checked-In",
      message,
      target_roles: ["admin"]
    }
  ];

  if (manager.role !== "admin") {
    notifications.push({
      user_id: manager.id,
      title: "Visitor Checked-In",
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
      return NextResponse.json({ message: "Visitor check-in is temporarily unavailable." }, { status: 503 });
    }

    const rateLimit = await getRateLimitState(request, "public-checkin", supabase);
    if (rateLimit.limited) {
      return NextResponse.json(
        { message: "Too many check-in attempts. Please try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) }
        }
      );
    }

    if (exceedsContentLength(request, MAX_CHECKIN_BODY_BYTES)) {
      return NextResponse.json({ message: "Check-in request is too large." }, { status: 413 });
    }

    const formData = await request.formData();
    const siteToken = readText(formData.get("siteToken"), 120);
    const visitorName = readText(formData.get("visitorName"), 120);
    const mobileNumber = normalizePhone(formData.get("mobileNumber"));
    const companyComingFrom = readText(formData.get("companyComingFrom"), 160);
    const companyToVisit = readText(formData.get("companyToVisit"), 160);
    const purposeOfVisit = readText(formData.get("purposeOfVisit"), 80);
    const personToMeet = readText(formData.get("personToMeet"), 120);
    const modeOfCommute = readText(formData.get("modeOfCommute"), 40);
    const vehicleNumber = readText(formData.get("vehicleNumber"), 24);
    const agreementAccepted = formData.get("agreementAccepted") === "true";
    const photo = formData.get("photo");

    if (!isValidSiteToken(siteToken) || !visitorName || !mobileNumber || !companyComingFrom || !companyToVisit || !purposeOfVisit || !personToMeet) {
      return NextResponse.json({ message: "One or more required fields are invalid." }, { status: 400 });
    }

    if (!agreementAccepted) {
      return NextResponse.json({ message: "Visitor Agreement acceptance is required." }, { status: 400 });
    }

    if (!PURPOSE_OPTIONS.has(purposeOfVisit) || !COMMUTE_OPTIONS.has(modeOfCommute)) {
      return NextResponse.json({ message: "Purpose or mode of commute is invalid." }, { status: 400 });
    }

    if (modeOfCommute === "Personal Vehicle" && !vehicleNumber) {
      return NextResponse.json({ message: "Vehicle Number is required for Personal Vehicle." }, { status: 400 });
    }

    if (!(photo instanceof File) || photo.size <= 0) {
      return NextResponse.json({ message: "Photo is required." }, { status: 400 });
    }

    if (!ALLOWED_PHOTO_TYPES.has(photo.type)) {
      return NextResponse.json({ message: "Only JPG, PNG, or WebP images are allowed." }, { status: 400 });
    }

    if (photo.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ message: "Photo must be 3 MB or smaller." }, { status: 400 });
    }

    const photoBytes = new Uint8Array(await photo.arrayBuffer());
    if (!hasValidImageSignature(photoBytes, photo.type)) {
      return NextResponse.json({ message: "The captured photo is not a valid image." }, { status: 400 });
    }

    const { data: site, error: siteError } = await supabase
      .from("master_data")
      .select("value")
      .eq("kind", "buildings")
      .eq("value", siteToken)
      .eq("is_active", true)
      .maybeSingle();

    if (siteError || !site) {
      return NextResponse.json({ message: "The selected site is not available." }, { status: 400 });
    }

    const { data: activeVisit, error: activeVisitError } = await supabase
      .from("visits")
      .select("id")
      .eq("building", siteToken)
      .eq("mobile", mobileNumber)
      .eq("status", "CHECKED_IN")
      .is("exited_at", null)
      .limit(1)
      .maybeSingle();

    if (activeVisitError) {
      return NextResponse.json({ message: "Unable to validate visitor status." }, { status: 500 });
    }

    if (activeVisit) {
      return NextResponse.json({ message: "An active visit already exists for this mobile number." }, { status: 409 });
    }

    const manager = await resolveAssignedSiteManager(supabase, siteToken, personToMeet);
    const photoStoragePath = await uploadVisitorPhoto(photo, photoBytes);
    const now = new Date().toISOString();
    const notes = buildCheckInNotes({
      companyToVisit,
      remarks: [
        `Mode of Commute: ${modeOfCommute}`,
        modeOfCommute === "Personal Vehicle" ? `Vehicle Number: ${vehicleNumber}` : ""
      ].filter(Boolean).join("\n"),
      photoStoragePath
    });

    const { data, error } = await supabase
      .from("visits")
      .insert({
        visitor_name: visitorName,
        company: companyComingFrom,
        purpose: purposeOfVisit,
        category: "Guest",
        mobile: mobileNumber,
        email: null,
        building: siteToken,
        floor: "Reception",
        room: "Reception",
        scheduled_at: now,
        host_user_id: manager.id,
        host_name: personToMeet || manager.full_name,
        status: "CHECKED_IN",
        qr_token: randomUUID(),
        photo_required: true,
        live_photo_captured: Boolean(photoStoragePath),
        consent_captured: true,
        id_verified: false,
        checked_in_at: now,
        notes
      })
      .select("id, visitor_name, company, purpose, mobile, building, host_name, checked_in_at, status")
      .single();

    if (error || !data) {
      await supabase.storage.from("visitor-photos").remove([photoStoragePath]);
      return NextResponse.json({ message: "Unable to complete visitor check-in." }, { status: 500 });
    }

    await createNotifications(supabase, manager, visitorName, siteToken);

    return NextResponse.json({
      visit: {
        id: data.id,
        visitorName: data.visitor_name,
        companyName: data.company,
        mobileNumber: data.mobile,
        personToMeet: data.host_name,
        checkInAt: data.checked_in_at,
        status: "CHECKED_IN"
      }
    });
  } catch {
    return NextResponse.json({ message: "Unable to complete visitor check-in." }, { status: 500 });
  }
}
