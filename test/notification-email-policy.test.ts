import assert from "node:assert/strict";
import test from "node:test";
import { shouldEmailNotification } from "../src/lib/notification-email-policy.ts";

test("operational, compliance, and actionable manifest date notifications are emailed", () => {
  for (const kind of [
    "manifest_zero_income",
    "manifest_date_old",
    "manifest_date_missing",
    "insurance",
    "road_tax",
    "monthly_mis",
  ]) {
    assert.equal(shouldEmailNotification(kind), true, `${kind} should be emailed`);
  }
});

test("future manifest date warnings remain panel-only", () => {
  assert.equal(shouldEmailNotification("manifest_date_future"), false);
});

test("new non-date notification kinds email by default", () => {
  assert.equal(shouldEmailNotification("future_operational_alert"), true);
});
