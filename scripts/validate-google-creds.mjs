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
 *   node scripts/validate-google-creds.mjs <SPREADSHEET_ID> <FOLDER_ID_MASTER>
 *     → + uji akses TULIS folder master Google Drive (penyebab paling sering error
 *       "Gagal membuat folder": folder master salah ID, belum di-share, atau
 *       Drive API belum diaktifkan pada project service account).
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

  throw new Error(
    "Tidak ada kredensial Google. Set GOOGLE_SERVICE_ACCOUNT_JSON (isi JSON) " +
    "atau GOOGLE_APPLICATION_CREDENTIALS (path file JSON service account).",
  );
}

const spreadsheetId = process.argv[2];
const driveFolderId = process.argv[3];

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

  // Scope sama dengan yang dipakai server (lihat driveScopes() di api/lib/googleAuth.ts):
  // drive.file saja TIDAK cukup untuk folder master yang dibuat manual lalu di-share.
  const scopes = (process.env.GOOGLE_DRIVE_SCOPES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const auth = new google.auth.GoogleAuth({
    scopes: scopes.length
      ? scopes
      : [
          "https://www.googleapis.com/auth/spreadsheets",
          "https://www.googleapis.com/auth/drive",
        ],
    credentials: creds,
  });
  console.log(`  Scope diuji   : ${auth.options.scopes.join(", ")}`);

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

  if (driveFolderId) {
    const drive = google.drive({ version: "v3", auth });
    try {
      const meta = await drive.files.get({
        fileId: driveFolderId,
        supportsAllDrives: true,
        fields: "id, name, mimeType, driveId, capabilities",
      });
      const isFolder = meta.data.mimeType === "application/vnd.google-apps.folder";
      if (!isFolder) {
        throw new Error(`ID "${driveFolderId}" menunjuk ke ${meta.data.mimeType}, bukan folder. Pakai ID folder master.`);
      }
      const canAdd = meta.data.capabilities?.canAddChildren;
      console.log(`✔ Folder master dapat dibaca: "${meta.data.name}"${meta.data.driveId ? ` (Shared Drive ${meta.data.driveId})` : " (Drive pribadi)"} (ID identik = ${meta.data.id === driveFolderId ? "ya" : "TIDAK"})`);
      if (canAdd === false) {
        throw new Error('Service account hanya boleh MEMBACA folder master (canAddChildren=false) — pembuatan folder akan 403. Naikkan akses jadi Editor / Content manager.');
      }
      console.log("✔ canAddChildren aktif — sistem boleh membuat folder & berkas di dalamnya.");
      if (!meta.data.driveId) {
        console.warn("⚠ Folder berada di Drive pribadi: membuat folder OK, tapi unggah berkas fisik oleh service account"
          + ' biasanya ditolak Google ("Service Accounts do not have storage quota").'
          + " Untuk unggah berkas, pindahkan folder master ke Shared Drive.");
      }
    } catch (err) {
      const msg = String(err?.message || err);
      const hint = /not found/i.test(msg)
        ? "ID folder salah/terhapus, atau folder belum di-share ke email service account di atas."
        : /permission/i.test(msg)
          ? "Share folder master ke email service account sebagai Editor (My Drive) atau Manager/Content manager (Shared Drive)."
          : /has not been used|accessNotConfigured/i.test(msg)
            ? "Aktifkan Google Drive API di project service account: Console → APIs & Services → Library → \"Google Drive API\"."
            : msg;
      throw new Error(`Uji folder master Google Drive gagal: ${hint}`);
    }
  } else {
    console.log("\nTip: uji juga akses folder master Google Drive (penyebab umum 'Gagal membuat folder'):");
    console.log("  node scripts/validate-google-creds.mjs <SPREADSHEET_ID> <FOLDER_ID_MASTER>");
  }

  process.exit(0);
} catch (err) {
  console.error(`✘ GAGAL: ${err?.message || err}`);
  console.error("\nSolusi: periksa file service-account.json (lihat README Bab 3 & 5),");
  console.error("lalu pastikan spreadsheet/folder Drive di-share (Editor) ke client_email di atas.");
  process.exit(1);
}
