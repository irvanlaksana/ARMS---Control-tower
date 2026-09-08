import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import {
  createDriveFolder as createDriveFolderCore,
  ensureDrivePathCore,
  probeDriveAccess,
  respondDriveError,
  uploadDriveBuffer,
} from "./api/lib/driveCore.ts";

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
      database: "Supabase + local CSV spreadsheet",
      supabaseConfigured: Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY),
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

  app.post('/api/sheets/setup', async (req, res) => {
    try {
      const { spreadsheetId, tabs } = req.body || {};
      if (!spreadsheetId) return res.status(400).json({ success: false, error: 'Missing spreadsheetId (gunakan nama workbook lokal)' });
      const dir = workbookDir(spreadsheetId);
      fs.mkdirSync(dir, { recursive: true });
      const tabMap = { ...defaultTabs, ...(tabs || {}) } as Record<string, string>;
      for (const tab of Object.values(tabMap)) {
        const file = path.join(dir, `${safePart(tab)}.csv`);
        if (!fs.existsSync(file)) fs.writeFileSync(file, '', 'utf8');
      }
      fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ spreadsheetId: safePart(spreadsheetId), tabs: tabMap, updatedAt: new Date().toISOString() }, null, 2));
      return res.json({ success: true, spreadsheetId: safePart(spreadsheetId), sheets: Object.values(tabMap), storage: dir, message: 'Workbook CSV lokal siap. Tidak ada Google API yang dipanggil.' });
    } catch (err: any) { return res.status(500).json({ success: false, error: err?.message || 'Gagal membuat workbook lokal' }); }
  });

  app.post('/api/sheets/sync', async (req, res) => {
    try {
      const { spreadsheetId, data, tabs } = req.body || {};
      if (!spreadsheetId || !data || typeof data !== 'object') return res.status(400).json({ success: false, error: 'Missing spreadsheetId or data' });
      const dir = workbookDir(spreadsheetId);
      fs.mkdirSync(dir, { recursive: true });
      const updatedTabs: string[] = [];
      const counts: Record<string, number> = {};
      for (const [key, raw] of Object.entries(data)) {
        const tab = resolveTab(key, tabs);
        const records = key === 'settings' && raw && typeof raw === 'object' && !Array.isArray(raw)
          ? Object.entries(raw).map(([k, value]) => ({ key: k, value })) : (Array.isArray(raw) ? raw : []);
        const headers = Array.from(new Set(records.flatMap((record: any) => Object.keys(record || {}))));
        const csv = headers.length ? [headers.map(csvEscape).join(','), ...records.map((record: any) => headers.map(h => csvEscape(record?.[h])).join(','))].join('\n') + '\n' : '';
        fs.writeFileSync(path.join(dir, `${tab}.csv`), csv, 'utf8');
        updatedTabs.push(tab); counts[key] = records.length;
      }
      const syncedAt = new Date().toISOString();
      fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ spreadsheetId: safePart(spreadsheetId), tabs: tabs || defaultTabs, counts, updatedAt: syncedAt }, null, 2));
      return res.json({ success: true, updatedTabs, counts, syncedAt, provider: 'local-csv' });
    } catch (err: any) { return res.status(500).json({ success: false, error: err?.message || 'Gagal menyimpan CSV spreadsheet lokal' }); }
  });

  app.post('/api/sheets/fetch', async (req, res) => {
    try {
      const { spreadsheetId, tabs } = req.body || {};
      if (!spreadsheetId) return res.status(400).json({ success: false, error: 'Missing spreadsheetId' });
      const dir = workbookDir(spreadsheetId), data: Record<string, any> = {};
      for (const [key, defaultTab] of Object.entries(defaultTabs)) {
        const tab = resolveTab(key, tabs), file = path.join(dir, `${tab}.csv`);
        // Workbook baru tidak boleh menghapus seed/local cache di browser.
        if (!fs.existsSync(file)) continue;
        const rows = csvParse(fs.readFileSync(file, 'utf8'));
        const headers = rows.shift() || [];
        if (headers.length > 0) data[key] = rows.map(row => Object.fromEntries(headers.map((header, i) => [header, parseCell(row[i] || '')])));
      }
      if (Array.isArray(data.settings)) data.settings = Object.fromEntries(data.settings.filter(r => r.key).map(r => [r.key, r.value]));
      return res.json({ success: true, data, provider: 'local-csv' });
    } catch (err: any) { return res.status(500).json({ success: false, error: err?.message || 'Gagal membaca CSV spreadsheet lokal' }); }
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

  // ==========================================================================
  // Google Drive — logika INTI dibagi dengan Vercel Functions lewat
  // api/lib/driveCore.ts supaya perilaku lokal/VPS identik dengan production.
  // Semua kegagalan dibalas JSON (bukan HTML/teks 500) agar frontend tidak lagi
  // menampilkan "Unexpected token 'A', \"A server e\"... is not valid JSON".
  // ==========================================================================

  // API Route: Google Drive Status (+ ?probe=1&folderId=<ID> utk uji folder master)
  app.get('/api/drive/status', async (req, res) => {
    try {
      const probe = ['1', 'true', 'yes'].includes(String((req.query as any)?.probe ?? '').toLowerCase());
      const folderId = String((req.query as any)?.folderId || (req.query as any)?.rootId || '');
      const result = await probeDriveAccess(probe ? folderId : null);
      res.json({
        status: 'ok',
        service: 'Google Drive Storage',
        probed: probe,
        ...result,
        instructions:
          result.instructions ||
          (result.configured
            ? 'Google Drive Service Account aktif dan siap menyimpan folder/berkas.'
            : 'Google Drive belum dikonfigurasi. Tambahkan GOOGLE_SERVICE_ACCOUNT_JSON di Vercel atau .env.'),
      });
    } catch (err: any) {
      res.json({
        status: 'error',
        service: 'Google Drive Storage',
        configured: false,
        error: err?.message || 'Gagal memeriksa status Google Drive.',
      });
    }
  });

  // API Route: Upload file ke Google Drive — body: { fileName, mimeType, base64, folderId? }
  app.post('/api/drive/upload', async (req, res) => {
    try {
      const { fileName, mimeType, base64, folderId } = req.body || {};
      if (!fileName || !base64) {
        return res.json({
          success: false,
          errorCode: 'bad_request',
          error: 'Body permintaan tidak memuat "fileName" atau "base64".',
          hint: 'Unggah ulang berkasnya; batas ukuran JSON body server adalah 25 MB.',
          retryable: false,
        });
      }
      const uploaded = await uploadDriveBuffer({ fileName, base64, mimeType, folderId });
      return res.json({ success: true, configured: true, ...uploaded });
    } catch (err: any) {
      return respondDriveError(res, err);
    }
  });

  // API Route: Buat folder/subfolder — body: { name, parentId? }
  app.post('/api/drive/create-folder', async (req, res) => {
    try {
      const { name, parentId } = req.body || {};
      if (!name || !String(name).trim()) {
        return res.json({
          success: false,
          errorCode: 'bad_request',
          error: 'Nama folder kosong.',
          hint: 'Kirim body JSON { "name": "NAMA_FOLDER", "parentId": "ID_FOLDER_OPSIONAL" }.',
          retryable: false,
        });
      }
      const folder = await createDriveFolderCore(name, parentId, { reuseExisting: true });
      return res.json({ success: true, configured: true, ...folder, webViewLink: folder.webViewLink });
    } catch (err: any) {
      return respondDriveError(res, err);
    }
  });

  // API Route: Pastikan struktur folder bertingkat ada — body: { path: string[], rootId? }
  app.post('/api/drive/ensure-path', async (req, res) => {
    try {
      const { path, rootId, segments, parentId } = req.body || {};
      const list = Array.isArray(path) ? path : Array.isArray(segments) ? segments : null;
      if (!list || list.filter(Boolean).length === 0) {
        return res.json({
          success: false,
          errorCode: 'bad_request',
          error: 'Parameter "path" wajib berupa array nama folder (min. 1).',
          hint: 'Contoh: { "path": ["PT_MJ_INDONESIA","DATABASE_KARYAWAN","BUDI SANTOSO"], "rootId": "ID_FOLDER_MASTER" }.',
          retryable: false,
        });
      }
      const result = await ensureDrivePathCore(list, rootId ?? parentId);
      return res.json({ success: true, configured: true, ...result });
    } catch (err: any) {
      return respondDriveError(res, err);
    }
  });


  // API Route: Create GitHub Issue in generate-surat-tugas to sync SK / Debtor & Personnel data
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
      const repoName = 'generate-surat-tugas';
      const issueTitle = `SK: ${skNumber || skId || 'new'} - ${debtor.debtorName || debtor.name || 'Debtor'}`;

      const issueBody = `Auto-synced from ARMS - Control Tower\n\n**SK ID / Number:** ${skId || skNumber || ''}\n\n**Debtor (case data):**\n\n\n\`
${JSON.stringify(debtor, null, 2)}
\`
\n**Personnel (penerima tugas):**\n\n\n\
${JSON.stringify(personnel, null, 2)}
\n**Drive Document URL (if any):** ${driveDocumentUrl || ''}\n\n---\n*(This issue was created automatically by ARMS - Control Tower to seed generate-surat-tugas with debtor & personnel data.)*`;

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

  // API Route: Open generator-surat-new UI dengan payload hasil Form Pembuatan Surat Tugas / Kuasa
  app.post('/api/surat/open-generator', async (req, res) => {
    try {
      const { skNumber, skId, debtor, personnel, driveDocumentUrl } = req.body || {};
      if (!debtor || !personnel) {
        return res.status(400).json({ success: false, error: 'Missing debtor or personnel data in request body' });
      }

      const generatorBase = 'https://generator-surat-new.vercel.app';
      const payload = { skNumber, skId, debtor, personnel, driveDocumentUrl };
      const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
      const generatorUrl = `${generatorBase}/?payload=${encodeURIComponent(encoded)}`;

      return res.json({ success: true, url: generatorUrl });
    } catch (err: any) {
      console.error('Open generator Error:', err?.message || err);
      res.status(500).json({ success: false, error: err?.message || 'Failed creating generator link' });
    }
  });

  // Endpoint /api/* yang tidak dikenal: balas JSON (bukan HTML index.html / "Cannot POST ...")
  // supaya frontend selalu dapat pesan yang bisa dibaca.
  app.use('/api', (_req, res) => {
    res.status(404).json({
      success: false,
      errorCode: 'endpoint_missing',
      error: 'Endpoint API tidak ditemukan pada server ini.',
      hint: 'Pastikan server (tsx server.ts / npm start) versi terbaru yang berjalan — fungsi Drive ada di api/lib/driveCore.ts.',
    });
  });

  // Perbaiki error express (body JSON rusak / melebihi 25mb) menjadi JSON, bukan HTML.
  app.use((err: any, _req: any, res: any, _next: any) => {
    const tooLarge = err?.type === 'entity.too.large' || err?.status === 413 || err?.code === 'EFBIG';
    const malformed = err?.type === 'entity.parse.failed' || err?.statusCode === 400;
    const status = tooLarge ? 413 : malformed ? 400 : 500;
    if (res.headersSent) return;
    console.error('Server error:', err?.message || err);
    res.status(status).json({
      success: false,
      errorCode: tooLarge ? 'payload_too_large' : malformed ? 'bad_request' : 'internal',
      error: tooLarge
        ? 'Ukuran berkas melebihi batas 25 MB server.'
        : malformed
          ? 'Body permintaan bukan JSON valid.'
          : String(err?.message || 'Terjadi kesalahan pada server.'),
      hint: tooLarge
        ? 'Kompres berkas (maks ±4,5 MB untuk foto) lalu unggah ulang.'
        : 'Ulangi penyimpanan; bila berulang lihat log terminal server.',
      retryable: false,
    });
  });

  // Serve Vite in development / production static build
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ARMS Control Tower Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
