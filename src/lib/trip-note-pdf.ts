/**
 * Trip Note PDF generator.
 * Renders the layout into an off-screen container, captures it with
 * html2canvas, converts to a real jsPDF document, and opens the resulting
 * application/pdf blob in a new browser tab (shows the native PDF viewer).
 */

import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────────

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

// ── Supabase helpers ───────────────────────────────────────────────────────────

export async function fetchLocationMap(): Promise<Map<string, string>> {
  try {
    const { data } = await supabase.from("locations").select("id,location_name,pin_code");
    const map = new Map<string, string>();
    for (const l of data ?? []) {
      map.set(l.id as string, (l.location_name || l.pin_code || "") as string);
    }
    return map;
  } catch {
    return new Map();
  }
}

export async function fetchCompany(): Promise<TripNoteData["company"] | null> {
  try {
    const { data } = await supabase
      .from("company")
      .select("company_name,address_line1,address_line2,city,state,pin_code,gstin,pan")
      .limit(1)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function sv(v: unknown): string {
  return v != null && String(v).trim() !== "" ? String(v) : "";
}

function dr(label: string, value: string): string {
  const val = value.trim() !== "" ? value : "—";
  return `<div class="tn-detail-row"><span class="tn-detail-label">${label}</span><span class="tn-detail-value">${val}</span></div>`;
}

/** Load a URL and return it as a base64 data-URI (avoids html2canvas CORS errors). */
async function toDataUri(url: string): Promise<string> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return url;
    const blob = await resp.blob();
    return new Promise<string>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

// ── CSS ───────────────────────────────────────────────────────────────────────

const TRIP_NOTE_CSS = `
.tn-root {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 10.5px;
  color: #000;
  background: #fff;
  width: 770px;
  padding: 24px 32px 24px;
  box-sizing: border-box;
}
.tn-root * { box-sizing: border-box; margin: 0; padding: 0; }

/* Title */
.tn-title {
  text-align: center;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  margin-bottom: 10px;
}

/* Company header */
.tn-company-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 8px;
}
.tn-logo {
  width: 80px;
  height: auto;
  object-fit: contain;
  flex-shrink: 0;
  background: #fff;
  border-radius: 6px;
  padding: 2px;
}
.tn-company-info { flex: 1; text-align: center; }
.tn-company-name {
  font-size: 15px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 3px;
}
.tn-company-addr { font-size: 10px; color: #333; margin-bottom: 2px; }
.tn-company-reg  { font-size: 9.5px; color: #555; margin-top: 2px; }

/* Dividers */
.tn-hr { border: none; border-top: 1.5px solid #000; margin: 7px 0; }

/* Summary bar */
.tn-summary-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
.tn-summary-table th {
  font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em;
  color: #555; font-weight: 600; padding: 2px 6px;
  border: 1px solid #bbb; background: #f5f5f5;
}
.tn-summary-table td { font-size: 10.5px; font-weight: 700; padding: 3px 6px; border: 1px solid #bbb; }

/* Trip details box */
.tn-trip-box {
  border: 1px solid #ccc; border-radius: 3px;
  padding: 7px 9px; margin-bottom: 8px;
}
.tn-trip-box h4 {
  font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em;
  color: #666; font-weight: 700; margin-bottom: 5px;
  border-bottom: 0.7px solid #ddd; padding-bottom: 3px;
}
.tn-trip-box-grid { display: flex; gap: 10px; flex-wrap: wrap; }

/* Details columns */
.tn-details-wrap { display: flex; gap: 10px; margin-bottom: 8px; }
.tn-details-col {
  flex: 1; border: 1px solid #ccc; border-radius: 3px; padding: 7px 9px;
}
.tn-details-col h4 {
  font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em;
  color: #666; font-weight: 700; margin-bottom: 5px;
  border-bottom: 0.7px solid #ddd; padding-bottom: 3px;
}
.tn-detail-row {
  display: flex; justify-content: space-between; gap: 8px; margin-bottom: 3px;
}
.tn-detail-label { font-size: 9.5px; color: #555; flex-shrink: 0; }
.tn-detail-value { font-size: 10px; font-weight: 600; text-align: right; }

/* Manifest table */
.tn-manifest-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
.tn-manifest-table thead tr { background: #1a1a1a; color: #fff; }
.tn-manifest-table th {
  padding: 5px 7px; font-size: 9px; text-transform: uppercase;
  letter-spacing: 0.07em; font-weight: 700; border: 1px solid #333;
}
.tn-manifest-table td {
  padding: 4px 7px; border: 1px solid #ccc; font-size: 10px; vertical-align: middle;
}
.tn-manifest-table tbody tr:nth-child(even) { background: #fafafa; }
.tn-manifest-table tfoot tr { background: #f0f0f0; font-weight: 700; }
.tn-manifest-table tfoot td { border: 1px solid #bbb; padding: 4px 7px; }
.tn-tc { text-align: center; }
.tn-tr { text-align: right; }

/* Signature footer */
.tn-sig-footer {
  display: flex; justify-content: space-between; margin-top: 22px; font-size: 10px;
}
.tn-sig-box { text-align: center; }
.tn-sig-line { margin-top: 28px; border-top: 1px solid #000; padding-top: 3px; font-size: 9.5px; }

/* Powered-by footer */
.tn-page-footer {
  margin-top: 20px;
  text-align: center;
  font-size: 8.5px;
  color: #aaa;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-top: 0.5px solid #ddd;
  padding-top: 6px;
}
`;

// ── HTML builder ──────────────────────────────────────────────────────────────

function buildBodyHtml(data: TripNoteData, logoDataUri: string): string {
  const { company, trip, vehicle, driver, transporter, manifests } = data;

  // Address
  const addrParts = [
    sv(company.address_line1),
    sv(company.address_line2),
    [sv(company.city), sv(company.state)].filter(Boolean).join(", "),
    sv(company.pin_code),
  ].filter(Boolean);
  const addressHtml = addrParts.join(",&nbsp; ");

  // From / To
  const fromLoc = sv(trip.from_location) || (manifests[0] ? sv(manifests[0].from_location_name) : "");
  const toLoc =
    sv(trip.to_location) ||
    (manifests.length > 0 ? sv(manifests[manifests.length - 1].to_location_name) : "");
  const ownership =
    trip.ownership === "own"
      ? "Own Vehicle"
      : trip.ownership === "third_party"
        ? "Third Party"
        : sv(trip.ownership);

  // Manifest totals
  const totalPkgs   = manifests.reduce((n, m) => n + parseFloat(sv(m.quantity)   || "0"), 0);
  const totalWeight = manifests.reduce((n, m) => n + parseFloat(sv(m.weight_kg) || "0"), 0);

  // Manifest rows
  const manifestRowsHtml = manifests
    .map(
      (m, i) => `
      <tr>
        <td class="tn-tc">${i + 1}</td>
        <td>${sv(m.manifest_number) || "—"}</td>
        <td class="tn-tc">${sv(m.from_location_name) || "—"}</td>
        <td class="tn-tc">${sv(m.to_location_name) || "—"}</td>
        <td class="tn-tr">${sv(m.weight_kg) || "—"}</td>
        <td class="tn-tc">${sv(m.quantity) || "—"}</td>
      </tr>`,
    )
    .join("");

  // Vehicle block (own)
  const vehicleBlock = `
    <div class="tn-details-col">
      <h4>Vehicle Details</h4>
      ${dr("Manufacturer", sv(vehicle?.manufacturer))}
      ${dr("Model", sv(vehicle?.model))}
      ${dr("Fuel Type", sv(vehicle?.fuel_type))}
      ${dr("Payload Capacity", sv(vehicle?.payload_capacity_kg) ? sv(vehicle?.payload_capacity_kg) + " kg" : "")}
    </div>`;

  // Driver block (own)
  const driverBlock = `
    <div class="tn-details-col">
      <h4>Driver Details</h4>
      ${dr("Full Name", sv(driver?.full_name))}
      ${dr("Father's / Guardian's Name", sv(driver?.guardian_name))}
      ${dr("Date of Birth", sv(driver?.date_of_birth))}
      ${dr("Gender", sv(driver?.gender))}
      ${dr("Blood Group", sv(driver?.blood_group))}
      ${dr("Mobile Number", sv(driver?.mobile_number))}
      ${dr("Alternate Mobile", sv(driver?.alternate_mobile))}
      ${dr("Licence Number", sv(driver?.licence_number))}
      ${dr("Issuing Authority (RTO)", sv(driver?.licence_authority))}
      ${dr("Licence Issue Date", sv(driver?.licence_issue_date))}
      ${dr("Licence Expiry Date", sv(driver?.licence_expiry_date))}
    </div>`;

  // Transporter block (3rd party)
  const transporterBlock = `
    <div class="tn-details-col">
      <h4>Third-Party Transporter Details</h4>
      ${dr("Transporter Name", sv(transporter?.transporter_name))}
      ${dr("PAN No.", sv(transporter?.pan_number))}
      ${dr("GSTIN", sv(transporter?.gst_number))}
      ${dr("Vehicle No.", sv(data.third_party_vehicle_number))}
    </div>`;

  const isOwn = trip.ownership === "own";

  return `
<div class="tn-root">

  <div class="tn-title">Trip Note</div>

  <div class="tn-company-header">
    <img src="${logoDataUri}" class="tn-logo" alt="Logo" />
    <div class="tn-company-info">
      <div class="tn-company-name">${company.company_name}</div>
      <div class="tn-company-addr">${addressHtml}</div>
      ${
        company.gstin || company.pan
          ? `<div class="tn-company-reg">${[
              company.gstin ? `GSTIN: ${company.gstin}` : "",
              company.pan   ? `PAN: ${company.pan}`     : "",
            ].filter(Boolean).join(" &nbsp;|&nbsp; ")}</div>`
          : ""
      }
    </div>
  </div>

  <div class="tn-hr"></div>

  <table class="tn-summary-table">
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
        <td>${sv(company.pan) || "—"}</td>
        <td>${sv(company.gstin) || "—"}</td>
        <td>${trip.trip_code}</td>
        <td>${sv(trip.start_date) || "—"}</td>
        <td>${fromLoc || "—"}</td>
        <td>${toLoc || "—"}</td>
      </tr>
    </tbody>
  </table>

  <div class="tn-trip-box">
    <h4>Trip Details</h4>
    <div class="tn-trip-box-grid">
      ${dr("Trip Number", trip.trip_code)}
      ${dr("Ownership", ownership)}
      ${dr("Start Date", sv(trip.start_date) + (trip.start_time ? " " + sv(trip.start_time) : ""))}
      ${dr("End Date", sv(trip.end_date))}
      ${dr("Total Manifests", String(manifests.length))}
      ${dr("Total Weight", totalWeight > 0 ? totalWeight.toFixed(3) + " kg" : "")}
      ${dr("Total Packages", totalPkgs > 0 ? String(totalPkgs) : "")}
    </div>
  </div>

  <div class="tn-details-wrap">
    ${isOwn ? vehicleBlock + driverBlock : transporterBlock}
  </div>

  <table class="tn-manifest-table">
    <thead>
      <tr>
        <th class="tn-tc" style="width:36px">S.No.</th>
        <th>LR Number</th>
        <th class="tn-tc">From</th>
        <th class="tn-tc">To</th>
        <th class="tn-tr" style="width:76px">Weight (kg)</th>
        <th class="tn-tc" style="width:56px">Pkgs</th>
      </tr>
    </thead>
    <tbody>
      ${
        manifests.length > 0
          ? manifestRowsHtml
          : `<tr><td colspan="6" class="tn-tc" style="padding:10px;color:#999">No manifests recorded for this trip.</td></tr>`
      }
    </tbody>
    ${
      manifests.length > 0
        ? `<tfoot>
          <tr>
            <td colspan="2" class="tn-tr">Totals</td>
            <td colspan="2"></td>
            <td class="tn-tr">${totalWeight > 0 ? totalWeight.toFixed(3) : "—"}</td>
            <td class="tn-tc">${totalPkgs || "—"}</td>
          </tr>
        </tfoot>`
        : ""
    }
  </table>

  <div class="tn-sig-footer">
    <div class="tn-sig-box"><div class="tn-sig-line">Prepared By</div></div>
    <div class="tn-sig-box"><div class="tn-sig-line">Authorised Signatory</div></div>
  </div>

  <div class="tn-page-footer">Powered by Sparrow AI Solutions</div>

</div>`;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Render the trip note into a hidden DOM container, capture with html2canvas,
 * build a real jsPDF document, and open it as application/pdf in a new tab
 * so the browser shows its native PDF viewer.
 */
export async function printTripNote(data: TripNoteData): Promise<void> {
  const logoUrl = `${window.location.origin}/garuda-logo.png`;

  // Pre-fetch logo as base64 so html2canvas doesn't hit CORS issues
  const logoDataUri = await toDataUri(logoUrl);

  // Build body HTML
  const bodyHtml = buildBodyHtml(data, logoDataUri);

  // Inject scoped CSS into document head temporarily
  const styleEl = document.createElement("style");
  styleEl.setAttribute("data-tn", "1");
  styleEl.textContent = TRIP_NOTE_CSS;
  document.head.appendChild(styleEl);

  // Create off-screen container
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;left:-9999px;top:0;width:770px;background:#fff;z-index:-1;";
  container.innerHTML = bodyHtml;
  document.body.appendChild(container);

  try {
    // Lazy-load heavy libraries only when needed
    const [html2canvasModule, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const html2canvas = html2canvasModule.default;

    // Render the root element to canvas at 2× for sharpness
    const root = container.querySelector(".tn-root") as HTMLElement;
    const canvas = await html2canvas(root, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    // A4 dimensions in mm
    const A4_W = 210;
    const A4_H = 297;

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Scale canvas width to A4 width (full bleed)
    const imgW = A4_W;
    const imgH = (canvas.height * A4_W) / canvas.width;
    const imgData = canvas.toDataURL("image/jpeg", 0.92);

    // Slice the canvas height across multiple A4 pages
    const totalPages = Math.ceil(imgH / A4_H);
    for (let i = 0; i < totalPages; i++) {
      if (i > 0) pdf.addPage();
      // Shift image upwards so each page shows the next slice
      pdf.addImage(imgData, "JPEG", 0, -(i * A4_H), imgW, imgH);
    }

    // Open in a custom HTML PDF viewer with branded footer
    const pdfBlob = pdf.output("blob");
    const pdfUrl  = URL.createObjectURL(pdfBlob);

    const viewerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Trip Note — ${data.trip.trip_code}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%;
      background: #1e1e2e;
      font-family: Arial, Helvetica, sans-serif;
      display: flex;
      flex-direction: column;
    }
    /* ── Top toolbar ── */
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 20px;
      background: #111827;
      border-bottom: 1px solid #374151;
      flex-shrink: 0;
    }
    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .toolbar-icon {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .toolbar-icon svg { color: #fff; }
    .toolbar-title {
      color: #f3f4f6;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    .toolbar-subtitle {
      color: #9ca3af;
      font-size: 11px;
      margin-top: 1px;
    }
    .toolbar-actions { display: flex; gap: 8px; }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: background 0.15s, opacity 0.15s;
      text-decoration: none;
    }
    .btn:hover { opacity: 0.88; }
    .btn-primary {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff;
    }
    .btn-secondary {
      background: #374151;
      color: #f3f4f6;
    }
    /* ── PDF frame area ── */
    .pdf-wrapper {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    iframe {
      flex: 1;
      width: 100%;
      border: none;
    }
    /* ── Branded footer ── */
    .pdf-footer {
      flex-shrink: 0;
      background: #111827;
      border-top: 1px solid #374151;
      padding: 8px 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .pdf-footer-logo {
      width: 18px;
      height: 18px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .pdf-footer-logo svg { display: block; }
    .pdf-footer-text {
      font-size: 10px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      font-weight: 700;
      color: #6b7280;
    }
    .pdf-footer-text span {
      color: #a78bfa;
    }
  </style>
</head>
<body>
  <!-- Toolbar -->
  <div class="toolbar">
    <div class="toolbar-left">
      <div class="toolbar-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
        </svg>
      </div>
      <div>
        <div class="toolbar-title">Trip Note</div>
        <div class="toolbar-subtitle">Trip #${data.trip.trip_code}${data.trip.start_date ? " &nbsp;·&nbsp; " + data.trip.start_date : ""}</div>
      </div>
    </div>
    <div class="toolbar-actions">
      <a id="dl-btn" href="${pdfUrl}" download="TripNote-${data.trip.trip_code}.pdf" class="btn btn-secondary">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download
      </a>
      <button onclick="window.frames[0].print ? window.frames[0].print() : window.print()" class="btn btn-primary">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
        </svg>
        Print
      </button>
    </div>
  </div>

  <!-- PDF viewer -->
  <div class="pdf-wrapper">
    <iframe src="${pdfUrl}" title="Trip Note PDF"></iframe>
  </div>

  <!-- Branded footer -->
  <div class="pdf-footer">
    <div class="pdf-footer-logo">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    </div>
    <div class="pdf-footer-text">Powered by <span>Sparrow AI Solution</span></div>
  </div>
</body>
</html>`;

    const viewerBlob = new Blob([viewerHtml], { type: "text/html" });
    const viewerUrl  = URL.createObjectURL(viewerBlob);
    const tab = window.open(viewerUrl, "_blank");
    if (!tab) {
      alert("Pop-up blocked — please allow pop-ups for this site to open the Trip Note PDF.");
    }
    // Revoke both URLs after 5 minutes to free memory
    setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
      URL.revokeObjectURL(viewerUrl);
    }, 300_000);
  } finally {
    // Always clean up DOM
    document.head.removeChild(styleEl);
    document.body.removeChild(container);
  }
}
