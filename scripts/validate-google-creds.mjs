#!/usr/bin/env node
/**
 * Validasi kredensial Google Service Account untuk ARMS — Control Tower.
 *
 * Cara pakai:
 *   node scripts/validate-google-creds.mjs
 *     → memvalidasi kredensial dari env (GOOGLE_SERVICE_ACCOUNT_JSON,
 *       GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, atau GOOGLE_APPLICATION_CREDENTIALS)
 *       lalu mencoba mendapat access token.
 *
 *   node scripts/validate-google-creds.mjs <SPREADSHEET_ID>
 *     → seperti di atas + verifikasi akses ke spreadsheet tsb (uji Sheets API).
 *
 *   node scripts/validate-google-creds.mjs --file <path.json>
 *     → validasi file tertentu tanpa menyentuh env (berguna untuk memeriksa
 *       file yang baru diunduh sebelum dipasang sebagai secret).
 *
 *   node scripts/validate-google-creds.mjs --offline
 *     → hanya periksa struktur & kunci secara lokal, tanpa panggilan jaringan.
 *
 *   node scripts/validate-google-creds.mjs --fix-file <path.json>
 *     → tulis ulang file JSON dalam bentuk yang sudah dinormalisasi
 *       (private_key dirapikan, indentasi 2 spasi) + cetak versi base64
 *       yang aman untuk ditempel ke secret manager.
 *
 * Exit code:
 *   0 = kredensial valid
 *   1 = kredensial / akses bermasalah (pesan error dicetak)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseServiceAccountText,
  normalizeServiceAccount,
  inspectServiceAccount,
  assertPrivateKeyUsable,
} from "../api/lib/serviceAccount.mjs";

// dotenv & googleapis sengaja diimpor secara opsional/lazy: memeriksa sebuah file
// JSON (mode --file / --offline / --fix-file) harus tetap bisa dilakukan meski
// `npm install` belum dijalankan.
try {
  await import("dotenv/config");
} catch {
  // .env tidak dimuat — tidak masalah bila kredensial diberikan lewat --file
  // atau env sudah diekspor langsung oleh shell/host.
}

const argv = process.argv.slice(2);
const takeFlagValue = (name) => {
  const i = argv.indexOf(name);
  if (i === -1) return undefined;
  const value = argv[i + 1];
  argv.splice(i, value ? 2 : 1);
  return value;
};

const filePath = takeFlagValue("--file");
const fixFilePath = takeFlagValue("--fix-file");
const offline = argv.includes("--offline") || Boolean(fixFilePath);
const spreadsheetId = argv.find((a) => !a.startsWith("--"));

function readFileCreds(target, label) {
  const resolved = path.isAbsolute(target) ? target : path.resolve(process.cwd(), target);
  if (!fs.existsSync(resolved)) {
    throw new Error(
      `File kredensial tidak ditemukan: ${resolved}\n(${label})\n` +
        "Letakkan file JSON service account di lokasi tsb, lalu jalankan ulang.",
    );
  }
  let raw;
  try {
    raw = fs.readFileSync(resolved, "utf8");
  } catch (err) {
    throw new Error(`Tidak dapat membaca ${resolved}: ${err?.message || err}`);
  }
  return { source: `${resolved} (${label})`, raw, resolved };
}

function resolveRaw() {
  if (fixFilePath) return readFileCreds(fixFilePath, "--fix-file");
  if (filePath) return readFileCreds(filePath, "--file");

  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (inline && inline.trim()) {
    return { source: "GOOGLE_SERVICE_ACCOUNT_JSON", raw: inline };
  }

  const inlineB64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
  if (inlineB64 && inlineB64.trim()) {
    return { source: "GOOGLE_SERVICE_ACCOUNT_JSON_BASE64", raw: inlineB64 };
  }

  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (envPath && envPath.trim()) {
    return readFileCreds(
      envPath.trim().replace(/^['"]|['"]$/g, ""),
      `GOOGLE_APPLICATION_CREDENTIALS="${envPath}"`,
    );
  }

  throw new Error(
    "Tidak ada kredensial Google. Set GOOGLE_SERVICE_ACCOUNT_JSON (isi JSON), " +
      "GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 (JSON dalam base64), " +
      "atau GOOGLE_APPLICATION_CREDENTIALS (path file JSON service account).",
  );
}

try {
  const { source, raw, resolved } = resolveRaw();
  console.log(`✔ Kredensial ditemukan dari: ${source}`);

  const parsed = parseServiceAccountText(raw, source);
  const creds = normalizeServiceAccount(parsed, source);
  console.log("✔ JSON valid & ternormalisasi (private_key dirapikan ke format PEM baku).");

  await assertPrivateKeyUsable(creds);
  console.log("✔ private_key dapat menandatangani JWT RS256 (kunci utuh).");

  for (const w of inspectServiceAccount(creds)) console.warn(`⚠ ${w}`);

  console.log(`✔ project_id     : ${creds.project_id}`);
  console.log(`✔ client_email   : ${creds.client_email}`);
  console.log(`✔ private_key_id : ${creds.private_key_id ?? "(tidak ada)"}`);

  if (fixFilePath) {
    const normalizedJson = `${JSON.stringify(creds, null, 2)}\n`;
    fs.writeFileSync(resolved, normalizedJson, { mode: 0o600 });
    // writeFileSync hanya menerapkan `mode` saat file BARU dibuat; file yang sudah
    // ada mempertahankan permission lamanya — jadi set ulang secara eksplisit.
    let permNote = "chmod 600";
    try {
      fs.chmodSync(resolved, 0o600);
    } catch {
      permNote = "permission tidak dapat diubah — batasi aksesnya secara manual";
    }
    console.log(`\n✔ File ditulis ulang dalam bentuk normal: ${resolved} (${permNote})`);
    console.log("\nUntuk secret manager (aman dari mangling newline), pakai salah satu:");
    console.log("  # 1. JSON satu baris");
    console.log("  GOOGLE_SERVICE_ACCOUNT_JSON='" + JSON.stringify(creds) + "'");
    console.log("\n  # 2. Base64 (paling tahan banting)");
    console.log(
      "  GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=" +
        Buffer.from(JSON.stringify(creds), "utf8").toString("base64"),
    );
    process.exit(0);
  }

  if (offline) {
    console.log("\n✔ Mode --offline: struktur & kunci valid (tanpa uji jaringan ke Google).");
    process.exit(0);
  }

  let google;
  try {
    ({ google } = await import("googleapis"));
  } catch {
    throw new Error(
      "Paket 'googleapis' belum terpasang, jadi uji token ke Google tidak bisa dijalankan.\n" +
        "Jalankan `npm install` lebih dulu, atau pakai `--offline` untuk memeriksa\n" +
        "struktur & keutuhan kunci saja tanpa jaringan.",
    );
  }

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
  const message = err?.message || String(err);
  console.error(`✘ GAGAL: ${message}`);

  if (/invalid_grant|Invalid JWT Signature|invalid_client/i.test(message)) {
    console.error(
      "\nPetunjuk: JSON-nya benar, tetapi Google menolak kuncinya. Biasanya karena\n" +
        "key sudah DIHAPUS/di-disable, atau service account/project sudah dinonaktifkan.\n" +
        "Buat key JSON baru: Google Cloud Console → IAM & Admin → Service Accounts →\n" +
        "pilih service account → Keys → Add Key → Create new key → JSON.",
    );
  } else if (/Bad control character|bukan JSON valid/i.test(message)) {
    console.error(
      "\nPetunjuk: nilai env kemungkinan rusak saat ditempel (newline pada private_key).\n" +
        "Paling aman pakai base64:\n" +
        '  GOOGLE_SERVICE_ACCOUNT_JSON_BASE64="$(base64 -w0 service-account.json)"',
    );
  } else if (/403|insufficient permissions|does not have permission/i.test(message)) {
    console.error(
      "\nPetunjuk: kredensial valid, tetapi belum diberi akses. Share spreadsheet/folder\n" +
        "Drive ke client_email di atas dengan peran Editor.",
    );
  }

  console.error("\nSolusi umum: periksa file service-account.json (lihat README Bab 3 & 5),");
  console.error("lalu pastikan spreadsheet/folder Drive di-share (Editor) ke client_email di atas.");
  process.exit(1);
}
