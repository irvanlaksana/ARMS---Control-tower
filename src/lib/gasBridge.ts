/**
 * ============================================================================
 *  ARMS — Control Tower :: JEMBATAN API (Browser ↔ Google Apps Script)
 * ============================================================================
 *  Tujuan: seluruh fitur & fungsi aplikasi tetap sama persis, tetapi cara
 *  penyimpanannya dipindah ke SPREADSHEET AKTIF yang dipakai deploy saat ini
 *  melalui Google Apps Script.
 *
 *  Tiga mode operasi (otomatis terdeteksi):
 *    1. GAS_HTML  — aplikasi dibuka dari Web App Apps Script (HtmlService).
 *                   Semua `/api/*` diarahkan ke `google.script.run`.
 *    2. GAS_URL   — aplikasi di-host terpisah (Netlify/Vercel/lokal) tetapi
 *                   memakai URL Web App Apps Script (`appsScriptWebAppUrl`).
 *    3. SERVER    — memakai server bawaan repo (`server.ts` / Netlify / Vercel).
 *
 *  Tidak ada satu pun modul yang perlu diubah: bridge ini memasang interceptor
 *  pada `window.fetch` sehingga pemanggilan `/api/sheets/*`, `/api/drive/*`,
 *  `/api/gas/proxy`, `/api/surat/*` tetap berjalan seperti semula.
 * ============================================================================
 */

export type ArmsApiMode = 'GAS_HTML' | 'GAS_URL' | 'SERVER';

export interface ArmsRuntimeInfo {
  mode: ArmsApiMode;
  provider: string;
  version?: string;
  spreadsheetId?: string;
  spreadsheetName?: string;
  spreadsheetUrl?: string;
  spreadsheetSource?: string;
  settingsTab?: string;
  ownerEmail?: string;
  effectiveUser?: string;
  driveUser?: string;
  timezone?: string;
  scriptId?: string;
  settingsCount?: number;
  supabaseConfigured?: boolean;
  timestamp?: string;
  error?: string;
}

/** Peta endpoint REST lama → action Apps Script. */
export const GAS_ACTION_MAP: Record<string, string> = {
  '/api/health': 'HEALTH',
  '/api/runtime': 'RUNTIME_INFO',
  '/api/sheets/setup': 'SHEETS_SETUP',
  '/api/sheets/sync': 'SHEETS_SYNC',
  '/api/sheets/fetch': 'SHEETS_FETCH',
  '/api/gas/proxy': 'GAS_PROXY',
  '/api/drive/status': 'DRIVE_STATUS',
  '/api/drive/file': 'DRIVE_FILE',
  '/api/drive/upload': 'DRIVE_UPLOAD',
  '/api/drive/create-folder': 'DRIVE_CREATE_FOLDER',
  '/api/drive/ensure-path': 'DRIVE_ENSURE_PATH',
  '/api/surat/create-issue': 'SURAT_CREATE_ISSUE',
  '/api/surat/open-generator': 'SURAT_OPEN_GENERATOR',
  '/api/settings/save': 'SETTINGS_SAVE',
  '/api/settings/load': 'SETTINGS_LOAD',
};

const GAS_WEBAPP_URL_STORAGE_KEY = 'ARMS_GAS_WEB_APP_URL';
const ARMS_STORE_KEY = 'ARMS_SINGLE_SOURCE_DATA_V8';

declare global {
  interface Window {
    google?: any;
    __ARMS_GAS_RUNTIME__?: boolean;
    __ARMS_GAS_WEB_APP_URL__?: string;
    __ARMS_API_MODE__?: ArmsApiMode;
    __ARMS_BOOT_META__?: { version?: string; scriptId?: string; runtime?: string };
    __armsApiBridgeInstalled?: boolean;
  }
}

/** fetch asli (disimpan sebelum di-patch agar tidak rekursif). */
const nativeFetch: typeof fetch =
  typeof window !== 'undefined' && window.fetch ? window.fetch.bind(window) : (fetch as any);

let cachedRuntimeInfo: ArmsRuntimeInfo | null = null;
let runtimeInfoPromise: Promise<ArmsRuntimeInfo | null> | null = null;
let forcedMode: ArmsApiMode | null = null;

/* ======================================================================== *
 *  STORAGE SHIM (HtmlService iframe bisa memblokir localStorage)
 * ======================================================================== */

const memoryStorage: Record<string, string> = {};
let storageWorks = true;

function checkStorage(): boolean {
  try {
    const probe = '__arms_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * Bila localStorage diblokir (Safari private / sandbox iframe), pasang
 * penyimpanan memori agar aplikasi tetap jalan tanpa error.
 */
export function installStorageShim(): void {
  if (typeof window === 'undefined') return;
  storageWorks = checkStorage();
  if (storageWorks) return;

  const shim: Storage = {
    get length() {
      return Object.keys(memoryStorage).length;
    },
    clear: () => {
      Object.keys(memoryStorage).forEach((k) => delete memoryStorage[k]);
    },
    getItem: (key: string) => (Object.prototype.hasOwnProperty.call(memoryStorage, key) ? memoryStorage[key] : null),
    key: (index: number) => Object.keys(memoryStorage)[index] ?? null,
    removeItem: (key: string) => {
      delete memoryStorage[key];
    },
    setItem: (key: string, value: string) => {
      memoryStorage[key] = String(value);
    },
  } as Storage;

  try {
    Object.defineProperty(window, 'localStorage', { value: shim, configurable: true, writable: true });
  } catch {
    (window as any).localStorage = shim;
  }
  storageWorks = false;
  // eslint-disable-next-line no-console
  console.warn('[ARMS] localStorage tidak tersedia di runtime ini — memakai penyimpanan memori sementara (sumber utama: spreadsheet aktif).');
}

export function isPersistentStorageAvailable(): boolean {
  return storageWorks;
}

function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memoryStorage[key] ?? null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    memoryStorage[key] = value;
  }
}

function safeRemoveItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    delete memoryStorage[key];
  }
}

function readStoredSettings(): Record<string, any> {
  const raw = safeGetItem(ARMS_STORE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed?.settings && typeof parsed.settings === 'object' ? parsed.settings : {};
  } catch {
    return {};
  }
}

/* ======================================================================== *
 *  DETEKSI MODE
 * ======================================================================== */

/** True bila aplikasi berjalan di dalam Web App Apps Script. */
export function isGasHtmlRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.__ARMS_GAS_RUNTIME__ === true) return true;
  return Boolean(window.google && window.google.script && typeof window.google.script.run === 'object');
}

/** URL Web App Apps Script (mode GAS_URL) dari berbagai sumber konfigurasi. */
export function getGasWebAppUrl(): string {
  if (typeof window === 'undefined') return '';
  const fromWindow = (window.__ARMS_GAS_WEB_APP_URL__ || '').trim();
  if (fromWindow) return fromWindow;

  const fromStorage = (safeGetItem(GAS_WEBAPP_URL_STORAGE_KEY) || '').trim();
  if (fromStorage) return fromStorage;

  const fromSettings = String(readStoredSettings().appsScriptWebAppUrl || '').trim();
  if (fromSettings) return fromSettings;

  const fromEnv = String((import.meta as any)?.env?.VITE_GAS_WEB_APP_URL || '').trim();
  return fromEnv;
}

/** Simpan URL Web App Apps Script (dipakai bila aplikasi di-host terpisah). */
export function setGasWebAppUrl(url: string): void {
  const clean = String(url || '').trim();
  if (clean) {
    safeSetItem(GAS_WEBAPP_URL_STORAGE_KEY, clean);
    if (typeof window !== 'undefined') window.__ARMS_GAS_WEB_APP_URL__ = clean;
  } else {
    safeRemoveItem(GAS_WEBAPP_URL_STORAGE_KEY);
    if (typeof window !== 'undefined') delete window.__ARMS_GAS_WEB_APP_URL__;
  }
  cachedRuntimeInfo = null;
  runtimeInfoPromise = null;
}

export function getApiMode(): ArmsApiMode {
  if (forcedMode) return forcedMode;
  if (typeof window !== 'undefined' && window.__ARMS_API_MODE__) return window.__ARMS_API_MODE__;
  if (isGasHtmlRuntime()) return 'GAS_HTML';
  if (getGasWebAppUrl()) return 'GAS_URL';
  return 'SERVER';
}

/** Paksa mode tertentu (dipakai Pengaturan untuk uji koneksi). */
export function setApiMode(mode: ArmsApiMode | null): void {
  forcedMode = mode;
  if (typeof window !== 'undefined') {
    if (mode) window.__ARMS_API_MODE__ = mode;
    else delete window.__ARMS_API_MODE__;
  }
  cachedRuntimeInfo = null;
  runtimeInfoPromise = null;
}

/** Backend Apps Script aktif (spreadsheet aktif = sumber penyimpanan). */
export function isGasBackendActive(): boolean {
  const mode = getApiMode();
  if (mode !== 'SERVER') return true;
  return cachedRuntimeInfo?.provider === 'google-apps-script';
}

/* ======================================================================== *
 *  PEMANGGILAN ACTION
 * ======================================================================== */

/** Panggil Apps Script lewat `google.script.run` (mode GAS_HTML). */
function callViaScriptRun(action: string, payload: Record<string, any>): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const runner = window.google.script.run
        .withSuccessHandler((result: any) => resolve(result))
        .withFailureHandler((err: any) =>
          reject(new Error(err?.message || (typeof err === 'string' ? err : 'google.script.run gagal')))
        );
      runner.handleApiRequest({ action, payload: payload || {} });
    } catch (err: any) {
      reject(new Error(err?.message || String(err)));
    }
  });
}

/** Panggil Apps Script lewat HTTP ke URL Web App (mode GAS_URL). */
async function callViaWebAppUrl(action: string, payload: Record<string, any>): Promise<any> {
  const url = getGasWebAppUrl();
  if (!url) throw new Error('URL Web App Apps Script belum diisi.');
  if (url.endsWith('/dev')) {
    throw new Error(
      'URL berakhiran /dev membutuhkan login Google. Gunakan URL Web App resmi berakhiran /exec dari menu Deploy → New deployment.'
    );
  }

  const response = await nativeFetch(url, {
    method: 'POST',
    redirect: 'follow',
    // text/plain = "simple request" sehingga browser tidak mengirim preflight CORS.
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, payload: payload || {} }),
  });

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    if (/Google Accounts|<html|<!DOCTYPE|The page/i.test(text)) {
      throw new Error(
        'Apps Script mengembalikan halaman HTML/Akses Ditolak. Pastikan deployment Web App diset: Execute as = Me, Who has access = Anyone, dan pakai URL /exec.'
      );
    }
    throw new Error(`Respon Apps Script tidak valid (HTTP ${response.status}): ${text.slice(0, 150)}`);
  }
}

/** Jalankan satu action Apps Script dari mode apa pun. */
export async function callGasAction(action: string, payload: Record<string, any> = {}): Promise<any> {
  const mode = getApiMode();
  if (mode === 'GAS_HTML') return callViaScriptRun(action, payload);
  if (mode === 'GAS_URL') return callViaWebAppUrl(action, payload);
  throw new Error('Backend Google Apps Script tidak aktif (mode SERVER).');
}

/* ======================================================================== *
 *  RUNTIME INFO (spreadsheet aktif)
 * ======================================================================== */

/** Info runtime + spreadsheet aktif (di-cache). */
export async function fetchRuntimeInfo(force = false): Promise<ArmsRuntimeInfo | null> {
  if (cachedRuntimeInfo && !force) return cachedRuntimeInfo;
  if (runtimeInfoPromise && !force) return runtimeInfoPromise;

  runtimeInfoPromise = (async () => {
    const mode = getApiMode();
    try {
      if (mode === 'SERVER') {
        const res = await nativeFetch('/api/runtime', { method: 'GET' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        cachedRuntimeInfo = { ...json, mode: 'SERVER' } as ArmsRuntimeInfo;
      } else {
        const json = await callGasAction('RUNTIME_INFO', {});
        cachedRuntimeInfo = { ...(json || {}), mode } as ArmsRuntimeInfo;
        if (json?.spreadsheetUrl && mode === 'GAS_URL') {
          /* URL spreadsheet aktif dipakai UI untuk tombol "Buka" */
        }
      }
      return cachedRuntimeInfo;
    } catch (err: any) {
      cachedRuntimeInfo = {
        mode,
        provider: mode === 'SERVER' ? 'server-api' : 'google-apps-script',
        error: err?.message || String(err),
      };
      return cachedRuntimeInfo;
    } finally {
      runtimeInfoPromise = null;
    }
  })();

  return runtimeInfoPromise;
}

export function getCachedRuntimeInfo(): ArmsRuntimeInfo | null {
  return cachedRuntimeInfo;
}

/** ID spreadsheet aktif yang dipakai deploy saat ini. */
export async function getActiveSpreadsheetId(): Promise<string> {
  const info = await fetchRuntimeInfo();
  return (info?.spreadsheetId || '').trim();
}

/* ======================================================================== *
 *  FETCH INTERCEPTOR
 * ======================================================================== */

function toAbsoluteUrl(input: any): string {
  if (typeof input === 'string') return input;
  if (typeof URL !== 'undefined' && input instanceof URL) return input.toString();
  if (input && typeof input === 'object' && typeof input.url === 'string') return input.url;
  return String(input || '');
}

/** Kembalikan path `/api/...` bila URL adalah endpoint API internal. */
function extractApiPath(url: string): string | null {
  if (!url) return null;
  let pathname = url;
  try {
    if (/^https?:\/\//i.test(url)) {
      const parsed = new URL(url, window.location.origin);
      if (parsed.origin !== window.location.origin) return null;
      pathname = parsed.pathname + parsed.search;
    }
  } catch {
    /* biarkan apa adanya */
  }
  const clean = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '');
  return Object.prototype.hasOwnProperty.call(GAS_ACTION_MAP, clean) ? clean : null;
}

/**
 * Ambil query string sebagai objek polos. Dipakai agar endpoint GET seperti
 * `/api/drive/file?fileId=...` tetap mengirim parameternya ke Apps Script
 * (payload Apps Script hanya mengenal objek JSON, bukan query string).
 */
function extractQueryParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!url) return out;
  try {
    const search = url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : '';
    if (!search) return out;
    new URLSearchParams(search).forEach((value, key) => {
      out[key] = value;
    });
  } catch {
    /* abaikan query tidak valid */
  }
  return out;
}

async function readRequestBody(init?: RequestInit, input?: any): Promise<Record<string, any>> {
  let raw: any = init?.body;
  if (raw === undefined && input && typeof input === 'object' && typeof input.clone === 'function') {
    try {
      raw = await input.clone().text();
    } catch {
      raw = undefined;
    }
  }
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (raw instanceof URLSearchParams) {
    const out: Record<string, any> = {};
    raw.forEach((value, key) => (out[key] = value));
    return out;
  }
  return {};
}

function buildResponse(body: any, status = 200): Response {
  const httpStatus = Number(body?.httpStatus || status || 200);
  return new Response(JSON.stringify(body ?? {}), {
    status: httpStatus,
    statusText: httpStatus >= 400 ? 'Error' : 'OK',
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Pasang interceptor: semua `/api/*` yang punya padanan action Apps Script
 * dijalankan lewat backend Apps Script (spreadsheet aktif). Endpoint lain
 * dibiarkan memakai jalur aslinya.
 */
export function installArmsApiBridge(): void {
  if (typeof window === 'undefined' || window.__armsApiBridgeInstalled) return;
  installStorageShim();
  window.__armsApiBridgeInstalled = true;

  const patchedFetch = async (input: any, init?: RequestInit): Promise<Response> => {
    const url = toAbsoluteUrl(input);
    const path = extractApiPath(url);
    const mode = getApiMode();

    if (!path || mode === 'SERVER') {
      return nativeFetch(input, init);
    }

    const action = GAS_ACTION_MAP[path];
    const method = String(init?.method || (input && typeof input === 'object' ? input.method : 'GET') || 'GET').toUpperCase();
    const body = await readRequestBody(init, input);

    try {
      const query = extractQueryParams(url);
      const result = await callGasAction(action, { ...query, ...body, __path: path, __method: method });
      return buildResponse(result);
    } catch (err: any) {
      const message = err?.message || String(err);
      const status = /404|tidak dikenal/i.test(message) ? 404 : /40[13]/.test(message) ? 403 : 502;
      return buildResponse(
        {
          success: false,
          error: `[Google Apps Script] ${message}`,
          provider: 'google-apps-script',
          action,
          httpStatus: status,
        },
        status
      );
    }
  };

  (window as any).fetch = patchedFetch as typeof fetch;
  // Di browser `globalThis === window`, jadi ini tidak berpengaruh; disertakan
  // agar bridge tetap berlaku bila `window` berupa objek terpisah (mis. sandbox).
  try {
    if (typeof globalThis !== 'undefined' && (globalThis as any).fetch !== patchedFetch) {
      (globalThis as any).fetch = patchedFetch as typeof fetch;
    }
  } catch {
    /* abaikan bila globalThis.fetch read-only */
  }

  // Muat info runtime lebih awal agar UI & sync tahu spreadsheet aktifnya.
  void fetchRuntimeInfo();
}

/** Hapus interceptor (dipakai untuk uji jalur server asli). */
export function uninstallArmsApiBridge(): void {
  if (typeof window === 'undefined') return;
  (window as any).fetch = nativeFetch;
  try {
    if (typeof globalThis !== 'undefined') (globalThis as any).fetch = nativeFetch;
  } catch {
    /* abaikan */
  }
  window.__armsApiBridgeInstalled = false;
}
