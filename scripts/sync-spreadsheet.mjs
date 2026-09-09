#!/usr/bin/env node
/**
 * Membuat workbook spreadsheet lokal tanpa Google API.
 * File output berada di storage/spreadsheets/<nama-workbook>/*.csv.
 * CSV dapat dibuka di Excel/LibreOffice atau diimpor ke Google Sheets secara manual.
 */
import fs from 'node:fs';
import path from 'node:path';

const workbook = process.argv[2] || 'arms-control-tower';
const root = path.resolve('storage', 'spreadsheets', workbook.replace(/[^a-zA-Z0-9_-]/g, '_'));
const tabs = ['Users','Clients','Personnel','Services','Fees','Contracts','Leads','Customers','Cases','Assignments','SK','Lawyer_Notices','Communication_Log','Assets','Collections','Asset_Recoveries','Payments','Funding','Expenses','Settlements','Ledger','Cash','Petty_Cash','Working_Capital','Documents','Drive_Folders','Approvals','Notifications','Audit_Log','Settings'];
fs.mkdirSync(root, { recursive: true });
for (const tab of tabs) {
  const file = path.join(root, `${tab}.csv`);
  if (!fs.existsSync(file)) fs.writeFileSync(file, '');
}
fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify({ workbook, tabs, provider: 'local-csv', updatedAt: new Date().toISOString() }, null, 2));
console.log(`Workbook lokal siap: ${root}`);
console.log('Gunakan tombol Push Data di aplikasi untuk mengisi CSV.');
