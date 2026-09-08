#!/usr/bin/env node
/**
 * create-google-spreadsheet.mjs — BUAT GOOGLE SPREADSHEET VIA SERVICE ACCOUNT
 * ---------------------------------------------------------------------------
 * Membuat spreadsheet Google baru (via Drive API + Service Account), membuat
 * seluruh tab database ARMS, lalu mencetak ID & URL untuk diisi di
 * Pengaturan → Database & Sheet.
 *
 * Spreadsheet yang dibuat DIMILIKI Service Account (akses penuh otomatis).
 *
 * Jalankan: npm run spreadsheet:setup ["Nama Spreadsheet"]
 */

import path from 'node:path';
import { google } from 'googleapis';
import { loadServiceAccountJson } from '../netlify/functions/lib/googleAuth.mjs';
import { DEFAULT_TABS, sheetsSetup } from '../netlify/functions/lib/sheets.mjs';

const name = process.argv[2] || `ARMS_Database_${new Date().getFullYear()}`;

async function main() {
  let creds;
  try {
    creds = loadServiceAccountJson();
  } catch (err) {
    console.error(`✘ Gagal memuat Service Account: ${err?.message || err}`);
    process.exit(1);
  }
  console.log(`✔ Service account: ${creds.client_email}`);

  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  const drive = google.drive({ version: 'v3', auth });

  // 1. Buat spreadsheet baru (Google Docs MIME)
  const created = await drive.files.create({
    requestBody: {
      name: name,
      mimeType: 'application/vnd.google-apps.spreadsheet',
    },
    fields: 'id, webViewLink',
  });
  const spreadsheetId = created.data.id;
  const url = created.data.webViewLink;
  console.log(`✔ Spreadsheet dibuat: "${name}"`);
  console.log(`  ID  : ${spreadsheetId}`);
  console.log(`  URL : ${url}`);

  // 2. Buat seluruh tab database ARMS
  console.log('• Membuat tab database ARMS...');
  const setup = await sheetsSetup({
    spreadsheetId,
    tabs: Object.fromEntries(Object.entries(DEFAULT_TABS).map(([k, v]) => [k, v])),
  });
  if (!setup.success) {
    console.error(`✘ Gagal membuat tab: ${setup.error}`);
    process.exit(1);
  }
  console.log(`✔ ${setup.sheets?.length || 0} tab database siap (Users, Clients, Personnel, ..., Settings)`);

  console.log('');
  console.log('='.repeat(60));
  console.log('Selesai! Salin ID di bawah ke aplikasi:');
  console.log('Pengaturan → Database & Sheet → Google Spreadsheet ID');
  console.log('='.repeat(60));
  console.log(spreadsheetId);
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error(`✘ GAGAL: ${err?.message || err}`);
  process.exit(1);
});
