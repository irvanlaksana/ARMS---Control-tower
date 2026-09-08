/**
 * ARMS Data Service
 * Manages the ARMS local-state contract (localStorage single source of truth
 * for offline-first state) plus shared helpers (fee calculation, audit entry).
 *
 * Remote sync: Google Cloud Firestore via src/hooks/useFirebaseStore.ts +
 * src/services/firestoreService.ts (database utama, seluruhnya Google).
 */

import {
  User, Client, Personnel, Service, FeeConfig, Contract, Lead, Customer, Case,
  Assignment, SK, LawyerNotice, CommunicationLog, Asset, Collection, AssetRecovery, DanaTalangan,
  Payment, Expense, Settlement, LedgerEntry, CashAccount, PettyCashTransaction, WorkingCapitalTransaction, DocumentRecord,
  ApprovalRequest, NotificationItem, AuditLogEntry, AppSettings, FeeType, DriveFolder
} from '../types/arms';

import {
  INITIAL_USERS, INITIAL_CLIENTS, INITIAL_PERSONNEL, INITIAL_SERVICES,
  INITIAL_FEES, INITIAL_CONTRACTS, INITIAL_LEADS, INITIAL_CUSTOMERS,
  INITIAL_CASES, INITIAL_ASSIGNMENTS, INITIAL_SKS, INITIAL_LAWYER_NOTICES, INITIAL_COMM_LOGS,
  INITIAL_ASSETS, INITIAL_COLLECTIONS, INITIAL_ASSET_RECOVERIES,
  INITIAL_DANA_TALANGAN, INITIAL_PAYMENTS, INITIAL_EXPENSES, INITIAL_SETTLEMENTS,
  INITIAL_LEDGER, INITIAL_CASH_ACCOUNTS, INITIAL_PETTY_CASH, INITIAL_WORKING_CAPITAL, INITIAL_DOCUMENTS, INITIAL_APPROVALS,
  INITIAL_NOTIFICATIONS, INITIAL_AUDIT_LOGS, INITIAL_SETTINGS, INITIAL_DRIVE_FOLDERS, ROOT_GDRIVE_URL, ROOT_GDRIVE_ID
} from '../data/initialData';

export interface ARMSStore {
  users: User[];
  clients: Client[];
  personnel: Personnel[];
  services: Service[];
  fees: FeeConfig[];
  contracts: Contract[];
  leads: Lead[];
  customers: Customer[];
  cases: Case[];
  assignments: Assignment[];
  sks: SK[];
  lawyerNotices: LawyerNotice[];
  commLogs: CommunicationLog[];
  assets: Asset[];
  collections: Collection[];
  assetRecoveries: AssetRecovery[];
  danaTalangan: DanaTalangan[];
  payments: Payment[];
  expenses: Expense[];
  settlements: Settlement[];
  ledger: LedgerEntry[];
  cashAccounts: CashAccount[];
  pettyCash: PettyCashTransaction[];
  workingCapital: WorkingCapitalTransaction[];
  documents: DocumentRecord[];
  driveFolders: DriveFolder[];
  approvals: ApprovalRequest[];
  notifications: NotificationItem[];
  auditLogs: AuditLogEntry[];
  settings: AppSettings;
}

const STORAGE_KEY = 'ARMS_SINGLE_SOURCE_DATA_V8';

export function resetStoreToInitial(): ARMSStore {
  localStorage.removeItem(STORAGE_KEY);
  const cleanStore = normalizeStore(null);
  saveStore(cleanStore);
  return cleanStore;
}

function normalizeStore(parsed: any): ARMSStore {
  const initial = {
    users: INITIAL_USERS,
    clients: INITIAL_CLIENTS,
    personnel: INITIAL_PERSONNEL,
    services: INITIAL_SERVICES,
    fees: INITIAL_FEES,
    contracts: INITIAL_CONTRACTS,
    leads: INITIAL_LEADS,
    customers: INITIAL_CUSTOMERS,
    cases: INITIAL_CASES,
    assignments: INITIAL_ASSIGNMENTS,
    sks: INITIAL_SKS,
    lawyerNotices: INITIAL_LAWYER_NOTICES,
    commLogs: INITIAL_COMM_LOGS,
    assets: INITIAL_ASSETS,
    collections: INITIAL_COLLECTIONS,
    assetRecoveries: INITIAL_ASSET_RECOVERIES,
    danaTalangan: INITIAL_DANA_TALANGAN,
    payments: INITIAL_PAYMENTS,
    expenses: INITIAL_EXPENSES,
    settlements: INITIAL_SETTLEMENTS,
    ledger: INITIAL_LEDGER,
    cashAccounts: INITIAL_CASH_ACCOUNTS,
    pettyCash: INITIAL_PETTY_CASH,
    workingCapital: INITIAL_WORKING_CAPITAL,
    documents: INITIAL_DOCUMENTS,
    driveFolders: INITIAL_DRIVE_FOLDERS,
    approvals: INITIAL_APPROVALS,
    notifications: INITIAL_NOTIFICATIONS,
    auditLogs: INITIAL_AUDIT_LOGS,
    settings: INITIAL_SETTINGS,
  };

  if (!parsed || typeof parsed !== 'object') return initial;

  const resolvedSettings = parsed.settings && typeof parsed.settings === 'object'
    ? {
        ...initial.settings,
        ...parsed.settings,
        googleDriveFolderUrl: parsed.settings.googleDriveFolderUrl || ROOT_GDRIVE_URL,
        googleDriveFolderId: parsed.settings.googleDriveFolderId || ROOT_GDRIVE_ID,
      }
    : initial.settings;

  return {
    users: Array.isArray(parsed.users) ? parsed.users : initial.users,
    clients: Array.isArray(parsed.clients) ? parsed.clients : initial.clients,
    personnel: Array.isArray(parsed.personnel) ? parsed.personnel : initial.personnel,
    services: Array.isArray(parsed.services) 
      ? [
          ...parsed.services,
          ...INITIAL_SERVICES.filter(initSrv => !parsed.services.some((s: any) => s.id === initSrv.id || s.category === initSrv.category))
        ]
      : initial.services,
    fees: Array.isArray(parsed.fees) ? parsed.fees : initial.fees,
    contracts: Array.isArray(parsed.contracts) ? parsed.contracts : initial.contracts,
    leads: Array.isArray(parsed.leads) ? parsed.leads : initial.leads,
    customers: Array.isArray(parsed.customers) ? parsed.customers : initial.customers,
    cases: Array.isArray(parsed.cases) ? parsed.cases : initial.cases,
    assignments: Array.isArray(parsed.assignments) ? parsed.assignments : initial.assignments,
    sks: Array.isArray(parsed.sks) ? parsed.sks : initial.sks,
    lawyerNotices: Array.isArray(parsed.lawyerNotices) ? parsed.lawyerNotices : initial.lawyerNotices,
    commLogs: Array.isArray(parsed.commLogs) ? parsed.commLogs : initial.commLogs,
    assets: Array.isArray(parsed.assets) ? parsed.assets : initial.assets,
    collections: Array.isArray(parsed.collections) ? parsed.collections : initial.collections,
    assetRecoveries: Array.isArray(parsed.assetRecoveries) ? parsed.assetRecoveries : initial.assetRecoveries,
    danaTalangan: Array.isArray(parsed.danaTalangan) ? parsed.danaTalangan : initial.danaTalangan,
    payments: Array.isArray(parsed.payments) ? parsed.payments : initial.payments,
    expenses: Array.isArray(parsed.expenses) ? parsed.expenses : initial.expenses,
    settlements: Array.isArray(parsed.settlements) ? parsed.settlements : initial.settlements,
    ledger: Array.isArray(parsed.ledger) ? parsed.ledger : initial.ledger,
    cashAccounts: Array.isArray(parsed.cashAccounts) ? parsed.cashAccounts : initial.cashAccounts,
    pettyCash: Array.isArray(parsed.pettyCash) ? parsed.pettyCash : initial.pettyCash,
    workingCapital: Array.isArray(parsed.workingCapital) ? parsed.workingCapital : initial.workingCapital,
    documents: Array.isArray(parsed.documents) ? parsed.documents : initial.documents,
    driveFolders: Array.isArray(parsed.driveFolders) && parsed.driveFolders.length > 0
      ? parsed.driveFolders
      : initial.driveFolders,
    approvals: Array.isArray(parsed.approvals) ? parsed.approvals : initial.approvals,
    notifications: Array.isArray(parsed.notifications) ? parsed.notifications : initial.notifications,
    auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : initial.auditLogs,
    settings: resolvedSettings,
  };
}

export function getStoredStore(): ARMSStore | null {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return normalizeStore(parsed);
    } catch (e) {
      console.error('Failed to parse saved ARMS data', e);
    }
  }
  return null;
}

export function initializeARMSStore(): ARMSStore {
  return getInitialStore();
}

export function getInitialStore(): ARMSStore {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return normalizeStore(parsed);
    } catch (e) {
      console.error('Failed to parse saved ARMS data', e);
    }
  }
  return normalizeStore(null);
}

export function saveStore(store: ARMSStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/**
 * Fee Calculation Helper (No hardcoding - uses fee snapshot or custom configuration)
 */
export function calculateAgencyFee(
  amount: number,
  feeType: FeeType,
  feePercent?: number,
  feeFixed?: number
): { feeAmount: number; breakdown: string } {
  if (feeType === 'PERCENT' && feePercent) {
    const feeAmount = (amount * feePercent) / 100;
    return { feeAmount, breakdown: `${feePercent}% of Rp ${amount.toLocaleString('id-ID')}` };
  }
  
  if (feeType === 'FIXED' && feeFixed) {
    return { feeAmount: feeFixed, breakdown: `Fixed Fee Rp ${feeFixed.toLocaleString('id-ID')}` };
  }

  if (feeType === 'SUCCESS_FEE') {
    const percentPart = feePercent ? (amount * feePercent) / 100 : 0;
    const fixedPart = feeFixed || 0;
    const feeAmount = percentPart + fixedPart;
    return {
      feeAmount,
      breakdown: `Success Fee (${feePercent || 0}% = Rp ${percentPart.toLocaleString('id-ID')}) + Base (Rp ${fixedPart.toLocaleString('id-ID')})`
    };
  }

  // Default custom fallback calculation
  const defaultPercent = feePercent || 15;
  const feeAmount = (amount * defaultPercent) / 100;
  return { feeAmount, breakdown: `Custom Formula (${defaultPercent}% default)` };
}

/**
 * Creates an Audit Log Entry
 */
export function createAuditEntry(
  username: string,
  userRole: any,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'PAYMENT' | 'EXPORT' | 'FINANCIAL_REVERSAL',
  moduleName: string,
  targetId: string,
  details: string
): AuditLogEntry {
  return {
    id: `AUD-${Date.now()}`,
    timestamp: new Date().toISOString(),
    username,
    userRole,
    action,
    moduleName,
    targetId,
    details,
    ipAddress: '127.0.0.1',
  };
}
