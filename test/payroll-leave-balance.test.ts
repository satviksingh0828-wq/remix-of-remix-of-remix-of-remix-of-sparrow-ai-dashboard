import assert from 'node:assert/strict';
import test from 'node:test';
import { computePayroll, monthPeriod } from '../src/lib/payroll-utils.ts';
import type { Employee, Payroll } from '../src/lib/types.ts';

const employee = {
  id: 'employee-1',
  joining_date: '2026-01-01',
  paid_holidays_per_month: 1,
  paid_leave_payout_rate: 999,
  basic_salary: 30_000,
  hra: 0,
  travel_allowance: 0,
  special_allowance: 0,
  other_allowance: 0,
  unpaid_leave_deduction_rate: 0,
  pay_per_extra_work_day: 0,
} as Employee;

const augustPayroll = {
  period_end: '2026-08-31',
  paid_leaves_left: 5,
  paid_leaves_used: 1,
} as Payroll;

test('carries a prior month paid-leave balance forward by exactly one monthly entitlement', () => {
  const september = monthPeriod(2026, 8);
  const result = computePayroll(employee, null, [], [], september.from, september.to, 'month', augustPayroll);

  assert.equal(result.paidLeavesUsedThisPeriod, 0);
  assert.equal(result.paidLeavesLeftAfter, 6);
});

test('uses the final-settlement leave rate entered for the payroll', () => {
  const september = monthPeriod(2026, 8);
  const result = computePayroll(
    employee, null, [], [], september.from, september.to, 'month', augustPayroll, true, 250,
  );

  assert.equal(result.paidLeavesLeftAfter, 6);
  assert.equal(result.paidLeavePayout, 1_500);
});
