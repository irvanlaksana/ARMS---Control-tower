import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";

/**
 * Helper autentikasi Google Service Account untuk Vercel, Cloud Run, dan Local.
 * Prioritas:
 *  1. GOOGLE_SERVICE_ACCOUNT_JSON -> isi JSON langsung (Vercel / Cloud Run env)
 *  2. GOOGLE_APPLICATION_CREDENTIALS -> path file JSON (VPS / Local)
 *
 * Tambahan (perbaikan error "A server error occurred." / JSON tidak terbaca):
 *  - Instance GoogleAuth di-cache per set scope, sehingga satu request tidak lagi
 *    meminta access token baru ke Google pada setiap panggilan. `ensure-path`
 *    memanggil 2 endpoint Drive per segmen folder; tanpa cache, 1 klik tombol
 *    "Buat Folder" memicu 3 request paralel x beberapa token = mudah kena 429
 *    rate limit OAuth yang membuat fungsi server crash sebelum mengirim JSON.
 *  - `describeGoogleError()` menerjemahkan error mentah Google menjadi
 *    kode + pesan + saran tindakan, supaya frontend tidak menampilkan
 *    "Unexpected token 'A'..." yang tidak informatif.
 */

/** Scope penuh: wajib bila folder master dibuat manual lalu di-share ke service account. */
export const DRIVE_SCOPE_FULL = "https://www.googleapis.com/auth/drive";
/**
 * Scope `drive.file` hanya boleh menyentuh berkas yang DIBUAT OLEH aplikasi ini.
 * Kalau folder master dibuat manual di Drive (Langkah 4.2 README), scope ini
 * membuat folder master "tidak terlihat" -> 404 / "The caller does not have permission".
 */
export const DRIVE_SCOPE_FILE_ONLY = "https://www.googleapis.com/auth/drive.file";

/**
 * Scope Drive yang dipakai. Default `drive` (paling kompatibel dengan folder master
 * hasil share manual). Bisa dikunci ke `drive.file` lewat env GOOGLE_DRIVE_SCOPES
 * bila organisasi menuntut least privilege — dengan syarat folder master juga
 * dibuat oleh aplikasi ini.
 */
export const driveScopes = (): string[] => {
  const custom = String(process.env.GOOGLE_DRIVE_SCOPES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return custom.length ? custom : [DRIVE_SCOPE_FULL];
};
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

/** Ringkasan kredensial untuk diagnosis (tanpa membocorkan private key). */
export const getCredentialsInfo = (): {
  source: 'GOOGLE_SERVICE_ACCOUNT_JSON' | 'GOOGLE_APPLICATION_CREDENTIALS' | 'none';
  clientEmail: string | null;
  projectId: string | null;
  privateKeyLooksValid: boolean;
} => {
  const inline = String(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '').trim();
  const envPath = String(process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
  try {
    const creds = loadServiceAccountJson();
    return {
      source: inline ? 'GOOGLE_SERVICE_ACCOUNT_JSON' : envPath ? 'GOOGLE_APPLICATION_CREDENTIALS' : 'none',
      clientEmail: creds?.client_email || null,
      projectId: creds?.project_id || null,
      privateKeyLooksValid: /BEGIN (RSA )?PRIVATE KEY/.test(String(creds?.private_key || '')),
    };
  } catch {
    return {
      source: inline ? 'GOOGLE_SERVICE_ACCOUNT_JSON' : envPath ? 'GOOGLE_APPLICATION_CREDENTIALS' : 'none',
      clientEmail: null,
      projectId: null,
      privateKeyLooksValid: false,
    };
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

/** Cache instance GoogleAuth per set scope (GoogleAuth sudah me-refresh token internal). */
const authInstances = new Map<string, any>();

/**
 * Instance GoogleAuth (di-cache). Melempar Error dengan pesan jelas bila kredensial
 * belum ada / tidak valid — TIDAK pernah memakai ADC metadata GCE.
 */
export const authFor = (scopes: string[]) => {
  const key = scopes.join(',');
  const cached = authInstances.get(key);
  if (cached) return cached;
  const auth = new google.auth.GoogleAuth({ scopes, credentials: loadServiceAccountJson() });
  authInstances.set(key, auth);
  return auth;
};

/**
 * Ambil access token (dipakai probe status). Berhasil = kredensial valid &
 * Google mau menerimanya — cara tercepat memastikan "kredensial service account"
 * bukan sumber masalah, tanpa memanggil API Drive.
 */
export const getAccessTokenInfo = async (
  scopes: string[] = driveScopes(),
): Promise<{ ok: boolean; expiresAt?: number; error?: NormalizedGoogleError }> => {
  try {
    const client: any = await authFor(scopes).getClient();
    const raw = await client.getAccessToken();
    const token = typeof raw === 'string' ? raw : raw?.token;
    if (!token) {
      return {
        ok: false,
        error: normalizeErrorObject(
          new Error('Google mengembalikan access token kosong.'),
          { code: 'auth_failed' },
        ),
      };
    }
    const expiry = typeof raw === 'object' && raw?.expiry_date ? Number(raw.expiry_date) : undefined;
    return { ok: true, expiresAt: expiry };
  } catch (err: any) {
    return { ok: false, error: describeGoogleError(err) };
  }
};

/* ------------------------------------------------------------------ */
/*  Normalisasi error Google API                                      */
/* ------------------------------------------------------------------ */

export type GoogleErrorCode =
  | 'not_configured'
  | 'bad_credentials'
  | 'auth_failed'
  | 'api_disabled'
  | 'forbidden'
  | 'parent_not_found'
  | 'rate_limited'
  | 'sa_storage_quota'
  | 'google_unavailable'
  | 'network'
  | 'bad_request'
  | 'internal';

export interface NormalizedGoogleError {
  /** Kode stabil untuk logika frontend. */
  code: GoogleErrorCode;
  /** HTTP status dari Google (bila ada). */
  httpStatus?: number;
  /** Pesan singkat bahasa Indonesia, siap ditampilkan ke pengguna. */
  message: string;
  /** Langkah perbaikan konkret. */
  hint?: string;
  /** Aman untuk di-retry. */
  retryable: boolean;
  /** Pesan asli Google, untuk log/detail teknis. */
  detail?: string;
  /** True bila penyebabnya kuota storage service account. */
  quotaLimited?: boolean;
}

const readGoogleErrorParts = (err: any) => {
  const data = err?.response?.data?.error;
  const first = Array.isArray(data?.errors) ? data.errors[0] : undefined;
  const candidates = [err?.response?.status, err?.status, err?.code, data?.code];
  const found = candidates.map((c) => Number(c)).find((n) => Number.isFinite(n) && n >= 400 && n <= 599);
  return {
    rawMessage: String(data?.message || first?.message || err?.message || err || ''),
    reason: String(first?.reason || data?.status || '').toLowerCase(),
    status: found,
  };
};

const normalizeErrorObject = (
  err: any,
  override: Partial<NormalizedGoogleError> = {},
): NormalizedGoogleError => ({
  code: 'internal',
  message: String(err?.message || err || 'Kesalahan tidak diketahui.'),
  retryable: false,
  detail: String(err?.stack || err?.message || err || ''),
  ...override,
});

/**
 * Terjemahkan error (Google API / auth / jaringan) menjadi kode + pesan + saran.
 * Dipakai endpoint Drive & Sheets agar selalu membalas JSON terstruktur, bukan
 * melempar error yang berubah menjadi halaman "A server error occurred."
 */
export const describeGoogleError = (err: any): NormalizedGoogleError => {
  if (err?.__driveError) return err.normalized ?? normalizeErrorObject(err);
  const { rawMessage, reason, status } = readGoogleErrorParts(err);
  const msg = rawMessage;
  const lower = msg.toLowerCase();

  const base = (over: Partial<NormalizedGoogleError>): NormalizedGoogleError => ({
    code: 'internal',
    message: msg,
    retryable: false,
    httpStatus: status,
    detail: msg,
    ...over,
  });

  if (/belum dikonfigurasi|no credentials|missing credentials/.test(lower)) {
    return base({
      code: 'not_configured',
      message: 'Google Drive Service Account belum dikonfigurasi di server.',
      hint: 'Isi GOOGLE_SERVICE_ACCOUNT_JSON (Vercel → Settings → Environment Variables) atau GOOGLE_APPLICATION_CREDENTIALS (VPS), lalu redeploy/restart server.',
    });
  }
  if (/invalid_grant|invalid client|invalid jwt|not a valid pem|private_key|signature mismatch/.test(lower) || reason.includes('invalid_grant')) {
    return base({
      code: 'bad_credentials',
      message: 'Google menolak kredensial service account (invalid_grant / private key tidak valid).',
      hint: 'Buat API key baru di Google Cloud → IAM & Admin → Service Accounts → Keys, tempel SELURUH isi JSON ke GOOGLE_SERVICE_ACCOUNT_JSON (ganti \\n asli dengan \\n di string JSON), jalankan `npm run validate:creds` untuk memastikan.',
    });
  }
  if (/access not configured|api has not been used|drive api/.test(lower) || reason === 'accessnotconfigured' || reason === 'accessnotconfigoredon' || /serviceusage/.test(lower)) {
    return base({
      code: 'api_disabled',
      message: 'Google Drive API belum diaktifkan pada project service account.',
      hint: `Buka Google Cloud Console → APIs & Services → Library → aktifkan "Google Drive API" untuk project ${err?.projectId || process.env.GOOGLE_PROJECT_ID || 'service account'} lalu tunggu ±1 menit.`,
    });
  }
  if (/service accounts do not have storage quota/.test(lower)) {
    return base({
      code: 'sa_storage_quota',
      message: 'Service account tidak punya kuota storage di Drive pribadi — unggah berkas fisik memerlukan Shared Drive.',
      hint: 'Pindahkan folder master ke Google Workspace Shared Drive (Drive Bersama) dan jadikan email service account sebagai "Manager"/"Editor", atau biarkan sistem memakai fallback penyimpanan database (foto tetap aman tersimpan).',
      quotaLimited: true,
    });
  }
  if (status === 429 || /ratelimit|rate limit|too many request|capacity/.test(lower) || reason === 'userratelimitexceeded' || reason === 'ratelimitexceeded') {
    return base({
      code: 'rate_limited',
      message: 'Permintaan ke Google Drive melebihi batas kuota API (429 rate limit).',
      hint: 'Tunggu 30–60 detik lalu klik ulang. Bila terus terjadi, naikkan kuota Drive API di Google Cloud Console → IAM & Admin → Quotas.',
      retryable: true,
    });
  }
  if (status === 404 || /file not found with id|file id .* not found|not found: fileid|no such folder/.test(lower)) {
    return base({
      code: 'parent_not_found',
      message: 'Folder induk (folder master) tidak ditemukan oleh Google Drive.',
      hint: 'Salin ID folder asli dari URL https://drive.google.com/drive/folders/<ID> lalu tempel di Pengaturan → Folder Master GDrive. ID contoh pada README (1BxPvATw...) bukan milik akun Anda, jadi akan selalu 404. Pastikan juga folder di-share ke email service account.',
    });
  }
  if (status === 403 || /does not have permission|permissiondenied|insufficient/.test(lower) || reason === 'forbidden' || reason === 'permissiondenied') {
    return base({
      code: 'forbidden',
      message: 'Service account tidak punya akses tulis ke folder tersebut (403).',
      hint: 'Share folder master (dan folder induk) ke email service account sebagai Editor; untuk Shared Drive tambahkan member "Manager"/"Content manager". Jika folder dibuat manual (bukan oleh aplikasi), pastikan scope tidak dikunci ke drive.file — default repo ini memakai scope drive penuh.',
    });
  }
  if (status === 400 || reason === 'invalid' || /invalid request|bad request/.test(lower)) {
    return base({
      code: 'bad_request',
      message: 'Permintaan folder tidak valid menurut Google Drive.',
      hint: 'Nama folder terlalu panjang / berisi karakter yang tidak diizinkan, atau ID folder induk salah format. Ulangi dengan nama alfanumerik.',
    });
  }
  if (status === 401 || /unauthorized|invalid credentials|could not load the default credentials/.test(lower)) {
    return base({
      code: 'auth_failed',
      message: 'Autentikasi Google gagal (401) — token service account tidak bisa didapat.',
      hint: 'Cek apakah SA masih aktif (belum dihapus/di-disable) dan key JSON belum kedaluwarsa; jalankan `npm run validate:creds`.',
    });
  }
  if (status === 500 || status === 502 || status === 503 || /backend error|temporary error|try again|internal error/.test(lower)) {
    return base({
      code: 'google_unavailable',
      message: 'Google Drive API sedang bermasalah (error sementara dari Google).',
      hint: 'Coba lagi 1–2 menit. Bila gagal terus, buka https://workspace.google.com/status/workspace untuk melihat status layanan.',
      retryable: true,
    });
  }
  if (/econn|enotfound|etimedout|network|fetch failed|socket hang|aborted/.test(lower)) {
    return base({
      code: 'network',
      message: 'Server tidak dapat menghubungi Google (jaringan/proxy diblokir).',
      hint: 'Pastikan server (Vercel/VPS) punya akses keluar ke https://www.googleapis.com; untuk VPS cek firewall/proxy dan `curl -I https://www.googleapis.com/discovery/v1/apis/drive/v3/rest`.',
      retryable: true,
    });
  }

  return base({
    code: 'internal',
    message: msg || 'Google Drive mengembalikan error yang tidak dikenali.',
    hint: 'Lihat log fungsi di Vercel (Deployments → View Functions Log) untuk detail lengkap dari Google Drive API.',
  });
};

/** Error Drive terstruktur: sudah membawa pesan manusiawi + kode + hint untuk frontend. */
export class DriveOperationError extends Error {
  readonly __driveError = true;
  readonly normalized: NormalizedGoogleError;
  configured: boolean;

  constructor(normalized: NormalizedGoogleError, opts: { configured?: boolean } = {}) {
    super(normalized.message);
    this.name = 'DriveOperationError';
    this.normalized = normalized;
    this.configured = opts.configured ?? true;
  }

  /** Body JSON yang selalu dikembalikan endpoint Drive (HTTP 200, success:false). */
  toResponseBody() {
    return {
      success: false,
      configured: this.configured,
      errorCode: this.normalized.code,
      httpStatus: this.normalized.httpStatus ?? null,
      error: this.normalized.message,
      hint: this.normalized.hint ?? null,
      retryable: Boolean(this.normalized.retryable),
      quotaLimited: this.normalized.code === 'sa_storage_quota',
      detail: this.normalized.detail ?? null,
    };
  }
}

/** Bangun DriveOperationError dari error mentah apa pun. */
export const toDriveOperationError = (err: any): DriveOperationError =>
  err instanceof DriveOperationError ? err : new DriveOperationError(describeGoogleError(err));

