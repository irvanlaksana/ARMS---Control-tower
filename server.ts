import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import { Readable } from 'stream';
import { authFor, isGoogleAuthAvailable, getServiceAccountEmail } from "./api/lib/googleAuth.ts";
import { buildGeneratorLink, GENERATOR_BASE_URL, GENERATOR_REPO_URL } from "./api/lib/generatorLink.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));

  // Enable CORS for VPS & external web app deployments
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // ---------------------------------------------------------------------------
  //  Mode hybrid (opsional): teruskan seluruh /api/* ke Web App Google Apps
  //  Script bila env GAS_WEB_APP_URL diset. Dengan begitu hosting statis
  //  (Netlify/Vercel/Express) tetap dipakai, sementara penyimpanan data &
  //  pengaturan berada di spreadsheet aktif milik Apps Script.
  //  Default: kosong -> perilaku server tidak berubah sama sekali.
  // ---------------------------------------------------------------------------
  const gasWebAppUrl = String(process.env.GAS_WEB_APP_URL || "").trim();
  const GAS_PATH_ACTION: Record<string, string> = {
    '/api/health': 'HEALTH',
    '/api/runtime': 'RUNTIME_INFO',
    '/api/sheets/setup': 'SHEETS_SETUP',
    '/api/sheets/sync': 'SHEETS_SYNC',
    '/api/sheets/fetch': 'SHEETS_FETCH',
    '/api/gas/proxy': 'GAS_PROXY',
    '/api/drive/status': 'DRIVE_STATUS',
    '/api/drive/file': 'DRIVE_FILE',
    '/api/drive/upload': 'DRIVE_UPLOAD',
    '/api/drive/create-folder': 'DRIVE_CREATE_FOLDER',
    '/api/drive/ensure-path': 'DRIVE_ENSURE_PATH',
    '/api/surat/create-issue': 'SURAT_CREATE_ISSUE',
    '/api/surat/open-generator': 'SURAT_OPEN_GENERATOR',
    '/api/settings/save': 'SETTINGS_SAVE',
    '/api/settings/load': 'SETTINGS_LOAD',
  };

  if (gasWebAppUrl) {
    app.use(async (req, res, next) => {
      const cleanPath = req.path.replace(/\/+$/, '');
      const action = GAS_PATH_ACTION[cleanPath];
      if (!action) return next();
      try {
        const upstream = await fetch(gasWebAppUrl, {
          method: 'POST',
          redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action,
            payload: { ...(req.query || {}), ...(req.body || {}), __path: cleanPath, __method: req.method },
          }),
        });
        const text = await upstream.text();
        let json: any;
        try {
          json = JSON.parse(text);
        } catch {
          return res.status(502).json({ success: false, error: `Apps Script merespon non-JSON: ${text.slice(0, 200)}` });
        }
        const status = Number(json?.httpStatus || (json?.success === false ? 500 : 200));
        return res.status(json?.success === false ? status : 200).json(json);
      } catch (err: any) {
        return res.status(502).json({ success: false, error: `Gagal meneruskan ke Apps Script: ${err?.message || err}` });
      }
    });
  }

  // Google API auth helper (Sheets & Drive) — dipakai bersama via ./api/lib/googleAuth.
  // Prioritas kredensial:
  //  1. GOOGLE_SERVICE_ACCOUNT_JSON  → inline JSON service account (Vercel/Cloud Run secret)
  //  2. GOOGLE_APPLICATION_CREDENTIALS → path file JSON service account (.env / host env)
  //  3. Tanpa kredensial → error jelas (tanpa percobaan metadata GCE yang bising).
  // Kredensial dibaca & divalidasi eksplisit di googleAuth.ts sehingga error ADC
  // ("Could not load the default credentials") tidak akan muncul lagi.

  // API Route: Health Check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      system: "ARMS - Control Tower Agency DC",
      database: gasWebAppUrl ? "Google Apps Script (spreadsheet aktif)" : "Google Sheets / Supabase",
      storage: "Google Drive",
      supabaseConfigured: Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY),
      gasProxy: Boolean(gasWebAppUrl),
      timestamp: new Date().toISOString(),
    });
  });

  // API Route: Runtime info (dipakai UI Pengaturan untuk menampilkan target
  // penyimpanan aktif — spreadsheet Apps Script atau server ini).
  app.get("/api/runtime", async (_req, res) => {
    if (gasWebAppUrl) {
      try {
        const upstream = await fetch(gasWebAppUrl, {
          method: "POST",
          redirect: "follow",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "RUNTIME_INFO", payload: {} }),
        });
        const json: any = await upstream.json();
        return res.json({ ...json, mode: json?.mode || "google-apps-script", via: "server-proxy" });
      } catch (err: any) {
        return res.json({
          success: false,
          mode: "google-apps-script",
          provider: "google-apps-script",
          error: `Gagal menghubungi Apps Script: ${err?.message || err}`,
        });
      }
    }

    res.json({
      success: true,
      mode: "server-api",
      provider: "server-api",
      database: "Google Sheets (Service Account) / Supabase",
      storage: "Google Drive (Service Account)",
      driveConfigured: isGoogleAuthAvailable(),
      serviceAccountEmail: isGoogleAuthAvailable() ? getServiceAccountEmail() : null,
      supabaseConfigured: Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY),
      settingsTab: "Settings",
      timestamp: new Date().toISOString(),
    });
  });

  // Spreadsheet sync lokal (CSV) — tidak memakai Google Sheets API.
  // Setiap tab disimpan sebagai file CSV di storage/spreadsheets/<id>/<tab>.csv.
  // Format ini bisa dibuka langsung oleh Excel, LibreOffice, atau diimpor ke Google Sheets.
  const spreadsheetRoot = path.join(process.cwd(), 'storage', 'spreadsheets');
  const defaultTabs: Record<string, string> = {
    users: 'Users', clients: 'Clients', personnel: 'Personnel', services: 'Services', fees: 'Fees',
    contracts: 'Contracts', leads: 'Leads', customers: 'Customers', cases: 'Cases', assignments: 'Assignments',
    sks: 'SK', lawyerNotices: 'Lawyer_Notices', commLogs: 'Communication_Log', assets: 'Assets',
    collections: 'Collections', assetRecoveries: 'Asset_Recoveries', payments: 'Payments', danaTalangan: 'Funding',
    expenses: 'Expenses', settlements: 'Settlements', ledger: 'Ledger', cashAccounts: 'Cash', pettyCash: 'Petty_Cash',
    workingCapital: 'Working_Capital', documents: 'Documents', driveFolders: 'Drive_Folders', approvals: 'Approvals',
    notifications: 'Notifications', auditLogs: 'Audit_Log', settings: 'Settings'
  };

  const safePart = (value: unknown) => String(value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  const csvEscape = (value: unknown) => {
    if (value === undefined || value === null) return '';
    const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csvParse = (text: string): string[][] => {
    const rows: string[][] = [];
    let row: string[] = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i], next = text[i + 1];
      if (quoted && c === '"' && next === '"') { cell += '"'; i++; continue; }
      if (c === '"') { quoted = !quoted; continue; }
      if (!quoted && c === ',') { row.push(cell); cell = ''; continue; }
      if (!quoted && (c === '\n' || c === '\r')) {
        if (c === '\r' && next === '\n') i++;
        row.push(cell); cell = '';
        if (row.some(Boolean)) rows.push(row);
        row = []; continue;
      }
      cell += c;
    }
    if (cell || row.length) { row.push(cell); if (row.some(Boolean)) rows.push(row); }
    return rows;
  };
  const parseCell = (value: string): unknown => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (/^[{[]/.test(value)) { try { return JSON.parse(value); } catch { /* plain text */ } }
    return value;
  };
  const resolveTab = (key: string, tabs?: Record<string, unknown>) => safePart((tabs && tabs[key]) || defaultTabs[key] || key);
  const workbookDir = (id: unknown) => path.join(spreadsheetRoot, safePart(id));

  // ---------------------------------------------------------------------------
  //  Codec Settings + Blob store — identik dengan `appsscript/Db.gs` sehingga
  //  spreadsheet aktif dapat dibaca/ditulis dari backend mana pun.
  // ---------------------------------------------------------------------------
  const BLOB_TAB = 'Blob_Store';
  const BLOB_PREFIX = '@@arms_blob:';
  const CELL_SAFE_LIMIT = 40000;
  const CHUNK_SUFFIX = '__chunk';
  const SETTINGS_JSON_KEYS = ['databaseConfig'];
  const SETTINGS_BOOL_KEYS = ['autoSyncWithGoogleSheets'];
  const SETTINGS_NUM_KEYS = ['defaultFeePercent', 'defaultCompanyCommissionSplitPercent'];

  const cellToString = (value: unknown): string => {
    if (value === undefined || value === null) return '';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') {
      try { return JSON.stringify(value); } catch { return String(value); }
    }
    return String(value);
  };

  const parseSettingsValue = (key: string, rawValue: unknown): unknown => {
    const text = rawValue === undefined || rawValue === null ? '' : String(rawValue);
    if (SETTINGS_BOOL_KEYS.includes(key)) return text === 'true' || text === '1';
    if (SETTINGS_NUM_KEYS.includes(key)) {
      const num = Number(text);
      return Number.isNaN(num) ? 0 : num;
    }
    if (SETTINGS_JSON_KEYS.includes(key) || /^[[{]/.test(text.trim())) {
      try { return JSON.parse(text); } catch { return text; }
    }
    return text;
  };

  /** Object settings -> baris key/value (nilai panjang dipecah jadi __chunkN). */
  const settingsRowsFromObject = (settings: Record<string, unknown>) => {
    const now = new Date().toISOString();
    const rows: Array<{ key: string; value: string; updatedAt: string; note: string }> = [];
    Object.keys(settings || {}).forEach((key) => {
      const value = settings[key];
      if (value === undefined) return;
      const text = cellToString(value);
      const note = value !== null && typeof value === 'object' ? 'json' : typeof value;
      if (text.length <= CELL_SAFE_LIMIT) {
        rows.push({ key, value: text, updatedAt: now, note });
        return;
      }
      const total = Math.ceil(text.length / CELL_SAFE_LIMIT);
      for (let i = 0; i < total; i++) {
        rows.push({
          key: i === 0 ? key : `${key}${CHUNK_SUFFIX}${i + 1}`,
          value: text.slice(i * CELL_SAFE_LIMIT, (i + 1) * CELL_SAFE_LIMIT),
          updatedAt: now,
          note: `chunk ${i + 1}/${total} of ${key}`,
        });
      }
    });
    return rows;
  };

  /** Baris key/value -> object settings (chunk digabung & tipe dipulihkan). */
  const settingsObjectFromRows = (rows: Array<Record<string, unknown>>) => {
    const merged: Record<string, string> = {};
    const order: string[] = [];
    rows.forEach((row) => {
      const key = String(row?.key ?? '').trim();
      if (!key) return;
      const text = cellToString(row?.value);
      const chunkIdx = key.indexOf(CHUNK_SUFFIX);
      if (chunkIdx !== -1) {
        const base = key.slice(0, chunkIdx);
        merged[base] = String(merged[base] ?? '') + text;
        if (!order.includes(base)) order.push(base);
        return;
      }
      if (merged[key] === undefined) order.push(key);
      merged[key] = text;
    });
    const out: Record<string, unknown> = {};
    order.forEach((key) => { out[key] = parseSettingsValue(key, merged[key]); });
    return out;
  };

  /** Ganti sel yang melewati batas karakter dengan referensi Blob_Store. */
  const encodeLongCells = (rows: string[][], blobs: Record<string, string>, tag: string) => {
    let seq = 0;
    return rows.map((row) => row.map((cell) => {
      const text = String(cell ?? '');
      if (text.length <= CELL_SAFE_LIMIT) return text;
      const blobId = `BLB-${tag}-${Date.now().toString(36)}-${++seq}`;
      blobs[blobId] = text;
      return BLOB_PREFIX + blobId;
    }));
  };

  const persistBlobs = async (sheets: any, spreadsheetId: string, blobTab: string, blobs: Record<string, string>) => {
    const ids = Object.keys(blobs);
    if (!ids.length) return;
    const rows: string[][] = [['blobId', 'chunk', 'value']];
    ids.forEach((id) => {
      const text = String(blobs[id]);
      for (let i = 0, chunk = 0; i < text.length; i += CELL_SAFE_LIMIT, chunk++) {
        rows.push([id, String(chunk), text.slice(i, i + CELL_SAFE_LIMIT)]);
      }
    });
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${blobTab}!A1`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: rows },
      });
    } catch (err: any) {
      console.warn('Gagal menyimpan blob panjang ke', blobTab, err?.message || err);
    }
  };

  const loadBlobMap = async (sheets: any, spreadsheetId: string, blobTab: string) => {
    const map: Record<string, string> = {};
    try {
      const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${blobTab}!A:C` });
      const rows: string[][] = (response.data.values || []) as string[][];
      rows.slice(1).forEach((row) => {
        const id = String(row?.[0] ?? '');
        if (!id) return;
        map[id] = (map[id] || '') + String(row?.[2] ?? '');
      });
    } catch {
      /* tab Blob_Store belum ada */
    }
    return map;
  };

  const decodeBlobRefs = (rows: any[][]) => {
    const hasRef = rows.some((row) => row.some((cell) => typeof cell === 'string' && cell.indexOf(BLOB_PREFIX) === 0));
    return hasRef;
  };

  const resolveBlobCell = (cell: unknown, blobMap: Record<string, string>) => {
    const text = typeof cell === 'string' ? cell : '';
    if (text.indexOf(BLOB_PREFIX) === 0) return blobMap[text.slice(BLOB_PREFIX.length)] ?? '';
    return cell;
  };

  app.post('/api/sheets/setup', async (req, res) => {
    try {
      const { spreadsheetId, tabs } = req.body || {};
      if (!spreadsheetId) {
        return res.status(400).json({ error: 'Missing spreadsheetId' });
      }

      const auth = authFor([
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
      ]);
      const sheets = google.sheets({ version: 'v4', auth });
      
      const tabMap = { ...defaultTabs, ...(tabs || {}) } as Record<string, string>;
      // Tab Blob_Store menampung nilai panjang (mis. foto base64) yang melewati
      // batas 50.000 karakter per sel — sama seperti backend Apps Script.
      const requiredTabs = Array.from(new Set([...Object.values(tabMap), BLOB_TAB]));

      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
      const existingSheets = (spreadsheet.data.sheets || []).map(s => s.properties?.title);

      const requests: any[] = [];
      requiredTabs.forEach(tab => {
        if (!existingSheets.includes(tab)) {
          requests.push({
            addSheet: { properties: { title: tab } }
          });
        }
      });

      if (requests.length > 0) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: { requests }
        });
      }

      return res.json({
        success: true,
        spreadsheetId,
        message: `Successfully verified/created all ${requiredTabs.length} sheets in Google Spreadsheet!`,
        sheets: requiredTabs,
      });
    } catch (err: any) {
      console.error('Sheets Setup Error:', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to setup Google Sheets.' });
    }
  });

  app.post('/api/sheets/sync', async (req, res) => {
    try {
      const { spreadsheetId, data, tabs } = req.body || {};
      if (!spreadsheetId || !data) {
        return res.status(400).json({ error: 'Missing spreadsheetId or data' });
      }

      const auth = authFor(['https://www.googleapis.com/auth/spreadsheets']);
      const sheets = google.sheets({ version: 'v4', auth });

      const tabMap = { ...defaultTabs, ...(tabs || {}) } as Record<string, string>;
      const updatedTabs: string[] = [];
      const counts: Record<string, number> = {};
      const warnings: string[] = [];

      const keys = Object.keys(data);
      for (const key of keys) {
        const tabName = tabMap[key] || key;
        const records = data[key];

        // ---- Pengaturan sistem & branding profile -> tab Settings (key/value)
        if (key === 'settings' && records && typeof records === 'object' && !Array.isArray(records)) {
          const settingsRows = settingsRowsFromObject(records as Record<string, unknown>);
          const values = [['key', 'value', 'updatedAt', 'note'], ...settingsRows.map((r) => [r.key, r.value, r.updatedAt, r.note])];
          await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${tabName}!A:D` }).catch(() => undefined);
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${tabName}!A1`,
            valueInputOption: 'RAW',
            requestBody: { values },
          });
          updatedTabs.push(tabName);
          counts[key] = settingsRows.length;
          continue;
        }

        if (!Array.isArray(records)) {
          warnings.push(`Collection "${key}" dilewati karena bukan array.`);
          continue;
        }

        // ---- Tab kosong: bersihkan isi lama agar penghapusan data ikut tersinkron
        if (records.length === 0) {
          await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${tabName}!A:ZZ` }).catch(() => undefined);
          updatedTabs.push(tabName);
          counts[key] = 0;
          continue;
        }

        // ---- Header = gabungan seluruh key (bukan hanya key baris pertama)
        const headers: string[] = [];
        const seenHeaders: Record<string, boolean> = {};
        records.forEach((record: any) => {
          Object.keys(record || {}).forEach((field) => {
            if (!seenHeaders[field]) {
              seenHeaders[field] = true;
              headers.push(field);
            }
          });
        });
        if (!headers.length) headers.push('value');

        const bodyRows = records.map((r: any) => headers.map((h) => cellToString(r?.[h])));
        const blobs: Record<string, string> = {};
        const safeRows = encodeLongCells([headers, ...bodyRows], blobs, safePart(tabName));

        await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${tabName}!A:ZZ` }).catch(() => undefined);
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${tabName}!A1`,
          valueInputOption: 'RAW',
          requestBody: { values: safeRows },
        });
        await persistBlobs(sheets, spreadsheetId, tabMap.blobStore || BLOB_TAB, blobs);

        updatedTabs.push(tabName);
        counts[key] = records.length;
      }

      return res.json({
        success: true,
        updatedTabs,
        counts,
        warnings,
        totalItems: keys.reduce((acc, k) => acc + (counts[k] || 0), 0),
        syncedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Sheets Sync Error:', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message || 'Error syncing to Google Sheets' });
    }
  });

  app.post('/api/sheets/fetch', async (req, res) => {
    try {
      const { spreadsheetId, tabs } = req.body || {};
      if (!spreadsheetId) {
        return res.status(400).json({ error: 'Missing spreadsheetId' });
      }

      const auth = authFor(['https://www.googleapis.com/auth/spreadsheets.readonly']);
      const sheets = google.sheets({ version: 'v4', auth });

      const tabMap = { ...defaultTabs, ...(tabs || {}) } as Record<string, string>;
      const data: Record<string, any> = {};

      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
      const existingSheets = (spreadsheet.data.sheets || []).map(s => s.properties?.title);

      let blobMap: Record<string, string> | null = null;

      for (const [key, defaultTab] of Object.entries(tabMap)) {
        const tab = tabMap[key] || defaultTab;
        if (!existingSheets.includes(tab)) continue;

        try {
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${tab}!A:ZZ`,
          });

          const rows = (response.data.values || []) as any[][];
          if (rows.length === 0) continue;
          const headers = (rows.shift() || []).map((h: unknown) => String(h ?? '').trim());
          if (headers.length === 0) continue;

          if (decodeBlobRefs(rows)) {
            if (blobMap === null) blobMap = await loadBlobMap(sheets, spreadsheetId, tabMap.blobStore || BLOB_TAB);
          }

          const records = rows
            .filter((row: any[]) => row.some((cell) => cell !== '' && cell !== null && cell !== undefined))
            .map((row: any[]) => {
              const record: Record<string, unknown> = {};
              headers.forEach((header: string, i: number) => {
                if (!header) return;
                const cell = blobMap ? resolveBlobCell(row[i], blobMap) : row[i];
                record[header] = cell === undefined || cell === null ? '' : cell;
              });
              return record;
            });

          // Tab kosong dilewati agar data lokal tidak tertimpa array kosong.
          if (records.length === 0) continue;

          if (key === 'settings') {
            data.settings = settingsObjectFromRows(records);
            continue;
          }
          data[key] = records;
        } catch (e: any) {
          console.warn(`Failed to fetch tab ${tab}: ${e.message}`);
        }
      }

      return res.json({ success: true, data, provider: gasWebAppUrl ? 'google-apps-script' : 'google-sheets', fetchedAt: new Date().toISOString() });
    } catch (err: any) {
      console.error('Sheets Fetch Error:', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed reading from Google Sheets' });
    }
  });

  // API Route: Simpan pengaturan (Branding Profile + konfigurasi GDrive) ke
  // tab Settings pada spreadsheet aktif. Setara action SETTINGS_SAVE di Apps Script.
  app.post('/api/settings/save', async (req, res) => {
    try {
      const { spreadsheetId, settings } = req.body || {};
      if (!spreadsheetId || !settings || typeof settings !== 'object') {
        return res.status(400).json({ success: false, error: 'Missing spreadsheetId or settings' });
      }

      const auth = authFor(['https://www.googleapis.com/auth/spreadsheets']);
      const sheets = google.sheets({ version: 'v4', auth });
      const tabName = String((req.body?.tabs?.settings) || 'Settings');

      // Merge dengan key lain yang sudah tersimpan di tab Settings.
      let existing: Record<string, unknown> = {};
      try {
        const current = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tabName}!A:B` });
        const rows = ((current.data.values || []) as any[][]).slice(1).filter((r) => r && r[0]);
        existing = settingsObjectFromRows(rows.map((r) => ({ key: r[0], value: r[1] })));
      } catch {
        /* tab belum ada */
      }

      const combined = { ...existing, ...settings };
      const settingsRows = settingsRowsFromObject(combined);
      const values = [['key', 'value', 'updatedAt', 'note'], ...settingsRows.map((r) => [r.key, r.value, r.updatedAt, r.note])];

      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
      const existingSheets = (spreadsheet.data.sheets || []).map((sh) => sh.properties?.title);
      if (!existingSheets.includes(tabName)) {
        await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{ addSheet: { properties: { title: tabName } } }] } });
      }

      await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${tabName}!A:D` }).catch(() => undefined);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tabName}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values },
      });

      return res.json({
        success: true,
        savedKeys: Object.keys(settings).length,
        totalKeys: settingsRows.length,
        settings: combined,
        spreadsheetId,
        spreadsheetName: spreadsheet.data.properties?.title || '',
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        tab: tabName,
        savedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Settings Save Error:', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message || 'Gagal menyimpan pengaturan ke spreadsheet aktif.' });
    }
  });

  // API Route: Baca pengaturan dari tab Settings spreadsheet aktif.
  app.post('/api/settings/load', async (req, res) => {
    try {
      const { spreadsheetId } = req.body || {};
      if (!spreadsheetId) {
        return res.status(400).json({ success: false, error: 'Missing spreadsheetId' });
      }
      const tabName = String((req.body?.tabs?.settings) || 'Settings');

      const auth = authFor(['https://www.googleapis.com/auth/spreadsheets.readonly']);
      const sheets = google.sheets({ version: 'v4', auth });
      const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tabName}!A:B` });
      const rows = ((response.data.values || []) as any[][]).slice(1).filter((r) => r && r[0]);
      const settings = settingsObjectFromRows(rows.map((r) => ({ key: r[0], value: r[1] })));

      return res.json({
        success: true,
        settings,
        count: Object.keys(settings).length,
        spreadsheetId,
        tab: tabName,
        loadedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Settings Load Error:', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message || 'Gagal membaca pengaturan dari spreadsheet aktif.' });
    }
  });

  // API Route: Google Apps Script Web App Proxy
  app.post("/api/gas/proxy", async (req, res) => {
    try {
      let { webAppUrl, googleSpreadsheetId, action, tab, payload, data, auditInfo } = req.body;
      if (!webAppUrl) {
        return res.status(400).json({ success: false, error: "Missing webAppUrl" });
      }

      webAppUrl = webAppUrl.trim();

      if (webAppUrl.endsWith("/dev")) {
        return res.status(400).json({
          success: false,
          error: "URL berakhiran /dev membutuhkan login Google. Gunakan URL Web App resmi berakhiran /exec dari menu Deploy -> New deployment.",
        });
      }

      const spreadsheetId = googleSpreadsheetId || data?.settings?.googleSpreadsheetId;
      const postPayload = JSON.stringify({ action, tab, payload, data, auditInfo, googleSpreadsheetId: spreadsheetId, spreadsheetId });

      // Step 1: Send POST request to Google Apps Script.
      let response = await fetch(webAppUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: postPayload,
        redirect: "follow",
      });

      // Step 2: Fallback manual redirect handling if status is 301/302/307/308
      if (response.status === 301 || response.status === 302 || response.status === 307 || response.status === 308) {
        const redirectUrl = response.headers.get("location");
        if (redirectUrl) {
          response = await fetch(redirectUrl, {
            method: "GET",
          });
        }
      }

      const text = await response.text();
      let jsonRes;
      try {
        jsonRes = JSON.parse(text);
      } catch {
        // Handle non-JSON HTML response from Google
        if (text.includes("The page") || text.includes("<html") || text.includes("<!DOCTYPE") || text.includes("Google Accounts")) {
          return res.status(400).json({
            success: false,
            error: "Google Apps Script mengembalikan halaman HTML/Akses Ditolak.\n\nPastikan Web App disebarkan (Deploy) dengan pengaturan:\n1. Execute as: Me (Saya)\n2. Who has access: Anyone (Siapa saja)\n3. Gunakan URL berakhiran /exec",
          });
        }
        return res.status(400).json({
          success: false,
          error: `Respon dari Google Apps Script tidak valid: ${text.slice(0, 150)}`,
        });
      }

      if (jsonRes.success === false) {
        return res.status(400).json(jsonRes);
      }

      return res.json(jsonRes);
    } catch (err: any) {
      console.error("GAS Proxy Error:", err?.message || err);
      res.status(500).json({
        success: false,
        error: err?.message || "Gagal berkomunikasi dengan Web App Google Apps Script.",
      });
    }
  });

  // API Route: Google Drive Status
  app.get('/api/drive/status', (_req, res) => {
    const configured = isGoogleAuthAvailable();
    const serviceAccountEmail = configured ? getServiceAccountEmail() : null;
    res.json({
      status: 'ok',
      service: 'Google Drive Storage',
      configured,
      serviceAccountEmail,
      instructions: configured
        ? 'Google Drive Service Account aktif.'
        : 'Google Drive belum dikonfigurasi. Tambahkan GOOGLE_SERVICE_ACCOUNT_JSON di Vercel atau .env.',
    });
  });

  // -------------------------------------------------------------------------
  //  API Route: Proxy baca berkas Google Drive (dipakai preview media SEMUA modul)
  //  GET /api/drive/file?fileId=<id>&name=<opsional>&mode=binary|json
  //  • mode=binary (default): stream berkas apa adanya (Content-Type asli),
  //    sehingga <img>/<iframe>/<video> bisa memakainya langsung.
  //  • mode=json: kembalikan { base64, mimeType, name, size } — dipakai saat
  //    backend berjalan di Google Apps Script ( DRIVE_FILE ).
  // -------------------------------------------------------------------------
  const GOOGLE_NATIVE_EXPORT: Record<string, { mime: string; ext: string }> = {
    'application/vnd.google-apps.document': { mime: 'application/pdf', ext: 'pdf' },
    'application/vnd.google-apps.spreadsheet': { mime: 'application/pdf', ext: 'pdf' },
    'application/vnd.google-apps.presentation': { mime: 'application/pdf', ext: 'pdf' },
    'application/vnd.google-apps.drawing': { mime: 'image/png', ext: 'png' },
  };

  app.get('/api/drive/file', async (req, res) => {
    const fileId = String((req.query.fileId as string) || '').trim();
    const mode = String((req.query.mode as string) || 'binary').trim().toLowerCase();
    const requestedName = String((req.query.name as string) || '').trim();

    if (!fileId) {
      return res.status(400).json({ success: false, error: 'Parameter fileId wajib diisi' });
    }
    if (!isGoogleAuthAvailable()) {
      return res.status(200).json({
        success: false,
        configured: false,
        fileId,
        error: 'Google Drive Service Account belum dikonfigurasi. Tambahkan GOOGLE_SERVICE_ACCOUNT_JSON di Vercel atau .env.',
        hint: 'Preview tetap bisa memakai tautan publik Google Drive (tombol "Google Drive").',
      });
    }

    try {
      const auth = authFor(['https://www.googleapis.com/auth/drive.readonly']);
      const drive = google.drive({ version: 'v3', auth });

      const meta = await drive.files.get({
        fileId,
        supportsAllDrives: true,
        fields: 'id, name, mimeType, size, webViewLink',
      });
      const mimeType = String(meta.data.mimeType || 'application/octet-stream');
      const baseName = requestedName || String(meta.data.name || fileId);
      const sizeBytes = Number(meta.data.size || 0);

      // Berkas Google Docs native -> export ke PDF/PNG
      const native = GOOGLE_NATIVE_EXPORT[mimeType];
      const isNativeGoogle = Boolean(native) || mimeType.startsWith('application/vnd.google-apps.');

      const inlineName = native ? `${baseName.replace(/\.[a-z0-9]+$/i, '')}.${native.ext}` : baseName;
      const outMime = native ? native.mime : mimeType;

      if (mode === 'json') {
        const payload: any = isNativeGoogle
          ? await drive.files.export(
              { fileId, mimeType: native?.mime || 'application/pdf' } as any,
              { responseType: 'arraybuffer' } as any
            )
          : await drive.files.get(
              { fileId, supportsAllDrives: true, alt: 'media' } as any,
              { responseType: 'arraybuffer' } as any
            );
        const buf = Buffer.from(payload.data);
        return res.json({
          success: true,
          configured: true,
          fileId,
          name: inlineName,
          mimeType: outMime,
          size: buf.length,
          webViewLink: meta.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
          base64: buf.toString('base64'),
        });
      }

      const stream: any = isNativeGoogle
        ? await drive.files.export(
            { fileId, mimeType: native?.mime || 'application/pdf' } as any,
            { responseType: 'stream' } as any
          )
        : await drive.files.get(
            { fileId, supportsAllDrives: true, alt: 'media' } as any,
            { responseType: 'stream' } as any
          );

      res.setHeader('Content-Type', outMime);
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.setHeader('Content-Disposition', `inline; filename="${inlineName.replace(/"/g, '')}"`);
      if (sizeBytes) res.setHeader('Content-Length', String(sizeBytes));
      stream.data.pipe(res);
    } catch (err: any) {
      const status = Number(err?.code || err?.response?.status || 500);
      const rawError = String(err?.message || err);
      console.error('Drive File Proxy Error:', rawError);
      return res.status(status >= 400 && status < 600 ? status : 500).json({
        success: false,
        configured: true,
        fileId,
        error: rawError.includes('File not found')
          ? 'Berkas tidak ditemukan di Google Drive (mungkin dihapus atau dipindahkan).'
          : rawError,
      });
    }
  });

  // API Route: Upload file to Google Drive (Service Account)
  // Expects JSON body: { fileName, mimeType, base64, folderId (optional) }
  app.post('/api/drive/upload', async (req, res) => {
    try {
      const { fileName, mimeType, base64, folderId } = req.body || {};
      if (!fileName || !base64) {
        return res.status(400).json({ success: false, error: 'Missing fileName or base64 payload' });
      }

      if (!isGoogleAuthAvailable()) {
        return res.status(200).json({
          success: false,
          configured: false,
          error: 'Google Drive Service Account belum dikonfigurasi. Tambahkan GOOGLE_SERVICE_ACCOUNT_JSON di Vercel atau .env.',
        });
      }

      const auth = authFor(['https://www.googleapis.com/auth/drive']);
      const drive = google.drive({ version: 'v3', auth });

      // Strip data URL prefix if present
      const dataUrlMatch = String(base64).match(/^data:(.+);base64,(.*)$/);
      const rawBase64 = dataUrlMatch ? dataUrlMatch[2] : base64;
      const buffer = Buffer.from(rawBase64, 'base64');

      const media = {
        mimeType: mimeType || 'application/octet-stream',
        body: Readable.from(buffer),
      } as any;

      const fileMetadata: any = { name: fileName };
      if (folderId) fileMetadata.parents = [folderId];

      const created = await drive.files.create({
        supportsAllDrives: true,
        requestBody: fileMetadata,
        media,
        fields: 'id, name, webViewLink, webContentLink',
      });

      const fileId = created.data.id;
      const webViewLink = created.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
      const directViewUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

      try {
        await drive.permissions.create({
          supportsAllDrives: true,
          fileId: fileId as string,
          requestBody: { role: 'reader', type: 'anyone' },
        });
      } catch {
        // ignore permission warning
      }

      res.json({ success: true, configured: true, fileId, webViewLink, directViewUrl });
    } catch (err: any) {
      console.error('Drive Upload Error:', err?.message || err);
      const rawError = String(err?.message || err);
      let userFriendlyError = rawError;

      if (rawError.includes('Service Accounts do not have storage quota')) {
        userFriendlyError = 'Google Drive Service Account memerlukan Google Workspace Shared Drive (Drive Bersama) untuk unggah berkas fisik. Foto tetap tersimpan di database lokal/cloud.';
      }

      res.status(200).json({
        success: false,
        configured: true,
        quotaLimited: rawError.includes('Service Accounts do not have storage quota'),
        error: userFriendlyError,
      });
    }
  });

  // API Route: Create a folder (or subfolder) in Google Drive
  // Expects JSON body: { name, parentId (optional) }
  app.post('/api/drive/create-folder', async (req, res) => {
    try {
      const { name, parentId } = req.body || {};
      if (!name || !String(name).trim()) {
        return res.status(400).json({ success: false, error: 'Missing folder name' });
      }

      if (!isGoogleAuthAvailable()) {
        return res.status(200).json({
          success: false,
          configured: false,
          error: 'Google Drive Service Account belum dikonfigurasi. Tambahkan GOOGLE_SERVICE_ACCOUNT_JSON di Vercel atau .env.',
        });
      }

      const auth = authFor(['https://www.googleapis.com/auth/drive']);
      const drive = google.drive({ version: 'v3', auth });

      const fileMetadata: any = {
        name: String(name).trim(),
        mimeType: 'application/vnd.google-apps.folder',
      };
      if (parentId) fileMetadata.parents = [parentId];

      const created = await drive.files.create({
        supportsAllDrives: true,
        requestBody: fileMetadata,
        fields: 'id, webViewLink, name',
      });

      const folderId = created.data.id as string;
      res.json({
        success: true,
        configured: true,
        folderId,
        name: created.data.name || String(name).trim(),
        webViewLink: `https://drive.google.com/drive/folders/${folderId}?usp=sharing`,
      });
    } catch (err: any) {
      console.error('Drive Create Folder Error:', err?.message || err);
      const rawError = String(err?.message || err);
      let userFriendlyError = rawError;

      if (rawError.includes('File not found') || rawError.includes('notFound')) {
        userFriendlyError = 'Folder master Google Drive tidak ditemukan atau belum dibagikan (share) dengan email Service Account.';
      } else if (rawError.includes('The user does not have sufficient permissions') || rawError.includes('insufficientPermissions')) {
        userFriendlyError = 'Izin tidak cukup. Pastikan email Service Account diberi hak akses Editor pada folder master.';
      } else if (rawError.includes('Service Accounts do not have storage quota')) {
        userFriendlyError = 'Service Account Google Drive memerlukan folder di dalam Google Workspace Shared Drive (Drive Bersama).';
      }

      res.status(200).json({ success: false, error: userFriendlyError });
    }
  });

  // API Route: Ensure a nested folder structure exists in Google Drive.
  // Expects JSON body: { path: string[], rootId (optional) }
  // Finds existing folders by name under each parent, else creates them.
  app.post('/api/drive/ensure-path', async (req, res) => {
    try {
      const { path, rootId } = req.body || {};
      if (!Array.isArray(path) || path.filter(Boolean).length === 0) {
        return res.status(200).json({ success: false, error: 'Missing path (array of folder names)' });
      }

      if (!isGoogleAuthAvailable()) {
        return res.status(200).json({
          success: false,
          configured: false,
          error: 'Google Drive Service Account belum dikonfigurasi. Tambahkan GOOGLE_SERVICE_ACCOUNT_JSON di Vercel atau .env.',
        });
      }

      const auth = authFor(['https://www.googleapis.com/auth/drive']);
      const drive = google.drive({ version: 'v3', auth });

      let currentParentId: string | undefined = rootId || undefined;
      const created: Array<{ name: string; folderId: string; webViewLink: string }> = [];
      let lastFolderId = currentParentId || '';
      let lastWebViewLink = currentParentId ? `https://drive.google.com/drive/folders/${currentParentId}?usp=sharing` : '';

      for (const rawName of path) {
        const name = String(rawName).trim();
        if (!name) continue;

        let existingId: string | undefined;
        if (currentParentId) {
          const query = `name = '${name.replace(/'/g, "\\'")}' and '${currentParentId}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`;
          try {
            const list = await drive.files.list({
              supportsAllDrives: true,
              includeItemsFromAllDrives: true,
              corpora: 'allDrives',
              q: query,
              fields: 'files(id, name)',
              pageSize: 1,
            });
            existingId = list.data.files?.[0]?.id;
          } catch {
            try {
              const list = await drive.files.list({
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
                q: query,
                fields: 'files(id, name)',
                pageSize: 1,
              });
              existingId = list.data.files?.[0]?.id;
            } catch (searchErr) {
              console.warn('Drive folder search failed, will create:', String(searchErr));
            }
          }
        }

        let folderId = existingId;
        if (!folderId) {
          const fileMetadata: any = {
            name,
            mimeType: 'application/vnd.google-apps.folder',
          };
          if (currentParentId) fileMetadata.parents = [currentParentId];
          const createdFile = await drive.files.create({
            supportsAllDrives: true,
            requestBody: fileMetadata,
            fields: 'id, webViewLink, name',
          });
          folderId = createdFile.data.id as string;
          created.push({
            name,
            folderId,
            webViewLink: `https://drive.google.com/drive/folders/${folderId}?usp=sharing`,
          });
        }

        currentParentId = folderId;
        lastFolderId = folderId;
        lastWebViewLink = `https://drive.google.com/drive/folders/${folderId}?usp=sharing`;
      }

      if (!lastFolderId) {
        return res.status(200).json({ success: false, error: 'No folder could be created. Check root folder permission.' });
      }

      res.status(200).json({
        success: true,
        folderId: lastFolderId,
        webViewLink: lastWebViewLink,
        created,
      });
    } catch (err: any) {
      console.error('Drive Ensure Path Error:', err?.message || err);
      const rawError = String(err?.message || err);
      let userFriendlyError = rawError;

      if (rawError.includes('File not found') || rawError.includes('notFound')) {
        userFriendlyError = 'Folder master Google Drive tidak ditemukan atau belum dibagikan (share) dengan email Service Account.';
      } else if (rawError.includes('The user does not have sufficient permissions') || rawError.includes('insufficientPermissions')) {
        userFriendlyError = 'Izin tidak cukup. Pastikan email Service Account diberi hak akses Editor pada folder master.';
      } else if (rawError.includes('Service Accounts do not have storage quota')) {
        userFriendlyError = 'Service Account Google Drive memerlukan folder di dalam Google Workspace Shared Drive (Drive Bersama).';
      }

      res.status(200).json({ success: false, error: userFriendlyError });
    }
  });

  // API Route: Create GitHub Issue di repo generator-surat- untuk sync SK / Debtor & Personnel data
  app.post('/api/surat/create-issue', async (req, res) => {
    try {
      const githubToken = process.env.GITHUB_TOKEN;
      if (!githubToken) {
        return res.status(500).json({ success: false, error: 'Server misconfigured: GITHUB_TOKEN not set. Set the GITHUB_TOKEN environment variable.' });
      }

      const { skNumber, skId, debtor, personnel, driveDocumentUrl } = req.body || {};
      if (!debtor || !personnel) {
        return res.status(400).json({ success: false, error: 'Missing debtor or personnel data in request body' });
      }

      const repoOwner = 'irvanlaksana';
      /** Repo generator surat web: https://github.com/irvanlaksana/generator-surat- */
      const repoName = 'generator-surat-';
      const generatorLink = buildGeneratorLink(req.body || {});
      const issueTitle = `SK: ${skNumber || skId || 'new'} - ${debtor.debtorName || debtor.name || 'Debtor'}`;

      const issueBody = `Auto-synced from ARMS - Control Tower\n\n**SK ID / Number:** ${skId || skNumber || ''}\n\n**Debtor (case data):**\n\n\n\`
${JSON.stringify(debtor, null, 2)}
\`
\n**Personnel (penerima tugas):**\n\n\n\
${JSON.stringify(personnel, null, 2)}
\n**Drive Document URL (if any):** ${driveDocumentUrl || ''}\n\n**Generator link (payload LetterData + BastData):** ${generatorLink.url.slice(0, 4000)}\n\n**Payload JSON:**\n\n\`\`\`json\n${JSON.stringify(generatorLink.payload, null, 2).slice(0, 12000)}\n\`\`\`\n\n---\n*(This issue was created automatically by ARMS - Control Tower to seed generator-surat- with debtor & personnel data.)*`;

      const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/issues`;

      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'User-Agent': 'ARMS-Control-Tower'
        },
        body: JSON.stringify({ title: issueTitle, body: issueBody })
      });

      const json = await resp.json();
      if (!resp.ok) {
        console.error('GitHub API error:', json);
        return res.status(resp.status).json({ success: false, error: json.message || 'GitHub API error', details: json });
      }

      return res.json({ success: true, issueUrl: json.html_url, issueNumber: json.number });
    } catch (err: any) {
      console.error('Create Issue Error:', err?.message || err);
      const cause = err?.cause?.message || '';
      res.status(500).json({
        success: false,
        error: `${err?.message || 'Failed creating GitHub issue'}${cause ? ` (${cause})` : ''}. Pastikan server bisa mengakses api.github.com dan GITHUB_TOKEN valid.`,
      });
    }
  });

  // -------------------------------------------------------------------------
  //  API Route: Tautan generator surat web
  //  Target: https://generator-surat-beige.vercel.app/ (repo irvanlaksana/generator-surat-)
  //  Payload mengikuti model LetterData (tab Surat Tugas) + BastData (tab BAST).
  //  Body boleh berupa payload jadi dari frontend ({ payload: {...} }) atau
  //  data mentah { skNumber, skId, debtor, personnel, driveDocumentUrl, ... }.
  // -------------------------------------------------------------------------
  app.post('/api/surat/open-generator', async (req, res) => {
    try {
      const body = req.body || {};
      const hasPayload = body.payload && typeof body.payload === 'object' && (body.payload.letter || body.payload.bast);
      if (!hasPayload && (!body.debtor || !body.personnel)) {
        return res.status(400).json({
          success: false,
          error: 'Missing debtor or personnel data in request body',
        });
      }

      const result = buildGeneratorLink(body);
      return res.json({
        success: true,
        url: result.url,
        generatorBase: GENERATOR_BASE_URL,
        generatorRepo: GENERATOR_REPO_URL,
        docType: result.docType,
        paperSize: result.paperSize,
        payload: result.payload,
        encodedPayload: result.encodedPayload,
        payloadInHash: result.payloadInHash,
        transport: result.transport,
      });
    } catch (err: any) {
      console.error('Open generator Error:', err?.message || err);
      res.status(500).json({ success: false, error: err?.message || 'Failed creating generator link' });
    }
  });

  // Serve Vite in development / production static build
  if (process.env.NODE_ENV !== "production" && !process.env.NETLIFY) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.NETLIFY) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Express 5 (path-to-regexp v8) tidak menerima "*"; gunakan "*splat".
    app.get("*splat", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.NETLIFY) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`ARMS Control Tower Server running on http://0.0.0.0:${PORT}`);
    });
  }

  return app;
}

export const appPromise = startServer();
