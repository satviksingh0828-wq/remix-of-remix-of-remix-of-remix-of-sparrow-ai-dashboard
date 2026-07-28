---
name: PnL architecture
description: How the Dashboard and Reports P&L data flow is structured.
---

# P&L Architecture

## Data flow
- `src/lib/pnl.ts` — all server functions and pure computation helpers live here.
- `serverFetchPnLYear({ year })` — fetches full-year data (closed_trips, incomes, expenditures, contracts, branches).
- `serverFetchPnLPeriod({ period })` — fetches any period (year or year+month); scales fixed charges to the period length.
- `computePnL(data, branchId)` — pure client helper; branchId=null means all branches.
- `computeMonthlyPnL(data, branchId)` — produces 12-month array for bar charts.

## Fixed income allocation
- Per-branch view: total fixed charges / branch count (Math.max(branches.length, 1)).
- All-branches view: full fixed charges (no division).

## Chart library
- recharts imported directly (`^2.15.4` already in package.json).
- NOT using shadcn chart.tsx wrapper — import from "recharts" directly.

## Date filtering
- closed_trips: uses `closed_at` (timestamptz) — filter with `.gte/.lt` on ISO strings.
- incomes/expenditures: uses `entry_date` (text, YYYY-MM-DD) — filter with `.gte/.lt` on date strings.

**Why:** Server fns keep DB queries out of client bundles; pure helpers are testable; recharts direct avoids shadcn wrapper complexity.
