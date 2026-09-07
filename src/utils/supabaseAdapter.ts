/**
 * Supabase Data Adapter
 * Converts objects between ARMS TypeScript (camelCase) and Supabase PostgreSQL (snake_case)
 * Handles type sanitization (empty strings to null for numbers and dates).
 */

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

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
    let val = obj[key];

    // Handle undefined
    if (val === undefined) {
      val = null;
    }

    // Convert empty strings in numeric/date columns to null
    if (NUMERIC_COLUMNS.has(snakeKey)) {
      if (val === '' || val === null || val === undefined) {
        val = null;
      } else if (typeof val === 'string') {
        const parsed = Number(val.replace(/[^\d.-]/g, ''));
        val = isNaN(parsed) ? null : parsed;
      }
    } else if (DATE_COLUMNS.has(snakeKey)) {
      if (val === '' || val === null || val === undefined) {
        val = null;
      } else if (typeof val === 'string' && val.trim() === '') {
        val = null;
      }
    } else if (BOOLEAN_COLUMNS.has(snakeKey)) {
      if (typeof val === 'string') {
        val = val.toLowerCase() === 'true';
      } else if (val === null || val === undefined) {
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

    newObj[snakeKey] = val;
  }
  return newObj;
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
    const camelKey = snakeToCamel(key);
    newObj[camelKey] = obj[key];
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
