const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ── Data directory ─────────────────────────────────────────────────────────
// Portable: data folder lives next to the exe (or in project root during dev)
const DATA_DIR = app.isPackaged
  ? path.join(path.dirname(process.execPath), 'data')
  : path.join(__dirname, '..', 'data');

const COMPANIES_FILE = path.join(DATA_DIR, 'companies.json');

const TABLES = [
  'employees', 'departments', 'positions', 'attendance', 'holidays',
  'payrolls', 'loans', 'advances', 'loss_deductions', 'app_settings',
  'loan_installments', 'advance_installments', 'checkin_logs',
];

function nowIso() { return new Date().toISOString(); }
function genId()  { return crypto.randomUUID(); }

// ── Top-level data dir ─────────────────────────────────────────────────────
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(COMPANIES_FILE)) {
    fs.writeFileSync(COMPANIES_FILE, '[]', 'utf8');
  }
  // Ensure every existing company has all table files (handles new tables added after first run)
  try {
    const companies = JSON.parse(fs.readFileSync(COMPANIES_FILE, 'utf8'));
    for (const company of companies) {
      if (company && company.id) ensureCompanyDir(company.id);
    }
  } catch { /* ignore parse errors on corrupt file */ }
}

// ── Companies registry ─────────────────────────────────────────────────────
function readCompanies() {
  if (!fs.existsSync(COMPANIES_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(COMPANIES_FILE, 'utf8')); }
  catch { return []; }
}

function writeCompanies(data) {
  fs.writeFileSync(COMPANIES_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function getCompanyDir(companyId) {
  return path.join(DATA_DIR, companyId);
}

function ensureCompanyDir(companyId) {
  const dir = getCompanyDir(companyId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  for (const t of TABLES) {
    const file = path.join(dir, `${t}.json`);
    if (!fs.existsSync(file)) fs.writeFileSync(file, '[]', 'utf8');
  }
}

// ── Per-company table I/O ──────────────────────────────────────────────────
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

// ── Filter logic ───────────────────────────────────────────────────────────
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

// ── IPC: Company management ────────────────────────────────────────────────
ipcMain.handle('companies-list', async () => {
  try { return { data: readCompanies(), error: null }; }
  catch (e) { return { data: null, error: { message: e.message } }; }
});

ipcMain.handle('companies-create', async (_event, { name, address, hue }) => {
  try {
    const id = genId();
    const company = { id, name, address: address || '', hue: hue ?? 25, logo_ext: null, created_at: nowIso() };
    const companies = readCompanies();
    companies.push(company);
    writeCompanies(companies);
    ensureCompanyDir(id);
    return { data: company, error: null };
  } catch (e) { return { data: null, error: { message: e.message } }; }
});

ipcMain.handle('companies-update', async (_event, { id, ...patch }) => {
  try {
    const companies = readCompanies();
    const idx = companies.findIndex(c => c.id === id);
    if (idx < 0) return { data: null, error: { message: 'Company not found' } };
    companies[idx] = { ...companies[idx], ...patch };
    writeCompanies(companies);
    return { data: companies[idx], error: null };
  } catch (e) { return { data: null, error: { message: e.message } }; }
});

ipcMain.handle('companies-delete', async (_event, id) => {
  try {
    let companies = readCompanies();
    companies = companies.filter(c => c.id !== id);
    writeCompanies(companies);
    const dir = getCompanyDir(id);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    return { data: null, error: null };
  } catch (e) { return { data: null, error: { message: e.message } }; }
});

ipcMain.handle('companies-save-logo', async (_event, { companyId, ext, buffer }) => {
  try {
    const dir = getCompanyDir(companyId);
    fs.mkdirSync(dir, { recursive: true });
    // Remove old logo files
    for (const e of ['jpg', 'jpeg', 'png', 'webp', 'gif']) {
      const old = path.join(dir, `logo.${e}`);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    fs.writeFileSync(path.join(dir, `logo.${ext}`), Buffer.from(buffer));
    // Update company record
    const companies = readCompanies();
    const idx = companies.findIndex(c => c.id === companyId);
    if (idx >= 0) { companies[idx].logo_ext = ext; writeCompanies(companies); }
    return { data: { logo_ext: ext }, error: null };
  } catch (e) { return { data: null, error: { message: e.message } }; }
});

ipcMain.handle('companies-get-logo', async (_event, companyId) => {
  try {
    const companies = readCompanies();
    const company = companies.find(c => c.id === companyId);
    if (!company?.logo_ext) return { data: null, error: null };
    const logoPath = path.join(getCompanyDir(companyId), `logo.${company.logo_ext}`);
    if (!fs.existsSync(logoPath)) return { data: null, error: null };
    const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
    const mime = mimeMap[company.logo_ext] || 'image/jpeg';
    const b64 = fs.readFileSync(logoPath).toString('base64');
    return { data: `data:${mime};base64,${b64}`, error: null };
  } catch (e) { return { data: null, error: { message: e.message } }; }
});

// ── IPC: DB operations (per-company) ──────────────────────────────────────
ipcMain.handle('db-op', async (_event, desc) => {
  try {
    const { companyId, table, op } = desc;
    if (!companyId) return { data: null, error: { message: 'No companyId in request' } };
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
          id: item.id || genId(), ...item, created_at: ts, updated_at: ts,
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
            rows.push({ id: item.id || genId(), ...item, created_at: ts, updated_at: ts });
          }
        }
        writeTable(companyId, table, rows);
        return { data: null, error: null };
      }

      default:
        return { data: null, error: { message: `Unknown op: ${op}` } };
    }
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
});

// ── Window ─────────────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    title: 'HRMS — Multi-Company',
    show: false,
    backgroundColor: '#ffffff',
  });

  if (!app.isPackaged) {
    win.loadURL('http://127.0.0.1:5000');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  win.once('ready-to-show', () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('did-fail-load', () => {
    if (!app.isPackaged) {
      setTimeout(() => win.loadURL('http://127.0.0.1:5000'), 2000);
    }
  });
}

app.whenReady().then(() => {
  ensureDataDir();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
