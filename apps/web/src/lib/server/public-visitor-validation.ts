export const MAX_CHECKIN_BODY_BYTES = 4 * 1024 * 1024;
export const MAX_JSON_BODY_BYTES = 16 * 1024;
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

export const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function exceedsContentLength(request: Request, maximum: number) {
  const value = request.headers.get("content-length");
  if (!value) return false;
  const length = Number(value);
  return Number.isFinite(length) && length > maximum;
}

export function readText(value: FormDataEntryValue | null, maximum: number) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length <= maximum ? text : "";
}

export function normalizePhone(value: unknown) {
  const phone = String(value ?? "").replace(/\D/g, "");
  return phone.length >= 7 && phone.length <= 15 ? phone : "";
}

export function isValidSiteToken(value: string) {
  const containsControlCharacter = Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });

  return value.length >= 2 && value.length <= 120 && !containsControlCharacter;
}

export function hasValidImageSignature(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (mimeType === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
  }

  if (mimeType === "image/webp") {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }

  return false;
}
