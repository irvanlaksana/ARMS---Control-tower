/**
 * Operasi Google Sheets (Service Account) — ekspor laporan database ARMS.
 *
 * Database utama ARMS adalah Google Cloud Firestore; Google Sheets dipakai
 * sebagai EKSPORT LAPORAN opsional (bisa dibuka/dianalisis di Sheets).
 *
 * Prasyarat: spreadsheet Google di-share (akses Editor) dengan email
 * Service Account (GOOGLE_SERVICE_ACCOUNT_JSON).
 */

import { google } from 'googleapis';
import { authFor, isGoogleAuthAvailable } from './googleAuth.mjs';

const SHEET_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

/** Tab default per koleksi (harus konsisten dengan src/data/databaseConfig.ts). */
export const DEFAULT_TABS = {
  users: 'Users',
  clients: 'Clients',
  personnel: 'Personnel',
  services: 'Services',
  fees: 'Fees',
  contracts: 'Contracts',
  leads: 'Leads',
  customers: 'Customers',
  cases: 'Cases',
  assignments: 'Assignments',
  sks: 'SK',
  lawyerNotices: 'Lawyer_Notices',
  commLogs: 'Communication_Log',
  assets: 'Assets',
  collections: 'Collections',
  assetRecoveries: 'Asset_Recoveries',
  payments: 'Payments',
  danaTalangan: 'Funding',
  expenses: 'Expenses',
  settlements: 'Settlements',
  ledger: 'Ledger',
  cashAccounts: 'Cash',
  pettyCash: 'Petty_Cash',
  workingCapital: 'Working_Capital',
  documents: 'Documents',
  driveFolders: 'Drive_Folders',
  approvals: 'Approvals',
  notifications: 'Notifications',
  auditLogs: 'Audit_Log',
  settings: 'Settings',
};

const NOT_CONFIGURED = {
  success: false,
  configured: false,
  error:
    'Google Sheets API belum dikonfigurasi. Tambahkan GOOGLE_SERVICE_ACCOUNT_JSON di Netlify, lalu share spreadsheet (Editor) dengan email Service Account.',
};

/** Ambil ID dari ID atau URL spreadsheet. */
export function normalizeSpreadsheetId(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;
  const m = trimmed.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : trimmed;
}

function resolveTab(key, tabs) {
  const value = (tabs && tabs[key]) || DEFAULT_TABS[key] || key;
  return String(value).trim().replace(/[\\/*?:\[\]]/g, '_').slice(0, 100);
}

/**
 * POST /api/sheets/setup
 * Buat/verifikasi seluruh tab database di spreadsheet Google.
 */
export async function sheetsSetup({ spreadsheetId, tabs } = {}) {
  const id = normalizeSpreadsheetId(spreadsheetId);
  if (!id) return { success: false, error: 'Missing spreadsheetId' };
  if (!isGoogleAuthAvailable()) return NOT_CONFIGURED;

  try {
    const auth = authFor([SHEET_SCOPE]);
    const sheets = google.sheets({ version: 'v4', auth });

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: id });
    const existingSheets = (spreadsheet.data.sheets || []).map((s) => s.properties?.title);

    const tabMap = { ...DEFAULT_TABS, ...(tabs || {}) };
    const requests = [];
    for (const tab of Object.values(tabMap)) {
      const safeTab = resolveTab(tab, null) || tab;
      if (!existingSheets.includes(safeTab)) {
        requests.push({ addSheet: { properties: { title: safeTab } } });
      }
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: id,
        requestBody: { requests },
      });
    }

    return {
      success: true,
      configured: true,
      spreadsheetId: id,
      message: `Successfully verified/created all ${Object.keys(tabMap).length} sheets in Google Spreadsheet!`,
      sheets: Object.values(tabMap),
    };
  } catch (err) {
    console.error('Sheets Setup Error:', err?.message || err);
    let userFriendlyError = String(err?.message || 'Failed to setup Google Sheets.');
    if (err?.response?.status === 404) {
      userFriendlyError = 'Spreadsheet tidak ditemukan. Periksa Google Spreadsheet ID dan pastikan file ada di Drive akun/Workspace yang di-share ke Service Account.';
    } else if (err?.response?.status === 403) {
      userFriendlyError = 'Izin ditolak. Share spreadsheet dengan email Service Account sebagai Editor, lalu coba lagi.';
    }
    return { success: false, configured: true, error: userFriendlyError };
  }
}

/**
 * POST /api/sheets/sync
 * Tulis data seluruh koleksi ke tab spreadsheet (ekspor laporan).
 */
export async function sheetsSync({ spreadsheetId, data, tabs } = {}) {
  const id = normalizeSpreadsheetId(spreadsheetId);
  if (!id || !data || typeof data !== 'object') {
    return { success: false, error: 'Missing spreadsheetId or data' };
  }
  if (!isGoogleAuthAvailable()) return NOT_CONFIGURED;

  try {
    const auth = authFor([SHEET_SCOPE]);
    const sheets = google.sheets({ version: 'v4', auth });

    const updatedTabs = [];
    const counts = {};

    for (const [key, raw] of Object.entries(data)) {
      const tabName = resolveTab(key, tabs);
      let records = raw;

      // settings: satu objek -> baris {key, value}
      if (key === 'settings' && records && typeof records === 'object' && !Array.isArray(records)) {
        records = Object.entries(records).map(([k, value]) => ({ key: k, value: typeof value === 'object' ? JSON.stringify(value) : value }));
      }

      if (!Array.isArray(records)) records = [];
      counts[key] = records.length;

      if (records.length === 0) continue;

      const headers = Array.from(
        new Set(records.flatMap((record) => Object.keys(record || {})))
      );
      const rows = [
        headers,
        ...records.map((r) =>
          headers.map((h) => {
            const val = r?.[h];
            if (val === undefined || val === null) return '';
            if (typeof val === 'object') return JSON.stringify(val);
            return String(val);
          })
        ),
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId: id,
        range: `${tabName}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: rows },
      });
      updatedTabs.push(tabName);
    }

    return {
      success: true,
      configured: true,
      spreadsheetId: id,
      updatedTabs,
      counts,
      syncedAt: new Date().toISOString(),
      provider: 'google-sheets-api',
    };
  } catch (err) {
    console.error('Sheets Sync Error:', err?.message || err);
    let userFriendlyError = String(err?.message || 'Error syncing to Google Sheets.');
    if (err?.response?.status === 403) {
      userFriendlyError = 'Izin ditolak. Share spreadsheet dengan email Service Account sebagai Editor, lalu coba lagi.';
    } else if (err?.response?.status === 404) {
      userFriendlyError = 'Spreadsheet tidak ditemukan. Periksa Google Spreadsheet ID.';
    }
    return { success: false, configured: true, error: userFriendlyError };
  }
}

/**
 * POST /api/sheets/fetch
 * Baca kembali data dari tab spreadsheet (verifikasi / import).
 */
export async function sheetsFetch({ spreadsheetId, tabs } = {}) {
  const id = normalizeSpreadsheetId(spreadsheetId);
  if (!id) return { success: false, error: 'Missing spreadsheetId' };
  if (!isGoogleAuthAvailable()) return NOT_CONFIGURED;

  try {
    const auth = authFor([SHEET_SCOPE]);
    const sheets = google.sheets({ version: 'v4', auth });

    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: id,
      fields: 'sheets.properties.title',
    });
    const availableTabs = new Set(
      (spreadsheet.data.sheets || []).map((s) => s.properties?.title)
    );

    const data = {};
    for (const [key, defaultTab] of Object.entries(DEFAULT_TABS)) {
      const tabName = resolveTab(key, tabs);
      if (!availableTabs.has(tabName)) continue;

      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: id,
        range: tabName,
      });

      const values = result.data.values || [];
      if (values.length === 0) continue;
      const [headers, ...rest] = values;
      data[key] = rest.map((row) =>
        Object.fromEntries(headers.map((header, i) => [header, row[i] ?? '']))
      );
    }

    // settings: baris {key, value} -> objek
    if (Array.isArray(data.settings)) {
      data.settings = Object.fromEntries(
        data.settings.filter((r) => r.key).map((r) => [r.key, r.value])
      );
    }

    return {
      success: true,
      configured: true,
      spreadsheetId: id,
      data,
      provider: 'google-sheets-api',
    };
  } catch (err) {
    console.error('Sheets Fetch Error:', err?.message || err);
    return { success: false, configured: true, error: String(err?.message || 'Error reading from Google Sheets.') };
  }
}
