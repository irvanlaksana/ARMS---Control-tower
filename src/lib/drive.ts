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
  return /[?&]path=/.test(url) || /DEBITUR_|DATABASE_KARYAWAN|MULTIFINANCE|FOLDER_SKP/.test(url) && !/drive\.google\.com/.test(url);
}

/**
 * Folder GDrive dianggap "nyata" bila URL folder Google Drive valid
 * (ID folder 20+ karakter base64url) dan — bila folderId diberikan —
 * identik dengan ID yang tertanam di URL. Ini menolak link placeholder
 * lama (`&path=`) maupun ID buatan seperti `GDRIVE-CLI-XXX`.
 */
export function isRealDriveFolder(url?: string | null, folderId?: string | null): boolean {
  if (isPlaceholderDriveUrl(url) || isPlaceholderDriveUrl(folderId)) return false;
  const idFromUrl = extractFolderId(url);
  // ID folder Google Drive asli umumnya 25–40 karakter base64url.
  const idOk = (id?: string | null) => !!id && /^[A-Za-z0-9_-]{25,}$/.test(id);
  const urlReal = idOk(idFromUrl);
  const idReal = idOk(folderId);
  if (!urlReal && !idReal) return false;
  // Bila keduanya ada, keduanya harus menunjuk folder yang sama (menolak ID buatan).
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
