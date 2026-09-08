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

export interface DriveFolderResult {
  success: boolean;
  folderId: string;
  webViewLink: string;
  name: string;
}

/** Buat satu folder di Google Drive via server (service account). */
export async function createDriveFolder(name: string, parentId?: string | null): Promise<DriveFolderResult> {
  const resp = await fetch('/api/drive/create-folder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parentId: parentId || undefined }),
  });
  const json = await resp.json();
  if (!json?.success) {
    throw new Error(json?.error || 'Gagal membuat folder Google Drive');
  }
  return {
    success: true,
    folderId: json.folderId,
    webViewLink: json.webViewLink,
    name,
  };
}

export interface DrivePathResult {
  success: boolean;
  folderId: string;
  webViewLink: string;
  created: Array<{ name: string; folderId: string; webViewLink: string }>;
}

/** Pastikan struktur folder bertingkat ada (buat sesuai kebutuhan) di Drive. */
export async function ensureDrivePath(segments: string[], rootId?: string | null): Promise<DrivePathResult> {
  const resp = await fetch('/api/drive/ensure-path', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: segments, rootId: rootId || undefined }),
  });
  const json = await resp.json();
  if (!json?.success) {
    throw new Error(json?.error || 'Gagal membuat struktur folder Google Drive');
  }
  return {
    success: true,
    folderId: json.folderId,
    webViewLink: json.webViewLink,
    created: json.created || [],
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
 */
export async function uploadBase64ToDrive(
  base64: string,
  fileName: string,
  mimeType = 'image/jpeg',
  folderId?: string | null
): Promise<DriveUploadResult> {
  try {
    const resp = await fetch('/api/drive/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName,
        mimeType,
        base64,
        folderId: folderId || undefined,
      }),
    });

    let rawText = '';
    try {
      rawText = await resp.text();
    } catch {
      rawText = '';
    }

    let json: any = {};
    try {
      json = rawText ? JSON.parse(rawText) : {};
    } catch {
      let cleanMsg = `Server unggahan merespons HTTP ${resp.status}.`;
      if (resp.status === 413) {
        cleanMsg = 'Ukuran berkas melebihi batas unggah server (maks 4.5MB).';
      } else if (resp.status === 504 || resp.status === 408) {
        cleanMsg = 'Waktu unggah habis (Request Timeout).';
      } else if (resp.status === 500) {
        cleanMsg = 'Google Drive belum siap atau akun layanan memerlukan Shared Drive.';
      }
      return {
        success: false,
        fallbackBase64: true,
        webViewLink: base64,
        error: cleanMsg,
      };
    }
    if (json.success && (json.webViewLink || json.fileId)) {
      return {
        success: true,
        fileId: json.fileId,
        fileName: json.fileName || fileName,
        webViewLink: json.webViewLink,
        directViewUrl: json.directViewUrl || (json.fileId ? `https://drive.google.com/thumbnail?id=${json.fileId}&sz=w800` : undefined),
      };
    }

    // Server responded with configured: false or an issue
    console.warn('Drive upload note:', json.error);
    return {
      success: false,
      fallbackBase64: true,
      webViewLink: base64, // Fallback preview data URL
      error: json.error || 'Google Drive belum siap',
    };
  } catch (err: any) {
    console.warn('Drive upload network error, fallback to local preview:', err);
    return {
      success: false,
      fallbackBase64: true,
      webViewLink: base64,
      error: err?.message || 'Gagal menghubungi server Google Drive',
    };
  }
}

/**
 * Periksa status kesiapan Google Drive Service Account
 */
export async function checkDriveStatus(): Promise<{ configured: boolean; serviceAccountEmail?: string; error?: string }> {
  try {
    const resp = await fetch('/api/drive/status');
    if (!resp.ok) return { configured: false };
    const json = await resp.json();
    return {
      configured: Boolean(json.configured),
      serviceAccountEmail: json.serviceAccountEmail,
    };
  } catch {
    return { configured: false };
  }
}
