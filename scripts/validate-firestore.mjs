#!/usr/bin/env node
/**
 * validate-firestore.mjs — VERIFIKASI DATABASE FIRESTORE (online)
 * ---------------------------------------------------------------------------
 * Membandingkan isi Google Cloud Firestore dengan data awal ARMS
 * (src/data/initialData.ts) untuk memastikan migrasi/seed berhasil:
 *   - jumlah dokumen per koleksi
 *   - sample field (camelCase) pada dokumen pertama tiap koleksi
 *   - keberadaan dokumen _meta/schema
 *
 * Jalankan: npm run db:validate:firestore [--project <id>] [--database <id>]
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { google } from 'googleapis';
import { loadServiceAccountJson } from '../netlify/functions/lib/googleAuth.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};

const appletConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'firebase-applet-config.json'), 'utf8'));
const projectId = opt('--project') || process.env.FIREBASE_PROJECT_ID || appletConfig.projectId;
const DATABASE = opt('--database') || process.env.FIRESTORE_DATABASE_ID || '(default)';
const dbRoot = `projects/${projectId}/databases/${DATABASE}`;

console.log('='.repeat(78));
console.log('VERIFIKASI GOOGLE CLOUD FIRESTORE');
console.log(`Project: ${projectId} | Database: ${DATABASE}`);
console.log('='.repeat(78));

// Bundle data awal
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arms-validate-fs-'));
const entryFile = path.join(tmpDir, 'entry.ts');
const outFile = path.join(tmpDir, 'entry.mjs');
fs.writeFileSync(
  entryFile,
  `export * as initialData from '${path.join(ROOT, 'src/data/initialData.ts').replace(/\\/g, '/')}';`,
  'utf8'
);
await build({ entryPoints: [entryFile], bundle: true, format: 'esm', platform: 'node', outfile: outFile, logLevel: 'silent' });
const { initialData } = await import(pathToFileURL(outFile).href);

const EXPECTED = {
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
  lawyer_notices: initialData.INITIAL_LAWYER_NOTICES,
  comm_logs: initialData.INITIAL_COMM_LOGS,
  assets: initialData.INITIAL_ASSETS,
  collections: initialData.INITIAL_COLLECTIONS,
  asset_recoveries: initialData.INITIAL_ASSET_RECOVERIES,
  dana_talangan: initialData.INITIAL_DANA_TALANGAN,
  payments: initialData.INITIAL_PAYMENTS,
  expenses: initialData.INITIAL_EXPENSES,
  settlements: initialData.INITIAL_SETTLEMENTS,
  ledger: initialData.INITIAL_LEDGER,
  cash_accounts: initialData.INITIAL_CASH_ACCOUNTS,
  petty_cash: initialData.INITIAL_PETTY_CASH,
  working_capital: initialData.INITIAL_WORKING_CAPITAL,
  documents: initialData.INITIAL_DOCUMENTS,
  drive_folders: initialData.INITIAL_DRIVE_FOLDERS,
  approvals: initialData.INITIAL_APPROVALS,
  notifications: initialData.INITIAL_NOTIFICATIONS,
  audit_logs: initialData.INITIAL_AUDIT_LOGS,
  settings: [initialData.INITIAL_SETTINGS],
};

function fromRestValue(v) {
  if (!v) return undefined;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.arrayValue) return (v.arrayValue.values || []).map(fromRestValue);
  if (v.mapValue) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, vv]) => [k, fromRestValue(vv)]));
  return v;
}

try {
  const credentials = loadServiceAccountJson();
  console.log(`Service account: ${credentials.client_email}`);
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/firestore'] });
  const firestoreClient = google.firestore({ version: 'v1', auth });

  let mismatch = 0;
  console.log('');

  // _meta/schema
  try {
    await firestoreClient.projects.databases.documents.get({ name: `${dbRoot}/documents/_meta/schema` });
    console.log('[OK   ] _meta/schema ditemukan');
  } catch {
    console.log('[INFO ] _meta/schema belum ada (jalankan npm run db:setup)');
  }

  for (const [collection, items] of Object.entries(EXPECTED)) {
    const expectedCount = Array.isArray(items) ? items.length : 0;
    let actualCount = 0;
    let sampleFields = '';

    if (expectedCount === 0) {
      // Koleksi boleh kosong; cukup coba baca (error 404 = belum ada dokumen)
      try {
        const res = await firestoreClient.projects.databases.documents.list({
          parent: dbRoot,
          collectionId: collection,
          pageSize: 1,
        });
        actualCount = res.data.documents?.length || 0;
      } catch {
        actualCount = 0;
      }
    } else {
      const res = await firestoreClient.projects.databases.documents.list({
        parent: dbRoot,
        collectionId: collection,
        pageSize: 200,
      });
      const docs = res.data.documents || [];
      actualCount = docs.length;
      if (docs.length > 0) {
        const fields = Object.keys(docs[0].fields || {}).slice(0, 5);
        sampleFields = `contoh field: ${fields.join(', ')}...`;
      }
    }

    const ok = actualCount >= expectedCount;
    if (!ok) mismatch++;
    console.log(
      `[${ok ? 'OK   ' : 'ERROR'}] ${collection.padEnd(18)} Firestore: ${String(actualCount).padStart(3)} | data awal: ${String(expectedCount).padStart(3)} ${sampleFields}`
    );
  }

  console.log('');
  console.log(mismatch === 0
    ? '✅ Seluruh koleksi Firestore memiliki data >= data awal (migrasi OK).'
    : `❌ ${mismatch} koleksi kurang dari data awal — jalankan npm run db:setup untuk (re)seed.`);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  process.exit(mismatch ? 1 : 0);
} catch (err) {
  const status = err?.response?.status;
  console.error('');
  console.error(`❌ Validasi gagal: ${err?.message || err}`);
  if (status) console.error(`   HTTP ${status}`);
  if (status === 403) console.error('   Service Account tidak punya akses ke database ini (project harus SAMA dengan firebase-applet-config.json).');
  fs.rmSync(tmpDir, { recursive: true, force: true });
  process.exit(1);
}
