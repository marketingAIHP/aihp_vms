"use client";

import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

export function exportRowsToCsv(filename: string, rows: Record<string, unknown>[]) {
  const columns = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>())
  );

  const csv = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => escapeCsvCell(row[column])).join(","))
  ].join("\n");

  downloadBlob(`${filename}.csv`, new Blob([csv], { type: "text/csv;charset=utf-8;" }));
}

export async function exportRowsToExcel(filename: string, rows: Record<string, unknown>[]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Report");
  const columns = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>())
  );

  worksheet.columns = columns.map((column) => ({
    header: column,
    key: column,
    width: Math.max(18, column.length + 4)
  }));

  rows.forEach((row) => {
    worksheet.addRow(
      Object.fromEntries(columns.map((column) => [column, row[column] ?? ""]))
    );
  });

  worksheet.getRow(1).font = { bold: true };
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    `${filename}.xlsx`,
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    })
  );
}

export function exportRowsToPdf(filename: string, columns: string[], rows: Record<string, unknown>[]) {
  const pdf = new jsPDF({ orientation: "landscape" });
  autoTable(pdf, {
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
