/**
 * ARMS Seed Data - Clean Slate Template
 * Contains only 1 Super Admin user and empty initial operational tables.
 */

import {
  User, Client, Personnel, Service, FeeConfig, Contract, Lead, Customer, Case,
  Assignment, SK, LawyerNotice, CommunicationLog, Asset, Collection, AssetRecovery, DanaTalangan,
  Payment, Expense, Settlement, LedgerEntry, CashAccount, DocumentRecord,
  ApprovalRequest, NotificationItem, AuditLogEntry, AppSettings
} from '../types/arms';
import { DEFAULT_MJ_LOGO } from '../assets/mjLogo';

export const INITIAL_USERS: User[] = [
  {
    id: 'USR-001',
    username: 'superadmin',
    name: 'Super Admin Control Tower',
    email: 'admin@arms-controltower.co.id',
    role: 'SUPER_ADMIN_OPS',
    department: 'Control Tower Operations',
    status: 'ACTIVE',
    lastLogin: '2026-08-11T12:00:00Z',
    createdAt: '2026-01-01T08:00:00Z',
  },
];

export const INITIAL_CLIENTS: Client[] = [];

export const INITIAL_PERSONNEL: Personnel[] = [];

export const INITIAL_SERVICES: Service[] = [];

export const INITIAL_FEES: FeeConfig[] = [];

export const INITIAL_CONTRACTS: Contract[] = [];

export const INITIAL_LEADS: Lead[] = [];

export const INITIAL_CUSTOMERS: Customer[] = [];

export const INITIAL_CASES: Case[] = [];

export const INITIAL_ASSIGNMENTS: Assignment[] = [];

export const INITIAL_SKS: SK[] = [];

export const INITIAL_LAWYER_NOTICES: LawyerNotice[] = [];

export const INITIAL_COMM_LOGS: CommunicationLog[] = [];

export const INITIAL_ASSETS: Asset[] = [];

export const INITIAL_COLLECTIONS: Collection[] = [];

export const INITIAL_ASSET_RECOVERIES: AssetRecovery[] = [];

export const INITIAL_DANA_TALANGAN: DanaTalangan[] = [];

export const INITIAL_PAYMENTS: Payment[] = [];

export const INITIAL_EXPENSES: Expense[] = [];

export const INITIAL_SETTLEMENTS: Settlement[] = [];

export const INITIAL_LEDGER: LedgerEntry[] = [];

export const INITIAL_CASH_ACCOUNTS: CashAccount[] = [];

export const INITIAL_DOCUMENTS: DocumentRecord[] = [];

export const INITIAL_APPROVALS: ApprovalRequest[] = [];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [];

export const INITIAL_SETTINGS: AppSettings = {
  googleSheetId: '',
  appsScriptWebAppUrl: '',
  googleDriveFolderId: '11OxYLvKiH8P4AIP_NM08KuYu0plAq16_',
  googleDriveFolderUrl: 'https://drive.google.com/drive/folders/11OxYLvKiH8P4AIP_NM08KuYu0plAq16_?usp=sharing',
  companyName: 'PT MJ Agency Recovery Indonesia',
  companyPhone: '021-555-8989',
  companyEmail: 'admin@arms-controltower.co.id',
  companyAddress: 'Gedung Control Tower Ops Lt. 12, Jakarta',
  companyLogo: DEFAULT_MJ_LOGO,
  defaultFeePercent: 15,
  autoSyncWithGoogleSheets: true,
};
