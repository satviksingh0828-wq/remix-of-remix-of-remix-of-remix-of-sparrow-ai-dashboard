import assert from "node:assert/strict";
import test from "node:test";
import { shouldEmailNotification } from "../src/lib/notification-email-policy.ts";

test("operational and compliance notifications are emailed", () => {
  for (const kind of ["manifest_zero_income", "insurance", "road_tax", "monthly_mis"]) {
    assert.equal(shouldEmailNotification(kind), true, `${kind} should be emailed`);
  }
});

test("manifest date warnings remain panel-only", () => {
  for (const kind of ["manifest_date_future", "manifest_date_old", "manifest_date_missing"]) {
    assert.equal(shouldEmailNotification(kind), false, `${kind} should not be emailed`);
  }
});

test("new non-date notification kinds email by default", () => {
  assert.equal(shouldEmailNotification("future_operational_alert"), true);
});
