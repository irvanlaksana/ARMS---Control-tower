/**
 * ============================================================================
 *  ARMS — Control Tower :: PREVIEW MEDIA GLOBAL (SEMUA MODUL)
 * ============================================================================
 *  Satu penyedia konteks + modal yang dipakai seluruh modul untuk melihat
 *  media yang diunggah ke Google Drive (foto KTP/SPPI/STNK, bukti penagihan,
 *  SKP, SPH, BAST, proposal, MoU, kwitansi, dsb) TANPA meninggalkan aplikasi.
 *
 *  Cara pakai:
 *    1) <MediaPreviewProvider> dipasang sekali di App.tsx.
 *    2) Komponen apa pun memakai hook useMediaPreview():
 *         const { openMedia, openGallery } = useMediaPreview();
 *         openMedia({ url, fileName, title, module: 'Collection' });
 *    3) Atau tanpa React sama sekali — tambahkan atribut data pada elemen:
 *         <a href={doc.driveDocumentUrl} data-media-preview>Buka</a>
 *         <img src={photo.url} data-media-preview data-media-name={photo.label} />
 *         <div data-media-preview data-media-gallery={JSON.stringify(items)}
 *              data-media-index={i}>...</div>
 *       Klik pada elemen itu otomatis membuka modal preview (capture phase).
 *    4) Elemen yang harus tetap membuka tab baru diberi data-no-media-preview.
 *
 *  Berkas privat (tidak "anyone with link") tetap bisa dilihat lewat proxy
 *  backend `/api/drive/file` — otomatis dipakai sebagai fallback.
 * ============================================================================
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  Download,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Image as ImageIcon,
  FileText,
  FileSpreadsheet,
  Presentation,
  Film,
  Music,
  Archive,
  FolderOpen,
  CloudOff,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  MediaRef,
  buildMediaSources,
  classifyMedia,
  extractDriveFileId,
  fileNameFromUrl,
  mediaTitle,
  shouldInterceptLink,
} from '../../lib/media';

/* ======================================================================== *
 *  TIPE
 * ======================================================================== */

export interface MediaPreviewItem extends MediaRef {
  /** Label tambahan, mis. "KTP", "Bukti Kunjungan 1". */
  caption?: string | null;
}

interface MediaPreviewContextValue {
  openMedia: (item: MediaPreviewItem | string) => void;
  openGallery: (items: MediaPreviewItem[], startIndex?: number) => void;
  closeMedia: () => void;
  isMediaPreviewOpen: boolean;
}

const MediaPreviewContext = createContext<MediaPreviewContextValue>({
  openMedia: () => undefined,
  openGallery: () => undefined,
  closeMedia: () => undefined,
  isMediaPreviewOpen: false,
});

export function useMediaPreview(): MediaPreviewContextValue {
  return useContext(MediaPreviewContext);
}

/** Icon per jenis media. */
function MediaKindIcon({ kind, className }: { kind: string; className?: string }) {
  const cls = className || 'w-5 h-5';
  switch (kind) {
    case 'image':
      return <ImageIcon className={cls} />;
    case 'pdf':
    case 'doc':
      return <FileText className={cls} />;
    case 'sheet':
      return <FileSpreadsheet className={cls} />;
    case 'slide':
    case 'form':
      return <Presentation className={cls} />;
    case 'video':
      return <Film className={cls} />;
    case 'audio':
      return <Music className={cls} />;
    case 'archive':
      return <Archive className={cls} />;
    case 'folder':
      return <FolderOpen className={cls} />;
    default:
      return <FileText className={cls} />;
  }
}

const KIND_LABEL: Record<string, string> = {
  image: 'Gambar',
  pdf: 'PDF',
  doc: 'Dokumen',
  sheet: 'Spreadsheet',
  slide: 'Presentasi',
  form: 'Formulir',
  video: 'Video',
  audio: 'Audio',
  archive: 'Arsip',
  folder: 'Folder Drive',
  data: 'Berkas lokal',
  unknown: 'Berkas',
};

/* ======================================================================== *
 *  AMBIL BERKAS LEWAT PROXY BACKEND (service account / Apps Script)
 * ======================================================================== */

async function fetchProxyBlobUrl(fileId: string, fileName?: string, signal?: AbortSignal): Promise<string> {
  const params = new URLSearchParams({ fileId });
  if (fileName) params.set('name', fileName);
  const res = await fetch(`/api/drive/file?${params.toString()}`, { signal });
  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const json = await res.json();
    if (!json?.success || !json?.base64) {
      throw new Error(json?.error || 'Backend tidak mengembalikan isi berkas');
    }
    const binary = atob(String(json.base64).replace(/\s/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: json.mimeType || 'application/octet-stream' });
    return URL.createObjectURL(blob);
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const json = await res.json();
      message = json?.error || message;
    } catch {
      /* body bukan JSON */
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/* ======================================================================== *
 *  PANEL PREVIEW SATU MEDIA
 * ======================================================================== */

interface MediaPaneProps {
  item: MediaPreviewItem;
  fileId: string;
  kind: string;
  sources: ReturnType<typeof buildMediaSources>;
}

const MediaPane: React.FC<MediaPaneProps> = ({ item, fileId, kind, sources }) => {
  const [proxyUrl, setProxyUrl] = useState<string>('');
  const [proxyError, setProxyError] = useState<string>('');
  const [loadingProxy, setLoadingProxy] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [source, setSource] = useState<'drive' | 'server'>('drive');
  const proxyUrlRef = useRef<string>('');

  const loadProxy = useCallback(
    async (silent = false) => {
      if (!fileId) {
        setProxyError('Berkas tidak punya Drive File ID — tidak bisa dimuat lewat server.');
        return '';
      }
      if (proxyUrlRef.current) return proxyUrlRef.current;
      setLoadingProxy(true);
      setProxyError('');
      try {
        const url = await fetchProxyBlobUrl(fileId, item.fileName || undefined);
        proxyUrlRef.current = url;
        setProxyUrl(url);
        return url;
      } catch (err: any) {
        const message = err?.message || 'Gagal memuat berkas lewat server.';
        if (!silent) setProxyError(message);
        else setProxyError(message);
        return '';
      } finally {
        setLoadingProxy(false);
      }
    },
    [fileId, item.fileName]
  );

  // Reset state setiap ganti berkas
  useEffect(() => {
    return () => {
      if (proxyUrlRef.current) {
        URL.revokeObjectURL(proxyUrlRef.current);
        proxyUrlRef.current = '';
      }
    };
  }, [fileId, item.url]);

  useEffect(() => {
    setProxyUrl('');
    setProxyError('');
    setImageFailed(false);
    setZoomed(false);
    setSource('drive');
    proxyUrlRef.current = '';
  }, [fileId, item.url]);

  const imageSrc = source === 'server' && proxyUrl ? proxyUrl : sources.direct || sources.thumbnail || item.url || '';
  const showImage = kind === 'image' && (source === 'server' ? Boolean(proxyUrl) : Boolean(imageSrc));
  const isEmbeddable = ['pdf', 'doc', 'sheet', 'slide', 'form'].includes(kind);

  // Gambar gagal dimuat langsung (berkas privat) -> otomatis pakai proxy server
  useEffect(() => {
    if (kind === 'image' && imageFailed && fileId && source === 'drive' && !proxyUrlRef.current) {
      void loadProxy(true);
    }
  }, [kind, imageFailed, fileId, source, loadProxy]);

  if (kind === 'folder') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
        <FolderOpen className="w-10 h-10 text-amber-400" />
        <p className="text-sm text-slate-300 font-semibold">Ini tautan FOLDER Google Drive</p>
        <p className="text-xs text-slate-500 max-w-sm">
          Folder tidak bisa di-preview di dalam aplikasi. Buka di tab baru untuk melihat seluruh isinya.
        </p>
      </div>
    );
  }

  if (kind === 'video' || kind === 'audio') {
    const mediaSrc = proxyUrl || sources.direct || item.url || '';
    const Tag = kind === 'video' ? 'video' : 'audio';
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-6">
        {mediaSrc ? (
          <Tag
            src={mediaSrc}
            controls
            className={kind === 'video' ? 'w-full max-h-[420px] rounded-lg bg-black' : 'w-full'}
          />
        ) : (
          <p className="text-xs text-slate-500">Sumber media tidak tersedia.</p>
        )}
        {fileId && (
          <button
            onClick={() => void loadProxy()}
            className="flex items-center gap-1.5 text-[11px] text-indigo-300 hover:text-indigo-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingProxy ? 'animate-spin' : ''}`} />
            Muat lewat server
          </button>
        )}
        {proxyError && <p className="text-[11px] text-rose-400">{proxyError}</p>}
      </div>
    );
  }

  if (showImage) {
    return (
      <div className="relative flex flex-col items-center justify-center gap-2">
        <img
          src={imageSrc}
          alt={item.fileName || mediaTitle(item)}
          onError={() => setImageFailed(true)}
          className={`${
            zoomed ? 'max-h-none w-auto max-w-full' : 'max-h-[62vh] w-auto max-w-full'
          } object-contain rounded-lg border border-slate-800 bg-slate-950 transition-all cursor-zoom-in`}
          onClick={() => setZoomed((v) => !v)}
        />
        {imageFailed && source === 'drive' && !proxyUrl && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CloudOff className="w-8 h-8 text-rose-400" />
            <p className="text-xs text-slate-400 max-w-xs">
              Gambar tidak bisa dimuat langsung dari Google Drive (kemungkinan privat / belum dibagikan).
            </p>
            <button
              onClick={() => void loadProxy()}
              disabled={!fileId || loadingProxy}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg"
            >
              <RefreshCw className={`w-4 h-4 ${loadingProxy ? 'animate-spin' : ''}`} />
              {loadingProxy ? 'Memuat...' : 'Muat lewat server'}
            </button>
            {proxyError && <p className="text-[11px] text-rose-400 max-w-xs">{proxyError}</p>}
          </div>
        )}
        {proxyError && source === 'server' && <p className="text-[11px] text-rose-400">{proxyError}</p>}
        <div className="flex items-center gap-2">
          {fileId && source === 'drive' && (
            <button
              onClick={() => {
                setSource('server');
                void loadProxy();
              }}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Muat lewat server
            </button>
          )}
          {source === 'server' && (
            <button
              onClick={() => setSource('drive')}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Kembali ke Drive
            </button>
          )}
          <button
            onClick={() => setZoomed((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
          >
            {zoomed ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            {zoomed ? 'Perkecil' : 'Perbesar'}
          </button>
        </div>
      </div>
    );
  }

  if (isEmbeddable) {
    const embedSrc =
      source === 'server' && proxyUrl ? proxyUrl : sources.embed || (fileId ? `https://drive.google.com/file/d/${fileId}/preview` : item.url || '');
    return (
      <div className="flex flex-col gap-2">
        {embedSrc ? (
          <iframe
            src={embedSrc}
            title={item.fileName || mediaTitle(item)}
            className="w-full h-[58vh] rounded-lg border border-slate-800 bg-white"
            allow="fullscreen"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <FileText className="w-9 h-9 text-slate-500" />
            <p className="text-xs text-slate-500">Tidak ada sumber preview untuk berkas ini.</p>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="inline-flex rounded-lg border border-slate-700 overflow-hidden text-[11px]">
            <button
              onClick={() => setSource('drive')}
              className={`px-3 py-1.5 ${source === 'drive' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
            >
              Google Drive
            </button>
            <button
              onClick={() => {
                setSource('server');
                void loadProxy();
              }}
              disabled={!fileId}
              className={`px-3 py-1.5 border-l border-slate-700 disabled:opacity-40 ${
                source === 'server' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              {loadingProxy ? 'Memuat...' : 'Server'}
            </button>
          </div>
          {proxyError && <span className="text-[11px] text-rose-400">{proxyError}</span>}
        </div>
      </div>
    );
  }

  if (kind === 'archive' || kind === 'unknown' || kind === 'data') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
        <MediaKindIcon kind={kind} className="w-10 h-10 text-slate-500" />
        <p className="text-sm text-slate-300 font-semibold">{item.fileName || mediaTitle(item)}</p>
        <p className="text-xs text-slate-500 max-w-sm">
          Jenis berkas ini belum punya preview di dalam aplikasi. Unduh atau buka di Google Drive.
        </p>
        {fileId && (
          <button
            onClick={() => void loadProxy()}
            className="flex items-center gap-1.5 text-[11px] text-indigo-300 hover:text-indigo-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingProxy ? 'animate-spin' : ''}`} />
            Coba muat lewat server
          </button>
        )}
        {proxyError && <p className="text-[11px] text-rose-400 max-w-sm">{proxyError}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <ZoomOut className="w-9 h-9 text-slate-600" />
      <p className="text-xs text-slate-500">Tidak ada media untuk ditampilkan.</p>
    </div>
  );
};

/* ======================================================================== *
 *  MODAL
 * ======================================================================== */

interface MediaPreviewModalProps {
  items: MediaPreviewItem[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({ items, index, onIndexChange, onClose }) => {
  const [copied, setCopied] = useState(false);
  const item = items[index];

  const fileId = useMemo(
    () => String(item?.driveFileId || '').trim() || extractDriveFileId(item?.url) || extractDriveFileId(item?.webViewLink) || '',
    [item]
  );
  const kind = useMemo(() => classifyMedia({ ...item, driveFileId: fileId }), [item, fileId]);
  const sources = useMemo(() => buildMediaSources({ ...item, driveFileId: fileId }), [item, fileId]);
  const title = useMemo(() => mediaTitle({ ...item, driveFileId: fileId }), [item, fileId]);
  const linkToCopy = sources.webView || item?.url || '';
  const downloadUrl = sources.download || (fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : item?.url || '');

  useEffect(() => {
    setCopied(false);
  }, [index]);

  const handleCopy = async () => {
    if (!linkToCopy) return;
    try {
      await navigator.clipboard.writeText(linkToCopy);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error('Gagal menyalin tautan', err);
    }
  };

  if (!item) return null;

  const isGallery = items.length > 1;

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${title}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl shadow-2xl relative my-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-slate-800 px-4 py-3 bg-slate-900/95">
          <div className="p-2 rounded-lg bg-slate-800 text-indigo-300 shrink-0">
            <MediaKindIcon kind={kind} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-white text-sm sm:text-base truncate">{title}</h3>
              <span className="text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                {KIND_LABEL[kind] || kind}
              </span>
              {item.module && (
                <span className="text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-900">
                  {item.module}
                </span>
              )}
              {isGallery && (
                <span className="text-[10px] font-mono text-slate-500">
                  {index + 1} / {items.length}
                </span>
              )}
            </div>
            {item.caption && <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.caption}</p>}
            {item.fileName && item.fileName !== title && (
              <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">{item.fileName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 shrink-0"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="relative bg-slate-950/60 p-3 sm:p-4 min-h-[260px] max-h-[70vh] overflow-auto">
          {isGallery && (
            <>
              <button
                onClick={() => onIndexChange((index - 1 + items.length) % items.length)}
                className="absolute left-1 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-slate-900/85 border border-slate-700 text-slate-200 hover:bg-slate-800"
                title="Sebelumnya (←)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => onIndexChange((index + 1) % items.length)}
                className="absolute right-1 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-slate-900/85 border border-slate-700 text-slate-200 hover:bg-slate-800"
                title="Berikutnya (→)"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
          <MediaPane item={item} fileId={fileId} kind={kind} sources={sources} />
        </div>

        {/* Info */}
        <div className="px-4 py-2 border-t border-slate-800 bg-slate-900/80 text-[11px] font-mono text-slate-400 space-y-1">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              <span className="text-slate-600">Drive File ID:</span> {fileId || '-'}
            </span>
            <span className="truncate max-w-full">
              <span className="text-slate-600">Tautan:</span> {linkToCopy || '-'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-slate-800 bg-slate-900">
          <div className="flex flex-wrap items-center gap-2">
            {linkToCopy && (
              <a
                href={linkToCopy}
                target="_blank"
                rel="noopener noreferrer"
                data-no-media-preview
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
              >
                <ExternalLink className="w-4 h-4" />
                Buka di Google Drive
              </a>
            )}
            {downloadUrl && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={item.fileName || undefined}
                data-no-media-preview
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                Unduh
              </a>
            )}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg transition"
              title="Salin tautan"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Tersalin' : 'Salin Tautan'}
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-700 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

/* ======================================================================== *
 *  PROVIDER (dipasang sekali di App.tsx)
 * ======================================================================== */

function normalizeItem(input: MediaPreviewItem | string): MediaPreviewItem {
  if (typeof input === 'string') return { url: input, fileName: fileNameFromUrl(input) };
  return input;
}

export const MediaPreviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<MediaPreviewItem[]>([]);
  const [index, setIndex] = useState(0);
  const open = items.length > 0;

  const openMedia = useCallback((input: MediaPreviewItem | string) => {
    const item = normalizeItem(input);
    if (!item.url && !item.driveFileId) return;
    setItems([item]);
    setIndex(0);
  }, []);

  const openGallery = useCallback((list: MediaPreviewItem[], startIndex = 0) => {
    const clean = (list || []).filter((x) => x && (x.url || x.driveFileId));
    if (clean.length === 0) return;
    setItems(clean);
    setIndex(Math.min(Math.max(0, startIndex), clean.length - 1));
  }, []);

  const closeMedia = useCallback(() => {
    setItems([]);
    setIndex(0);
  }, []);

  /* ---- keyboard: Esc tutup, panah navigasi galeri ---- */
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMedia();
      } else if (e.key === 'ArrowRight' && items.length > 1) {
        setIndex((i) => (i + 1) % items.length);
      } else if (e.key === 'ArrowLeft' && items.length > 1) {
        setIndex((i) => (i - 1 + items.length) % items.length);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, items.length, closeMedia]);

  /* ---- intersepsi klik global: semua tautan media Drive otomatis di-preview ---- */
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const readGallery = (el: Element): { list: MediaPreviewItem[]; index: number } | null => {
      const raw = el.getAttribute('data-media-gallery');
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        const list: MediaPreviewItem[] = Array.isArray(parsed) ? parsed : parsed?.items || [];
        if (!Array.isArray(list) || list.length === 0) return null;
        const idx = Number(el.getAttribute('data-media-index') || 0) || 0;
        return { list, index: Math.min(Math.max(0, idx), list.length - 1) };
      } catch {
        return null;
      }
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (!target || typeof target.closest !== 'function') return;
      if (target.closest('[data-no-media-preview]')) return;

      const el = target.closest('[data-media-preview], a[href], img[src]') as HTMLElement | null;
      if (!el) return;

      const explicit = el.hasAttribute('data-media-preview');
      const tagName = el.tagName.toUpperCase();
      const url =
        el.getAttribute('data-media-url') ||
        (tagName === 'IMG' ? el.getAttribute('src') : el.getAttribute('href')) ||
        '';
      if (!url) return;

      // <img> polos tanpa penanda tidak dibajak (mis. logo perusahaan)
      if (!explicit && tagName === 'IMG' && !el.hasAttribute('data-media-src')) return;

      const fileName =
        el.getAttribute('data-media-name') ||
        (tagName === 'IMG' ? el.getAttribute('alt') || '' : '') ||
        el.getAttribute('data-media-title') ||
        '';
      const cleanFileName = String(fileName).trim().slice(0, 120);

      if (!shouldInterceptLink(url, cleanFileName)) return;

      const gallery = readGallery(el);
      e.preventDefault();
      e.stopPropagation();

      if (gallery) {
        openGallery(gallery.list, gallery.index);
        return;
      }

      openMedia({
        url,
        fileName: cleanFileName || fileNameFromUrl(url),
        title: el.getAttribute('data-media-title') || undefined,
        caption: el.getAttribute('data-media-caption') || undefined,
        driveFileId: el.getAttribute('data-media-id') || undefined,
        mimeType: el.getAttribute('data-media-mime') || undefined,
        module: el.getAttribute('data-media-module') || undefined,
      });
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [openMedia, openGallery]);

  const value = useMemo<MediaPreviewContextValue>(
    () => ({ openMedia, openGallery, closeMedia, isMediaPreviewOpen: open }),
    [openMedia, openGallery, closeMedia, open]
  );

  return (
    <MediaPreviewContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined' && open
        ? createPortal(<MediaPreviewModal items={items} index={index} onIndexChange={setIndex} onClose={closeMedia} />, document.body)
        : null}
    </MediaPreviewContext.Provider>
  );
};

/* ======================================================================== *
 *  KOMPONEN BANTU (dipakai modul-modul)
 * ======================================================================== */

export interface MediaThumbProps extends MediaPreviewItem {
  /** Kelas tambahan untuk pembungkus. */
  className?: string;
  /** Kelas untuk <img>. */
  imgClassName?: string;
  /** Teks kecil di bawah thumbnail. */
  label?: string;
  /** Ukuran thumbnail (px) — dipakai sebagai tinggi minimum. */
  height?: number;
  /** Matikan preview (mis. sedang mode edit). */
  disabled?: boolean;
  /** Elemen tambahan di pojok kanan atas. */
  action?: React.ReactNode;
}

/**
 * Thumbnail media yang bisa diklik untuk membuka preview global.
 * Menampilkan ikon jenis berkas bila URL bukan gambar / gagal dimuat.
 */
export const MediaThumb: React.FC<MediaThumbProps> = ({
  url,
  fileName,
  title,
  caption,
  driveFileId,
  mimeType,
  module,
  className = '',
  imgClassName = '',
  label,
  height = 96,
  disabled,
  action,
}) => {
  const { openMedia } = useMediaPreview();
  const [failed, setFailed] = useState(false);
  const fileId = String(driveFileId || '').trim() || extractDriveFileId(url) || '';
  const kind = classifyMedia({ url, fileName, mimeType, driveFileId: fileId });
  const isImage = kind === 'image' || (!failed && kind !== 'folder' && Boolean(url));
  const sources = useMemo(() => buildMediaSources({ url, fileName, mimeType, driveFileId: fileId }), [url, fileName, mimeType, fileId]);
  const thumbSrc = sources.thumbnail || sources.direct || url || '';

  useEffect(() => setFailed(false), [url, fileId]);

  const handleClick = () => {
    if (disabled) return;
    openMedia({ url, fileName, title, caption, driveFileId: fileId, mimeType, module });
  };

  if (!url && !fileId) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-900/60 text-slate-600 ${className}`}
        style={{ minHeight: height }}
      >
        <div className="text-center px-2">
          <ImageIcon className="w-5 h-5 mx-auto mb-1 opacity-60" />
          <span className="text-[10px]">Belum ada media</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative group ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        title={title || fileName || 'Lihat preview'}
        className={`block w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-950 text-left transition ${
          disabled ? 'cursor-default opacity-80' : 'hover:border-indigo-600 hover:ring-1 hover:ring-indigo-600/50 cursor-zoom-in'
        }`}
        style={{ minHeight: height }}
      >
        {isImage && thumbSrc && !failed ? (
          <img
            src={thumbSrc}
            alt={fileName || title || 'media'}
            loading="lazy"
            onError={() => setFailed(true)}
            className={`w-full object-cover ${imgClassName}`}
            style={{ height }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 text-slate-500" style={{ minHeight: height }}>
            <MediaKindIcon kind={failed ? kind : kind} className="w-6 h-6" />
            <span className="text-[10px] px-2 text-center truncate max-w-full">{fileName || KIND_LABEL[kind] || 'Berkas'}</span>
          </div>
        )}
        {!disabled && (
          <span className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-slate-950/55 text-white">
            <span className="flex items-center gap-1 text-[11px] font-semibold bg-slate-900/85 px-2.5 py-1 rounded-lg border border-slate-700">
              <ZoomIn className="w-3.5 h-3.5" /> Preview
            </span>
          </span>
        )}
      </button>
      {label && <p className="text-[10px] text-slate-400 mt-1 truncate">{label}</p>}
      {action && <div className="absolute top-1 right-1 z-10">{action}</div>}
    </div>
  );
};

export interface MediaLinkProps extends MediaPreviewItem {
  children: React.ReactNode;
  className?: string;
  /** Tetap buka tab baru (tidak di-preview). */
  forceExternal?: boolean;
  title?: string;
}

/**
 * Tautan berkas yang membuka preview in-app; tetap punya jalur "buka di tab
 * baru" lewat klik tengah / Ctrl+klik (di-handle interceptor global).
 */
export const MediaLink: React.FC<MediaLinkProps> = ({
  url,
  fileName,
  title,
  caption,
  driveFileId,
  mimeType,
  module,
  children,
  className = '',
  forceExternal,
}) => {
  const { openMedia } = useMediaPreview();
  const fileId = String(driveFileId || '').trim() || extractDriveFileId(url) || '';
  const kind = classifyMedia({ url, fileName, mimeType, driveFileId: fileId });
  const href = url || (fileId ? `https://drive.google.com/file/d/${fileId}/view` : '#');

  if (!url && !fileId) return <span className={`${className} opacity-50`}>{children}</span>;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-media-preview={forceExternal ? undefined : 'true'}
      data-media-url={href}
      data-media-name={fileName || undefined}
      data-media-title={title || undefined}
      data-media-caption={caption || undefined}
      data-media-id={fileId || undefined}
      data-media-mime={mimeType || undefined}
      data-media-module={module || undefined}
      data-no-media-preview={forceExternal ? 'true' : undefined}
      onClick={(e) => {
        if (forceExternal) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        openMedia({ url: href, fileName, title, caption, driveFileId: fileId, mimeType, module });
      }}
      title={title || `Preview ${KIND_LABEL[kind] || 'berkas'}`}
      className={className}
    >
      {children}
    </a>
  );
};

/** Badge kecil penanda berkas Drive (dipakai di tabel/list). */
export const MediaBadge: React.FC<{ kind?: string; label?: string; className?: string }> = ({ kind = 'unknown', label, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800/70 text-slate-300 ${className}`}
  >
    <MediaKindIcon kind={kind} className="w-3 h-3" />
    {label || KIND_LABEL[kind] || 'Berkas'}
  </span>
);

export interface MediaUrlPreviewButtonProps {
  /** URL berkas / tautan Drive (boleh kosong). */
  url?: string | null;
  fileName?: string | null;
  title?: string | null;
  caption?: string | null;
  driveFileId?: string | null;
  module?: string | null;
  label?: string;
  className?: string;
  /** Varian tampilan. */
  variant?: 'solid' | 'ghost';
  size?: 'xs' | 'sm';
}

/**
 * Tombol "Preview" untuk kolom input URL berkas (dipakai di form Modal Kerja,
 * Eksekusi Unit, Pembayaran, Petty Cash, Transfer Komisi Mitra, Dokumen, dll).
 * Tidak menghapus fitur lama — hanya menambah jalur lihat-berkas di dalam app.
 */
export const MediaUrlPreviewButton: React.FC<MediaUrlPreviewButtonProps> = ({
  url,
  fileName,
  title,
  caption,
  driveFileId,
  module,
  label = 'Preview',
  className = '',
  variant = 'ghost',
  size = 'xs',
}) => {
  const { openMedia } = useMediaPreview();
  const fileId = String(driveFileId || '').trim() || extractDriveFileId(url) || '';
  const hasMedia = Boolean(url || fileId);
  const kind = classifyMedia({ url, fileName, driveFileId: fileId });
  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-2 py-1 text-[11px]';
  const skin =
    variant === 'solid'
      ? 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500'
      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700';

  return (
    <button
      type="button"
      disabled={!hasMedia}
      onClick={() =>
        openMedia({
          url: url || (fileId ? `https://drive.google.com/file/d/${fileId}/view` : ''),
          fileName: fileName || fileNameFromUrl(url) || undefined,
          title: title || undefined,
          caption: caption || undefined,
          driveFileId: fileId || undefined,
          module: module || undefined,
        })
      }
      title={hasMedia ? `Lihat ${KIND_LABEL[kind] || 'berkas'} di dalam aplikasi` : 'Belum ada tautan berkas'}
      className={`inline-flex items-center gap-1 rounded-lg font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${pad} ${skin} ${className}`}
    >
      <ZoomIn className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
      <span>{label}</span>
    </button>
  );
};

export { MediaKindIcon, KIND_LABEL };
export default MediaPreviewProvider;
