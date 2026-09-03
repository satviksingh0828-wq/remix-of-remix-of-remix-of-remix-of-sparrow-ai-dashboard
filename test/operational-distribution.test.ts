import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBranchOperationalPools,
  distributionShare,
} from "../src/lib/operational-distribution.ts";

test("builds a strict branch-wise operational income less expense pool", () => {
  const pools = buildBranchOperationalPools(
    ["north", "south"],
    [
      { branch_id: "north", amount: 1_000 },
      { branch_id: "south", amount: 400 },
      { branch_id: null, amount: 9_999 },
    ],
    [
      { branch_id: "north", amount: 250 },
      { branch_id: "south", amount: 600 },
      { branch_id: "unknown", amount: 9_999 },
    ],
  );

  assert.deepEqual(pools.get("north"), { income: 1_000, expense: 250, net: 750 });
  assert.deepEqual(pools.get("south"), { income: 400, expense: 600, net: -200 });
});

test("distributes by weight or quantity and falls back equally for a zero total", () => {
  assert.equal(distributionShare(20, 100, 2), 0.2);
  assert.equal(distributionShare(0, 0, 4), 0.25);
  assert.equal(distributionShare(0, 0, 0), 0);
});
