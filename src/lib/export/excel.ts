import * as XLSX from "xlsx";
import type { ExportDefinition } from "./definitions";

const STAMP = new Date().toISOString().split("T")[0];

function fitWidths(rows: string[][], min = 10, max = 40): number[] {
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, i) => {
      const len = cell ? String(cell).length : 0;
      widths[i] = Math.max(widths[i] || 0, len);
    });
  }
  return widths.map((w) => Math.min(Math.max(w + 2, min), max));
}

function headerStyle(): XLSX.CellObject {
  return {
    v: "",
    t: "s",
    s: {
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
      fill: { fgColor: { rgb: "1D4ED8" } },
      alignment: { horizontal: "left", vertical: "center" },
    },
  };
}

function buildSheet(def: ExportDefinition, rows: any[]): XLSX.WorkSheet {
  const dataRows = rows.map((r) =>
    def.columns.map((c) => {
      const v = c.accessor(r);
      return v == null ? "" : String(v);
    })
  );

  const aoa: string[][] = [];
  aoa.push([def.title.toUpperCase()]);
  aoa.push([`Generated: ${new Date().toLocaleString("en-PH")}`]);
  aoa.push([]);
  aoa.push(def.columns.map((c) => c.header));
  aoa.push(...dataRows);

  const totals = def.totals ? def.totals(rows) : [];
  if (totals.length > 0) {
    aoa.push([]);
    for (const t of totals) aoa.push([t.label, t.value]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const widths = fitWidths(aoa);
  ws["!cols"] = widths.map((wch) => ({ wch }));

  const range = XLSX.utils.decode_range(ws["!ref"] as string);
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 3, c });
    ws[addr] = headerStyle();
  }
  if (totals.length > 0) {
    const firstTotalRow = 4 + dataRows.length + 1;
    for (let i = 0; i < totals.length; i++) {
      const addr = XLSX.utils.encode_cell({ r: firstTotalRow + i, c: 0 });
      ws[addr] = { t: "s", v: ws[addr]?.v, s: { font: { bold: true } } };
    }
  }
  ws["!rows"] = [{ hpt: 22 }, { hpt: 18 }, { hpt: 8 }, { hpt: 20 }];

  ws["!margins"] = { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 } as any;
  ws["!pageSetup"] = {
    paperSize: 9,
    orientation: "landscape",
    fitToWidth: 1,
    fitToHeight: 0,
    scale: 85,
  } as any;
  ws["!printArea"] = range;
  return ws;
}

export function exportDefinitionToExcel(def: ExportDefinition, rows: any[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const ws = buildSheet(def, rows);
  XLSX.utils.book_append_sheet(wb, ws, def.sheetName.slice(0, 31));
  return wb;
}

export function buildExportAllWorkbook(
  defs: ExportDefinition[],
  dataMap: Record<string, any[]>
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  for (const def of defs) {
    const ws = buildSheet(def, dataMap[def.key] ?? []);
    XLSX.utils.book_append_sheet(wb, ws, def.sheetName.slice(0, 31));
  }
  return wb;
}

export function downloadWorkbook(wb: XLSX.WorkBook, baseName: string) {
  const safeStamp = STAMP;
  XLSX.writeFile(wb, `${baseName}-${safeStamp}.xlsx`);
}

export { STAMP };