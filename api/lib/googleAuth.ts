import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";

/**
 * Helper autentikasi Google Service Account yang tahan terhadap
 * error "Could not load the default credentials".
 *
 * Prioritas:
 *  1. GOOGLE_SERVICE_ACCOUNT_JSON -> isi JSON langsung (untuk Vercel/Cloud Run)
 *  2. GOOGLE_APPLICATION_CREDENTIALS -> path file JSON (untuk VPS/lokal)
 *  3. Jika tidak ada -> throw error jelas (bukan metadata lookup yang berisik)
 *
 * File/path kredensial dibaca & divalidasi DI SINI (bukan diserahkan ke ADC),
 * sehingga error seperti "file tidak ditemukan" / "JSON tidak valid" muncul
 * lebih awal dengan pesan yang jelas — bukan "Could not load the default credentials".
 */
const loadServiceAccountJson = (): any => {
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (inline && inline.trim()) {
    // inline bisa berupa string JSON penuh dari service-account.json
    try {
      return JSON.parse(inline);
    } catch (err: any) {
      throw new Error(
        `GOOGLE_SERVICE_ACCOUNT_JSON tidak valid (bukan JSON): ${err?.message || err}`,
      );
    }
  }

  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (envPath && envPath.trim()) {
    const resolved = path.isAbsolute(envPath)
      ? envPath
      : path.resolve(process.cwd(), envPath);

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

    try {
      return JSON.parse(raw);
    } catch (err: any) {
      throw new Error(
        `File kredensial bukan JSON valid (GOOGLE_APPLICATION_CREDENTIALS=${resolved}): ${err?.message || err}`,
      );
    }
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
