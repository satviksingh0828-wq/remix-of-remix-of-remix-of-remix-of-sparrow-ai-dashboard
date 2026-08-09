import { useState, useEffect, useMemo, Fragment } from "react";
import { ChevronDown, ChevronRight, Download, RefreshCw, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/trip-calc";
import { financialYearOptions, financialYearRange } from "@/lib/financial-year";
import { useReportFilters } from "@/lib/report-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { fetchAll } from "@/lib/fetch-all";
import { downloadCsv, toCsv } from "@/lib/csv";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

interface Vehicle {
  id: string;
  registration_number: string;
  nickname?: string;
}

interface CoverageRow {
  id: string;
  expenditure_name: string;
  amount: string;
  note: string;
  entry_date: string;
  is_paid: boolean;
  paid_date: string;
  vehicle_id: string | null;
  branch_id: string | null;
  registration_number?: string;
  branch_name?: string;
}

interface CoverageLedgerProps {
  type: "insurance" | "road_tax";
}

export function CoverageLedger({ type }: CoverageLedgerProps) {
  const { branchId, financialYear: reportFinancialYear } = useReportFilters();
  const isInsurance = type === "insurance";
  const title = isInsurance ? "INSURANCE PREMIUM LEDGER" : "ROAD TAX LEDGER";

  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const arr = [];
    for (let y = currentYear; y >= 2020; y--) arr.push(String(y));
    return arr;
  }, [currentYear]);

  const financialYears = useMemo(() => financialYearOptions(currentYear), [currentYear]);

  const [year, setYear] = useState<string>(String(currentYear));
  const [month, setMonth] = useState<string>(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [financialYear, setFinancialYear] = useState<string>("none");
  const [status, setStatus] = useState<"all" | "paid" | "unpaid">("all");
  const [search, setSearch] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");

  const [rows, setRows] = useState<CoverageRow[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function loadVehicles() {
    try {
      const data = await fetchAll<any>(() =>
        supabase
          .from("vehicles")
          .select("id,registration_number,nickname")
          .order("registration_number"),
      );
      setVehicles(data);
    } catch (err: any) {
      console.error("Failed to load vehicles:", err.message);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const data = await fetchAll<any>(() => {
        let q = supabase
          .from("expenditures")
          .select(
            `
            *,
            vehicles:vehicle_id(registration_number),
            branches:branch_id(branch_name)
          `,
          )
          .eq(isInsurance ? "is_insurance" : "is_road_tax", true)
          .order("entry_date", { ascending: false });

        const effectiveFinancialYear =
          reportFinancialYear !== "none" ? reportFinancialYear : financialYear;
        if (effectiveFinancialYear !== "none") {
          const range = financialYearRange(Number(effectiveFinancialYear));
          q = q.gte("entry_date", range.start).lt("entry_date", range.end) as typeof q;
        } else if (year !== "all") {
          if (month !== "all") {
            const nextMonthNum = Number(month) + 1;
            const nextMonthStart =
              nextMonthNum > 12
                ? `${Number(year) + 1}-01-01`
                : `${year}-${String(nextMonthNum).padStart(2, "0")}-01`;
            q = q
              .gte("entry_date", `${year}-${month}-01`)
              .lt("entry_date", nextMonthStart) as typeof q;
          } else {
            q = q
              .gte("entry_date", `${year}-01-01`)
              .lt("entry_date", `${Number(year) + 1}-01-01`) as typeof q;
          }
        }

        if (vehicleFilter !== "all") {
          q = q.eq("vehicle_id", vehicleFilter) as typeof q;
        }
        if (branchId !== "all") q = q.eq("branch_id", branchId) as typeof q;
        return q;
      });

      setRows(
        data.map((r) => ({
          ...r,
          registration_number: r.vehicles?.registration_number,
          branch_name: r.branches?.branch_name,
        })),
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    load();
  }, [year, month, financialYear, reportFinancialYear, branchId, type, vehicleFilter]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchesStatus = status === "all" ? true : status === "paid" ? r.is_paid : !r.is_paid;

      const s = search.toLowerCase();
      const matchesSearch =
        r.expenditure_name.toLowerCase().includes(s) ||
        (r.registration_number || "").toLowerCase().includes(s) ||
        (r.note || "").toLowerCase().includes(s);

      return matchesStatus && matchesSearch;
    });
  }, [rows, status, search]);

  const total = useMemo(
    () => filteredRows.reduce((s, r) => s + Number(r.amount || 0), 0),
    [filteredRows],
  );
  const unpaidTotal = useMemo(
    () => filteredRows.reduce((s, r) => s + (r.is_paid ? 0 : Number(r.amount || 0)), 0),
    [filteredRows],
  );

  function handleExport() {
    if (filteredRows.length === 0) return toast.error("No data to export");
    const csv = toCsv(
      filteredRows.map((r) => ({
        Date: r.entry_date,
        Name: r.expenditure_name,
        Vehicle: r.registration_number || "—",
        Branch: r.branch_name || "—",
        Amount: r.amount,
        Status: r.is_paid ? "Paid" : "Unpaid",
        "Paid Date": r.paid_date || "—",
        Note: r.note,
      })),
      ["Date", "Name", "Vehicle", "Branch", "Amount", "Status", "Paid Date", "Note"],
    );
    const effectiveFinancialYear =
      reportFinancialYear !== "none" ? reportFinancialYear : financialYear;
    const period =
      effectiveFinancialYear !== "none"
        ? `FY-${effectiveFinancialYear}-${Number(effectiveFinancialYear) + 1}`
        : `${year}-${month}`;
    downloadCsv(csv, `${type}_ledger_${period}.csv`);
  }

  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 p-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search entries..."
            className="h-9 pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="h-9 w-28">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="h-9 w-32">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All months</SelectItem>
            {MONTHS.map((m, i) => (
              <SelectItem key={m} value={String(i + 1).padStart(2, "0")}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={financialYear} onValueChange={setFinancialYear}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Financial Year: None</SelectItem>
            {financialYears.map((fy) => (
              <SelectItem key={fy.value} value={fy.value}>
                FY {fy.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
          <SelectTrigger className="h-9 w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All vehicles</SelectItem>
            {vehicles.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.registration_number} {v.nickname ? `(${v.nickname})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(v: any) => setStatus(v)}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Total <span className="font-semibold text-foreground">{inr(total)}</span> · unpaid{" "}
            <span className="font-semibold text-foreground">{inr(unpaidTotal)}</span>
          </span>
          <Button variant="outline" size="sm" onClick={handleExport} className="h-9 gap-2">
            <Download className="size-4" />
            Export
          </Button>
          <Button variant="ghost" size="icon" onClick={load} disabled={loading} className="h-9 w-9">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="w-10 px-4 py-3"></th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Entry Name</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto mb-2 size-6 animate-spin opacity-20" />
                    Loading entries...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No entries found for the selected period.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isExpanded = expandedId === row.id;
                  return (
                    <Fragment key={row.id}>
                      <tr
                        className="cursor-pointer transition-colors hover:bg-muted/30"
                        onClick={() => setExpandedId(isExpanded ? null : row.id)}
                      >
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {isExpanded ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{row.entry_date}</td>
                        <td className="px-4 py-3 font-medium">{row.expenditure_name}</td>
                        <td className="px-4 py-3">{row.registration_number || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.branch_name || "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {inr(Number(row.amount || 0))}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              row.is_paid
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {row.is_paid ? "Paid" : "Unpaid"}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-muted/10 border-b border-border">
                          <td colSpan={7} className="px-8 py-4">
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                              <div className="space-y-1">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Details
                                </p>
                                <p className="text-sm">
                                  {row.note || "No additional notes provided."}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Payment Status
                                </p>
                                <p className="text-sm">
                                  {row.is_paid
                                    ? `Paid on ${row.paid_date || "N/A"}`
                                    : "Payment pending"}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Internal ID
                                </p>
                                <p className="font-mono text-[10px] text-muted-foreground">
                                  {row.id}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
