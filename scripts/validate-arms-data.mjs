#!/usr/bin/env node
/**
 * validate-arms-data.mjs
 * ---------------------------------------------------------------------------
 * Menjalankan simulasi push Supabase TANPA jaringan, memakai data awal ARMS
 * (src/data/initialData.ts) dan adapter asli (src/utils/supabaseAdapter.ts).
 *
 * Yang dicek:
 *   1. Setiap key record punya kolom padanan di Postgres
 *      -> mencegah "Could not find the 'xxx' column of 'yyy' in the schema cache"
 *   2. Kolom NOT NULL tanpa DEFAULT tidak kosong
 *      -> mencegah "null value in column ... violates not-null constraint"
 *   3. Semua foreign key menunjuk id induk yang benar-benar ada
 *      -> mencegah "violates foreign key constraint"
 *   4. Tidak ada id duplikat dalam satu tabel (upsert onConflict id)
 *
 * Jalankan: npm run db:validate:data
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { parseSqlTables, collectDefaultedNotNull, collectForeignKeys } from './lib/sqlSchema.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MIGRATION_DIR = path.join(ROOT, 'supabase/migrations');

// ---------------------------------------------------------------------------
// Bundle modul TS yang dibutuhkan supaya bisa dieksekusi Node
// ---------------------------------------------------------------------------
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arms-validate-'));
const entryFile = path.join(tmpDir, 'entry.ts');
const outFile = path.join(tmpDir, 'entry.mjs');

fs.writeFileSync(
  entryFile,
  `
export * as initialData from '${path.join(ROOT, 'src/data/initialData.ts').replace(/\\/g, '/')}';
export * as adapter from '${path.join(ROOT, 'src/utils/supabaseAdapter.ts').replace(/\\/g, '/')}';
`,
  'utf8'
);

await build({
  entryPoints: [entryFile],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: outFile,
  logLevel: 'silent',
});

const { initialData, adapter } = await import(pathToFileURL(outFile).href);
const { toSupabaseRow, STORE_TO_SUPABASE_TABLE } = adapter;

// ---------------------------------------------------------------------------
// Skema
// ---------------------------------------------------------------------------
const sql = fs
  .readdirSync(MIGRATION_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => fs.readFileSync(path.join(MIGRATION_DIR, f), 'utf8'))
  .join('\n');

const tables = parseSqlTables(sql);
const defaultedNotNull = collectDefaultedNotNull(tables);
const foreignKeys = collectForeignKeys(tables);

// ---------------------------------------------------------------------------
// Data awal per koleksi
// ---------------------------------------------------------------------------
const STORE = {
  users: initialData.INITIAL_USERS,
  clients: initialData.INITIAL_CLIENTS,
  personnel: initialData.INITIAL_PERSONNEL,
  services: initialData.INITIAL_SERVICES,
  fees: initialData.INITIAL_FEES,
  contracts: initialData.INITIAL_CONTRACTS,
  leads: initialData.INITIAL_LEADS,
  customers: initialData.INITIAL_CUSTOMERS,
  cases: initialData.INITIAL_CASES,
  assignments: initialData.INITIAL_ASSIGNMENTS,
  sks: initialData.INITIAL_SKS,
  lawyerNotices: initialData.INITIAL_LAWYER_NOTICES,
  commLogs: initialData.INITIAL_COMM_LOGS,
  assets: initialData.INITIAL_ASSETS,
  collections: initialData.INITIAL_COLLECTIONS,
  assetRecoveries: initialData.INITIAL_ASSET_RECOVERIES,
  danaTalangan: initialData.INITIAL_DANA_TALANGAN,
  payments: initialData.INITIAL_PAYMENTS,
  expenses: initialData.INITIAL_EXPENSES,
  settlements: initialData.INITIAL_SETTLEMENTS,
  ledger: initialData.INITIAL_LEDGER,
  cashAccounts: initialData.INITIAL_CASH_ACCOUNTS,
  pettyCash: initialData.INITIAL_PETTY_CASH,
  workingCapital: initialData.INITIAL_WORKING_CAPITAL,
  documents: initialData.INITIAL_DOCUMENTS,
  driveFolders: initialData.INITIAL_DRIVE_FOLDERS,
  approvals: initialData.INITIAL_APPROVALS,
  notifications: initialData.INITIAL_NOTIFICATIONS,
  auditLogs: initialData.INITIAL_AUDIT_LOGS,
};

let errors = 0;
let warns = 0;
const out = [];
out.push('='.repeat(78));
out.push('SIMULASI PUSH SUPABASE MEMAKAI DATA AWAL ARMS (tanpa koneksi jaringan)');
out.push('='.repeat(78));
out.push('');

/** id yang tersedia per tabel, untuk cek FK. */
const idsByTable = {};
for (const [collection, items] of Object.entries(STORE)) {
  const table = STORE_TO_SUPABASE_TABLE[collection];
  idsByTable[table] = new Set((items || []).map((i) => String(i?.id)).filter(Boolean));
}

for (const [collection, items] of Object.entries(STORE)) {
  const table = STORE_TO_SUPABASE_TABLE[collection];
  const cols = tables[table];
  if (!cols) {
    out.push(`[ERROR] tabel '${table}' tidak ada di migrations/`);
    errors++;
    continue;
  }
  if (!Array.isArray(items) || items.length === 0) continue;

  const defaulted = new Set(defaultedNotNull[table] || []);
  const requiredCols = cols
    .filter((c) => c.notNull && !c.hasDefault && !defaulted.has(c.name))
    .map((c) => c.name);
  const fks = foreignKeys[table] || {};
  const seenIds = new Set();
  const issues = [];

  for (const item of items) {
    const { row, droppedKeys } = toSupabaseRow(table, item);

    if (droppedKeys.length) {
      issues.push(`row '${row.id ?? '-'}': key tanpa kolom -> ${droppedKeys.join(', ')}`);
    }
    if (!row.id) {
      issues.push(`ada row tanpa 'id'`);
    } else if (seenIds.has(row.id)) {
      issues.push(`id duplikat '${row.id}'`);
    } else {
      seenIds.add(row.id);
    }
    for (const c of requiredCols) {
      if (row[c] === undefined || row[c] === null || row[c] === '') {
        issues.push(`row '${row.id ?? '-'}': kolom wajib '${c}' kosong`);
      }
    }
    for (const [col, fk] of Object.entries(fks)) {
      const v = row[col];
      if (v === undefined || v === null || v === '') continue;
      const parentIds = idsByTable[fk.table];
      if (parentIds && !parentIds.has(String(v))) {
        issues.push(
          `row '${row.id ?? '-'}': ${col}='${v}' tidak ada di ${fk.table}` +
            (fk.nullable ? ' (akan dinolkan otomatis saat push)' : ' (row akan dilewati saat push)')
        );
      }
    }
  }

  if (issues.length) {
    const fatal = issues.filter((i) => !i.includes('akan dinolkan otomatis'));
    if (fatal.length) errors += fatal.length;
    warns += issues.length - fatal.length;
    out.push(`${fatal.length ? '[ERROR]' : '[WARN ]'} ${collection} -> public.${table} (${items.length} row)`);
    for (const i of [...new Set(issues)].slice(0, 15)) out.push(`         ${i}`);
    if (issues.length > 15) out.push(`         ... +${issues.length - 15} temuan lain`);
  } else {
    out.push(`[OK   ] ${collection} -> public.${table} (${items.length} row)`);
  }
}

// ---------------------------------------------------------------------------
// Regresi: error yang pernah dilaporkan saat "Push ke Supabase"
// ---------------------------------------------------------------------------
out.push('');
out.push('-'.repeat(78));
out.push('REGRESI ERROR YANG PERNAH DILAPORKAN');
out.push('-'.repeat(78));

const expect = (label, cond, info = '') => {
  if (cond) {
    out.push(`  [OK   ] ${label}`);
  } else {
    out.push(`  [ERROR] ${label}${info ? ` -> ${info}` : ''}`);
    errors++;
  }
};

const clientRow = toSupabaseRow('clients', {
  id: 'CLI-X',
  gDriveFolderUrl: 'https://drive.google.com/x',
  gDriveFolderId: 'FOLDER-X',
}).row;
expect(
  "clients: gDriveFolderUrl -> kolom 'gdrive_folder_url'",
  clientRow.gdrive_folder_url === 'https://drive.google.com/x' && !('g_drive_folder_url' in clientRow),
  JSON.stringify(clientRow)
);
expect(
  "clients: gDriveFolderId -> kolom 'gdrive_folder_id'",
  clientRow.gdrive_folder_id === 'FOLDER-X' && !('g_drive_folder_id' in clientRow)
);

const personnelRow = toSupabaseRow('personnel', { id: 'PER-X', gDriveFolderUrl: 'u' }).row;
expect("personnel: gDriveFolderUrl -> 'gdrive_folder_url'", personnelRow.gdrive_folder_url === 'u');

const caseRow = toSupabaseRow('cases', {
  id: 'CASE-X',
  gDriveFolderId: 'F',
  gDriveFolderName: 'N',
  principalDebtOS: 1000,
}).row;
expect("cases: gDriveFolderId -> 'gdrive_folder_id'", caseRow.gdrive_folder_id === 'F');
expect("cases: gDriveFolderName -> 'gdrive_folder_name'", caseRow.gdrive_folder_name === 'N');
expect("cases: principalDebtOS -> 'principal_debt_os'", caseRow.principal_debt_os === 1000);

const assetRow = toSupabaseRow('assets', { id: 'AST-X', policeNoVIN: 'B 1234 XX' }).row;
expect("assets: policeNoVIN -> 'police_no_vin'", assetRow.police_no_vin === 'B 1234 XX');

const auditRow = toSupabaseRow('audit_logs', {
  id: 'AUD-X',
  createdAt: undefined,
  timestamp: '',
  username: 'superadmin',
}).row;
expect(
  'audit_logs: created_at null tidak dikirim (biar DEFAULT NOW() dipakai)',
  !('created_at' in auditRow),
  JSON.stringify(auditRow)
);
expect('audit_logs: timestamp kosong tidak dikirim', !('timestamp' in auditRow));

const unknownRow = toSupabaseRow('clients', { id: 'CLI-Y', kolomNgawur: 'x' });
expect(
  'kolom asing dibuang, bukan menggagalkan seluruh tabel',
  !('kolom_ngawur' in unknownRow.row) && unknownRow.droppedKeys.length === 1
);

const backToCamel = adapter.toCamelCaseRecord({
  gdrive_folder_url: 'u',
  principal_debt_os: 5,
  police_no_vin: 'B 1',
  case_no: 'C-1',
});
expect(
  'fetch: kolom Postgres kembali ke nama field TypeScript aslinya',
  backToCamel.gDriveFolderUrl === 'u' &&
    backToCamel.principalDebtOS === 5 &&
    backToCamel.policeNoVIN === 'B 1' &&
    backToCamel.caseNo === 'C-1',
  JSON.stringify(backToCamel)
);

out.push('');
out.push('='.repeat(78));
out.push(`HASIL: ${errors} error, ${warns} warning`);
out.push('='.repeat(78));
console.log(out.join('\n'));

fs.rmSync(tmpDir, { recursive: true, force: true });
process.exit(errors ? 1 : 0);
