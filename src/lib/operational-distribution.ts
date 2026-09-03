export type OperationalAmount = {
  branch_id: string | null;
  amount: number;
};

export type BranchOperationalPool = {
  income: number;
  expense: number;
  net: number;
};

/**
 * Build the monthly operational pool for each branch.
 *
 * A branch may only receive income and expense rows explicitly assigned to it.
 * Unassigned rows and contract fixed income are intentionally excluded: neither
 * can be attributed to a branch for trip distribution.
 */
export function buildBranchOperationalPools(
  branchIds: string[],
  incomeRows: OperationalAmount[],
  expenseRows: OperationalAmount[],
): Map<string, BranchOperationalPool> {
  const pools = new Map<string, BranchOperationalPool>();
  for (const branchId of branchIds) {
    pools.set(branchId, { income: 0, expense: 0, net: 0 });
  }

  for (const row of incomeRows) {
    if (row.branch_id && pools.has(row.branch_id)) {
      pools.get(row.branch_id)!.income += row.amount;
    }
  }
  for (const row of expenseRows) {
    if (row.branch_id && pools.has(row.branch_id)) {
      pools.get(row.branch_id)!.expense += row.amount;
    }
  }
  for (const pool of pools.values()) pool.net = pool.income - pool.expense;
  return pools;
}

/** Return this trip/manifest's share of its branch total. */
export function distributionShare(base: number, branchTotal: number, rowCount: number): number {
  if (branchTotal > 0) return Math.max(base, 0) / branchTotal;
  return rowCount > 0 ? 1 / rowCount : 0;
}
