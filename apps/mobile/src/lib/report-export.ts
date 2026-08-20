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

function wrapPdfText(value: string | number, width: number, fontSize: number, maxLines = 4) {
  const text = String(value || "-").replace(/\s+/g, " ").trim() || "-";
  const maxCharacters = Math.max(4, Math.floor(width / (fontSize * 0.52)));
  const lines: string[] = [];
  let remaining = text;

  while (remaining.length > 0 && lines.length < maxLines) {
    if (remaining.length <= maxCharacters) {
      lines.push(remaining);
      remaining = "";
      break;
    }

    const candidate = remaining.slice(0, maxCharacters + 1);
    const breakAt = candidate.lastIndexOf(" ");
    const take = breakAt > Math.floor(maxCharacters * 0.55) ? breakAt : maxCharacters;
    lines.push(remaining.slice(0, take).trim());
    remaining = remaining.slice(take).trim();
  }

  if (remaining && lines.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, Math.max(1, maxCharacters - 3))}...`;
  }

  return lines;
}

function pdfColumnWeight(header: string) {
  const normalized = header.toLowerCase();
  if (normalized.includes("time")) return 1.35;
  if (normalized.includes("site") || normalized.includes("company") || normalized.includes("meet")) return 1.2;
  if (normalized.includes("visitor")) return 1.1;
  if (normalized.includes("phone") || normalized.includes("vehicle")) return 1.05;
  return 0.9;
}

export function buildPdf(metadata: ReportMetadata, rows: ReportRow[]) {
  const headers = Object.keys(rows[0] ?? {});
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 28;
  const tableWidth = pageWidth - margin * 2;
  const bodyFontSize = 6.5;
  const lineHeight = 8;
  const headerHeight = 28;
  const tableTop = 477;
  const tableBottom = 34;
  const weights = headers.map(pdfColumnWeight);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const columnWidths = weights.map((weight) => (tableWidth * weight) / totalWeight);
  const preparedRows = rows.map((row) => {
    const cells = headers.map((header, index) => wrapPdfText(row[header] ?? "-", columnWidths[index] - 8, bodyFontSize));
    const height = Math.max(24, Math.max(...cells.map((cell) => cell.length), 1) * lineHeight + 8);
    return { cells, height };
  });
  const pages: typeof preparedRows[] = [];
  let currentPage: typeof preparedRows = [];
  let remainingHeight = tableTop - headerHeight - tableBottom;

  preparedRows.forEach((row) => {
    if (currentPage.length && row.height > remainingHeight) {
      pages.push(currentPage);
      currentPage = [];
      remainingHeight = tableTop - headerHeight - tableBottom;
    }
    currentPage.push(row);
    remainingHeight -= row.height;
  });
  if (currentPage.length || pages.length === 0) pages.push(currentPage);

  const objects = new Map<number, string>();
  const pageIds = pages.map((_, index) => 5 + index * 2);
  objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objects.set(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  objects.set(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.set(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  pages.forEach((pageRows, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    const commands: string[] = [
      "0.02 0.086 0.133 rg 0 0 842 595 re f",
      "1 1 1 rg 18 18 806 559 re f",
      `0.545 0.071 0.071 rg ${margin} 543 6 24 re f`,
      `BT /F2 16 Tf 0.545 0.071 0.071 rg ${margin + 14} 559 Td (${pdfSafe(metadata.reportName)}) Tj ET`,
      `BT /F1 8 Tf 0.25 0.3 0.36 rg ${margin + 14} 544 Td (Professional visitor operations report) Tj ET`,
      `BT /F2 7.5 Tf 0.15 0.19 0.24 rg ${margin} 521 Td (Period:) Tj ET`,
      `BT /F1 7.5 Tf 0.25 0.3 0.36 rg ${margin + 36} 521 Td (${pdfSafe(metadata.period)}) Tj ET`,
      `BT /F2 7.5 Tf 0.15 0.19 0.24 rg 250 521 Td (Site:) Tj ET`,
      `BT /F1 7.5 Tf 0.25 0.3 0.36 rg 274 521 Td (${pdfSafe(metadata.site)}) Tj ET`,
      `BT /F2 7.5 Tf 0.15 0.19 0.24 rg 500 521 Td (Records:) Tj ET`,
      `BT /F1 7.5 Tf 0.25 0.3 0.36 rg 544 521 Td (${metadata.recordCount}) Tj ET`,
      `BT /F2 7.5 Tf 0.15 0.19 0.24 rg ${margin} 505 Td (Site Manager:) Tj ET`,
      `BT /F1 7.5 Tf 0.25 0.3 0.36 rg ${margin + 58} 505 Td (${pdfSafe(metadata.siteManager)}) Tj ET`,
      `BT /F2 7.5 Tf 0.15 0.19 0.24 rg 500 505 Td (Generated:) Tj ET`,
      `BT /F1 7.5 Tf 0.25 0.3 0.36 rg 550 505 Td (${pdfSafe(metadata.generatedAt)}) Tj ET`,
      `0.545 0.071 0.071 rg ${margin} ${tableTop - headerHeight} ${tableWidth} ${headerHeight} re f`
    ];

    let x = margin;
    headers.forEach((header, columnIndex) => {
      const lines = wrapPdfText(header, columnWidths[columnIndex] - 8, 6.8, 2);
      lines.forEach((line, lineIndex) => {
        commands.push(`BT /F2 6.8 Tf 1 1 1 rg ${x + 4} ${tableTop - 11 - lineIndex * 8} Td (${pdfSafe(line)}) Tj ET`);
      });
      x += columnWidths[columnIndex];
    });

    let y = tableTop - headerHeight;
    pageRows.forEach((row, rowIndex) => {
      y -= row.height;
      if (rowIndex % 2 === 1) commands.push(`0.965 0.97 0.975 rg ${margin} ${y} ${tableWidth} ${row.height} re f`);
      commands.push(`0.82 0.84 0.87 RG 0.35 w ${margin} ${y} ${tableWidth} ${row.height} re S`);
      let cellX = margin;
      row.cells.forEach((cellLines, columnIndex) => {
        if (columnIndex > 0) commands.push(`0.86 0.87 0.89 RG 0.3 w ${cellX} ${y} m ${cellX} ${y + row.height} l S`);
        cellLines.forEach((line, lineIndex) => {
          commands.push(`BT /F1 ${bodyFontSize} Tf 0.12 0.16 0.21 rg ${cellX + 4} ${y + row.height - 10 - lineIndex * lineHeight} Td (${pdfSafe(line)}) Tj ET`);
        });
        cellX += columnWidths[columnIndex];
      });
    });

    commands.push(
      `BT /F1 7 Tf 0.4 0.44 0.5 rg ${margin} 22 Td (AIHP Visitor Management System) Tj ET`,
      `BT /F1 7 Tf 0.4 0.44 0.5 rg 760 22 Td (Page ${index + 1} of ${pages.length}) Tj ET`
    );
    const stream = commands.join("\n");
    objects.set(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`);
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
  const { StorageAccessFramework } = await import("expo-file-system/legacy");
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
