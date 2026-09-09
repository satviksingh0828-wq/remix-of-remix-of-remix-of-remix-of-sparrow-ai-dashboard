const DEFAULT_WA_URL = "https://wa.garudalogistics.orca.devs.surf";

function whatsappApiUrl(path: string) {
  const base = (process.env.WHATSAPP_API_URL || DEFAULT_WA_URL).replace(/\/$/, "");
  return `${base}${path}`;
}

function whatsappApiKey() {
  return process.env.WHATSAPP_API_KEY || "";
}

function upstreamHeaders(request: Request, includeContentType = false) {
  const headers = new Headers();
  const apiKey = whatsappApiKey();
  if (apiKey) headers.set("x-api-key", apiKey);
  if (includeContentType) headers.set("Content-Type", "application/json");
  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("authorization", authorization);
  return headers;
}

export async function proxyWhatsAppJson(request: Request, path: string, method = request.method) {
  if (!whatsappApiKey()) {
    return Response.json({ error: "WhatsApp service is not configured on the server." }, { status: 503 });
  }

  try {
    const response = await fetch(whatsappApiUrl(path), {
      method,
      headers: upstreamHeaders(request, method !== "GET" && method !== "HEAD"),
      ...(method !== "GET" && method !== "HEAD" ? { body: await request.text() } : {}),
    });
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    console.error(`[whatsapp] ${method} ${path} failed:`, error);
    return Response.json({ error: "Unable to reach the WhatsApp service." }, { status: 502 });
  }
}

export async function proxyWhatsAppMultipart(request: Request, path: string) {
  if (!whatsappApiKey()) {
    return Response.json({ error: "WhatsApp service is not configured on the server." }, { status: 503 });
  }

  try {
    const body = await request.formData();
    const response = await fetch(whatsappApiUrl(path), {
      method: "POST",
      headers: upstreamHeaders(request),
      body,
    });
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    console.error(`[whatsapp] POST ${path} failed:`, error);
    return Response.json({ error: "Unable to reach the WhatsApp service." }, { status: 502 });
  }
}

export function whatsappApiConfigured() {
  return Boolean(whatsappApiKey());
}
