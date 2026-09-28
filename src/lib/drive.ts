export function extractFolderId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  const matchId = url.match(/id=([a-zA-Z0-9_-]+)/);
  if (matchId) return match[1];
  return url;
}

export async function ensureDrivePath(segments: string[], rootId?: string | null): Promise<{ success: boolean; folderId?: string; webViewLink?: string; error?: string }> {
  try {
    const parentId = rootId || undefined;
    let currentId = parentId;
    
    // In GAS environment
    const { callGasFunction } = await import('./gasApi');
    for (const segment of segments) {
      const res = await callGasFunction('ensureDriveFolder', segment, currentId);
      if (!res.success) throw new Error(res.error);
      currentId = res.id;
    }
    return {
      success: true,
      folderId: currentId,
      webViewLink: currentId ? folderUrlFromId(currentId) : undefined,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function slugify(name: string): string {
  return (name || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export type PersonnelDocKind = 'KTP' | 'SPPI';

export const PERSONNEL_DOC_FOLDER: Record<PersonnelDocKind, string> = {
  KTP: '01_KTP',
  SPPI: '02_SPPI',
};

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

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

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
    return { success: false, webViewLink: '', error: err?.message || 'Gagal memproses berkas.' };
  }
}

export async function uploadBase64ToDrive(
  base64: string,
  fileName: string,
  mimeType = 'image/jpeg',
  folderId?: string | null
): Promise<DriveUploadResult> {
  try {
    
      const { callGasFunction } = await import('./gasApi');
      const res = await callGasFunction('uploadToDrive', base64, fileName, mimeType, folderId);
      if (res.success) {
        return {
          success: true,
          fileId: res.id,
          fileName,
          webViewLink: res.webViewLink,
          directViewUrl: `https://drive.google.com/thumbnail?id=${res.id}&sz=w800`
        };
      }
      throw new Error(res.error);
    
    
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

export async function checkDriveStatus(): Promise<{ configured: boolean; serviceAccountEmail?: string; error?: string }> {
  try {
    return { configured: true, serviceAccountEmail: 'Google Apps Script Account' };
    
  } catch {
    return { configured: false };
  }
}

export function getRootDriveId(settings: any): string | null {
  return settings?.googleDriveFolderId || null;
}

export function folderUrlFromId(id: string | null): string {
  if (!id) return '';
  return `https://drive.google.com/drive/folders/${id}`;
}

export function isPlaceholderDriveUrl(url: string | null): boolean {
  if (!url) return true;
  return url.startsWith('data:') || url.includes('fallback');
}

export function isRealDriveFolder(url?: string | null, folderId?: string | null): boolean {
  if (!url) return false;
  if (isPlaceholderDriveUrl(url)) return false;
  if (folderId && (folderId.startsWith('GDRIVE-') || folderId.length < 15)) return false;
  return Boolean(url);
}
