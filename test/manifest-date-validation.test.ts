import assert from "node:assert/strict";
import test from "node:test";
import { invalidManifestDates } from "../src/lib/manifest-date-validation.ts";

test("allows manifest dates up to two days before trip start", () => {
  const manifests = ["2026-08-13", "2026-08-12", "2026-08-11"].map((manifest_date) => ({
    manifest_date,
  }));
  assert.deepEqual(invalidManifestDates("2026-08-13", manifests), []);
});

test("rejects missing and more than two-day-old manifest dates", () => {
  const manifests = [
    { manifest_number: "OLD", manifest_date: "2026-08-10" },
    { manifest_number: "MISSING", manifest_date: null },
    { manifest_number: "OK", manifest_date: "2026-08-11" },
  ];
  assert.deepEqual(
    invalidManifestDates("2026-08-13", manifests).map((item) => item.manifest_number),
    ["OLD", "MISSING"],
  );
});
