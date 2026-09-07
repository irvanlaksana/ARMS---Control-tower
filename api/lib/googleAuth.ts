import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";
// @ts-ignore -- modul .mjs bersama (dipakai juga oleh scripts/validate-google-creds.mjs)
import {
  parseServiceAccountText,
  normalizeServiceAccount,
} from "./serviceAccount.mjs";

/**
 * Helper autentikasi Google Service Account yang tahan terhadap
 * error "Could not load the default credentials".
 *
 * Prioritas:
 *  1. GOOGLE_SERVICE_ACCOUNT_JSON       -> isi JSON langsung (untuk Vercel/Cloud Run)
 *  2. GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 -> isi JSON dalam base64 (aman dari mangling newline)
 *  3. GOOGLE_APPLICATION_CREDENTIALS    -> path file JSON (untuk VPS/lokal)
 *  4. Jika tidak ada -> throw error jelas (bukan metadata lookup yang berisik)
 *
 * File/path kredensial dibaca, DINORMALISASI & divalidasi DI SINI (bukan diserahkan
 * ke ADC). JSON service account dari Google sebenarnya sudah valid; yang sering rusak
 * adalah saat ditempel ke env — `\n` pada private_key berubah jadi baris asli, ter-escape
 * ganda jadi `\\n`, atau nilainya ikut terbungkus kutip. Semua kasus itu dipulihkan
 * otomatis oleh normalizeServiceAccount(), sehingga error yang tersisa berupa pesan
 * spesifik — bukan "Could not load the default credentials".
 */
const loadServiceAccountJson = (): any => {
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (inline && inline.trim()) {
    const parsed = parseServiceAccountText(inline, "GOOGLE_SERVICE_ACCOUNT_JSON");
    return normalizeServiceAccount(parsed, "GOOGLE_SERVICE_ACCOUNT_JSON");
  }

  const inlineB64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
  if (inlineB64 && inlineB64.trim()) {
    const parsed = parseServiceAccountText(inlineB64, "GOOGLE_SERVICE_ACCOUNT_JSON_BASE64");
    return normalizeServiceAccount(parsed, "GOOGLE_SERVICE_ACCOUNT_JSON_BASE64");
  }

  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (envPath && envPath.trim()) {
    const cleanedPath = envPath.trim().replace(/^['"]|['"]$/g, "");
    const resolved = path.isAbsolute(cleanedPath)
      ? cleanedPath
      : path.resolve(process.cwd(), cleanedPath);

    if (!fs.existsSync(resolved)) {
      throw new Error(
        `File kredensial Google tidak ditemukan (GOOGLE_APPLICATION_CREDENTIALS): ${resolved}. ` +
          "Pastikan file JSON service account ada di lokasi tersebut, " +
          "atau set GOOGLE_SERVICE_ACCOUNT_JSON dengan isi JSON-nya.",
      );
    }

    let raw: string;
    try {
      raw = fs.readFileSync(resolved, "utf8");
    } catch (err: any) {
      throw new Error(`Tidak dapat membaca file kredensial ${resolved}: ${err?.message || err}`);
    }

    const origin = `File kredensial ${resolved}`;
    const parsed = parseServiceAccountText(raw, origin);
    return normalizeServiceAccount(parsed, origin);
  }

  throw new Error(
    'Google API belum dikonfigurasi. Set env GOOGLE_SERVICE_ACCOUNT_JSON (isi JSON service account, disarankan untuk Vercel/Cloud Run) atau GOOGLE_APPLICATION_CREDENTIALS (path file JSON service account).',
  );
};

export const authFor = (scopes: string[]) => {
  const credentials = loadServiceAccountJson();
  // Kredensial dikirim eksplisit -> GoogleAuth TIDAK lagi mencoba ADC/metadata GCE.
  return new google.auth.GoogleAuth({ scopes, credentials });
};

export { loadServiceAccountJson };
