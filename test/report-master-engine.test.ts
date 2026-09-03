import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateOperations,
  combinedFinancials,
  filterAuthorized,
  periodRange,
  uniqueTemplateCopyName,
  validateFormula,
} from "../src/lib/report-master/report-engine.ts";
import { dynamicFinancialVariables } from "../src/lib/report-master/system-variables.ts";

test("period modes use inclusive start and exclusive end boundaries", () => {
  assert.deepEqual(periodRange({ mode: "month", month: 2, year: 2024 }), {
    start: "2024-02-01",
    end: "2024-03-01",
    label: "February 2024",
  });
  assert.deepEqual(periodRange({ mode: "year", year: 2024 }), {
    start: "2024-01-01",
    end: "2025-01-01",
    label: "2024",
  });
  assert.deepEqual(periodRange({ mode: "financial_year", year: 2024 }), {
    start: "2024-04-01",
    end: "2025-04-01",
    label: "FY 2024-25",
  });
  assert.deepEqual(periodRange({ mode: "all" }), { start: null, end: null, label: "All Dates" });
  assert.equal(
    periodRange({ mode: "custom", startDate: "2024-05-02", endDate: "2024-05-04" }).end,
    "2024-05-05",
  );
});

test("operations totals separate settlement status and normalized names", () => {
  const result = aggregateOperations(
    [
      { amount: "100", income_name: "Approval Charge", is_received: true },
      { amount: 50, income_name: "approval-charge", is_received: false },
    ],
    [
      { amount: 30, expenditure_name: "Office Rent", is_paid: true },
      { amount: 20, expenditure_name: "office_rent", is_paid: false },
    ],
  );
  assert.equal(result.incomeTotal, 150);
  assert.equal(result.receivedTotal, 100);
  assert.equal(result.outstandingTotal, 50);
  assert.equal(result.expenditureTotal, 50);
  assert.equal(result.paidTotal, 30);
  assert.equal(result.unpaidTotal, 20);
  assert.equal(result.namedIncome.approval_charge, 150);
  assert.equal(result.namedExpenditure.office_rent, 50);
});

test("combined totals add trip and operations sources once", () => {
  const operations = aggregateOperations(
    [{ amount: 20, is_received: true }],
    [{ amount: 5, is_paid: true }],
  );
  assert.deepEqual(combinedFinancials(100, 40, operations, 2), {
    totalIncome: 120,
    totalExpense: 45,
    netIncome: 75,
    profitMargin: 62.5,
    incomePerTrip: 60,
    expensePerTrip: 22.5,
    netIncomePerTrip: 37.5,
  });
});

test("branch authorization excludes inaccessible and unassigned records", () =>
  assert.deepEqual(
    filterAuthorized(
      [
        { id: 1, branch_id: "a" },
        { id: 2, branch_id: "b" },
        { id: 3, branch_id: null },
      ],
      ["b"],
    ).map((x) => x.id),
    [2],
  ));

test("operations discovery is punctuation insensitive and retains a visible label", () => {
  const values = dynamicFinancialVariables(
    ["Approval Charge", "approval-charge"],
    ["Toll Charges"],
  );
  assert.equal(values.filter((x) => x.key === "operations.income.approval_charge").length, 1);
  assert.ok(
    values.some(
      (x) => x.key === "operations.expenditure.toll_charges" && x.label === "Toll Charges",
    ),
  );
});

test("formula validation rejects unknown and text arithmetic", () => {
  const variables = [
    { variable_key: "income", data_type: "currency" },
    { variable_key: "branch", data_type: "text" },
  ];
  assert.deepEqual(validateFormula("income - missing", variables), ["Unknown token: missing."]);
  assert.ok(validateFormula("branch + income", variables)[0].includes("Text variable"));
  assert.equal(validateFormula("ROUND(income / NULLIF(income, 0), 2)", variables).length, 0);
});

test("template copies always receive a unique editable name", () => {
  assert.equal(uniqueTemplateCopyName("Monthly P&L", ["Monthly P&L"]), "Monthly P&L Copy");
  assert.equal(
    uniqueTemplateCopyName("Monthly P&L", ["Monthly P&L Copy", "monthly p&l copy 2"]),
    "Monthly P&L Copy 3",
  );
});
