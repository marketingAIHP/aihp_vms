const COMPANY_TO_VISIT_PREFIX = "Company To Visit:";
const MODE_OF_COMMUTE_PREFIX = "Mode of Commute:";
const VEHICLE_NUMBER_PREFIX = "Vehicle Number:";
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

function extractValue(notes: string | null | undefined, prefix: string) {
  const line = splitLines(notes).find((item) => item.startsWith(prefix));
  return line ? line.slice(prefix.length).trim() : "";
}

export function extractCompanyToVisit(notes: string | null | undefined) {
  return extractValue(notes, COMPANY_TO_VISIT_PREFIX);
}

export function extractModeOfCommute(notes: string | null | undefined) {
  return extractValue(notes, MODE_OF_COMMUTE_PREFIX);
}

export function extractVehicleNumber(notes: string | null | undefined) {
  return extractValue(notes, VEHICLE_NUMBER_PREFIX);
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
