# Garuda Logistics HRMS — App Logic Report
_Last verified: 2026-07-17_

---

## 1. Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| UI | React 19 + TanStack Router (hash) | All screens |
| State | TanStack Query (in-memory cache) | Async data |
| API | Express on port 3001 | Filesystem JSON persistence |
| DB Fallback | localStorage (local-db.ts) | Browser-only mode |
| Electron | Electron 33 + IPC → in-process JSON | Desktop standalone mode |
| PDFs | jsPDF + jsPDF-autoTable | Payslip, attendance, loans, deductions |
| Excel | SheetJS (xlsx) | Import/export employees, departments, holidays, attendance, ledger |

All three DB drivers (API, localStorage, Electron IPC) expose a Supabase-compatible query builder and are patched to the same filter logic.

---

## 2. Employee Module

### 2.1 Create / Edit (`employee-form.tsx`)
- 3-step form: Personal → Salary & Work → Status
- Step validation fires on Next; cannot advance with invalid fields
- **Mobile**: `stripMobile()` always extracts the last 10 digits → stored as `+91XXXXXXXXXX`
- **Salary fields**: basic, HRA, travel, special, other allowances; PF, tax deductions; paid holidays/month; unpaid-leave-deduction-rate; paid-leave-payout-rate
- **Status inactive**: requires `inactive_reason` + `date_of_leaving`; stored as ISO date
- `computeSalary()` (types.ts) aggregates gross = basic + HRA + travel + special + other

### 2.2 Department Form (`department-form.tsx`)
- Free-form positions list per department; at least 1 head position required
- **Circular hierarchy guard (`wouldCreateCycle`)**: walks `reports_to_department_id` chain from the selected parent; if it reaches the current department being edited → blocks the selection. Runs both at dropdown level (hides cyclic options) and on submit (final check)
- Working days of week stored as string array e.g. `['Mon','Tue','Wed','Thu','Fri']`

---

## 3. Attendance Module

### 3.1 Mark Attendance (`mark-attendance.tsx`)
- Shows only **active** employees whose `joining_date ≤ selectedDate`
- **Payroll lock**: loads all payrolls; for each employee checks if any payroll has `period_start ≤ dateStr ≤ period_end`. Locked employees show 🔒 and an Unlock button instead of P/A/½ buttons
- Unlock requires a `window.confirm` warning that payroll must be re-generated
- `overrideConfirmed` set resets on date change
- Bulk "Mark all" skips locked employees
- Holiday banner shown when a holiday is found for the selected date
- Statuses: `present` | `half_day` | `absent`

### 3.2 Attendance Summary (`summarizeAttendance`)
- Counts present / half_day / absent / unmarked for a range
- `workingDays = countWorkingDays(joiningDate..to, dept, holidays)` — respects dept working days + holiday list
- Unmarked = `workingDays - present - halfDay - absent` (cannot be negative)

### 3.3 Paid Leave Balance (`computeLeavesBalance`)
- **Earned**: `months_since_joining × paid_holidays_per_month`
- **Used** (FIXED 2026-07-17): counts full absences as 1.0 + half-days as 0.5 on working days only. Previously only counted full absences — this caused a mismatch with payroll generation which correctly used 0.5 for half-days.
- **Left**: earned − used (can be negative if over-used)
- Carry-forward: leaves accumulate indefinitely (no expiry)

---

## 4. Payroll Module

### 4.1 Core Calculation (`payroll-utils.ts: computePayroll`)

```
periodWorkingDays  = working days in the full period (dept + holidays)
workingDays        = working days in clamped range (joining date..period_end)
joinLeaveFactor    = workingDays / periodWorkingDays   (proration)

perMonth           = paid_holidays_per_month
paidLeavesEarned   = (if lastPayroll) carried from previous + months × perMonth
                     (if no lastPayroll) reconstructed from attendance history
leftBefore         = paidLeavesEarned − usedBefore

requestedThisPeriod = absent + halfDay × 0.5   (from attendance records in period)
paidLeavesUsedThisPeriod = min(requestedThisPeriod, leftBefore)
unpaidLeavesThisPeriod   = requestedThisPeriod − paidLeavesUsedThisPeriod
paidLeavesLeftAfter      = leftBefore − paidLeavesUsedThisPeriod

factor   = (workingDays − unpaidLeavesThisPeriod) / workingDays
gross    = periodGross × joinLeaveFactor                          (join proration)
netGross = gross × factor                                         (unpaid leave deduction via factor)

unpaidLeaveDeduction = customRate × unpaidLeavesThisPeriod       (if rate set)
                     = perDay × unpaidLeavesThisPeriod            (else)

paidLeavePayout = paidLeavesLeftBefore × paid_leave_payout_rate  (final payroll only)
```

**Key edge cases:**
- `workingDays = 0` → `factor = 0` → no salary (handles same-day join/leave in non-working period)
- `perMonth = 0` → no paid leaves earned, all absences are unpaid
- `isFinalPayroll` triggers paid-leave payout
- First payroll (no `lastPayroll`): reconstructs leave history from raw attendance logs

### 4.2 Loan / Advance EMI in Payroll (`payroll-generate.tsx`)
- For each active loan: finds installments due in the payroll period (`due_year + due_month + status=pending`)
- `isFinalPayroll (leavingPeriod)`: collects ALL remaining pending installments (not just current month)
- EMI amounts are summed and stored in `loan_deduction` / `advance_deduction`

### 4.3 Loss Deductions
- Status flow: `pending` → `deducted` (via payroll generation) | `paid` (manual mark, skips payroll)
- Both `deducted` and `paid` are excluded from future payrolls (filter: `status = 'pending'`)
- On payroll delete: `deducted` deductions revert to `pending`, `payroll_id` cleared

### 4.4 Negative Net Pay (FIXED 2026-07-17)
- Preview panel shows net in **red** with "⚠ NEGATIVE" badge when `net < 0`
- On Generate: `window.confirm` warning required before saving a negative-net payroll
- PDF payslip also flags negative net with red text + warning note
- Root cause: deductions (loans + advances + loss) can exceed gross in short periods

### 4.5 Delete Payroll (cascade in `hooks.ts: useDeletePayroll`)
- Resets loss deductions: `deducted → pending`, clears `payroll_id`
- Resets loan installments: `paid_payroll → pending`, recalculates `paid_months`, sets status back to `active` (if `paid_months` drops to 0), clears `paid_off_date`
- Resets advance installments: same pattern as loans

---

## 5. Loans & Advances

### 5.1 EMI Calculation (`computeEMI`)
| Method | Formula |
|--------|---------|
| flat | total = P × (1 + r × n/12); EMI = total/n |
| reducing | standard reducing balance annuity formula |
| none | total = P; EMI = P/n |

### 5.2 Installment Schedule (`generateInstallmentSchedule`)
- Creates `n` records, each with `due_date`, `due_year`, `due_month`, `emi_number`, `amount`, `status: pending`
- `due_date` increments monthly from `start_date`

### 5.3 Mark Fully Paid (lump sum)
- Sets `paid_months = months`, `status = 'paid'`, `paid_off_date = today`, `discount_amount = (total_payable - amount_paid)`
- All remaining installments marked `paid_manual`

### 5.4 `loanRemaining`
- `total_payable − (emi × paid_months)` — consistent because `total_payable` and `emi` are derived from the same `computeEMI` call

---

## 6. PDF Exports

All PDFs:
- Embed the Garuda logo (fetched as base64 via `preloadLogo()` at app startup)
- Header: logo (36,18/20, 44×32) + company name + address + maroon separator line
- Table headers: maroon `[155, 28, 28]`
- Footer with "Page X of Y" on all multi-page exports (attendance, loans, deductions, ledger)

### 6.1 Payslip (`payroll-pdf.ts`)
- Earnings table: basic/HRA/travel/special/other + paid leave payout (if final)
- Deductions table: PF/tax/unpaid-leave/loan-EMI/advance-EMI/loss
- Net pay in red with warning if negative

### 6.2 Attendance Report (`pdf-export.ts: exportEmployeeAttendancePdf`)
- Summary metrics + day-by-day status table
- Non-working days and pre-joining days labelled clearly

### 6.3 Loan/Advance Detail (`exportLoanDetailPdf`)
- All loan fields + EMI schedule with paid/pending status per installment

### 6.4 Loans/Advances Summary (`exportLoansSummaryPdf`)
- All records with totals row

### 6.5 Loss Deductions (`exportLossDeductionsPdf`)
- All records with totals + pending amount

---

## 7. Excel Import / Export

### 7.1 Import
| File | Required columns | Skip condition |
|------|-----------------|---------------|
| Employees | First Name, Last Name | Either blank |
| Departments | Name | Blank |
| Holidays | Date, Name | Either blank |

- Mobile: always extracts last 10 digits, prepends `+91`
- 10-digit numbers starting with "91" correctly handled via `slice(-10)`
- Blank rows skipped via required-field check after `sheet_to_json({ defval: '' })`

### 7.2 Export
- Employees, Departments, Holidays, Attendance (by date), Ledger (per employee + period)

---

## 8. Filter Logic (gte / lte) — Fixed 2026-07-17

All 3 DB drivers (`local-db.ts`, `server/index.js`, `electron/main.cjs`) now apply:

```js
case 'gte': {
  const nv = Number(v), nf = Number(f.val);
  return (!isNaN(nv) && !isNaN(nf)) ? nv >= nf : String(v) >= String(f.val);
}
case 'lte': {
  const nv = Number(v), nf = Number(f.val);
  return (!isNaN(nv) && !isNaN(nf)) ? nv <= nf : String(v) <= String(f.val);
}
```

Numeric comparison used for salary, count, and amount filters. String comparison used for ISO date range filters.

---

## 9. Ledger (`payroll-ledger.tsx`)

Double-entry per employee:

| Event | DR | CR |
|-------|----|----|
| Loan / Advance disbursed | Principal | — |
| Net Salary paid (cash/bank) | Net | — |
| PF / Tax / EMI recovery via payroll | Amount | — |
| Gross Earnings (salary credit) | — | Gross |
| Direct cash EMI payment | — | Amount |

- Positive balance = DR (company owes employee, or employee received more than recovered)
- Negative balance = CR (employee owes company)
- **Opening Balance bug fixed (2026-07-17)**: cutoff date now uses ISO-format `YYYY-MM-DD` string so that month-level filtering correctly includes Jan/Feb entries in the opening balance when filtering to e.g. March.

---

## 10. Known Limitations (By Design)

| Item | Status |
|------|--------|
| Single-user, no concurrency | Accepted — desktop app, no concurrent access |
| Race condition in generate() multiple mutations | Acceptable — no partial-recovery UI, user can delete+regenerate |
| Loan status reset edge case (manual-paid before payroll) | Extremely unlikely; reverts to active, user can re-mark |
| Unmarked days treated as neither absent nor present | Intentional — payroll does not auto-penalize unmarked days |
| Payslip PDF no page-number footer | Intentional — payslips are always single-page |

---

## 11. Garuda Branding

- Colors: Primary maroon `oklch(0.36 0.155 25)` ≈ `#9B1C1C`; Gold `oklch(0.78 0.185 72)` ≈ `#F5A800`; Sidebar dark maroon `oklch(0.22 0.10 25)`
- Logo: `/public/logo.jpg` shown in sidebar + mobile header + all PDF headers
- App title: "Garuda Logistics — HRMS" (browser tab + Electron window)
- Electron product name: "Garuda HRMS" (exe name)
