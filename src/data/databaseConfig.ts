import { AppSettings, DatabaseTabConfig } from '../types/arms';

/**
 * Daftar resmi seluruh database ARMS yang disinkronkan ke workbook CSV lokal.
 * `collection` = key pada ARMSStore, `tabName` = nama tab pada spreadsheet.
 */
export const DEFAULT_DATABASE_TABS: Array<Omit<DatabaseTabConfig, 'enabled' | 'totalRecords' | 'lastSyncedAt'>> = [
  { collection: 'users', label: 'Pengguna (Users)', tabName: 'Users' },
  { collection: 'clients', label: 'Klien Multifinance', tabName: 'Clients' },
  { collection: 'personnel', label: 'Karyawan & Mitra DC', tabName: 'Personnel' },
  { collection: 'services', label: 'Layanan (Services)', tabName: 'Services' },
  { collection: 'fees', label: 'Konfigurasi Fee', tabName: 'Fees' },
  { collection: 'contracts', label: 'Kontrak & Perjanjian', tabName: 'Contracts' },
  { collection: 'leads', label: 'Prospek / Lead', tabName: 'Leads' },
  { collection: 'customers', label: 'Debitur (Customers)', tabName: 'Customers' },
  { collection: 'cases', label: 'Kasus & Piutang', tabName: 'Cases' },
  { collection: 'assignments', label: 'Penugasan Lapangan', tabName: 'Assignments' },
  { collection: 'sks', label: 'Surat Kuasa / Tugas (SK)', tabName: 'SK' },
  { collection: 'lawyerNotices', label: 'Somasi & Notis Advokat', tabName: 'Lawyer_Notices' },
  { collection: 'commLogs', label: 'Log Komunikasi', tabName: 'Communication_Log' },
  { collection: 'assets', label: 'Aset / Unit Kendaraan', tabName: 'Assets' },
  { collection: 'collections', label: 'Penagihan & Penerimaan', tabName: 'Collections' },
  { collection: 'assetRecoveries', label: 'Recovery / Eksekusi Unit', tabName: 'Asset_Recoveries' },
  { collection: 'payments', label: 'Pembayaran (Payments)', tabName: 'Payments' },
  { collection: 'danaTalangan', label: 'Dana Talangan', tabName: 'Funding' },
  { collection: 'expenses', label: 'Biaya Operasional', tabName: 'Expenses' },
  { collection: 'settlements', label: 'Settlement / Remittance', tabName: 'Settlements' },
  { collection: 'ledger', label: 'Buku Besar (Ledger)', tabName: 'Ledger' },
  { collection: 'cashAccounts', label: 'Rekening Kas / Bank', tabName: 'Cash' },
  { collection: 'pettyCash', label: 'Kas Kecil (Petty Cash)', tabName: 'Petty_Cash' },
  { collection: 'workingCapital', label: 'Modal Kerja', tabName: 'Working_Capital' },
  { collection: 'documents', label: 'Dokumen Arsip', tabName: 'Documents' },
  { collection: 'driveFolders', label: 'Folder Google Drive', tabName: 'Drive_Folders' },
  { collection: 'approvals', label: 'Approval Center', tabName: 'Approvals' },
  { collection: 'notifications', label: 'Notifikasi', tabName: 'Notifications' },
  { collection: 'auditLogs', label: 'Audit Log', tabName: 'Audit_Log' },
  { collection: 'settings', label: 'Pengaturan Sistem', tabName: 'Settings' },
];

/** Kembalikan konfigurasi database dari settings; isi default jika belum ada. */
export function getDatabaseConfigs(settings?: AppSettings): DatabaseTabConfig[] {
  const existing = settings?.databaseConfig || [];
  return DEFAULT_DATABASE_TABS.map((def) => {
    const found = existing.find((c) => c.collection === def.collection);
    return {
      ...def,
      enabled: found?.enabled ?? true,
      totalRecords: found?.totalRecords,
      lastSyncedAt: found?.lastSyncedAt,
    };
  });
}

/** Konfigurasi hanya untuk database yang aktif (enabled). Settings selalu aktif. */
export function getActiveDatabaseConfigs(settings?: AppSettings): DatabaseTabConfig[] {
  return getDatabaseConfigs(settings).filter((c) => c.enabled || c.collection === 'settings');
}

/** Mapping collection -> tabName yang dipakai untuk request ke server. */
export function getDatabaseTabMap(settings?: AppSettings): Record<string, string> {
  const map: Record<string, string> = {};
  for (const cfg of getDatabaseConfigs(settings)) {
    map[cfg.collection] = cfg.tabName;
  }
  return map;
}

/** Perbarui status sync (jumlah record & waktu) pada konfigurasi yang aktif. */
export function markDatabaseSynced(settings: AppSettings, counts: Record<string, number>, syncedAt: string): AppSettings {
  const configs = getDatabaseConfigs(settings).map((cfg) => ({
    ...cfg,
    totalRecords: counts[cfg.collection] ?? cfg.totalRecords,
    lastSyncedAt: counts[cfg.collection] !== undefined || settings.googleSheetId ? syncedAt : cfg.lastSyncedAt,
  }));
  return { ...settings, databaseConfig: configs, lastSyncedAt: syncedAt };
}
