import assert from "node:assert/strict";
import test from "node:test";
import { formatCompanyAddress } from "../src/lib/company-address.ts";

test("formats the complete company address in app-settings order", () => {
  assert.equal(
    formatCompanyAddress({
      address_line1: "Plot 10",
      address_line2: "Transport Nagar",
      city: "Raipur",
      state: "Chhattisgarh",
      country: "India",
    }),
    "Plot 10, Transport Nagar, Raipur, Chhattisgarh, India",
  );
});

test("omits empty company address segments without extra separators", () => {
  assert.equal(
    formatCompanyAddress({
      address_line1: "  Plot 10  ",
      address_line2: "",
      city: "Raipur",
      state: null,
      country: " India ",
    }),
    "Plot 10, Raipur, India",
  );
});
