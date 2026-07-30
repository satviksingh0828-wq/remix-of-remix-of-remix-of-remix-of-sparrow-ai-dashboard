/**
 * FixedIncomeList — Admin-only tab showing fixed recurring income from contracts.
 * Each contract with fixed_monthly_charge > 0 or fixed_yearly_charge > 0 is listed.
 * Shows the effective monthly amount per selected month and provides a CSV export.
 */
import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { inr } from "@/lib/trip-calc";

type ContractCharge = {
  id: string;
  contract_name: string;
  fixed_monthly_charge: number;
  fixed_monthly_charge_note: string;
  fixed_yearly_charge: number;
  fixed_yearly_charge_note: string;
  effective_monthly: number;
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const MONTH_FILTER_OPTIONS = [
  { value: "0", label: "All Months" },
  ...MONTHS.map((m, i) => ({ value: String(i + 1), label: m })),
];

export function FixedIncomeList() {
  const [contracts, setContracts] = useState<ContractCharge[]>([]);
  const [loading, setLoading]     = useState(true);
  const [year, setYear]           = useState(String(new Date().getFullYear()));
  const [month, setMonth]         = useState(String(new Date().getMonth() + 1)); // default: current month

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select("id,contract_name,fixed_monthly_charge,fixed_monthly_charge_note,fixed_yearly_charge,fixed_yearly_charge_note")
        .order("contract_name");
      if (error) throw new Error(error.message);
      const rows = (data ?? [])
        .map(c => ({
          id: c.id as string,
          contract_name: String(c.contract_name ?? ""),
          fixed_monthly_charge: Number((c as Record<string, unknown>).fixed_monthly_charge ?? 0),
          fixed_monthly_charge_note: String((c as Record<string, unknown>).fixed_monthly_charge_note ?? ""),
          fixed_yearly_charge: Number((c as Record<string, unknown>).fixed_yearly_charge ?? 0),
          fixed_yearly_charge_note: String((c as Record<string, unknown>).fixed_yearly_charge_note ?? ""),
          effective_monthly:
            Number((c as Record<string, unknown>).fixed_monthly_charge ?? 0) +
            Number((c as Record<string, unknown>).fixed_yearly_charge ?? 0) / 12,
        }))
        .filter(c => c.effective_monthly > 0);
      setContracts(rows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load contracts");
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i + 1);

  const monthlyTotal = contracts.reduce((s, c) => s + c.effective_monthly, 0);
  const yearlyTotal  = monthlyTotal * 12;

  // Which months to display
  const monthNum     = Number(month);
  const displayMonths = monthNum > 0
    ? [{ short: SHORT_MONTHS[monthNum - 1], idx: monthNum - 1 }]
    : SHORT_MONTHS.map((s, i) => ({ short: s, idx: i }));

  function exportCsv() {
    const rows: string[][] = [];
    rows.push(["Month", "Year", ...contracts.map(c => c.contract_name), "Monthly Total"]);
    displayMonths.forEach(({ short, idx }) => {
      rows.push([MONTHS[idx], year, ...contracts.map(c => c.effective_monthly.toFixed(2)), monthlyTotal.toFixed(2)]);
    });
    if (monthNum === 0) {
      rows.push(["YEARLY TOTAL", year, ...contracts.map(c => (c.effective_monthly * 12).toFixed(2)), yearlyTotal.toFixed(2)]);
    }
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `fixed-income-${year}${monthNum > 0 ? `-${String(monthNum).padStart(2,"0")}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const periodTotal = monthNum > 0 ? monthlyTotal : yearlyTotal;
  const periodLabel = monthNum > 0 ? `${MONTHS[monthNum - 1]} ${year}` : `Year ${year}`;

  return (
    <div className="animate-fade-up space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Fixed Income</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Monthly recurring income from contract fixed charges. Yearly amounts are auto-divided by 12.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={contracts.length === 0}>
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Year + Month filter */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/50 p-3">
        <span className="text-sm text-muted-foreground">Year:</span>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">Month:</span>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTH_FILTER_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
        <span className="ml-auto text-sm text-muted-foreground">
          {periodLabel} total:{" "}
          <span className="font-semibold text-foreground">{inr(periodTotal)}</span>
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : contracts.length === 0 ? (
        <p className="rounded-xl bg-muted px-4 py-10 text-center text-sm text-muted-foreground">
          No contracts with fixed charges found. Add fixed monthly or yearly charges in the Masters → Contracts section.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Month</th>
                {contracts.map(c => (
                  <th key={c.id} className="py-2 pr-3 text-right">
                    <div className="font-medium">{c.contract_name}</div>
                    {(c.fixed_monthly_charge_note || c.fixed_yearly_charge_note) && (
                      <div className="text-[10px] font-normal text-muted-foreground">
                        {c.fixed_monthly_charge_note || c.fixed_yearly_charge_note}
                      </div>
                    )}
                  </th>
                ))}
                <th className="py-2 text-right font-semibold">Month Total</th>
              </tr>
            </thead>
            <tbody>
              {displayMonths.map(({ short, idx }) => (
                <tr key={idx} className="border-b border-border/60 hover:bg-muted/20">
                  <td className="py-2 pr-3 font-medium">{short} {year}</td>
                  {contracts.map(c => (
                    <td key={c.id} className="py-2 pr-3 text-right text-muted-foreground">
                      {inr(c.effective_monthly)}
                      {c.fixed_monthly_charge > 0 && c.fixed_yearly_charge > 0 && (
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          ({inr(c.fixed_monthly_charge)}+{inr(c.fixed_yearly_charge / 12)})
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="py-2 text-right font-semibold text-foreground">{inr(monthlyTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                <td className="py-2 pr-3">{monthNum > 0 ? "Month Total" : "Yearly Total"}</td>
                {contracts.map(c => (
                  <td key={c.id} className="py-2 pr-3 text-right">
                    {inr(monthNum > 0 ? c.effective_monthly : c.effective_monthly * 12)}
                  </td>
                ))}
                <td className="py-2 text-right text-primary">{inr(periodTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Contract details */}
      {contracts.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contract breakdown</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {contracts.map(c => (
              <div key={c.id} className="rounded-lg bg-card p-3 shadow-sm">
                <p className="text-sm font-medium">{c.contract_name}</p>
                {c.fixed_monthly_charge > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Monthly: <span className="font-semibold text-foreground">{inr(c.fixed_monthly_charge)}</span>
                    {c.fixed_monthly_charge_note ? ` — ${c.fixed_monthly_charge_note}` : ""}
                  </p>
                )}
                {c.fixed_yearly_charge > 0 && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Yearly: <span className="font-semibold text-foreground">{inr(c.fixed_yearly_charge)}</span>
                    {" "}= {inr(c.fixed_yearly_charge / 12)}/mo
                    {c.fixed_yearly_charge_note ? ` — ${c.fixed_yearly_charge_note}` : ""}
                  </p>
                )}
                <p className="mt-1 text-xs font-semibold text-primary">Effective monthly: {inr(c.effective_monthly)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
