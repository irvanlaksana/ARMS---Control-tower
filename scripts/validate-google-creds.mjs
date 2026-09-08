#!/usr/bin/env node
/**
 * Validasi kredensial Google Service Account untuk ARMS — Control Tower.
 *
 * Cara pakai:
 *   node scripts/validate-google-creds.mjs
 *     → memvalidasi file kredensial dari env (GOOGLE_SERVICE_ACCOUNT_JSON atau
 *       GOOGLE_APPLICATION_CREDENTIALS) lalu mencoba mendapat access token.
 *
 *   node scripts/validate-google-creds.mjs <SPREADSHEET_ID>
 *     → seperti di atas + verifikasi akses ke spreadsheet tsb (uji Sheets API).
 *
 * Exit code:
 *   0 = kredensial valid (token didapat; spreadsheet dapat diakses jika diuji)
 *   1 = kredensial / akses bermasalah (pesan error dicetak)
 */
import fs from "node:fs";
import path from "node:path";
import "dotenv/config";
import { google } from "googleapis";

const requiredFields = ["type", "project_id", "private_key", "client_email"];

function resolveCredentials() {
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (inline && inline.trim()) {
    try {
      return { source: "GOOGLE_SERVICE_ACCOUNT_JSON", creds: JSON.parse(inline) };
    } catch (err) {
      throw new Error(`GOOGLE_SERVICE_ACCOUNT_JSON tidak valid (bukan JSON): ${err?.message || err}`);
    }
  }

  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (envPath && envPath.trim()) {
    const resolved = path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(
        `File kredensial tidak ditemukan: ${resolved}\n` +
        `(GOOGLE_APPLICATION_CREDENTIALS="${envPath}")\n` +
        "Letakkan file JSON service account di lokasi tsb, lalu jalankan ulang.",
      );
    }
    let raw;
    try {
      raw = fs.readFileSync(resolved, "utf8");
    } catch (err) {
      throw new Error(`Tidak dapat membaca ${resolved}: ${err?.message || err}`);
    }
    try {
      return { source: `${resolved} (GOOGLE_APPLICATION_CREDENTIALS)`, creds: JSON.parse(raw) };
    } catch (err) {
      throw new Error(`File ${resolved} bukan JSON valid: ${err?.message || err}`);
    }
  }

  const localFile = path.resolve(process.cwd(), "service-account.json");
  if (fs.existsSync(localFile)) {
    const raw = fs.readFileSync(localFile, "utf8");
    try {
      return { source: localFile, creds: JSON.parse(raw) };
    } catch (err) {
      throw new Error(`File ${localFile} bukan JSON valid: ${err?.message || err}`);
    }
  }

  throw new Error(
    "Tidak ada kredensial Google. Set GOOGLE_SERVICE_ACCOUNT_JSON (isi JSON, dipakai di Netlify), " +
    "GOOGLE_APPLICATION_CREDENTIALS (path file), atau letakkan service-account.json di root repo.",
  );
}

const spreadsheetId = process.argv[2];

try {
  const { source, creds } = resolveCredentials();
  console.log(`✔ Kredensial ditemukan dari: ${source}`);

  const missing = requiredFields.filter((f) => !creds[f] || !String(creds[f]).trim());
  if (missing.length > 0) {
    throw new Error(`Field wajib tidak ada/kosong di JSON service account: ${missing.join(", ")}`);
  }
  if (creds.type !== "service_account") {
    console.warn(`⚠ "type" = "${creds.type}" (biasanya "service_account" untuk file key).`);
  }
  if (!/BEGIN PRIVATE KEY/.test(creds.private_key)) {
    throw new Error('"private_key" tidak berbentuk PEM key (harus berisi "-----BEGIN PRIVATE KEY-----"). Periksa JSON lengkap (\\n harus tetap berupa karakter \\n).');
  }
  if (!/@.*\.iam\.gserviceaccount\.com$/.test(creds.client_email)) {
    console.warn(`⚠ "client_email" tidak lazim: ${creds.client_email}`);
  }

  console.log(`✔ project_id     : ${creds.project_id}`);
  console.log(`✔ client_email   : ${creds.client_email}`);

  const auth = new google.auth.GoogleAuth({
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file",
    ],
    credentials: creds,
  });

  const client = await auth.getClient();
  await client.authorize(); // memicu pertukaran JWT -> access token
  console.log("✔ Access token berhasil diperoleh dari Google (kredensial berfungsi!).");

  if (spreadsheetId) {
    const sheets = google.sheets({ version: "v4", auth });
    const info = await sheets.spreadsheets.get({ spreadsheetId });
    const titles = (info.data.sheets || []).map((s) => s.properties?.title).slice(0, 8);
    console.log(`✔ Spreadsheet dapat diakses: "${info.data.properties?.title}"`);
    console.log(`  Tab awal: ${titles.join(", ")}${(info.data.sheets?.length || 0) > 8 ? ", …" : ""}`);
  } else {
    console.log("\nTip: uji akses ke spreadsheet spesifik:");
    console.log("  node scripts/validate-google-creds.mjs <SPREADSHEET_ID>");
  }

  process.exit(0);
} catch (err) {
  console.error(`✘ GAGAL: ${err?.message || err}`);
  console.error("\nSolusi: periksa file service-account.json (lihat README Bab 3 & 5),");
  console.error("lalu pastikan spreadsheet/folder Drive di-share (Editor) ke client_email di atas.");
  process.exit(1);
}
