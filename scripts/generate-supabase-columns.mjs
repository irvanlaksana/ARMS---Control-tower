#!/usr/bin/env node
/**
 * generate-supabase-columns.mjs
 * ---------------------------------------------------------------------------
 * Meng-generate src/utils/supabaseSchemaColumns.ts dari file migrasi SQL.
 *
 * File hasil generate dipakai runtime (supabaseAdapter / supabaseService) untuk:
 *   - membuang key yang tidak punya kolom di Postgres
 *     (mencegah "Could not find the 'xxx' column of 'yyy' in the schema cache")
 *   - tidak mengirim null ke kolom NOT NULL DEFAULT
 *     (mencegah "null value in column ... violates not-null constraint")
 *   - membersihkan foreign key menggantung sebelum upsert
 *     (mencegah "violates foreign key constraint")
 *
 * Jalankan ulang setiap kali ada migrasi baru:  npm run db:columns
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSqlTables, collectDefaultedNotNull, collectForeignKeys } from './lib/sqlSchema.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MIGRATION_DIR = path.join(ROOT, 'supabase/migrations');
const OUT_FILE = path.join(ROOT, 'src/utils/supabaseSchemaColumns.ts');

const files = fs
  .readdirSync(MIGRATION_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const sql = files.map((f) => fs.readFileSync(path.join(MIGRATION_DIR, f), 'utf8')).join('\n');
const tables = parseSqlTables(sql);
const defaulted = collectDefaultedNotNull(tables);
const fks = collectForeignKeys(tables);

const tableNames = Object.keys(tables).sort();

const lines = [];
lines.push('/**');
lines.push(' * FILE INI DI-GENERATE OTOMATIS - JANGAN DIEDIT MANUAL.');
lines.push(' * Sumber: supabase/migrations/*.sql');
lines.push(` * Generator: npm run db:columns  (scripts/generate-supabase-columns.mjs)`);
lines.push(` * Migrasi terbaca: ${files.join(', ')}`);
lines.push(' */');
lines.push('');
lines.push('/** Daftar kolom valid tiap tabel Supabase. */');
lines.push('export const SUPABASE_TABLE_COLUMNS: Record<string, readonly string[]> = {');
for (const t of tableNames) {
  const cols = tables[t].map((c) => `'${c.name}'`).join(', ');
  lines.push(`  ${t}: [${cols}],`);
}
lines.push('};');
lines.push('');
lines.push('/**');
lines.push(' * Kolom NOT NULL yang memiliki DEFAULT.');
lines.push(' * Key-nya WAJIB dihilangkan dari payload bila nilainya null/kosong,');
lines.push(' * karena Postgres hanya memakai DEFAULT saat kolom tidak dikirim.');
lines.push(' */');
lines.push('export const SUPABASE_DEFAULTED_NOT_NULL: Record<string, readonly string[]> = {');
for (const t of tableNames) {
  if (!defaulted[t]) continue;
  lines.push(`  ${t}: [${defaulted[t].map((c) => `'${c}'`).join(', ')}],`);
}
lines.push('};');
lines.push('');
lines.push('export interface SupabaseForeignKey {');
lines.push('  /** Tabel induk yang direferensikan. */');
lines.push('  table: string;');
lines.push('  /** Kolom induk yang direferensikan. */');
lines.push('  column: string;');
lines.push('  /** true bila kolom FK boleh di-set null saat referensinya tidak ditemukan. */');
lines.push('  nullable: boolean;');
lines.push('}');
lines.push('');
lines.push('/** Relasi foreign key per tabel: tabel -> kolom -> target. */');
lines.push('export const SUPABASE_FOREIGN_KEYS: Record<string, Record<string, SupabaseForeignKey>> = {');
for (const t of tableNames) {
  if (!fks[t]) continue;
  lines.push(`  ${t}: {`);
  for (const [col, fk] of Object.entries(fks[t])) {
    lines.push(`    ${col}: { table: '${fk.table}', column: '${fk.column}', nullable: ${fk.nullable} },`);
  }
  lines.push('  },');
}
lines.push('};');
lines.push('');

fs.writeFileSync(OUT_FILE, lines.join('\n'), 'utf8');
console.log(
  `[OK] ${path.relative(ROOT, OUT_FILE)} di-generate: ${tableNames.length} tabel, ` +
    `${Object.values(tables).reduce((a, c) => a + c.length, 0)} kolom.`
);
