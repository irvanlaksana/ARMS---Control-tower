#!/usr/bin/env node
/**
 * validate-supabase-schema.mjs
 * ---------------------------------------------------------------------------
 * Memvalidasi konsistensi antara:
 *   1. Tipe TypeScript ARMS            (src/types/arms.ts, camelCase)
 *   2. Aturan konversi key             (src/utils/supabaseAdapter.ts)
 *   3. Manifest kolom hasil generate    (src/utils/supabaseSchemaColumns.ts)
 *   4. Skema tabel Supabase/Postgres    (supabase/migrations/*.sql, supabase/schema.sql)
 *
 * Menangkap penyebab error push seperti:
 *   - "Could not find the 'g_drive_folder_url' column of 'clients' in the schema cache"
 *   - "null value in column 'created_at' of relation 'audit_logs' violates not-null constraint"
 *   - "insert or update on table 'fees' violates foreign key constraint"
 *
 * Jalankan:  npm run db:validate
 * Exit code: 0 = konsisten, 1 = ada error
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSqlTables, collectDefaultedNotNull } from './lib/sqlSchema.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const TYPES_FILE = path.join(ROOT, 'src/types/arms.ts');
const ADAPTER_FILE = path.join(ROOT, 'src/utils/supabaseAdapter.ts');
const GENERATED_FILE = path.join(ROOT, 'src/utils/supabaseSchemaColumns.ts');
const MIGRATION_DIR = path.join(ROOT, 'supabase/migrations');
const SCHEMA_FILE = path.join(ROOT, 'supabase/schema.sql');

// ---------------------------------------------------------------------------
// 1. Konversi key - HARUS mencerminkan src/utils/supabaseAdapter.ts
// ---------------------------------------------------------------------------
const adapterSrc = fs.readFileSync(ADAPTER_FILE, 'utf8');

function extractMap(varName) {
  const block = adapterSrc.match(new RegExp(`const ${varName}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\}`));
  if (!block) return {};
  const out = {};
  for (const m of block[1].matchAll(/['"]?([A-Za-z0-9_]+)['"]?\s*:\s*['"]([A-Za-z0-9_]+)['"]/g)) {
    out[m[1]] = m[2];
  }
  return out;
}

const CAMEL_TO_SNAKE_OVERRIDES = extractMap('CAMEL_TO_SNAKE_OVERRIDES');
const REVERSE_ACRONYM_FIELDS = extractMap('REVERSE_ACRONYM_FIELDS');
const SNAKE_TO_CAMEL_OVERRIDES = Object.fromEntries(
  Object.entries(CAMEL_TO_SNAKE_OVERRIDES).map(([c, s]) => [s, c])
);

function camelToSnake(str) {
  if (CAMEL_TO_SNAKE_OVERRIDES[str]) return CAMEL_TO_SNAKE_OVERRIDES[str];
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

function snakeToCamel(str) {
  if (SNAKE_TO_CAMEL_OVERRIDES[str]) return SNAKE_TO_CAMEL_OVERRIDES[str];
  const camel = str.replace(/_([a-z0-9])/g, (_, l) => l.toUpperCase());
  return REVERSE_ACRONYM_FIELDS[camel] || camel;
}

// ---------------------------------------------------------------------------
// 2. Parse interface TypeScript
// ---------------------------------------------------------------------------
function parseInterfaces(tsText) {
  const out = {};
  const re = /export interface (\w+)\s*\{([\s\S]*?)\n\}/g;
  let m;
  while ((m = re.exec(tsText))) {
    const [, name, body] = m;
    const fields = [];
    let depth = 0;
    for (const rawLine of body.split('\n')) {
      const l = rawLine.replace(/\/\/.*$/, '').trim();
      if (!l) continue;
      if (depth === 0) {
        const f = l.match(/^(\w+)(\?)?\s*:/);
        if (f) fields.push({ name: f[1], optional: Boolean(f[2]) });
      }
      depth += (l.match(/\{/g) || []).length - (l.match(/\}/g) || []).length;
    }
    out[name] = fields;
  }
  return out;
}

// ---------------------------------------------------------------------------
// 3. Peta collection -> { interface, tabel }
// ---------------------------------------------------------------------------
const COLLECTION_MAP = [
  ['users', 'User', 'users'],
  ['clients', 'Client', 'clients'],
  ['personnel', 'Personnel', 'personnel'],
  ['services', 'Service', 'services'],
  ['fees', 'FeeConfig', 'fees'],
  ['contracts', 'Contract', 'contracts'],
  ['leads', 'Lead', 'leads'],
  ['customers', 'Customer', 'customers'],
  ['cases', 'Case', 'cases'],
  ['assignments', 'Assignment', 'assignments'],
  ['sks', 'SK', 'sks'],
  ['lawyerNotices', 'LawyerNotice', 'lawyer_notices'],
  ['commLogs', 'CommunicationLog', 'comm_logs'],
  ['assets', 'Asset', 'assets'],
  ['collections', 'Collection', 'collections'],
  ['assetRecoveries', 'AssetRecovery', 'asset_recoveries'],
  ['danaTalangan', 'DanaTalangan', 'dana_talangan'],
  ['payments', 'Payment', 'payments'],
  ['expenses', 'Expense', 'expenses'],
  ['settlements', 'Settlement', 'settlements'],
  ['ledger', 'LedgerEntry', 'ledger'],
  ['cashAccounts', 'CashAccount', 'cash_accounts'],
  ['pettyCash', 'PettyCashTransaction', 'petty_cash'],
  ['workingCapital', 'WorkingCapitalTransaction', 'working_capital'],
  ['documents', 'DocumentRecord', 'documents'],
  ['driveFolders', 'DriveFolder', 'drive_folders'],
  ['approvals', 'ApprovalRequest', 'approvals'],
  ['notifications', 'NotificationItem', 'notifications'],
  ['auditLogs', 'AuditLogEntry', 'audit_logs'],
  ['settings', 'AppSettings', 'settings'],
];

// ---------------------------------------------------------------------------
// 4. Validasi
// ---------------------------------------------------------------------------
const migrationSql = fs
  .readdirSync(MIGRATION_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => fs.readFileSync(path.join(MIGRATION_DIR, f), 'utf8'))
  .join('\n');

const tables = parseSqlTables(migrationSql);
const defaultedNotNull = collectDefaultedNotNull(tables);
const interfaces = parseInterfaces(fs.readFileSync(TYPES_FILE, 'utf8'));

let errorCount = 0;
let warnCount = 0;
const report = [];
const err = (msg) => {
  report.push(`[ERROR] ${msg}`);
  errorCount++;
};
const warn = (msg) => {
  report.push(`[WARN ] ${msg}`);
  warnCount++;
};

report.push('='.repeat(78));
report.push('VALIDASI SKEMA ARMS  <->  SUPABASE POSTGRES');
report.push('='.repeat(78));
report.push('');

// 4a. Manifest hasil generate harus up to date
report.push('# 1. Manifest kolom (src/utils/supabaseSchemaColumns.ts)');
if (!fs.existsSync(GENERATED_FILE)) {
  err('src/utils/supabaseSchemaColumns.ts belum di-generate. Jalankan: npm run db:columns');
} else {
  const generated = fs.readFileSync(GENERATED_FILE, 'utf8');
  let stale = 0;
  for (const [t, cols] of Object.entries(tables)) {
    const line = generated.match(new RegExp(`\\n  ${t}: \\[(.*?)\\],`));
    if (!line) {
      err(`tabel '${t}' belum ada di manifest hasil generate`);
      stale++;
      continue;
    }
    const listed = line[1].split(',').map((s) => s.trim().replace(/'/g, ''));
    const missing = cols.map((c) => c.name).filter((c) => !listed.includes(c));
    if (missing.length) {
      err(`manifest tabel '${t}' ketinggalan kolom: ${missing.join(', ')} (jalankan npm run db:columns)`);
      stale++;
    }
  }
  if (!stale) report.push('  OK - manifest sinkron dengan migrations/.');
}
report.push('');

// 4b. schema.sql vs migrations
report.push('# 2. supabase/schema.sql vs supabase/migrations/');
if (fs.existsSync(SCHEMA_FILE)) {
  const schemaTables = parseSqlTables(fs.readFileSync(SCHEMA_FILE, 'utf8'));
  let diffs = 0;
  for (const [t, cols] of Object.entries(schemaTables)) {
    const mig = tables[t];
    if (!mig) {
      warn(`tabel '${t}' ada di schema.sql tapi tidak ada di migrations/`);
      diffs++;
      continue;
    }
    const a = cols.map((c) => c.name).sort().join(',');
    const b = mig.map((c) => c.name).sort().join(',');
    if (a !== b) {
      warn(`kolom tabel '${t}' berbeda antara schema.sql dan migrations/`);
      diffs++;
    }
  }
  if (!diffs) report.push('  OK - kedua file mendefinisikan kolom yang sama.');
} else {
  report.push('  (schema.sql tidak ditemukan, dilewati)');
}
report.push('');

// 4c. Field TS -> kolom SQL + round trip
report.push('# 3. Field TypeScript -> kolom Postgres');
let fieldIssue = 0;
for (const [collection, ifaceName, tableName] of COLLECTION_MAP) {
  const iface = interfaces[ifaceName];
  const cols = tables[tableName];
  if (!iface) {
    err(`interface '${ifaceName}' (collection ${collection}) tidak ditemukan di src/types/arms.ts`);
    fieldIssue++;
    continue;
  }
  if (!cols) {
    err(`tabel '${tableName}' (collection ${collection}) tidak ada di migrations/`);
    fieldIssue++;
    continue;
  }
  const colNames = new Set(cols.map((c) => c.name));

  for (const f of iface) {
    const snake = camelToSnake(f.name);

    if (!colNames.has(snake)) {
      const flat = snake.replace(/_/g, '');
      const candidate = [...colNames].find((c) => c.replace(/_/g, '') === flat);
      err(
        `${collection}: ${ifaceName}.${f.name} -> '${snake}' tidak ada di public.${tableName}` +
          (candidate
            ? `. Kolom sebenarnya '${candidate}' -> tambahkan override di CAMEL_TO_SNAKE_OVERRIDES`
            : `. Tidak ada kolom yang mirip -> tambahkan kolom via migrasi baru`)
      );
      fieldIssue++;
      continue;
    }

    // round trip: camel -> snake -> camel harus kembali persis
    const back = snakeToCamel(snake);
    if (back !== f.name) {
      err(
        `${collection}: round-trip key rusak, ${ifaceName}.${f.name} -> '${snake}' -> '${back}'. ` +
          `Fetch dari Supabase akan menghasilkan field '${back}' dan UI tidak membacanya.`
      );
      fieldIssue++;
    }
  }

  // kolom NOT NULL tanpa DEFAULT wajib ada di tipe TS
  for (const c of cols) {
    if (c.notNull && !c.hasDefault && c.name !== 'id') {
      const has = iface.some((f) => camelToSnake(f.name) === c.name);
      if (!has) {
        warn(
          `${tableName}.${c.name} NOT NULL tanpa DEFAULT, tapi ${ifaceName} tidak punya field '${snakeToCamel(
            c.name
          )}' -> upsert bisa gagal`
        );
      }
    }
  }
}
if (!fieldIssue) report.push('  OK - semua field punya kolom padanan dan round-trip aman.');
report.push('');

// 4d. Kolom NOT NULL DEFAULT (rawan dikirimi null eksplisit)
report.push('# 4. Kolom NOT NULL + DEFAULT (payload TIDAK boleh mengirim null eksplisit)');
report.push('  Ditangani otomatis oleh toSupabaseRow() lewat SUPABASE_DEFAULTED_NOT_NULL.');
for (const [, , tableName] of COLLECTION_MAP) {
  const list = defaultedNotNull[tableName];
  if (list?.length) report.push(`    ${tableName}: ${list.join(', ')}`);
}
report.push('');

// 4e. Urutan push vs foreign key
report.push('# 5. Urutan push vs foreign key');
const orderIndex = new Map(COLLECTION_MAP.map(([, , t], i) => [t, i]));
let fkIssue = 0;
for (const [, , tableName] of COLLECTION_MAP) {
  for (const c of tables[tableName] || []) {
    if (!c.fk) continue;
    const parent = c.fk[0];
    if (!orderIndex.has(parent)) continue;
    if (parent !== tableName && orderIndex.get(parent) > orderIndex.get(tableName)) {
      err(`${tableName}.${c.name} -> ${parent}: tabel induk di-push SETELAH tabel anak`);
      fkIssue++;
    }
  }
}
if (!fkIssue) report.push('  OK - semua tabel induk di-push sebelum tabel anak.');
report.push('');

report.push('='.repeat(78));
report.push(`HASIL: ${errorCount} error, ${warnCount} warning`);
report.push('='.repeat(78));

console.log(report.join('\n'));
process.exit(errorCount ? 1 : 0);
