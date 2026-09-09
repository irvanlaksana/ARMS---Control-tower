import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import { Readable } from 'stream';
import { authFor, isGoogleAuthAvailable, getServiceAccountEmail } from "./api/lib/googleAuth.ts";

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
      if (!spreadsheetId) {
        return res.status(400).json({ error: 'Missing spreadsheetId' });
      }

      const auth = authFor([
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
      ]);
      const sheets = google.sheets({ version: 'v4', auth });
      
      const tabMap = { ...defaultTabs, ...(tabs || {}) } as Record<string, string>;
      const requiredTabs = Object.values(tabMap);

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

      const keys = Object.keys(data);
      for (const key of keys) {
        const tabName = tabMap[key] || key;
        let records = data[key];
        
        if (key === 'settings' && records && typeof records === 'object' && !Array.isArray(records)) {
          records = Object.keys(records).map(k => ({ key: k, value: String(records[k]), updatedAt: new Date().toISOString() }));
        }
        
        if (Array.isArray(records) && records.length > 0) {
          const headers = Object.keys(records[0]);
          const rows = [
            headers,
            ...records.map((r: any) => headers.map(h => {
              const val = r[h];
              if (val === undefined || val === null) return '';
              if (typeof val === 'object') return JSON.stringify(val);
              return String(val);
            }))
          ];
          
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${tabName}!A1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: rows },
          });
          
          updatedTabs.push(tabName);
          counts[key] = records.length;
        }
      }

      return res.json({
        success: true,
        updatedTabs,
        counts,
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

      for (const [key, defaultTab] of Object.entries(tabMap)) {
        const tab = tabMap[key] || defaultTab;
        if (!existingSheets.includes(tab)) continue;

        try {
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${tab}!A:ZZ`,
          });
          
          const rows = response.data.values || [];
          if (rows.length > 0) {
            const headers = rows.shift() || [];
            if (headers.length > 0) {
              data[key] = rows.map((row: any) => Object.fromEntries(headers.map((header: string, i: number) => [header, row[i] || ''])));
            }
          }
        } catch (e: any) {
          console.warn(`Failed to fetch tab ${tab}: ${e.message}`);
        }
      }

      if (Array.isArray(data.settings)) {
        data.settings = Object.fromEntries(data.settings.filter(r => r.key).map(r => [r.key, r.value]));
      }

      return res.json({ success: true, data, provider: 'google-sheets' });
    } catch (err: any) {
      console.error('Sheets Fetch Error:', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed reading from Google Sheets' });
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
    app.get("*", (_req, res) => {
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
