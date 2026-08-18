import { Link } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, CalendarCheck, Users, Wallet } from "lucide-react";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllAttendance, useAllPayrolls, useDepartments, useEmployees } from "@/lib/hooks";
import { effectivePaymentStatus } from "@/lib/types";
import { ymd, parseYmd } from "@/lib/attendance-utils";

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  detail: string;
}) {
  return (
    <div className="surface-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function monthBounds(date: Date) {
  return {
    from: ymd(new Date(date.getFullYear(), date.getMonth(), 1)),
    to: ymd(date),
  };
}

function currentMonthLabel(date: Date) {
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function HrOverviewPanel() {
  const today = useMemo(() => new Date(), []);
  const todayKey = ymd(today);
  const { from, to } = monthBounds(today);
  const employeesQ = useEmployees();
  const departmentsQ = useDepartments();
  const attendanceQ = useAllAttendance(from, to);
  const payrollQ = useAllPayrolls();

  const summary = useMemo(() => {
    const employees = employeesQ.data ?? [];
    const active = employees.filter(
      (employee) =>
        employee.status === "active" &&
        (!employee.joining_date || parseYmd(employee.joining_date) <= today),
    );
    const activeIds = new Set(active.map((employee) => employee.id));
    const todayRecords = (attendanceQ.data ?? []).filter(
      (record) => record.date === todayKey && activeIds.has(record.employee_id),
    );
    const present = todayRecords.filter((record) => record.status === "present").length;
    const halfDay = todayRecords.filter((record) => record.status === "half_day").length;
    const absent = todayRecords.filter((record) => record.status === "absent").length;
    const marked = present + halfDay + absent;
    const payrolls = (payrollQ.data ?? []).filter(
      (payroll) => payroll.period_end >= from && payroll.period_start <= to,
    );
    const gross = payrolls.reduce((sum, payroll) => sum + Number(payroll.gross || 0), 0);
    const net = payrolls.reduce((sum, payroll) => sum + Number(payroll.net || 0), 0);
    const pending = payrolls.filter((payroll) => effectivePaymentStatus(payroll) !== "paid").length;

    return {
      active,
      present,
      halfDay,
      absent,
      unmarked: Math.max(0, active.length - marked),
      gross,
      net,
      payrollCount: payrolls.length,
      pending,
    };
  }, [attendanceQ.data, from, payrollQ.data, employeesQ.data, today, todayKey, to]);

  const isLoading =
    employeesQ.isLoading || departmentsQ.isLoading || attendanceQ.isLoading || payrollQ.isLoading;
  const queryError = employeesQ.error || departmentsQ.error || attendanceQ.error || payrollQ.error;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-44 w-full rounded-xl" />
      </div>
    );
  }

  if (queryError) {
    return (
      <div className="surface-card flex items-start gap-3 p-5 text-sm">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div>
          <p className="font-medium">HR overview is not available yet</p>
          <p className="mt-1 text-muted-foreground">
            Run <code>HR_SUPABASE_SETUP.sql</code> in the same Supabase project, then refresh this
            page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            People operations
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">HR overview</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Live people, attendance and payroll summary for {currentMonthLabel(today)}.
          </p>
        </div>
        <Link
          to="/hr-dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Open HR dashboard
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Users className="size-4" />}
          label="Active employees"
          value={summary.active.length}
          detail={`${employeesQ.data?.length ?? 0} total employees`}
        />
        <StatCard
          icon={<CalendarCheck className="size-4" />}
          label="Present today"
          value={`${summary.present}/${summary.active.length}`}
          detail={`${summary.halfDay} half day · ${summary.absent} absent · ${summary.unmarked} unmarked`}
        />
        <StatCard
          icon={<Wallet className="size-4" />}
          label="Gross payroll"
          value={`₹${Math.round(summary.gross).toLocaleString("en-IN")}`}
          detail={`${summary.payrollCount} payroll record${summary.payrollCount === 1 ? "" : "s"} this month`}
        />
        <StatCard
          icon={<Wallet className="size-4" />}
          label="Net payable"
          value={`₹${Math.round(summary.net).toLocaleString("en-IN")}`}
          detail={`${summary.pending} payment${summary.pending === 1 ? "" : "s"} pending`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="surface-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Today&apos;s attendance</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Attendance records for active employees who have joined.
              </p>
            </div>
            <Link
              to="/attendance/mark"
              className="text-xs font-medium text-primary hover:underline"
            >
              Mark attendance
            </Link>
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{
                width: `${summary.active.length ? Math.min(100, (summary.present / summary.active.length) * 100) : 0}%`,
              }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span>
              <strong className="text-emerald-600">{summary.present}</strong> present
            </span>
            <span>
              <strong className="text-amber-600">{summary.halfDay}</strong> half day
            </span>
            <span>
              <strong className="text-red-600">{summary.absent}</strong> absent
            </span>
            <span>
              <strong className="text-foreground">{summary.unmarked}</strong> unmarked
            </span>
          </div>
        </div>

        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold tracking-tight">Quick links</h3>
          <div className="mt-3 space-y-2">
            <QuickLink to="/employees" label="Manage employees" />
            <QuickLink to="/employees/departments" label="Departments & positions" />
            <QuickLink to="/payroll/generate" label="Generate payroll" />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickLink({
  to,
  label,
}: {
  to: "/employees" | "/employees/departments" | "/payroll/generate";
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm transition-colors hover:bg-muted"
    >
      {label}
      <ArrowRight className="size-3.5 text-muted-foreground" />
    </Link>
  );
}