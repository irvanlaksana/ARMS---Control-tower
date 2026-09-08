/**
 * Server pengembang lokal (tsx) — ARMS Control Tower
 * ---------------------------------------------------------------------------
 * Untuk PRODUKSI, aplikasi di-deploy ke NETLIFY:
 *   - SPA (Vite build) di Netlify (publish: dist)
 *   - /api/* di Netlify Functions (netlify/functions)
 *
 * Server lokal ini hanya untuk `npm run dev` / `npm run start`: memakai
 * LOGIKA GOOGLE YANG SAMA (netlify/functions/lib/*.mjs) supaya perilaku
 * lokal & Netlify identik.
 */

import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

import { driveStatus, driveCreateFolder, driveEnsurePath, driveUpload } from "./netlify/functions/lib/drive.mjs";
import { sheetsSetup, sheetsSync, sheetsFetch } from "./netlify/functions/lib/sheets.mjs";
import { suratOpenGenerator, suratCreateIssue } from "./netlify/functions/lib/surat.mjs";
import { isGoogleAuthAvailable } from "./netlify/functions/lib/googleAuth.mjs";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: "25mb" }));

  // CORS untuk pengembangan / VPS
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
      database: "Google Cloud Firestore (Firebase)",
      firestoreProject: process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0940128449",
      driveConfigured: isGoogleAuthAvailable(),
      runtime: "local dev (sama dengan Netlify Functions)",
      timestamp: new Date().toISOString(),
    });
  });

  // API Route: Google Drive (Service Account)
  app.get("/api/drive/status", async (_req, res) => {
    try {
      res.json(await driveStatus());
    } catch (err: any) {
      res.json({ status: "error", configured: false, instructions: String(err?.message || err) });
    }
  });

  app.post("/api/drive/create-folder", async (req, res) => {
    res.json(await driveCreateFolder(req.body || {}));
  });

  app.post("/api/drive/ensure-path", async (req, res) => {
    res.json(await driveEnsurePath(req.body || {}));
  });

  app.post("/api/drive/upload", async (req, res) => {
    res.json(await driveUpload(req.body || {}));
  });

  // API Route: Google Sheets (ekspor laporan — database utama: Firestore)
  app.post("/api/sheets/setup", async (req, res) => {
    res.json(await sheetsSetup(req.body || {}));
  });

  app.post("/api/sheets/sync", async (req, res) => {
    res.json(await sheetsSync(req.body || {}));
  });

  app.post("/api/sheets/fetch", async (req, res) => {
    res.json(await sheetsFetch(req.body || {}));
  });

  // API Route: Modul Surat
  app.post("/api/surat/create-issue", async (req, res) => {
    const result: any = await suratCreateIssue(req.body || {});
    res.status(result.success ? 200 : 500).json(result);
  });

  app.post("/api/surat/open-generator", async (req, res) => {
    res.json(await suratOpenGenerator(req.body || {}));
  });

  // Serve Vite (dev) / static build (production lokal)
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
    console.log(`ARMS Control Tower (dev) running on http://0.0.0.0:${PORT}`);
    console.log(`Database utama: Google Cloud Firestore | Drive/Sheets API: ${isGoogleAuthAvailable() ? "Service Account aktif" : "belum dikonfigurasi (set GOOGLE_SERVICE_ACCOUNT_JSON)"}`);
  });
}

startServer();
