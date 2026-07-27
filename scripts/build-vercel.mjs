#!/usr/bin/env node
/**
 * Produces .vercel/output/ from the Vite SSR build output.
 *
 * Structure created:
 *   .vercel/output/
 *     config.json                    — route rules
 *     static/                        — served by Vercel CDN (from dist/client/)
 *     functions/
 *       ssr.func/
 *         .vc-config.json            — Node.js 22 function config
 *         package.json               — "type":"module" so ESM imports work
 *         handler.mjs                — bridges Node.js req/res → Web fetch API
 *         server.js + assets/        — TanStack Start SSR bundle (from dist/server/)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// ── 1. Vite build ────────────────────────────────────────────
console.log('▶ vite build…');
execSync('vite build', { stdio: 'inherit' });

// ── 2. Prepare output dirs ────────────────────────────────────
const out = '.vercel/output';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(`${out}/static`, { recursive: true });
fs.mkdirSync(`${out}/functions/ssr.func`, { recursive: true });

// ── 3. Static assets (dist/client/ → .vercel/output/static/) ─
copyDir('dist/client', `${out}/static`);

// ── 4. SSR bundle (dist/server/ → ssr.func/) ─────────────────
copyDir('dist/server', `${out}/functions/ssr.func`);

// ── 5. Handler: bridges Node.js HTTP ↔ Web fetch API ─────────
fs.writeFileSync(
  `${out}/functions/ssr.func/handler.mjs`,
  `// Bridges Node.js HTTP (Vercel) ↔ Web fetch API (TanStack Start SSR)
import server from './server.js';

export default async function handler(req, res) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host  = req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost';

  let rawUrl = req.url;
  // Vercel passes the full URL on some invocations
  const url = rawUrl.startsWith('http') ? new URL(rawUrl) : new URL(rawUrl, \`\${proto}://\${host}\`);

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
`,
);

// ── 6. package.json inside the function (ESM flag) ───────────
fs.writeFileSync(
  `${out}/functions/ssr.func/package.json`,
  JSON.stringify({ type: 'module' }),
);

// ── 7. Vercel function config ─────────────────────────────────
fs.writeFileSync(
  `${out}/functions/ssr.func/.vc-config.json`,
  JSON.stringify({
    runtime: 'nodejs22.x',
    handler: 'handler.mjs',
    launcherType: 'Nodejs',
    shouldAddHelpers: false,
    supportsResponseStreaming: false,
  }),
);

// ── 8. Routing config ─────────────────────────────────────────
fs.writeFileSync(
  `${out}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        // Long-cache headers for hashed asset files
        {
          src: '^/assets/(.*)$',
          headers: { 'cache-control': 'public, max-age=31536000, immutable' },
          continue: true,
        },
        // Serve static files (favicon, robots, etc.) directly
        { handle: 'filesystem' },
        // Everything else → SSR function
        { src: '/(.*)', dest: '/ssr' },
      ],
    },
    null,
    2,
  ),
);

console.log('✅  .vercel/output/ ready');

// ── Helpers ───────────────────────────────────────────────────
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    entry.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}
