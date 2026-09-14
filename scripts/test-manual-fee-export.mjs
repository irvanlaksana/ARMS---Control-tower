#!/usr/bin/env node
/**
 * ============================================================================
 *  ARMS — Control Tower :: UJI BIAYA TAMBAHAN MANUAL (+) & EXPORT DATABASE
 * ============================================================================
 *  Menguji kode ASLI:
 *    • src/utils/tierFeeCalculator.ts        — normalizeManualFees,
 *        calculateManualFeeTotals, applyManualFeesToRepossessionTier,
 *        executeUnitRepossessionAndCloseCase (dengan manualSplits)
 *    • src/utils/spreadsheetExport.ts        — buildExportSheets,
 *        sheetsToSpreadsheetML, sheetsToCombinedCSV, exportDatabaseToSpreadsheet
 *    • src/components/common/ManualFeeEditor.tsx  — tombol "+ Tambah Biaya"
 *    • src/components/modules/UnitExecutionModal.tsx — Tier Engine + tombol "+"
 *
 *  Yang diverifikasi:
 *    1. Tombol "+" menambahkan biaya manual seperti modul Pembayaran (nama,
 *       nominal, alokasi COMPANY/SPLIT) dan totalnya dihitung benar.
 *    2. Biaya manual masuk ke BAST (AssetRecovery), Payment, Jurnal (Ledger),
 *       dan Audit Log eksekusi unit — kasus tetap CLOSED.
 *    3. Tanpa biaya manual, hasil eksekusi unit tidak berubah (regresi aman).
 *    4. Export seluruh data menghasilkan workbook spreadsheet multi-tab dengan
 *       skema identik spreadsheet aktif (header = union key, settings = key/value).
 *
 *  Jalankan: `npm run test:fees`
 * ============================================================================
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

/* ------------------------------------------------------- lingkungan tiruan */

const storageMap = new Map();
globalThis.localStorage = {
  get length() {
    return storageMap.size;
  },
  clear: () => storageMap.clear(),
  getItem: (k) => (storageMap.has(String(k)) ? storageMap.get(String(k)) : null),
  key: (i) => Array.from(storageMap.keys())[i] ?? null,
  removeItem: (k) => storageMap.delete(String(k)),
  setItem: (k, v) => storageMap.set(String(k), String(v)),
};
globalThis.window = globalThis.window || {
  location: { origin: 'https://arms.example', href: 'https://arms.example/' },
  localStorage: globalThis.localStorage,
  addEventListener: () => {},
  removeEventListener: () => {},
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
};

/* ======================================================================== *
 *  BUNDLE 1 — LOGIKA (tier fee + export spreadsheet)
 * ======================================================================== */

const CACHE_DIR = path.join(ROOT, 'node_modules/.cache/arms-fees-test');
fs.mkdirSync(CACHE_DIR, { recursive: true });

const logicEntry = path.join(CACHE_DIR, 'fees-entry.ts');
const logicBundle = path.join(CACHE_DIR, 'fees-bundle.mjs');

fs.writeFileSync(
  logicEntry,
  [
    `export * from '${ROOT}/src/utils/tierFeeCalculator';`,
    `export * from '${ROOT}/src/utils/spreadsheetExport';`,
    `export { getInitialStore, createAuditEntry } from '${ROOT}/src/services/armsDataService';`,
    `export { DEFAULT_DATABASE_TABS, getDatabaseConfigs, getActiveDatabaseConfigs } from '${ROOT}/src/data/databaseConfig';`,
    '',
  ].join('\n'),
  'utf8'
);

execSync(
  `npx esbuild "${logicEntry}" --bundle --format=esm --platform=node --packages=external --target=node20 --define:import.meta.env='{}' --outfile="${logicBundle}" --log-level=error`,
  { cwd: ROOT, stdio: 'inherit' }
);

const lib = await import(`${logicBundle}?v=${Date.now()}`);

const {
  normalizeManualFees,
  calculateManualFeeTotals,
  applyManualFeesToRepossessionTier,
  calculateRepossessionTierFee,
  executeUnitRepossessionAndCloseCase,
  cellToString,
  sanitizeSheetName,
  settingsToRows,
  buildExportSheets,
  sheetsToSpreadsheetML,
  sheetToCSV,
  sheetsToCombinedCSV,
  buildExportFileName,
  exportDatabaseToSpreadsheet,
  getInitialStore,
  DEFAULT_DATABASE_TABS,
} = lib;

const rupiah = (n) => Number(n || 0).toLocaleString('id-ID');

/* ======================================================================== *
 *  1. NORMALISASI & TOTAL BIAYA MANUAL
 * ======================================================================== */

group('Biaya tambahan manual — normalisasi & total');

const cleaned = normalizeManualFees([
  { name: '  Biaya Derek  ', amount: 750000, allocation: 'COMPANY' },
  { name: '', amount: 250000, allocation: 'split' },
  { name: 'Biaya Kosong', amount: 0 },
  { name: 'Biaya Negatif', amount: -100000 },
  null,
]);
check('item bernilai 0 / negatif / kosong dibuang', cleaned.length === 2, `dapat ${cleaned.length}`);
check('nama biaya di-trim', cleaned[0].name === 'Biaya Derek', cleaned[0].name);
check('nama kosong diberi label default', cleaned[1].name === 'Biaya Tambahan 2', cleaned[1].name);
check('alokasi tidak dikenal dinormalkan ke COMPANY/SPLIT', cleaned[0].allocation === 'COMPANY' && cleaned[1].allocation === 'SPLIT');
check('normalizeManualFees(undefined) aman', Array.isArray(normalizeManualFees(undefined)) && normalizeManualFees(undefined).length === 0);

const mitraTotals = calculateManualFeeTotals(
  [
    { name: 'Biaya Derek', amount: 1000000, allocation: 'COMPANY' },
    { name: 'Biaya Tarik', amount: 500000, allocation: 'SPLIT' },
  ],
  { isMitraDC: true, companySplitPercent: 20 }
);
check('total biaya manual (mitra) = 1.500.000', mitraTotals.total === 1500000, rupiah(mitraTotals.total));
check('bagian perusahaan = 1.000.000 + 20% × 500.000 = 1.100.000', mitraTotals.company === 1100000, rupiah(mitraTotals.company));
check('bagian mitra = 80% × 500.000 = 400.000', mitraTotals.partner === 400000, rupiah(mitraTotals.partner));
check('jumlah item tercatat', mitraTotals.itemCount === 2);

const internalTotals = calculateManualFeeTotals(
  [{ name: 'Biaya Parkir', amount: 300000, allocation: 'SPLIT' }],
  { isMitraDC: false, companySplitPercent: 20 }
);
check('karyawan internal → 100% perusahaan', internalTotals.company === 300000 && internalTotals.partner === 0);

const rounded = calculateManualFeeTotals(
  [{ name: 'Biaya A', amount: 100001, allocation: 'SPLIT' }],
  { isMitraDC: true, companySplitPercent: 33 }
);
check('pembulatan rupiah (tanpa desimal)', Number.isInteger(rounded.company) && Number.isInteger(rounded.partner));
check('perusahaan + mitra = total (split tunggal)', rounded.company + rounded.partner === rounded.total, `${rounded.company}+${rounded.partner} vs ${rounded.total}`);

/* ======================================================================== *
 *  2. GABUNG BIAYA MANUAL KE HASIL TIER ENGINE
 * ======================================================================== */

group('Tier Engine eksekusi unit + biaya manual');

const store = getInitialStore();
const targetCase = store.cases.find((c) => c.status !== 'CLOSED') || store.cases[0];
const mitraPersonnel = store.personnel.find((p) => p.personnelType === 'MITRA_DC') || store.personnel[0];
const internalPersonnel = store.personnel.find((p) => p.personnelType !== 'MITRA_DC') || store.personnel[0];
const targetClient = store.clients.find((cl) => cl.id === targetCase.clientId);
const targetFee = store.fees.find((f) => f.clientId === targetCase.clientId);

const baseCalc = calculateRepossessionTierFee(
  {
    targetCase,
    client: targetClient,
    feeConfig: targetFee,
    personnel: mitraPersonnel,
    vehicleType: 'PASSENGER_CAR',
    vehicleYear: 2021,
    hasStnk: true,
    hasKey: true,
    physicalCondition: 'GOOD',
    companySplitPercent: 20,
  },
  20
);
check('tier engine menghasilkan gross fee > 0', baseCalc.grossRepossessionFee > 0, rupiah(baseCalc.grossRepossessionFee));

const manualItems = [
  { name: 'Biaya Towing', amount: 1200000, allocation: 'COMPANY' },
  { name: 'Biaya Parkir Gudang', amount: 300000, allocation: 'SPLIT' },
];
const combined = applyManualFeesToRepossessionTier(baseCalc, manualItems, 20);
const manualTotals = calculateManualFeeTotals(manualItems, {
  isMitraDC: baseCalc.isMitraDC,
  companySplitPercent: 20,
});

check('nilai tier asli tetap tersimpan', combined.tierGrossRepossessionFee === baseCalc.grossRepossessionFee);
check('gross final = tier + biaya manual', combined.grossRepossessionFee === baseCalc.grossRepossessionFee + manualTotals.total, `${rupiah(combined.grossRepossessionFee)}`);
check('pendapatan perusahaan final = tier + bagian manual', combined.companyRevenueAmount === baseCalc.companyRevenueAmount + manualTotals.company);
check('komisi mitra final = tier + bagian manual', combined.partnerCommissionAmount === baseCalc.partnerCommissionAmount + manualTotals.partner);
check('rincian biaya manual tersimpan', combined.manualSplits.length === 2 && combined.manualFeesTotal === 1500000);
check('catatan penjelasan menyebut biaya manual', /Biaya Tambahan Manual \(2 item\)/.test(combined.explanationNotes));
check('tanpa biaya manual → hasil identik tier engine', applyManualFeesToRepossessionTier(baseCalc, [], 20).grossRepossessionFee === baseCalc.grossRepossessionFee);

/* ======================================================================== *
 *  3. EKSEKUSI UNIT (BAST) MENYIMPAN BIAYA MANUAL
 * ======================================================================== */

group('Eksekusi Unit & Penyerahan BAST — pencatatan biaya manual');

const execResult = executeUnitRepossessionAndCloseCase(store, targetCase, baseCalc, {
  bastNo: 'BAST-TEST-0001',
  warehouseLocation: 'Gudang ARMS Karawang',
  physicalCondition: 'GOOD',
  vehicleType: 'PASSENGER_CAR',
  vehicleYear: 2021,
  hasStnk: true,
  hasKey: true,
  manualSplits: manualItems,
  currentUser: { username: 'admin.arms', role: 'SUPER_ADMIN_OPS', name: 'Admin ARMS' },
});

const recovery = execResult.newRecovery;
check('BAST menyimpan gross fee termasuk biaya manual', recovery.repossessionFee === combined.grossRepossessionFee, `${rupiah(recovery.repossessionFee)} vs ${rupiah(combined.grossRepossessionFee)}`);
check('BAST menyimpan pendapatan perusahaan final', recovery.companyFeeAmount === combined.companyRevenueAmount);
check('BAST menyimpan komisi mitra final', recovery.partnerCommissionAmount === combined.partnerCommissionAmount);
check('BAST menyimpan rincian biaya manual', Array.isArray(recovery.manualSplits) && recovery.manualSplits.length === 2);
check('BAST menyimpan total biaya manual', recovery.manualFeesTotal === 1500000, rupiah(recovery.manualFeesTotal));
check('tier engine tetap tercatat pada BAST', recovery.tierAppliedName === baseCalc.appliedTierRuleName && recovery.tierBaseAmount === baseCalc.baseFeeAmount);

const payment = execResult.newPayment;
check('Payment revenue memakai gross final', payment.amount === combined.grossRepossessionFee);
check('Payment menyimpan biaya manual', Array.isArray(payment.manualSplits) && payment.manualSplits.length === 2);
check('Payment executionFee = pendapatan perusahaan final', payment.executionFeeAmount === combined.companyRevenueAmount);
check('allocationSummary menyebut biaya tambahan manual', /Biaya Tambahan Manual/.test(payment.allocationSummary));

const ledger = execResult.newLedgerEntry;
check('jurnal pendapatan = pendapatan perusahaan final', ledger.amount === combined.companyRevenueAmount, `${rupiah(ledger.amount)}`);
check('jurnal bertipe CREDIT akun REVENUE_FEE', ledger.type === 'CREDIT' && ledger.account === 'REVENUE_FEE');
check('jurnal mereferensi BAST', ledger.referenceId === recovery.id);

const closedCase = execResult.updatedStore.cases.find((c) => c.id === targetCase.id);
check('kasus otomatis CLOSED setelah eksekusi', closedCase.status === 'CLOSED');
check('BAST baru masuk daftar assetRecoveries', execResult.updatedStore.assetRecoveries[0].id === recovery.id);
check('audit log menyebut biaya tambahan manual', /Biaya Tambahan Manual/.test(execResult.updatedStore.auditLogs[0].details));

const plainResult = executeUnitRepossessionAndCloseCase(store, targetCase, baseCalc, {
  bastNo: 'BAST-TEST-0002',
  warehouseLocation: 'Gudang ARMS Karawang',
  physicalCondition: 'GOOD',
  currentUser: { username: 'admin.arms', role: 'SUPER_ADMIN_OPS', name: 'Admin ARMS' },
});
check('tanpa biaya manual → gross fee sama dengan tier engine', plainResult.newRecovery.repossessionFee === baseCalc.grossRepossessionFee);
check('tanpa biaya manual → manualSplits kosong', Array.isArray(plainResult.newRecovery.manualSplits) && plainResult.newRecovery.manualSplits.length === 0);
check('tanpa biaya manual → jurnal tidak berubah', plainResult.newLedgerEntry.amount === baseCalc.companyRevenueAmount);

const internalCalc = calculateRepossessionTierFee(
  {
    targetCase,
    client: targetClient,
    feeConfig: targetFee,
    personnel: internalPersonnel,
    vehicleType: 'MOTORCYCLE',
    vehicleYear: 2022,
    hasStnk: true,
    hasKey: true,
    physicalCondition: 'GOOD',
    companySplitPercent: 20,
  },
  20
);
const internalExec = executeUnitRepossessionAndCloseCase(store, targetCase, internalCalc, {
  bastNo: 'BAST-TEST-0003',
  warehouseLocation: 'Gudang ARMS Karawang',
  physicalCondition: 'GOOD',
  vehicleType: 'MOTORCYCLE',
  manualSplits: [{ name: 'Biaya Tarik', amount: 400000, allocation: 'SPLIT' }],
  currentUser: { username: 'admin.arms', role: 'SUPER_ADMIN_OPS', name: 'Admin ARMS' },
});
check('karyawan internal → biaya manual 100% perusahaan', internalExec.newRecovery.companyFeeAmount === internalCalc.companyRevenueAmount + 400000, rupiah(internalExec.newRecovery.companyFeeAmount));
check('karyawan internal → komisi mitra tetap 0', internalExec.newRecovery.partnerCommissionAmount === 0);

/* ======================================================================== *
 *  4. EXPORT SPREADSHEET DATABASE
 * ======================================================================== */

group('Export semua data — format spreadsheet database');

check('cellToString: boolean → true/false', cellToString(true) === 'true' && cellToString(false) === 'false');
check('cellToString: object → JSON', cellToString({ a: 1 }) === '{"a":1}');
check('cellToString: array → JSON', cellToString([1, 2]) === '[1,2]');
check('cellToString: null/undefined → kosong', cellToString(null) === '' && cellToString(undefined) === '');
check('cellToString: angka → string angka', cellToString(1500000) === '1500000');

check('sanitizeSheetName membuang karakter terlarang', sanitizeSheetName('A[B]:C*D?E/F\\G') === 'A_B_C_D_E_F_G', sanitizeSheetName('A[B]:C*D?E/F\\G'));
check('sanitizeSheetName memotong 31 karakter', sanitizeSheetName('X'.repeat(50)).length === 31);
check('sanitizeSheetName fallback', sanitizeSheetName('') === 'Sheet');

const settingsRows = settingsToRows({ googleSheetId: 'ABC123', databaseConfig: [{ collection: 'cases' }] });
check('settings diekspor sebagai key/value', settingsRows.headers.join(',') === 'key,value' && settingsRows.rows[0][0] === 'googleSheetId');
check('nilai object pada settings menjadi JSON', settingsRows.rows[1][1].startsWith('[{'));

const exportStore = getInitialStore();
exportStore.assetRecoveries = [
  {
    id: 'REC-1',
    recoveryNo: 'BAST-2026-0001',
    caseNo: 'CS-001',
    repossessionFee: 6500000,
    companyFeeAmount: 1300000,
    manualSplits: [{ name: 'Biaya Derek', amount: 500000, allocation: 'COMPANY' }],
    manualFeesTotal: 500000,
    status: 'STORED',
  },
  { id: 'REC-2', recoveryNo: 'BAST-2026-0002', caseNo: 'CS-002', repossessionFee: 3000000, status: 'STORED', extraField: 'baru' },
];

const sheets = buildExportSheets(exportStore, false);
check('seluruh 30 database ikut diekspor', sheets.length === DEFAULT_DATABASE_TABS.length, `${sheets.length} vs ${DEFAULT_DATABASE_TABS.length}`);
const tabNames = sheets.map((s) => s.tabName);
check('nama tab mengikuti konfigurasi spreadsheet', tabNames.includes('Asset_Recoveries') && tabNames.includes('Users') && tabNames.includes('Settings'));

const recoverySheet = sheets.find((s) => s.collection === 'assetRecoveries');
check('header = union seluruh key record (urutan kemunculan)', recoverySheet.headers[0] === 'id' && recoverySheet.headers.includes('manualSplits') && recoverySheet.headers.includes('extraField'));
check('jumlah baris = jumlah record', recoverySheet.rows.length === 2 && recoverySheet.recordCount === 2);
check('kolom kosong pada record lain diisi string kosong', recoverySheet.rows[0][recoverySheet.headers.indexOf('extraField')] === '');
check('array/object dalam sel menjadi JSON', recoverySheet.rows[0][recoverySheet.headers.indexOf('manualSplits')] === '[{"name":"Biaya Derek","amount":500000,"allocation":"COMPANY"}]');
check('label database disertakan untuk dokumentasi', recoverySheet.label === 'Recovery / Eksekusi Unit');

const emptySheet = sheets.find((s) => s.collection === 'payments');
check('tab yang masih kosong tetap menampilkan struktur kolom database', emptySheet.rows.length === 0 && emptySheet.headers.includes('paymentNo') && emptySheet.headers.includes('manualSplits'), `${emptySheet.headers.length} kolom`);
check('kolom skema dinormalkan ke camelCase (tanpa underscore)', emptySheet.headers.every((h) => !h.includes('_')));
check('tab berisi = kolom terpakai + kolom skema yang belum terisi', recoverySheet.headers.indexOf('id') === 0 && recoverySheet.headers.includes('partnerBankName') && recoverySheet.headers.includes('manualSplits') && recoverySheet.headers.includes('extraField'));
check('schemaHeadersFor mengembalikan kolom kanonik', lib.schemaHeadersFor('assetRecoveries').includes('repossessionFee') && lib.schemaHeadersFor('cases').includes('caseNo') && lib.schemaHeadersFor('cases').includes('debtorName'));
check('schemaHeadersFor aman untuk koleksi tak dikenal', lib.schemaHeadersFor('koleksiTidakAda').length === 0);

const settingsSheet = sheets.find((s) => s.collection === 'settings');
check('tab Settings memakai skema key/value', settingsSheet.headers.join(',') === 'key,value' && settingsSheet.recordCount > 0);

const disabledSettings = {
  ...exportStore.settings,
  databaseConfig: [{ collection: 'leads', label: 'Prospek / Lead', tabName: 'Leads', enabled: false }],
};
const activeSheets = buildExportSheets({ ...exportStore, settings: disabledSettings }, true);
check('hanya database aktif yang diekspor (enabled=false dilewati)', !activeSheets.some((s) => s.collection === 'leads'));
check('tab Settings selalu ikut diekspor', activeSheets.some((s) => s.collection === 'settings'));

const xml = sheetsToSpreadsheetML(sheets, { includeSummary: true });
check('XML SpreadsheetML memiliki deklarasi Excel', xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>') && xml.includes('<?mso-application progid="Excel.Sheet"?>'));
check('root Workbook memakai namespace spreadsheet', xml.includes('<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"'));
const worksheetCount = (xml.match(/<Worksheet /g) || []).length;
check('jumlah worksheet = tab database + ringkasan', worksheetCount === sheets.length + 1, `${worksheetCount}`);
check('worksheet seimbang (open/close)', (xml.match(/<\/Worksheet>/g) || []).length === worksheetCount);
check('ada tab ringkasan', xml.includes('ss:Name="_Ringkasan"'));
check('nama tab database muncul sebagai worksheet', xml.includes('ss:Name="Asset_Recoveries"') && xml.includes('ss:Name="Settings"'));
check('header diberi style dan tipe String', xml.includes('ss:StyleID="header"') && xml.includes('<Data ss:Type="String">recoveryNo</Data>'));
check('nilai numerik diekspor sebagai Number', xml.includes('<Data ss:Type="Number">6500000</Data>'));

const escapeSheets = [
  {
    tabName: 'Esc<ape>&Test',
    label: 'Uji escaping',
    collection: 'cases',
    headers: ['nama', 'catatan'],
    rows: [['PT A & B', 'tagihan <5 hari> & "segera"']],
    recordCount: 1,
  },
];
const escapeXml = sheetsToSpreadsheetML(escapeSheets, { includeSummary: false });
check('nama tab disanitasi untuk XML/Excel', escapeXml.includes('ss:Name="Esc_ape_Test"'), escapeXml.slice(escapeXml.indexOf('<Worksheet'), escapeXml.indexOf('<Worksheet') + 60));
check('karakter & < > " di-escape dalam sel', escapeXml.includes('PT A &amp; B') && escapeXml.includes('&lt;5 hari&gt;') && escapeXml.includes('&quot;segera&quot;'));

const csv = sheetToCSV(recoverySheet);
check('CSV baris pertama = header', csv.split('\r\n')[0].startsWith('id,recoveryNo,caseNo'));
check('CSV memuat nilai JSON dengan quoting', /"\[\{\"\"name\"\"/.test(csv) || csv.includes('\"[{') , csv.slice(0, 200));

const combinedCsv = sheetsToCombinedCSV(sheets);
check('CSV gabungan punya penanda tab', combinedCsv.includes('### TAB: Asset_Recoveries | Recovery / Eksekusi Unit | 2 record'));
check('CSV gabungan memuat seluruh tab', sheets.every((s) => combinedCsv.includes(`### TAB: ${s.tabName}`)));
check('CSV gabungan punya header jumlah record', /### Total record: \d+/.test(combinedCsv));

check('nama file export xls benar', /^ARMS_Database_Export_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.xls$/.test(buildExportFileName('xls', new Date(2026, 8, 14, 15, 4))));
check('nama file export csv benar', buildExportFileName('csv', new Date(2026, 8, 14, 15, 4)).endsWith('.csv'));

const summary = exportDatabaseToSpreadsheet(exportStore, { format: 'xls', onlyActive: false });
check('exportDatabaseToSpreadsheet mengembalikan ringkasan', summary.sheetCount === sheets.length && summary.totalRecords > 0 && summary.format === 'xls');
check('ringkasan export menyebut nama file', summary.fileName.endsWith('.xls'));
const csvSummary = exportDatabaseToSpreadsheet(exportStore, { format: 'csv' });
check('export CSV gabungan tersedia', csvSummary.format === 'csv' && csvSummary.fileName.endsWith('.csv'));

/* ======================================================================== *
 *  5. UI — TOMBOL "+ TAMBAH BIAYA" & EXPORT DI LAYAR
 * ======================================================================== */

group('UI — tombol "+" biaya manual (render SSR)');

const uiEntry = path.join(CACHE_DIR, 'fees-ui-entry.tsx');
const uiBundle = path.join(CACHE_DIR, 'fees-ui-bundle.mjs');

fs.writeFileSync(
  uiEntry,
  `import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ManualFeeEditor } from '${ROOT}/src/components/common/ManualFeeEditor';
import { UnitExecutionModal } from '${ROOT}/src/components/modules/UnitExecutionModal';
import { getInitialStore } from '${ROOT}/src/services/armsDataService';
import { calculateManualFeeTotals } from '${ROOT}/src/utils/tierFeeCalculator';

export function renderEditor(items, accent) {
  const totals = calculateManualFeeTotals(items, { isMitraDC: true, companySplitPercent: 20 });
  return renderToStaticMarkup(
    React.createElement(ManualFeeEditor, { items, onChange: () => {}, totals, accent })
  );
}

export function renderExecutionModal() {
  const store = getInitialStore();
  const currentUser = { username: 'admin.arms', role: 'SUPER_ADMIN_OPS', name: 'Admin ARMS' };
  return renderToStaticMarkup(
    React.createElement(UnitExecutionModal, {
      store,
      currentUser,
      onClose: () => {},
      onUpdateStore: () => {},
    })
  );
}
`,
  'utf8'
);

execSync(
  `npx esbuild "${uiEntry}" --bundle --format=esm --platform=node --packages=external --jsx=automatic --target=node20 --define:import.meta.env='{}' --outfile="${uiBundle}" --log-level=error`,
  { cwd: ROOT, stdio: 'inherit' }
);

const ui = await import(`${uiBundle}?v=${Date.now()}`);

const emptyEditor = ui.renderEditor([], 'emerald');
check('editor biaya manual menampilkan judul', emptyEditor.includes('Biaya Tambahan Manual'));
check('ada tombol "+ Tambah Biaya"', /<button[^>]*>.*Tambah Biaya/s.test(emptyEditor) && emptyEditor.includes('Tambah Biaya'));
check('petunjuk saat belum ada biaya', emptyEditor.includes('Belum ada biaya tambahan'));

const filledEditor = ui.renderEditor(
  [
    { name: 'Biaya Derek', amount: 1200000, allocation: 'COMPANY' },
    { name: 'Biaya Parkir', amount: 300000, allocation: 'SPLIT' },
  ],
  'rose'
);
check('nama biaya muncul sebagai nilai input', filledEditor.includes('value="Biaya Derek"') && filledEditor.includes('value="Biaya Parkir"'));
check('pilihan alokasi tersedia', filledEditor.includes('100% Hak Perusahaan') && filledEditor.includes('Split dengan Mitra'));
check('alokasi SPLIT terpilih pada baris kedua', /value="SPLIT" selected=""|selected="" value="SPLIT"/.test(filledEditor));
check('tombol hapus per baris tersedia', (filledEditor.match(/Hapus biaya/g) || []).length === 2);
check('ringkasan tambahan/perusahaan/mitra ditampilkan', filledEditor.includes('Tambahan:') && filledEditor.includes('Perusahaan:') && filledEditor.includes('Mitra:'));
check('nominal biaya manual terisi pada input', filledEditor.includes('value="1200000"') && filledEditor.includes('value="300000"'));
check('ringkasan biaya manual dirupiahkan (total/perusahaan/mitra)', filledEditor.includes('1.500.000') && filledEditor.includes('1.260.000') && filledEditor.includes('240.000'));

const modal = ui.renderExecutionModal();
check('modal Eksekusi Unit & Penyerahan BAST terender', modal.includes('Eksekusi Unit &amp; Penyerahan BAST') || modal.includes('Eksekusi Unit'));
check('bagian Tier Engine terender', modal.includes('Rincian Perhitungan Fee &amp; Pendapatan Otomatis (Tier Engine)') || modal.includes('Tier Engine'));
check('tombol "+ Tambah Biaya" ada di modal eksekusi unit', modal.includes('Tambah Biaya'));
check('blok biaya manual berada di dalam kartu Tier Engine', modal.indexOf('Tier Engine') < modal.indexOf('Biaya Tambahan Manual'));
check('kartu gross fee / pendapatan perusahaan / komisi mitra tetap ada', modal.includes('Total Tarif / Gross Fee Klien') && modal.includes('Pendapatan Perusahaan') && modal.includes('Hak Komisi Mitra DC'));

/* ------------------------------- wiring antar modul (source assertions) */

group('Wiring modul — tombol "+" & export terpasang');

const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const collectionSrc = readSrc('src/components/modules/CollectionModule.tsx');
check('CollectionModule memakai ManualFeeEditor', collectionSrc.includes("import { ManualFeeEditor } from '../common/ManualFeeEditor'") && collectionSrc.includes('<ManualFeeEditor'));
check('CollectionModule mengirim manualSplits ke eksekusi unit', collectionSrc.includes('manualSplits: repossessionManualSplits'));
check('CollectionModule menghitung total biaya manual', collectionSrc.includes('calculateManualFeeTotals(repossessionManualSplits'));
check('CollectionModule membersihkan biaya manual setelah submit', collectionSrc.includes('setRepossessionManualSplits([])'));
check('panel eksekusi Collection tidak lagi memakai field yang tidak ada', !collectionSrc.includes('unitTierCalculation.totalGrossFee') && !collectionSrc.includes('unitTierCalculation.breakdownReason'));

const assetSrc = readSrc('src/components/modules/AssetRecoveryModule.tsx');
check('Asset Repossession module membuka UnitExecutionModal (sudah ada "+")', assetSrc.includes('<UnitExecutionModal'));
check('daftar BAST menampilkan biaya tambahan manual', assetSrc.includes('manualSplits?.length') && assetSrc.includes('biaya manual'));

const transferSrc = readSrc('src/components/modules/TransferPartnerCommissionModal.tsx');
check('Transfer komisi mitra menampilkan rincian biaya manual', transferSrc.includes('manualFeeItems') && transferSrc.includes('Biaya Tambahan Manual'));

const paymentsSrc = readSrc('src/components/modules/PaymentsModule.tsx');
check('modul Pembayaran (referensi) tetap utuh', paymentsSrc.includes('Tambah Biaya') && paymentsSrc.includes('manualSplits'));

const settingsDbSrc = readSrc('src/components/modules/SettingsDatabaseTab.tsx');
check('Pengaturan Database punya tombol export spreadsheet', settingsDbSrc.includes('exportDatabaseToSpreadsheet') && settingsDbSrc.includes('Export Workbook Excel (.xls, semua tab)'));
check('Pengaturan Database punya export CSV gabungan', settingsDbSrc.includes("handleExportDatabase('csv')"));
check('export dicatat ke audit log', settingsDbSrc.includes("'EXPORT'") && settingsDbSrc.includes('DATABASE_EXPORT'));

const reportsSrc = readSrc('src/components/modules/ReportsModule.tsx');
check('Laporan punya export semua data (spreadsheet database)', reportsSrc.includes('Export Semua Data (Format Spreadsheet Database)') && reportsSrc.includes('handleExportFullDatabase'));

const typeSrc = readSrc('src/types/arms.ts');
check('tipe AssetRecovery punya manualSplits & manualFeesTotal', /manualSplits\?:/.test(typeSrc) && /manualFeesTotal\?:/.test(typeSrc));

/* ======================================================================== *
 *  RINGKASAN
 * ======================================================================== */

process.stdout.write('\n' + '='.repeat(74) + '\n');
process.stdout.write(`  HASIL: ${passed} lulus, ${failed} gagal (total ${passed + failed} asersi)\n`);
if (failures.length > 0) {
  process.stdout.write('  Gagal:\n');
  failures.forEach((f) => process.stdout.write(`   - ${f}\n`));
}
process.stdout.write('='.repeat(74) + '\n');

process.exit(failed > 0 ? 1 : 0);
