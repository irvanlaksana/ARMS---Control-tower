import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import { Readable } from 'stream';

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

  // API Route: Health Check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      system: "ARMS - Control Tower Agency DC",
      database: "Google Sheets",
      timestamp: new Date().toISOString(),
    });
  });

  // API Route: Verify or Create Google Sheets Structure
  app.post("/api/sheets/setup", async (req, res) => {
    try {
      const { spreadsheetId } = req.body;
      if (!spreadsheetId) {
        return res.status(400).json({ error: "Missing spreadsheetId" });
      }

      // Initialize OAuth Google Auth client
      const auth = new google.auth.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive.file"],
      });

      const sheets = google.sheets({ version: "v4", auth });

      const requiredTabs = [
        "Users", "Roles", "Clients", "Partners", "Services", "Fees", "Contracts",
        "Leads", "Customers", "Cases", "Assignments", "SK", "Communication_Log",
        "Assets", "Collections", "Payments", "Funding", "Expenses", "Settlements",
        "Ledger", "Cash", "Documents", "Approvals", "Notifications", "Audit_Log", "Settings"
      ];

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
      const { spreadsheetId, data } = req.body;
      if (!spreadsheetId || !data) {
        return res.status(400).json({ error: "Missing spreadsheetId or data" });
      }

      const auth = new google.auth.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });
      const sheets = google.sheets({ version: "v4", auth });

      const STORE_KEY_MAP: Record<string, string> = {
        users: "Users",
        roles: "Roles",
        clients: "Clients",
        partners: "Partners",
        services: "Services",
        fees: "Fees",
        contracts: "Contracts",
        leads: "Leads",
        customers: "Customers",
        cases: "Cases",
        assignments: "Assignments",
        sks: "SK",
        commLogs: "Communication_Log",
        assets: "Assets",
        collections: "Collections",
        assetRecoveries: "Collections",
        payments: "Payments",
        danaTalangan: "Funding",
        expenses: "Expenses",
        settlements: "Settlements",
        ledger: "Ledger",
        cashAccounts: "Cash",
        documents: "Documents",
        approvals: "Approvals",
        notifications: "Notifications",
        auditLogs: "Audit_Log",
        settings: "Settings"
      };

      const updatedTabs: string[] = [];
      const keys = Object.keys(data);

      for (const key of keys) {
        const tabName = STORE_KEY_MAP[key] || key;
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
      const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });

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

  // API Route: Create GitHub Issue in generator-surat- to sync SK / Debtor & Personnel data
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
      const repoName = 'generator-surat-';
      const issueTitle = `SK: ${skNumber || skId || 'new'} - ${debtor.debtorName || debtor.name || 'Debtor'}`;

      const issueBody = `Auto-synced from ARMS - Control Tower\n\n**SK ID / Number:** ${skId || skNumber || ''}\n\n**Debtor (case data):**\n\n\n\`
${JSON.stringify(debtor, null, 2)}
\`
\n**Personnel (penerima tugas):**\n\n\n\
${JSON.stringify(personnel, null, 2)}
\n**Drive Document URL (if any):** ${driveDocumentUrl || ''}\n\n---\n*(This issue was created automatically by ARMS - Control Tower to seed generator-surat- with debtor & personnel data.)*`;

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
      res.status(500).json({ success: false, error: err?.message || 'Failed creating GitHub issue' });
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
