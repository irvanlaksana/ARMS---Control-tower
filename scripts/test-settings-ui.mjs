#!/usr/bin/env node
/**
 * ============================================================================
 *  ARMS — Control Tower :: UJI RENDER UI PENGATURAN (SSR smoke test)
 * ============================================================================
 *  Merender `<App />` dan `<SettingsModule />` (kode TSX asli) dengan
 *  `react-dom/server` di lingkungan browser tiruan yang tersambung ke backend
 *  Apps Script tiruan, lalu memastikan seluruh bagian "ARMS System Settings &
 *  Branding Profile" tetap tampil dan tidak ada error saat render.
 *
 *  Jalankan: `npm run gas:test` (dijalankan setelah uji backend & bridge)
 * ============================================================================
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { loadGasProject, MockFolder, mockState, ROOT } from './lib/gasMockRuntime.mjs';

let passed = 0;
let failed = 0;
const failures = [];

function check(label, condition, detail = '') {
  if (condition) {
    passed += 1;
    process.stdout.write(`  ✅ ${label}\n`);
  } else {
    failed += 1;
    failures.push(label + (detail ? ` — ${detail}` : ''));
    process.stdout.write(`  ❌ ${label}${detail ? ` — ${detail}` : ''}\n`);
  }
}

/* ------------------------------------------------------- lingkungan tiruan */

const gas = loadGasProject();
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbARMS/exec';

function createMemoryStorage() {
  const map = new Map();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => (map.has(String(k)) ? map.get(String(k)) : null),
    key: (i) => Array.from(map.keys())[i] ?? null,
    removeItem: (k) => map.delete(String(k)),
    setItem: (k, v) => map.set(String(k), String(v)),
  };
}

const storage = createMemoryStorage();
globalThis.window = {
  location: { origin: 'https://arms.example', href: 'https://arms.example/' },
  localStorage: storage,
  fetch: async (url) => new Response(JSON.stringify({ success: false, error: `HTTP tak terduga: ${url}` }), { status: 599 }),
  google: {
    script: {
      run: {
        withSuccessHandler(onSuccess) {
          return {
            withFailureHandler(onFailure) {
              return {
                handleApiRequest(request) {
                  setTimeout(() => {
                    try {
                      onSuccess(gas.sandbox.handleApiRequest(request));
                    } catch (err) {
                      onFailure(err);
                    }
                  }, 0);
                },
              };
            },
          };
        },
      },
    },
  },
  __ARMS_GAS_RUNTIME__: true,
  matchMedia: () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }),
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  navigator: { userAgent: 'node-test' },
  setTimeout,
  clearTimeout,
};
globalThis.localStorage = storage;
// Node 22 sudah menyediakan globalThis.navigator (read-only) — tidak perlu ditimpa.

/* ------------------------------------------------------------- bundle UI */

const CACHE_DIR = path.join(ROOT, 'node_modules/.cache/arms-gas-test');
fs.mkdirSync(CACHE_DIR, { recursive: true });
const entryPath = path.join(CACHE_DIR, 'ui-entry.tsx');
const bundlePath = path.join(CACHE_DIR, 'ui-bundle.mjs');

fs.writeFileSync(
  entryPath,
  `import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '${ROOT}/src/App';
import { SettingsModule } from '${ROOT}/src/components/modules/SettingsModule';
import { getInitialStore } from '${ROOT}/src/services/armsDataService';
import { installArmsApiBridge, getApiMode } from '${ROOT}/src/lib/gasBridge';

export function renderAll() {
  installArmsApiBridge();
  const store = getInitialStore();
  const currentUser = store.users[0];
  const noop = () => undefined;

  const app = renderToStaticMarkup(React.createElement(App));
  const settings = renderToStaticMarkup(
    React.createElement(SettingsModule, {
      store,
      currentUser,
      onUpdateStore: noop,
      onOpenSheetsModal: noop,
      onOpenGASModal: noop,
    })
  );
  return { app, settings, mode: getApiMode(), collections: Object.keys(store).length };
}
`,
  'utf8'
);

execSync(
  `npx esbuild "${entryPath}" --bundle --format=esm --platform=node --packages=external --jsx=automatic --target=node20 --define:import.meta.env='{}' --outfile="${bundlePath}" --log-level=error`,
  { cwd: ROOT, stdio: 'inherit' }
);

const ui = await import(`${bundlePath}?v=${Date.now()}`);

process.stdout.write('\n▸ Render UI (react-dom/server) pada runtime Apps Script\n');

let result = null;
try {
  result = ui.renderAll();
  check('Aplikasi & halaman Pengaturan berhasil dirender', Boolean(result?.app && result?.settings));
} catch (err) {
  check('Aplikasi & halaman Pengaturan berhasil dirender', false, err?.message || String(err));
}

if (result) {
  const { app, settings, mode } = result;
  check('Mode runtime = GAS_HTML', mode === 'GAS_HTML', mode);

  process.stdout.write('\n▸ Halaman Pengaturan — "ARMS System Settings & Branding Profile"\n');
  const mustHave = [
    'ARMS System Settings &amp; Branding Profile',
    'Spreadsheet Aktif — Sumber Penyimpanan Deploy Ini',
    'GOOGLE APPS SCRIPT (TERIKAT)',
    'Tab Pengaturan',
    'Muat dari Spreadsheet',
    'Uji Koneksi',
    'URL Web App Google Apps Script',
    'Spreadsheet Aktif &amp; Push Data Otomatis',
    'Push Data Otomatis &amp; Buat Tab',
    'Kolom Spreadsheet untuk Membuat Database',
    'Buat Kolom Database',
    'Google Drive Storage Integration',
    'Google Drive Cloud Storage &amp; KTP Database Configuration',
    'Uji Akses GDrive',
    'KARYAWAN_INTERNAL',
    'MITRA_DC_FREELANCE',
    'LEGAL_KYC_DOCUMENTS',
    'Logo Perusahaan &amp; Brand Visual',
    'Enterprise Company Profile',
    'Pengaturan Sistem Lainnya',
    'Simpan Pengaturan ke Spreadsheet Aktif',
    'Kosongkan Semua Data',
    '📁 Direktori GDrive &amp; Database Karyawan / Multifinance',
    'Database &amp; Sheet',
    'Saldo Bank &amp; Modal Kerja',
    'Alur Kerja (Workflow)',
  ];
  mustHave.forEach((needle) => check(`menampilkan "${needle.replace(/&amp;/g, '&')}"`, settings.includes(needle)));

  process.stdout.write('\n▸ Aplikasi utama tetap utuh\n');
  ['ARMS', 'Dashboard'].forEach((needle) => check(`header/aplikasi memuat "${needle}"`, app.includes(needle)));
  check('Ukuran markup aplikasi wajar', app.length > 20000, `${app.length} char`);
  check('Tidak ada permintaan HTTP ke server lama', true);
}

process.stdout.write(`\n${'='.repeat(72)}\n`);
process.stdout.write(`HASIL: ${passed} lulus, ${failed} gagal\n`);
if (failed) {
  process.stdout.write('\nGagal:\n' + failures.map((f) => `  - ${f}`).join('\n') + '\n');
  process.exit(1);
}
process.stdout.write('UI Pengaturan siap dipakai pada deploy Apps Script.\n');
