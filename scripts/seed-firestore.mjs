#!/usr/bin/env node
/**
 * seed-firestore.mjs — MIGRASI & SEED DATABASE ARMS KE GOOGLE FIRESTORE
 * ---------------------------------------------------------------------------
 * Mengubah skema + data ARMS (sebelumnya Supabase/PostgreSQL) menjadi
 * Google Cloud Firestore, SESUAI DATA YANG SAAT INI ADA di aplikasi
 * (src/data/initialData.ts — data operasional bersih: Users, Clients,
 * Personnel, Services, Fees, Contracts, Customers, Cases, Assignments, SK,
 * Cash Accounts, Drive Folders, Notifications, Audit Logs, Settings).
 *
 * Langkah yang dijalankan (default):
 *   1. [meta]  Tulis dokumen `_meta/schema` (versi skema, pemetaan tabel ->
 *              koleksi, daftar field, sumber migrasi).
 *   2. [seed]  Upsert SELURUH data awal ke 30 koleksi Firestore
 *              (document ID = id record; field camelCase).
 *   3. [index] Buat composite indexes dari firestore.indexes.json.
 *
 * Kredensial: Service Account dari project Firebase yang SAMA dengan
 * firebase-applet-config.json. Sumber (prioritas):
 *   1. env GOOGLE_SERVICE_ACCOUNT_JSON  (seluruh isi JSON)
 *   2. env GOOGLE_APPLICATION_CREDENTIALS (path file JSON)
 *   3. file ./service-account.json di root repo
 *
 * Opsi:
 *   --dry-run          tidak menghubungi Firestore (cetak rencana)
 *   --seed-only        hanya langkah seed
 *   --meta-only        hanya langkah meta
 *   --index-only       hanya langkah indexes
 *   --project <id>     override project (default: firebase-applet-config.json)
 *   --database <id>    override database (default: (default))
 *
 * Jalankan: npm run db:setup
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { google } from 'googleapis';
import { loadServiceAccountJson } from '../netlify/functions/lib/googleAuth.mjs';
import { parseNumericString } from './lib/numeric.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Argumen
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};

const DRY_RUN = flag('--dry-run');
const SEED_ONLY = flag('--seed-only');
const META_ONLY = flag('--meta-only');
const INDEX_ONLY = flag('--index-only');
const PROJECT = opt('--project') || process.env.FIREBASE_PROJECT_ID;
const DATABASE = opt('--database') || process.env.FIRESTORE_DATABASE_ID || '(default)';

// ---------------------------------------------------------------------------
// Konfigurasi project (dari firebase-applet-config.json bila tidak di-override)
// ---------------------------------------------------------------------------
const appletConfig = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'firebase-applet-config.json'), 'utf8')
);
const projectId = PROJECT || appletConfig.projectId;
if (!projectId) {
  console.error('❌ Project ID Firebase tidak ditemukan. Pakai --project <id> atau FIREBASE_PROJECT_ID.');
  process.exit(1);
}

console.log('='.repeat(78));
console.log('MIGRASI ARMS -> GOOGLE CLOUD FIRESTORE');
console.log('='.repeat(78));
console.log(`Project   : ${projectId}`);
console.log(`Database  : ${DATABASE}`);
console.log(`Mode      : ${DRY_RUN ? 'DRY RUN (tanpa koneksi)' : 'LIVE'}`);
console.log('');

// ---------------------------------------------------------------------------
// Client Firestore (REST v1) via Service Account
// ---------------------------------------------------------------------------
let firestoreClient = null;
let serviceAccountEmail = null;
if (!DRY_RUN) {
  try {
    const credentials = loadServiceAccountJson();
    serviceAccountEmail = credentials.client_email;
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/firestore'],
    });
    firestoreClient = google.firestore({ version: 'v1', auth });
    console.log(`Service account: ${serviceAccountEmail}`);
  } catch (err) {
    console.error(`❌ Gagal memuat Service Account: ${err?.message || err}`);
    console.error('   Set GOOGLE_SERVICE_ACCOUNT_JSON atau file service-account.json.');
    process.exit(1);
  }
}

const dbRoot = `projects/${projectId}/databases/${DATABASE}`;

// ---------------------------------------------------------------------------
// Bundle data awal (src/data/initialData.ts)
// ---------------------------------------------------------------------------
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arms-seed-'));
const entryFile = path.join(tmpDir, 'entry.ts');
const outFile = path.join(tmpDir, 'entry.mjs');
fs.writeFileSync(
  entryFile,
  `export * as initialData from '${path.join(ROOT, 'src/data/initialData.ts').replace(/\\/g, '/')}';`,
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
const { initialData } = await import(pathToFileURL(outFile).href);

// KEY = NAMA KOLEKSI FIRESTORE (snake_case, identik tabel SQL)
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

// ---------------------------------------------------------------------------
// Konversi nilai JS -> nilai REST Firestore
// ---------------------------------------------------------------------------
function toRestValue(value) {
  if (value === null || value === undefined) return undefined; // field di-skip
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toRestValue).filter(Boolean) } };
  }
  if (typeof value === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(value)) {
      const rv = toRestValue(v);
      if (rv) fields[k] = rv;
    }
    return { mapValue: { fields } };
  }
  return undefined;
}

/** Sanitasi ringkas (sama dengan kebijakan adapter client). */
const NUMERIC_FIELDS = new Set([
  'activeCasesCount', 'percentageValue', 'fixedAmount', 'successFeePercent',
  'estimatedVolume', 'totalInstallment', 'principalDebtOS', 'overdueDays',
  'lawyerNoticeCount', 'feePercentSnapshot', 'feeFixedSnapshot', 'slaDays',
  'principalDebtAmount', 'estimatedMarketValue', 'storageFeePerDay',
  'amountCollected', 'vehicleYear', 'tierBaseAmount', 'tierModifiersTotal',
  'repossessionFee', 'companyFeePercent', 'companyFeeAmount',
  'partnerCommissionAmount', 'requestedAmount', 'feeOrInterestRatePercent',
  'amount', 'totalPaidByDebitur', 'successFeeAmount', 'executionFeeAmount',
  'passThroughFee', 'tierPercent', 'grossAgencyFee', 'companyRevenueAmount',
  'partnerCommissionPercent', 'totalCollected', 'agencyFeePercent',
  'agencyFeeAmount', 'talanganDeducted', 'directExpensesDeducted',
  'netRemittedToClient', 'balance', 'amountOrValue', 'defaultFeePercent',
  'defaultCompanyCommissionSplitPercent',
]);

function cleanForFirestore(field, value) {
  if (value === undefined || value === null) return undefined;
  if (NUMERIC_FIELDS.has(field) && typeof value === 'string') {
    const n = parseNumericString(value);
    return isNaN(n) ? undefined : n;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Bangun writes (update + updateMask == setDoc merge:true)
// ---------------------------------------------------------------------------
function buildWrites(collection, items, isSettings = false) {
  const writes = [];
  for (const item of items) {
    const id = isSettings ? 'app_settings' : item?.id;
    if (!id) continue;
    const fields = {};
    for (const [k, v] of Object.entries(item || {})) {
      if (k === 'id') continue;
      const cleaned = cleanForFirestore(k, v);
      const rv = toRestValue(cleaned);
      if (rv) fields[k] = rv;
    }
    fields.createdAt = toRestValue(item?.createdAt || new Date().toISOString());
    if (!isSettings) fields.updatedAt = toRestValue(item?.updatedAt || new Date().toISOString());
    else fields.updatedAt = toRestValue(new Date().toISOString());

    writes.push({
      update: {
        name: `${dbRoot}/documents/${collection}/${id}`,
        fields,
      },
      updateMask: { fieldPaths: Object.keys(fields) },
    });
  }
  return writes;
}

async function commitWritesInChunks(writes) {
  let committed = 0;
  for (let i = 0; i < writes.length; i += 200) {
    const chunk = writes.slice(i, i + 200);
    await firestoreClient.projects.databases.documents.batchCommit({
      parent: dbRoot,
      writes: chunk,
    });
    committed += chunk.length;
    process.stdout.write(`\r   ... ${committed}/${writes.length} dokumen committed`);
  }
  if (writes.length) process.stdout.write('\n');
  return committed;
}

// ---------------------------------------------------------------------------
// LANGKAH 1: _meta/schema
// ---------------------------------------------------------------------------
async function writeMeta() {
  const sqlFiles = fs
    .readdirSync(path.join(ROOT, 'schema/migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const meta = {
    schemaVersion: '2.0.0-firestore',
    migratedFrom: 'Supabase/PostgreSQL (schema/migrations/*.sql)',
    migratedAt: new Date().toISOString(),
    sourceMigrations: sqlFiles,
    collections: Object.keys(STORE),
    notes:
      'Field dokumen memakai camelCase (identik tipe TypeScript ARMS). Document ID = field id. ' +
      'Dokumentasi lengkap: firestore/MIGRATION.md',
  };

  if (DRY_RUN) {
    console.log('[meta] DRY RUN: akan menulis dokumen _meta/schema');
    return;
  }

  const fields = {};
  for (const [k, v] of Object.entries(meta)) {
    const rv = toRestValue(v);
    if (rv) fields[k] = rv;
  }
  await firestoreClient.projects.databases.documents.patch({
    name: `${dbRoot}/documents/_meta/schema`,
    updateMask: { fieldPaths: Object.keys(fields) },
    requestBody: { fields },
  });
  console.log('[meta] ✅ Dokumen _meta/schema tertulis');
}

// ---------------------------------------------------------------------------
// LANGKAH 2: seed data
// ---------------------------------------------------------------------------
async function seedData() {
  let totalDocs = 0;
  const summary = [];

  for (const [collection, items] of Object.entries(STORE)) {
    const list = Array.isArray(items) ? items : [];
    totalDocs += list.length;
    summary.push(`  ${collection.padEnd(18)} ${String(list.length).padStart(3)} dokumen`);

    if (DRY_RUN || list.length === 0) continue;

    const writes = buildWrites(collection, list, collection === 'settings');
    await commitWritesInChunks(writes);
  }

  console.log('');
  console.log(DRY_RUN
    ? `[seed] DRY RUN: ${totalDocs} dokumen dari ${Object.keys(STORE).length} koleksi akan di-upsert`
    : `[seed] ✅ ${totalDocs} dokumen dari ${Object.keys(STORE).length} koleksi berhasil di-upsert ke Firestore`);
  console.log(summary.join('\n'));
}

// ---------------------------------------------------------------------------
// LANGKAH 3: composite indexes
// ---------------------------------------------------------------------------
async function createIndexes() {
  const indexesFile = path.join(ROOT, 'firestore.indexes.json');
  const { indexes } = JSON.parse(fs.readFileSync(indexesFile, 'utf8'));

  console.log('');
  if (DRY_RUN) {
    console.log(`[index] DRY RUN: akan memastikan ${indexes.length} composite indexes`);
    return;
  }

  const existing = await firestoreClient.projects.databases.indexes.list({ parent: dbRoot });
  const describe = (fields) =>
    fields.map((f) => `${f.fieldPath}:${f.order}`).join(',');
  const existingKeys = new Set(
    (existing.data.indexes || []).map((ix) => `${ix.collectionGroup}||${describe(ix.fields)}`)
  );

  let created = 0;
  let skipped = 0;
  for (const ix of indexes) {
    const key = `${ix.collectionGroup}||${describe(ix.fields)}`;
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }
    await firestoreClient.projects.databases.indexes.create({
      parent: dbRoot,
      resource: {
        fields: ix.fields.map((f) => ({ fieldPath: f.fieldPath, order: f.order })),
      },
    });
    created++;
    console.log(`[index] ✅ ${ix.collectionGroup}: ${describe(ix.fields)}`);
  }
  console.log(`[index] ${created} dibuat, ${skipped} sudah ada (total ${indexes.length})`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
try {
  if (SEED_ONLY) {
    await seedData();
  } else if (META_ONLY) {
    await writeMeta();
  } else if (INDEX_ONLY) {
    await createIndexes();
  } else {
    await writeMeta();
    console.log('');
    await seedData();
    await createIndexes();
  }

  console.log('');
  console.log('='.repeat(78));
  console.log(DRY_RUN
    ? 'DRY RUN selesai. Jalankan tanpa --dry-run untuk eksekusi nyata.'
    : 'Migrasi selesai. Aplikasi ARMS (browser) sudah bisa membaca/menulis Firestore ini langsung.');
  console.log('='.repeat(78));
  fs.rmSync(tmpDir, { recursive: true, force: true });
} catch (err) {
  const status = err?.response?.status;
  const body = err?.response?.data;
  console.error('');
  console.error(`❌ Migrasi gagal: ${err?.message || err}`);
  if (status) console.error(`   HTTP ${status} ${typeof body === 'string' ? body : JSON.stringify(body)?.slice(0, 500)}`);
  if (status === 403) {
    console.error('   Pastikan Service Account dari project Firebase yang SAMA');
    console.error(`   (${projectId}) dan punya akses ke database ${DATABASE}.`);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
  process.exit(1);
}
