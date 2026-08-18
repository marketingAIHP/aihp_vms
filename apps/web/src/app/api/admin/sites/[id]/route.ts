import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/route-auth";
import { createAuditLog, fetchSiteStoragePath, getSupabaseAdminClient } from "@/lib/server/live-data";
import {
  ALLOWED_PHOTO_TYPES,
  exceedsContentLength,
  hasValidImageSignature,
  MAX_PHOTO_BYTES,
  readText
} from "@/lib/server/public-visitor-validation";

const MAX_SITE_UPDATE_BYTES = MAX_PHOTO_BYTES + 32 * 1024;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  let uploadedPath: string | null = null;

  try {
    const session = await requireApiRole("admin");
    const { id } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ message: "Invalid site." }, { status: 400 });
    }

    if (exceedsContentLength(request, MAX_SITE_UPDATE_BYTES)) {
      return NextResponse.json({ message: "Site photo must be 3 MB or smaller." }, { status: 413 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ message: "Site service is unavailable." }, { status: 503 });
    }

    const form = await request.formData();
    const name = readText(form.get("name"), 120);
    const address = readText(form.get("address"), 500);
    const image = form.get("image");

    if (name.length < 2) {
      return NextResponse.json({ message: "Site name is required." }, { status: 400 });
    }

    const oldImagePath = await fetchSiteStoragePath(id);
    if (image instanceof File && image.size > 0) {
      if (image.size > MAX_PHOTO_BYTES || !ALLOWED_PHOTO_TYPES.has(image.type)) {
        return NextResponse.json({ message: "Use a JPEG, PNG, or WebP image up to 3 MB." }, { status: 400 });
      }

      const bytes = new Uint8Array(await image.arrayBuffer());
      if (!hasValidImageSignature(bytes, image.type)) {
        return NextResponse.json({ message: "The selected file is not a valid image." }, { status: 400 });
      }

      const extension = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
      uploadedPath = `${id}/${Date.now()}-${randomUUID()}.${extension}`;
      const upload = await supabase.storage.from("site-images").upload(uploadedPath, bytes, {
        contentType: image.type,
        upsert: false
      });

      if (upload.error) {
        throw new Error("Site image upload failed.");
      }
    }

    const update = await supabase.rpc("admin_update_site", {
      p_address: address,
      p_image_path: uploadedPath,
      p_name: name,
      p_site_id: id
    });

    if (update.error) {
      throw new Error(update.error.message);
    }

    if (uploadedPath && oldImagePath && oldImagePath !== uploadedPath) {
      await supabase.storage.from("site-images").remove([oldImagePath]);
    }

    await createAuditLog({
      action: "UPDATE_SITE",
      actorName: session.email,
      actorRole: "admin",
      detail: JSON.stringify({ address, imageUpdated: Boolean(uploadedPath), name }),
      targetId: id,
      targetTable: "master_data"
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (uploadedPath) {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        await supabase.storage.from("site-images").remove([uploadedPath]);
      }
    }

    const unauthorized = error instanceof Error && error.message === "Unauthorized";
    return NextResponse.json(
      { message: unauthorized ? "Unauthorized" : "Unable to update the site." },
      { status: unauthorized ? 401 : 500 }
    );
  }
}
