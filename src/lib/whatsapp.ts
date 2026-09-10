const API_ROOT = "/api/whatsapp";

function apiUrl(path: string) {
  return `${API_ROOT}${path}`;
}

function headers(json = false): HeadersInit {
  return json ? { "Content-Type": "application/json" } : {};
}

async function readError(response: Response) {
  try {
    const body = await response.json() as { error?: string; message?: string };
    return body.error || body.message || `WhatsApp API request failed (${response.status})`;
  } catch {
    return `WhatsApp API request failed (${response.status})`;
  }
}

export type WaStatus = "connected" | "ready" | "qr" | "connecting" | "disconnected" | "unknown";

export async function getWaStatus(): Promise<{ status: WaStatus; raw: unknown }> {
  const response = await fetch(apiUrl("/session/status"));
  if (!response.ok) throw new Error(await readError(response));
  const raw = await response.json() as { status?: string };
  const status = raw.status as WaStatus;
  return { status: ["connected", "ready", "qr", "connecting", "disconnected"].includes(status) ? status : "unknown", raw };
}

export async function isWaConnected() {
  try {
    const { status } = await getWaStatus();
    return status === "connected" || status === "ready";
  } catch {
    return false;
  }
}

export async function connectWa() {
  const response = await fetch(apiUrl("/session/connect"), { method: "POST", headers: headers(true), body: "{}" });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function getWaQr(): Promise<string | null> {
  const response = await fetch(apiUrl("/session/qr"));
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(await readError(response));
  const body = await response.json() as { qr?: string; data?: string; qrData?: string };
  return body.qr || body.data || body.qrData || null;
}

export async function disconnectWa() {
  const response = await fetch(apiUrl("/session/disconnect"), { method: "POST", headers: headers(true), body: "{}" });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export function normalizeWaNumber(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

export async function sendWaMessage(to: string, message: string) {
  const response = await fetch(apiUrl("/messages/send"), {
    method: "POST",
    headers: headers(true),
    body: JSON.stringify({ to: normalizeWaNumber(to), message }),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

function pdfBlob(data: string) {
  // jsPDF's datauristring output includes a data URI, while the payroll
  // helper returns only the base64 payload for WhatsApp. Accept both forms.
  const match = data.match(/^data:([^;,]+)?(?:;base64)?,(.*)$/);
  const encoded = (match ? match[2] : data).replace(/\s/g, "");
  if (!encoded) throw new Error("Invalid PDF data");
  let binary: string;
  try {
    binary = atob(encoded);
  } catch {
    throw new Error("Invalid PDF base64 data");
  }
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: match?.[1] || "application/pdf" });
}

export async function sendWaPdf(to: string, dataUrl: string, filename: string, caption?: string) {
  const form = new FormData();
  form.append("to", normalizeWaNumber(to));
  if (caption) form.append("caption", caption);
  form.append("file", pdfBlob(dataUrl), filename);
  const response = await fetch(apiUrl("/messages/send-file"), { method: "POST", body: form });
  if (!response.ok) throw new Error(await readError(response));
  await response.json().catch(() => undefined);
  return true;
}

// The real configuration is intentionally checked by the server. This keeps the
// API key out of the browser bundle while allowing the existing UI to stay usable.
export function whatsappApiConfigured() {
  return true;
}
