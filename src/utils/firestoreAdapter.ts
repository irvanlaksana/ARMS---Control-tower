/**
 * Firestore Data Adapter (hasil migrasi dari Supabase Adapter)
 * ---------------------------------------------------------------------------
 * Menjembatani objek ARMS (TypeScript, camelCase) dengan dokumen Firestore.
 *
 * Prinsip migrasi:
 *  - Dokumentasi Firestore MENYIMPAN FIELD CAMELCASE — identik dengan tipe
 *    TypeScript ARMS, sehingga tidak ada konversi nama saat read/write.
 *  - Whitelist field per koleksi diambil dari skema (dibangkitkan dari file
 *    migrasi SQL oleh scripts/generate-firestore-schema.mjs) sehingga key
 *    yang tidak dikenal dibuang, bukan membuat push seluruh koleksi gagal.
 *  - Field NOT NULL+DEFAULT tidak pernah dikirim null eksplisit; bila kosong,
 *    default aplikasi yang mengisi (pengganti trigger & constraint Postgres).
 *  - Relasi FK logis dibersihkan saat id induk tidak ada (pengganti foreign
 *    key constraint).
 */

import {
  FIRESTORE_COLLECTION_FIELDS,
  FIRESTORE_DEFAULTED_FIELDS,
  FIRESTORE_FOREIGN_KEYS,
  FIRESTORE_COLLECTIONS,
} from './firestoreSchemaColumns';
import { parseNumericString } from '../../scripts/lib/numeric.mjs';

/** Key koleksi di ARMSStore (camelCase) -> nama koleksi Firestore. */
export const STORE_TO_FIRESTORE_COLLECTION: Record<string, string> = {
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

/** Kebalikan STORE_TO_FIRESTORE_COLLECTION. */
export const FIRESTORE_COLLECTION_TO_STORE: Record<string, string> = Object.entries(
  STORE_TO_FIRESTORE_COLLECTION
).reduce<Record<string, string>>((acc, [storeKey, colName]) => {
  acc[colName] = storeKey;
  return acc;
}, {});

/**
 * Urutan sinkronisasi (master dulu, transaksi setelahnya) — dipakai agar
 * validasi FK logis memakai data induk yang sudah siap.
 */
export const ORDERED_COLLECTIONS: string[] = FIRESTORE_COLLECTIONS.map(
  (colName) => FIRESTORE_COLLECTION_TO_STORE[colName] || colName
);

// Field yang bertipe NUMERIK di skema sumber (PostgreSQL NUMERIC/INTEGER).
const NUMERIC_FIELDS = new Set<string>([
  'activeCasesCount',
  'percentageValue',
  'fixedAmount',
  'successFeePercent',
  'estimatedVolume',
  'totalInstallment',
  'principalDebtOS',
  'overdueDays',
  'lawyerNoticeCount',
  'feePercentSnapshot',
  'feeFixedSnapshot',
  'slaDays',
  'principalDebtAmount',
  'estimatedMarketValue',
  'storageFeePerDay',
  'amountCollected',
  'vehicleYear',
  'tierBaseAmount',
  'tierModifiersTotal',
  'repossessionFee',
  'companyFeePercent',
  'companyFeeAmount',
  'partnerCommissionAmount',
  'requestedAmount',
  'feeOrInterestRatePercent',
  'amount',
  'totalPaidByDebitur',
  'successFeeAmount',
  'executionFeeAmount',
  'passThroughFee',
  'tierPercent',
  'grossAgencyFee',
  'companyRevenueAmount',
  'partnerCommissionPercent',
  'totalCollected',
  'agencyFeePercent',
  'agencyFeeAmount',
  'talanganDeducted',
  'directExpensesDeducted',
  'netRemittedToClient',
  'balance',
  'amountOrValue',
  'defaultFeePercent',
  'defaultCompanyCommissionSplitPercent',
]);

// Field yang bertipe BOOLEAN.
const BOOLEAN_FIELDS = new Set<string>([
  'hasStnk',
  'hasKey',
  'isReversed',
  'isSystemDefault',
  'isRead',
  'autoSyncWithGoogleSheets',
  'enabled',
]);

// Field yang menyimpan objek/array JSON.
const JSON_FIELDS = new Set<string>([
  'stnkPhotoUrls',
  'photos',
  'manualSplits',
  'databaseConfig',
  'tierRulesJson',
]);

/**
 * Sanitasi satu nilai sesuai tipe field Firestore-nya.
 * Mengembalikan { value, skip } — skip: true bila key harus dibuang
 * (undefined atau null di field yang punya default).
 */
function sanitizeValue(field: string, input: any): { value: any; skip: boolean } {
  let val = input;

  if (val === undefined) return { value: null, skip: true };

  if (NUMERIC_FIELDS.has(field)) {
    if (val === '' || val === null) return { value: null, skip: true };
    if (typeof val === 'string') {
      const parsed = parseNumericString(val);
      if (isNaN(parsed)) return { value: null, skip: true };
      val = parsed;
    } else if (typeof val !== 'number') {
      return { value: null, skip: true };
    }
  } else if (BOOLEAN_FIELDS.has(field)) {
    if (typeof val === 'string') val = val.toLowerCase() === 'true';
    else if (val === null) return { value: null, skip: true };
    else if (typeof val !== 'boolean') val = Boolean(val);
  } else if (JSON_FIELDS.has(field)) {
    if (typeof val === 'string') {
      try {
        val = JSON.parse(val);
      } catch {
        val = null;
      }
    }
    if (val === null || val === undefined) return { value: null, skip: true };
  } else if (val === null) {
    // null di field biasa dihindari: Firestore lebih konsisten dengan key
    // yang hilang daripada field null (query WHERE field == x tak menemukan
    // document yang field-nya null).
    return { value: null, skip: true };
  }

  return { value: val, skip: false };
}

/** Hasil konversi satu record menjadi payload siap-disimpan. */
export interface FirestoreDocResult {
  /** Payload camelCase yang sudah disanitasi sesuai skema. */
  doc: Record<string, any>;
  /** Key yang dibuang karena tidak punya field padanan di koleksi tujuan. */
  droppedKeys: string[];
}

/**
 * Konversi record ARMS menjadi dokumen Firestore untuk koleksi tertentu.
 *
 * - Key tanpa field padanan dibuang (bukan bikin push seluruh koleksi gagal).
 * - Field NOT NULL+DEFAULT tidak pernah dikirim null eksplisit.
 * - `createdAt`/`updatedAt` otomatis diisi bila kosong.
 */
export function toFirestoreDoc(collection: string, obj: any): FirestoreDocResult {
  const fields = FIRESTORE_COLLECTION_FIELDS[collection];
  const defaulted = new Set<string>(FIRESTORE_DEFAULTED_FIELDS[collection] || []);
  const allowed = fields ? new Set(fields) : null;

  const doc: Record<string, any> = {};
  const droppedKeys: string[] = [];

  for (const key of Object.keys(obj || {})) {
    if (!allowed) {
      // Skema tidak diketahui -> teruskan apa adanya (sanitasi ringan).
      const { value, skip } = sanitizeValue(key, obj[key]);
      if (!skip) doc[key] = value;
      continue;
    }

    if (!allowed.has(key)) {
      droppedKeys.push(key);
      continue;
    }

    const { value, skip } = sanitizeValue(key, obj[key]);
    if (skip) continue;

    // --- Specific Fixups untuk Check Constraint (pengganti CHECK Postgres) ---
    let finalVal = value;
    if (collection === 'collections') {
      if (key === 'paymentMethod' && !['TRANSFER', 'CASH_RECEIPT', 'MEDIATION_ESCROW'].includes(finalVal)) {
        finalVal = 'TRANSFER';
      }
      if (key === 'verificationStatus' && !['PENDING_VERIFICATION', 'VERIFIED', 'REJECTED'].includes(finalVal)) {
        finalVal = 'PENDING_VERIFICATION';
      }
    } else if (collection === 'payments') {
      if (key === 'paymentMethod' && finalVal !== null) {
        if (!['TRANSFER', 'CASH'].includes(finalVal)) {
          finalVal = finalVal === 'CASH_RECEIPT' ? 'CASH' : 'TRANSFER';
        }
      }
      if (key === 'paymentType' && finalVal !== null) {
        const valid = ['DEBTOR_REPAYMENT', 'CLIENT_REMITTANCE', 'TALANGAN_REPAYMENT', 'ASSET_LIQUIDATION_PAYMENT'];
        if (!valid.includes(finalVal)) finalVal = 'DEBTOR_REPAYMENT';
      }
    }

    doc[key] = finalVal;
  }

  // --- Final Safety Nets untuk field wajib (default aplikasi) ---
  if (collection === 'collections') {
    if (!doc.paymentMethod) doc.paymentMethod = 'TRANSFER';
    if (!doc.verificationStatus) doc.verificationStatus = 'PENDING_VERIFICATION';
  } else if (collection === 'payments') {
    if (!doc.paymentMethod) doc.paymentMethod = 'TRANSFER';
    if (!doc.paymentType) doc.paymentType = 'DEBTOR_REPAYMENT';
    if (!doc.verificationStatus) doc.verificationStatus = 'PENDING';
  } else if (collection === 'users') {
    if (!doc.role) doc.role = 'SUPER_ADMIN_OPS';
  } else if (collection === 'clients') {
    if (!doc.clientType) doc.clientType = 'PERORANGAN';
  } else if (collection === 'fees') {
    if (!doc.feeType) doc.feeType = 'PERCENT';
  } else if (collection === 'cases') {
    if (!doc.status) doc.status = 'NEW';
  } else if (collection === 'assignments') {
    if (!doc.status) doc.status = 'PENDING';
  } else if (collection === 'lawyer_notices') {
    if (!doc.noticeType) doc.noticeType = 'SOMASI_1';
    if (!doc.status) doc.status = 'DRAFT_PROPOSED';
  } else if (collection === 'comm_logs') {
    if (!doc.channel) doc.channel = 'WHATSAPP';
  } else if (collection === 'assets') {
    if (!doc.category) doc.category = 'MOTORCYCLE';
    if (!doc.physicalStatus) doc.physicalStatus = 'UNLOCATED';
  }

  // Timestamp default (pengganti DEFAULT NOW() & trigger Postgres).
  const now = new Date().toISOString();
  if (!doc.createdAt) doc.createdAt = now;
  if (defaulted.has('updatedAt') && !doc.updatedAt) doc.updatedAt = now;

  return { doc, droppedKeys };
}

/**
 * Bersihkan foreign key logis yang menggantung.
 *
 * Firestore tidak punya constraint FK, tetapi data ARMS tetap harus konsisten
 * (case tidak boleh menunjuk clientId yang tidak ada). Bila id induk tidak
 * ditemukan dan field boleh null -> kosongkan; bila tidak boleh -> lewati row.
 *
 * @param knownIds id yang diketahui ada per koleksi (dari store terkini).
 * @returns true bila dokumen aman disimpan.
 */
export function sanitizeForeignKeys(
  collection: string,
  doc: Record<string, any>,
  knownIds: Record<string, Set<string>>,
  warnings: string[]
): boolean {
  const fks = FIRESTORE_FOREIGN_KEYS[collection];
  if (!fks) return true;

  for (const [field, fk] of Object.entries(fks)) {
    const value = doc[field];
    if (value === null || value === undefined || value === '') {
      if (value === '') delete doc[field];
      continue;
    }
    const parentIds = knownIds[fk.table];
    if (!parentIds) continue; // koleksi induk tidak ikut di-push run ini
    if (parentIds.has(String(value))) continue;

    if (fk.nullable) {
      warnings.push(
        `${collection}.${field}: id '${value}' tidak ada di koleksi ${fk.table}, dikosongkan (doc id: ${doc.id ?? '-'})`
      );
      delete doc[field];
    } else {
      warnings.push(
        `${collection}: doc '${doc.id ?? '-'}' dilewati karena ${field}='${value}' tidak ada di ${fk.table}`
      );
      return false;
    }
  }
  return true;
}

/** Buang duplikat id dalam satu batch (document ID Firestore unik). */
export function dedupeById(docs: Record<string, any>[], collection: string, warnings: string[]) {
  const map = new Map<string, Record<string, any>>();
  let duplicates = 0;
  for (const doc of docs) {
    const id = String(doc.id ?? '');
    if (!id) continue;
    if (map.has(id)) duplicates++;
    map.set(id, doc);
  }
  if (duplicates > 0) {
    warnings.push(`${collection}: ${duplicates} dokumen duplikat id digabung (dipakai data terakhir)`);
  }
  return [...map.values()];
}
