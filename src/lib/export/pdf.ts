import jsPDF from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";
import type { ExportDefinition } from "./definitions";
import { STAMP } from "./excel";

const HEADER_FILL: [number, number, number] = [29, 78, 216];

function addHeader(doc: jsPDF, title: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(HEADER_FILL[0], HEADER_FILL[1], HEADER_FILL[2]);
  doc.rect(0, 0, pageWidth, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("BARANGAYCONNECT", 14, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Barangay Management and Information System",
    14,
    20
  );
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageWidth / 2, 40, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Generated: ${new Date().toLocaleString("en-PH")}`,
    pageWidth / 2,
    46,
    { align: "center" }
  );
  doc.setDrawColor(29, 78, 216);
  doc.setLineWidth(0.6);
  doc.line(14, 50, pageWidth - 14, 50);
}

export function printPdfReport(def: ExportDefinition, rows: any[]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  addHeader(doc, def.title);

  const columns = def.columns.map((c) => ({ header: c.header, dataKey: c.header }));
  const body: RowInput[] = rows.map((r) => {
    const row: Record<string, string> = {};
    for (const c of def.columns) {
      const v = c.accessor(r);
      row[c.header] = v == null ? "" : String(v);
    }
    return row;
  });

  autoTable(doc, {
    startY: 54,
    head: [columns.map((c) => c.header)],
    body,
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: HEADER_FILL, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 10, right: 10 },
  });

  if (def.totals) {
    const totals = def.totals(rows);
    let y = (doc as any).lastAutoTable.finalY + 6;
    for (const t of totals) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(29, 78, 216);
      doc.text(`${t.label}:`, 14, y);
      doc.text(String(t.value), 60, y);
      y += 6;
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() / 2, 292, {
      align: "center",
    });
  }

  doc.autoPrint();
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) {
    win.addEventListener("load", () => {
      win.print();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
}

export { STAMP };