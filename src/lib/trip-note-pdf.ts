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

export type TripNoteBranch = {
  branch_name?: unknown;
  address_line1?: unknown;
  address_line2?: unknown;
  area_locality?: unknown;
  city?: unknown;
  state?: unknown;
  pin_code?: unknown;
  gstin?: unknown;
  pan?: unknown;
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
  branch?: TripNoteBranch | null;
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

export async function fetchBranch(branchId: string | null | undefined): Promise<TripNoteBranch | null> {
  if (!branchId) return null;
  try {
    const { data } = await supabase
      .from("branches")
      .select("branch_name,address_line1,address_line2,area_locality,city,state,pin_code,gstin,pan")
      .eq("id", branchId)
      .maybeSingle();
    return (data as TripNoteBranch) ?? null;
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

/** Build the PDF stylesheet with the active theme's primary colour injected. */
function buildTripNoteCSS(primaryHex: string): string {
  // Derive a slightly-darker border colour for the manifest table header.
  // Simple approach: lower hex lightness by blending toward black at 15 %.
  function darken(hex: string, amount = 0.18): string {
    const n = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(0, Math.round(((n >> 16) & 0xff) * (1 - amount)));
    const g = Math.max(0, Math.round(((n >>  8) & 0xff) * (1 - amount)));
    const b = Math.max(0, Math.round((n & 0xff)         * (1 - amount)));
    return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
  }
  const primaryBorder = darken(primaryHex);

  return `
.tn-root {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 10.5px;
  line-height: 1.35;
  color: #000;
  background: #fff;
  width: 770px;
  padding: 24px 32px 24px;
  box-sizing: border-box;
}
.tn-root * { box-sizing: border-box; margin: 0; padding: 0; line-height: inherit; }

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
  color: #555; font-weight: 600; padding: 3px 6px;
  border: 1px solid #bbb; background: #f5f5f5;
  vertical-align: middle; line-height: 1.35;
}
.tn-summary-table td {
  font-size: 10.5px; font-weight: 700; padding: 4px 6px;
  border: 1px solid #bbb; vertical-align: middle; line-height: 1.35;
}

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
  display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 3px;
}
.tn-detail-label { font-size: 9.5px; color: #555; flex-shrink: 0; line-height: 1.35; }
.tn-detail-value { font-size: 10px; font-weight: 600; text-align: right; line-height: 1.35; }

/* Manifest table */
.tn-manifest-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
.tn-manifest-table thead tr { background: ${primaryHex}; color: #fff; }
.tn-manifest-table th {
  padding: 5px 7px; font-size: 9px; text-transform: uppercase;
  letter-spacing: 0.07em; font-weight: 700; border: 1px solid ${primaryBorder};
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
`;
}

// ── HTML builder ──────────────────────────────────────────────────────────────

function buildBodyHtml(data: TripNoteData, logoDataUri: string): string {
  const { company, branch, trip, vehicle, driver, transporter, manifests } = data;

  // Address — prefer branch address (trip's own branch), fall back to company
  const addr = branch ?? company;
  const addrParts = [
    sv((addr as Record<string, unknown>).address_line1),
    sv((addr as Record<string, unknown>).address_line2),
    sv((addr as Record<string, unknown>).area_locality),
    [
      sv((addr as Record<string, unknown>).city),
      sv((addr as Record<string, unknown>).state),
    ].filter(Boolean).join(", "),
    sv((addr as Record<string, unknown>).pin_code),
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
      ${dr("Registration No.", sv(vehicle?.registration_number))}
      ${dr("Nickname / Internal Code", [sv(vehicle?.nickname), sv(vehicle?.internal_code)].filter(Boolean).join(" / "))}
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
        <td>${sv((addr as Record<string, unknown>).pan) || sv(company.pan) || "—"}</td>
        <td>${sv((addr as Record<string, unknown>).gstin) || sv(company.gstin) || "—"}</td>
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

</div>`;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Opens a new tab immediately (inside the user-gesture) to avoid popup
 * blockers, shows a loading screen, then generates the PDF and writes the
 * final viewer into that same tab.
 *
 * Key insight: any await before window.open() causes the browser to lose
 * the user-gesture context and silently block the popup.
 */
export async function printTripNote(data: TripNoteData): Promise<void> {
  // ── Snapshot the app theme FIRST (synchronous, before any await or open) ────
  // Maps data-theme → the same swatch hex used in THEMES array in theme.tsx.
  const THEME_HEX: Record<string, string> = {
    sky:      "#2f7ed8",
    emerald:  "#12926f",
    violet:   "#6d4bd8",
    amber:    "#d38b1b",
    rose:     "#d94f5c",
    graphite: "#4a4f57",
    garuda:   "#8b1a2c",
  };
  const themeId      = document.documentElement.getAttribute("data-theme") ?? "sky";
  const themePrimary = THEME_HEX[themeId] ?? "#2f7ed8";

  // ── OPEN WINDOW — must be synchronous inside the click handler ──────────────
  // If the pop-up is blocked (tab === null) we continue anyway and fall back to
  // a direct browser download at the end.
  const tab = window.open("", "_blank");

  if (tab) {
    // Show a loading screen immediately so the user sees something in the tab.
    tab.document.open();
    tab.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Generating…</title>
<style>
  body{margin:0;display:flex;align-items:center;justify-content:center;
       min-height:100vh;background:#f8fafc;font-family:Arial,sans-serif;flex-direction:column;gap:16px}
  .ring{width:44px;height:44px;border:3px solid #e2e8f0;border-top-color:${themePrimary};
        border-radius:50%;animation:spin .7s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  p{color:#64748b;font-size:13px;letter-spacing:.05em;margin:0}
</style></head><body>
<div class="ring"></div><p>Generating Trip Note PDF…</p>
</body></html>`);
    tab.document.close();
  }

  // ── ALL ASYNC WORK HAPPENS AFTER THE WINDOW IS ALREADY OPEN ────────────────
  // Use a hidden <iframe> rather than a <div> appended to document.body.
  // This fully isolates the rendered HTML from the app's CSS (Tailwind v4 uses
  // oklch() color values that html2canvas cannot parse; inside the iframe only
  // TRIP_NOTE_CSS is present, which uses plain hex/rgb only).
  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;left:-9999px;top:0;width:770px;height:2400px;border:none;visibility:hidden;";
  document.body.appendChild(iframe);

  try {
    const logoDataUri = await toDataUri(
      `${window.location.origin}/garuda-logo.png`,
    );

    // Write a standalone HTML document into the iframe — no app stylesheets.
    const iframeDoc = iframe.contentDocument!;
    iframeDoc.open();
    iframeDoc.write(
      `<!DOCTYPE html><html><head><meta charset="UTF-8">` +
      `<style>${buildTripNoteCSS(themePrimary)}</style></head>` +
      `<body style="margin:0;background:#fff;">` +
      buildBodyHtml(data, logoDataUri) +
      `</body></html>`,
    );
    iframeDoc.close();

    // Give the iframe a moment to finish layout (images, fonts).
    await new Promise<void>((r) => setTimeout(r, 250));

    const [html2canvasModule, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const html2canvas = html2canvasModule.default;

    const root = iframeDoc.querySelector(".tn-root") as HTMLElement;
    const canvas = await html2canvas(root, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: 900,
    });

    const A4_W = 210;
    const A4_H = 297;
    const pdf  = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const imgW    = A4_W;
    const imgH    = (canvas.height * A4_W) / canvas.width;
    const imgData = canvas.toDataURL("image/jpeg", 0.92);

    const totalPages = Math.ceil(imgH / A4_H);
    for (let i = 0; i < totalPages; i++) {
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, -(i * A4_H), imgW, imgH);
    }

    // Use data-URI (not blob URL) so there are zero cross-origin issues
    // regardless of which browser / security mode the user has.
    const pdfDataUri = pdf.output("datauristring");
    const tripCode   = data.trip.trip_code;
    const startDate  = data.trip.start_date ?? "";

    // ── Minimal theme-matched viewer page ────────────────────────────────
    const viewerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Trip Note \u2014 ${tripCode}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;display:flex;flex-direction:column}
.bar{display:flex;align-items:center;justify-content:space-between;padding:10px 20px;
     background:#ffffff;border-bottom:1px solid #e2e8f0;flex-shrink:0;
     box-shadow:0 1px 3px rgba(0,0,0,.06)}
.t1{color:#0f172a;font-size:14px;font-weight:600}
.t2{color:#64748b;font-size:11px;margin-top:2px}
.acts{display:flex;gap:8px}
.btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:6px;
     font-size:12px;font-weight:600;cursor:pointer;border:none;text-decoration:none;transition:opacity .15s}
.btn:hover{opacity:.82}
.pri{background:${themePrimary};color:#fff}
.sec{background:#f1f5f9;color:#334155;border:1px solid #e2e8f0}
.wrap{flex:1;overflow:hidden;display:flex;flex-direction:column;padding:16px 16px 0}
iframe{flex:1;width:100%;border:none;border-radius:8px;
       box-shadow:0 2px 12px rgba(0,0,0,.10)}
.foot{flex-shrink:0;padding:7px 20px;text-align:center;
      font-size:10px;letter-spacing:.12em;text-transform:uppercase;
      color:#94a3b8;font-weight:600}
</style>
</head>
<body>
<div class="bar">
  <div>
    <div class="t1">Trip Note</div>
    <div class="t2">Trip #${tripCode}${startDate ? " &nbsp;&middot;&nbsp; " + startDate : ""}</div>
  </div>
  <div class="acts">
    <button class="btn sec" onclick="dl()">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
      </svg>Download
    </button>
    <button class="btn pri" onclick="document.getElementById('f').contentWindow.print()">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
      </svg>Print
    </button>
  </div>
</div>
<div class="wrap"><iframe id="f" src="${pdfDataUri}"></iframe></div>
<div class="foot">Powered by Sparrow AI Solutions</div>
<script>
var _d="${pdfDataUri}";
function dl(){var a=document.createElement("a");a.href=_d;a.download="TripNote-${tripCode}.pdf";a.click();}
</script>
</body></html>`;

    if (tab && !tab.closed) {
      // Success — show interactive viewer in the tab.
      tab.document.open();
      tab.document.write(viewerHtml);
      tab.document.close();
    } else {
      // Tab was blocked by the browser — fall back to a direct download.
      pdf.save(`TripNote-${tripCode}.pdf`);
    }

  } catch (err) {
    // PDF generation failed. Show a friendly light-theme error page in the
    // tab so the user isn't left staring at a blank loading screen.
    const errMsg = err instanceof Error ? err.message : String(err);
    if (tab && !tab.closed) {
      tab.document.open();
      tab.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>PDF Error</title>
<style>
  body{margin:0;display:flex;align-items:center;justify-content:center;
       min-height:100vh;background:#f8fafc;font-family:Arial,sans-serif;
       flex-direction:column;gap:14px;padding:24px;text-align:center}
  .ico{width:52px;height:52px;background:#fee2e2;border-radius:50%;
       display:flex;align-items:center;justify-content:center;margin:0 auto}
  h2{color:#0f172a;font-size:17px;margin:0}
  p{color:#64748b;font-size:13px;margin:0;max-width:420px}
  code{display:block;margin-top:10px;color:#dc2626;font-size:11px;
       background:#fef2f2;border:1px solid #fecaca;border-radius:6px;
       padding:8px 12px;word-break:break-all;text-align:left}
  button{margin-top:8px;padding:8px 20px;background:#6366f1;color:#fff;
         border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600}
  button:hover{opacity:.85}
</style></head><body>
<div class="ico">
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626"
       stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
</div>
<h2>Could not generate PDF</h2>
<p>An error occurred while building the trip note.
   Please close this tab and try again.
   <code>${errMsg}</code>
</p>
<button onclick="window.close()">Close tab</button>
</body></html>`);
      tab.document.close();
    }
    throw err;
  } finally {
    // Always remove the hidden iframe regardless of success or failure.
    if (iframe.parentNode) document.body.removeChild(iframe);
  }
}
