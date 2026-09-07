import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import { Readable } from 'stream';
import { authFor } from "./api/lib/googleAuth.ts";

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
      database: "Supabase & Google Sheets",
      supabaseConfigured: Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY),
      timestamp: new Date().toISOString(),
    });
  });

  // API Route: Verify or Create Google Sheets Structure
  app.post("/api/sheets/setup", async (req, res) => {
    try {
      const { spreadsheetId, tabs } = req.body;
      if (!spreadsheetId) {
        return res.status(400).json({ error: "Missing spreadsheetId" });
      }

      // Initialize OAuth Google Auth client
      const auth = authFor(["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive.file"]);

      const sheets = google.sheets({ version: "v4", auth });

      const DEFAULT_TABS = [
        "Users", "Clients", "Personnel", "Services", "Fees", "Contracts",
        "Leads", "Customers", "Cases", "Assignments", "SK", "Lawyer_Notices", "Communication_Log",
        "Assets", "Collections", "Asset_Recoveries", "Payments", "Funding", "Expenses", "Settlements",
        "Ledger", "Cash", "Petty_Cash", "Working_Capital", "Documents", "Drive_Folders", "Approvals", "Notifications", "Audit_Log", "Settings"
      ];

      // Gunakan nama tab kustom dari konfigurasi database bila dikirim
      const requiredTabs =
        tabs && typeof tabs === "object" && Object.keys(tabs).length > 0
          ? Array.from(new Set(Object.values(tabs).filter(Boolean))) as string[]
          : DEFAULT_TABS;

      // Get spreadsheet info
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
      const existingSheets = (spreadsheet.data.sheets || []).map(s => s.properties?.title);

      const requests: any[] = [];
      requiredTabs.forEach(tab => {
        if (!existingSheets.includes(tab)) {
          requests.push({
            addSheet: {
              properties: { title: tab }
            }
          });
        }
      });

      if (requests.length > 0) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: { requests }
        });
      }

      res.json({
        success: true,
        spreadsheetId,
        message: `Successfully verified/created all ${requiredTabs.length} sheets in Google Spreadsheet!`,
        sheets: requiredTabs,
      });
    } catch (err: any) {
      console.error("Sheets Setup Error:", err?.message || err);
      res.status(500).json({
        success: false,
        error: err?.message || "Failed to setup Google Sheets. Please check Spreadsheet ID and permissions.",
      });
    }
  });


  // API Route: Sync data to Google Sheets
  app.post("/api/sheets/sync", async (req, res) => {
    try {
      const { spreadsheetId, data, tabs } = req.body;
      if (!spreadsheetId || !data) {
        return res.status(400).json({ error: "Missing spreadsheetId or data" });
      }

      const auth = authFor(["https://www.googleapis.com/auth/spreadsheets"]);
      const sheets = google.sheets({ version: "v4", auth });

      const STORE_KEY_MAP: Record<string, string> = {
        users: "Users",
        clients: "Clients",
        personnel: "Personnel",
        services: "Services",
        fees: "Fees",
        contracts: "Contracts",
        leads: "Leads",
        customers: "Customers",
        cases: "Cases",
        assignments: "Assignments",
        sks: "SK",
        lawyerNotices: "Lawyer_Notices",
        commLogs: "Communication_Log",
        assets: "Assets",
        collections: "Collections",
        assetRecoveries: "Asset_Recoveries",
        payments: "Payments",
        danaTalangan: "Funding",
        expenses: "Expenses",
        settlements: "Settlements",
        ledger: "Ledger",
        cashAccounts: "Cash",
        pettyCash: "Petty_Cash",
        workingCapital: "Working_Capital",
        documents: "Documents",
        driveFolders: "Drive_Folders",
        approvals: "Approvals",
        notifications: "Notifications",
        auditLogs: "Audit_Log",
        settings: "Settings"
      };

      // Nama tab dapat dikustomisasi lewat konfigurasi database (settings.databaseConfig)
      const resolveTab = (key: string) => {
        const custom = tabs && typeof tabs === "object" ? tabs[key] : undefined;
        return (custom && String(custom).trim()) || STORE_KEY_MAP[key] || key;
      };

      // Verify sheets/collection exist (hanya untuk key yang dikirim)
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
      const existingSheets = (spreadsheet.data.sheets || []).map(s => s.properties?.title);
      const requests: any[] = [];
      const dataKeys = Object.keys(data);
      const requiredTabs = Array.from(new Set(dataKeys.map(resolveTab).filter(Boolean)));
      requiredTabs.forEach(tab => {
        if (!existingSheets.includes(tab)) {
          requests.push({ addSheet: { properties: { title: tab } } });
        }
      });
      if (requests.length > 0) {
        await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
      }

      const updatedTabs: string[] = [];

      for (const key of dataKeys) {
        const tabName = resolveTab(key);
        let records = data[key];
        if (key === "settings" && records && typeof records === "object" && !Array.isArray(records)) {
          records = Object.keys(records).map(k => ({ key: k, value: String(records[k]), updatedAt: new Date().toISOString() }));
        }

        if (Array.isArray(records) && records.length > 0) {
          const headers = Object.keys(records[0]);
          const rows = [
            headers,
            ...records.map((r: any) => headers.map(h => {
              const val = r[h];
              if (val === undefined || val === null) return "";
              if (typeof val === 'object') return JSON.stringify(val);
              return String(val);
            }))
          ];

          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${tabName}!A1`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: rows },
          });
          updatedTabs.push(tabName);
        }
      }

      res.json({
        success: true,
        updatedTabs,
        syncedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("Sheets Sync Error:", err?.message || err);
      res.status(500).json({
        success: false,
        error: err?.message || "Error syncing to Google Sheets",
      });
    }
  });

  
  // API Route: Fetch data from Google Sheets
  app.post("/api/sheets/fetch", async (req, res) => {
    try {
      const { spreadsheetId, tabs } = req.body;
      if (!spreadsheetId) {
        return res.status(400).json({ error: "Missing spreadsheetId" });
      }

      const auth = authFor(["https://www.googleapis.com/auth/spreadsheets.readonly"]);
      const sheets = google.sheets({ version: "v4", auth });

      const STORE_KEY_MAP: Record<string, string> = {
        users: "Users",
        clients: "Clients",
        personnel: "Personnel",
        services: "Services",
        fees: "Fees",
        contracts: "Contracts",
        leads: "Leads",
        customers: "Customers",
        cases: "Cases",
        assignments: "Assignments",
        sks: "SK",
        lawyerNotices: "Lawyer_Notices",
        commLogs: "Communication_Log",
        assets: "Assets",
        collections: "Collections",
        assetRecoveries: "Asset_Recoveries",
        payments: "Payments",
        danaTalangan: "Funding",
        expenses: "Expenses",
        settlements: "Settlements",
        ledger: "Ledger",
        cashAccounts: "Cash",
        pettyCash: "Petty_Cash",
        workingCapital: "Working_Capital",
        documents: "Documents",
        driveFolders: "Drive_Folders",
        approvals: "Approvals",
        notifications: "Notifications",
        auditLogs: "Audit_Log",
        settings: "Settings"
      };

      // Nama tab dapat dikustomisasi lewat konfigurasi database (settings.databaseConfig)
      const resolveTab = (key: string) => {
        const custom = tabs && typeof tabs === "object" ? tabs[key] : undefined;
        return (custom && String(custom).trim()) || STORE_KEY_MAP[key] || key;
      };

      const storeToTab: Record<string, string> = {};
      Object.keys(STORE_KEY_MAP).forEach((key) => { storeToTab[key] = resolveTab(key); });
      const tabToStore: Record<string, string> = {};
      Object.entries(storeToTab).forEach(([key, tab]) => { tabToStore[tab] = key; });

      const data: any = {};
      const tabsToFetch = Array.from(new Set(Object.values(storeToTab)));

      // Get spreadsheet info to check existing sheets
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
      const existingSheets = (spreadsheet.data.sheets || []).map(s => s.properties?.title);

      const requests: any[] = [];
      tabsToFetch.forEach(tab => {
        if (!existingSheets.includes(tab)) {
          requests.push({
            addSheet: {
              properties: { title: tab }
            }
          });
        }
      });

      if (requests.length > 0) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: { requests }
        });
      }

      // We can use batchGet to fetch all sheets at once to save API calls
      const response = await sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges: tabsToFetch,
      });

      const valueRanges = response.data.valueRanges || [];

      Object.keys(storeToTab).forEach((storeKey) => {
        const tabName = storeToTab[storeKey];
        const rangeData = valueRanges.find((r) => r.range && r.range.startsWith(tabName));
        const rows = rangeData?.values || [];

        if (rows.length > 1) {
          const headers = rows[0];
          data[storeKey] = rows.slice(1).map(row => {
            const obj: any = {};
            headers.forEach((h: string, i: number) => {
              let val = row[i];
              if (val === 'true') val = true;
              if (val === 'false') val = false;

              // try to parse json fields
              if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
                try { val = JSON.parse(val); } catch(e) {}
              }

              obj[h] = val;
            });
            return obj;
          });
        } else {
          data[storeKey] = [];
        }
      });

      // Format Settings back into an object
      if (data.settings && Array.isArray(data.settings)) {
        const settingsObj: any = {};
        data.settings.forEach((r: any) => {
          if (r.key) settingsObj[r.key] = r.value;
        });
        data.settings = settingsObj;
      }

      res.json({ success: true, data, tabs: storeToTab });
    } catch (err: any) {
      console.error("Sheets Fetch Error:", err?.message || err);
      res.status(500).json({
        success: false,
        error: err?.message || "Failed to fetch Google Sheets.",
      });
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

  // API Route: Upload file to Google Drive (Service Account)
  // Expects JSON body: { fileName, mimeType, base64, folderId (optional) }
  app.post('/api/drive/upload', async (req, res) => {
    try {
      const { fileName, mimeType, base64, folderId } = req.body || {};
      if (!fileName || !base64) {
        return res.status(400).json({ success: false, error: 'Missing fileName or base64 payload' });
      }

      // Prepare auth using Application Default Credentials / Service Account
      // Ensure GOOGLE_APPLICATION_CREDENTIALS is set on the host to point to the service account JSON key
      const auth = authFor(['https://www.googleapis.com/auth/drive.file']);

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
        requestBody: fileMetadata,
        media,
        fields: 'id, webViewLink, webContentLink',
      });

      const fileId = created.data.id;
      const webViewLink = created.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;

      res.json({ success: true, fileId, webViewLink });
    } catch (err: any) {
      console.error('Drive Upload Error:', err?.message || err);
      res.status(500).json({ success: false, error: err?.message || 'Failed uploading to Google Drive' });
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

      const auth = authFor(['https://www.googleapis.com/auth/drive.file']);
      const drive = google.drive({ version: 'v3', auth });

      const fileMetadata: any = {
        name: String(name).trim(),
        mimeType: 'application/vnd.google-apps.folder',
      };
      if (parentId) fileMetadata.parents = [parentId];

      const created = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id, webViewLink, name',
      });

      const folderId = created.data.id as string;
      res.json({
        success: true,
        folderId,
        name: created.data.name || String(name).trim(),
        webViewLink: `https://drive.google.com/drive/folders/${folderId}?usp=sharing`,
      });
    } catch (err: any) {
      console.error('Drive Create Folder Error:', err?.message || err);
      res.status(500).json({ success: false, error: err?.message || 'Failed creating Google Drive folder' });
    }
  });

  // API Route: Ensure a nested folder structure exists in Google Drive.
  // Expects JSON body: { path: string[], rootId (optional) }
  // Finds existing folders by name under each parent, else creates them.
  app.post('/api/drive/ensure-path', async (req, res) => {
    try {
      const { path, rootId } = req.body || {};
      if (!Array.isArray(path) || path.filter(Boolean).length === 0) {
        return res.status(400).json({ success: false, error: 'Missing path (array of folder names)' });
      }

      const auth = authFor(['https://www.googleapis.com/auth/drive.file']);
      const drive = google.drive({ version: 'v3', auth });

      let currentParentId: string | undefined = rootId || undefined;
      const created: Array<{ name: string; folderId: string; webViewLink: string }> = [];
      let lastFolderId = currentParentId || '';
      let lastWebViewLink = currentParentId ? `https://drive.google.com/drive/folders/${currentParentId}?usp=sharing` : '';

      for (const rawName of path) {
        const name = String(rawName).trim();
        if (!name) continue;

        // Cari folder dengan nama sama di parent yang sama (drive.file scope)
        let existingId: string | undefined;
        if (currentParentId) {
          const query = `name = '${name.replace(/'/g, "\\'")}' and '${currentParentId}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`;
          try {
            const list = await drive.files.list({
              q: query,
              fields: 'files(id, name)',
              pageSize: 1,
            });
            existingId = list.data.files?.[0]?.id;
          } catch (searchErr) {
            // Jika API tidak mendukung query, lanjut buat folder baru
            console.warn('Drive folder search failed, will create:', String(searchErr));
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
        return res.status(400).json({ success: false, error: 'No folder could be created. Check root folder permission.' });
      }

      res.json({
        success: true,
        folderId: lastFolderId,
        webViewLink: lastWebViewLink,
        created,
      });
    } catch (err: any) {
      console.error('Drive Ensure Path Error:', err?.message || err);
      res.status(500).json({ success: false, error: err?.message || 'Failed creating Google Drive folder structure' });
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
