import assert from "node:assert/strict";
import test from "node:test";

import { adminAlertEmails, resolveEmailRecipients } from "../src/lib/email.ts";

test("moves the first configured administrator to BCC for every email", () => {
  const oldFirst = process.env.ADMIN_ALERT_EMAIL;
  const oldSecond = process.env.ADMIN_2_ALERT_EMAIL;
  process.env.ADMIN_ALERT_EMAIL = "admin.one@example.com";
  process.env.ADMIN_2_ALERT_EMAIL = "admin.two@example.com";

  try {
    assert.deepEqual(adminAlertEmails(), ["admin.two@example.com"]);
    assert.deepEqual(
      resolveEmailRecipients({
        to: ["branch@example.com", "admin.one@example.com"],
        cc: ["admin.one@example.com", "admin.two@example.com"],
      }),
      {
        to: ["branch@example.com"],
        cc: ["admin.two@example.com"],
        bcc: ["satvik.singh.0828@gmail.com", "admin.one@example.com"],
      },
    );
  } finally {
    if (oldFirst === undefined) delete process.env.ADMIN_ALERT_EMAIL;
    else process.env.ADMIN_ALERT_EMAIL = oldFirst;
    if (oldSecond === undefined) delete process.env.ADMIN_2_ALERT_EMAIL;
    else process.env.ADMIN_2_ALERT_EMAIL = oldSecond;
  }
});
