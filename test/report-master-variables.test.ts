import assert from "node:assert/strict";
import test from "node:test";
import { SYSTEM_VARIABLES, dynamicFinancialVariables } from "../src/lib/report-master/system-variables.ts";

test("catalog separates open and closed trip variables", () => {
  const open = SYSTEM_VARIABLES.find((item) => item.key === "open.trip_code");
  const closed = SYSTEM_VARIABLES.find((item) => item.key === "closed.trip_code");
  assert.ok(open?.scopes.includes("open_trip"));
  assert.ok(!open?.scopes.includes("closed_trip"));
  assert.ok(closed?.scopes.includes("closed_trip"));
  assert.ok(!closed?.scopes.includes("open_trip"));
});

test("catalog includes monthly and yearly operational totals", () => {
  for (const key of ["summary.total_trip_count", "summary.total_weight_kg", "summary.total_freight", "summary.total_loading", "summary.total_income", "summary.total_expense", "summary.net_income"]) {
    const variable = SYSTEM_VARIABLES.find((item) => item.key === key);
    assert.ok(variable, `${key} must exist`);
    assert.ok(variable.scopes.includes("monthly"), `${key} must support monthly reports`);
    assert.ok(variable.scopes.includes("yearly"), `${key} must support yearly reports`);
  }
});

test("discovered financial names create open, closed and all-trip variables", () => {
  const variables = dynamicFinancialVariables(["Approval Charge"], ["Toll Charges"]);
  const keys = new Set(variables.map((item) => item.key));
  for (const key of ["open.income.approval_charge", "closed.income.approval_charge", "trip.income.approval_charge", "open.expense.toll_charges", "closed.expense.toll_charges", "trip.expense.toll_charges"]) assert.ok(keys.has(key), `${key} must exist`);
});
