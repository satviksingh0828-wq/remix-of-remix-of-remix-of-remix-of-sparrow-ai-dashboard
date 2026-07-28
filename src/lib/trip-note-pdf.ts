/**
 * Trip Note PDF generator.
 * Opens a new browser tab with print-ready HTML and triggers the print dialog.
 * No external library required — pure browser print.
 */

import { supabase } from "@/integrations/supabase/client";

export type TripNoteManifest = {
  manifest_number: string;
  quantity?: string | null;
  weight_kg?: string | null;
  from_location_name?: string | null;
  to_location_name?: string | null;
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
  vehicle?: { registration_number?: unknown; model?: unknown; manufacturer?: unknown } | null;
  driver?: { full_name?: unknown; license_number?: unknown } | null;
  transporter?: { transporter_name?: unknown; city?: unknown; pan_number?: unknown; gst_number?: unknown } | null;
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

/** Build the full-page print HTML for a Trip Note and open the print dialog. */
export function printTripNote(data: TripNoteData): void {
  const { company, trip, vehicle, driver, transporter, manifests } = data;

  const s = (v: unknown) => (v != null && String(v).trim() !== "" ? String(v) : "");

  // ── Address block ─────────────────────────────────────────────────────────
  const addrParts = [
    s(company.address_line1),
    s(company.address_line2),
    [s(company.city), s(company.state)].filter(Boolean).join(", "),
    s(company.pin_code),
  ].filter(Boolean);
  const addressHtml = addrParts.join(",&nbsp; ");

  // ── Trip summary ──────────────────────────────────────────────────────────
  const fromLoc = s(trip.from_location) || (manifests[0] ? s(manifests[0].from_location_name) : "");
  const toLoc =
    s(trip.to_location) || (manifests.length > 0 ? s(manifests[manifests.length - 1].to_location_name) : "");
  const ownership = trip.ownership === "own" ? "Own Vehicle" : trip.ownership === "third_party" ? "Third Party" : s(trip.ownership);

  // ── Manifest totals ───────────────────────────────────────────────────────
  const totalPkgs = manifests.reduce((n, m) => n + (parseFloat(s(m.quantity) || "0")), 0);
  const totalWeight = manifests.reduce((n, m) => n + (parseFloat(s(m.weight_kg) || "0")), 0);

  // ── Manifest rows ─────────────────────────────────────────────────────────
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

  // ── Logo URL (absolute so it works in a new tab) ──────────────────────────
  const logoUrl = `${window.location.origin}/garuda-logo.png`;

  // ── Derived details ───────────────────────────────────────────────────────
  const vehicleReg = s(vehicle?.registration_number);
  const vehicleDesc = [s(vehicle?.manufacturer), s(vehicle?.model)].filter(Boolean).join(" ");
  const driverName = s(driver?.full_name);
  const driverLic = s(driver?.license_number);
  const transporterName = s(transporter?.transporter_name);
  const transporterCity = s(transporter?.city);
  const transporterPan = s(transporter?.pan_number);
  const transporterGstin = s(transporter?.gst_number);
  const thirdPartyVehicle = s(data.third_party_vehicle_number);
  const isOwn = trip.ownership === "own";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Trip Note — ${trip.trip_code}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 14mm; }
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

    /* ── Two-column details ── */
    .details-wrap { display: flex; gap: 10px; margin-bottom: 8px; }
    .details-col { flex: 1; border: 1px solid #ccc; border-radius: 3px; padding: 7px 9px; }
    .details-col h4 { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #666; font-weight: 700; margin-bottom: 5px; border-bottom: 0.7px solid #ddd; padding-bottom: 3px; }
    .detail-row { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 3px; }
    .detail-label { font-size: 9.5px; color: #555; flex-shrink: 0; }
    .detail-value { font-size: 10px; font-weight: 600; text-align: right; }
    .detail-row.empty .detail-value { color: #bbb; }

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
    .tl { text-align: left; }

    /* ── Footer ── */
    .footer { display: flex; justify-content: space-between; margin-top: 18px; font-size: 10px; }
    .footer-box { text-align: center; }
    .footer-sig { margin-top: 24px; border-top: 1px solid #000; padding-top: 3px; font-size: 9.5px; }

    /* ── Page footer ── */
    .page-footer { margin-top: 20px; text-align: center; font-size: 8.5px; color: #888; letter-spacing: 0.04em; border-top: 0.5px solid #ccc; padding-top: 5px; }

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

  <!-- Summary bar: PAN | GSTIN | Trip No. | From | To -->
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

  <!-- Details columns -->
  <div class="details-wrap">

    <!-- Left: vehicle / driver / transporter -->
    <div class="details-col">
      ${isOwn ? `<h4>Vehicle &amp; Driver Details</h4>
      ${vehicleReg
        ? `<div class="detail-row"><span class="detail-label">Vehicle Reg.</span><span class="detail-value">${vehicleReg}</span></div>${vehicleDesc ? `<div class="detail-row"><span class="detail-label">Make / Model</span><span class="detail-value">${vehicleDesc}</span></div>` : ""}`
        : `<div class="detail-row empty"><span class="detail-label">Vehicle</span><span class="detail-value">—</span></div>`}
      ${driverName
        ? `<div class="detail-row"><span class="detail-label">Driver</span><span class="detail-value">${driverName}</span></div>${driverLic ? `<div class="detail-row"><span class="detail-label">Licence No.</span><span class="detail-value">${driverLic}</span></div>` : ""}`
        : ""}
      ${!vehicleReg && !driverName ? `<div class="detail-row empty"><span class="detail-label" style="color:#bbb">No vehicle / driver details recorded</span></div>` : ""}`
      : `<h4>Third-Party Transporter Details</h4>
      ${transporterName
        ? `<div class="detail-row"><span class="detail-label">Transporter</span><span class="detail-value">${transporterName}</span></div>`
        : `<div class="detail-row empty"><span class="detail-label">Transporter</span><span class="detail-value">—</span></div>`}
      ${transporterPan ? `<div class="detail-row"><span class="detail-label">PAN No.</span><span class="detail-value">${transporterPan}</span></div>` : ""}
      ${transporterGstin ? `<div class="detail-row"><span class="detail-label">GSTIN</span><span class="detail-value">${transporterGstin}</span></div>` : ""}
      ${thirdPartyVehicle ? `<div class="detail-row"><span class="detail-label">Vehicle No.</span><span class="detail-value">${thirdPartyVehicle}</span></div>` : ""}
      ${!transporterName && !thirdPartyVehicle ? `<div class="detail-row empty"><span class="detail-label" style="color:#bbb">No transporter details recorded</span></div>` : ""}`}
    </div>

    <!-- Right: trip details -->
    <div class="details-col">
      <h4>Trip Details</h4>
      <div class="detail-row"><span class="detail-label">Trip Number</span><span class="detail-value">${trip.trip_code}</span></div>
      <div class="detail-row"><span class="detail-label">Ownership</span><span class="detail-value">${ownership || "—"}</span></div>
      <div class="detail-row"><span class="detail-label">Start Date</span><span class="detail-value">${s(trip.start_date) || "—"}${trip.start_time ? " " + s(trip.start_time) : ""}</span></div>
      <div class="detail-row"><span class="detail-label">End Date</span><span class="detail-value">${s(trip.end_date) || "—"}</span></div>
      <div class="detail-row"><span class="detail-label">Total Manifests</span><span class="detail-value">${manifests.length}</span></div>
      <div class="detail-row"><span class="detail-label">Total Weight</span><span class="detail-value">${totalWeight > 0 ? totalWeight.toFixed(3) + " kg" : "—"}</span></div>
      <div class="detail-row"><span class="detail-label">Total Packages</span><span class="detail-value">${totalPkgs > 0 ? totalPkgs : "—"}</span></div>
    </div>

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

  <!-- Footer signatures -->
  <div class="footer">
    <div class="footer-box">
      <div class="footer-sig">Prepared By</div>
    </div>
    <div class="footer-box">
      <div class="footer-sig">Authorised Signatory</div>
    </div>
  </div>

  <!-- Page footer -->
  <div class="page-footer">POWERED BY SPARROW AI SOLUTIONS</div>

</body>
</html>`;

  const w = window.open("", "_blank", "width=1100,height=750");
  if (!w) {
    alert("Pop-up blocked. Please allow pop-ups for this site to print the Trip Note.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  // Small delay to let images load before triggering print
  w.addEventListener("load", () => {
    setTimeout(() => {
      w.focus();
      w.print();
    }, 400);
  });
}
