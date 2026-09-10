import assert from "node:assert/strict";
import test from "node:test";

import { adminAlertEmails, resolveEmailRecipients } from "../src/lib/email.ts";

test("uses Satvik Singh as the only BCC recipient for every email", () => {
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
        cc: ["admin.two@example.com", "priyanshi@garudalogistics.in"],
        bcc: ["satvik.singh.0828@gmail.com"],
      },
    );
  } finally {
    if (oldFirst === undefined) delete process.env.ADMIN_ALERT_EMAIL;
    else process.env.ADMIN_ALERT_EMAIL = oldFirst;
    if (oldSecond === undefined) delete process.env.ADMIN_2_ALERT_EMAIL;
    else process.env.ADMIN_2_ALERT_EMAIL = oldSecond;
  }
});

test("adds the common Priyanshi CC to every email", () => {
  const oldFirst = process.env.ADMIN_ALERT_EMAIL;
  delete process.env.ADMIN_ALERT_EMAIL;
  try {
    assert.deepEqual(resolveEmailRecipients({ to: ["employee@example.com"] }), {
      to: ["employee@example.com"],
      cc: ["priyanshi@garudalogistics.in"],
      bcc: ["satvik.singh.0828@gmail.com"],
    });
  } finally {
    if (oldFirst === undefined) delete process.env.ADMIN_ALERT_EMAIL;
    else process.env.ADMIN_ALERT_EMAIL = oldFirst;
  }
});
