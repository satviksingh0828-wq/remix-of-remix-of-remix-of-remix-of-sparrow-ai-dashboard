import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadCsv, readSpreadsheetFile, toCsv } from "@/lib/csv";

export type CsvIOProps<T extends Record<string, unknown>> = {
  entityLabel: string; // e.g. "Vehicles"
  filename: string; // e.g. "vehicles"
  columns: string[]; // csv column keys (must match db keys)
  rows: T[];
  onImport: (rows: Record<string, string>[]) => Promise<{ inserted: number; failed: number }>;
  /** When true, hides the Import button (viewer / read-only users) */
  readOnly?: boolean;
};

export function CsvIO<T extends Record<string, unknown>>({
  entityLabel,
  filename,
  columns,
  rows,
  onImport,
  readOnly = false,
}: CsvIOProps<T>) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | "import" | "export" | "template">(null);

  function handleTemplate() {
    setBusy("template");
    const csv = toCsv([], columns);
    downloadCsv(csv, `${filename}-template.csv`);
    setBusy(null);
  }

  function handleExport() {
    setBusy("export");
    const csv = toCsv(rows as Record<string, unknown>[], columns);
    downloadCsv(csv, `${filename}-${new Date().toISOString().slice(0, 10)}.csv`);
    setBusy(null);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy("import");
    try {
      const parsed = await readSpreadsheetFile(f);
      if (parsed.length === 0) {
        toast.error("File has no rows");
        return;
      }
      const res = await onImport(parsed);
      if (res.failed > 0)
        toast.warning(`Imported ${res.inserted} row(s); ${res.failed} failed`);
      else toast.success(`Imported ${res.inserted} ${entityLabel.toLowerCase()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleTemplate}
        disabled={busy !== null}
      >
        <FileSpreadsheet className="size-4" />
        Template
      </Button>
      {!readOnly && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={busy !== null}
        >
          {busy === "import" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          Import
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={busy !== null || rows.length === 0}
      >
        <Download className="size-4" />
        Export
      </Button>
    </div>
  );
}
