import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Save, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { AccountsAccessGuard } from "@/components/accounts/AccountsAccessGuard";
import { AccountsSectionNav } from "@/components/accounts/AccountsSectionNav";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useBranches } from "@/lib/use-branches";

// The generated Supabase types predate the Accounts rules table.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
type RuleKey = "payroll_paid" | "loan_given" | "advance_given";
type Rule = {
  id: string;
  branch_id: string;
  rule_key: RuleKey;
  enabled: boolean;
  requires_verification: boolean;
  default_bank_cash_ledger_id: string | null;
};
type Ledger = { id: string; branch_id: string; account_name: string; ledger_type: "bank" | "cash" };
const RULES: Array<{ key: RuleKey; title: string; description: string }> = [
  {
    key: "payroll_paid",
    title: "HRMS Payroll Paid",
    description: "Create a cash-basis payroll expense entry when salary is paid.",
  },
  {
    key: "loan_given",
    title: "HRMS Loan Given",
    description: "Create an employee-loan receivable entry when a loan is created.",
  },
  {
    key: "advance_given",
    title: "HRMS Advance Given",
    description: "Create an employee-advance receivable entry when an advance is created.",
  },
];

export function AccountsRulesPage() {
  const branches = useBranches();
  const [branchId, setBranchId] = useState("");
  const [rules, setRules] = useState<Rule[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const branchName = useMemo(
    () => branches.find((b) => b.id === branchId)?.branch_name ?? "Selected branch",
    [branches, branchId],
  );

  async function load() {
    const [{ data: ruleData, error: ruleError }, { data: ledgerData, error: ledgerError }] =
      await Promise.all([
        db.from("hrms_accounting_rules").select("*").order("rule_key"),
        db
          .from("ledger_accounts")
          .select("id,branch_id,account_name,ledger_type")
          .in("ledger_type", ["bank", "cash"])
          .eq("is_active", true)
          .order("account_name"),
      ]);
    if (ruleError || ledgerError)
      toast.error(ruleError?.message ?? ledgerError?.message ?? "Could not load accounting rules.");
    setRules((ruleData as Rule[]) ?? []);
    setLedgers((ledgerData as Ledger[]) ?? []);
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (!branchId && branches[0]) setBranchId(branches[0].id);
  }, [branches, branchId]);

  function currentRule(key: RuleKey) {
    return (
      rules.find((rule) => rule.branch_id === branchId && rule.rule_key === key) ?? {
        id: "",
        branch_id: branchId,
        rule_key: key,
        enabled: true,
        requires_verification: true,
        default_bank_cash_ledger_id: null,
      }
    );
  }
  async function save(rule: Rule) {
    if (!branchId) return toast.error("Select a branch first.");
    if (rule.default_bank_cash_ledger_id) {
      const ledger = ledgers.find((item) => item.id === rule.default_bank_cash_ledger_id);
      if (!ledger || ledger.branch_id !== branchId)
        return toast.error("Select a bank/cash ledger from the selected branch.");
    }
    setSaving(rule.rule_key);
    const { error } = await db.from("hrms_accounting_rules").upsert(
      {
        branch_id: branchId,
        rule_key: rule.rule_key,
        enabled: rule.enabled,
        requires_verification: rule.requires_verification,
        default_bank_cash_ledger_id: rule.default_bank_cash_ledger_id || null,
      },
      { onConflict: "branch_id,rule_key" },
    );
    setSaving(null);
    if (error) return toast.error(error.message);
    toast.success(`${RULES.find((item) => item.key === rule.rule_key)?.title} rule saved.`);
    await load();
  }

  return (
    <AccountsAccessGuard>
      <AppShell
        breadcrumb={
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link to="/home">Workspace</Link>
            <span>/</span>
            <Link to="/accounts">Accounts</Link>
            <span>/</span>
            <span className="text-foreground">Masters / Rules</span>
          </span>
        }
      >
        <div className="grid items-start gap-6 lg:grid-cols-[220px_1fr]">
          <AccountsSectionNav desktop mode="masters" />
          <div className="min-w-0 lg:col-start-2">
            <AccountsSectionNav mode="masters" />
            <header className="mb-6">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">
                Accounts / Masters / Rules
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">HRMS accounting rules</h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Cash-basis entries are created automatically and remain pending until they are
                verified.
              </p>
            </header>
            <section className="surface-card mb-5 p-5">
              <label className="block max-w-sm space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Branch</span>
                <select
                  value={branchId}
                  onChange={(event) => setBranchId(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.branch_name}
                    </option>
                  ))}
                </select>
              </label>
            </section>
            <div className="space-y-4">
              {RULES.map((definition) => {
                const rule = currentRule(definition.key);
                const branchLedgers = ledgers.filter((ledger) => ledger.branch_id === branchId);
                return (
                  <section key={definition.key} className="surface-card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h2 className="font-semibold">{definition.title}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {definition.description}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                        <ShieldCheck className="size-3.5" /> {branchName}
                      </span>
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_auto_auto]">
                      <label className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          Default bank / cash account *
                        </span>
                        <select
                          value={rule.default_bank_cash_ledger_id ?? ""}
                          onChange={(event) =>
                            setRules((all) => [
                              ...all.filter(
                                (item) =>
                                  !(item.branch_id === branchId && item.rule_key === rule.rule_key),
                              ),
                              { ...rule, default_bank_cash_ledger_id: event.target.value || null },
                            ])
                          }
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="">Select account</option>
                          {branchLedgers.map((ledger) => (
                            <option key={ledger.id} value={ledger.id}>
                              {ledger.account_name} · {ledger.ledger_type}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex items-center gap-2 self-end pb-2 text-sm">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={(event) =>
                            setRules((all) => [
                              ...all.filter(
                                (item) =>
                                  !(item.branch_id === branchId && item.rule_key === rule.rule_key),
                              ),
                              { ...rule, enabled: event.target.checked },
                            ])
                          }
                        />{" "}
                        Enabled
                      </label>
                      <label className="flex items-center gap-2 self-end pb-2 text-sm">
                        <input
                          type="checkbox"
                          checked={rule.requires_verification}
                          onChange={(event) =>
                            setRules((all) => [
                              ...all.filter(
                                (item) =>
                                  !(item.branch_id === branchId && item.rule_key === rule.rule_key),
                              ),
                              { ...rule, requires_verification: event.target.checked },
                            ])
                          }
                        />{" "}
                        Verify before posting
                      </label>
                      <Button
                        type="button"
                        onClick={() => void save(rule)}
                        disabled={saving === rule.rule_key}
                        className="gap-2 self-end"
                      >
                        <Save className="size-4" />
                        {saving === rule.rule_key ? "Saving…" : "Save"}
                      </Button>
                    </div>
                    {rule.enabled &&
                      rule.default_bank_cash_ledger_id &&
                      !rule.requires_verification && (
                        <p className="mt-3 flex items-center gap-1 text-xs text-emerald-700">
                          <CheckCircle2 className="size-3.5" /> Entries post automatically after the
                          HRMS event.
                        </p>
                      )}
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      </AppShell>
    </AccountsAccessGuard>
  );
}

export function AccountsRulesRoute() {
  return <AccountsRulesPage />;
}
