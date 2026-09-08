/**
 * Supabase Data Adapter
 * ---------------------------------------------------------------------------
 * Menjembatani objek ARMS (TypeScript, camelCase) dengan tabel Supabase
 * PostgreSQL (snake_case), termasuk sanitasi tipe data.
 *
 * Tiga sumber error yang dicegah di sini:
 *  1. "Could not find the 'xxx' column of 'yyy' in the schema cache"
 *     -> penamaan hasil konversi camelCase->snake_case tidak sama dengan kolom
 *        asli di Postgres (mis. gDriveFolderUrl -> g_drive_folder_url padahal
 *        kolomnya bernama gdrive_folder_url). Ditangani oleh
 *        CAMEL_TO_SNAKE_OVERRIDES + filter kolom SUPABASE_TABLE_COLUMNS.
 *  2. "null value in column ... violates not-null constraint"
 *     -> field undefined/'' dikirim sebagai null eksplisit ke kolom NOT NULL
 *        yang punya DEFAULT (created_at, updated_at, timestamp, status, dll).
 *        Postgres hanya memakai DEFAULT bila key TIDAK dikirim, sehingga key
 *        seperti itu kini dihapus dari payload.
 *  3. "violates foreign key constraint"
 *     -> ditangani di supabaseService (pembersihan FK menggantung + urutan push).
 */

import {
  SUPABASE_TABLE_COLUMNS,
  SUPABASE_DEFAULTED_NOT_NULL,
} from './supabaseSchemaColumns';

/**
 * Penamaan khusus yang TIDAK bisa dihasilkan oleh aturan konversi otomatis.
 * key = nama field TypeScript, value = nama kolom Postgres yang sebenarnya.
 */
export const CAMEL_TO_SNAKE_OVERRIDES: Record<string, string> = {
  gDriveFolderUrl: 'gdrive_folder_url',
  gDriveFolderId: 'gdrive_folder_id',
  gDriveFolderName: 'gdrive_folder_name',
};

/** Kebalikan dari CAMEL_TO_SNAKE_OVERRIDES, untuk konversi hasil SELECT. */
export const SNAKE_TO_CAMEL_OVERRIDES: Record<string, string> = Object.entries(
  CAMEL_TO_SNAKE_OVERRIDES
).reduce<Record<string, string>>((acc, [camel, snake]) => {
  acc[snake] = camel;
  return acc;
}, {});

/**
 * camelCase -> snake_case dengan penanganan akronim.
 * principalDebtOS -> principal_debt_os   (bukan principal_debt_o_s)
 * policeNoVIN     -> police_no_vin       (bukan police_no_v_i_n)
 */
export function camelToSnake(str: string): string {
  if (CAMEL_TO_SNAKE_OVERRIDES[str]) return CAMEL_TO_SNAKE_OVERRIDES[str];
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * snake_case -> camelCase, konsisten dengan camelToSnake di atas.
 * principal_debt_os -> principalDebtOS
 * police_no_vin     -> policeNoVIN
 * gdrive_folder_url -> gDriveFolderUrl
 */
export function snakeToCamel(str: string): string {
  if (SNAKE_TO_CAMEL_OVERRIDES[str]) return SNAKE_TO_CAMEL_OVERRIDES[str];
  const camel = str.replace(/_([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());
  return REVERSE_ACRONYM_FIELDS[camel] || camel;
}

/**
 * Field TS yang mengandung akronim kapital. Hasil snakeToCamel default
 * ("principalDebtOs") harus dikembalikan ke bentuk aslinya.
 */
const REVERSE_ACRONYM_FIELDS: Record<string, string> = {
  principalDebtOs: 'principalDebtOS',
  policeNoVin: 'policeNoVIN',
};

// Columns that are NUMERIC / INTEGER in PostgreSQL
const NUMERIC_COLUMNS = new Set([
  'active_cases_count',
  'percentage_value',
  'fixed_amount',
  'success_fee_percent',
  'estimated_volume',
  'total_installment',
  'principal_debt_os',
  'overdue_days',
  'lawyer_notice_count',
  'fee_percent_snapshot',
  'fee_fixed_snapshot',
  'sla_days',
  'principal_debt_amount',
  'estimated_market_value',
  'storage_fee_per_day',
  'amount_collected',
  'vehicle_year',
  'tier_base_amount',
  'tier_modifiers_total',
  'repossession_fee',
  'company_fee_percent',
  'company_fee_amount',
  'partner_commission_amount',
  'requested_amount',
  'fee_or_interest_rate_percent',
  'amount',
  'total_paid_by_debitur',
  'success_fee_amount',
  'execution_fee_amount',
  'pass_through_fee',
  'tier_percent',
  'gross_agency_fee',
  'company_revenue_amount',
  'partner_commission_percent',
  'total_collected',
  'agency_fee_percent',
  'agency_fee_amount',
  'talangan_deducted',
  'direct_expenses_deducted',
  'net_remitted_to_client',
  'balance',
  'amount_or_value',
  'default_fee_percent',
  'default_company_commission_split_percent',
]);

// Columns that are DATE / TIMESTAMPTZ in PostgreSQL
const DATE_COLUMNS = new Set([
  'last_login',
  'created_at',
  'updated_at',
  'effective_date',
  'start_date',
  'end_date',
  'approved_at',
  'reviewed_at',
  'disbursed_date',
  'repay_target_date',
  'partner_transfer_date',
  'expense_date',
  'settlement_date',
  'date',
  'last_updated',
  'transaction_date',
  'uploaded_at',
  'timestamp',
  'last_synced_at',
  'assigned_date',
  'target_date',
  'issued_date',
  'expiry_date',
  'requested_date',
  'log_date',
  'next_follow_up_date',
  'recovered_date',
  'collection_date',
  'recovery_date',
  'payment_date',
]);

// Columns that are BOOLEAN in PostgreSQL
const BOOLEAN_COLUMNS = new Set([
  'has_stnk',
  'has_key',
  'is_reversed',
  'is_system_default',
  'is_read',
  'auto_sync_with_google_sheets',
  'enabled',
]);

// Columns that are JSONB in PostgreSQL
const JSON_COLUMNS = new Set([
  'stnk_photo_urls',
  'photos',
  'manual_splits',
  'database_config',
]);

/**
 * Convert a JavaScript object with camelCase keys to snake_case for PostgreSQL
 * Cleans empty strings and converts types appropriately.
 *
 * Catatan: fungsi ini TIDAK tahu tabel tujuan, jadi tidak memfilter kolom.
 * Untuk payload upsert gunakan `toSupabaseRow(table, obj)`.
 */
export function toSnakeCaseRecord(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCaseRecord);
  }
  const newObj: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const snakeKey = camelToSnake(key);
    newObj[snakeKey] = sanitizeValue(snakeKey, obj[key]);
  }
  return newObj;
}

/** Sanitasi satu nilai sesuai tipe kolom Postgres-nya. */
function sanitizeValue(snakeKey: string, input: any): any {
  let val = input;

  if (val === undefined) val = null;

  if (NUMERIC_COLUMNS.has(snakeKey)) {
    if (val === '' || val === null) {
      val = null;
    } else if (typeof val === 'string') {
      const parsed = Number(val.replace(/[^\d.-]/g, ''));
      val = isNaN(parsed) ? null : parsed;
    }
  } else if (DATE_COLUMNS.has(snakeKey)) {
    if (val === null || (typeof val === 'string' && val.trim() === '')) {
      val = null;
    }
  } else if (BOOLEAN_COLUMNS.has(snakeKey)) {
    if (typeof val === 'string') {
      val = val.toLowerCase() === 'true';
    } else if (val === null) {
      val = false;
    }
  } else if (JSON_COLUMNS.has(snakeKey)) {
    if (typeof val === 'string') {
      try {
        val = JSON.parse(val);
      } catch {
        val = [];
      }
    }
    if (!val) val = [];
  }

  return val;
}

/** Hasil konversi satu record menjadi payload siap-upsert. */
export interface SupabaseRowResult {
  /** Payload yang sudah difilter sesuai kolom nyata di Postgres. */
  row: Record<string, any>;
  /** Key yang dibuang karena tidak punya kolom padanan di tabel tujuan. */
  droppedKeys: string[];
}

/**
 * Konversi record ARMS menjadi payload Supabase untuk tabel tertentu.
 *
 * - Key tanpa kolom padanan dibuang (bukan bikin push seluruh tabel gagal).
 * - Kolom NOT NULL yang punya DEFAULT tidak pernah dikirimi null eksplisit.
 */
export function toSupabaseRow(tableName: string, obj: any): SupabaseRowResult {
  const columns = SUPABASE_TABLE_COLUMNS[tableName];
  const defaulted = new Set(SUPABASE_DEFAULTED_NOT_NULL[tableName] || []);
  const allowed = columns ? new Set(columns) : null;

  const row: Record<string, any> = {};
  const droppedKeys: string[] = [];

  for (const key of Object.keys(obj || {})) {
    const snakeKey = camelToSnake(key);

    if (allowed && !allowed.has(snakeKey)) {
      droppedKeys.push(`${key} -> ${snakeKey}`);
      continue;
    }

    const val = sanitizeValue(snakeKey, obj[key]);

    // Jangan kirim null ke kolom NOT NULL yang punya DEFAULT: biarkan Postgres
    // yang mengisi (created_at, updated_at, timestamp, status, counter, dll).
    if (val === null && defaulted.has(snakeKey)) continue;

    // --- Specific Fixups for Check Constraints ---
    let finalVal = val;
    if (tableName === 'collections') {
      if (snakeKey === 'payment_method') {
        const valid = ['TRANSFER', 'CASH_RECEIPT', 'MEDIATION_ESCROW'];
        if (!valid.includes(finalVal)) {
          finalVal = 'TRANSFER';
        }
      }
      if (snakeKey === 'verification_status') {
        const valid = ['PENDING_VERIFICATION', 'VERIFIED', 'REJECTED'];
        if (!valid.includes(finalVal)) {
          finalVal = 'PENDING_VERIFICATION';
        }
      }
    } else if (tableName === 'payments') {
      if (snakeKey === 'payment_method') {
        const valid = ['TRANSFER', 'CASH'];
        if (!valid.includes(finalVal) && finalVal !== null) {
          finalVal = finalVal === 'CASH_RECEIPT' ? 'CASH' : 'TRANSFER';
        }
      }
      if (snakeKey === 'payment_type') {
        const valid = ['DEBTOR_REPAYMENT', 'CLIENT_REMITTANCE', 'TALANGAN_REPAYMENT', 'ASSET_LIQUIDATION_PAYMENT'];
        if (!valid.includes(finalVal) && finalVal !== null) {
          finalVal = 'DEBTOR_REPAYMENT';
        }
      }
    }

    row[snakeKey] = finalVal;
  }

  return { row, droppedKeys };
}

/**
 * Convert a Supabase row with snake_case columns to camelCase object
 */
export function toCamelCaseRecord<T = any>(obj: any): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => toCamelCaseRecord(item)) as unknown as T;
  }
  const newObj: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    newObj[snakeToCamel(key)] = obj[key];
  }
  return newObj as T;
}

/**
 * Ordered list of collections by dependency order
 */
export const ORDERED_COLLECTIONS: string[] = [
  'users',
  'clients',
  'personnel',
  'services',
  'fees',
  'contracts',
  'leads',
  'customers',
  'cases',
  'assignments',
  'sks',
  'lawyerNotices',
  'commLogs',
  'assets',
  'collections',
  'assetRecoveries',
  'danaTalangan',
  'payments',
  'expenses',
  'settlements',
  'ledger',
  'cashAccounts',
  'pettyCash',
  'workingCapital',
  'documents',
  'driveFolders',
  'approvals',
  'notifications',
  'auditLogs',
  'settings',
];

/**
 * Mapping table collection names in ARMSStore to Supabase PostgreSQL table names
 */
export const STORE_TO_SUPABASE_TABLE: Record<string, string> = {
  users: 'users',
  clients: 'clients',
  personnel: 'personnel',
  services: 'services',
  fees: 'fees',
  contracts: 'contracts',
  leads: 'leads',
  customers: 'customers',
  cases: 'cases',
  assignments: 'assignments',
  sks: 'sks',
  lawyerNotices: 'lawyer_notices',
  commLogs: 'comm_logs',
  assets: 'assets',
  collections: 'collections',
  assetRecoveries: 'asset_recoveries',
  danaTalangan: 'dana_talangan',
  payments: 'payments',
  expenses: 'expenses',
  settlements: 'settlements',
  ledger: 'ledger',
  cashAccounts: 'cash_accounts',
  pettyCash: 'petty_cash',
  workingCapital: 'working_capital',
  documents: 'documents',
  driveFolders: 'drive_folders',
  approvals: 'approvals',
  notifications: 'notifications',
  auditLogs: 'audit_logs',
  settings: 'settings',
};

/** Kebalikan STORE_TO_SUPABASE_TABLE: nama tabel -> key koleksi di ARMSStore. */
export const SUPABASE_TABLE_TO_STORE: Record<string, string> = Object.entries(
  STORE_TO_SUPABASE_TABLE
).reduce<Record<string, string>>((acc, [collection, table]) => {
  acc[table] = collection;
  return acc;
}, {});
