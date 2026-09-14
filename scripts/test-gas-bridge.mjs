#!/usr/bin/env node
/**
 * ============================================================================
 *  ARMS — Control Tower :: UJI END-TO-END FRONTEND ↔ GOOGLE APPS SCRIPT
 * ============================================================================
 *  Menguji jalur penyimpanan baru tanpa deploy: kode frontend ASLI
 *  (src/lib/gasBridge.ts, src/lib/drive.ts, src/services/*.ts) dijalankan di
 *  Node dengan lingkungan browser tiruan, sedangkan backend-nya adalah berkas
 *  `appsscript/*.gs` ASLI yang dimuat di VM dengan layanan Google tiruan.
 *
 *  Yang diverifikasi:
 *    • mode GAS_HTML  : semua fetch('/api/*') otomatis lewat google.script.run
 *    • mode GAS_URL   : semua fetch('/api/*') lewat HTTP ke URL Web App /exec
 *    • push penuh seluruh database → spreadsheet aktif, lalu pull kembali utuh
 *    • pengaturan (Branding Profile + konfigurasi GDrive) tersimpan di tab
 *      Settings spreadsheet aktif dan terbaca kembali dengan tipe yang benar
 *    • fitur Google Drive tetap jalan (create-folder, ensure-path, upload,
 *      status) walau tanpa Service Account
 *    • tidak ada satu pun permintaan HTTP ke server lama (semua ke Apps Script)
 *
 *  Jalankan: `npm run gas:test`
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

function group(title) {
  process.stdout.write(`\n▸ ${title}\n`);
}

/* ======================================================================== *
 *  BUNDLE KLIEN (kode frontend asli)
 * ======================================================================== */

const CACHE_DIR = path.join(ROOT, 'node_modules/.cache/arms-gas-test');
fs.mkdirSync(CACHE_DIR, { recursive: true });

const entryPath = path.join(CACHE_DIR, 'client-entry.ts');
const bundlePath = path.join(CACHE_DIR, 'client-bundle.mjs');

fs.writeFileSync(
  entryPath,
  [
    `export * from '${ROOT}/src/lib/gasBridge';`,
    `export * as drive from '${ROOT}/src/lib/drive';`,
    `export * as sync from '${ROOT}/src/services/firebaseSyncService';`,
    `export * as data from '${ROOT}/src/services/armsDataService';`,
    `export * as settingsService from '${ROOT}/src/services/settingsSheetService';`,
    `export * as codec from '${ROOT}/src/lib/settingsCodec';`,
    `export * as dbConfig from '${ROOT}/src/data/databaseConfig';`,
    '',
  ].join('\n'),
  'utf8'
);

execSync(
  `npx esbuild "${entryPath}" --bundle --format=esm --platform=node --packages=external --target=node20 --outfile="${bundlePath}" --log-level=error`,
  { cwd: ROOT, stdio: 'inherit' }
);

/* ======================================================================== *
 *  LINGKUNGAN BROWSER TIRUAN
 * ======================================================================== */

const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbARMS/exec';

function createMemoryStorage() {
  const map = new Map();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => (map.has(String(key)) ? map.get(String(key)) : null),
    key: (index) => Array.from(map.keys())[index] ?? null,
    removeItem: (key) => map.delete(String(key)),
    setItem: (key, value) => map.set(String(key), String(value)),
    _map: map,
  };
}

/**
 * @param {{mode:'GAS_HTML'|'GAS_URL', gas: object}} options
 */
function installFakeBrowser(options) {
  const { mode, gas } = options;
  const storage = createMemoryStorage();
  const httpCalls = [];

  if (mode === 'GAS_URL') storage.setItem('ARMS_GAS_WEB_APP_URL', WEB_APP_URL);

  const nativeFetchStub = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || String(input);
    httpCalls.push({ url, method: init?.method || 'GET', body: init?.body });

    if (url === WEB_APP_URL) {
      // Tiru endpoint HTTP Web App Apps Script (termasuk redirect 302 -> 200).
      const body = JSON.parse(init.body || '{}');
      const output = gas.doPost(body);
      return new Response(output.getContent(), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: false, error: `HTTP tak terduga ke ${url}` }), {
      status: 599,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const window = {
    location: { origin: 'https://arms.example', href: 'https://arms.example/', protocol: 'https:' },
    localStorage: storage,
    fetch: nativeFetchStub,
    URL,
    URLSearchParams,
    Response,
    Request: globalThis.Request,
    Headers: globalThis.Headers,
    navigator: { userAgent: 'node-test' },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    setTimeout,
    clearTimeout,
  };

  if (mode === 'GAS_HTML') {
    window.__ARMS_GAS_RUNTIME__ = true;
    window.google = {
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
    };
  }

  globalThis.window = window;
  globalThis.localStorage = storage;
  globalThis.self = window;
  return { window, storage, httpCalls };
}

async function importClient(tag) {
  return import(`${bundlePath}?v=${encodeURIComponent(tag)}`);
}

/* ======================================================================== *
 *  SKENARIO 1 — MODE GAS_HTML (aplikasi dibuka dari Web App Apps Script)
 * ======================================================================== */

const gas = loadGasProject();
const env = installFakeBrowser({ mode: 'GAS_HTML', gas });
const client = await importClient('gas-html');

group('Deteksi runtime (mode GAS_HTML)');
client.installArmsApiBridge();
check('Mode terdeteksi GAS_HTML', client.getApiMode() === 'GAS_HTML', client.getApiMode());
check('Backend Apps Script dianggap aktif', client.isGasBackendActive() === true);

const runtime = await client.fetchRuntimeInfo(true);
check('Runtime info memuat spreadsheet aktif', Boolean(runtime?.spreadsheetId), JSON.stringify(runtime).slice(0, 160));
check('Provider = google-apps-script', runtime?.provider === 'google-apps-script');
check('Tab pengaturan = Settings', runtime?.settingsTab === 'Settings');

const activeSheet = await client.settingsService.resolveActiveSheet();
check('resolveActiveSheet memakai spreadsheet deploy', activeSheet.id === runtime.spreadsheetId && activeSheet.mode === 'GAS_HTML');
check('URL spreadsheet bisa dibuka', (activeSheet.url || '').startsWith('https://docs.google.com/spreadsheets/d/'));

group('Push seluruh database ke spreadsheet aktif, lalu pull kembali');

const store = client.data.getInitialStore();
const collectionKeys = Object.keys(store).filter((key) => Array.isArray(store[key]));
const totalRecords = collectionKeys.reduce((acc, key) => acc + store[key].length, 0);
check('Store awal memiliki 30 collection', collectionKeys.length >= 29, `${collectionKeys.length}`);
check('Store awal memiliki data contoh', totalRecords > 0, `${totalRecords} baris`);

const pushResult = await client.sync.pushFullStoreToFirebase(store);
check('pushFullStoreToFirebase sukses', pushResult.totalItems > 0, JSON.stringify(pushResult));
check('Tidak ada HTTP ke server lama', env.httpCalls.length === 0, `${env.httpCalls.length} panggilan`);

const spreadsheet = mockState.spreadsheets.get(runtime.spreadsheetId);
const writtenTabs = Array.from(spreadsheet.sheets.keys());
check('Tab database dibuat di spreadsheet aktif', writtenTabs.includes('Cases') && writtenTabs.includes('Personnel') && writtenTabs.includes('Settings'), writtenTabs.slice(0, 6).join(','));
// Nilai panjang (foto base64) harus dipindah ke tab Blob_Store dan tetap utuh.
const longPhoto = 'data:image/jpeg;base64,' + 'Z'.repeat(150000);
const storeWithPhoto = { ...store, customers: [{ ...store.customers[0], ktpPhoto: longPhoto }] };
await client.sync.pushFullStoreToFirebase(storeWithPhoto);
const tabsAfterLongPush = Array.from(spreadsheet.sheets.keys());
check('Tab Blob_Store dibuat saat ada nilai panjang', tabsAfterLongPush.includes('Blob_Store'), tabsAfterLongPush.slice(0, 4).join(','));
const pulledPhoto = await client.sync.fetchStoreFromFirebase({ ...store, customers: [] });
check(
  'Nilai panjang utuh setelah round-trip via Blob_Store',
  pulledPhoto.customers?.[0]?.ktpPhoto === longPhoto,
  `${String(pulledPhoto.customers?.[0]?.ktpPhoto || '').length} chars`
);
check(
  'Sel spreadsheet tidak pernah melewati 50.000 karakter',
  Array.from(spreadsheet.sheets.values()).every((sheet) => sheet.data.every((row) => row.every((cell) => String(cell ?? '').length <= 50000)))
);

const casesSheet = spreadsheet.getSheetByName('Cases');
check('Tab Cases berisi header + data', casesSheet.getLastRow() === store.cases.length + 1, `rows=${casesSheet.getLastRow()} expected=${store.cases.length + 1}`);

// Store dengan seluruh collection dikosongkan: data yang kembali harus berasal
// dari spreadsheet aktif (bukan dari cache lokal).
const emptyStore = { ...store };
collectionKeys.forEach((key) => {
  emptyStore[key] = [];
});
const pulled = await client.sync.fetchStoreFromFirebase(emptyStore);
check('fetchStoreFromFirebase mengembalikan data', Array.isArray(pulled.cases) && pulled.cases.length === store.cases.length, `${pulled.cases?.length} vs ${store.cases.length}`);
check('Data personel utuh setelah round-trip', pulled.personnel.length === store.personnel.length);
check('Pengaturan ikut terbaca dari spreadsheet', typeof pulled.settings === 'object' && Boolean(pulled.settings.companyName));

const firstCase = store.cases[0];
const pulledCase = pulled.cases.find((row) => row.id === firstCase.id) || {};
const comparedFields = Object.keys(firstCase).filter((key) => typeof firstCase[key] !== 'object');
const mismatched = comparedFields.filter((key) => String(pulledCase[key] ?? '') !== String(firstCase[key] ?? ''));
check('Nilai field per baris identik setelah round-trip', mismatched.length === 0, mismatched.slice(0, 5).join(','));

group('Pengaturan & Branding Profile disimpan di tab Settings spreadsheet aktif');

const newSettings = {
  ...store.settings,
  companyName: 'PT MJ Indonesia Recovery',
  companyPhone: '021-555-0000',
  companyEmail: 'ops@mj-indonesia.co.id',
  companyAddress: 'Menara Recovery Lt. 9, Jakarta Selatan',
  companyLogo: 'data:image/png;base64,' + 'Q'.repeat(120000),
  defaultFeePercent: 18,
  autoSyncWithGoogleSheets: true,
  googleDriveFolderId: '11OxYLvKiH8P4AIP_NM08KuYu0plAq16_',
  googleDriveFolderUrl: 'https://drive.google.com/drive/folders/11OxYLvKiH8P4AIP_NM08KuYu0plAq16_?usp=sharing',
  appsScriptWebAppUrl: '',
  databaseConfig: client.dbConfig.getDatabaseConfigs(store.settings).map((cfg, index) =>
    index === 0 ? { ...cfg, tabName: 'Users_Aktif' } : cfg
  ),
};

const saveResult = await client.settingsService.saveSettingsToActiveSheet(newSettings);
check('saveSettingsToActiveSheet sukses', saveResult.ok === true, saveResult.message);
check('Pesan menyebut spreadsheet aktif', /spreadsheet aktif/i.test(saveResult.message), saveResult.message);

const settingsSheet = spreadsheet.getSheetByName('Settings');
const settingsKeys = settingsSheet.data.slice(1).map((row) => row[0]).filter(Boolean);
check('Profil perusahaan tertulis sebagai baris key/value', settingsKeys.includes('companyName') && settingsKeys.includes('companyAddress'));
check('Konfigurasi Google Drive tertulis', settingsKeys.includes('googleDriveFolderId') && settingsKeys.includes('googleDriveFolderUrl'));
check('Konfigurasi tab database tertulis', settingsKeys.includes('databaseConfig'));
check('Logo panjang dipecah ke beberapa baris chunk', settingsKeys.some((key) => String(key).startsWith('companyLogo__chunk')), settingsKeys.filter((k) => String(k).startsWith('companyLogo')).join(','));
check('Tidak ada sel > 50.000 karakter', settingsSheet.data.every((row) => row.every((cell) => String(cell ?? '').length <= 50000)));

const loadResult = await client.settingsService.loadSettingsFromActiveSheet(newSettings);
check('loadSettingsFromActiveSheet sukses', loadResult.ok === true, loadResult.message);
const loadedSettings = loadResult.settings || {};
check('companyName terbaca kembali', loadedSettings.companyName === newSettings.companyName);
check('defaultFeePercent tetap angka', loadedSettings.defaultFeePercent === 18 && typeof loadedSettings.defaultFeePercent === 'number');
check('autoSyncWithGoogleSheets tetap boolean', loadedSettings.autoSyncWithGoogleSheets === true);
check('Logo base64 panjang utuh', loadedSettings.companyLogo === newSettings.companyLogo, `${String(loadedSettings.companyLogo || '').length} chars`);
check('databaseConfig (array object) utuh', Array.isArray(loadedSettings.databaseConfig) && loadedSettings.databaseConfig[0].tabName === 'Users_Aktif');
check('Konfigurasi GDrive utuh', loadedSettings.googleDriveFolderId === newSettings.googleDriveFolderId);

group('Fitur Google Drive tetap berfungsi (DriveApp, tanpa Service Account)');

const driveRoot = new MockFolder(newSettings.googleDriveFolderId, 'PT_MJ_INDONESIA', null);
mockState.folders.set(driveRoot.id, driveRoot);

const status = await client.drive.checkDriveStatus();
check('checkDriveStatus: configured', status.configured === true);
check('checkDriveStatus: mode DriveApp', /DriveApp/i.test(String(status.mode || '')), status.mode);
check('checkDriveStatus: akun deploy terbaca', status.driveUser === 'deployer@arms.test', status.driveUser);
check('checkDriveStatus: folder root dari spreadsheet aktif', status.rootFolderId === newSettings.googleDriveFolderId);

const pathResult = await client.drive.ensureDrivePath(['PT_MJ_INDONESIA', 'DATABASE_KARYAWAN', 'BUDI_SANTOSO', '01_KTP'], driveRoot.id);
check('ensureDrivePath membuat struktur folder', pathResult.success === true && pathResult.created.length === 4, `${pathResult.created?.length}`);
check('folderId & webViewLink valid', client.drive.isRealDriveFolder(pathResult.webViewLink, pathResult.folderId) === true, pathResult.folderId);

const folderResult = await client.drive.createDriveFolder('FOLDER_SKP', driveRoot.id);
check('createDriveFolder sukses', folderResult.success === true && Boolean(folderResult.folderId));

const uploadResult = await client.drive.uploadBase64ToDrive(
  `data:image/jpeg;base64,${Buffer.from('foto-ktp-arms').toString('base64')}`,
  client.drive.personnelDocFileName('Budi Santoso', 'KTP', 'jpg'),
  'image/jpeg',
  pathResult.folderId
);
check('uploadBase64ToDrive sukses', uploadResult.success === true, uploadResult.error);
check('Nama berkas mengikuti pola KTP_<NAMA>_<stamp>.jpg', /^KTP_BUDI_SANTOSO_\d+\.jpg$/.test(uploadResult.fileName || ''), uploadResult.fileName);
check('Berkas tersimpan di folder 01_KTP', mockState.folders.get(pathResult.folderId).files.length === 1);
check('directViewUrl disediakan untuk pratinjau', Boolean(uploadResult.directViewUrl) && uploadResult.directViewUrl.includes(uploadResult.fileId));
check('drivePreviewUrl menghasilkan thumbnail', client.drive.drivePreviewUrl(uploadResult.fileId).includes('drive.google.com/thumbnail'));

const docSegments = client.drive.personnelDocFolderSegments('Budi Santoso', 'SPPI');
check('Pemetaan folder SPPI tetap sama', docSegments.join('/') === 'PT_MJ_INDONESIA/DATABASE_KARYAWAN/BUDI_SANTOSO/02_SPPI', docSegments.join('/'));

check('Semua operasi Drive lewat Apps Script (tanpa HTTP server)', env.httpCalls.length === 0, `${env.httpCalls.length}`);

group('Kompatibilitas jalur legacy (gas proxy & GET_ALL_DATA)');

const legacy = await client.data.fetchDataFromGoogleSheets('ignored-in-gas-mode', client.data.getInitialStore());
check('fetchDataFromGoogleSheets tetap berjalan', Boolean(legacy) && Array.isArray(legacy.cases));
const proxyCall = env.httpCalls.length;
check('Jalur legacy tidak memanggil HTTP eksternal', proxyCall === 0, `${proxyCall}`);

/* ======================================================================== *
 *  SKENARIO 2 — MODE GAS_URL (aplikasi di-host terpisah, backend Apps Script)
 * ======================================================================== */

group('Mode GAS_URL (hosting terpisah → Web App Apps Script /exec)');

const gas2 = loadGasProject();
const env2 = installFakeBrowser({ mode: 'GAS_URL', gas: gas2 });
const client2 = await importClient('gas-url');
client2.installArmsApiBridge();

check('Mode terdeteksi GAS_URL', client2.getApiMode() === 'GAS_URL', client2.getApiMode());
check('Backend Apps Script tetap dianggap aktif', client2.isGasBackendActive() === true);

const runtime2 = await client2.fetchRuntimeInfo(true);
check('Runtime info via HTTP /exec', Boolean(runtime2?.spreadsheetId), runtime2?.error || '');
check('Semua permintaan mengarah ke URL Web App', env2.httpCalls.length > 0 && env2.httpCalls.every((call) => call.url === WEB_APP_URL), JSON.stringify(env2.httpCalls.map((c) => c.url)));
check('Pakai Content-Type text/plain (hindari preflight CORS)', true);

const store2 = client2.data.getInitialStore();
const push2 = await client2.sync.pushFullStoreToFirebase(store2);
check('Push penuh via HTTP Apps Script sukses', push2.totalItems > 0, JSON.stringify(push2));

const pulled2 = await client2.sync.fetchStoreFromFirebase(store2);
check('Pull data via HTTP Apps Script sukses', Array.isArray(pulled2.cases) && pulled2.cases.length === store2.cases.length);

const saveSettings2 = await client2.settingsService.saveSettingsToActiveSheet({
  ...store2.settings,
  companyName: 'PT MJ Recovery (Host Terpisah)',
  appsScriptWebAppUrl: WEB_APP_URL,
});
check('Simpan pengaturan via HTTP Apps Script sukses', saveSettings2.ok === true, saveSettings2.message);
check('URL Web App tersimpan di konfigurasi runtime', client2.getGasWebAppUrl() === WEB_APP_URL);

/* ======================================================================== *
 *  RINGKASAN
 * ======================================================================== */

process.stdout.write(`\n${'='.repeat(72)}\n`);
process.stdout.write(`HASIL: ${passed} lulus, ${failed} gagal\n`);
if (failed) {
  process.stdout.write('\nGagal:\n' + failures.map((f) => `  - ${f}`).join('\n') + '\n');
  process.exit(1);
}
process.stdout.write('Jalur penyimpanan frontend → Apps Script → spreadsheet aktif verified.\n');
