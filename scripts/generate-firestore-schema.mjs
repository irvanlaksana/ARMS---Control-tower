#!/usr/bin/env node
/**
 * generate-firestore-schema.mjs
 * ---------------------------------------------------------------------------
 * GENERATOR SKEMA FIRESTORE (MIGRASI SUPABASE -> FIRESTORE).
 *
 * Membaca seluruh migrasi SQL (schema/migrations/*.sql) — sumber kebenaran
 * skema ARMS — lalu menghasilkan `src/utils/firestoreSchemaColumns.ts`:
 *
 *   FIRESTORE_COLLECTIONS      -> daftar koleksi Firestore (nama = nama tabel)
 *   FIRESTORE_COLLECTION_FIELDS-> field valid tiap koleksi (camelCase,
 *                                 identik dengan tipe TypeScript ARMS)
 *   FIRESTORE_DEFAULTED_FIELDS -> field NOT NULL+DEFAULT (jangan dikirim null
 *                                 eksplisit; Firestore memakai default client)
 *   FIRESTORE_FOREIGN_KEYS     -> relasi logis antar koleksi (camelCase)
 *
 * Jalankan: npm run db:schema
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSqlTables, collectDefaultedNotNull, collectForeignKeys } from './lib/sqlSchema.mjs';
import { snakeToCamel, camelToSnake } from './lib/caseConvert.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MIGRATION_DIR = path.join(ROOT, 'schema/migrations');
const OUT_FILE = path.join(ROOT, 'src/utils/firestoreSchemaColumns.ts');

if (!fs.existsSync(MIGRATION_DIR)) {
  console.error(`❌ Folder migrasi tidak ditemukan: ${MIGRATION_DIR}`);
  process.exit(1);
}

const sqlFiles = fs
  .readdirSync(MIGRATION_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

if (sqlFiles.length === 0) {
  console.error('❌ Tidak ada file .sql di schema/migrations/');
  process.exit(1);
}

const sqlText = sqlFiles.map((f) => fs.readFileSync(path.join(MIGRATION_DIR, f), 'utf8')).join('\n\n');
const tables = parseSqlTables(sqlText);
const defaulted = collectDefaultedNotNull(tables);
const fks = collectForeignKeys(tables);

/** Urutan koleksi mengikuti alur dependensi data ARMS (master -> transaksi). */
const ORDERED = [
  'users', 'clients', 'personnel', 'services', 'fees', 'contracts', 'leads',
  'customers', 'cases', 'assignments', 'sks', 'lawyer_notices', 'comm_logs',
  'assets', 'collections', 'asset_recoveries', 'dana_talangan', 'payments',
  'expenses', 'settlements', 'ledger', 'cash_accounts', 'petty_cash',
  'working_capital', 'documents', 'drive_folders', 'approvals', 'notifications',
  'audit_logs', 'settings',
];

const missing = ORDERED.filter((c) => !tables[c]);
if (missing.length) {
  console.error(`❌ Koleksi di daftar urutan tidak ditemukan di skema SQL: ${missing.join(', ')}`);
  process.exit(1);
}

const collections = ORDERED.filter((c) => tables[c]);
const extra = Object.keys(tables).filter((t) => !collections.includes(t));

const quote = (v) => JSON.stringify(v);

const fieldsBlock = collections
  .map((t) => `  ${t}: [${tables[t].map((c) => quote(snakeToCamel(c.name))).join(', ')}],`)
  .join('\n');

const defaultedBlock = collections
  .filter((t) => (defaulted[t] || []).length)
  .map((t) => `  ${t}: [${defaulted[t].map((c) => quote(snakeToCamel(c))).join(', ')}],`)
  .join('\n');

const fkBlock = collections
  .filter((t) => fks[t])
  .map((t) => {
    const entries = Object.entries(fks[t])
      .map(([col, fk]) => `    ${quote(snakeToCamel(col))}: { table: ${quote(fk.table)}, field: ${quote(snakeToCamel(fk.column))}, nullable: ${fk.nullable} },`)
      .join('\n');
    return `  ${t}: {\n${entries}\n  },`;
  })
  .join('\n');

// Sanity check: camelToSnake(snakeToCamel(x)) harus idempoten.
for (const t of collections) {
  for (const c of tables[t]) {
    const roundTrip = camelToSnake(snakeToCamel(c.name));
    if (roundTrip !== c.name) {
      console.error(`❌ Konversi nama tidak idempoten: ${c.name} -> ${snakeToCamel(c.name)} -> ${roundTrip}`);
      process.exit(1);
    }
  }
}

const out = `/**
 * FILE INI DI-GENERATE OTOMATIS - JANGAN DIEDIT MANUAL.
 * Sumber: schema/migrations/*.sql (migrasi skema ARMS)
 * Generator: npm run db:schema  (scripts/generate-firestore-schema.mjs)
 * Migrasi terbaca: ${sqlFiles.join(', ')}
 *
 * Pemetaan Supabase (PostgreSQL) -> Firestore:
 *   - nama tabel          -> nama koleksi Firestore (snake_case)
 *   - nama kolom          -> nama field dokumen (camelCase, sama dengan tipe TS)
 *   - primary key         -> document ID
 *   - RLS policies        -> firestore.rules
 *   - trigger updated_at  -> field updatedAt diisi oleh src/services/firestoreService.ts
 *   - view aliases        -> tidak dipindah (alias tanpa data)
 *   - index               -> firestore.indexes.json (composite)
 */

/** Daftar koleksi Firestore ARMS dalam urutan dependensi (master -> transaksi). */
export const FIRESTORE_COLLECTIONS: readonly string[] = [
${collections.map((c) => `  '${c}',`).join('\n')}
];

/** Field valid tiap koleksi Firestore (camelCase, sesuai tipe TypeScript ARMS). */
export const FIRESTORE_COLLECTION_FIELDS: Record<string, readonly string[]> = {
${fieldsBlock}
};

/**
 * Field NOT NULL yang punya DEFAULT di skema sumber.
 * Bila nilainya null/kosong, JANGAN kirim null eksplisit — biarkan default
 * aplikasi (src/utils/firestoreAdapter.ts) yang mengisi.
 */
export const FIRESTORE_DEFAULTED_FIELDS: Record<string, readonly string[]> = {
${defaultedBlock}
};

export interface FirestoreForeignKey {
  /** Koleksi induk yang direferensikan. */
  table: string;
  /** Field induk yang direferensikan (camelCase). */
  field: string;
  /** true bila field FK boleh dikosongkan saat referensinya tidak ditemukan. */
  nullable: boolean;
}

/** Relasi logis antar koleksi: koleksi -> field -> target. */
export const FIRESTORE_FOREIGN_KEYS: Record<string, Record<string, FirestoreForeignKey>> = {
${fkBlock}
};
`;

fs.writeFileSync(OUT_FILE, out, 'utf8');
console.log(`✅ Skema Firestore di-generate dari ${sqlFiles.length} file migrasi.`);
console.log(`   ${collections.length} koleksi, ${extra.length ? `(${extra.length} tabel SQL lain diabaikan: ${extra.join(', ')})` : 'semua tabel SQL tercakup'}`);
console.log(`   Output: ${path.relative(ROOT, OUT_FILE)}`);
