/**
 * Helper autentikasi Google Service Account untuk Netlify Functions,
 * Cloud Run, dan Local (ESM, tanpa TypeScript).
 *
 * Mendukung berbagai format input:
 *  1. GOOGLE_SERVICE_ACCOUNT_JSON (atau alias GOOGLE_SERVICE_ACCOUNT, dll)
 *  2. Base64 encoded string
 *  3. JSON yang terpotong tanpa kurung kurawal pembuka `{`
 *  4. JSON dengan newline literal di private_key
 *  5. Pasangan GOOGLE_CLIENT_EMAIL & GOOGLE_PRIVATE_KEY
 *  6. GOOGLE_APPLICATION_CREDENTIALS (path file di VPS / Local)
 *
 * Di Netlify: set secret `GOOGLE_SERVICE_ACCOUNT_JSON` (seluruh isi file
 * JSON service account) pada Site settings → Environment variables.
 * Service account yang SAMA dipakai untuk Google Drive, Google Sheets,
 * dan skrip migrasi/seed Firestore.
 */

import fs from 'node:fs';
import path from 'node:path';
import { google } from 'googleapis';

function sanitizeAndParseCredentials(rawInput) {
  let clean = String(rawInput || '').trim();

  // Hilangkan tanda kutip pembungkus terluar jika ada
  if (
    (clean.startsWith('"') && clean.endsWith('"')) ||
    (clean.startsWith("'") && clean.endsWith("'"))
  ) {
    clean = clean.slice(1, -1).trim();
  }

  // 1. Cek apakah di-encode sebagai Base64
  if (!clean.startsWith('{') && !clean.includes('"client_email"')) {
    try {
      const decoded = Buffer.from(clean, 'base64').toString('utf8');
      if (decoded.includes('client_email') || decoded.includes('private_key')) {
        clean = decoded.trim();
      }
    } catch {
      // Abaikan jika bukan base64
    }
  }

  // 2. Coba parse JSON standar langsung
  try {
    const parsed = JSON.parse(clean);
    if (parsed && typeof parsed === 'object') {
      if (typeof parsed.private_key === 'string' && parsed.private_key.includes('\\n')) {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      return parsed;
    }
  } catch {
    // Lanjut ke perbaikan otomatis di bawah
  }

  // 3. Penanganan jika kurung kurawal pembuka `{` atau penutup `}` hilang saat copy-paste
  try {
    let repaired = clean;
    if (!repaired.startsWith('{')) repaired = '{' + repaired;
    if (!repaired.endsWith('}')) repaired = repaired + '}';
    const parsed = JSON.parse(repaired);
    if (parsed && typeof parsed === 'object') {
      if (typeof parsed.private_key === 'string' && parsed.private_key.includes('\\n')) {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      if (!parsed.type) parsed.type = 'service_account';
      return parsed;
    }
  } catch {
    // Lanjut ke regex fallback
  }

  // 4. Regex extraction fallback jika JSON rusak karena karakter newline literal di private_key
  const emailMatch = clean.match(/"client_email"\s*:\s*"([^"]+)"/);
  const keyMatch = clean.match(/"private_key"\s*:\s*"([\s\S]*?)(?:(?<!\\)")/);
  const projectMatch = clean.match(/"project_id"\s*:\s*"([^"]+)"/);

  if (emailMatch && keyMatch) {
    const pk = keyMatch[1].replace(/\\n/g, '\n');
    return {
      type: 'service_account',
      project_id: projectMatch ? projectMatch[1] : 'gen-lang-client-0940128449',
      client_email: emailMatch[1],
      private_key: pk,
    };
  }

  return null;
}

export const loadServiceAccountJson = () => {
  const candidateKeys = [
    'GOOGLE_SERVICE_ACCOUNT_JSON',
    'GOOGLE_SERVICE_ACCOUNT',
    'GOOGLE_SERVICE_ACCOUNT_KEY',
    'GOOGLE_CREDENTIALS',
    'GDRIVE_SERVICE_ACCOUNT_JSON',
    'SERVICE_ACCOUNT_JSON',
    'GCP_SERVICE_ACCOUNT',
  ];

  for (const key of candidateKeys) {
    const val = process.env[key];
    if (val && val.trim()) {
      const parsed = sanitizeAndParseCredentials(val);
      if (parsed && parsed.client_email && parsed.private_key) {
        return parsed;
      }
    }
  }

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL || process.env.GSERVICE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || process.env.GSERVICE_PRIVATE_KEY;
  if (clientEmail && privateKey) {
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    return {
      type: 'service_account',
      project_id: process.env.GOOGLE_PROJECT_ID || 'gen-lang-client-0940128449',
      client_email: clientEmail.trim(),
      private_key: privateKey.trim(),
    };
  }

  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (envPath && envPath.trim()) {
    const resolved = path.isAbsolute(envPath)
      ? envPath
      : path.resolve(process.cwd(), envPath);

    if (fs.existsSync(resolved)) {
      try {
        const raw = fs.readFileSync(resolved, 'utf8');
        const parsed = sanitizeAndParseCredentials(raw);
        if (parsed) return parsed;
      } catch (err) {
        throw new Error(`Tidak dapat membaca file kredensial ${resolved}: ${err?.message || err}`);
      }
    }
  }

  // Fallback lokal: file service-account.json di root repo (hanya untuk dev;
  // di Netlify selalu pakai env GOOGLE_SERVICE_ACCOUNT_JSON)
  const localFile = path.resolve(process.cwd(), 'service-account.json');
  if (fs.existsSync(localFile)) {
    try {
      const parsed = sanitizeAndParseCredentials(fs.readFileSync(localFile, 'utf8'));
      if (parsed) return parsed;
    } catch (err) {
      throw new Error(`Tidak dapat membaca ${localFile}: ${err?.message || err}`);
    }
  }

  throw new Error(
    'Google Service Account belum dikonfigurasi. Tambahkan environment variable GOOGLE_SERVICE_ACCOUNT_JSON di Netlify (Site settings → Environment variables) atau letakkan service-account.json di root repo (lokal).'
  );
};

export const isGoogleAuthAvailable = () => {
  try {
    loadServiceAccountJson();
    return true;
  } catch {
    return false;
  }
};

export const getServiceAccountEmail = () => {
  try {
    const creds = loadServiceAccountJson();
    return creds?.client_email || null;
  } catch {
    return null;
  }
};

export const authFor = (scopes) => {
  const credentials = loadServiceAccountJson();
  return new google.auth.GoogleAuth({ scopes, credentials });
};
