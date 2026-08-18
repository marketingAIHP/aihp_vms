const COMPANY_TO_VISIT_PREFIX = "Company To Visit:";
const LEGACY_PHOTO_URL_PREFIX = "Photo:";
const PHOTO_PATH_PREFIX = "PhotoPath:";

const PROTECTED_PREFIXES = [COMPANY_TO_VISIT_PREFIX, LEGACY_PHOTO_URL_PREFIX, PHOTO_PATH_PREFIX];

function splitLines(notes: string | null | undefined) {
  return (notes ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function extractPhotoStoragePath(notes: string | null | undefined) {
  const line = splitLines(notes).find((item) => item.startsWith(PHOTO_PATH_PREFIX));
  return line ? line.slice(PHOTO_PATH_PREFIX.length).trim() : "";
}

export function extractLegacyPhotoUrl(notes: string | null | undefined) {
  const line = splitLines(notes).find((item) => item.startsWith(LEGACY_PHOTO_URL_PREFIX));
  return line ? line.slice(LEGACY_PHOTO_URL_PREFIX.length).trim() : "";
}

export function extractProtectedNoteLines(notes: string | null | undefined) {
  return splitLines(notes).filter((line) => PROTECTED_PREFIXES.some((prefix) => line.startsWith(prefix)));
}

export function getVisibleVisitNotes(notes: string | null | undefined) {
  return splitLines(notes)
    .filter((line) => !PROTECTED_PREFIXES.some((prefix) => line.startsWith(prefix)))
    .join("\n");
}

export function buildCheckInNotes(input: {
  companyToVisit: string;
  photoStoragePath?: string;
  remarks?: string;
}) {
  const lines = [
    input.companyToVisit ? `${COMPANY_TO_VISIT_PREFIX} ${input.companyToVisit.trim()}` : "",
    input.remarks?.trim() ?? "",
    input.photoStoragePath ? `${PHOTO_PATH_PREFIX} ${input.photoStoragePath.trim()}` : ""
  ].filter(Boolean);

  return lines.join("\n");
}

export function mergeVisibleNotesWithProtectedMetadata(existingNotes: string | null | undefined, nextVisibleNotes: string) {
  const protectedLines = extractProtectedNoteLines(existingNotes);
  const visibleLines = splitLines(nextVisibleNotes);
  return [...protectedLines, ...visibleLines].join("\n");
}
