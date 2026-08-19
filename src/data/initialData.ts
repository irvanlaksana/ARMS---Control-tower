/**
 * ARMS Seed Data - Clean Operational Base
 * Retains only Client data, Karyawan/Personnel data, and Super Admin user.
 * All transactional, case, financial, and operational records are reset.
 */

import {
  User, Client, Personnel, Service, FeeConfig, Contract, Lead, Customer, Case,
  Assignment, SK, LawyerNotice, CommunicationLog, Asset, Collection, AssetRecovery, DanaTalangan,
  Payment, Expense, Settlement, LedgerEntry, CashAccount, PettyCashTransaction, WorkingCapitalTransaction, DocumentRecord,
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
    lastLogin: '2026-08-18T10:00:00Z',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'USR-002',
    username: 'direktur',
    name: 'Direktur Utama (Executive Approver)',
    email: 'direktur@arms-controltower.co.id',
    role: 'APPROVER_EXECUTIVE',
    department: 'Direksi & Executive Board',
    status: 'ACTIVE',
    lastLogin: '2026-08-18T10:00:00Z',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'USR-003',
    username: 'komisaris',
    name: 'Dewan Komisaris',
    email: 'komisaris@arms-controltower.co.id',
    role: 'VIEWER_COMMISSIONER',
    department: 'Dewan Pengawas & Komisaris',
    status: 'ACTIVE',
    lastLogin: '2026-08-18T10:00:00Z',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'USR-004',
    username: 'investor',
    name: 'Investor & Funder Partner',
    email: 'investor@funderpool.co.id',
    role: 'VIEWER_INVESTOR',
    department: 'Strategic Liquidity & Investor',
    status: 'ACTIVE',
    lastLogin: '2026-08-18T10:00:00Z',
    createdAt: '2026-01-01T08:00:00Z',
  },
];

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'CLI-001',
    clientCode: 'CLI-ADIRA',
    companyName: 'PT Adira Dinamika Multi Finance Tbk',
    industry: 'MULTIFINANCE',
    clientType: 'MULTIFINANCE',
    contactPerson: 'Bapak Budi Santoso (Head of Remedial)',
    phone: '021-52901111',
    email: 'remedial.head@adira.co.id',
    address: 'Adira Tower, Jl. M.T. Haryono Tbk No. 42, Jakarta Selatan',
    tier: 'TIER_1',
    activeCasesCount: 0,
    status: 'ACTIVE',
    createdAt: '2026-01-15T08:00:00Z',
  },
  {
    id: 'CLI-002',
    clientCode: 'CLI-BRI',
    companyName: 'PT Bank Rakyat Indonesia (Persero) Tbk',
    industry: 'BANKING',
    clientType: 'MULTIFINANCE',
    contactPerson: 'Ibu Ratna Dewi (VP Consumer NPL)',
    phone: '021-5758900',
    email: 'npl_consumer@bri.co.id',
    address: 'Gedung BRI 1, Jl. Jend. Sudirman Kav. 44-46, Jakarta Pusat',
    tier: 'TIER_1',
    activeCasesCount: 0,
    status: 'ACTIVE',
    createdAt: '2026-02-01T08:00:00Z',
  },
  {
    id: 'CLI-003',
    clientCode: 'CLI-AKULAKU',
    companyName: 'PT Akulaku Finance Indonesia',
    industry: 'FINTECH',
    clientType: 'MULTIFINANCE',
    contactPerson: 'Bapak Kevin Wijaya (Collection Manager)',
    phone: '021-29208888',
    email: 'collection@akulaku.com',
    address: 'Sahid Sudirman Center Lt. 18, Jl. Jend. Sudirman, Jakarta Pusat',
    tier: 'TIER_2',
    activeCasesCount: 0,
    status: 'ACTIVE',
    createdAt: '2026-02-20T08:00:00Z',
  },
  {
    id: 'CLI-004',
    clientCode: 'CLI-PER-01',
    companyName: 'H. Rahmat Hidayat, S.E. (Kreditur Perorangan)',
    industry: 'PERORANGAN',
    clientType: 'PERORANGAN',
    nikKtp: '3302101506780002',
    contactPerson: 'H. Rahmat Hidayat',
    phone: '0813-2233-4455',
    email: 'rahmat.hidayat@gmail.com',
    address: 'Jl. Overste Isdiman No. 88, Purwokerto Lor, Banyumas',
    tier: 'TIER_1',
    activeCasesCount: 0,
    status: 'ACTIVE',
    createdAt: '2026-03-01T08:00:00Z',
  },
];

export const INITIAL_PERSONNEL: Personnel[] = [
  {
    id: 'PER-001',
    type: 'KARYAWAN',
    fullName: 'Rian Firmansyah, S.H.',
    nikKtp: '3174091208900001',
    birthPlaceDate: 'Jakarta, 12 Agustus 1990',
    address: 'Jl. Kebon Jeruk Raya No. 15, Jakarta Barat',
    phoneNumber: '0812-8888-9900',
    email: 'rian.firmansyah@arms-controltower.co.id',
    bankName: 'Bank Mandiri',
    accountNumber: '123-00-0987654-3',
    accountName: 'Rian Firmansyah',
    emergencyContact: 'Istri - Maya (0812-9900-1122)',
    position: 'Supervisor Field Operations & Legal',
    status: 'ACTIVE',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'PER-002',
    type: 'MITRA_DC',
    fullName: 'Ahmad Hidayat',
    nikKtp: '3275021505880003',
    birthPlaceDate: 'Bandung, 15 Mei 1988',
    address: 'Jl. Margahayu Raya No. 88, Bekasi',
    phoneNumber: '0857-1122-3344',
    email: 'ahmad.dc@gmail.com',
    bankName: 'BCA',
    accountNumber: '883-0912-441',
    accountName: 'Ahmad Hidayat',
    emergencyContact: 'Adik - Dedi (0857-9988-7766)',
    position: 'Field Specialist Recovery Nmax & Mobil',
    status: 'ACTIVE',
    createdAt: '2026-01-12T08:00:00Z',
  },
];

export const INITIAL_SERVICES: Service[] = [
  {
    id: 'SRV-001',
    serviceCode: 'SRV-RECOVERY-UNIT',
    name: 'Penagihan & Recovery Unit Kendaraan',
    category: 'RECOVERY_UNIT',
    description: 'Jasa penelusuran, penagihan, dan eksekusi pengamanan unit kendaraan bermotor (R2/R4) yang menunggak.',
    defaultFeeType: 'SUCCESS_FEE',
    status: 'ACTIVE',
  },
  {
    id: 'SRV-002',
    serviceCode: 'SRV-DANA-TALANGAN',
    name: 'Liquidity Bridging & Dana Talangan Penarikan',
    category: 'DANA_TALANGAN_PENARIKAN',
    description: 'Penyediaan dana talangan untuk biaya towing, gudang, dan operasional taktis penarikan unit.',
    defaultFeeType: 'PERCENT',
    status: 'ACTIVE',
  },
  {
    id: 'SRV-003',
    serviceCode: 'SRV-SOMASI-HUKUM',
    name: 'Somasi Hukum & Mediasi Penagihan Korporat',
    category: 'PENAGIHAN_KORPORAT',
    description: 'Penerbitan Somasi 1, 2, Terakhir oleh Kantor Hukum serta mediasi penyelesaian hutang.',
    defaultFeeType: 'FIXED',
    status: 'ACTIVE',
  },
  {
    id: 'SRV-004',
    serviceCode: 'SRV-PENAGIHAN-PERORANGAN',
    name: 'Penagihan & Mediasi Piutang Perorangan',
    category: 'PENAGIHAN_PERORANGAN',
    description: 'Layanan penagihan dan mediasi piutang perseorangan/individu (Surat Pengakuan Hutang/SPH, Kwitansi, Pinjaman Pribadi, Cek/Bilyet Giro Kosong) secara persuasif dan hukum.',
    defaultFeeType: 'SUCCESS_FEE',
    status: 'ACTIVE',
  },
];

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
export const INITIAL_PETTY_CASH: PettyCashTransaction[] = [];
export const INITIAL_WORKING_CAPITAL: WorkingCapitalTransaction[] = [];

export const INITIAL_CASH_ACCOUNTS: CashAccount[] = [
  {
    id: 'ACC-001',
    accountName: 'Bank Mandiri Utama Operations',
    bankName: 'Bank Mandiri',
    accountNo: '123-00-998877-1',
    balance: 0,
    type: 'OPERATIONAL',
    lastUpdated: '2026-08-18T12:00:00Z',
  },
  {
    id: 'ACC-002',
    accountName: 'Vault Liquidity & Dana Talangan Pool',
    bankName: 'BCA',
    accountNo: '883-00-112233-5',
    balance: 0,
    type: 'TALANGAN_VAULT',
    lastUpdated: '2026-08-18T12:00:00Z',
  },
  {
    id: 'ACC-003',
    accountName: 'Kas Kecil Operasional (Petty Cash)',
    bankName: 'Cash on Hand (Brankas)',
    accountNo: 'PETTY-CASH-OPS',
    balance: 0,
    type: 'PETTY_CASH',
    lastUpdated: '2026-08-18T12:00:00Z',
  },
];

export const INITIAL_DOCUMENTS: DocumentRecord[] = [];
export const INITIAL_APPROVALS: ApprovalRequest[] = [];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'NTF-001',
    title: 'Database Bersih',
    message: 'Data operasional telah dibersihkan. Hanya tersisa data Klien, Karyawan/Mitra, dan Admin Super User.',
    type: 'SYSTEM',
    forRole: 'SUPER_ADMIN_OPS',
    isRead: false,
    createdAt: '2026-08-18T12:00:00Z',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'AUD-001',
    timestamp: '2026-08-18T12:00:00Z',
    username: 'superadmin',
    userRole: 'SUPER_ADMIN_OPS',
    action: 'DELETE',
    moduleName: 'SYSTEM_CLEANUP',
    targetId: 'ALL_OPERATIONAL_DATA',
    details: 'Pembersihan seluruh data operasional, menyisakan data Klien, Karyawan, dan Super Admin.',
    ipAddress: '127.0.0.1',
  },
];

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
