"use client";

export type ReportMetadata = {
  filters: Record<string, string | number>;
  title: string;
};

function downloadBlob(filename: string, blob: Blob) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function escapeCsvCell(value: unknown) {
  const content = String(value ?? "");
  if (/[",\n]/.test(content)) {
    return `"${content.replace(/"/g, '""')}"`;
  }
  return content;
}

export function exportRowsToCsv(filename: string, rows: Record<string, unknown>[], metadata?: ReportMetadata) {
  const columns = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>())
  );

  const csv = [
    ...(metadata
      ? [escapeCsvCell(metadata.title), ...Object.entries(metadata.filters).map(([label, value]) => `${escapeCsvCell(label)},${escapeCsvCell(value)}`), ""]
      : []),
    columns.join(","),
    ...rows.map((row) => columns.map((column) => escapeCsvCell(row[column])).join(","))
  ].join("\n");

  downloadBlob(`${filename}.csv`, new Blob([csv], { type: "text/csv;charset=utf-8;" }));
}

export async function exportRowsToExcel(filename: string, rows: Record<string, unknown>[], metadata?: ReportMetadata) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Report");
  const columns = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>())
  );

  worksheet.columns = columns.map((column) => ({
    key: column,
    width: Math.max(18, column.length + 4)
  }));

  if (metadata) {
    const titleRow = worksheet.addRow([metadata.title]);
    worksheet.mergeCells(titleRow.number, 1, titleRow.number, Math.max(1, columns.length));
    titleRow.font = { bold: true, size: 16, color: { argb: "FF8B1212" } };
    titleRow.height = 26;
    Object.entries(metadata.filters).forEach(([label, value]) => {
      const row = worksheet.addRow([label, value]);
      row.getCell(1).font = { bold: true };
    });
    worksheet.addRow([]);
  }

  const headerRow = worksheet.addRow(columns);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF8B1212" } };

  rows.forEach((row) => {
    worksheet.addRow(
      Object.fromEntries(columns.map((column) => [column, row[column] ?? ""]))
    );
  });

  worksheet.views = [{ state: "frozen", ySplit: headerRow.number }];
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    `${filename}.xlsx`,
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    })
  );
}

export async function exportRowsToPdf(filename: string, columns: string[], rows: Record<string, unknown>[], metadata?: ReportMetadata) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable")
  ]);
  const pdf = new jsPDF({ orientation: "landscape" });
  let startY = 14;
  if (metadata) {
    pdf.setTextColor(139, 18, 18);
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text(metadata.title, 14, startY);
    startY += 8;
    pdf.setTextColor(45, 55, 72);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    Object.entries(metadata.filters).forEach(([label, value]) => {
      pdf.text(`${label}: ${value}`, 14, startY);
      startY += 5;
    });
    startY += 3;
  }
  autoTable(pdf, {
    startY,
    head: [columns],
    body: rows.map((row) => columns.map((column) => String(row[column] ?? ""))),
    styles: {
      fontSize: 8,
    },
    headStyles: {
      fillColor: [139, 18, 18],
    },
  });
  pdf.save(`${filename}.pdf`);
}
