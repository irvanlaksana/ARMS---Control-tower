import { google } from 'googleapis';

/**
 * Helper autentikasi Google Service Account yang tahan terhadap
 * error "Could not load the default credentials".
 *
 * Prioritas:
 *  1. GOOGLE_SERVICE_ACCOUNT_JSON -> isi JSON langsung (untuk Vercel/Cloud Run)
 *  2. GOOGLE_APPLICATION_CREDENTIALS -> path file JSON (untuk VPS/lokal)
 *  3. Jika tidak ada -> throw error jelas (bukan metadata lookup yang berisik)
 */
export const authFor = (scopes: string[]) => {
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (inline && inline.trim()) {
    try {
      // inline bisa berupa string JSON penuh dari service-account.json
      return new google.auth.GoogleAuth({ scopes, credentials: JSON.parse(inline) });
    } catch (err: any) {
      throw new Error(`GOOGLE_SERVICE_ACCOUNT_JSON tidak valid: ${err?.message || err}`);
    }
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // google-auth-library akan otomatis membaca file dari env var ini
    return new google.auth.GoogleAuth({ scopes });
  }
  throw new Error(
    'Google API belum dikonfigurasi. Set env GOOGLE_SERVICE_ACCOUNT_JSON (isi JSON service account, disarankan untuk Vercel/Cloud Run) atau GOOGLE_APPLICATION_CREDENTIALS (path file JSON service account).',
  );
};
