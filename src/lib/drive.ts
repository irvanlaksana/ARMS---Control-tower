import { AppSettings } from '../types/arms';
import { ROOT_GDRIVE_ID, ROOT_GDRIVE_URL } from '../data/initialData';

export const DRIVE_FOLDER_BASE = 'https://drive.google.com/drive/folders';

/** Ambil folder ID dari URL Google Drive. */
export function extractFolderId(url?: string | null): string | undefined {
  if (!url) return undefined;
  const m = url.match(/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  const m2 = url.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (m2) return m2[1];
  const m3 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m3) return m3[1];
  return undefined;
}

/** Bangun URL folder yang valid dari folder ID. */
export function folderUrlFromId(folderId?: string | null): string {
  return folderId ? `${DRIVE_FOLDER_BASE}/${folderId}?usp=sharing` : '';
}

/** Deteksi URL placeholder lama yang memakai `&path=` (bukan folder Drive asli). */
export function isPlaceholderDriveUrl(url?: string | null): boolean {
  if (!url) return false;
  return /[?&]path=/.test(url) || ((/DEBITUR_|DATABASE_KARYAWAN|MULTIFINANCE|FOLDER_SKP/.test(url)) && !/drive\.google\.com/.test(url));
}

/**
 * Folder GDrive dianggap "nyata" bila URL folder Google Drive valid
 * (ID folder 20+ karakter base64url) dan — bila folderId diberikan —
 * identik dengan ID yang tertanam di URL.
 */
export function isRealDriveFolder(url?: string | null, folderId?: string | null): boolean {
  if (isPlaceholderDriveUrl(url) || isPlaceholderDriveUrl(folderId)) return false;
  const idFromUrl = extractFolderId(url);
  const idOk = (id?: string | null) => !!id && /^[A-Za-z0-9_-]{25,}$/.test(id);
  const urlReal = idOk(idFromUrl);
  const idReal = idOk(folderId);
  if (!urlReal && !idReal) return false;
  if (urlReal && folderId && folderId !== idFromUrl) return false;
  return true;
}

/** Root folder Drive yang dipakai bila settings belum ada. */
export function getRootDriveId(settings?: AppSettings): string {
  return settings?.googleDriveFolderId || ROOT_GDRIVE_ID;
}

export function getRootDriveUrl(settings?: AppSettings): string {
  return settings?.googleDriveFolderUrl || ROOT_GDRIVE_URL;
}

/* ------------------------------------------------------------------ */
/*  Komunikasi dengan endpoint /api/drive/*                            */
/* ------------------------------------------------------------------ */

/**
 * Error permintaan Drive yang siap ditampilkan: berisi pesan manusiawi,
 * kode stabil (`code`), dan `hint` langkah perbaikan.
 *
 * Dulu endpoint cukup di-`fetch` lalu `resp.json()`. Bila fungsi serverless
 * crash / timeout, Vercel membalas teks polos "A server error occurred." dan
 * pengguna hanya melihat:
 *   Unexpected token 'A', "A server e"... is not valid JSON
 * yang sama sekali tidak menjelaskan penyebab aslinya.
 */
export class DriveApiError extends Error {
  /** 'not_configured' | 'bad_credentials' | 'auth_failed' | 'api_disabled' | 'forbidden' | 'parent_not_found' | 'rate_limited' | 'sa_storage_quota' | 'google_unavailable' | 'network' | 'timeout' | 'non_json_response' | 'bad_request' | 'internal' */
  code?: string;
  hint?: string | null;
  status?: number;
  configured?: boolean;
  quotaLimited?: boolean;
  retryable?: boolean;
  detail?: string | null;

  constructor(message: string, init: Partial<DriveApiError> = {}) {
    super(message);
    this.name = 'DriveApiError';
    Object.assign(this, init);
  }
}

export interface DriveApiIssue {
  message: string;
  code?: string;
  hint?: string | null;
  status?: number;
  configured?: boolean;
  quotaLimited?: boolean;
  retryable?: boolean;
  detail?: string | null;
}

/** Ringkas body non-JSON (HTML/plain text) menjadi satu baris yang bisa dibaca. */
function previewNonJsonBody(text: string): string {
  const plain = String(text || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.slice(0, 160);
}

/** Ubah balasan non-JSON (halaman error hosting) menjadi pesan + hint yang jelas. */
export function describeNonJsonResponse(status: number, text: string, endpoint: string): DriveApiIssue {
  const snippet = previewNonJsonBody(text);
  const isHtml = /^\s*<(!doctype|html)/i.test(String(text || ''));
  const target = endpoint.replace(/^\//, '');
  const base = `Balasan server untuk /${target} bukan JSON (HTTP ${status})${snippet ? `: "${snippet}"` : ''}.`;
  const wrap = (over: Partial<DriveApiIssue>): DriveApiIssue => ({
    message: base,
    code: 'non_json_response',
    hint: 'Muat ulang halaman lalu coba lagi. Bila masih terjadi, periksa log fungsi server.',
    retryable: true,
    detail: snippet,
    ...over,
  });

  // Urutan penting: 5xx HTML (halaman error hosting) harus dibaca sebagai kegagalan
  // fungsi, BUKAN sebagai endpoint yang hilang.
  if (status === 413) {
    return wrap({
      message: `Ukuran berkas melebihi batas yang diizinkan server untuk /${target} (HTTP 413).`,
      code: 'payload_too_large',
      hint: 'Kompres/foto ulang berkas (maks ±4,5 MB) atau perbesar api.bodyParser.sizeLimit pada fungsi server, lalu deploy ulang.',
      retryable: false,
    });
  }
  if (status === 429) {
    return wrap({
      message: `${base} Terlalu banyak permintaan ke server.`,
      code: 'rate_limited',
      hint: 'Tunggu 30–60 detik lalu ulangi (buat folder satu per satu, bukan serentak).',
    });
  }
  if (status === 504 || status === 408 || status === 522 || status === 524) {
    return wrap({
      message: `${base} Fungsi server "${target}" melebihi batas waktu dan dipotong oleh hosting.`,
      code: 'timeout',
      hint: 'Perkecil pekerjaan satu request (buat folder bertahap, bukan seluruh database sekaligus) atau naikkan functions.maxDuration di vercel.json (maks 60 detik di plan Hobby, 300 detik di Pro).',
    });
  }
  if (status >= 500) {
    return wrap({
      message: `${base} Fungsi server "${target}" gagal sebelum mengirim balasan.`,
      code: 'server_error',
      hint: 'Buka Vercel → Deployments → Functions Log untuk pesan aslinya. Penyebab tersering: GOOGLE_SERVICE_ACCOUNT_JSON belum diset di Environment Variables Production, dependensi googleapis tidak ikut ter-bundle, atau permintaan Drive melebihi maxDuration 60 detik.',
    });
  }
  if (status === 401 || status === 403) {
    return wrap({
      message: `${base} Akses ke endpoint ditolak.`,
      code: 'forbidden',
      hint: 'Bila aplikasi dilindungi Vercel Authentication/Deployment Protection, nonaktifkan untuk /api/* atau login dulu di browser ini.',
      retryable: false,
    });
  }
  if (status === 404 || isHtml) {
    return wrap({
      message: `${base} Endpoint fungsi server tidak tersedia / SPA HTML yang dikembalikan.`,
      code: 'endpoint_missing',
      hint: `Pastikan deployment terbaru sukses dan api/${target.replace('api/', '')} ikut ter-deploy (Vercel → Deployments → Build Output & Functions). Di VPS: jalankan "npm run build && npm start" supaya /${target} ditangani express — bukan rewrite ke index.html.`,
      retryable: false,
    });
  }
  return wrap({ status });
}

const DRIVE_TIMEOUT_MS = 45_000;

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal as any });
  } finally {
    clearTimeout(timer);
  }
}

interface DriveRequestOptions {
  method?: 'GET' | 'POST';
  timeoutMs?: number;
  /** Jumlah percobaan ulang untuk kegagalan sementara (timeout/429/5xx/jaringan). */
  retries?: number;
}

/**
 * Panggil endpoint /api/drive/* dengan parsing aman:
 * timeout, deteksi body non-JSON, dan normalisasi `success:false` menjadi DriveApiError.
 */
export async function requestDriveApi<T = any>(
  endpoint: string,
  payload?: Record<string, any> | null,
  options: DriveRequestOptions = {},
): Promise<T> {
  const method = options.method || (payload ? 'POST' : 'GET');
  const timeoutMs = options.timeoutMs ?? DRIVE_TIMEOUT_MS;
  const retries = options.retries ?? (method === 'POST' ? 1 : 0);
  const init: RequestInit = {
    method,
    headers: method === 'POST' ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
    body: method === 'POST' ? JSON.stringify(payload || {}) : undefined,
    cache: 'no-store',
  };

  let lastIssue: DriveApiIssue | null = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    lastIssue = null;
    let resp: Response;
    try {
      resp = await fetchWithTimeout(endpoint, init, timeoutMs);
    } catch (err: any) {
      const aborted = String(err?.name || '').toLowerCase().includes('abort');
      lastIssue = aborted
        ? {
            message: `Waktu tunggu /${endpoint.replace(/^\//, '')} habis (${Math.round(timeoutMs / 1000)} detik).`,
            code: 'timeout',
            hint: 'Server masih mengerjakan permintaan Drive (biasanya membuat banyak folder sekaligus). Coba lagi, atau perkecil jumlah folder.',
            retryable: true,
            detail: String(err?.message || err),
          }
        : {
            message: 'Tidak dapat menghubungi server aplikasi.',
            code: 'network',
            hint: 'Cek koneksi internet Anda, dan pastikan server (Vercel/VPS) berjalan. Bila baru deploy, tunggu hingga status deployment Ready.',
            retryable: true,
            detail: String(err?.message || err),
          };
    }

    if (!lastIssue) {
      const contentType = resp.headers.get('content-type') || '';
      let json: any = null;
      if (resp.status === 204) {
        json = {};
      } else if (contentType.includes('json')) {
        try {
          json = JSON.parse(await resp.text());
        } catch (err: any) {
          json = null;
        }
      }

      if (json === null) {
        let text = '';
        try {
          text = await resp.clone().text();
        } catch {
          text = '';
        }
        lastIssue = describeNonJsonResponse(resp.status, text, endpoint);
      } else if (!resp.ok) {
        lastIssue = {
          message: json?.error || `Server menolak permintaan (HTTP ${resp.status}).`,
          code: json?.errorCode || 'http_error',
          hint: json?.hint,
          status: resp.status,
          configured: json?.configured,
          quotaLimited: json?.quotaLimited,
          retryable: Boolean(json?.retryable),
          detail: json?.detail,
        };
      } else if (json?.success === false) {
        lastIssue = {
          message: json?.error || 'Google Drive menolak permintaan.',
          code: json?.errorCode || 'drive_error',
          hint: json?.hint,
          status: json?.httpStatus || resp.status,
          configured: json?.configured !== false,
          quotaLimited: Boolean(json?.quotaLimited),
          retryable: Boolean(json?.retryable),
          detail: json?.detail,
        };
      } else {
        return json as T;
      }
    }

    if (lastIssue && lastIssue.retryable && attempt < retries) {
      await new Promise((r) => setTimeout(r, 1_200 * (attempt + 1)));
      continue;
    }
    break;
  }

  const issue = lastIssue || { message: 'Permintaan Google Drive gagal.' };
  throw new DriveApiError(issue.message, {
    code: issue.code,
    hint: issue.hint,
    status: issue.status,
    configured: issue.configured,
    quotaLimited: issue.quotaLimited,
    retryable: issue.retryable,
    detail: issue.detail,
  });
}

/** Kumpulkan pesan error Drive + hint agar mudah dibaca user maupun log. */
export function formatDriveError(err: unknown, fallback = 'Google Drive belum bisa dihubungi.'): string {
  const e = err as DriveApiError;
  const main = e?.message || fallback;
  return e?.hint ? `${main} — ${e.hint}` : main;
}

export interface DriveFolderResult {
  success: boolean;
  folderId: string;
  webViewLink: string;
  name: string;
  /** true bila folder sudah ada sebelumnya dan hanya dipakai ulang. */
  reused?: boolean;
}

/** Buat satu folder di Google Drive via server (service account). */
export async function createDriveFolder(name: string, parentId?: string | null): Promise<DriveFolderResult> {
  const json = await requestDriveApi<any>('/api/drive/create-folder', {
    name,
    parentId: parentId || undefined,
  });
  const folderId = String(json?.folderId || '');
  if (!folderId) {
    throw new DriveApiError('Folder Google Drive dibuat tetapi server tidak mengembalikan ID folder.', {
      code: 'internal',
      hint: 'Lihat log fungsi /api/drive/create-folder untuk detail dari Google Drive.',
    });
  }
  return {
    success: true,
    folderId,
    webViewLink: json?.webViewLink || folderUrlFromId(folderId),
    name: json?.name || name,
    reused: Boolean(json?.reused),
  };
}

export interface DrivePathResult {
  success: boolean;
  folderId: string;
  webViewLink: string;
  created: Array<{ name: string; folderId: string; webViewLink: string; reused?: boolean }>;
  reusedPath?: string[];
}

/** ID folder Drive yang layak dipakai (bukan placeholder / ID buatan aplikasi). */
const DRIVE_ID_PATTERN = /^[A-Za-z0-9_-]{23,}$/;

/**
 * Permintaan identik yang sedang berjalan digabung (in-flight dedupe).
 * Mencegah duplikasi folder bila UI memicu beberapa jalur paralel
 * (mis. folder karyawan + 01_KTP + 02_SPPI sekaligus) atau tombol diklik dua kali.
 */
const ensurePathInFlight = new Map<string, Promise<any>>();

async function dedupedEnsureRequest<T>(rootId: string, path: string[], run: () => Promise<T>): Promise<T> {
  const key = `${rootId || '(root)'}|${path.join('/')}`.toUpperCase();
  const existing = ensurePathInFlight.get(key);
  if (existing) return existing as unknown as T;
  const task = run().finally(() => {
    if (ensurePathInFlight.get(key) === task) ensurePathInFlight.delete(key);
  });
  ensurePathInFlight.set(key, task as unknown as Promise<any>);
  return task;
}

/** Pastikan struktur folder bertingkat ada (buat sesuai kebutuhan) di Drive. */
export async function ensureDrivePath(segments: string[], rootId?: string | null): Promise<DrivePathResult> {
  const path = (segments || []).map((s) => String(s || '').trim()).filter(Boolean);
  if (path.length === 0) {
    throw new DriveApiError('Struktur folder kosong — tidak ada yang perlu dibuat.', {
      code: 'bad_request',
      hint: 'Periksa nama karyawan/klien/debitur; minimal satu segmen folder harus terisi.',
    });
  }
  const root = String(rootId || '').trim();
  if (root && !DRIVE_ID_PATTERN.test(root)) {
    throw new DriveApiError(`ID folder master "${root}" bukan ID Google Drive yang valid.`, {
      code: 'bad_request',
      hint: 'Buka folder master di Drive lalu salin ID dari URL https://drive.google.com/drive/folders/<ID> ke Pengaturan (field Folder ID GDrive). ID buatan seperti "GDRIVE-CLI-001" tidak dikenali Google dan selalu gagal.',
    });
  }

  const json = await dedupedEnsureRequest(root, path, () =>
    requestDriveApi<any>('/api/drive/ensure-path', {
      path,
      rootId: root || undefined,
    }),
  );
  const folderId = String(json?.folderId || '');
  if (!folderId) {
    throw new DriveApiError('Struktur folder Google Drive tidak mengembalikan ID folder.', {
      code: 'internal',
      hint: 'Lihat log fungsi /api/drive/ensure-path untuk detail dari Google Drive API.',
      detail: JSON.stringify(json ?? {}),
    });
  }
  return {
    success: true,
    folderId,
    webViewLink: json?.webViewLink || folderUrlFromId(folderId),
    created: json?.created || [],
    reusedPath: json?.reusedPath || [],
  };
}

/** Slug aman untuk nama berkas/folder. */
export function slugify(name: string): string {
  return (name || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** Jenis berkas KYC personel yang dipetakan ke subfolder GDrive. */
export type PersonnelDocKind = 'KTP' | 'SPPI';

/** Nama subfolder resmi di dalam folder tiap karyawan / mitra DC. */
export const PERSONNEL_DOC_FOLDER: Record<PersonnelDocKind, string> = {
  KTP: '01_KTP',
  SPPI: '02_SPPI',
};

/**
 * Pemetaan GDrive Database Karyawan & Mitra DC:
 *   PT_MJ_INDONESIA / DATABASE_KARYAWAN / <NAMA> /
 *     ├── 01_KTP   → foto KTP
 *     └── 02_SPPI  → berkas SPPI (opsional)
 */
export function personnelFolderSegments(fullName: string): string[] {
  return ['PT_MJ_INDONESIA', 'DATABASE_KARYAWAN', slugify(fullName) || 'TANPA_NAMA'];
}

export function personnelDocFolderSegments(fullName: string, docKind: PersonnelDocKind): string[] {
  return [...personnelFolderSegments(fullName), PERSONNEL_DOC_FOLDER[docKind]];
}

export function personnelDocPathLabel(fullName: string, docKind: PersonnelDocKind): string {
  return personnelDocFolderSegments(fullName, docKind).join(' / ');
}

export function personnelDocFileName(fullName: string, docKind: PersonnelDocKind, ext = 'jpg'): string {
  const cleanExt = String(ext || 'jpg').replace(/^\./, '').toLowerCase().replace('jpeg', 'jpg');
  const stamp = Date.now().toString().slice(-8);
  return `${docKind}_${slugify(fullName) || 'PERSONEL'}_${stamp}.${cleanExt}`;
}

/** Pastikan folder personel + subfolder KTP/SPPI ada, lalu unggah berkas. */
export async function uploadPersonnelDocument(
  base64: string,
  fullName: string,
  docKind: PersonnelDocKind,
  rootId?: string | null,
): Promise<DriveUploadResult & { folderId?: string }> {
  const match = String(base64 || '').match(/^data:(.+);base64,(.*)$/);
  const mime = match ? match[1] : 'image/jpeg';
  const ext = (mime.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  const fileName = personnelDocFileName(fullName, docKind, ext);

  let folderId: string | undefined;
  try {
    const path = await ensureDrivePath(personnelDocFolderSegments(fullName, docKind), rootId);
    folderId = path.folderId;
  } catch (err) {
    console.warn('Gagal memastikan folder dokumen personel di Google Drive:', err);
  }

  const result = await uploadBase64ToDrive(base64, fileName, mime, folderId);
  return { ...result, folderId };
}

/** Helper convert File object to Base64 data URL */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/** URL yang bisa dipakai sebagai src <img> untuk berkas Google Drive. */
export function drivePreviewUrl(fileId?: string, webViewLink?: string, directViewUrl?: string): string {
  if (directViewUrl) return directViewUrl;
  if (fileId) return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
  if (webViewLink) {
    const id = extractFolderId(webViewLink);
    if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w800`;
    return webViewLink;
  }
  return '';
}

/**
 * Baca file gambar jadi data URL, kompres bila terlalu besar
 * (foto HP sering >5MB dan gagal POST ke /api/drive/upload).
 */
export async function fileToCompressedDataUrl(
  file: File,
  maxDim = 2000,
  quality = 0.82,
): Promise<string> {
  const raw = await fileToBase64(file);
  if (!file.type.startsWith('image/') || /svg|gif/i.test(file.type)) return raw;

  return await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const longest = Math.max(img.width || 1, img.height || 1);
      const scale = Math.min(1, maxDim / longest);
      const needsResize = scale < 1 || file.size > 1_400_000;
      if (!needsResize) {
        resolve(raw);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(raw);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      try {
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch {
        resolve(raw);
      }
    };
    img.onerror = () => resolve(raw);
    img.src = raw;
  });
}

export interface DriveUploadResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  webViewLink: string;
  directViewUrl?: string;
  fallbackBase64?: boolean;
  error?: string;
  /** Kode error stabil (mis. 'sa_storage_quota', 'forbidden') untuk diagnosis. */
  errorCode?: string;
  quotaLimited?: boolean;
}

/**
 * Upload file langsung ke Google Drive sebagai penyimpanan utama.
 * Jika Google Service Account belum di-set di Vercel/env,
 * sistem akan secara aman menggunakan fallback Base64 preview
 * sehingga aplikasi tidak error atau terhenti.
 */
export async function uploadFileToDrive(
  file: File,
  folderId?: string | null,
  customFileName?: string
): Promise<DriveUploadResult> {
  try {
    const base64 = await fileToBase64(file);
    const cleanExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const cleanBase = (customFileName || file.name.replace(/\.[^/.]+$/, ''))
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50);
    const fileName = `${cleanBase}_${Date.now()}.${cleanExt}`;

    return await uploadBase64ToDrive(base64, fileName, file.type || 'image/jpeg', folderId);
  } catch (err: any) {
    console.warn('Gagal membaca berkas untuk upload:', err);
    return {
      success: false,
      webViewLink: '',
      error: err?.message || 'Gagal memproses berkas.',
    };
  }
}

/**
 * Upload string base64 gambar / dokumen ke Google Drive.
 * Kegagalan apa pun (termasuk balasan non-JSON dari hosting) tetap mengembalikan
 * hasil `success:false` + data URL base64 sebagai fallback, tanpa melempar
 * SyntaxError yang membingungkan.
 */
export async function uploadBase64ToDrive(
  base64: string,
  fileName: string,
  mimeType = 'image/jpeg',
  folderId?: string | null
): Promise<DriveUploadResult> {
  try {
    const json = await requestDriveApi<any>(
      '/api/drive/upload',
      { fileName, mimeType, base64, folderId: folderId || undefined },
      { retries: 0, timeoutMs: 60_000 },
    );
    if (json?.success && (json.webViewLink || json.fileId)) {
      return {
        success: true,
        fileId: json.fileId,
        fileName: json.fileName || fileName,
        webViewLink: json.webViewLink,
        directViewUrl: json.directViewUrl || (json.fileId ? `https://drive.google.com/thumbnail?id=${json.fileId}&sz=w800` : undefined),
      };
    }
    throw new DriveApiError(json?.error || 'Google Drive belum siap.', {
      code: json?.errorCode,
      hint: json?.hint,
      status: json?.httpStatus,
      configured: json?.configured !== false,
      quotaLimited: Boolean(json?.quotaLimited),
      detail: json?.detail,
    });
  } catch (err: any) {
    const e = err as DriveApiError;
    console.warn('Drive upload note:', e?.code || 'unknown', e?.message, e?.detail || '');
    return {
      success: false,
      fallbackBase64: true,
      webViewLink: base64, // Fallback preview data URL
      error: formatDriveError(e, 'Gagal menghubungi server Google Drive — berkas disimpan di database aplikasi.'),
      errorCode: e?.code,
      quotaLimited: Boolean(e?.quotaLimited),
    };
  }
}

/** Satu baris hasil pemeriksaan kesiapan Drive. */
export interface DriveStatusCheck {
  step: string;
  ok: boolean;
  message: string;
  hint?: string | null;
  code?: string;
}

export interface DriveStatusInfo {
  configured: boolean;
  serviceAccountEmail?: string | null;
  projectId?: string | null;
  scopes?: string[];
  /** true bila SEMUA pemeriksaan lolos (hanya ada saat probing). */
  ready?: boolean;
  checks?: DriveStatusCheck[];
  about?: Record<string, any> | null;
  folder?: Record<string, any> | null;
  sharedDrive?: Record<string, any> | null;
  probed?: boolean;
  error?: string;
}

/**
 * Periksa status kesiapan Google Drive Service Account.
 * `probeFolderId` → server juga menguji akses tulis ke folder master.
 */
export async function checkDriveStatus(options: { probeFolderId?: string | null } = {}): Promise<DriveStatusInfo> {
  const folderId = String(options.probeFolderId || '').trim();
  const query = folderId ? `?probe=1&folderId=${encodeURIComponent(folderId)}` : '';
  try {
    const json = await requestDriveApi<any>(`/api/drive/status${query}`, null, {
      method: 'GET',
      retries: 0,
      timeoutMs: folderId ? 40_000 : 15_000,
    });
    return {
      configured: Boolean(json?.configured),
      serviceAccountEmail: json?.serviceAccountEmail ?? null,
      projectId: json?.projectId ?? null,
      scopes: json?.scopes ?? [],
      ready: typeof json?.ready === 'boolean' ? json.ready : undefined,
      checks: Array.isArray(json?.checks) ? json.checks : [],
      about: json?.about ?? null,
      folder: json?.folder ?? null,
      sharedDrive: json?.sharedDrive ?? null,
      probed: Boolean(json?.probed),
      error: json?.error,
    };
  } catch (err: any) {
    const e = err as DriveApiError;
    return {
      configured: false,
      checks: [],
      error: formatDriveError(e, 'Server status Google Drive tidak dapat dihubungi.'),
    };
  }
}
