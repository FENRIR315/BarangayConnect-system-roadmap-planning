"use client";

import * as React from "react";
import { FileSpreadsheet, Loader2, Printer, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { ExportDefinition } from "@/lib/export/definitions";
import { PEOPLE, EXPORT_KEYS } from "@/lib/export/definitions";
import {
  exportDefinitionToExcel,
  buildExportAllWorkbook,
  downloadWorkbook,
  STAMP,
} from "@/lib/export/excel";
import { printPdfReport } from "@/lib/export/pdf";

function useFetchRows(def: ExportDefinition) {
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function getRows(): Promise<any[]> {
    const supabase = createClient();
    return def.fetch(supabase);
  }

  return { fetching, setFetching, error, setError, getRows };
}

export function ExportExcelButton({
  definition,
  label = "Export Excel",
}: {
  definition: ExportDefinition;
  label?: string;
}) {
  const { fetching, setFetching, error, setError, getRows } = useFetchRows(definition);

  const handleClick = async () => {
    setFetching(true);
    setError(null);
    try {
      const rows = await getRows();
      const wb = exportDefinitionToExcel(definition, rows);
      downloadWorkbook(wb, definition.filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button type="button" size="sm" variant="outline" onClick={handleClick} disabled={fetching}>
        {fetching ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
        )}
        {fetching ? "Exporting..." : label}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

export function PrintReportButton({
  definition,
  label = "Print Report",
}: {
  definition: ExportDefinition;
  label?: string;
}) {
  const { fetching, setFetching, error, setError, getRows } = useFetchRows(definition);

  const handleClick = async () => {
    setFetching(true);
    setError(null);
    try {
      const rows = await getRows();
      printPdfReport(definition, rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Print failed.");
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button type="button" size="sm" variant="outline" onClick={handleClick} disabled={fetching}>
        {fetching ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Printer className="h-4 w-4 text-blue-600" />
        )}
        {fetching ? "Preparing..." : label}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

export function ExportAllButton({ label = "Export All (Excel)" }: { label?: string }) {
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleClick = async () => {
    setFetching(true);
    setError(null);
    try {
      const supabase = createClient();
      const dataMap: Record<string, any[]> = {};
      for (const key of EXPORT_KEYS) {
        const def = PEOPLE[key];
        dataMap[key] = await def.fetch(supabase);
      }
      const defs = EXPORT_KEYS.map((k) => PEOPLE[k]);
      const wb = buildExportAllWorkbook(defs, dataMap);
      downloadWorkbook(wb, `barangay-export-all-${STAMP}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button type="button" size="sm" onClick={handleClick} disabled={fetching}>
        {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
        {fetching ? "Building workbook..." : label}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}