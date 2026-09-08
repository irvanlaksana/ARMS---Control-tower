/**
 * FILE INI DI-GENERATE OTOMATIS - JANGAN DIEDIT MANUAL.
 * Sumber: schema/migrations/*.sql (migrasi skema ARMS)
 * Generator: npm run db:schema  (scripts/generate-firestore-schema.mjs)
 * Migrasi terbaca: 20260907000000_create_arms_schema.sql, 20260907000100_fix_security_definer_views.sql, 20260908000000_add_personnel_sppi.sql
 *
 * Pemetaan Supabase (PostgreSQL) -> Firestore:
 *   - nama tabel          -> nama koleksi Firestore (snake_case)
 *   - nama kolom          -> nama field dokumen (camelCase, sama dengan tipe TS)
 *   - primary key         -> document ID
 *   - RLS policies        -> firestore.rules
 *   - trigger updated_at  -> field updatedAt diisi oleh src/services/firestoreService.ts
 *   - view aliases        -> tidak dipindah (alias tanpa data)
 *   - index               -> firestore.indexes.json (composite)
 */

/** Daftar koleksi Firestore ARMS dalam urutan dependensi (master -> transaksi). */
export const FIRESTORE_COLLECTIONS: readonly string[] = [
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
  'lawyer_notices',
  'comm_logs',
  'assets',
  'collections',
  'asset_recoveries',
  'dana_talangan',
  'payments',
  'expenses',
  'settlements',
  'ledger',
  'cash_accounts',
  'petty_cash',
  'working_capital',
  'documents',
  'drive_folders',
  'approvals',
  'notifications',
  'audit_logs',
  'settings',
];

/** Field valid tiap koleksi Firestore (camelCase, sesuai tipe TypeScript ARMS). */
export const FIRESTORE_COLLECTION_FIELDS: Record<string, readonly string[]> = {
  users: ["id", "username", "name", "email", "role", "department", "status", "lastLogin", "createdAt", "updatedAt"],
  clients: ["id", "clientCode", "companyName", "industry", "clientType", "nikKtp", "contactPerson", "phone", "email", "address", "tier", "activeCasesCount", "status", "gDriveFolderUrl", "gDriveFolderId", "proposalDriveUrl", "proposalDriveFolderId", "proposalStatus", "mouDriveUrl", "mouDriveFolderId", "mouContractNo", "mouStatus", "skpDriveFolderUrl", "skpDriveFolderId", "createdAt", "updatedAt"],
  personnel: ["id", "type", "fullName", "nikKtp", "birthPlaceDate", "address", "phoneNumber", "email", "bankName", "accountNumber", "accountName", "emergencyContact", "position", "ktpPhotoUrl", "ktpDriveFileId", "ktpDriveFolderUrl", "gDriveFolderUrl", "gDriveFolderId", "status", "createdAt", "updatedAt", "sppiPhotoUrl", "sppiDriveFileId", "sppiDriveFolderUrl"],
  services: ["id", "serviceCode", "name", "category", "description", "defaultFeeType", "status", "createdAt", "updatedAt"],
  fees: ["id", "clientId", "clientName", "serviceId", "serviceName", "feeType", "percentageValue", "fixedAmount", "successFeePercent", "tierRulesJson", "customFormulaNotes", "effectiveDate", "status", "createdAt", "updatedAt"],
  contracts: ["id", "contractNo", "clientId", "clientName", "title", "startDate", "endDate", "feeStructureSummary", "status", "approvedBy", "approvedAt", "rejectionReason", "driveDocumentUrl", "createdAt", "updatedAt"],
  leads: ["id", "leadCode", "companyName", "contactPerson", "phone", "email", "estimatedVolume", "serviceRequested", "stage", "notes", "assignedTo", "createdAt", "updatedAt"],
  customers: ["id", "customerCode", "contractNo", "nikKtp", "fullName", "phone", "addressCurrent", "addressKtp", "workplace", "emergencyContactName", "emergencyContactPhone", "dueDate", "installmentAmount", "totalInstallment", "penaltyAmount", "vehicleMerkType", "vehiclePoliceNo", "ktpPhotoUrl", "stnkPhotoUrls", "riskNotes", "gDriveFolderUrl", "createdAt", "updatedAt"],
  cases: ["id", "caseNo", "clientId", "clientName", "clientType", "contractId", "customerId", "debtorName", "debtorNik", "multifinanceContractNo", "serviceId", "serviceName", "principalDebtOS", "overdueDays", "dpdBucket", "assetSummary", "gDriveFolderName", "gDriveFolderUrl", "gDriveFolderId", "skpDriveDocumentUrl", "sphDriveDocumentUrl", "feeTypeSnapshot", "feePercentSnapshot", "feeFixedSnapshot", "status", "lawyerStatus", "lawyerNoticeCount", "lastLawyerNoticeType", "currentPersonnelId", "currentPersonnelName", "createdAt", "updatedAt"],
  assignments: ["id", "assignmentNo", "caseId", "caseNo", "debtorName", "personnelId", "personnelName", "assignedDate", "targetDate", "slaDays", "instructions", "status", "fieldReportSummary", "gDriveFolderUrl", "createdAt", "updatedAt"],
  sks: ["id", "skNumber", "caseId", "caseNo", "debtorName", "clientType", "clientName", "pemberiKuasaType", "krediturName", "krediturNik", "krediturAddress", "personnelId", "personnelName", "issuedDate", "expiryDate", "status", "approvedBy", "approvedAt", "driveFolderId", "driveFolderUrl", "driveDocumentUrl", "createdAt", "updatedAt"],
  lawyer_notices: ["id", "noticeNo", "caseId", "caseNo", "debtorName", "debtorAddress", "clientName", "multifinanceContractNo", "noticeType", "requestedDate", "lawyerFirmName", "lawyerName", "principalDebtAmount", "status", "letterContentDraft", "notes", "driveFolderId", "driveFolderUrl", "driveDocumentUrl", "createdBy", "createdAt", "updatedAt"],
  comm_logs: ["id", "caseId", "caseNo", "personnelId", "personnelName", "logDate", "channel", "contactPerson", "summary", "outcome", "followUpAction", "nextFollowUpDate", "attachmentDriveUrl", "photos", "recordedBy", "createdAt", "updatedAt"],
  assets: ["id", "assetCode", "caseId", "caseNo", "debtorName", "category", "brandModel", "policeNoVIN", "estimatedMarketValue", "physicalStatus", "warehouseLocation", "storageFeePerDay", "recoveredDate", "createdAt", "updatedAt"],
  collections: ["id", "collectionNo", "caseId", "caseNo", "debtorName", "clientType", "clientName", "actionType", "personnelId", "personnelName", "amountCollected", "collectionDate", "paymentMethod", "receiptNo", "verificationStatus", "notes", "photos", "driveFolderUrl", "createdAt", "updatedAt"],
  asset_recoveries: ["id", "recoveryNo", "caseId", "caseNo", "assetId", "assetDescription", "personnelId", "personnelName", "personnelType", "recoveryDate", "warehouseLocation", "physicalCondition", "vehicleType", "vehicleYear", "hasStnk", "hasKey", "tierAppliedName", "tierAppliedBasis", "tierBaseAmount", "tierModifiersTotal", "repossessionFee", "companyFeePercent", "companyFeeAmount", "partnerCommissionAmount", "partnerPayoutStatus", "partnerTransferDate", "partnerTransferRef", "partnerTransferProofUrl", "partnerBankName", "partnerAccountNo", "partnerAccountName", "paidFromCashAccountId", "status", "bastDriveUrl", "createdAt", "updatedAt"],
  dana_talangan: ["id", "fundingNo", "caseId", "caseNo", "debtorName", "purpose", "requestedAmount", "funderSource", "feeOrInterestRatePercent", "disbursedDate", "status", "approvedBy", "approvedAt", "repayTargetDate", "driveProofUrl", "createdAt", "updatedAt"],
  payments: ["id", "paymentNo", "caseId", "caseNo", "debtorName", "amount", "paymentDate", "paymentType", "paymentMethod", "totalPaidByDebitur", "successFeeAmount", "executionFeeAmount", "passThroughFee", "proofUrl", "allocationSummary", "manualSplits", "verificationStatus", "verifiedBy", "personnelId", "personnelName", "personnelType", "tierAppliedName", "tierAppliedBasis", "tierPercent", "grossAgencyFee", "companyFeePercent", "companyRevenueAmount", "partnerCommissionPercent", "partnerCommissionAmount", "partnerPayoutStatus", "partnerTransferDate", "partnerTransferRef", "partnerTransferProofUrl", "partnerBankName", "partnerAccountNo", "partnerAccountName", "paidFromCashAccountId", "createdAt", "updatedAt"],
  expenses: ["id", "expenseNo", "caseId", "caseNo", "category", "amount", "requestedBy", "expenseDate", "description", "status", "approvedBy", "approvedAt", "driveReceiptUrl", "createdAt", "updatedAt"],
  settlements: ["id", "settlementNo", "caseId", "caseNo", "clientId", "clientName", "totalCollected", "agencyFeePercent", "agencyFeeAmount", "talanganDeducted", "directExpensesDeducted", "netRemittedToClient", "settlementDate", "status", "approvedBy", "approvedAt", "driveSettlementDocUrl", "createdAt", "updatedAt"],
  ledger: ["id", "entryNo", "date", "account", "type", "amount", "referenceModule", "referenceId", "description", "isReversed", "reversedById", "createdAt", "updatedAt"],
  cash_accounts: ["id", "accountName", "bankName", "accountNo", "accountHolder", "branch", "balance", "type", "notes", "lastUpdated", "createdAt", "updatedAt"],
  petty_cash: ["id", "transactionNo", "type", "category", "amount", "transactionDate", "recipientOrSource", "personnelId", "personnelName", "requestedByUserId", "requestedByUserName", "caseId", "caseNo", "description", "proofReceiptUrl", "status", "approvedBy", "approvedAt", "createdByName", "createdAt", "updatedAt"],
  working_capital: ["id", "transactionNo", "type", "sourceOrFunder", "funderType", "targetAllocation", "amount", "transactionDate", "notes", "proofDocumentUrl", "status", "approvedBy", "createdByName", "createdAt", "updatedAt"],
  documents: ["id", "docNo", "title", "category", "caseId", "caseNo", "driveFolderId", "driveFolderUrl", "driveFileId", "driveViewUrl", "uploadedBy", "uploadedAt", "createdAt", "updatedAt"],
  drive_folders: ["id", "name", "category", "folderUrl", "description", "caseId", "caseNo", "isSystemDefault", "createdAt", "updatedAt"],
  approvals: ["id", "requestNo", "module", "targetId", "targetReference", "title", "requestedBy", "amountOrValue", "description", "status", "reviewedBy", "reviewedAt", "rejectionReason", "createdAt", "updatedAt"],
  notifications: ["id", "title", "message", "type", "forRole", "isRead", "createdAt", "updatedAt"],
  audit_logs: ["id", "timestamp", "username", "userRole", "action", "moduleName", "targetId", "details", "ipAddress", "createdAt"],
  settings: ["id", "googleSheetId", "appsScriptWebAppUrl", "googleDriveFolderId", "googleDriveFolderUrl", "companyName", "companyPhone", "companyEmail", "companyAddress", "companyLogo", "defaultFeePercent", "defaultCompanyCommissionSplitPercent", "autoSyncWithGoogleSheets", "databaseConfig", "lastSyncedAt", "createdAt", "updatedAt"],
};

/**
 * Field NOT NULL yang punya DEFAULT di skema sumber.
 * Bila nilainya null/kosong, JANGAN kirim null eksplisit — biarkan default
 * aplikasi (src/utils/firestoreAdapter.ts) yang mengisi.
 */
export const FIRESTORE_DEFAULTED_FIELDS: Record<string, readonly string[]> = {
  users: ["status", "createdAt", "updatedAt"],
  clients: ["activeCasesCount", "status", "createdAt", "updatedAt"],
  personnel: ["status", "createdAt", "updatedAt"],
  services: ["status", "createdAt", "updatedAt"],
  fees: ["status", "createdAt", "updatedAt"],
  contracts: ["status", "createdAt", "updatedAt"],
  leads: ["stage", "createdAt", "updatedAt"],
  customers: ["createdAt", "updatedAt"],
  cases: ["principalDebtOS", "overdueDays", "status", "lawyerNoticeCount", "createdAt", "updatedAt"],
  assignments: ["slaDays", "status", "createdAt", "updatedAt"],
  sks: ["status", "createdAt", "updatedAt"],
  lawyer_notices: ["principalDebtAmount", "status", "createdAt", "updatedAt"],
  comm_logs: ["logDate", "createdAt", "updatedAt"],
  assets: ["estimatedMarketValue", "physicalStatus", "storageFeePerDay", "createdAt", "updatedAt"],
  collections: ["amountCollected", "collectionDate", "verificationStatus", "createdAt", "updatedAt"],
  asset_recoveries: ["recoveryDate", "hasStnk", "hasKey", "repossessionFee", "status", "createdAt", "updatedAt"],
  dana_talangan: ["requestedAmount", "feeOrInterestRatePercent", "status", "createdAt", "updatedAt"],
  payments: ["amount", "paymentDate", "verificationStatus", "createdAt", "updatedAt"],
  expenses: ["amount", "expenseDate", "status", "createdAt", "updatedAt"],
  settlements: ["totalCollected", "agencyFeePercent", "agencyFeeAmount", "talanganDeducted", "directExpensesDeducted", "netRemittedToClient", "settlementDate", "status", "createdAt", "updatedAt"],
  ledger: ["date", "amount", "isReversed", "createdAt", "updatedAt"],
  cash_accounts: ["balance", "lastUpdated", "createdAt", "updatedAt"],
  petty_cash: ["amount", "transactionDate", "status", "createdAt", "updatedAt"],
  working_capital: ["amount", "transactionDate", "status", "createdAt", "updatedAt"],
  documents: ["uploadedAt", "createdAt", "updatedAt"],
  drive_folders: ["isSystemDefault", "createdAt", "updatedAt"],
  approvals: ["status", "createdAt", "updatedAt"],
  notifications: ["isRead", "createdAt", "updatedAt"],
  audit_logs: ["timestamp", "createdAt"],
  settings: ["id", "createdAt", "updatedAt"],
};

export interface FirestoreForeignKey {
  /** Koleksi induk yang direferensikan. */
  table: string;
  /** Field induk yang direferensikan (camelCase). */
  field: string;
  /** true bila field FK boleh dikosongkan saat referensinya tidak ditemukan. */
  nullable: boolean;
}

/** Relasi logis antar koleksi: koleksi -> field -> target. */
export const FIRESTORE_FOREIGN_KEYS: Record<string, Record<string, FirestoreForeignKey>> = {
  fees: {
    "clientId": { table: "clients", field: "id", nullable: true },
    "serviceId": { table: "services", field: "id", nullable: true },
  },
  contracts: {
    "clientId": { table: "clients", field: "id", nullable: true },
  },
  cases: {
    "clientId": { table: "clients", field: "id", nullable: true },
    "customerId": { table: "customers", field: "id", nullable: true },
    "serviceId": { table: "services", field: "id", nullable: true },
    "currentPersonnelId": { table: "personnel", field: "id", nullable: true },
  },
  assignments: {
    "caseId": { table: "cases", field: "id", nullable: true },
    "personnelId": { table: "personnel", field: "id", nullable: true },
  },
  sks: {
    "caseId": { table: "cases", field: "id", nullable: true },
    "personnelId": { table: "personnel", field: "id", nullable: true },
  },
  lawyer_notices: {
    "caseId": { table: "cases", field: "id", nullable: true },
  },
  comm_logs: {
    "caseId": { table: "cases", field: "id", nullable: true },
    "personnelId": { table: "personnel", field: "id", nullable: true },
  },
  assets: {
    "caseId": { table: "cases", field: "id", nullable: true },
  },
  collections: {
    "caseId": { table: "cases", field: "id", nullable: true },
    "personnelId": { table: "personnel", field: "id", nullable: true },
  },
  asset_recoveries: {
    "caseId": { table: "cases", field: "id", nullable: true },
    "personnelId": { table: "personnel", field: "id", nullable: true },
  },
  dana_talangan: {
    "caseId": { table: "cases", field: "id", nullable: true },
  },
  payments: {
    "caseId": { table: "cases", field: "id", nullable: true },
    "personnelId": { table: "personnel", field: "id", nullable: true },
  },
  settlements: {
    "caseId": { table: "cases", field: "id", nullable: true },
    "clientId": { table: "clients", field: "id", nullable: true },
  },
  petty_cash: {
    "personnelId": { table: "personnel", field: "id", nullable: true },
  },
};
