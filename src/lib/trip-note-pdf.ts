/**
 * Trip Note generator.
 * Builds an HTML page, wraps it in a Blob, and opens it in a real new
 * browser tab (URL.createObjectURL) — no popup window, no print dialog.
 */

import { supabase } from "@/integrations/supabase/client";

export type TripNoteManifest = {
  manifest_number: string;
  quantity?: string | null;
  weight_kg?: string | null;
  from_location_name?: string | null;
  to_location_name?: string | null;
};

export type TripNoteVehicle = {
  registration_number?: unknown;
  internal_code?: unknown;
  nickname?: unknown;
  manufacturer?: unknown;
  model?: unknown;
  year_of_manufacture?: unknown;
  fuel_type?: unknown;
  payload_capacity_kg?: unknown;
  purchase_date?: unknown;
  purchase_cost?: unknown;
};

export type TripNoteDriver = {
  driver_code?: unknown;
  full_name?: unknown;
  guardian_name?: unknown;
  date_of_birth?: unknown;
  gender?: unknown;
  blood_group?: unknown;
  mobile_number?: unknown;
  alternate_mobile?: unknown;
  licence_number?: unknown;
  licence_type?: unknown;
  licence_authority?: unknown;
  licence_issue_date?: unknown;
  licence_expiry_date?: unknown;
};

export type TripNoteData = {
  company: {
    company_name: string;
    address_line1?: string | null;
    address_line2?: string | null;
    city?: string | null;
    state?: string | null;
    pin_code?: string | null;
    gstin?: string | null;
    pan?: string | null;
  };
  trip: {
    trip_code: string;
    start_date?: string | null;
    end_date?: string | null;
    start_time?: string | null;
    ownership?: string | null;
    from_location?: string | null;
    to_location?: string | null;
  };
  vehicle?: TripNoteVehicle | null;
  driver?: TripNoteDriver | null;
  transporter?: {
    transporter_name?: unknown;
    city?: unknown;
    pan_number?: unknown;
    gst_number?: unknown;
  } | null;
  third_party_vehicle_number?: string | null;
  manifests: TripNoteManifest[];
};

/** Fetch all locations (id → location_name map). */
export async function fetchLocationMap(): Promise<Map<string, string>> {
  try {
    const { data } = await supabase
      .from("locations")
      .select("id,location_name,pin_code");
    const map = new Map<string, string>();
    for (const l of data ?? []) {
      map.set(l.id as string, (l.location_name || l.pin_code || "") as string);
    }
    return map;
  } catch {
    return new Map();
  }
}

/** Fetch the company row from Supabase (first row). */
export async function fetchCompany(): Promise<TripNoteData["company"] | null> {
  try {
    const { data } = await supabase
      .from("company")
      .select(
        "company_name,address_line1,address_line2,city,state,pin_code,gstin,pan",
      )
      .limit(1)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

/** Helper — coerce unknown to a display string. */
function s(v: unknown): string {
  return v != null && String(v).trim() !== "" ? String(v) : "";
}

/** Render one detail row — always shown; value falls back to "—". */
function dr(label: string, value: string): string {
  const val = value.trim() !== "" ? value : "—";
  return `<div class="detail-row"><span class="detail-label">${label}</span><span class="detail-value">${val}</span></div>`;
}

/** Build the full-page HTML for a Trip Note and open it in a real new browser tab. */
export function printTripNote(data: TripNoteData): void {
  const { company, trip, vehicle, driver, transporter, manifests } = data;

  // ── Address block ────────────────────────────────────────────────────────
  const addrParts = [
    s(company.address_line1),
    s(company.address_line2),
    [s(company.city), s(company.state)].filter(Boolean).join(", "),
    s(company.pin_code),
  ].filter(Boolean);
  const addressHtml = addrParts.join(",&nbsp; ");

  // ── Trip summary ─────────────────────────────────────────────────────────
  const fromLoc = s(trip.from_location) || (manifests[0] ? s(manifests[0].from_location_name) : "");
  const toLoc =
    s(trip.to_location) ||
    (manifests.length > 0 ? s(manifests[manifests.length - 1].to_location_name) : "");
  const ownership =
    trip.ownership === "own"
      ? "Own Vehicle"
      : trip.ownership === "third_party"
        ? "Third Party"
        : s(trip.ownership);

  // ── Manifest totals ──────────────────────────────────────────────────────
  const totalPkgs = manifests.reduce((n, m) => n + parseFloat(s(m.quantity) || "0"), 0);
  const totalWeight = manifests.reduce((n, m) => n + parseFloat(s(m.weight_kg) || "0"), 0);

  // ── Manifest rows ────────────────────────────────────────────────────────
  const manifestRows = manifests
    .map(
      (m, i) => `
      <tr>
        <td class="tc">${i + 1}</td>
        <td>${s(m.manifest_number) || "—"}</td>
        <td class="tc">${s(m.from_location_name) || "—"}</td>
        <td class="tc">${s(m.to_location_name) || "—"}</td>
        <td class="tr">${s(m.weight_kg) || "—"}</td>
        <td class="tc">${s(m.quantity) || "—"}</td>
      </tr>`,
    )
    .join("");

  // ── Logo URL (absolute so it works in a blob tab) ─────────────────────
  const logoUrl = `${window.location.origin}/garuda-logo.png`;

  // ── Own-vehicle: vehicle section ─────────────────────────────────────────
  const vehicleBlock = `
    <div class="details-col">
      <h4>Vehicle Details</h4>
      ${dr("Manufacturer", s(vehicle?.manufacturer))}
      ${dr("Model", s(vehicle?.model))}
      ${dr("Fuel Type", s(vehicle?.fuel_type))}
      ${dr("Payload Capacity", s(vehicle?.payload_capacity_kg) ? s(vehicle?.payload_capacity_kg) + " kg" : "")}
    </div>`;

  // ── Own-vehicle: driver section ───────────────────────────────────────────
  const driverBlock = `
    <div class="details-col">
      <h4>Driver Details</h4>
      ${dr("Full Name", s(driver?.full_name))}
      ${dr("Father's / Guardian's Name", s(driver?.guardian_name))}
      ${dr("Date of Birth", s(driver?.date_of_birth))}
      ${dr("Gender", s(driver?.gender))}
      ${dr("Blood Group", s(driver?.blood_group))}
      ${dr("Mobile Number", s(driver?.mobile_number))}
      ${dr("Alternate Mobile", s(driver?.alternate_mobile))}
      ${dr("Licence Number", s(driver?.licence_number))}
      ${dr("Issuing Authority (RTO)", s(driver?.licence_authority))}
      ${dr("Licence Issue Date", s(driver?.licence_issue_date))}
      ${dr("Licence Expiry Date", s(driver?.licence_expiry_date))}
    </div>`;

  // ── Third-party transporter section ──────────────────────────────────────
  const isOwn = trip.ownership === "own";
  const transporterBlock = `
    <div class="details-col">
      <h4>Third-Party Transporter Details</h4>
      ${dr("Transporter Name", s(transporter?.transporter_name))}
      ${dr("PAN No.", s(transporter?.pan_number))}
      ${dr("GSTIN", s(transporter?.gst_number))}
      ${dr("Vehicle No.", s(data.third_party_vehicle_number))}
    </div>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Trip Note — ${trip.trip_code}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 14mm 18mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5px; color: #000; background: #fff; }

    /* ── Title ── */
    .doc-title {
      text-align: center;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      margin-bottom: 10px;
    }

    /* ── Company header ── */
    .company-header {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 8px;
    }
    .company-logo {
      width: 90px;
      height: auto;
      object-fit: contain;
      background: #fff;
      border-radius: 8px;
      padding: 3px;
      flex-shrink: 0;
    }
    .company-info { flex: 1; text-align: center; }
    .company-name {
      font-size: 15px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 3px;
    }
    .company-addr { font-size: 10px; color: #333; margin-bottom: 2px; }
    .company-reg  { font-size: 9.5px; color: #555; margin-top: 2px; }

    hr { border: none; border-top: 1.5px solid #000; margin: 7px 0; }
    hr.thin { border-top-width: 0.7px; border-color: #888; margin: 5px 0; }

    /* ── Summary bar ── */
    .summary-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
    .summary-table th { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #555; font-weight: 600; padding: 2px 6px; border: 1px solid #bbb; background: #f5f5f5; }
    .summary-table td { font-size: 10.5px; font-weight: 700; padding: 3px 6px; border: 1px solid #bbb; }

    /* ── Details columns ── */
    .details-wrap { display: flex; gap: 10px; margin-bottom: 8px; }
    .details-col { flex: 1; border: 1px solid #ccc; border-radius: 3px; padding: 7px 9px; }
    .details-col h4 { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #666; font-weight: 700; margin-bottom: 5px; border-bottom: 0.7px solid #ddd; padding-bottom: 3px; }
    .detail-row { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 3px; }
    .detail-label { font-size: 9.5px; color: #555; flex-shrink: 0; }
    .detail-value { font-size: 10px; font-weight: 600; text-align: right; }

    /* ── Trip details box ── */
    .trip-details-col { border: 1px solid #ccc; border-radius: 3px; padding: 7px 9px; margin-bottom: 8px; }
    .trip-details-col h4 { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #666; font-weight: 700; margin-bottom: 5px; border-bottom: 0.7px solid #ddd; padding-bottom: 3px; }

    /* ── Manifest table ── */
    .manifest-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    .manifest-table thead tr { background: #1a1a1a; color: #fff; }
    .manifest-table th {
      padding: 5px 7px;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      font-weight: 700;
      border: 1px solid #333;
    }
    .manifest-table td {
      padding: 4px 7px;
      border: 1px solid #ccc;
      font-size: 10px;
      vertical-align: middle;
    }
    .manifest-table tbody tr:nth-child(even) { background: #fafafa; }
    .manifest-table tfoot tr { background: #f0f0f0; font-weight: 700; }
    .manifest-table tfoot td { border: 1px solid #bbb; padding: 4px 7px; }
    .tc { text-align: center; }
    .tr { text-align: right; }

    /* ── Signature footer ── */
    .sig-footer { display: flex; justify-content: space-between; margin-top: 18px; font-size: 10px; }
    .sig-box { text-align: center; }
    .sig-line { margin-top: 24px; border-top: 1px solid #000; padding-top: 3px; font-size: 9.5px; }

    /* ── Powered-by footer ── */
    .page-footer {
      margin-top: 18px;
      text-align: center;
      font-size: 8.5px;
      color: #999;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      border-top: 0.5px solid #ddd;
      padding-top: 5px;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page-footer { position: fixed; bottom: 6mm; left: 0; right: 0; text-align: center; }
    }
  </style>
</head>
<body>
  <div class="doc-title">Trip Note</div>

  <!-- Company header: logo left, info centre -->
  <div class="company-header">
    <img src="${logoUrl}" class="company-logo" alt="Logo" />
    <div class="company-info">
      <div class="company-name">${company.company_name}</div>
      <div class="company-addr">${addressHtml}</div>
      ${
        company.gstin || company.pan
          ? `<div class="company-reg">${[company.gstin ? `GSTIN: ${company.gstin}` : "", company.pan ? `PAN: ${company.pan}` : ""].filter(Boolean).join(" &nbsp;|&nbsp; ")}</div>`
          : ""
      }
    </div>
  </div>

  <hr />

  <!-- Summary bar -->
  <table class="summary-table">
    <thead>
      <tr>
        <th>PAN No.</th>
        <th>GSTIN</th>
        <th>Trip Number</th>
        <th>Start Date</th>
        <th>From</th>
        <th>To</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${s(company.pan) || "—"}</td>
        <td>${s(company.gstin) || "—"}</td>
        <td>${trip.trip_code}</td>
        <td>${s(trip.start_date) || "—"}</td>
        <td>${fromLoc || "—"}</td>
        <td>${toLoc || "—"}</td>
      </tr>
    </tbody>
  </table>

  <!-- Trip details row -->
  <div class="trip-details-col">
    <h4>Trip Details</h4>
    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      ${dr("Trip Number", trip.trip_code)}
      ${dr("Ownership", ownership)}
      ${dr("Start Date", s(trip.start_date) + (trip.start_time ? " " + s(trip.start_time) : ""))}
      ${dr("End Date", s(trip.end_date))}
      ${dr("Total Manifests", String(manifests.length))}
      ${dr("Total Weight", totalWeight > 0 ? totalWeight.toFixed(3) + " kg" : "")}
      ${dr("Total Packages", totalPkgs > 0 ? String(totalPkgs) : "")}
    </div>
  </div>

  <!-- Vehicle / Driver or Transporter columns -->
  <div class="details-wrap">
    ${isOwn ? vehicleBlock + driverBlock : transporterBlock}
  </div>

  <!-- Manifest table -->
  <table class="manifest-table">
    <thead>
      <tr>
        <th class="tc" style="width:40px">S.No.</th>
        <th>LR Number</th>
        <th class="tc">From</th>
        <th class="tc">To</th>
        <th class="tr" style="width:80px">Weight (kg)</th>
        <th class="tc" style="width:60px">Pkgs</th>
      </tr>
    </thead>
    <tbody>
      ${manifests.length > 0 ? manifestRows : `<tr><td colspan="6" class="tc" style="padding:10px;color:#999">No manifests recorded for this trip.</td></tr>`}
    </tbody>
    ${
      manifests.length > 0
        ? `<tfoot>
        <tr>
          <td colspan="2" class="tr">Totals</td>
          <td colspan="2"></td>
          <td class="tr">${totalWeight > 0 ? totalWeight.toFixed(3) : "—"}</td>
          <td class="tc">${totalPkgs || "—"}</td>
        </tr>
      </tfoot>`
        : ""
    }
  </table>

  <!-- Signature footer -->
  <div class="sig-footer">
    <div class="sig-box"><div class="sig-line">Prepared By</div></div>
    <div class="sig-box"><div class="sig-line">Authorised Signatory</div></div>
  </div>

  <!-- Powered-by footer -->
  <div class="page-footer">Powered by Sparrow AI Solutions</div>

</body>
</html>`;

  // Open in a real new browser tab via Blob URL — not a popup, no print dialog
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const tab = window.open(url, "_blank");
  if (!tab) {
    alert("Pop-up blocked. Please allow pop-ups for this site to open the Trip Note.");
  }
  // Revoke the object URL after a short delay so the tab can fully load it
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
