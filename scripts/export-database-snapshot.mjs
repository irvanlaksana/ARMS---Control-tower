#!/usr/bin/env node
/**
 * ============================================================================
 *  ARMS — Control Tower :: EXPORT SNAPSHOT DATABASE (CLI)
 * ============================================================================
 *  Mengunduh/menulis SELURUH data ARMS ke berkas spreadsheet database dengan
 *  skema yang sama persis seperti spreadsheet aktif di Google Apps Script
 *  (satu tab per database, baris pertama = header kolom, record = baris).
 *
 *  Sumber data:
 *    • default          → dataset bawaan aplikasi (`src/data/initialData.ts`)
 *    • --from <file>    → snapshot JSON ARMSStore (mis. hasil dump browser)
 *
 *  Output (folder `exports/`):
 *    • ARMS_Database_Export_<waktu>.xls  — workbook SpreadsheetML multi-tab
 *    • ARMS_Database_Export_<waktu>.csv  — CSV gabungan seluruh tab
 *
 *  Jalankan: `npm run export:database`
 *            `node scripts/export-database-snapshot.mjs --from snapshot.json --out exports`
 * ============================================================================
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------------------- argumen CLI */

const args = process.argv.slice(2);
function argValue(flag, fallback) {
  const idx = args.indexOf(flag);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
}
const fromFile = argValue('--from', null);
const outDir = path.resolve(ROOT, argValue('--out', 'exports'));
const onlyActive = !args.includes('--all-tabs');

/* ------------------------------------------- bundle kode asli untuk Node */

const CACHE_DIR = path.join(ROOT, 'node_modules/.cache/arms-export-cli');
fs.mkdirSync(CACHE_DIR, { recursive: true });
const entryPath = path.join(CACHE_DIR, 'export-entry.ts');
const bundlePath = path.join(CACHE_DIR, 'export-bundle.mjs');

fs.writeFileSync(
  entryPath,
  [
    `export * from '${ROOT}/src/utils/spreadsheetExport';`,
    `export { getInitialStore } from '${ROOT}/src/services/armsDataService';`,
    '',
  ].join('\n'),
  'utf8'
);

execSync(
  `npx esbuild "${entryPath}" --bundle --format=esm --platform=node --packages=external --target=node20 --define:import.meta.env='{}' --outfile="${bundlePath}" --log-level=error`,
  { cwd: ROOT, stdio: 'inherit' }
);

/* localStorage tiruan agar kode store tidak bergantung browser */
const memory = new Map();
globalThis.localStorage = {
  get length() {
    return memory.size;
  },
  clear: () => memory.clear(),
  getItem: (k) => (memory.has(String(k)) ? memory.get(String(k)) : null),
  key: (i) => Array.from(memory.keys())[i] ?? null,
  removeItem: (k) => memory.delete(String(k)),
  setItem: (k, v) => memory.set(String(k), String(v)),
};

const lib = await import(`${bundlePath}?v=${Date.now()}`);
const { getInitialStore, buildExportSheets, sheetsToSpreadsheetML, sheetsToCombinedCSV, buildExportFileName } = lib;

/* ------------------------------------------------------------ muat store */

let store = getInitialStore();
let sourceLabel = 'dataset bawaan aplikasi (src/data/initialData.ts)';

if (fromFile) {
  const abs = path.resolve(ROOT, fromFile);
  const parsed = JSON.parse(fs.readFileSync(abs, 'utf8'));
  store = { ...store, ...(parsed.store || parsed) };
  sourceLabel = abs;
}

const sheets = buildExportSheets(store, onlyActive);
const totalRecords = sheets.reduce((acc, sheet) => acc + sheet.recordCount, 0);

fs.mkdirSync(outDir, { recursive: true });

const xlsName = buildExportFileName('xls');
const csvName = buildExportFileName('csv');
const xlsPath = path.join(outDir, xlsName);
const csvPath = path.join(outDir, csvName);

fs.writeFileSync(xlsPath, sheetsToSpreadsheetML(sheets, { includeSummary: true }), 'utf8');
fs.writeFileSync(csvPath, sheetsToCombinedCSV(sheets), 'utf8');

/* ------------------------------------------------------------- laporan */

process.stdout.write('\n=== EXPORT DATABASE ARMS ===\n');
process.stdout.write(`Sumber data   : ${sourceLabel}\n`);
process.stdout.write(`Mode          : ${onlyActive ? 'hanya database aktif' : 'seluruh tab database'}\n`);
process.stdout.write(`Jumlah tab    : ${sheets.length}\n`);
process.stdout.write(`Total record  : ${totalRecords}\n`);
process.stdout.write(`File Excel    : ${path.relative(ROOT, xlsPath)} (${(fs.statSync(xlsPath).size / 1024).toFixed(1)} KB)\n`);
process.stdout.write(`File CSV      : ${path.relative(ROOT, csvPath)} (${(fs.statSync(csvPath).size / 1024).toFixed(1)} KB)\n\n`);
process.stdout.write('Rincian per tab:\n');
sheets
  .slice()
  .sort((a, b) => b.recordCount - a.recordCount)
  .forEach((sheet) => {
    process.stdout.write(
      `  ${sheet.tabName.padEnd(20)} ${String(sheet.recordCount).padStart(6)} record  ${String(sheet.headers.length).padStart(4)} kolom  — ${sheet.label}\n`
    );
  });
process.stdout.write('\nSelesai. Buka file .xls di Excel/LibreOffice, atau impor ke Google Sheets (File → Import → Upload).\n');
