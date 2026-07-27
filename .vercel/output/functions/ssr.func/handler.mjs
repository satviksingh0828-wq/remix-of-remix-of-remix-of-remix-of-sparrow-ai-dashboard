// Bridges Node.js HTTP (Vercel) ↔ Web fetch API (TanStack Start SSR)
import server from './server.js';

export default async function handler(req, res) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host  = req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost';

  let rawUrl = req.url;
  // Vercel passes the full URL on some invocations
  const url = rawUrl.startsWith('http') ? new URL(rawUrl) : new URL(rawUrl, `${proto}://${host}`);

  const headers = new Headers();
  for (const [key, val] of Object.entries(req.headers)) {
    if (val != null) headers.set(key, Array.isArray(val) ? val.join(', ') : String(val));
  }

  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (chunks.length) body = Buffer.concat(chunks);
  }

  const request = new Request(url.toString(), { method: req.method, headers, body });

  let response;
  try {
    response = await server.fetch(request, process.env, {});
  } catch (err) {
    console.error('[ssr] fetch error:', err);
    res.statusCode = 500;
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end('<h1>500 – Internal Server Error</h1>');
    return;
  }

  res.statusCode = response.status;
  for (const [key, val] of response.headers.entries()) res.setHeader(key, val);
  res.end(Buffer.from(await response.arrayBuffer()));
}
