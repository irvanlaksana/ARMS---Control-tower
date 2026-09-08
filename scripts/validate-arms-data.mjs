#!/usr/bin/env node
/**
 * validate-arms-data.mjs
 * ---------------------------------------------------------------------------
 * Menjalankan SIMULASI PUSH FIRESTORE TANPA jaringan, memakai data awal ARMS
 * (src/data/initialData.ts) dan adapter asli (src/utils/firestoreAdapter.ts).
 *
 * Yang dicek:
 *   1. Setiap key record punya field padanan di skema Firestore
 *      (key asing dibuang, bukan menggagalkan seluruh koleksi)
 *   2. Field NOT NULL tanpa DEFAULT tidak kosong
 *   3. Semua foreign key logis menunjuk id induk yang benar-benar ada
 *   4. Tidak ada id duplikat dalam satu koleksi (document ID Firestore)
 *
 * Jalankan: npm run db:validate:data
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { parseSqlTables, collectDefaultedNotNull, collectForeignKeys } from './lib/sqlSchema.mjs';
import { snakeToCamel } from './lib/caseConvert.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MIGRATION_DIR = path.join(ROOT, 'schema/migrations');

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
export * as adapter from '${path.join(ROOT, 'src/utils/firestoreAdapter.ts').replace(/\\/g, '/')}';
export * as schema from '${path.join(ROOT, 'src/utils/firestoreSchemaColumns.ts').replace(/\\/g, '/')}';
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

const { initialData, adapter, schema } = await import(pathToFileURL(outFile).href);
const { toFirestoreDoc, STORE_TO_FIRESTORE_COLLECTION } = adapter;

// ---------------------------------------------------------------------------
// Skema (dari file migrasi SQL — sumber kebenaran)
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

/** Field wajib (NOT NULL tanpa DEFAULT) per koleksi, nama camelCase. */
const requiredFieldsByCollection = {};
for (const [table, cols] of Object.entries(tables)) {
  const defaulted = new Set(defaultedNotNull[table] || []);
  requiredFieldsByCollection[table] = cols
    .filter((c) => c.notNull && !c.hasDefault && !defaulted.has(c.name))
    .map((c) => snakeToCamel(c.name));
}

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
out.push('SIMULASI PUSH FIRESTORE MEMAKAI DATA AWAL ARMS (tanpa koneksi jaringan)');
out.push('='.repeat(78));
out.push('');

/** id yang tersedia per koleksi, untuk cek FK. */
const idsByCollection = {};
for (const [collection, items] of Object.entries(STORE)) {
  const colName = STORE_TO_FIRESTORE_COLLECTION[collection];
  idsByCollection[colName] = new Set((items || []).map((i) => String(i?.id)).filter(Boolean));
}

for (const [collection, items] of Object.entries(STORE)) {
  const colName = STORE_TO_FIRESTORE_COLLECTION[collection];
  if (!schema.FIRESTORE_COLLECTION_FIELDS[colName]) {
    out.push(`[ERROR] koleksi '${colName}' tidak ada di skema`);
    errors++;
    continue;
  }
  if (!Array.isArray(items) || items.length === 0) continue;

  const requiredFields = requiredFieldsByCollection[colName] || [];
  const fks = foreignKeys[colName] || {};
  const fksCamel = Object.fromEntries(Object.entries(fks).map(([k, v]) => [snakeToCamel(k), v]));
  const seenIds = new Set();
  const issues = [];

  for (const item of items) {
    const { doc, droppedKeys } = toFirestoreDoc(colName, item);

    if (droppedKeys.length) {
      issues.push(`row '${doc.id ?? '-'}': key tanpa field -> ${droppedKeys.join(', ')}`);
    }
    if (!doc.id) {
      issues.push(`ada row tanpa 'id'`);
    } else if (seenIds.has(doc.id)) {
      issues.push(`id duplikat '${doc.id}'`);
    } else {
      seenIds.add(doc.id);
    }
    for (const field of requiredFields) {
      if (doc[field] === undefined || doc[field] === null || doc[field] === '') {
        issues.push(`row '${doc.id ?? '-'}': field wajib '${field}' kosong`);
      }
    }
    for (const [field, fk] of Object.entries(fksCamel)) {
      const v = doc[field];
      if (v === undefined || v === null || v === '') continue;
      const parentIds = idsByCollection[fk.table];
      if (parentIds && !parentIds.has(String(v))) {
        issues.push(
          `row '${doc.id ?? '-'}': ${field}='${v}' tidak ada di ${fk.table}` +
            (fk.nullable ? ' (akan dikosongkan otomatis saat push)' : ' (row akan dilewati saat push)')
        );
      }
    }
  }

  if (issues.length) {
    const fatal = issues.filter((i) => !i.includes('akan dikosongkan otomatis'));
    if (fatal.length) errors += fatal.length;
    warns += issues.length - fatal.length;
    out.push(`${fatal.length ? '[ERROR]' : '[WARN ]'} ${collection} -> ${colName} (${items.length} row)`);
    for (const i of [...new Set(issues)].slice(0, 15)) out.push(`         ${i}`);
    if (issues.length > 15) out.push(`         ... +${issues.length - 15} temuan lain`);
  } else {
    out.push(`[OK   ] ${collection} -> ${colName} (${items.length} row)`);
  }
}

// ---------------------------------------------------------------------------
// Regresi: perilaku adapter Firestore
// ---------------------------------------------------------------------------
out.push('');
out.push('-'.repeat(78));
out.push('REGRESI PERILAKU ADAPTER FIRESTORE');
out.push('-'.repeat(78));

const expect = (label, cond, info = '') => {
  if (cond) {
    out.push(`  [OK   ] ${label}`);
  } else {
    out.push(`  [ERROR] ${label}${info ? ` -> ${info}` : ''}`);
    errors++;
  }
};

const clientDoc = toFirestoreDoc('clients', {
  id: 'CLI-X',
  gDriveFolderUrl: 'https://drive.google.com/x',
  gDriveFolderId: 'FOLDER-X',
  unknownKey: 'x',
});
expect('clients: field camelCase tersimpan apa adanya', clientDoc.doc.gDriveFolderUrl === 'https://drive.google.com/x');
expect('clients: gDriveFolderId tetap camelCase', clientDoc.doc.gDriveFolderId === 'FOLDER-X');
expect('field asing dibuang, bukan menggagalkan koleksi', clientDoc.droppedKeys.includes('unknownKey'));

const caseDoc = toFirestoreDoc('cases', {
  id: 'CASE-X',
  gDriveFolderId: 'F',
  gDriveFolderName: 'N',
  principalDebtOS: 'Rp 142.500.000',
}).doc;
expect('cases: gDriveFolderId tersimpan', caseDoc.gDriveFolderId === 'F');
expect('cases: principalDebtOS "Rp 142.500.000" -> 142500000', caseDoc.principalDebtOS === 142500000);

const paymentsDoc = toFirestoreDoc('payments', { id: 'PAY-X', amount: 'Rp 2.500.000' }).doc;
expect('payments: amount "Rp 2.500.000" -> 2500000', paymentsDoc.amount === 2500000);
expect('payments: paymentType default DEBTOR_REPAYMENT', paymentsDoc.paymentType === 'DEBTOR_REPAYMENT');
expect('payments: paymentMethod default TRANSFER', paymentsDoc.paymentMethod === 'TRANSFER');

const userDoc = toFirestoreDoc('users', { id: 'USR-X', username: 'x', name: 'N', email: 'e' }).doc;
expect('users: role default SUPER_ADMIN_OPS', userDoc.role === 'SUPER_ADMIN_OPS');
expect('users: createdAt otomatis terisi', Boolean(userDoc.createdAt));

const boolDoc = toFirestoreDoc('notifications', { id: 'NTF-X', title: 't', message: 'm', type: 'SYSTEM', forRole: 'SUPER_ADMIN_OPS', isRead: 'true' }).doc;
expect('notifications: isRead string "true" -> boolean true', boolDoc.isRead === true);

const jsonDoc = toFirestoreDoc('customers', { id: 'CUST-X', fullName: 'n', stnkPhotoUrls: '["a.jpg"]' }).doc;
expect('customers: stnkPhotoUrls string JSON -> array', Array.isArray(jsonDoc.stnkPhotoUrls) && jsonDoc.stnkPhotoUrls[0] === 'a.jpg');

out.push('');
out.push('='.repeat(78));
out.push(`HASIL: ${errors} error, ${warns} warning`);
out.push('='.repeat(78));
console.log(out.join('\n'));

fs.rmSync(tmpDir, { recursive: true, force: true });
process.exit(errors ? 1 : 0);
