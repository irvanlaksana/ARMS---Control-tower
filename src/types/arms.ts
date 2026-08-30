/**
 * ARMS - Agency Recovery Management System
 * Types & Schema Definitions for Google Sheets Enterprise Integration
 */

export type UserRole = 
  | 'SUPER_ADMIN_OPS'      // Control Tower
  | 'APPROVER_EXECUTIVE'   // Direktur Utama
  | 'VIEWER_COMMISSIONER'  // Komisaris
  | 'VIEWER_INVESTOR';     // Investor

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  status: 'ACTIVE' | 'INACTIVE';
  lastLogin?: string;
  createdAt: string;
}

export type ClientType = 'MULTIFINANCE' | 'PERORANGAN';

export interface Client {
  id: string;
  clientCode: string;
  companyName: string; // e.g. PT Adira Dinamika Multi Finance Tbk or Nama Kreditur Perorangan
  industry: 'MULTIFINANCE' | 'BANKING' | 'FINTECH' | 'PERORANGAN' | 'OTHER';
  clientType?: ClientType;
  nikKtp?: string; // NIK untuk Klien Perorangan
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  tier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  activeCasesCount: number;
  status: 'ACTIVE' | 'INACTIVE';
  
  // Google Drive Folder Structure Integration
  gDriveFolderUrl?: string;
  gDriveFolderId?: string;
  proposalDriveUrl?: string;
  proposalDriveFolderId?: string;
  proposalStatus?: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED';
  mouDriveUrl?: string;
  mouDriveFolderId?: string;
  mouContractNo?: string;
  mouStatus?: 'DRAFT' | 'SIGNED' | 'ACTIVE' | 'EXPIRED';
  skpDriveFolderUrl?: string;
  skpDriveFolderId?: string;

  createdAt: string;
}

export type PersonnelType = 'KARYAWAN' | 'MITRA_DC';

export interface Personnel {
  id: string;
  type: PersonnelType;
  fullName: string;
  nikKtp: string;
  birthPlaceDate: string; // Tempat, Tanggal Lahir
  address: string;
  phoneNumber: string;
  email: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  emergencyContact: string;
  position?: string; // e.g. SPV, Field Collector
  ktpPhotoUrl?: string; // Base64 Data URL or direct link
  ktpDriveFileId?: string; // Google Drive file ID
  ktpDriveFolderUrl?: string; // Google Drive direct file/folder link
  gDriveFolderUrl?: string; // Google Drive folder link for this employee
  gDriveFolderId?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface Service {
  id: string;
  serviceCode: string;
  name: string;
  category: 
    | 'PENAGIHAN_KORPORAT'
    | 'RECOVERY_UNIT'
    | 'DANA_TALANGAN_PENARIKAN'
    | 'TALANGAN_LIKUIDITAS_ASSET'
    | 'PENAGIHAN_PERORANGAN'
    | 'MEDIASI'
    | 'PENYELESAIAN_FINANSIAL'
    | 'ASSET_LIQUIDATION';
  description: string;
  defaultFeeType: 'PERCENT' | 'FIXED' | 'SUCCESS_FEE' | 'TIERED' | 'CUSTOM';
  status: 'ACTIVE' | 'INACTIVE';
}

export type FeeType = 'PERCENT' | 'FIXED' | 'SUCCESS_FEE' | 'TIERED' | 'CUSTOM';

export interface FeeConfig {
  id: string;
  clientId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  feeType: FeeType;
  percentageValue?: number; // e.g. 15 for 15%
  fixedAmount?: number; // e.g. 2500000
  successFeePercent?: number; // e.g. 20%
  tierRulesJson?: string; // JSON string for tiered rules
  customFormulaNotes?: string;
  effectiveDate: string;
  status: 'ACTIVE' | 'EXPIRED';
}

export interface Contract {
  id: string;
  contractNo: string;
  clientId: string;
  clientName: string;
  title: string;
  startDate: string;
  endDate: string;
  feeStructureSummary: string;
  status: 'DRAFT' | 'PENDING_EXECUTIVE_APPROVAL' | 'APPROVED' | 'ACTIVE' | 'EXPIRED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  driveDocumentUrl?: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  leadCode: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  estimatedVolume: number;
  serviceRequested: string;
  stage: 'NEW' | 'CONTACTED' | 'PROPOSAL_SENT' | 'IN_NEGOTIATION' | 'WON' | 'LOST';
  notes: string;
  assignedTo: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  customerCode: string;
  contractNo?: string;
  nikKtp: string;
  fullName: string;
  phone: string;
  addressCurrent: string;
  addressKtp: string;
  workplace: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  dueDate?: string;
  installmentAmount?: string;
  penaltyAmount?: string;
  vehicleMerkType?: string;
  vehiclePoliceNo?: string;
  riskNotes: string;
  gDriveFolderUrl?: string;
  createdAt: string;
}

export interface Case {
  id: string;
  caseNo: string;
  clientId: string;
  clientName: string;
  clientType?: ClientType;
  contractId: string;
  customerId: string;
  debtorName: string;
  debtorNik: string;
  multifinanceContractNo: string;
  serviceId: string;
  serviceName: string;
  principalDebtOS: number; // Outstanding balance
  overdueDays: number;
  dpdBucket: '30-60' | '60-90' | '90-180' | '180+' | 'WO';
  assetSummary: string;
  gDriveFolderName?: string;
  gDriveFolderUrl?: string;
  gDriveFolderId?: string;
  skpDriveDocumentUrl?: string; // Tautan Dokumen SKP (Surat Kuasa Penagihan)
  sphDriveDocumentUrl?: string; // Tautan Dokumen SPH / KTP Debitur
  
  // Fee snapshot
  feeTypeSnapshot: FeeType;
  feePercentSnapshot?: number;
  feeFixedSnapshot?: number;
  
  status: 
    | 'NEW'
    | 'ASSIGNED'
    | 'FIELD_ACTION'
    | 'IN_MEDIATION'
    | 'UNIT_RECOVERED'
    | 'PARTIALLY_PAID'
    | 'FULL_PAID'
    | 'SETTLED'
    | 'CLOSED'
    | 'CANCELLED';
  lawyerStatus?: string; // e.g. "SOMASI_1_TERKIRIM", "SURAT_KLARIFIKASI"
  lawyerNoticeCount?: number;
  lastLawyerNoticeType?: string;
  currentPersonnelId?: string;
  currentPersonnelName?: string;
  createdAt: string;
}

export interface Assignment {
  id: string;
  assignmentNo: string;
  caseId: string;
  caseNo: string;
  debtorName: string;
  personnelId: string;
  personnelName: string;
  assignedDate: string;
  targetDate: string;
  slaDays: number;
  instructions: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'REASSIGNED';
  fieldReportSummary?: string;
  gDriveFolderUrl?: string;
  createdAt: string;
}

export interface SK { // Surat Kuasa
  id: string;
  skNumber: string;
  caseId: string;
  caseNo: string;
  debtorName: string;
  clientType?: ClientType;
  clientName?: string;
  pemberiKuasaType?: 'PERUSAHAAN' | 'KREDITUR_PERORANGAN';
  krediturName?: string;
  krediturNik?: string;
  krediturAddress?: string;
  personnelId: string;
  personnelName: string;
  issuedDate: string;
  expiryDate: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  driveFolderId?: string;
  driveFolderUrl?: string;
  driveDocumentUrl?: string;
  createdAt: string;
}

export interface LawyerNotice {
  id: string;
  noticeNo: string;
  caseId: string;
  caseNo: string;
  debtorName: string;
  debtorAddress?: string;
  clientName: string;
  multifinanceContractNo: string;
  noticeType: 
    | 'SURAT_KLARIFIKASI' 
    | 'SOMASI_1' 
    | 'SOMASI_2' 
    | 'SOMASI_TERAKHIR' 
    | 'UNDANGAN_MEDIASI_HUKUM' 
    | 'GUGATAN_SEDERHANA';
  requestedDate: string;
  lawyerFirmName: string;
  lawyerName?: string;
  principalDebtAmount: number;
  status: 'DRAFT_PROPOSED' | 'SUBMITTED_TO_LAWYER' | 'APPROVED_BY_LAWYER' | 'SENT_TO_DEBTOR' | 'COMPLETED';
  letterContentDraft: string;
  notes?: string;
  driveFolderId?: string;
  driveFolderUrl?: string;
  driveDocumentUrl?: string;
  createdBy: string;
  createdAt: string;
}

export interface FieldPhoto {
  id: string;
  url: string;
  caption: string;
  category: 'RUMAH_DEBITUR' | 'TEMU_DEBITUR' | 'UNIT_KENDARAAN' | 'SURAT_BERITA_ACARA' | 'KWITANSI_BAYAR' | 'LOKASI_KANTOR' | 'LAINNYA';
  timestamp: string;
}

export interface CommunicationLog {
  id: string;
  caseId: string;
  caseNo: string;
  personnelId: string;
  personnelName: string;
  logDate: string;
  channel: 'WHATSAPP' | 'PHONE' | 'IN_PERSON' | 'LETTER' | 'EMAIL';
  contactPerson: string;
  summary: string;
  outcome: 'NO_ANSWER' | 'PROMISE_TO_PAY' | 'REFUSED' | 'MEDIATION_AGREED' | 'UNIT_FOUND' | 'OTHER';
  followUpAction: string;
  nextFollowUpDate?: string;
  attachmentDriveUrl?: string;
  photos?: FieldPhoto[];
  recordedBy: string; // Control Tower user
  createdAt: string;
}

export interface Asset {
  id: string;
  assetCode: string;
  caseId: string;
  caseNo: string;
  debtorName: string;
  category: 'MOTORCYCLE' | 'PASSENGER_CAR' | 'COMMERCIAL_VEHICLE' | 'HEAVY_EQUIPMENT' | 'PROPERTY' | 'OTHER';
  brandModel: string; // e.g. Honda NMAX 2022
  policeNoVIN: string; // License plate or chassis number
  estimatedMarketValue: number;
  physicalStatus: 'UNLOCATED' | 'LOCATED' | 'RECOVERED_WAREHOUSE' | 'IN_TRANSIT' | 'LIQUIDATED';
  warehouseLocation?: string;
  storageFeePerDay?: number;
  recoveredDate?: string;
  createdAt: string;
}

export interface Collection {
  id: string;
  collectionNo: string;
  caseId: string;
  caseNo: string;
  debtorName: string;
  clientType?: ClientType;
  clientName?: string;
  actionType?: 'FIELD_VISIT' | 'SURAT_PERINGATAN' | 'MEDIATION' | 'SEIZURE_WARNING' | 'REPOSSESSION_EXECUTED' | 'PENAGIHAN_PERORANGAN';
  personnelId: string;
  personnelName: string;
  amountCollected: number;
  collectionDate: string;
  paymentMethod: 'TRANSFER' | 'CASH_RECEIPT' | 'MEDIATION_ESCROW';
  receiptNo: string;
  verificationStatus: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
  notes: string;
  photos?: FieldPhoto[];
  driveFolderUrl?: string;
  createdAt: string;
}

export interface AssetRecovery {
  id: string;
  recoveryNo: string;
  caseId: string;
  caseNo: string;
  assetId: string;
  assetDescription: string;
  personnelId: string;
  personnelName: string;
  recoveryDate: string;
  warehouseLocation: string;
  physicalCondition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'DAMAGED' | 'PARTS_MISSING';
  repossessionFee: number;
  status: 'PENDING_INSPECTION' | 'STORED' | 'READY_FOR_LIQUIDATION' | 'RELEASED_TO_CLIENT';
  bastDriveUrl?: string;
  createdAt: string;
}

export interface DanaTalangan { // Liquidity Financing
  id: string;
  fundingNo: string;
  caseId: string;
  caseNo: string;
  debtorName: string;
  purpose: 'PENARIKAN_UNIT' | 'STORAGE_WAREHOUSE' | 'TOWING_LOGISTICS' | 'LEGAL_MEDIATION' | 'LIQUIDITY_BRIDGING';
  requestedAmount: number;
  funderSource: 'INTERNAL_CASH' | 'INVESTOR_POOL' | 'TALANGAN_VAULT';
  feeOrInterestRatePercent: number; // e.g. 5% bridging fee
  disbursedDate?: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'DISBURSED' | 'REPAID' | 'REJECTED' | 'WRITTEN_OFF';
  approvedBy?: string;
  approvedAt?: string;
  repayTargetDate?: string;
  driveProofUrl?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  paymentNo: string;
  caseId: string;
  caseNo: string;
  debtorName: string;
  amount: number;
  paymentDate: string;
  paymentType: 'DEBTOR_REPAYMENT' | 'CLIENT_REMITTANCE' | 'TALANGAN_REPAYMENT' | 'ASSET_LIQUIDATION_PAYMENT';
  paymentMethod?: 'TRANSFER' | 'CASH';
  totalPaidByDebitur?: number;
  successFeeAmount?: number;
  executionFeeAmount?: number;
  passThroughFee?: number;
  proofUrl?: string;
  allocationSummary: string; // e.g. Principal: 80%, Agency Fee: 20%
  manualSplits?: { name: string; amount: number }[];
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedBy?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  expenseNo: string;
  caseId?: string;
  caseNo?: string;
  category: 'OPERATIONAL' | 'TOWING' | 'WAREHOUSE_RENTAL' | 'LEGAL_FEE' | 'TRAVEL_FIELD' | 'COMMISSION_PARTNER' | 'OTHER';
  amount: number;
  requestedBy: string;
  expenseDate: string;
  description: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'PAID' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  driveReceiptUrl?: string;
  createdAt: string;
}

export interface Settlement {
  id: string;
  settlementNo: string;
  caseId: string;
  caseNo: string;
  clientId: string;
  clientName: string;
  totalCollected: number;
  agencyFeePercent: number;
  agencyFeeAmount: number;
  talanganDeducted: number;
  directExpensesDeducted: number;
  netRemittedToClient: number;
  settlementDate: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REMITTED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  driveSettlementDocUrl?: string;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  entryNo: string;
  date: string;
  account: 'CASH' | 'RECEIVABLE' | 'TALANGAN_RECEIVABLE' | 'REVENUE_FEE' | 'EXPENSE_OPS' | 'INVESTOR_EQUITY';
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  referenceModule: 'PAYMENT' | 'EXPENSE' | 'TALANGAN' | 'SETTLEMENT' | 'ADJUSTMENT';
  referenceId: string;
  description: string;
  isReversed?: boolean;
  reversedById?: string;
  createdAt: string;
}

export interface CashAccount {
  id: string;
  accountName: string; // Bank Mandiri Utama, Vault Liquidity, Cash On Hand
  bankName: string;
  accountNo: string;
  accountHolder?: string;
  branch?: string;
  balance: number;
  type: 'OPERATIONAL' | 'TALANGAN_VAULT' | 'PETTY_CASH' | 'MODAL_KERJA_POOL' | 'INVESTOR_ESCROW' | 'OTHER';
  notes?: string;
  lastUpdated: string;
}

export interface PettyCashTransaction {
  id: string;
  transactionNo: string;
  type: 'CASH_IN' | 'CASH_OUT';
  category: 
    | 'TOP_UP_REPLENISHMENT'
    | 'BBM_TOLL_PARKIR'
    | 'KONSUMSI_MEETING'
    | 'ATK_MATERAI_FOTOCOPY'
    | 'BIAYA_LAPANGAN_TAKSELE'
    | 'KURIR_PENGIRIMAN_SURAT'
    | 'MAINTENANCE_KANTOR'
    | 'LAINNYA';
  amount: number;
  transactionDate: string;
  recipientOrSource: string;
  personnelId?: string;
  personnelName?: string;
  caseId?: string;
  caseNo?: string;
  description: string;
  proofReceiptUrl?: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  createdByName: string;
  createdAt: string;
}

export interface WorkingCapitalTransaction {
  id: string;
  transactionNo: string;
  type: 'INJECTION' | 'ALLOCATION' | 'RETURN_CAPITAL' | 'WITHDRAWAL';
  sourceOrFunder: string;
  funderType: 'DIREKSI_PEMILIK' | 'INVESTOR_POOL' | 'BANK_LOAN' | 'INTERNAL_RESERVE';
  targetAllocation: 'OPERATIONAL_POOL' | 'TALANGAN_VAULT' | 'PETTY_CASH' | 'TACTICAL_RESERVE' | 'RETURN_TO_INVESTOR';
  amount: number;
  transactionDate: string;
  notes: string;
  proofDocumentUrl?: string;
  status: 'COMPLETED' | 'PENDING_APPROVAL' | 'CANCELLED';
  approvedBy?: string;
  createdByName: string;
  createdAt: string;
}

export interface DriveFolder {
  id: string;
  name: string; // e.g. "01. Surat Tugas & Surat Kuasa (SK)"
  category: 'SK' | 'LAWYER_SOMASI' | 'MOU_KONTRAK' | 'DEBTOR_CASES' | 'FIELD_OPS' | 'FINANCE_RECEIPTS' | 'SETTLEMENT' | 'GENERAL' | 'CUSTOM';
  folderUrl: string;
  description?: string;
  caseId?: string;
  caseNo?: string;
  isSystemDefault?: boolean;
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  docNo: string;
  title: string;
  category: 'CONTRACT' | 'SK_SURAT_KUASA' | 'KTP_DEBTOR' | 'BPKB' | 'KWITANSI' | 'BERITA_ACARA' | 'SETTLEMENT_REPORT' | 'OTHER';
  caseId?: string;
  caseNo?: string;
  driveFolderId?: string;
  driveFolderUrl?: string;
  driveFileId?: string;
  driveViewUrl: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface ApprovalRequest {
  id: string;
  requestNo: string;
  module: 'CONTRACT' | 'SK' | 'EXPENSE' | 'DANA_TALANGAN' | 'SETTLEMENT' | 'FINANCIAL_ADJUSTMENT';
  targetId: string;
  targetReference: string; // e.g. Contract No or Case No
  title: string;
  requestedBy: string;
  amountOrValue?: number;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'APPROVAL_NEEDED' | 'SETTLEMENT_READY' | 'SLA_ALERT' | 'SYSTEM';
  forRole: UserRole;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  username: string;
  userRole: UserRole;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'PAYMENT' | 'EXPORT' | 'FINANCIAL_REVERSAL';
  moduleName: string;
  targetId: string;
  details: string;
  ipAddress?: string;
}

export interface AppSettings {
  googleSheetId: string;
  appsScriptWebAppUrl: string;
  googleDriveFolderId: string;
  googleDriveFolderUrl?: string;
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  companyAddress: string;
  companyLogo?: string;
  defaultFeePercent: number;
  autoSyncWithGoogleSheets: boolean;
  lastSyncedAt?: string;
}
