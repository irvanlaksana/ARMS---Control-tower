#!/usr/bin/env node

/**
 * ARMS - Supabase Automatic Database Setup & Migration Script
 * 
 * Usage:
 *   node scripts/setup-supabase.mjs
 *   node scripts/setup-supabase.mjs "postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
 *   npm run db:setup
 * 
 * Flags:
 *   --schema-only : Only run schema.sql (create tables, indexes, triggers, policies)
 *   --seed-only   : Only run seed.sql (insert initial data)
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Read flags
const args = process.argv.slice(2);
const isSchemaOnly = args.includes('--schema-only');
const isSeedOnly = args.includes('--seed-only');
const customUrlArg = args.find(arg => !arg.startsWith('--'));

// Resolve Database Connection String
const dbUrl = customUrlArg || 
  process.env.DATABASE_URL || 
  process.env.SUPABASE_DB_URL || 
  process.env.POSTGRES_URL || 
  process.env.DIRECT_URL;

console.log('\n=============================================================');
console.log('🚀 ARMS - AUTOMATIC SUPABASE DATABASE SETUP');
console.log('=============================================================\n');

if (!dbUrl) {
  console.error('❌ ERROR: Database Connection String tidak ditemukan!\n');
  console.log('Cara Penggunaan:');
  console.log('  1. Melalui Parameter Langsung:');
  console.log('     node scripts/setup-supabase.mjs "postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"\n');
  console.log('  2. Melalui file .env:');
  console.log('     Tambahkan baris berikut di file .env:');
  console.log('     DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"\n');
  console.log('     Lalu jalankan:');
  console.log('     npm run db:setup\n');
  console.log('💡 Tips: Anda dapat mengambil Connection String di Supabase Dashboard:');
  console.log('   Project Settings -> Database -> Connection string -> URI (Transaction / Session mode)\n');
  process.exit(1);
}

// Mask sensitive password in logs
const maskedDbUrl = dbUrl.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:********@');
console.log(`🔌 Menghubungkan ke Supabase: ${maskedDbUrl}`);

const client = new Client({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function runSetup() {
  try {
    await client.connect();
    console.log('✅ Berhasil terhubung ke Supabase PostgreSQL Database!\n');

    const schemaPath = path.join(rootDir, 'supabase', 'schema.sql');
    const seedPath = path.join(rootDir, 'supabase', 'seed.sql');

    // 1. Eksekusi Skema Tabel (schema.sql)
    if (!isSeedOnly) {
      if (!fs.existsSync(schemaPath)) {
        throw new Error(`File skema tidak ditemukan di: ${schemaPath}`);
      }
      console.log('📄 [1/2] Mengeksekusi supabase/schema.sql (Membuat 30 tabel, indeks, triggers, RLS)...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schemaSql);
      console.log('✅ Skema 30 tabel berhasil dibuat di Supabase!\n');
    }

    // 2. Eksekusi Data Awal (seed.sql)
    if (!isSchemaOnly) {
      if (!fs.existsSync(seedPath)) {
        throw new Error(`File seed data tidak ditemukan di: ${seedPath}`);
      }
      console.log('🌱 [2/2] Mengeksekusi supabase/seed.sql (Memasukkan data awal sistem ARMS)...');
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await client.query(seedSql);
      console.log('✅ Data awal berhasil diisi ke dalam tabel Supabase!\n');
    }

    // 3. Verifikasi Tabel yang Telah Dibuat
    console.log('🔍 Memverifikasi daftar tabel di schema public...');
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tableNames = res.rows.map(r => r.table_name);
    console.log(`\n🎉 SELESAI! Ditemukan ${tableNames.length} tabel aktif di Supabase:\n`);

    tableNames.forEach((name, idx) => {
      console.log(`  ${String(idx + 1).padStart(2, '0')}. public.${name}`);
    });

    console.log('\n=============================================================');
    console.log('✨ Sistem ARMS Control Tower siap digunakan dengan Supabase!');
    console.log('=============================================================\n');

  } catch (err) {
    console.error('\n❌ Terjadi kesalahan saat membuat tabel di Supabase:\n', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSetup();
