import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));

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
      const { webAppUrl, action, tab, payload, data, auditInfo } = req.body;
      if (!webAppUrl) {
        return res.status(400).json({ error: "Missing webAppUrl" });
      }

      const response = await fetch(webAppUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, tab, payload, data, auditInfo }),
      });

      const text = await response.text();
      let jsonRes;
      try {
        jsonRes = JSON.parse(text);
      } catch {
        jsonRes = { success: true, message: text };
      }

      res.json(jsonRes);
    } catch (err: any) {
      console.error("GAS Proxy Error:", err?.message || err);
      res.status(500).json({
        success: false,
        error: err?.message || "Failed to communicate with Google Apps Script Web App URL",
      });
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
