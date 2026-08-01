import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, Filter, Sparkles, Table2, Trash2 } from "lucide-react";
import { clearSparrowWorkspaceArtifact, readSparrowWorkspaceArtifact, SPARROW_WORKSPACE_EVENT, type SparrowWorkspaceArtifact, type SparrowWorkspaceChartType } from "@/lib/sparrow-workspace";

const COLORS = ["#2563eb", "#16a34a", "#f97316", "#dc2626", "#9333ea", "#0891b2", "#ca8a04", "#db2777"];
const CHART_TYPES: SparrowWorkspaceChartType[] = ["bar", "line", "area", "pie"];

function numericValue(row: Record<string, unknown>) {
  const keys = ["amount", "total_expense", "total_income", "net_income", "freight_amount", "loading_amount", "quantity", "weight", "distance_km"];
  for (const key of keys) {
    const value = Number(row[key] ?? 0);
    if (Number.isFinite(value) && value !== 0) return value;
  }
  return 1;
}

function labelValue(row: Record<string, unknown>) {
  const keys = ["entry_date", "closed_at", "start_date", "transaction_date", "trip_date", "expenditure_name", "income_name", "trip_code", "manifest_number", "entity_label", "transaction_type", "ownership"];
  for (const key of keys) {
    const value = String(row[key] ?? "").trim();
    if (value) return value.length > 16 ? value.slice(0, 16) : value;
  }
  return "Row";
}

function chartRows(rows: Record<string, unknown>[]) {
  const grouped = new Map<string, number>();
  rows.forEach((row) => {
    const label = labelValue(row);
    grouped.set(label, (grouped.get(label) ?? 0) + numericValue(row));
  });
  return Array.from(grouped, ([name, value]) => ({ name, value })).slice(0, 24);
}

function tableHeaders(rows: Record<string, unknown>[]) {
  return Array.from(new Set(rows.slice(0, 25).flatMap((row) => Object.keys(row)))).slice(0, 12);
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(rows: Record<string, unknown>[], title: string) {
  if (!rows.length) return;
  const headers = tableHeaders(rows);
  const csv = [headers.join(","), ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sparrow-workspace"}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function WorkspaceChart({ type, data }: { type: SparrowWorkspaceChartType; data: { name: string; value: number }[] }) {
  if (data.length === 0) return <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No chart data available.</div>;

  if (type === "pie") {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={110} label>
            {data.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === "area") {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Area type="monotone" dataKey="value" stroke="#16a34a" fill="#16a34a" fillOpacity={0.18} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AIWorkspacePanel() {
  const [artifact, setArtifact] = useState<SparrowWorkspaceArtifact | null>(() => readSparrowWorkspaceArtifact());
  const [query, setQuery] = useState("");
  const [chartType, setChartType] = useState<SparrowWorkspaceChartType>(artifact?.chartType ?? "bar");

  useEffect(() => {
    const onUpdate = () => {
      const next = readSparrowWorkspaceArtifact();
      setArtifact(next);
      if (next) setChartType(next.chartType);
    };
    window.addEventListener(SPARROW_WORKSPACE_EVENT, onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener(SPARROW_WORKSPACE_EVENT, onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  const filteredRows = useMemo(() => {
    const rows = artifact?.rows ?? [];
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(needle)));
  }, [artifact, query]);

  const headers = useMemo(() => tableHeaders(filteredRows), [filteredRows]);
  const visualRows = useMemo(() => chartRows(filteredRows), [filteredRows]);
  const total = filteredRows.reduce((sum, row) => sum + numericValue(row), 0);

  if (!artifact) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="size-6" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">AI Workspace is ready</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
          Ask SparrowAI to present data here, for example: “show this month expenses as a chart”, “present closed trips in a table”, or “make a pie chart of Fastag transactions”.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3.5" /> AI Workspace
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">{artifact.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{artifact.description}</p>
            <p className="mt-2 text-xs text-muted-foreground">Source: {artifact.source} · {filteredRows.length} of {artifact.rows.length} rows · Total value {total.toLocaleString("en-IN")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {CHART_TYPES.map((type) => (
              <button key={type} type="button" onClick={() => setChartType(type)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${chartType === type ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}>
                {type}
              </button>
            ))}
            <button type="button" onClick={() => downloadCsv(filteredRows, artifact.title)} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <Download className="size-3.5" /> CSV
            </button>
            <button type="button" onClick={() => { clearSparrowWorkspaceArtifact(); setArtifact(null); }} className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10">
              <Trash2 className="size-3.5" /> Clear
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <WorkspaceChart type={chartType} data={visualRows} />
        </div>

        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter table..." className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
          </div>
          <div className="max-h-[360px] overflow-auto rounded-xl border border-border">
            <table className="min-w-full text-left text-xs">
              <thead className="sticky top-0 bg-muted text-muted-foreground">
                <tr>{headers.map((header) => <th key={header} className="px-3 py-2 font-semibold">{header}</th>)}</tr>
              </thead>
              <tbody>
                {filteredRows.slice(0, 250).map((row, idx) => (
                  <tr key={idx} className="border-t border-border/70 odd:bg-background even:bg-muted/20">
                    {headers.map((header) => <td key={header} className="max-w-[180px] truncate px-3 py-2">{String(row[header] ?? "—")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRows.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No rows match this filter.</div>}
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Table2 className="size-3.5" /> Showing up to 250 filtered rows in the preview.</p>
        </div>
      </div>
    </div>
  );
}
