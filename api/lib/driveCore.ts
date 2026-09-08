/**
 * Inti operasi Google Drive (folder & unggah) — dipakai BERSAMA oleh:
 *   - Vercel Serverless Functions  : api/drive/*.ts
 *   - Express dev/prod server       : server.ts (VPS / lokal)
 *
 * Prinsip desain (menghilangkan bug "Unexpected token 'A', \"A server e\"..."):
 *   1. Tidak pernah melempar error ke runtime. Semua kegagalan dikumpulkan sebagai
 *      `DriveOperationError` berisi kode + pesan + hint, lalu endpoint membalasnya
 *      sebagai JSON HTTP 200 `{ success: false, ... }`. Fungsi serverless yang membalas
 *      HTTP 500 (atau crash/timeout) akan ditimpa Vercel dengan teks polos
 *      "A server error occurred." sehingga `resp.json()` di browser gagal parse.
 *   2. Idempoten: folder dicari dulu (list) sebelum dibuat, jadi retry aman.
 *   3. Retry otomatis (1x) untuk error sementara Google (429/5xx/jaringan).
 */
import { Readable } from 'node:stream';
import { google } from 'googleapis';
import type { drive_v3 } from 'googleapis';
import {
  authFor,
  describeGoogleError,
  driveScopes,
  getAccessTokenInfo,
  getCredentialsInfo,
  isGoogleAuthAvailable,
  toDriveOperationError,
  DriveOperationError,
  type NormalizedGoogleError,
} from './googleAuth';

export const FOLDER_MIME = 'application/vnd.google-apps.folder';
const MAX_SEGMENTS = 12;
const MAX_NAME_LEN = 180;
const RETRY_BACKOFF_MS = 1_500;
const MAX_RETRY = 1;

export interface DriveFolderResult {
  folderId: string;
  name: string;
  webViewLink: string;
  /** true bila folder sudah ada dan dipakai ulang (tidak membuat baru). */
  reused: boolean;
}

export interface DrivePathResult {
  folderId: string;
  webViewLink: string;
  created: DriveFolderResult[];
  reusedPath: string[];
  rootId?: string;
}

export interface DriveUploadResult {
  fileId: string;
  fileName: string;
  webViewLink: string;
  directViewUrl: string;
  sizeBytes: number;
}

const folderLink = (id: string) => `https://drive.google.com/drive/folders/${id}?usp=sharing`;

/** Nama folder yang aman: trim, rapikan spasi, batasi panjang. */
export const cleanFolderName = (raw: unknown): string => {
  const name = String(raw ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return name.slice(0, MAX_NAME_LEN);
};

/** Bersihkan & validasi array segmen path; mengembalikan [] bila kosong. */
export const cleanPathSegments = (raw: unknown): string[] => {
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
  return list
    .map(cleanFolderName)
    .filter((n) => n.length > 0 && n !== '.' && n !== '..')
    .slice(0, MAX_SEGMENTS);
};

const driveQuote = (value: string) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

/** ID folder Drive: token tanpa spasi (bukan nama, jadi tidak boleh dipotong/diubah kapital). */
export const cleanFolderId = (raw: unknown): string => String(raw ?? '').trim().split(/\s+/)[0].replace(/\/$/, '');

/** Buat klien Drive dengan kredensial tervalidasi (token diminta via GoogleAuth yang di-cache). */
const getDriveClient = async (): Promise<drive_v3.Drive> => {
  if (!isGoogleAuthAvailable()) {
    throw new DriveOperationError(describeGoogleError(new Error('Google Drive Service Account belum dikonfigurasi di server.')), {
      configured: false,
    });
  }
  const scopes = driveScopes();
  const token = await getAccessTokenInfo(scopes);
  if (!token.ok) {
    throw new DriveOperationError(token.error ?? { code: 'auth_failed', message: 'Autentikasi Google gagal.', retryable: false });
  }
  return google.drive({ version: 'v3', auth: authFor(scopes) });
};

const isRetryable = (normalized: NormalizedGoogleError) => Boolean(normalized.retryable);

const runWithRetry = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err: any) {
      const normalized = describeGoogleError(err);
      // Hanya error sementara (429/5xx/jaringan) yang diulang; 403/404 langsung
      // dilaporkan lengkap dengan hint soal kredensial / folder master.
      if (attempt < MAX_RETRY && isRetryable(normalized)) {
        attempt += 1;
        console.warn(`[drive:${label}] percobaan ${attempt} gagal (${normalized.code}), retry...`);
        await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS * attempt));
        continue;
      }
      throw new DriveOperationError({ ...normalized, detail: `[${label}] ${normalized.detail || normalized.message}` });
    }
  }
};

/** Cari folder langsung di bawah parent berdasarkan nama. */
const findChildFolder = async (
  drive: drive_v3.Drive,
  parentId: string,
  name: string,
): Promise<string | undefined> => {
  const q =
    `name = '${driveQuote(name)}' and '${driveQuote(parentId)}' in parents ` +
    `and mimeType = '${FOLDER_MIME}' and trashed = false`;
  const list = await runWithRetry('files.list', () =>
    drive.files.list({
      q,
      fields: 'files(id, name)',
      pageSize: 5,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    }),
  );
  return list.data.files?.[0]?.id;
};

/** Buat permission "anyone with link: reader" (best-effort; Shared Drive sering menolaknya). */
const sharePubliclyBestEffort = async (drive: drive_v3.Drive, fileId: string) => {
  try {
    await drive.permissions.create({
      fileId,
      supportsAllDrives: true,
      sendNotificationEmail: false,
      requestBody: { role: 'reader', type: 'anyone' },
    });
    return true;
  } catch (err: any) {
    console.warn('[drive:permissions.create] dilewati:', err?.message || err);
    return false;
  }
};

export interface CreateFolderOptions {
  /** Bila true dan folder dengan nama sama sudah ada di parent, pakai ulang. */
  reuseExisting?: boolean;
  /** Set true untuk membuat permission link publik (default true). */
  publicLink?: boolean;
}

/** Buat satu folder Drive (opsional di dalam parent). */
export const createDriveFolder = async (
  rawName: unknown,
  parentId?: string | null,
  opts: CreateFolderOptions = {},
): Promise<DriveFolderResult> => {
  const name = cleanFolderName(rawName);
  if (!name) {
    throw new DriveOperationError({
      code: 'bad_request',
      message: 'Nama folder kosong / tidak valid.',
      hint: 'Isi nama folder lebih dulu (huruf, angka, spasi, garis bawah, atau strip).',
      retryable: false,
    });
  }
  const parent = cleanFolderId(parentId);
  const drive = await getDriveClient();

  if (parent && opts.reuseExisting) {
    const existing = await findChildFolder(drive, parent, name).catch(() => undefined);
    if (existing) {
      return { folderId: existing, name, webViewLink: folderLink(existing), reused: true };
    }
  }

  const requestBody: drive_v3.Schema$File = { name, mimeType: FOLDER_MIME };
  if (parent) requestBody.parents = [parent];

  const created = await runWithRetry('files.create', () =>
    drive.files.create({
      requestBody,
      fields: 'id, name, webViewLink, driveId',
      supportsAllDrives: true,
    }),
  );

  const folderId = created.data.id;
  if (!folderId) {
    throw new DriveOperationError({
      code: 'internal',
      message: 'Google Drive tidak mengembalikan ID folder.',
      hint: 'Coba lagi; bila berulang periksa log fungsi (Vercel → Functions Log).',
      retryable: true,
      detail: JSON.stringify(created.data ?? {}),
    });
  }

  const publicLink = opts.publicLink !== false;
  if (publicLink) await sharePubliclyBestEffort(drive, folderId);

  return {
    folderId,
    name: created.data.name || name,
    webViewLink: folderLink(folderId),
    reused: false,
  };
};

/**
 * Pastikan struktur folder bertingkat ada di dalam folder master, membuat yang belum ada.
 * `rootId` dikosongkan berarti dibuat di My Drive milik service account.
 */
export const ensureDrivePathCore = async (
  rawSegments: unknown,
  rootId?: string | null,
  opts: { publicLink?: boolean } = {},
): Promise<DrivePathResult> => {
  const segments = cleanPathSegments(rawSegments);
  if (segments.length === 0) {
    throw new DriveOperationError({
      code: 'bad_request',
      message: 'Path folder kosong (butuh minimal 1 nama folder).',
      hint: 'Contoh path: ["PT_MJ_INDONESIA","DATABASE_KARYAWAN","BUDI SANTOSO","01_KTP"].',
      retryable: false,
    });
  }

  const root = cleanFolderId(rootId);
  const drive = await getDriveClient();

  let parentId = root;
  const created: DriveFolderResult[] = [];
  const reusedPath: string[] = [];

  for (const name of segments) {
    let folderId: string | undefined;
    if (parentId) {
      try {
        folderId = await findChildFolder(drive, parentId, name);
      } catch (err: any) {
        const normalized = err instanceof DriveOperationError ? err.normalized : describeGoogleError(err);
        // Parent tidak terlihat (404/403) → folder master salah ID / belum di-share.
        if (normalized.code === 'parent_not_found' || normalized.code === 'forbidden') {
          throw new DriveOperationError({
            ...normalized,
            detail: `${normalized.detail || ''} (parent=${parentId})`,
          });
        }
        console.warn('[drive:ensure-path] pencarian folder dilewati:', normalized.message);
      }
    }

    if (!folderId) {
      const requestBody: drive_v3.Schema$File = { name, mimeType: FOLDER_MIME };
      if (parentId) requestBody.parents = [parentId];
      const res = await runWithRetry('files.create', () =>
        drive.files.create({
          requestBody,
          fields: 'id, name, webViewLink, driveId',
          supportsAllDrives: true,
        }),
      );
      folderId = res.data.id;
      if (!folderId) {
        throw new DriveOperationError({
          code: 'internal',
          message: `Folder "${name}" tidak tercipta (Google tidak mengirim ID).`,
          hint: 'Periksa log fungsi server; kemungkinan kuota API project habis.',
          retryable: true,
        });
      }
      if (opts.publicLink !== false) await sharePubliclyBestEffort(drive, folderId);
      created.push({ folderId, name, webViewLink: folderLink(folderId), reused: false });
    } else {
      reusedPath.push(name);
    }

    parentId = folderId;
  }

  if (!parentId) {
    throw new DriveOperationError({
      code: 'internal',
      message: 'Struktur folder tidak berhasil dibuat.',
      hint: 'Periksa kredensial service account & akses folder master, lalu ulangi.',
      retryable: false,
    });
  }

  return {
    folderId: parentId,
    webViewLink: folderLink(parentId),
    created,
    reusedPath,
    rootId: root || undefined,
  };
};

/** Unggah buffer/base64 ke Drive (dipakai /api/drive/upload di Vercel maupun server.ts). */
export const uploadDriveBuffer = async (params: {
  fileName: unknown;
  base64: string;
  mimeType?: string | null;
  folderId?: string | null;
}): Promise<DriveUploadResult> => {
  const fileName = cleanFolderName(params.fileName) || `ARMS_${Date.now()}`;
  const raw = String(params.base64 || '');
  const match = raw.match(/^data:(.+);base64,(.*)$/);
  const rawBase64 = (match ? match[2] : raw.replace(/^base64,/, '')).trim();
  const effectiveMime = (match ? match[1] : params.mimeType) || 'application/octet-stream';
  if (!rawBase64) {
    throw new DriveOperationError({
      code: 'bad_request',
      message: 'Payload base64 kosong.',
      hint: 'Pilih ulang berkas lalu simpan kembali.',
      retryable: false,
    });
  }

  const buffer = Buffer.from(rawBase64, 'base64');
  const drive = await getDriveClient();
  const folder = cleanFolderId(params.folderId);

  const requestBody: drive_v3.Schema$File = { name: fileName };
  if (folder) requestBody.parents = [folder];

  const created = await runWithRetry('files.create(upload)', () =>
    drive.files.create({
      requestBody,
      media: { mimeType: effectiveMime, body: Readable.from(buffer) },
      fields: 'id, name, webViewLink, webContentLink',
      supportsAllDrives: true,
    }),
  );

  const fileId = created.data.id;
  if (!fileId) {
    throw new DriveOperationError({
      code: 'internal',
      message: 'Google Drive tidak mengembalikan ID berkas.',
      hint: 'Coba lagi; periksa log fungsi bila berulang.',
      retryable: true,
    });
  }

  await sharePubliclyBestEffort(drive, fileId);

  return {
    fileId,
    fileName: created.data.name || fileName,
    webViewLink: created.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
    directViewUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
    sizeBytes: buffer.length,
  };
};

/**
 * Diagnosa kesiapan Drive: kredensial → access token → Drive API → (opsional) folder master.
 * Dipakai GET /api/drive/status?probe=1&folderId=<ID> agar pengguna tahu PERSISNYA
 * bagian mana yang belum benar, bukan menerima "Unexpected token 'A'...".
 */
export const probeDriveAccess = async (folderId?: string | null): Promise<Record<string, any>> => {
  const info = getCredentialsInfo();
  const result: Record<string, any> = {
    configured: isGoogleAuthAvailable(),
    credentialSource: info.source,
    serviceAccountEmail: info.clientEmail,
    projectId: info.projectId,
    privateKeyLooksValid: info.privateKeyLooksValid,
    scopes: driveScopes(),
    checks: [] as Array<{ step: string; ok: boolean; message: string; hint?: string; code?: string }>,
  };
  const push = (step: string, ok: boolean, message: string, extra: { hint?: string; code?: string } = {}) =>
    result.checks.push({ step, ok, message, ...extra });

  result.instructions = undefined;
  if (!result.configured) {
    push(
      'kredensial',
      false,
      'GOOGLE_SERVICE_ACCOUNT_JSON / GOOGLE_APPLICATION_CREDENTIALS belum tersedia di server.',
      { code: 'not_configured', hint: 'Isi env di Vercel → Settings → Environment Variables (Production), lalu redeploy.' },
    );
    return result;
  }

  const token = await getAccessTokenInfo();
  if (!token.ok) {
    push('access token', false, token.error?.message || 'Gagal mengambil access token.', {
      code: token.error?.code,
      hint: token.error?.hint,
    });
    return result;
  }
  push('access token', true, 'Token Google diterima — kredensial service account valid.');

  try {
    const drive = google.drive({ version: 'v3', auth: authFor(driveScopes()) });
    const about = await drive.about.get({ fields: 'kind,user,storageQuota,maxUploadSize' });
    push(
      'Google Drive API',
      true,
      `Drive API aktif untuk ${about.data?.user?.displayName || 'service account'}${
        about.data?.storageQuota?.limit ? ` (kuota ${(Number(about.data.storageQuota.usage || 0) / 1e6).toFixed(1)} MB dipakai dari ${(Number(about.data.storageQuota.limit || 0) / 1e6).toFixed(0)} MB)` : ' (kuota tidak terbatas / Shared Drive)'
      }.`,
    );
    result.about = {
      user: about.data?.user?.displayName || null,
      emailAddress: about.data?.user?.emailAddress || null,
      storageQuota: about.data?.storageQuota || null,
      maxUploadSize: about.data?.maxUploadSize ?? null,
    };

    const target = cleanFolderId(folderId);
    if (target) {
      try {
        const meta = await drive.files.get({
          fileId: target,
          supportsAllDrives: true,
          fields: 'id, name, mimeType, driveId, capabilities, parents',
        });
        const isFolder = meta.data.mimeType === FOLDER_MIME;
        const driveKindNote = meta.data.driveId
          ? ' (Shared Drive — unggah berkas fisik didukung)'
          : ' (Drive pribadi — berkas besar bisa jatuh ke fallback database)';
        if (isFolder) {
          push('folder master', true, `Folder "${meta.data.name}" dapat diakses service account${driveKindNote}.`);
        } else {
          push('folder master', false, `ID "${target}" menunjuk ke berkas (${meta.data.mimeType}), bukan folder.`, {
            code: 'bad_request',
            hint: 'Gunakan ID folder master, bukan ID berkas. Salin dari URL drive.google.com/drive/folders/<ID>.',
          });
        }
        result.folder = {
          id: meta.data.id,
          name: meta.data.name,
          mimeType: meta.data.mimeType,
          isSharedDrive: Boolean(meta.data.driveId),
          driveId: meta.data.driveId || null,
          canAddChildren: meta.data.capabilities?.canAddChildren ?? null,
          canEdit: meta.data.capabilities?.canEdit ?? null,
        };
        if (meta.data.driveId) {
          try {
            const sd: any = await drive.drives.get({ driveId: meta.data.driveId, useDomainAdminAccess: false });
            result.sharedDrive = {
              name: sd?.data?.name || null,
              role: sd?.data?.role ?? null,
              canShare: sd?.data?.capabilities?.canShare ?? null,
              canAddChildren: sd?.data?.capabilities?.canAddChildren ?? null,
            };
          } catch {
            /* tidak wajib */
          }
        }
        if (meta.data.capabilities && meta.data.capabilities.canAddChildren === false) {
          push('hak tulis', false, 'Service account hanya boleh membaca folder master (canAddChildren = false).', {
            code: 'forbidden',
            hint: 'Naikkan akses share menjadi Editor; pada Shared Drive pilih peran "Content manager" atau "Manager".',
          });
        } else {
          push('hak tulis', true, 'Service account boleh menambah isi (buat folder/berkas) di folder master.');
        }
      } catch (err: any) {
        const normalized = describeGoogleError(err);
        push('folder master', false, normalized.message, { code: normalized.code, hint: normalized.hint });
        result.folder = { id: target, accessible: false, errorCode: normalized.code };
      }
    }
  } catch (err: any) {
    const normalized = describeGoogleError(err);
    push('Google Drive API', false, normalized.message, { code: normalized.code, hint: normalized.hint });
  }

  result.ready = result.checks.every((c: any) => c.ok);
  result.instructions = !result.configured
    ? 'Google Drive belum dikonfigurasi. Tambahkan GOOGLE_SERVICE_ACCOUNT_JSON di Vercel atau .env.'
    : result.ready
      ? 'Semua pemeriksaan lolos: token service account valid, Drive API aktif, dan folder master dapat diakses.'
      : 'Kredensial terbaca, tetapi ada pemeriksaan yang gagal — lihat daftar "checks" untuk langkah mana yang macet.';
  return result;
};

/** Bungkus handler serverless: selalu balas JSON, tidak pernah biarkan runtime mencetak halaman error. */
export const driveJson = (res: any, payload: Record<string, any>, status = 200) => {
  try {
    if (res.headersSent || res.writableEnded) return res;
    res.status(status).json(payload);
    return res;
  } catch {
    try {
      res.end(JSON.stringify(payload));
    } catch {
      /* sudah terlalu rusak */
    }
    return res;
  }
};

/** Tangani error di boundary endpoint Drive → JSON HTTP 200 `{ success:false, ... }`. */
export const respondDriveError = (res: any, err: any, extra: Record<string, any> = {}) => {
  const driveErr = toDriveOperationError(err);
  const body = { ...driveErr.toResponseBody(), ...extra };
  console.error('[drive] request gagal:', body.errorCode, driveErr.normalized?.detail || err?.message || err);
  return driveJson(res, body, 200);
};

/**
 * Baca body JSON dengan toleran. Vercel mengisi `req.body` hanya untuk content-type
 * yang dikenali, jadi string mentah ikut ditangani; body kosong => {} (endpoint
 * yang memvalidasi dan membalas pesan jelas, bukan runtime yang crash).
 */
export const readJsonBody = async (req: any): Promise<Record<string, any>> => {
  if (req?.body && typeof req.body === 'object') return req.body as Record<string, any>;
  const raw = typeof req?.body === 'string' ? req.body : '';
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw) as Record<string, any>;
  } catch {
    throw new DriveOperationError({
      code: 'bad_request',
      message: 'Body permintaan bukan JSON valid.',
      hint: 'Kirim header "Content-Type: application/json" dengan body JSON.',
      retryable: false,
    });
  }
};
