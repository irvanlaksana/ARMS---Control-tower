/**
 * FILE INI DI-GENERATE OTOMATIS - JANGAN DIEDIT MANUAL.
 * Sumber: supabase/migrations/*.sql
 * Generator: npm run db:columns  (scripts/generate-supabase-columns.mjs)
 * Migrasi terbaca: 20260907000000_create_arms_schema.sql, 20260907000100_fix_security_definer_views.sql, 20260908000000_add_personnel_sppi.sql
 */

/** Daftar kolom valid tiap tabel Supabase. */
export const SUPABASE_TABLE_COLUMNS: Record<string, readonly string[]> = {
  approvals: ['id', 'request_no', 'module', 'target_id', 'target_reference', 'title', 'requested_by', 'amount_or_value', 'description', 'status', 'reviewed_by', 'reviewed_at', 'rejection_reason', 'created_at', 'updated_at'],
  asset_recoveries: ['id', 'recovery_no', 'case_id', 'case_no', 'asset_id', 'asset_description', 'personnel_id', 'personnel_name', 'personnel_type', 'recovery_date', 'warehouse_location', 'physical_condition', 'vehicle_type', 'vehicle_year', 'has_stnk', 'has_key', 'tier_applied_name', 'tier_applied_basis', 'tier_base_amount', 'tier_modifiers_total', 'repossession_fee', 'company_fee_percent', 'company_fee_amount', 'partner_commission_amount', 'partner_payout_status', 'partner_transfer_date', 'partner_transfer_ref', 'partner_transfer_proof_url', 'partner_bank_name', 'partner_account_no', 'partner_account_name', 'paid_from_cash_account_id', 'status', 'bast_drive_url', 'created_at', 'updated_at'],
  assets: ['id', 'asset_code', 'case_id', 'case_no', 'debtor_name', 'category', 'brand_model', 'police_no_vin', 'estimated_market_value', 'physical_status', 'warehouse_location', 'storage_fee_per_day', 'recovered_date', 'created_at', 'updated_at'],
  assignments: ['id', 'assignment_no', 'case_id', 'case_no', 'debtor_name', 'personnel_id', 'personnel_name', 'assigned_date', 'target_date', 'sla_days', 'instructions', 'status', 'field_report_summary', 'gdrive_folder_url', 'created_at', 'updated_at'],
  audit_logs: ['id', 'timestamp', 'username', 'user_role', 'action', 'module_name', 'target_id', 'details', 'ip_address', 'created_at'],
  cases: ['id', 'case_no', 'client_id', 'client_name', 'client_type', 'contract_id', 'customer_id', 'debtor_name', 'debtor_nik', 'multifinance_contract_no', 'service_id', 'service_name', 'principal_debt_os', 'overdue_days', 'dpd_bucket', 'asset_summary', 'gdrive_folder_name', 'gdrive_folder_url', 'gdrive_folder_id', 'skp_drive_document_url', 'sph_drive_document_url', 'fee_type_snapshot', 'fee_percent_snapshot', 'fee_fixed_snapshot', 'status', 'lawyer_status', 'lawyer_notice_count', 'last_lawyer_notice_type', 'current_personnel_id', 'current_personnel_name', 'created_at', 'updated_at'],
  cash_accounts: ['id', 'account_name', 'bank_name', 'account_no', 'account_holder', 'branch', 'balance', 'type', 'notes', 'last_updated', 'created_at', 'updated_at'],
  clients: ['id', 'client_code', 'company_name', 'industry', 'client_type', 'nik_ktp', 'contact_person', 'phone', 'email', 'address', 'tier', 'active_cases_count', 'status', 'gdrive_folder_url', 'gdrive_folder_id', 'proposal_drive_url', 'proposal_drive_folder_id', 'proposal_status', 'mou_drive_url', 'mou_drive_folder_id', 'mou_contract_no', 'mou_status', 'skp_drive_folder_url', 'skp_drive_folder_id', 'created_at', 'updated_at'],
  collections: ['id', 'collection_no', 'case_id', 'case_no', 'debtor_name', 'client_type', 'client_name', 'action_type', 'personnel_id', 'personnel_name', 'amount_collected', 'collection_date', 'payment_method', 'receipt_no', 'verification_status', 'notes', 'photos', 'drive_folder_url', 'created_at', 'updated_at'],
  comm_logs: ['id', 'case_id', 'case_no', 'personnel_id', 'personnel_name', 'log_date', 'channel', 'contact_person', 'summary', 'outcome', 'follow_up_action', 'next_follow_up_date', 'attachment_drive_url', 'photos', 'recorded_by', 'created_at', 'updated_at'],
  contracts: ['id', 'contract_no', 'client_id', 'client_name', 'title', 'start_date', 'end_date', 'fee_structure_summary', 'status', 'approved_by', 'approved_at', 'rejection_reason', 'drive_document_url', 'created_at', 'updated_at'],
  customers: ['id', 'customer_code', 'contract_no', 'nik_ktp', 'full_name', 'phone', 'address_current', 'address_ktp', 'workplace', 'emergency_contact_name', 'emergency_contact_phone', 'due_date', 'installment_amount', 'total_installment', 'penalty_amount', 'vehicle_merk_type', 'vehicle_police_no', 'ktp_photo_url', 'stnk_photo_urls', 'risk_notes', 'gdrive_folder_url', 'created_at', 'updated_at'],
  dana_talangan: ['id', 'funding_no', 'case_id', 'case_no', 'debtor_name', 'purpose', 'requested_amount', 'funder_source', 'fee_or_interest_rate_percent', 'disbursed_date', 'status', 'approved_by', 'approved_at', 'repay_target_date', 'drive_proof_url', 'created_at', 'updated_at'],
  documents: ['id', 'doc_no', 'title', 'category', 'case_id', 'case_no', 'drive_folder_id', 'drive_folder_url', 'drive_file_id', 'drive_view_url', 'uploaded_by', 'uploaded_at', 'created_at', 'updated_at'],
  drive_folders: ['id', 'name', 'category', 'folder_url', 'description', 'case_id', 'case_no', 'is_system_default', 'created_at', 'updated_at'],
  expenses: ['id', 'expense_no', 'case_id', 'case_no', 'category', 'amount', 'requested_by', 'expense_date', 'description', 'status', 'approved_by', 'approved_at', 'drive_receipt_url', 'created_at', 'updated_at'],
  fees: ['id', 'client_id', 'client_name', 'service_id', 'service_name', 'fee_type', 'percentage_value', 'fixed_amount', 'success_fee_percent', 'tier_rules_json', 'custom_formula_notes', 'effective_date', 'status', 'created_at', 'updated_at'],
  lawyer_notices: ['id', 'notice_no', 'case_id', 'case_no', 'debtor_name', 'debtor_address', 'client_name', 'multifinance_contract_no', 'notice_type', 'requested_date', 'lawyer_firm_name', 'lawyer_name', 'principal_debt_amount', 'status', 'letter_content_draft', 'notes', 'drive_folder_id', 'drive_folder_url', 'drive_document_url', 'created_by', 'created_at', 'updated_at'],
  leads: ['id', 'lead_code', 'company_name', 'contact_person', 'phone', 'email', 'estimated_volume', 'service_requested', 'stage', 'notes', 'assigned_to', 'created_at', 'updated_at'],
  ledger: ['id', 'entry_no', 'date', 'account', 'type', 'amount', 'reference_module', 'reference_id', 'description', 'is_reversed', 'reversed_by_id', 'created_at', 'updated_at'],
  notifications: ['id', 'title', 'message', 'type', 'for_role', 'is_read', 'created_at', 'updated_at'],
  payments: ['id', 'payment_no', 'case_id', 'case_no', 'debtor_name', 'amount', 'payment_date', 'payment_type', 'payment_method', 'total_paid_by_debitur', 'success_fee_amount', 'execution_fee_amount', 'pass_through_fee', 'proof_url', 'allocation_summary', 'manual_splits', 'verification_status', 'verified_by', 'personnel_id', 'personnel_name', 'personnel_type', 'tier_applied_name', 'tier_applied_basis', 'tier_percent', 'gross_agency_fee', 'company_fee_percent', 'company_revenue_amount', 'partner_commission_percent', 'partner_commission_amount', 'partner_payout_status', 'partner_transfer_date', 'partner_transfer_ref', 'partner_transfer_proof_url', 'partner_bank_name', 'partner_account_no', 'partner_account_name', 'paid_from_cash_account_id', 'created_at', 'updated_at'],
  personnel: ['id', 'type', 'full_name', 'nik_ktp', 'birth_place_date', 'address', 'phone_number', 'email', 'bank_name', 'account_number', 'account_name', 'emergency_contact', 'position', 'ktp_photo_url', 'ktp_drive_file_id', 'ktp_drive_folder_url', 'gdrive_folder_url', 'gdrive_folder_id', 'status', 'created_at', 'updated_at', 'sppi_photo_url', 'sppi_drive_file_id', 'sppi_drive_folder_url'],
  petty_cash: ['id', 'transaction_no', 'type', 'category', 'amount', 'transaction_date', 'recipient_or_source', 'personnel_id', 'personnel_name', 'requested_by_user_id', 'requested_by_user_name', 'case_id', 'case_no', 'description', 'proof_receipt_url', 'status', 'approved_by', 'approved_at', 'created_by_name', 'created_at', 'updated_at'],
  services: ['id', 'service_code', 'name', 'category', 'description', 'default_fee_type', 'status', 'created_at', 'updated_at'],
  settings: ['id', 'google_sheet_id', 'apps_script_web_app_url', 'google_drive_folder_id', 'google_drive_folder_url', 'company_name', 'company_phone', 'company_email', 'company_address', 'company_logo', 'default_fee_percent', 'default_company_commission_split_percent', 'auto_sync_with_google_sheets', 'database_config', 'last_synced_at', 'created_at', 'updated_at'],
  settlements: ['id', 'settlement_no', 'case_id', 'case_no', 'client_id', 'client_name', 'total_collected', 'agency_fee_percent', 'agency_fee_amount', 'talangan_deducted', 'direct_expenses_deducted', 'net_remitted_to_client', 'settlement_date', 'status', 'approved_by', 'approved_at', 'drive_settlement_doc_url', 'created_at', 'updated_at'],
  sks: ['id', 'sk_number', 'case_id', 'case_no', 'debtor_name', 'client_type', 'client_name', 'pemberi_kuasa_type', 'kreditur_name', 'kreditur_nik', 'kreditur_address', 'personnel_id', 'personnel_name', 'issued_date', 'expiry_date', 'status', 'approved_by', 'approved_at', 'drive_folder_id', 'drive_folder_url', 'drive_document_url', 'created_at', 'updated_at'],
  users: ['id', 'username', 'name', 'email', 'role', 'department', 'status', 'last_login', 'created_at', 'updated_at'],
  working_capital: ['id', 'transaction_no', 'type', 'source_or_funder', 'funder_type', 'target_allocation', 'amount', 'transaction_date', 'notes', 'proof_document_url', 'status', 'approved_by', 'created_by_name', 'created_at', 'updated_at'],
};

/**
 * Kolom NOT NULL yang memiliki DEFAULT.
 * Key-nya WAJIB dihilangkan dari payload bila nilainya null/kosong,
 * karena Postgres hanya memakai DEFAULT saat kolom tidak dikirim.
 */
export const SUPABASE_DEFAULTED_NOT_NULL: Record<string, readonly string[]> = {
  approvals: ['status', 'created_at', 'updated_at'],
  asset_recoveries: ['recovery_date', 'has_stnk', 'has_key', 'repossession_fee', 'status', 'created_at', 'updated_at'],
  assets: ['estimated_market_value', 'physical_status', 'storage_fee_per_day', 'created_at', 'updated_at'],
  assignments: ['sla_days', 'status', 'created_at', 'updated_at'],
  audit_logs: ['timestamp', 'created_at'],
  cases: ['principal_debt_os', 'overdue_days', 'status', 'lawyer_notice_count', 'created_at', 'updated_at'],
  cash_accounts: ['balance', 'last_updated', 'created_at', 'updated_at'],
  clients: ['active_cases_count', 'status', 'created_at', 'updated_at'],
  collections: ['amount_collected', 'collection_date', 'verification_status', 'created_at', 'updated_at'],
  comm_logs: ['log_date', 'created_at', 'updated_at'],
  contracts: ['status', 'created_at', 'updated_at'],
  customers: ['created_at', 'updated_at'],
  dana_talangan: ['requested_amount', 'fee_or_interest_rate_percent', 'status', 'created_at', 'updated_at'],
  documents: ['uploaded_at', 'created_at', 'updated_at'],
  drive_folders: ['is_system_default', 'created_at', 'updated_at'],
  expenses: ['amount', 'expense_date', 'status', 'created_at', 'updated_at'],
  fees: ['status', 'created_at', 'updated_at'],
  lawyer_notices: ['principal_debt_amount', 'status', 'created_at', 'updated_at'],
  leads: ['stage', 'created_at', 'updated_at'],
  ledger: ['date', 'amount', 'is_reversed', 'created_at', 'updated_at'],
  notifications: ['is_read', 'created_at', 'updated_at'],
  payments: ['amount', 'payment_date', 'verification_status', 'created_at', 'updated_at'],
  personnel: ['status', 'created_at', 'updated_at'],
  petty_cash: ['amount', 'transaction_date', 'status', 'created_at', 'updated_at'],
  services: ['status', 'created_at', 'updated_at'],
  settings: ['id', 'created_at', 'updated_at'],
  settlements: ['total_collected', 'agency_fee_percent', 'agency_fee_amount', 'talangan_deducted', 'direct_expenses_deducted', 'net_remitted_to_client', 'settlement_date', 'status', 'created_at', 'updated_at'],
  sks: ['status', 'created_at', 'updated_at'],
  users: ['status', 'created_at', 'updated_at'],
  working_capital: ['amount', 'transaction_date', 'status', 'created_at', 'updated_at'],
};

export interface SupabaseForeignKey {
  /** Tabel induk yang direferensikan. */
  table: string;
  /** Kolom induk yang direferensikan. */
  column: string;
  /** true bila kolom FK boleh di-set null saat referensinya tidak ditemukan. */
  nullable: boolean;
}

/** Relasi foreign key per tabel: tabel -> kolom -> target. */
export const SUPABASE_FOREIGN_KEYS: Record<string, Record<string, SupabaseForeignKey>> = {
  asset_recoveries: {
    case_id: { table: 'cases', column: 'id', nullable: true },
    personnel_id: { table: 'personnel', column: 'id', nullable: true },
  },
  assets: {
    case_id: { table: 'cases', column: 'id', nullable: true },
  },
  assignments: {
    case_id: { table: 'cases', column: 'id', nullable: true },
    personnel_id: { table: 'personnel', column: 'id', nullable: true },
  },
  cases: {
    client_id: { table: 'clients', column: 'id', nullable: true },
    customer_id: { table: 'customers', column: 'id', nullable: true },
    service_id: { table: 'services', column: 'id', nullable: true },
    current_personnel_id: { table: 'personnel', column: 'id', nullable: true },
  },
  collections: {
    case_id: { table: 'cases', column: 'id', nullable: true },
    personnel_id: { table: 'personnel', column: 'id', nullable: true },
  },
  comm_logs: {
    case_id: { table: 'cases', column: 'id', nullable: true },
    personnel_id: { table: 'personnel', column: 'id', nullable: true },
  },
  contracts: {
    client_id: { table: 'clients', column: 'id', nullable: true },
  },
  dana_talangan: {
    case_id: { table: 'cases', column: 'id', nullable: true },
  },
  fees: {
    client_id: { table: 'clients', column: 'id', nullable: true },
    service_id: { table: 'services', column: 'id', nullable: true },
  },
  lawyer_notices: {
    case_id: { table: 'cases', column: 'id', nullable: true },
  },
  payments: {
    case_id: { table: 'cases', column: 'id', nullable: true },
    personnel_id: { table: 'personnel', column: 'id', nullable: true },
  },
  petty_cash: {
    personnel_id: { table: 'personnel', column: 'id', nullable: true },
  },
  settlements: {
    case_id: { table: 'cases', column: 'id', nullable: true },
    client_id: { table: 'clients', column: 'id', nullable: true },
  },
  sks: {
    case_id: { table: 'cases', column: 'id', nullable: true },
    personnel_id: { table: 'personnel', column: 'id', nullable: true },
  },
};
