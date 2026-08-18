/**
 * Local data API server — multi-company edition.
 * Each company's data lives in data/{companyId}/*.json
 * Used as the persistence layer when the app runs in a browser (non-Electron).
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const COMPANIES_FILE = path.join(DATA_DIR, 'companies.json');

const TABLES = [
  'employees', 'departments', 'positions', 'attendance', 'holidays',
  'payrolls', 'loans', 'advances', 'loss_deductions', 'app_settings',
  'loan_installments', 'advance_installments', 'checkin_logs', 'employee_documents',
];

function nowIso() { return new Date().toISOString(); }

// ── Helpers ───────────────────────────────────────────────────────────────
function readCompanies() {
  if (!fs.existsSync(COMPANIES_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(COMPANIES_FILE, 'utf8')); }
  catch { return []; }
}
function writeCompanies(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(COMPANIES_FILE, JSON.stringify(data, null, 2), 'utf8');
}
function getCompanyDir(id) { return path.join(DATA_DIR, id); }

function ensureCompanyDir(id) {
  const dir = getCompanyDir(id);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  for (const t of TABLES) {
    const file = path.join(dir, `${t}.json`);
    if (!fs.existsSync(file)) fs.writeFileSync(file, '[]', 'utf8');
  }
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(COMPANIES_FILE)) fs.writeFileSync(COMPANIES_FILE, '[]', 'utf8');
  try {
    const companies = JSON.parse(fs.readFileSync(COMPANIES_FILE, 'utf8'));
    for (const company of companies) {
      if (company?.id) ensureCompanyDir(company.id);
    }
  } catch { /* leave the existing files untouched if the registry is invalid */ }
}

function readTable(companyId, table) {
  const file = path.join(getCompanyDir(companyId), `${table}.json`);
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return []; }
}

function writeTable(companyId, table, data) {
  const dir = getCompanyDir(companyId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${table}.json`), JSON.stringify(data, null, 2), 'utf8');
}

function getEmployeeDocumentsDir(companyId, employeeId) {
  return path.join(getCompanyDir(companyId), 'employee_documents', employeeId);
}

function safeDocumentExtension(name) {
  const match = String(name || '').toLowerCase().match(/\.([a-z0-9]{1,10})$/);
  return match ? `.${match[1]}` : '';
}

function documentMimeType(mime, name) {
  if (mime) return mime;
  const ext = safeDocumentExtension(name);
  const map = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.webp': 'image/webp',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return map[ext] || 'application/octet-stream';
}

// ── Filter logic ──────────────────────────────────────────────────────────
function matchesFilters(row, filters) {
  for (const f of (filters || [])) {
    const v = row[f.col];
    switch (f.op) {
      case 'eq':  if (v !== f.val) return false; break;
      case 'neq': if (v === f.val) return false; break;
      case 'gte': {
        const nv = Number(v), nf = Number(f.val);
        const ok = (!isNaN(nv) && !isNaN(nf)) ? nv >= nf : String(v) >= String(f.val);
        if (!ok) return false; break;
      }
      case 'lte': {
        const nv = Number(v), nf = Number(f.val);
        const ok = (!isNaN(nv) && !isNaN(nf)) ? nv <= nf : String(v) <= String(f.val);
        if (!ok) return false; break;
      }
      case 'in':  if (!Array.isArray(f.val) || !f.val.includes(v)) return false; break;
      case 'is':  if (v !== f.val) return false; break;
    }
  }
  return true;
}

// ── DB op (same logic as Electron main) ──────────────────────────────────
function execDbOp(desc) {
  const { companyId, table, op } = desc;
  if (!companyId) return { data: null, error: { message: 'No companyId provided' } };
  const ts = nowIso();
  let rows = readTable(companyId, table);
  const filters = desc.filters || [];

  switch (op) {
    case 'select': {
      let res = rows.filter(r => matchesFilters(r, filters));
      if (desc.orderBy) {
        const { col, ascending = true } = desc.orderBy;
        res = res.slice().sort((a, b) => {
          const av = a[col] ?? '', bv = b[col] ?? '';
          if (av < bv) return ascending ? -1 : 1;
          if (av > bv) return ascending ? 1 : -1;
          return 0;
        });
      }
      if (desc.limit) res = res.slice(0, desc.limit);
      if (desc.single) {
        return res.length
          ? { data: res[0], error: null }
          : { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
      }
      if (desc.maybeSingle) return { data: res[0] ?? null, error: null };
      return { data: res, error: null };
    }

    case 'insert': {
      const items = Array.isArray(desc.data) ? desc.data : [desc.data];
      const created = items.map(item => ({
        id: item.id || crypto.randomUUID(), ...item, created_at: ts, updated_at: ts,
      }));
      writeTable(companyId, table, [...rows, ...created]);
      if (desc.single) return { data: created[0], error: null };
      return { data: created, error: null };
    }

    case 'update': {
      let lastUpdated = null;
      const newRows = rows.map(r => {
        if (!matchesFilters(r, filters)) return r;
        const u = { ...r, ...desc.data, updated_at: ts };
        lastUpdated = u;
        return u;
      });
      writeTable(companyId, table, newRows);
      if (desc.returnAll) return { data: newRows.filter(r => matchesFilters(r, filters)), error: null };
      if (desc.single) return { data: lastUpdated, error: null };
      return { data: null, error: null };
    }

    case 'delete': {
      writeTable(companyId, table, rows.filter(r => !matchesFilters(r, filters)));
      return { data: null, error: null };
    }

    case 'upsert': {
      const items = Array.isArray(desc.data) ? desc.data : [desc.data];
      const cc = desc.upsertConflict
        ? desc.upsertConflict.split(',').map(s => s.trim())
        : ['id'];
      for (const item of items) {
        const idx = rows.findIndex(r => cc.every(c => r[c] === item[c]));
        if (idx >= 0) {
          rows[idx] = { ...rows[idx], ...item, updated_at: ts };
        } else {
          rows.push({ id: item.id || crypto.randomUUID(), ...item, created_at: ts, updated_at: ts });
        }
      }
      writeTable(companyId, table, rows);
      return { data: null, error: null };
    }

    default:
      return { data: null, error: { message: `Unknown op: ${op}` } };
  }
}

// ── Express ───────────────────────────────────────────────────────────────
ensureDataDir();

const app = express();
app.use(express.json({ limit: '20mb' }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Company routes ─────────────────────────────────────────────────────────
app.get('/api/companies', (_req, res) => {
  try { res.json({ data: readCompanies(), error: null }); }
  catch (e) { res.json({ data: null, error: { message: e.message } }); }
});

app.post('/api/companies', (req, res) => {
  try {
    const { name, address, hue } = req.body;
    const id = crypto.randomUUID();
    const company = { id, name, address: address || '', hue: hue ?? 25, logo_ext: null, created_at: nowIso() };
    const companies = readCompanies();
    companies.push(company);
    writeCompanies(companies);
    ensureCompanyDir(id);
    res.json({ data: company, error: null });
  } catch (e) { res.json({ data: null, error: { message: e.message } }); }
});

app.put('/api/companies/:id', (req, res) => {
  try {
    const companies = readCompanies();
    const idx = companies.findIndex(c => c.id === req.params.id);
    if (idx < 0) return res.json({ data: null, error: { message: 'Company not found' } });
    companies[idx] = { ...companies[idx], ...req.body };
    writeCompanies(companies);
    res.json({ data: companies[idx], error: null });
  } catch (e) { res.json({ data: null, error: { message: e.message } }); }
});

app.delete('/api/companies/:id', (req, res) => {
  try {
    let companies = readCompanies();
    companies = companies.filter(c => c.id !== req.params.id);
    writeCompanies(companies);
    const dir = getCompanyDir(req.params.id);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    res.json({ data: null, error: null });
  } catch (e) { res.json({ data: null, error: { message: e.message } }); }
});

// Logo upload: body = { ext: 'jpg', data: 'base64string' }
app.post('/api/companies/:id/logo', (req, res) => {
  try {
    const { ext, data: b64 } = req.body;
    const dir = getCompanyDir(req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    for (const e of ['jpg','jpeg','png','webp','gif']) {
      const old = path.join(dir, `logo.${e}`);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    fs.writeFileSync(path.join(dir, `logo.${ext}`), Buffer.from(b64, 'base64'));
    const companies = readCompanies();
    const idx = companies.findIndex(c => c.id === req.params.id);
    if (idx >= 0) { companies[idx].logo_ext = ext; writeCompanies(companies); }
    res.json({ data: { logo_ext: ext }, error: null });
  } catch (e) { res.json({ data: null, error: { message: e.message } }); }
});

app.get('/api/companies/:id/logo', (req, res) => {
  try {
    const companies = readCompanies();
    const company = companies.find(c => c.id === req.params.id);
    if (!company?.logo_ext) return res.json({ data: null, error: null });
    const logoPath = path.join(getCompanyDir(req.params.id), `logo.${company.logo_ext}`);
    if (!fs.existsSync(logoPath)) return res.json({ data: null, error: null });
    const mimeMap = { jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif' };
    const mime = mimeMap[company.logo_ext] || 'image/jpeg';
    const b64 = fs.readFileSync(logoPath).toString('base64');
    res.json({ data: `data:${mime};base64,${b64}`, error: null });
  } catch (e) { res.json({ data: null, error: { message: e.message } }); }
});

// ── Employee documents ─────────────────────────────────────────────────────
app.get('/api/employee-documents', (req, res) => {
  try {
    const { companyId, employeeId } = req.query;
    if (!companyId || !employeeId) return res.json({ data: null, error: { message: 'companyId and employeeId are required' } });
    const rows = readTable(String(companyId), 'employee_documents')
      .filter(row => row.employee_id === employeeId)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .map(({ stored_name: _storedName, ...publicMetadata }) => publicMetadata);
    res.json({ data: rows, error: null });
  } catch (e) { res.json({ data: null, error: { message: e.message } }); }
});

app.post('/api/employee-documents', (req, res) => {
  try {
    const { companyId, employeeId, originalName, mimeType, data: b64 } = req.body;
    if (!companyId || !employeeId || !originalName || !b64)
      return res.json({ data: null, error: { message: 'companyId, employeeId, originalName and data are required' } });
    ensureCompanyDir(companyId);
    const id = crypto.randomUUID();
    const ext = safeDocumentExtension(originalName);
    const storedName = `${id}${ext}`;
    const dir = getEmployeeDocumentsDir(companyId, employeeId);
    fs.mkdirSync(dir, { recursive: true });
    const bytes = Buffer.from(b64, 'base64');
    fs.writeFileSync(path.join(dir, storedName), bytes);
    const ts = nowIso();
    const metadata = {
      id, employee_id: employeeId, original_name: String(originalName),
      stored_name: storedName, mime_type: documentMimeType(mimeType, originalName),
      size: bytes.length, created_at: ts, updated_at: ts,
    };
    writeTable(String(companyId), 'employee_documents', [...readTable(String(companyId), 'employee_documents'), metadata]);
    const { stored_name: _storedName, ...publicMetadata } = metadata;
    res.json({ data: publicMetadata, error: null });
  } catch (e) { res.json({ data: null, error: { message: e.message } }); }
});

app.get('/api/employee-documents/file', (req, res) => {
  try {
    const { companyId, id } = req.query;
    const row = readTable(String(companyId), 'employee_documents').find(item => item.id === id);
    if (!row) return res.json({ data: null, error: { message: 'Document not found' } });
    const filePath = path.join(getEmployeeDocumentsDir(String(companyId), row.employee_id), row.stored_name);
    if (!fs.existsSync(filePath)) return res.json({ data: null, error: { message: 'Document file not found' } });
    const b64 = fs.readFileSync(filePath).toString('base64');
    res.json({ data: { ...row, data_url: `data:${documentMimeType(row.mime_type, row.original_name)};base64,${b64}` }, error: null });
  } catch (e) { res.json({ data: null, error: { message: e.message } }); }
});

app.delete('/api/employee-documents', (req, res) => {
  try {
    const { companyId, id } = req.query;
    const rows = readTable(String(companyId), 'employee_documents');
    const row = rows.find(item => item.id === id);
    if (!row) return res.json({ data: null, error: { message: 'Document not found' } });
    const filePath = path.join(getEmployeeDocumentsDir(String(companyId), row.employee_id), row.stored_name);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    writeTable(String(companyId), 'employee_documents', rows.filter(item => item.id !== id));
    res.json({ data: null, error: null });
  } catch (e) { res.json({ data: null, error: { message: e.message } }); }
});

// ── DB endpoint ───────────────────────────────────────────────────────────
app.post('/api/db', (req, res) => {
  try {
    const result = execDbOp(req.body);
    res.json(result);
  } catch (e) {
    res.json({ data: null, error: { message: e.message } });
  }
});

app.get('/api/backup/status', (_req, res) => {
  try {
    const companies = readCompanies();
    let missingTableFiles = 0;
    for (const company of companies) {
      if (!company?.id) continue;
      const companyDir = getCompanyDir(company.id);
      for (const table of TABLES) {
        if (!fs.existsSync(path.join(companyDir, `${table}.json`))) missingTableFiles++;
      }
    }
    res.json({
      data: {
        dataDir: DATA_DIR,
        companyCount: companies.filter(company => company?.id).length,
        missingTableFiles,
        dataFolderReady: fs.existsSync(DATA_DIR) && fs.existsSync(COMPANIES_FILE) && missingTableFiles === 0,
        rcloneConfigured: false,
        rcloneFolder: null,
        remote: 'mega:CompanyData',
        inProgress: false,
        lastBackup: null,
      },
      error: null,
    });
  } catch (e) {
    res.json({ data: null, error: { message: e.message } });
  }
});

// ── WhatsApp (Baileys — WebSocket only, no Chrome/Puppeteer needed) ──────────
// Session stored in DATA_DIR/whatsapp_session as small JSON files.
let waSocket = null;
let waState = { status: 'idle', qr: null, phone: null, error: null, message: null };
let waReconnectCount = 0;
const WA_MAX_RECONNECT = 3;

// Silent logger — suppress Baileys internal noise
const waLogger = {
  level: 'silent',
  trace: () => {}, debug: () => {}, info: () => {}, warn: () => {}, error: () => {}, fatal: () => {},
  child: function () { return waLogger; },
};

async function initWhatsApp() {
  try {
    const {
      default: makeWASocket,
      useMultiFileAuthState,
      DisconnectReason,
      fetchLatestBaileysVersion,
    } = await import('@whiskeysockets/baileys');
    const QRCode = await import('qrcode');

    const WA_DATA_DIR = path.join(DATA_DIR, 'whatsapp_session');
    fs.mkdirSync(WA_DATA_DIR, { recursive: true });

    // Tear down any existing socket
    if (waSocket) {
      try { waSocket.end(undefined); } catch {}
      waSocket = null;
    }

    waState = { status: 'initializing', qr: null, phone: null, error: null, message: 'Starting WhatsApp…' };

    const { state, saveCreds } = await useMultiFileAuthState(WA_DATA_DIR);

    // Fetch latest WA version with fallback
    let version = [2, 3000, 1015901307];
    try {
      const latest = await fetchLatestBaileysVersion();
      version = latest.version;
    } catch { /* use fallback */ }

    const sock = makeWASocket({
      version,
      auth: state,
      logger: waLogger,
      printQRInTerminal: false,
      browser: ['Garuda HRMS', 'Chrome', '1.0'],
      connectTimeoutMs: 30000,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const dataUrl = await QRCode.default.toDataURL(qr);
          waState = { ...waState, status: 'qr', qr: dataUrl, error: null, message: null };
        } catch {
          waState = { ...waState, status: 'qr', qr: null, message: null };
        }
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        waSocket = null;

        if (loggedOut) {
          const WA_DIR2 = path.join(DATA_DIR, 'whatsapp_session');
          try { fs.rmSync(WA_DIR2, { recursive: true, force: true }); } catch {}
          waState = { status: 'idle', qr: null, phone: null, error: 'Logged out', message: null };
          waReconnectCount = 0;
        } else if (waReconnectCount < WA_MAX_RECONNECT) {
          waReconnectCount++;
          waState = { status: 'initializing', qr: null, phone: null, error: null, message: `Reconnecting (${waReconnectCount}/${WA_MAX_RECONNECT})…` };
          setTimeout(() => initWhatsApp().catch(() => {
            waState = { status: 'disconnected', qr: null, phone: null, error: null, message: null };
          }), 3000);
        } else {
          waReconnectCount = 0;
          waState = { status: 'disconnected', qr: null, phone: null, error: null, message: null };
        }
      } else if (connection === 'open') {
        waReconnectCount = 0;
        const phone = sock.user?.id?.split(':')[0] ?? null;
        waState = { status: 'connected', qr: null, phone: phone ? `+${phone}` : null, error: null, message: null };
        console.log('[WA] Connected as', phone);
      }
    });

    waSocket = sock;
  } catch (e) {
    waState = { status: 'error', qr: null, phone: null, error: e.message, message: null };
  }
}

app.get('/api/whatsapp/status', (_req, res) => res.json(waState));

app.post('/api/whatsapp/init', async (_req, res) => {
  try {
    waReconnectCount = 0;
    await initWhatsApp();
    res.json({ ok: true });
  } catch (e) {
    res.json({ error: e.message });
  }
});

app.post('/api/whatsapp/logout', async (_req, res) => {
  try {
    waReconnectCount = WA_MAX_RECONNECT + 1; // prevent auto-reconnect after logout
    if (waSocket) {
      await waSocket.logout().catch(() => {});
      waSocket = null;
    }
    const WA_DATA_DIR = path.join(DATA_DIR, 'whatsapp_session');
    try { fs.rmSync(WA_DATA_DIR, { recursive: true, force: true }); } catch {}
    waState = { status: 'idle', qr: null, phone: null, error: null, message: null };
    res.json({ ok: true });
  } catch (e) {
    res.json({ error: e.message });
  }
});

app.post('/api/whatsapp/send', async (req, res) => {
  try {
    if (!waSocket || waState.status !== 'connected') {
      return res.json({ error: 'WhatsApp is not connected' });
    }
    const { to, message } = req.body;
    if (!to || !message) return res.json({ error: 'to and message are required' });
    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
    await waSocket.sendMessage(jid, { text: message });
    res.json({ ok: true });
  } catch (e) {
    res.json({ error: e.message });
  }
});

// Send a PDF document via WhatsApp
app.post('/api/whatsapp/send-doc', async (req, res) => {
  try {
    if (!waSocket || waState.status !== 'connected') {
      return res.json({ error: 'WhatsApp is not connected' });
    }
    const { to, pdfBase64, filename, caption } = req.body;
    if (!to || !pdfBase64) return res.json({ error: 'to and pdfBase64 are required' });
    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
    await waSocket.sendMessage(jid, {
      document: Buffer.from(pdfBase64, 'base64'),
      mimetype: 'application/pdf',
      fileName: filename || 'document.pdf',
      caption: caption || '',
    });
    res.json({ ok: true });
  } catch (e) {
    res.json({ error: e.message });
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[data-api] Listening on http://0.0.0.0:${PORT}`);
  // Auto-start WhatsApp if a saved session exists (so user never needs to re-scan)
  const WA_DATA_DIR = path.join(DATA_DIR, 'whatsapp_session');
  const credsFile = path.join(WA_DATA_DIR, 'creds.json');
  if (fs.existsSync(credsFile)) {
    setTimeout(() => {
      console.log('[WA] Saved session found — auto-starting WhatsApp client…');
      initWhatsApp().catch(e => console.error('[WA] Auto-start failed:', e.message));
    }, 3000);
  }
});
