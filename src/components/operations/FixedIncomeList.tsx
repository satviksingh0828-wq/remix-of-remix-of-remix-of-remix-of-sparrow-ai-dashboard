/**
 * FixedIncomeList — Admin-only tab showing fixed recurring income from contracts.
 * Each contract with fixed_monthly_charge > 0 or fixed_yearly_charge > 0 is listed.
 * Shows the effective monthly amount and provides a simple CSV export.
 */
import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inr } from "@/lib/trip-calc";

type ContractCharge = {
  id: string;
  contract_name: string;
  fixed_monthly_charge: number;
  fixed_monthly_charge_note: string;
  fixed_yearly_charge: number;
  fixed_yearly_charge_note: string;
  /** effective monthly = fixed_monthly + yearly/12 */
  effective_monthly: number;
};

const MONTHS = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];

const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function FixedIncomeList() {
  const [contracts, setContracts] = useState<ContractCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(String(new Date().getFullYear()));

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select("id,contract_name,fixed_monthly_charge,fixed_monthly_charge_note,fixed_yearly_charge,fixed_yearly_charge_note")
        .order("contract_name");
      if (error) throw new Error(error.message);
      const rows = (data ?? [])
        .map((c) => ({
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
        .filter((c) => c.effective_monthly > 0);
      setContracts(rows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load contracts");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // Build years list (last 5 + next 2)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i + 1);

  // Total per month (all contracts sum, constant across months)
  const monthlyTotal = contracts.reduce((s, c) => s + c.effective_monthly, 0);
  const yearlyTotal = monthlyTotal * 12;

  function exportCsv() {
    const rows: string[][] = [];
    rows.push(["Month", "Year", ...contracts.map((c) => c.contract_name), "Monthly Total"]);
    MONTHS.forEach((m, idx) => {
      const row = [m, year, ...contracts.map((c) => c.effective_monthly.toFixed(2)), monthlyTotal.toFixed(2)];
      rows.push(row);
    });
    rows.push(["YEARLY TOTAL", year, ...contracts.map((c) => (c.effective_monthly * 12).toFixed(2)), yearlyTotal.toFixed(2)]);

    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fixed-income-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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

      {/* Year filter */}
      <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
        <span className="text-sm text-muted-foreground">Year:</span>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="h-9 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-sm text-muted-foreground">
          Yearly total:{" "}
          <span className="font-semibold text-foreground">{inr(yearlyTotal)}</span>
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
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
                {contracts.map((c) => (
                  <th key={c.id} className="py-2 pr-3 text-right">
                    <div className="font-medium">{c.contract_name}</div>
                    {(c.fixed_monthly_charge_note || c.fixed_yearly_charge_note) ? (
                      <div className="text-[10px] font-normal text-muted-foreground">
                        {c.fixed_monthly_charge_note || c.fixed_yearly_charge_note}
                      </div>
                    ) : null}
                  </th>
                ))}
                <th className="py-2 text-right font-semibold">Month Total</th>
              </tr>
            </thead>
            <tbody>
              {SHORT_MONTHS.map((m, idx) => (
                <tr key={m} className="border-b border-border/60 hover:bg-muted/20">
                  <td className="py-2 pr-3 font-medium">
                    {m} {year}
                  </td>
                  {contracts.map((c) => (
                    <td key={c.id} className="py-2 pr-3 text-right text-muted-foreground">
                      {inr(c.effective_monthly)}
                      {c.fixed_monthly_charge > 0 && c.fixed_yearly_charge > 0 ? (
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          ({inr(c.fixed_monthly_charge)}+{inr(c.fixed_yearly_charge / 12)})
                        </span>
                      ) : null}
                    </td>
                  ))}
                  <td className="py-2 text-right font-semibold text-foreground">
                    {inr(monthlyTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                <td className="py-2 pr-3">Yearly Total</td>
                {contracts.map((c) => (
                  <td key={c.id} className="py-2 pr-3 text-right">
                    {inr(c.effective_monthly * 12)}
                  </td>
                ))}
                <td className="py-2 text-right text-primary">{inr(yearlyTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Contract details */}
      {contracts.length > 0 ? (
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Contract breakdown
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {contracts.map((c) => (
              <div key={c.id} className="rounded-lg bg-card p-3 shadow-sm">
                <p className="text-sm font-medium">{c.contract_name}</p>
                {c.fixed_monthly_charge > 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Monthly: <span className="font-semibold text-foreground">{inr(c.fixed_monthly_charge)}</span>
                    {c.fixed_monthly_charge_note ? ` — ${c.fixed_monthly_charge_note}` : ""}
                  </p>
                ) : null}
                {c.fixed_yearly_charge > 0 ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Yearly: <span className="font-semibold text-foreground">{inr(c.fixed_yearly_charge)}</span>
                    {" "}= {inr(c.fixed_yearly_charge / 12)}/mo
                    {c.fixed_yearly_charge_note ? ` — ${c.fixed_yearly_charge_note}` : ""}
                  </p>
                ) : null}
                <p className="mt-1 text-xs font-semibold text-primary">
                  Effective monthly: {inr(c.effective_monthly)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
