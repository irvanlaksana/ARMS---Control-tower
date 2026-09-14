#!/usr/bin/env node
/**
 * ============================================================================
 *  ARMS — Control Tower :: UJI BACKEND GOOGLE APPS SCRIPT (tanpa deploy)
 * ============================================================================
 *  Menjalankan seluruh berkas `appsscript/*.gs` di dalam VM Node dengan mock
 *  SpreadsheetApp / DriveApp / PropertiesService / Session / Utilities /
 *  UrlFetchApp, lalu memverifikasi bahwa perilakunya setara dengan backend
 *  lama (`server.ts`) dan kontrak yang dipakai frontend:
 *
 *    • semua path /api/* yang dipetakan src/lib/gasBridge.ts punya handler
 *    • setup/sync/fetch tab spreadsheet (termasuk nilai panjang -> Blob_Store)
 *    • simpan/muat pengaturan (Branding Profile + konfigurasi GDrive) dengan
 *      pemecahan nilai panjang (`key__chunkN`) — paritas dengan settingsCodec.ts
 *    • Drive: create-folder, ensure-path, upload (DriveApp)
 *    • Surat: open-generator menghasilkan payload base64 yang sama dengan server
 *    • doGet/doPost merutekan action dengan benar
 *
 *  Jalankan: `npm run gas:test`
 * ============================================================================
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, GAS_DIR } from './lib/gasMockRuntime.mjs';

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

import { loadGasProject, MockFolder, mockState } from './lib/gasMockRuntime.mjs';

const gas = loadGasProject();
const sandbox = gas.sandbox;
const call = gas.call;

/* ======================================================================== *
 *  TEST 1 — Routing & paritas peta endpoint dengan frontend
 * ======================================================================== */

group('Routing action ↔ endpoint /api/* (paritas dengan src/lib/gasBridge.ts)');

const bridgeSource = fs.readFileSync(path.join(ROOT, 'src/lib/gasBridge.ts'), 'utf8');
const clientMap = {};
const mapBlock = bridgeSource.match(/export const GAS_ACTION_MAP[^=]*=\s*\{([\s\S]*?)\};/);
if (mapBlock) {
  for (const m of mapBlock[1].matchAll(/'([^']+)':\s*'([^']+)'/g)) clientMap[m[1]] = m[2];
}
check('Peta endpoint frontend terbaca', Object.keys(clientMap).length >= 12, `${Object.keys(clientMap).length} entri`);

const gasPathMap = sandbox.PATH_ACTION_MAP_ || {};
Object.entries(clientMap).forEach(([apiPath, action]) => {
  check(`${apiPath} → ${action} (dipetakan di Apps Script)`, gasPathMap[apiPath] === action, `Apps Script: ${gasPathMap[apiPath] || '(tidak ada)'}`);
});

Object.keys(clientMap).forEach((apiPath) => {
  const action = clientMap[apiPath];
  if (action === 'HEALTH') return;
  const res = call(action, {});
  check(`handler ${action} tersedia`, !String(res?.error || '').includes('Action tidak dikenal'), res?.error || '');
});

check('action tidak dikenal ditolak dengan pesan jelas', /Action tidak dikenal/.test(String(call('NGAWUR', {}).error || '')));

/* ======================================================================== *
 *  TEST 2 — Runtime info & health (spreadsheet aktif)
 * ======================================================================== */

group('Spreadsheet aktif (health & runtime info)');

const health = call('HEALTH', {});
check('HEALTH sukses', health.status === 'ok' && health.success === true, JSON.stringify(health).slice(0, 160));
check('HEALTH melaporkan provider Apps Script', health.provider === 'google-apps-script');
check('Spreadsheet dibuat otomatis bila belum ada', Boolean(health.spreadsheetId), health.spreadsheetId);
check('Spreadsheet tercatat di Script Properties', Boolean(mockState.properties.get('ARMS_SPREADSHEET_ID')));

const runtime = call('RUNTIME_INFO', {});
check('RUNTIME_INFO sukses', runtime.success === true);
check('RUNTIME_INFO memuat tab Settings', runtime.settingsTab === 'Settings');
check('RUNTIME_INFO memuat 30 collection + Blob', Object.keys(runtime.tabs || {}).length >= 30, `${Object.keys(runtime.tabs || {}).length} tab`);
check('RUNTIME_INFO memuat akun deploy', runtime.effectiveUser === 'deployer@arms.test');

/* ======================================================================== *
 *  TEST 3 — Setup / sync / fetch tab database
 * ======================================================================== */

group('Setup, sync & fetch tab database');

const setup = call('SHEETS_SETUP', { spreadsheetId: runtime.spreadsheetId, tabs: { cases: 'Kasus_2026', customers: 'Debitur_2026' } });
check('SHEETS_SETUP sukses', setup.success === true);
check('Tab kustom dipakai (Kasus_2026)', setup.sheets.includes('Kasus_2026'));
check('Tab Blob_Store ikut dibuat', setup.sheets.includes('Blob_Store'));

const activeSs = mockState.spreadsheets.get(runtime.spreadsheetId);
check('Semua tab benar-benar ada di spreadsheet', activeSs.getSheetByName('Kasus_2026') !== null && activeSs.getSheetByName('Settings') !== null);

const longPhoto = 'data:image/jpeg;base64,' + 'A'.repeat(CELL_LIMIT_FOR_TEST());
function CELL_LIMIT_FOR_TEST() {
  return 60000; // > batas 40.000 -> harus masuk Blob_Store
}

const syncPayload = {
  spreadsheetId: runtime.spreadsheetId,
  tabs: { cases: 'Kasus_2026', customers: 'Debitur_2026' },
  data: {
    cases: [
      { id: 'CASE-001', debtorName: 'Budi Santoso', amount: 15000000, isPaid: false, meta: { stage: 2, tags: ['a', 'b'] } },
      { id: 'CASE-002', debtorName: "Siti 'Aisyah", amount: 2750000, isPaid: true, notes: 'perlu "konfirmasi"' },
    ],
    customers: [{ id: 'CUST-001', name: 'Andi', ktpPhoto: longPhoto }],
    personnel: [],
  },
};
const sync = call('SHEETS_SYNC', syncPayload);
check('SHEETS_SYNC sukses', sync.success === true, sync.error);
check('Jumlah baris kasus tercatat', sync.counts?.cases === 2, JSON.stringify(sync.counts));
check('Tab kosong dibersihkan (personnel)', sync.counts?.personnel === 0);
check('Nilai panjang dipindah ke Blob_Store', activeSs.getSheetByName('Blob_Store').getLastRow() > 1, `rows=${activeSs.getSheetByName('Blob_Store').getLastRow()}`);

const fetchRes = call('SHEETS_FETCH', { spreadsheetId: runtime.spreadsheetId, tabs: syncPayload.tabs });
check('SHEETS_FETCH sukses', fetchRes.success === true);
const caseRows = fetchRes.data?.cases || [];
check('2 baris kasus terbaca kembali', caseRows.length === 2, `${caseRows.length}`);
check('Tipe boolean dipulihkan', caseRows[0]?.isPaid === false && caseRows[1]?.isPaid === true, JSON.stringify(caseRows.map((r) => r.isPaid)));
check('Tipe object/JSON dipulihkan', Array.isArray(caseRows[0]?.meta?.tags) && caseRows[0].meta.tags.length === 2);
check("Teks dengan kutip & apostrof utuh", caseRows[1]?.debtorName === "Siti 'Aisyah" && caseRows[1]?.notes === 'perlu "konfirmasi"');
check('Foto base64 panjang utuh dari Blob_Store', fetchRes.data?.customers?.[0]?.ktpPhoto === longPhoto, `${String(fetchRes.data?.customers?.[0]?.ktpPhoto || '').length} chars`);
check('Tab kosong tidak menimpa data lokal', !('personnel' in (fetchRes.data || {})));

/* ======================================================================== *
 *  TEST 4 — Pengaturan (Branding Profile + konfigurasi GDrive) di spreadsheet
 * ======================================================================== */

group('Penyimpanan pengaturan ke tab Settings spreadsheet aktif');

const settingsPayload = {
  googleSheetId: runtime.spreadsheetId,
  appsScriptWebAppUrl: 'https://script.google.com/macros/s/AKfycbTEST/exec',
  googleDriveFolderId: '11OxYLvKiH8P4AIP_NM08KuYu0plAq16_',
  googleDriveFolderUrl: 'https://drive.google.com/drive/folders/11OxYLvKiH8P4AIP_NM08KuYu0plAq16_?usp=sharing',
  companyName: 'PT MJ Agency Recovery Indonesia',
  companyPhone: '021-555-8989',
  companyEmail: 'admin@arms-controltower.co.id',
  companyAddress: 'Gedung Control Tower Ops Lt. 12, Jakarta',
  companyLogo: 'data:image/png;base64,' + 'B'.repeat(90000),
  defaultFeePercent: 15,
  defaultCompanyCommissionSplitPercent: 20,
  autoSyncWithGoogleSheets: true,
  databaseConfig: [
    { collection: 'cases', label: 'Kasus & Piutang', tabName: 'Kasus_2026', enabled: true, totalRecords: 2 },
    { collection: 'settings', label: 'Pengaturan Sistem', tabName: 'Settings', enabled: true },
  ],
};

const saveRes = call('SETTINGS_SAVE', { spreadsheetId: runtime.spreadsheetId, settings: settingsPayload });
check('SETTINGS_SAVE sukses', saveRes.success === true, saveRes.error);
check('Semua key settings tertulis', saveRes.totalKeys >= Object.keys(settingsPayload).length, `${saveRes.totalKeys}`);

const settingsSheet = activeSs.getSheetByName('Settings');
const rawKeys = settingsSheet.data.slice(1).map((row) => row[0]).filter(Boolean);
check('Logo panjang dipecah jadi chunk', rawKeys.some((key) => String(key).startsWith('companyLogo__chunk')), rawKeys.filter((k) => String(k).startsWith('companyLogo')).join(','));
check('Tidak ada sel melebihi 50.000 karakter', settingsSheet.data.every((row) => row.every((cell) => String(cell ?? '').length <= 50000)));

const loadRes = call('SETTINGS_LOAD', { spreadsheetId: runtime.spreadsheetId });
check('SETTINGS_LOAD sukses', loadRes.success === true);
const loaded = loadRes.settings || {};
check('companyName terbaca', loaded.companyName === settingsPayload.companyName);
check('companyPhone tetap string', loaded.companyPhone === '021-555-8989' && typeof loaded.companyPhone === 'string');
check('defaultFeePercent jadi angka', loaded.defaultFeePercent === 15 && typeof loaded.defaultFeePercent === 'number');
check('autoSyncWithGoogleSheets jadi boolean', loaded.autoSyncWithGoogleSheets === true);
check('databaseConfig jadi array object', Array.isArray(loaded.databaseConfig) && loaded.databaseConfig[0].tabName === 'Kasus_2026');
check('Konfigurasi GDrive ikut tersimpan', loaded.googleDriveFolderId === settingsPayload.googleDriveFolderId && loaded.googleDriveFolderUrl === settingsPayload.googleDriveFolderUrl);
check('Logo base64 panjang utuh setelah chunk digabung', loaded.companyLogo === settingsPayload.companyLogo, `${String(loaded.companyLogo || '').length} chars`);

// Paritas dengan codec sisi frontend (src/lib/settingsCodec.ts)
const codecPath = path.join(ROOT, 'node_modules/.cache/arms-gas-test/settingsCodec.mjs');
fs.mkdirSync(path.dirname(codecPath), { recursive: true });
execSync(
  `npx esbuild src/lib/settingsCodec.ts --bundle --format=esm --platform=node --outfile="${codecPath}" --log-level=error`,
  { cwd: ROOT, stdio: 'inherit' }
);
const codec = await import(codecPath);
const clientRows = codec.settingsToSheetRows(settingsPayload);
const clientRoundTrip = codec.parseSettingsFromSheet(
  settingsSheet.data.slice(1).filter((row) => row[0]).map((row) => ({ key: row[0], value: row[1] }))
);
check('Codec frontend membaca tab Settings Apps Script dengan benar', clientRoundTrip.companyName === settingsPayload.companyName && clientRoundTrip.defaultFeePercent === 15);
check('Codec frontend menggabung chunk logo', clientRoundTrip.companyLogo === settingsPayload.companyLogo);
check('Codec frontend memulihkan databaseConfig', Array.isArray(clientRoundTrip.databaseConfig) && clientRoundTrip.databaseConfig.length === 2);
check(
  'Format baris codec frontend = format Apps Script',
  clientRows.length === settingsSheet.data.slice(1).filter((row) => row[0]).length,
  `frontend=${clientRows.length} gas=${settingsSheet.data.slice(1).filter((row) => row[0]).length}`
);
check('serializeSettingsForSheet memecah nilai panjang', Object.keys(codec.serializeSettingsForSheet(settingsPayload)).some((key) => key.startsWith('companyLogo__chunk')));

/* ======================================================================== *
 *  TEST 5 — Google Drive (fitur dipertahankan, cara simpan berubah)
 * ======================================================================== */

group('Google Drive storage via DriveApp');

const status = call('DRIVE_STATUS', {});
check('DRIVE_STATUS configured=true tanpa Service Account', status.configured === true && status.provider === 'google-apps-script');
check('DRIVE_STATUS melaporkan akun deploy', status.driveUser === 'deployer@arms.test' && status.serviceAccountEmail === 'deployer@arms.test');
check('DRIVE_STATUS membaca folder root dari spreadsheet aktif', status.rootFolderId === settingsPayload.googleDriveFolderId, status.rootFolderId);
check('Struktur sub-folder standar tetap ada', Array.isArray(status.subFolders) && status.subFolders.length === 3);

const rootFolder = new MockFolder(settingsPayload.googleDriveFolderId, 'PT_MJ_INDONESIA', null);
mockState.folders.set(rootFolder.id, rootFolder);

const ensure = call('DRIVE_ENSURE_PATH', {
  path: ['PT_MJ_INDONESIA', 'DATABASE_KARYAWAN', 'BUDI_SANTOSO', '01_KTP'],
  rootId: rootFolder.id,
});
check('DRIVE_ENSURE_PATH sukses', ensure.success === true, ensure.error);
check('4 tingkat folder dibuat', ensure.created.length === 4, `${ensure.created.length}`);
check('folderId & webViewLink dikembalikan', /^[A-Za-z0-9_-]+$/.test(ensure.folderId) && ensure.webViewLink.includes(ensure.folderId));

const ensureAgain = call('DRIVE_ENSURE_PATH', { path: ['PT_MJ_INDONESIA', 'DATABASE_KARYAWAN', 'BUDI_SANTOSO', '01_KTP'], rootId: rootFolder.id });
check('Ensure-path idempoten (tidak membuat duplikat)', ensureAgain.folderId === ensure.folderId && ensureAgain.created.length === 0, `${ensureAgain.created.length} dibuat ulang`);

const created = call('DRIVE_CREATE_FOLDER', { name: 'FOLDER_SKP', parentId: rootFolder.id });
check('DRIVE_CREATE_FOLDER sukses', created.success === true && created.folderId);
check('Link folder memakai format drive.google.com', created.webViewLink.startsWith('https://drive.google.com/drive/folders/'));

const photoBytes = Buffer.from('ini-isi-foto-ktp-arms');
const upload = call('DRIVE_UPLOAD', {
  fileName: 'KTP_BUDI_SANTOSO_12345678.jpg',
  mimeType: 'image/jpeg',
  base64: `data:image/jpeg;base64,${photoBytes.toString('base64')}`,
  folderId: ensure.folderId,
});
check('DRIVE_UPLOAD sukses', upload.success === true, upload.error);
check('Isi berkas identik setelah decode base64', Buffer.from(upload.fileId ? mockState.files.get(upload.fileId).bytes : []).toString() === photoBytes.toString());
check('Berkas masuk ke folder 01_KTP', mockState.folders.get(ensure.folderId).files.some((f) => f.id === upload.fileId));
check('directViewUrl & thumbnailUrl dikembalikan', Boolean(upload.directViewUrl) && Boolean(upload.thumbnailUrl));
check('Berbagi link publik diset', mockState.files.get(upload.fileId).sharing !== null);

const uploadNoFolder = call('DRIVE_UPLOAD', { fileName: 'x.jpg', base64: '' });
check('Upload tanpa base64 ditolak', uploadNoFolder.success === false && /Missing fileName or base64/.test(uploadNoFolder.error));

const ensureBadRoot = call('DRIVE_ENSURE_PATH', { path: ['A'], rootId: 'FOLDER-TIDAK-ADA' });
check('Root folder tak dikenal → pesan mudah dipahami', ensureBadRoot.success === false && /tidak ditemukan|dibagikan/i.test(ensureBadRoot.error), ensureBadRoot.error);

/* ======================================================================== *
 *  TEST 6 — Surat tugas & generator (paritas dengan server.ts)
 * ======================================================================== */

group('Integrasi surat tugas / generator');

const debtor = { debtorName: 'Budi Santoso', caseNo: 'CASE-001' };
const personnel = { fullName: 'Andi Pratama', nik: '3201010101010001' };

const generator = call('SURAT_OPEN_GENERATOR', { skNumber: 'SK/001', skId: 'SK-001', debtor, personnel, driveDocumentUrl: 'https://drive.google.com/x' });
check('SURAT_OPEN_GENERATOR sukses', generator.success === true && Boolean(generator.url));
const gasUrl = new URL(generator.url);
check('URL generator = generator-surat-beige.vercel.app', gasUrl.host === 'generator-surat-beige.vercel.app');
check('URL membawa docType & ukuran kertas', gasUrl.searchParams.get('docType') === 'surat_tugas' && gasUrl.searchParams.get('paper') === 'f4');

const gasEncoded = gasUrl.searchParams.get('payload') || String(gasUrl.hash || '').replace('#payload=', '');
const gasDecoded = JSON.parse(
  Buffer.from(String(gasEncoded).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
);
check(
  'Payload base64url berisi LetterData + BastData (paritas api/lib/generatorLink.ts)',
  Boolean(gasDecoded.letter) && Boolean(gasDecoded.bast) && gasDecoded.source === 'ARMS-CONTROL-TOWER'
);
check(
  'Payload memetakan debitur & petugas dari request',
  gasDecoded.letter.customerName === 'Budi Santoso' && gasDecoded.letter.assigneeName === 'Andi Pratama'
);
check(
  'Payload memuat nomor SK & tautan Drive',
  gasDecoded.letter.letterNumber === 'SK/001' && gasDecoded.meta.driveDocumentUrl === 'https://drive.google.com/x'
);
check('Payload BAST ikut terisi (tab BAST siap pakai)', gasDecoded.bast.debiturNama === 'Budi Santoso' && gasDecoded.bast.petugasNama === 'Andi Pratama');

const noToken = call('SURAT_CREATE_ISSUE', { debtor, personnel });
check('Create-issue tanpa token → pesan instruktif', noToken.success === false && /GITHUB_TOKEN/.test(noToken.error));

mockState.properties.set('GITHUB_TOKEN', 'ghp_test');
const issue = call('SURAT_CREATE_ISSUE', { skNumber: 'SK/001', debtor, personnel });
check('Create-issue dengan token sukses', issue.success === true && issue.issueNumber === 1);
check('Create-issue memanggil api.github.com', mockState.urlFetchLog.some((entry) => String(entry.url).includes('api.github.com')));
check('Isu memuat data debitur & personel', JSON.stringify(mockState.urlFetchLog.find((e) => String(e.url).includes('github.com'))?.options?.payload || '').includes('Budi Santoso'));
check(
  'Isu dibuat di repo generator-surat-',
  mockState.urlFetchLog.some((e) => String(e.url).includes('api.github.com/repos/irvanlaksana/generator-surat-/issues'))
);
check(
  'Isu memuat payload generator (LetterData + BastData)',
  JSON.stringify(mockState.urlFetchLog.find((e) => String(e.url).includes('github.com'))?.options?.payload || '').includes('letterNumber')
);

/* ======================================================================== *
 *  TEST 7 — GAS proxy & GET_ALL_DATA (kompatibilitas frontend lama)
 * ======================================================================== */

group('Kompatibilitas GAS proxy / GET_ALL_DATA');

const all = call('GET_ALL_DATA', { spreadsheetId: runtime.spreadsheetId, tabs: syncPayload.tabs });
check('GET_ALL_DATA sukses', all.success === true);
check('Data dikembalikan dengan key = nama tab', Array.isArray(all.data?.['Kasus_2026']) && all.data['Kasus_2026'].length === 2);
check('Baris Settings ikut dikembalikan', Array.isArray(all.data?.Settings) && all.data.Settings.length > 0);

const proxied = call('GAS_PROXY', { webAppUrl: 'https://script.google.com/macros/s/OTHER/exec', action: 'GET_ALL_DATA' });
check('GAS_PROXY meneruskan ke Apps Script lain', proxied.success === true && mockState.urlFetchLog.some((e) => String(e.url).includes('OTHER')));

/* ======================================================================== *
 *  TEST 8 — doGet / doPost (jalur HTTP)
 * ======================================================================== */

group('Entry point web app (doGet / doPost)');

const getJson = sandbox.doGet({ parameter: { action: 'HEALTH' } });
check('doGet ?action=HEALTH → JSON', JSON.parse(getJson.getContent()).status === 'ok');
check('doGet memakai MIME JSON', getJson._mime === 'application/json');

const getHtml = sandbox.doGet({ parameter: {} });
check('doGet tanpa action → HTML aplikasi', String(getHtml.getContent()).includes('html'));

const postJson = sandbox.doPost({
  postData: {
    contents: JSON.stringify({ action: 'SHEETS_FETCH', payload: { spreadsheetId: runtime.spreadsheetId, tabs: syncPayload.tabs } }),
  },
});
const postResult = JSON.parse(postJson.getContent());
check('doPost {action,payload} → data', postResult.success === true && Array.isArray(postResult.data?.cases));

const postFlat = sandbox.doPost({
  postData: { contents: JSON.stringify({ action: 'DRIVE_CREATE_FOLDER', name: 'FLAT_FOLDER', parentId: rootFolder.id }) },
});
check('doPost body datar (tanpa payload) didukung', JSON.parse(postFlat.getContent()).success === true);

const postLegacy = sandbox.doPost({ postData: { contents: JSON.stringify({ action: 'GET_ALL_DATA' }) } });
check('doPost legacy GET_ALL_DATA didukung', JSON.parse(postLegacy.getContent()).success === true);

const postBad = sandbox.doPost({ postData: { contents: '{bukan json' } });
check('Body JSON rusak → pesan error jelas', JSON.parse(postBad.getContent()).success === false);

const postViaPath = sandbox.doPost({ postData: { contents: JSON.stringify({ path: '/api/drive/status' }) } });
check('Rute via path /api/* dikenali', JSON.parse(postViaPath.getContent()).configured === true);

/* ======================================================================== *
 *  RINGKASAN
 * ======================================================================== */

process.stdout.write(`\n${'='.repeat(72)}\n`);
process.stdout.write(`HASIL: ${passed} lulus, ${failed} gagal\n`);
if (failed) {
  process.stdout.write('\nGagal:\n' + failures.map((f) => `  - ${f}`).join('\n') + '\n');
  process.exit(1);
}
process.stdout.write('Backend Apps Script siap di-deploy (npm run gas:build && npm run gas:push).\n');
