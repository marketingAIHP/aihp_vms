import { StorageAccessFramework } from "expo-file-system/legacy";

export type ReportExportFormat = "CSV" | "Excel" | "PDF";

type ReportMetadata = {
  generatedAt: string;
  period: string;
  recordCount: number;
  reportName: string;
  site: string;
  siteManager: string;
};

type ReportRow = Record<string, string | number>;

const formatDetails: Record<ReportExportFormat, { extension: string; mimeType: string }> = {
  CSV: { extension: "csv", mimeType: "text/csv" },
  Excel: { extension: "xls", mimeType: "application/vnd.ms-excel" },
  PDF: { extension: "pdf", mimeType: "application/pdf" }
};

function sanitizeFilePart(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "All";
}

function escapeCsv(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function metadataRows(metadata: ReportMetadata) {
  return [
    ["Report", metadata.reportName],
    ["Reporting Period", metadata.period],
    ["Site", metadata.site],
    ["Site Manager", metadata.siteManager],
    ["Generated At", metadata.generatedAt],
    ["Total Records", metadata.recordCount]
  ] as const;
}

function buildCsv(metadata: ReportMetadata, rows: ReportRow[]) {
  const headers = Object.keys(rows[0] ?? {});
  return [
    ...metadataRows(metadata).map((row) => row.map(escapeCsv).join(",")),
    "",
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header] ?? "")).join(","))
  ].join("\r\n");
}

function buildExcel(metadata: ReportMetadata, rows: ReportRow[]) {
  const headers = Object.keys(rows[0] ?? {});
  const details = metadataRows(metadata)
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td colspan="${Math.max(1, headers.length - 1)}">${escapeHtml(value)}</td></tr>`)
    .join("");
  const headings = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header] ?? "")}</td>`).join("")}</tr>`)
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:7px;text-align:left}th{background:#eee}.details{margin-bottom:18px}</style></head><body><h1>${escapeHtml(metadata.reportName)}</h1><table class="details">${details}</table><table><thead><tr>${headings}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}

function pdfSafe(value: string | number) {
  return String(value)
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, " ")
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function buildPdf(metadata: ReportMetadata, rows: ReportRow[]) {
  const headers = Object.keys(rows[0] ?? {});
  const lines = [
    metadata.reportName,
    ...metadataRows(metadata).slice(1).map(([label, value]) => `${label}: ${value}`),
    "",
    headers.join(" | "),
    "-".repeat(94),
    ...rows.flatMap((row) => {
      const text = headers.map((header) => `${header}: ${row[header] ?? ""}`).join(" | ");
      return text.match(/.{1,94}(?:\s|$)/g)?.map((line) => line.trim()) ?? [text.slice(0, 94)];
    })
  ];
  const pages = Array.from({ length: Math.max(1, Math.ceil(lines.length / 56)) }, (_, index) => lines.slice(index * 56, (index + 1) * 56));
  const objects = new Map<number, string>();
  const pageIds = pages.map((_, index) => 4 + index * 2);
  objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objects.set(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  objects.set(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  pages.forEach((pageLines, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    const stream = `BT /F1 8 Tf 38 805 Td 12 TL ${pageLines.map((line) => `(${pdfSafe(line)}) Tj T*`).join(" ")} ET`;
    objects.set(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects.set(contentId, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  const maxId = Math.max(...objects.keys());
  for (let id = 1; id <= maxId; id += 1) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects.get(id)}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= maxId; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  return `${pdf}trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
}

export async function saveReportToDevice(input: {
  fileLabel: string;
  format: ReportExportFormat;
  metadata: ReportMetadata;
  rows: ReportRow[];
}) {
  const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Choose a device folder, such as Downloads, to save the report.");
  }

  const details = formatDetails[input.format];
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "_").slice(0, 15);
  const filename = `${sanitizeFilePart(input.fileLabel)}_${timestamp}.${details.extension}`;
  const uri = await StorageAccessFramework.createFileAsync(permission.directoryUri, filename, details.mimeType);
  const content = input.format === "CSV"
    ? buildCsv(input.metadata, input.rows)
    : input.format === "Excel"
      ? buildExcel(input.metadata, input.rows)
      : buildPdf(input.metadata, input.rows);
  await StorageAccessFramework.writeAsStringAsync(uri, content);
  return filename;
}
