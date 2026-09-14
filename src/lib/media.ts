/**
 * ============================================================================
 *  ARMS — Control Tower :: MEDIA / GOOGLE DRIVE PREVIEW HELPERS
 * ============================================================================
 *  Dipakai oleh preview media global (semua modul) untuk:
 *    1. mengenali jenis berkas (gambar / PDF / dokumen / folder / video / dll),
 *    2. mengambil Drive file ID dari berbagai bentuk tautan,
 *    3. menyusun URL preview, thumbnail, dan unduhan,
 *    4. memutuskan apakah sebuah tautan layak di-preview in-app
 *       (bukan dibuka di tab baru).
 *
 *  Tidak ada dependensi React di berkas ini sehingga bisa diuji di Node.
 * ============================================================================
 */

export type MediaKind =
  | 'image'
  | 'pdf'
  | 'doc'
  | 'sheet'
  | 'slide'
  | 'form'
  | 'video'
  | 'audio'
  | 'archive'
  | 'folder'
  | 'data'
  | 'unknown';

export interface MediaSource {
  /** URL gambar mini (thumbnail) bila tersedia. */
  thumbnail?: string;
  /** URL yang bisa di-embed (iframe) untuk PDF/Docs/Sheets/Slides. */
  embed?: string;
  /** URL gambar/video/audio langsung. */
  direct?: string;
  /** URL unduh paksa (Drive export). */
  download?: string;
  /** Tautan web (untuk dibuka di tab baru / disalin). */
  webView?: string;
}

export interface MediaRef {
  url?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  driveFileId?: string | null;
  webViewLink?: string | null;
  /** Judul tampilan (mis. "KTP — Budi Santoso"). */
  title?: string | null;
  /** Label modul asal, mis. "Personnel", "Collection". */
  module?: string | null;
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic|heif)(\?|#|$)/i;
const PDF_EXT = /\.pdf(\?|#|$)/i;
const DOC_EXT = /\.(docx?|odt|rtf|txt|md|csv)(\?|#|$)/i;
const SHEET_EXT = /\.(xlsx?|ods|numbers)(\?|#|$)/i;
const SLIDE_EXT = /\.(pptx?|odp|key)(\?|#|$)/i;
const VIDEO_EXT = /\.(mp4|webm|ogg|ogv|mov|m4v|3gp|avi|mkv)(\?|#|$)/i;
const AUDIO_EXT = /\.(mp3|wav|m4a|aac|flac|opus|amr)(\?|#|$)/i;
const ARCHIVE_EXT = /\.(zip|rar|7z|tar|gz|bz2)(\?|#|$)/i;

const GOOGLE_USERCONTENT = /(lh[0-9]+\.googleusercontent\.com|ggpht\.com|googleusercontent\.com)/i;
const DRIVE_HOST = /(^|\.)drive\.google\.com$/i;
const DOCS_HOST = /(^|\.)docs\.google\.com$/i;

/** Ambil Drive file ID dari bermacam bentuk tautan Drive. */
export function extractDriveFileId(input?: string | null): string | undefined {
  if (!input) return undefined;
  const raw = String(input).trim();
  if (!raw) return undefined;

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]{10,})/i, // drive.google.com/file/d/<id>
    /[?&]id=([a-zA-Z0-9_-]{10,})/i, // ...?id=<id> atau uc?id=<id>
    /\/d\/([a-zA-Z0-9_-]{10,})\//i, // docs.google.com/document/d/<id>/edit
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]{10,})/i,
  ];
  for (const p of patterns) {
    const m = raw.match(p);
    if (m?.[1]) return m[1];
  }
  // ID polos (tanpa URL)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(raw)) return raw;
  return undefined;
}

/** Ambil ID folder Drive (bukan file). */
export function extractDriveFolderId(input?: string | null): string | undefined {
  if (!input) return undefined;
  const raw = String(input).trim();
  const m = raw.match(/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]{10,})/i) || raw.match(/folders\/([a-zA-Z0-9_-]{10,})/i);
  return m?.[1];
}

/** True bila URL adalah tautan folder Drive (bukan berkas). */
export function isDriveFolderUrl(url?: string | null): boolean {
  if (!url) return false;
  const raw = String(url);
  return /drive\.google\.com\/drive\/folders\//i.test(raw) || /drive\.google\.com\/drive\/(u\/\d+\/)?folders/i.test(raw);
}

/** True bila URL data URI / blob URI (hasil upload lokal yang belum di-Drive). */
export function isInlineMediaUrl(url?: string | null): boolean {
  if (!url) return false;
  return /^(data:|blob:)/i.test(String(url).trim());
}

function safeHost(url: string): string {
  try {
    return new URL(url, 'https://example.com').hostname || '';
  } catch {
    return '';
  }
}

function mimeFromDataUrl(url: string): string {
  const m = url.match(/^data:([^;,]+)/i);
  return m?.[1]?.toLowerCase() || '';
}

/**
 * Klasifikasi jenis media dari URL + nama berkas + mime.
 * Hasil dipakai untuk memilih cara render (img / iframe / video / tautan).
 */
export function classifyMedia(ref: MediaRef | string): MediaKind {
  const item: MediaRef = typeof ref === 'string' ? { url: ref } : ref || {};
  const url = String(item.url || '').trim();
  const name = String(item.fileName || '').trim();
  const mime = String(item.mimeType || '').trim().toLowerCase();

  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/vnd.google-apps.folder') return 'folder';
  if (mime.includes('spreadsheet')) return 'sheet';
  if (mime.includes('presentation')) return 'slide';
  if (mime.includes('document')) return 'doc';

  if (!url && !name) return 'unknown';

  if (isInlineMediaUrl(url)) {
    const dataMime = mimeFromDataUrl(url);
    if (dataMime.startsWith('image/')) return 'image';
    if (dataMime === 'application/pdf') return 'pdf';
    if (dataMime.startsWith('video/')) return 'video';
    if (dataMime.startsWith('audio/')) return 'audio';
    return 'data';
  }

  if (isDriveFolderUrl(url)) return 'folder';

  const host = safeHost(url);
  if (GOOGLE_USERCONTENT.test(host) && !/drive\.google\.com/i.test(host)) return 'image';

  // Google Docs native (tanpa ekstensi di URL)
  if (DOCS_HOST.test(host) || DRIVE_HOST.test(host)) {
    if (/\/document\//i.test(url)) return 'doc';
    if (/\/spreadsheets\//i.test(url)) return 'sheet';
    if (/\/presentation\//i.test(url)) return 'slide';
    if (/\/forms\//i.test(url)) return 'form';
    if (/\/thumbnails|\/thumbnail/i.test(url)) return 'image';
  }

  // Ekstensi dari nama berkas lebih akurat daripada dari URL Drive
  const target = name ? `${name}` : url;
  if (PDF_EXT.test(target)) return 'pdf';
  if (IMAGE_EXT.test(target)) return 'image';
  if (VIDEO_EXT.test(target)) return 'video';
  if (AUDIO_EXT.test(target)) return 'audio';
  if (ARCHIVE_EXT.test(target)) return 'archive';
  if (SHEET_EXT.test(target)) return 'sheet';
  if (SLIDE_EXT.test(target)) return 'slide';
  if (DOC_EXT.test(target)) return 'doc';

  // Drive file tanpa ekstensi: asumsikan dokumen (masih bisa di-preview iframe)
  if ((DOCS_HOST.test(host) || DRIVE_HOST.test(host)) && extractDriveFileId(url)) return 'doc';

  return 'unknown';
}

/** True bila media punya preview in-app (gambar/pdf/dokumen/video/audio). */
export function isPreviewableMedia(ref: MediaRef | string): boolean {
  const kind = classifyMedia(ref);
  return ['image', 'pdf', 'doc', 'sheet', 'slide', 'form', 'video', 'audio', 'data'].includes(kind);
}

/**
 * Tautan yang layak "dibajak" oleh preview in-app.
 * Tautan folder / spreadsheet eksternal / halaman web biasa dibiarkan normal.
 */
export function shouldInterceptLink(url?: string | null, fileName?: string | null): boolean {
  if (!url) return false;
  const raw = String(url).trim();
  if (!raw || raw === '#' || /^(mailto:|tel:|javascript:)/i.test(raw)) return false;
  if (isInlineMediaUrl(raw)) return true;
  if (isDriveFolderUrl(raw)) return false;

  const host = safeHost(raw);
  // Dokumen Google native: hanya Document/Presentation/Drawing yang enak di-embed.
  // Spreadsheet & Forms dibiarkan terbuka di tab baru (iframe sering diblokir).
  if (DOCS_HOST.test(host)) {
    return /\/(document|presentation|drawings)\//i.test(raw);
  }

  const kind = classifyMedia({ url: raw, fileName });
  if (kind === 'folder' || kind === 'sheet' || kind === 'form') return false;
  if (kind === 'unknown') {
    // Tautan Drive file tanpa ekstensi tetap di-preview
    return Boolean(extractDriveFileId(raw));
  }
  return true;
}

/** Proxy backend (Express service-account / Apps Script) untuk berkas Drive. */
export function mediaProxyUrl(fileId?: string | null, fileName?: string | null): string {
  if (!fileId) return '';
  const params = new URLSearchParams({ fileId: String(fileId) });
  if (fileName) params.set('name', String(fileName));
  return `/api/drive/file?${params.toString()}`;
}

/** Susun semua sumber URL yang mungkin untuk sebuah media. */
export function buildMediaSources(ref: MediaRef): MediaSource {
  const url = String(ref.url || '').trim();
  const webView = String(ref.webViewLink || '').trim();
  const name = String(ref.fileName || '').trim();
  const fileId = String(ref.driveFileId || '').trim() || extractDriveFileId(url) || extractDriveFileId(webView) || '';
  const kind = classifyMedia({ ...ref, driveFileId: fileId });
  const out: MediaSource = {};

  if (webView) out.webView = webView;
  else if (fileId) out.webView = `https://drive.google.com/file/d/${fileId}/view`;
  else if (url) out.webView = url;

  if (isInlineMediaUrl(url)) {
    out.direct = url;
    if (kind === 'image') out.thumbnail = url;
    return out;
  }

  if (GOOGLE_USERCONTENT.test(safeHost(url))) {
    out.direct = url;
    out.thumbnail = url;
    return out;
  }

  if (fileId) {
    // Thumbnail Drive (untuk gambar) + proxy backend (berkas privat service account)
    if (kind === 'image') {
      out.thumbnail = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
      out.direct = `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
    out.embed = kind === 'pdf' || kind === 'doc' || kind === 'sheet' || kind === 'slide' || kind === 'form'
      ? `https://drive.google.com/file/d/${fileId}/preview`
      : undefined;
    out.download = `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  // Dokumen Google native (docs.google.com/.../edit) -> versi /preview
  if (url && DOCS_HOST.test(safeHost(url)) && /(document|presentation|drawings)\//i.test(url)) {
    out.embed = url.replace(/\/(edit|view)(\?.*)?$/i, '/preview');
    return out;
  }

  if (url && !fileId) {
    if (kind === 'image') {
      out.direct = url;
      out.thumbnail = url;
    } else if (kind === 'pdf' || kind === 'doc' || kind === 'sheet' || kind === 'slide' || kind === 'form') {
      out.embed = url;
    } else {
      out.direct = url;
    }
  } else if (url && kind !== 'image' && (kind === 'pdf' || kind === 'video' || kind === 'audio')) {
    out.direct = url;
  }

  return out;
}

/** Ekstensi berkas dari nama (lowercase, tanpa titik). */
export function fileExtension(fileName?: string | null): string {
  const m = String(fileName || '').match(/\.([a-z0-9]{1,6})$/i);
  return m?.[1]?.toLowerCase() || '';
}

/** Nama berkas fallback dari URL Drive / path. */
export function fileNameFromUrl(url?: string | null): string {
  if (!url) return '';
  const raw = String(url).trim();
  if (isInlineMediaUrl(raw)) return raw.startsWith('data:') ? 'berkas-inline' : 'berkas-lokal';
  const m = raw.match(/[?&]name=([^&#]+)/i);
  if (m) {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return m[1];
    }
  }
  try {
    const u = new URL(raw);
    const last = u.pathname.split('/').filter(Boolean).pop() || '';
    return decodeURIComponent(last);
  } catch {
    return '';
  }
}

/** Label singkat untuk header preview. */
export function mediaTitle(ref: MediaRef): string {
  return String(ref.title || ref.fileName || fileNameFromUrl(ref.url) || 'Berkas Google Drive');
}

/** Ubah tautan Drive apa pun menjadi URL preview yang bisa di-iframe. */
export function driveEmbedUrl(url?: string | null): string {
  if (!url) return '';
  const raw = String(url).trim();
  const fileId = extractDriveFileId(raw);
  if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;
  return raw;
}
