import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";

/**
 * Helper autentikasi Google Service Account untuk Vercel, Cloud Run, dan Local.
 * Prioritas:
 *  1. GOOGLE_SERVICE_ACCOUNT_JSON -> isi JSON langsung (Vercel / Cloud Run env)
 *  2. GOOGLE_APPLICATION_CREDENTIALS -> path file JSON (VPS / Local)
 */
export const loadServiceAccountJson = (): any => {
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (inline && inline.trim()) {
    try {
      // Decode jika base64 atau parse JSON langsung
      const clean = inline.trim();
      if (clean.startsWith('{')) {
        return JSON.parse(clean);
      }
      // Coba decode base64 jika bukan string JSON biasa
      const decoded = Buffer.from(clean, 'base64').toString('utf8');
      if (decoded.startsWith('{')) {
        return JSON.parse(decoded);
      }
      return JSON.parse(clean);
    } catch (err: any) {
      throw new Error(
        `GOOGLE_SERVICE_ACCOUNT_JSON tidak valid (bukan JSON): ${err?.message || err}`
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
        `File kredensial Google tidak ditemukan (GOOGLE_APPLICATION_CREDENTIALS): ${resolved}.`
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
        `File kredensial bukan JSON valid: ${err?.message || err}`
      );
    }
  }

  throw new Error(
    'Google Drive API belum dikonfigurasi. Tambahkan environment variable GOOGLE_SERVICE_ACCOUNT_JSON di Vercel atau .env.'
  );
};

export const isGoogleAuthAvailable = (): boolean => {
  try {
    loadServiceAccountJson();
    return true;
  } catch {
    return false;
  }
};

export const getServiceAccountEmail = (): string | null => {
  try {
    const creds = loadServiceAccountJson();
    return creds?.client_email || null;
  } catch {
    return null;
  }
};

export const authFor = (scopes: string[]) => {
  const credentials = loadServiceAccountJson();
  return new google.auth.GoogleAuth({ scopes, credentials });
};
