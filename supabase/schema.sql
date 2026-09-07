-- ==============================================================================
-- ARMS (Agency Recovery Management System) - Control Tower
-- Database Schema for Supabase (PostgreSQL 15+)
-- Version: 1.0.0
-- Created: 2026-09-07
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TRIGGER FUNCTION UNTUK AUTO-UPDATE updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. TABEL UTAMA (30 TABEL)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 01. TABEL: users (Pengguna Sistem Control Tower)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN_OPS', 'APPROVER_EXECUTIVE', 'VIEWER_COMMISSIONER', 'VIEWER_INVESTOR')),
    department TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.users IS 'Daftar pengguna dan hak akses sistem ARMS Control Tower';

-- ------------------------------------------------------------------------------
-- 02. TABEL: clients (Klien Multifinance & Kreditur Perorangan)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
    id TEXT PRIMARY KEY,
    client_code TEXT UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    industry TEXT CHECK (industry IN ('MULTIFINANCE', 'BANKING', 'FINTECH', 'PERORANGAN', 'OTHER')),
    client_type TEXT CHECK (client_type IN ('MULTIFINANCE', 'PERORANGAN')),
    nik_ktp TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    tier TEXT CHECK (tier IN ('TIER_1', 'TIER_2', 'TIER_3')) DEFAULT 'TIER_1',
    active_cases_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    gdrive_folder_url TEXT,
    gdrive_folder_id TEXT,
    proposal_drive_url TEXT,
    proposal_drive_folder_id TEXT,
    proposal_status TEXT CHECK (proposal_status IN ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED')),
    mou_drive_url TEXT,
    mou_drive_folder_id TEXT,
    mou_contract_no TEXT,
    mou_status TEXT CHECK (mou_status IN ('DRAFT', 'SIGNED', 'ACTIVE', 'EXPIRED')),
    skp_drive_folder_url TEXT,
    skp_drive_folder_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.clients IS 'Data klien rekanan multifinance, perbankan, fintech, dan kreditur perorangan';

-- ------------------------------------------------------------------------------
-- 03. TABEL: personnel (Karyawan & Mitra Debt Collector)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.personnel (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('KARYAWAN', 'MITRA_DC')),
    full_name TEXT NOT NULL,
    nik_ktp TEXT,
    birth_place_date TEXT,
    address TEXT,
    phone_number TEXT,
    email TEXT,
    bank_name TEXT,
    account_number TEXT,
    account_name TEXT,
    emergency_contact TEXT,
    position TEXT,
    ktp_photo_url TEXT,
    ktp_drive_file_id TEXT,
    ktp_drive_folder_url TEXT,
    gdrive_folder_url TEXT,
    gdrive_folder_id TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.personnel IS 'Data karyawan operasional kantor dan mitra eksekutor lapangan (Mitra DC)';

-- ------------------------------------------------------------------------------
-- 04. TABEL: services (Katalog Layanan Penagihan & Recovery)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.services (
    id TEXT PRIMARY KEY,
    service_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'PENAGIHAN_KORPORAT',
        'RECOVERY_UNIT',
        'DANA_TALANGAN_PENARIKAN',
        'TALANGAN_LIKUIDITAS_ASSET',
        'PENAGIHAN_PERORANGAN',
        'MEDIASI',
        'PENYELESAIAN_FINANSIAL',
        'ASSET_LIQUIDATION'
    )),
    description TEXT,
    default_fee_type TEXT CHECK (default_fee_type IN ('PERCENT', 'FIXED', 'SUCCESS_FEE', 'TIERED', 'CUSTOM')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.services IS 'Katalog produk dan layanan recovery piutang / aset';

-- ------------------------------------------------------------------------------
-- 05. TABEL: fees (Konfigurasi Fee per Klien dan Layanan)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fees (
    id TEXT PRIMARY KEY,
    client_id TEXT REFERENCES public.clients(id) ON DELETE CASCADE,
    client_name TEXT,
    service_id TEXT REFERENCES public.services(id) ON DELETE CASCADE,
    service_name TEXT,
    fee_type TEXT NOT NULL CHECK (fee_type IN ('PERCENT', 'FIXED', 'SUCCESS_FEE', 'TIERED', 'CUSTOM')),
    percentage_value NUMERIC(15,2),
    fixed_amount NUMERIC(15,2),
    success_fee_percent NUMERIC(15,2),
    tier_rules_json TEXT,
    custom_formula_notes TEXT,
    effective_date DATE,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.fees IS 'Struktur tarif dan konfigurasi fee jasa penagihan';

-- ------------------------------------------------------------------------------
-- 06. TABEL: contracts (Kontrak Kerjasama & MoU Klien)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contracts (
    id TEXT PRIMARY KEY,
    contract_no TEXT UNIQUE NOT NULL,
    client_id TEXT REFERENCES public.clients(id) ON DELETE RESTRICT,
    client_name TEXT,
    title TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    fee_structure_summary TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_EXECUTIVE_APPROVAL', 'APPROVED', 'ACTIVE', 'EXPIRED', 'REJECTED')),
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    drive_document_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.contracts IS 'Arsip perjanjian kerjasama dan surat perjanjian kerja penagihan';

-- ------------------------------------------------------------------------------
-- 07. TABEL: leads (Peluang / Prospek Klien Baru)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
    id TEXT PRIMARY KEY,
    lead_code TEXT UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    estimated_volume NUMERIC(18,2) DEFAULT 0,
    service_requested TEXT,
    stage TEXT NOT NULL DEFAULT 'NEW' CHECK (stage IN ('NEW', 'CONTACTED', 'PROPOSAL_SENT', 'IN_NEGOTIATION', 'WON', 'LOST')),
    notes TEXT,
    assigned_to TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.leads IS 'Pipeline prospek calon klien dan corporate partnerships';

-- ------------------------------------------------------------------------------
-- 08. TABEL: customers (Data Debitur & Terlapor)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    customer_code TEXT UNIQUE NOT NULL,
    contract_no TEXT,
    nik_ktp TEXT,
    full_name TEXT NOT NULL,
    phone TEXT,
    address_current TEXT,
    address_ktp TEXT,
    workplace TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    due_date TEXT,
    installment_amount TEXT,
    total_installment NUMERIC(18,2) DEFAULT 0,
    penalty_amount TEXT,
    vehicle_merk_type TEXT,
    vehicle_police_no TEXT,
    ktp_photo_url TEXT,
    stnk_photo_urls JSONB DEFAULT '[]'::jsonb,
    risk_notes TEXT,
    gdrive_folder_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.customers IS 'Master data nasabah debitur yang memiliki kewajiban hutang / unit nunggak';

-- ------------------------------------------------------------------------------
-- 09. TABEL: cases (Kasus Piutang & Surat Penagihan)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cases (
    id TEXT PRIMARY KEY,
    case_no TEXT UNIQUE NOT NULL,
    client_id TEXT REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name TEXT,
    client_type TEXT CHECK (client_type IN ('MULTIFINANCE', 'PERORANGAN')),
    contract_id TEXT,
    customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
    debtor_name TEXT NOT NULL,
    debtor_nik TEXT,
    multifinance_contract_no TEXT,
    service_id TEXT REFERENCES public.services(id) ON DELETE SET NULL,
    service_name TEXT,
    principal_debt_os NUMERIC(18,2) NOT NULL DEFAULT 0,
    overdue_days INTEGER NOT NULL DEFAULT 0,
    dpd_bucket TEXT CHECK (dpd_bucket IN ('30-60', '60-90', '90-180', '180+', 'WO')),
    asset_summary TEXT,
    gdrive_folder_name TEXT,
    gdrive_folder_url TEXT,
    gdrive_folder_id TEXT,
    skp_drive_document_url TEXT,
    sph_drive_document_url TEXT,
    fee_type_snapshot TEXT CHECK (fee_type_snapshot IN ('PERCENT', 'FIXED', 'SUCCESS_FEE', 'TIERED', 'CUSTOM')),
    fee_percent_snapshot NUMERIC(15,2),
    fee_fixed_snapshot NUMERIC(18,2),
    status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN (
        'NEW', 'ASSIGNED', 'FIELD_ACTION', 'IN_MEDIATION',
        'UNIT_RECOVERED', 'PARTIALLY_PAID', 'FULL_PAID', 'SETTLED', 'CLOSED', 'CANCELLED'
    )),
    lawyer_status TEXT,
    lawyer_notice_count INTEGER NOT NULL DEFAULT 0,
    last_lawyer_notice_type TEXT,
    current_personnel_id TEXT REFERENCES public.personnel(id) ON DELETE SET NULL,
    current_personnel_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.cases IS 'Entitas utama perkara penagihan dan recovery piutang';

-- ------------------------------------------------------------------------------
-- 10. TABEL: assignments (Surat Tugas & Penugasan Lapangan)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assignments (
    id TEXT PRIMARY KEY,
    assignment_no TEXT UNIQUE NOT NULL,
    case_id TEXT REFERENCES public.cases(id) ON DELETE CASCADE,
    case_no TEXT,
    debtor_name TEXT,
    personnel_id TEXT REFERENCES public.personnel(id) ON DELETE SET NULL,
    personnel_name TEXT,
    assigned_date DATE,
    target_date DATE,
    sla_days INTEGER NOT NULL DEFAULT 14,
    instructions TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'REASSIGNED')),
    field_report_summary TEXT,
    gdrive_folder_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.assignments IS 'Instruksi tugas lapangan resmi kepada personel/mitra dengan SLA';

-- ------------------------------------------------------------------------------
-- 11. TABEL: sks (Surat Kuasa Penagihan & Penarikan)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sks (
    id TEXT PRIMARY KEY,
    sk_number TEXT UNIQUE NOT NULL,
    case_id TEXT REFERENCES public.cases(id) ON DELETE CASCADE,
    case_no TEXT,
    debtor_name TEXT,
    client_type TEXT CHECK (client_type IN ('MULTIFINANCE', 'PERORANGAN')),
    client_name TEXT,
    pemberi_kuasa_type TEXT CHECK (pemberi_kuasa_type IN ('PERUSAHAAN', 'KREDITUR_PERORANGAN')),
    kreditur_name TEXT,
    kreditur_nik TEXT,
    kreditur_address TEXT,
    personnel_id TEXT REFERENCES public.personnel(id) ON DELETE SET NULL,
    personnel_name TEXT,
    issued_date DATE,
    expiry_date DATE,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'EXPIRED', 'REVOKED', 'REJECTED')),
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    drive_folder_id TEXT,
    drive_folder_url TEXT,
    drive_document_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.sks IS 'Surat Kuasa resmi penagihan debitur dan penarikan unit agunan';

-- ------------------------------------------------------------------------------
-- 12. TABEL: lawyer_notices (Somasi & Notis Hukum Advokat)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lawyer_notices (
    id TEXT PRIMARY KEY,
    notice_no TEXT UNIQUE NOT NULL,
    case_id TEXT REFERENCES public.cases(id) ON DELETE CASCADE,
    case_no TEXT,
    debtor_name TEXT,
    debtor_address TEXT,
    client_name TEXT,
    multifinance_contract_no TEXT,
    notice_type TEXT NOT NULL CHECK (notice_type IN (
        'SURAT_KLARIFIKASI', 'SOMASI_1', 'SOMASI_2', 'SOMASI_TERAKHIR',
        'UNDANGAN_MEDIASI_HUKUM', 'GUGATAN_SEDERHANA'
    )),
    requested_date DATE,
    lawyer_firm_name TEXT NOT NULL,
    lawyer_name TEXT,
    principal_debt_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'DRAFT_PROPOSED' CHECK (status IN (
        'DRAFT_PROPOSED', 'SUBMITTED_TO_LAWYER', 'APPROVED_BY_LAWYER', 'SENT_TO_DEBTOR', 'COMPLETED'
    )),
    letter_content_draft TEXT,
    notes TEXT,
    drive_folder_id TEXT,
    drive_folder_url TEXT,
    drive_document_url TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.lawyer_notices IS 'Dokumentasi surat somasi dan langkah litigasi hukum advokat';

-- ------------------------------------------------------------------------------
-- 13. TABEL: comm_logs (Log Komunikasi & Interaksi Debitur)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comm_logs (
    id TEXT PRIMARY KEY,
    case_id TEXT REFERENCES public.cases(id) ON DELETE CASCADE,
    case_no TEXT,
    personnel_id TEXT REFERENCES public.personnel(id) ON DELETE SET NULL,
    personnel_name TEXT,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    channel TEXT NOT NULL CHECK (channel IN ('WHATSAPP', 'PHONE', 'IN_PERSON', 'LETTER', 'EMAIL')),
    contact_person TEXT,
    summary TEXT NOT NULL,
    outcome TEXT CHECK (outcome IN ('NO_ANSWER', 'PROMISE_TO_PAY', 'REFUSED', 'MEDIATION_AGREED', 'UNIT_FOUND', 'OTHER')),
    follow_up_action TEXT,
    next_follow_up_date DATE,
    attachment_drive_url TEXT,
    photos JSONB DEFAULT '[]'::jsonb,
    recorded_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.comm_logs IS 'Catatan riwayat komunikasi desk collection dan kunjungan lapangan';

-- ------------------------------------------------------------------------------
-- 14. TABEL: assets (Master Aset & Unit Agunan Kendaraan)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assets (
    id TEXT PRIMARY KEY,
    asset_code TEXT UNIQUE NOT NULL,
    case_id TEXT REFERENCES public.cases(id) ON DELETE CASCADE,
    case_no TEXT,
    debtor_name TEXT,
    category TEXT NOT NULL CHECK (category IN (
        'MOTORCYCLE', 'PASSENGER_CAR', 'COMMERCIAL_VEHICLE', 'HEAVY_EQUIPMENT', 'PROPERTY', 'OTHER'
    )),
    brand_model TEXT NOT NULL,
    police_no_vin TEXT,
    estimated_market_value NUMERIC(18,2) NOT NULL DEFAULT 0,
    physical_status TEXT NOT NULL DEFAULT 'UNLOCATED' CHECK (physical_status IN (
        'UNLOCATED', 'LOCATED', 'RECOVERED_WAREHOUSE', 'IN_TRANSIT', 'LIQUIDATED'
    )),
    warehouse_location TEXT,
    storage_fee_per_day NUMERIC(18,2) NOT NULL DEFAULT 0,
    recovered_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.assets IS 'Identitas dan status fisik kendaraan / properti agunan debitur';

-- ------------------------------------------------------------------------------
-- 15. TABEL: collections (Hasil Penagihan & Penerimaan Titipan)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.collections (
    id TEXT PRIMARY KEY,
    collection_no TEXT UNIQUE NOT NULL,
    case_id TEXT REFERENCES public.cases(id) ON DELETE CASCADE,
    case_no TEXT,
    debtor_name TEXT,
    client_type TEXT CHECK (client_type IN ('MULTIFINANCE', 'PERORANGAN')),
    client_name TEXT,
    action_type TEXT CHECK (action_type IN (
        'FIELD_VISIT', 'SURAT_PERINGATAN', 'MEDIATION', 'SEIZURE_WARNING', 'REPOSSESSION_EXECUTED', 'PENAGIHAN_PERORANGAN'
    )),
    personnel_id TEXT REFERENCES public.personnel(id) ON DELETE SET NULL,
    personnel_name TEXT,
    amount_collected NUMERIC(18,2) NOT NULL DEFAULT 0,
    collection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('TRANSFER', 'CASH_RECEIPT', 'MEDIATION_ESCROW')),
    receipt_no TEXT,
    verification_status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK (verification_status IN ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED')),
    notes TEXT,
    photos JSONB DEFAULT '[]'::jsonb,
    drive_folder_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.collections IS 'Log penerimaan uang pelunasan / angsuran dari debitur di lapangan';

-- ------------------------------------------------------------------------------
-- 16. TABEL: asset_recoveries (Eksekusi & Serah Terima Unit / BAST)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.asset_recoveries (
    id TEXT PRIMARY KEY,
    recovery_no TEXT UNIQUE NOT NULL,
    case_id TEXT REFERENCES public.cases(id) ON DELETE CASCADE,
    case_no TEXT,
    asset_id TEXT,
    asset_description TEXT,
    personnel_id TEXT REFERENCES public.personnel(id) ON DELETE SET NULL,
    personnel_name TEXT,
    personnel_type TEXT CHECK (personnel_type IN ('KARYAWAN', 'MITRA_DC')),
    recovery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    warehouse_location TEXT NOT NULL,
    physical_condition TEXT NOT NULL CHECK (physical_condition IN ('EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED', 'PARTS_MISSING')),
    vehicle_type TEXT,
    vehicle_year INTEGER,
    has_stnk BOOLEAN NOT NULL DEFAULT FALSE,
    has_key BOOLEAN NOT NULL DEFAULT FALSE,
    tier_applied_name TEXT,
    tier_applied_basis TEXT,
    tier_base_amount NUMERIC(18,2) DEFAULT 0,
    tier_modifiers_total NUMERIC(18,2) DEFAULT 0,
    repossession_fee NUMERIC(18,2) NOT NULL DEFAULT 0,
    company_fee_percent NUMERIC(15,2) DEFAULT 0,
    company_fee_amount NUMERIC(18,2) DEFAULT 0,
    partner_commission_amount NUMERIC(18,2) DEFAULT 0,
    partner_payout_status TEXT CHECK (partner_payout_status IN ('NOT_APPLICABLE', 'PENDING_TRANSFER', 'TRANSFERRED', 'REJECTED')),
    partner_transfer_date DATE,
    partner_transfer_ref TEXT,
    partner_transfer_proof_url TEXT,
    partner_bank_name TEXT,
    partner_account_no TEXT,
    partner_account_name TEXT,
    paid_from_cash_account_id TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING_INSPECTION' CHECK (status IN (
        'PENDING_INSPECTION', 'STORED', 'READY_FOR_LIQUIDATION', 'RELEASED_TO_CLIENT'
    )),
    bast_drive_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.asset_recoveries IS 'Eksekusi pengamanan unit kendaraan ke pool gudang dan fee komisi mitra';

-- ------------------------------------------------------------------------------
-- 17. TABEL: dana_talangan (Liquidity Financing & Bridging Penarikan)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dana_talangan (
    id TEXT PRIMARY KEY,
    funding_no TEXT UNIQUE NOT NULL,
    case_id TEXT REFERENCES public.cases(id) ON DELETE CASCADE,
    case_no TEXT,
    debtor_name TEXT,
    purpose TEXT NOT NULL CHECK (purpose IN (
        'PENARIKAN_UNIT', 'STORAGE_WAREHOUSE', 'TOWING_LOGISTICS', 'LEGAL_MEDIATION', 'LIQUIDITY_BRIDGING'
    )),
    requested_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    funder_source TEXT NOT NULL CHECK (funder_source IN ('INTERNAL_CASH', 'INVESTOR_POOL', 'TALANGAN_VAULT')),
    fee_or_interest_rate_percent NUMERIC(15,2) NOT NULL DEFAULT 0,
    disbursed_date DATE,
    status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK (status IN (
        'PENDING_APPROVAL', 'APPROVED', 'DISBURSED', 'REPAID', 'REJECTED', 'WRITTEN_OFF'
    )),
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    repay_target_date DATE,
    drive_proof_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.dana_talangan IS 'Fasilitas likuiditas pembiayaan taktis operasional penarikan dan gudang';

-- ------------------------------------------------------------------------------
-- 18. TABEL: payments (Pembayaran, Split Fee & Transfer Komisi Mitra)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY,
    payment_no TEXT UNIQUE NOT NULL,
    case_id TEXT REFERENCES public.cases(id) ON DELETE CASCADE,
    case_no TEXT,
    debtor_name TEXT,
    amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_type TEXT NOT NULL CHECK (payment_type IN (
        'DEBTOR_REPAYMENT', 'CLIENT_REMITTANCE', 'TALANGAN_REPAYMENT', 'ASSET_LIQUIDATION_PAYMENT'
    )),
    payment_method TEXT CHECK (payment_method IN ('TRANSFER', 'CASH')),
    total_paid_by_debitur NUMERIC(18,2) DEFAULT 0,
    success_fee_amount NUMERIC(18,2) DEFAULT 0,
    execution_fee_amount NUMERIC(18,2) DEFAULT 0,
    pass_through_fee NUMERIC(18,2) DEFAULT 0,
    proof_url TEXT,
    allocation_summary TEXT,
    manual_splits JSONB DEFAULT '[]'::jsonb,
    verification_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    verified_by TEXT,
    personnel_id TEXT REFERENCES public.personnel(id) ON DELETE SET NULL,
    personnel_name TEXT,
    personnel_type TEXT CHECK (personnel_type IN ('KARYAWAN', 'MITRA_DC')),
    tier_applied_name TEXT,
    tier_applied_basis TEXT,
    tier_percent NUMERIC(15,2),
    gross_agency_fee NUMERIC(18,2) DEFAULT 0,
    company_fee_percent NUMERIC(15,2) DEFAULT 0,
    company_revenue_amount NUMERIC(18,2) DEFAULT 0,
    partner_commission_percent NUMERIC(15,2) DEFAULT 0,
    partner_commission_amount NUMERIC(18,2) DEFAULT 0,
    partner_payout_status TEXT CHECK (partner_payout_status IN ('NOT_APPLICABLE', 'PENDING_TRANSFER', 'TRANSFERRED', 'REJECTED')),
    partner_transfer_date DATE,
    partner_transfer_ref TEXT,
    partner_transfer_proof_url TEXT,
    partner_bank_name TEXT,
    partner_account_no TEXT,
    partner_account_name TEXT,
    paid_from_cash_account_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.payments IS 'Alokasi penerimaan pembayaran, fee agensi, dan pembagian komisi mitra';

-- ------------------------------------------------------------------------------
-- 19. TABEL: expenses (Biaya Operasional Lapangan & Tak Tertuga)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    expense_no TEXT UNIQUE NOT NULL,
    case_id TEXT,
    case_no TEXT,
    category TEXT NOT NULL CHECK (category IN (
        'OPERATIONAL', 'TOWING', 'WAREHOUSE_RENTAL', 'LEGAL_FEE', 'TRAVEL_FIELD', 'COMMISSION_PARTNER', 'OTHER'
    )),
    amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    requested_by TEXT NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'PAID', 'REJECTED')),
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    drive_receipt_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.expenses IS 'Pengeluaran operasional kasus seperti towing, sewa pool, dan biaya legal';

-- ------------------------------------------------------------------------------
-- 20. TABEL: settlements (Settlement & Remitansi ke Klien)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settlements (
    id TEXT PRIMARY KEY,
    settlement_no TEXT UNIQUE NOT NULL,
    case_id TEXT REFERENCES public.cases(id) ON DELETE CASCADE,
    case_no TEXT,
    client_id TEXT REFERENCES public.clients(id) ON DELETE RESTRICT,
    client_name TEXT,
    total_collected NUMERIC(18,2) NOT NULL DEFAULT 0,
    agency_fee_percent NUMERIC(15,2) NOT NULL DEFAULT 0,
    agency_fee_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    talangan_deducted NUMERIC(18,2) NOT NULL DEFAULT 0,
    direct_expenses_deducted NUMERIC(18,2) NOT NULL DEFAULT 0,
    net_remitted_to_client NUMERIC(18,2) NOT NULL DEFAULT 0,
    settlement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REMITTED', 'REJECTED')),
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    drive_settlement_doc_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.settlements IS 'Rekonsiliasi akhir pembagian hasil penagihan dan transfer bersih ke klien';

-- ------------------------------------------------------------------------------
-- 21. TABEL: ledger (Buku Besar Akuntansi & Jurnal Umum)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ledger (
    id TEXT PRIMARY KEY,
    entry_no TEXT UNIQUE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    account TEXT NOT NULL CHECK (account IN (
        'CASH', 'RECEIVABLE', 'TALANGAN_RECEIVABLE', 'REVENUE_FEE', 'EXPENSE_OPS', 'INVESTOR_EQUITY'
    )),
    type TEXT NOT NULL CHECK (type IN ('DEBIT', 'CREDIT')),
    amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    reference_module TEXT CHECK (reference_module IN ('PAYMENT', 'EXPENSE', 'TALANGAN', 'SETTLEMENT', 'ADJUSTMENT')),
    reference_id TEXT,
    description TEXT NOT NULL,
    is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
    reversed_by_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.ledger IS 'Buku besar keuangan double-entry akuntansi ARMS';

-- ------------------------------------------------------------------------------
-- 22. TABEL: cash_accounts (Rekening Kas Bank & Vault Likuiditas)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cash_accounts (
    id TEXT PRIMARY KEY,
    account_name TEXT NOT NULL,
    bank_name TEXT,
    account_no TEXT,
    account_holder TEXT,
    branch TEXT,
    balance NUMERIC(18,2) NOT NULL DEFAULT 0,
    type TEXT NOT NULL CHECK (type IN ('OPERATIONAL', 'TALANGAN_VAULT', 'PETTY_CASH', 'MODAL_KERJA_POOL', 'INVESTOR_ESCROW', 'OTHER')),
    notes TEXT,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.cash_accounts IS 'Daftar akun kas dan rekening bank operasional serta vault likuiditas';

-- ------------------------------------------------------------------------------
-- 23. TABEL: petty_cash (Buku Kas Kecil Kantor)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.petty_cash (
    id TEXT PRIMARY KEY,
    transaction_no TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('CASH_IN', 'CASH_OUT')),
    category TEXT NOT NULL CHECK (category IN (
        'TOP_UP_REPLENISHMENT', 'BBM_TOLL_PARKIR', 'KONSUMSI_MEETING',
        'ATK_MATERAI_FOTOCOPY', 'BIAYA_LAPANGAN_TAKSELE', 'KURIR_PENGIRIMAN_SURAT',
        'MAINTENANCE_KANTOR', 'LAINNYA'
    )),
    amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    recipient_or_source TEXT,
    personnel_id TEXT REFERENCES public.personnel(id) ON DELETE SET NULL,
    personnel_name TEXT,
    requested_by_user_id TEXT,
    requested_by_user_name TEXT,
    case_id TEXT,
    case_no TEXT,
    description TEXT NOT NULL,
    proof_receipt_url TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('APPROVED', 'PENDING', 'REJECTED')),
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    created_by_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.petty_cash IS 'Mutasi transaksi kas kecil operasional kantor dan SPV';

-- ------------------------------------------------------------------------------
-- 24. TABEL: working_capital (Injeksi & Alokasi Modal Kerja)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.working_capital (
    id TEXT PRIMARY KEY,
    transaction_no TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('INJECTION', 'ALLOCATION', 'RETURN_CAPITAL', 'WITHDRAWAL')),
    source_or_funder TEXT NOT NULL,
    funder_type TEXT NOT NULL CHECK (funder_type IN ('DIREKSI_PEMILIK', 'INVESTOR_POOL', 'BANK_LOAN', 'INTERNAL_RESERVE')),
    target_allocation TEXT NOT NULL CHECK (target_allocation IN ('OPERATIONAL_POOL', 'TALANGAN_VAULT', 'PETTY_CASH', 'TACTICAL_RESERVE', 'RETURN_TO_INVESTOR')),
    amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    proof_document_url TEXT,
    status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'PENDING_APPROVAL', 'CANCELLED')),
    approved_by TEXT,
    created_by_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.working_capital IS 'Mutasi permodalan kerja dari direksi dan mitra investor';

-- ------------------------------------------------------------------------------
-- 25. TABEL: documents (Arsip Berkas & Dokumen Digital)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
    id TEXT PRIMARY KEY,
    doc_no TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'CONTRACT', 'SK_SURAT_KUASA', 'KTP_DEBTOR', 'BPKB',
        'KWITANSI', 'BERITA_ACARA', 'SETTLEMENT_REPORT', 'OTHER'
    )),
    case_id TEXT,
    case_no TEXT,
    drive_folder_id TEXT,
    drive_folder_url TEXT,
    drive_file_id TEXT,
    drive_view_url TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.documents IS 'Index berkas digital, scan PDF, dan dokumen di Google Drive';

-- ------------------------------------------------------------------------------
-- 26. TABEL: drive_folders (Daftar Folder Google Drive Resmi)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.drive_folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'SK', 'LAWYER_SOMASI', 'MOU_KONTRAK', 'DEBTOR_CASES',
        'FIELD_OPS', 'FINANCE_RECEIPTS', 'SETTLEMENT', 'GENERAL', 'CUSTOM'
    )),
    folder_url TEXT NOT NULL,
    description TEXT,
    case_id TEXT,
    case_no TEXT,
    is_system_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.drive_folders IS 'Daftar direktori folder Google Drive per kategori dan per perkara';

-- ------------------------------------------------------------------------------
-- 27. TABEL: approvals (Pusat Persetujuan Direksi / Approval Center)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.approvals (
    id TEXT PRIMARY KEY,
    request_no TEXT UNIQUE NOT NULL,
    module TEXT NOT NULL CHECK (module IN ('CONTRACT', 'SK', 'EXPENSE', 'DANA_TALANGAN', 'SETTLEMENT', 'FINANCIAL_ADJUSTMENT')),
    target_id TEXT NOT NULL,
    target_reference TEXT NOT NULL,
    title TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    amount_or_value NUMERIC(18,2),
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.approvals IS 'Workflow antrean verifikasi dan persetujuan direktur eksekutif';

-- ------------------------------------------------------------------------------
-- 28. TABEL: notifications (Pusat Notifikasi Sistem)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('APPROVAL_NEEDED', 'SETTLEMENT_READY', 'SLA_ALERT', 'SYSTEM')),
    for_role TEXT NOT NULL CHECK (for_role IN ('SUPER_ADMIN_OPS', 'APPROVER_EXECUTIVE', 'VIEWER_COMMISSIONER', 'VIEWER_INVESTOR')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.notifications IS 'Notifikasi real-time untuk user berdasarkan role';

-- ------------------------------------------------------------------------------
-- 29. TABEL: audit_logs (Audit Trail & Rekam Jejak Aktivitas)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    username TEXT NOT NULL,
    user_role TEXT,
    action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'PAYMENT', 'EXPORT', 'FINANCIAL_REVERSAL')),
    module_name TEXT NOT NULL,
    target_id TEXT NOT NULL,
    details TEXT NOT NULL,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.audit_logs IS 'Log jejak aktivitas pengguna untuk audit kepatuhan ISO / SOX';

-- ------------------------------------------------------------------------------
-- 30. TABEL: settings (Konfigurasi Sistem & Integrasi)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY DEFAULT 'app_settings',
    google_sheet_id TEXT,
    apps_script_web_app_url TEXT,
    google_drive_folder_id TEXT,
    google_drive_folder_url TEXT,
    company_name TEXT,
    company_phone TEXT,
    company_email TEXT,
    company_address TEXT,
    company_logo TEXT,
    default_fee_percent NUMERIC(15,2) DEFAULT 15,
    default_company_commission_split_percent NUMERIC(15,2) DEFAULT 20,
    auto_sync_with_google_sheets BOOLEAN DEFAULT TRUE,
    database_config JSONB DEFAULT '[]'::jsonb,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.settings IS 'Pengaturan global sistem, identitas perusahaan, dan parameter fee';


-- ==============================================================================
-- 4. VIEW ALIASES (Memudahkan Query dengan Berbagai Standar Penamaan)
-- ==============================================================================

CREATE OR REPLACE VIEW public.fee_configs WITH (security_invoker = true) AS SELECT * FROM public.fees;
CREATE OR REPLACE VIEW public.communication_logs WITH (security_invoker = true) AS SELECT * FROM public.comm_logs;
CREATE OR REPLACE VIEW public.funding WITH (security_invoker = true) AS SELECT * FROM public.dana_talangan;
CREATE OR REPLACE VIEW public.cash WITH (security_invoker = true) AS SELECT * FROM public.cash_accounts;
CREATE OR REPLACE VIEW public.petty_cash_transactions WITH (security_invoker = true) AS SELECT * FROM public.petty_cash;
CREATE OR REPLACE VIEW public.working_capital_transactions WITH (security_invoker = true) AS SELECT * FROM public.working_capital;
CREATE OR REPLACE VIEW public.approval_requests WITH (security_invoker = true) AS SELECT * FROM public.approvals;
CREATE OR REPLACE VIEW public.app_settings WITH (security_invoker = true) AS SELECT * FROM public.settings;
CREATE OR REPLACE VIEW public.surat_kuasa WITH (security_invoker = true) AS SELECT * FROM public.sks;


-- ==============================================================================
-- 5. INDEXES PERFORMANSI
-- ==============================================================================

-- Index pencarian & relasi
CREATE INDEX IF NOT EXISTS idx_cases_client_id ON public.cases(client_id);
CREATE INDEX IF NOT EXISTS idx_cases_customer_id ON public.cases(customer_id);
CREATE INDEX IF NOT EXISTS idx_cases_current_personnel ON public.cases(current_personnel_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON public.cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_case_no ON public.cases(case_no);

CREATE INDEX IF NOT EXISTS idx_assignments_case_id ON public.assignments(case_id);
CREATE INDEX IF NOT EXISTS idx_assignments_personnel_id ON public.assignments(personnel_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON public.assignments(status);

CREATE INDEX IF NOT EXISTS idx_sks_case_id ON public.sks(case_id);
CREATE INDEX IF NOT EXISTS idx_sks_personnel_id ON public.sks(personnel_id);
CREATE INDEX IF NOT EXISTS idx_sks_status ON public.sks(status);

CREATE INDEX IF NOT EXISTS idx_lawyer_notices_case_id ON public.lawyer_notices(case_id);
CREATE INDEX IF NOT EXISTS idx_comm_logs_case_id ON public.comm_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_assets_case_id ON public.assets(case_id);

CREATE INDEX IF NOT EXISTS idx_collections_case_id ON public.collections(case_id);
CREATE INDEX IF NOT EXISTS idx_collections_personnel_id ON public.collections(personnel_id);

CREATE INDEX IF NOT EXISTS idx_asset_recoveries_case_id ON public.asset_recoveries(case_id);
CREATE INDEX IF NOT EXISTS idx_asset_recoveries_personnel_id ON public.asset_recoveries(personnel_id);
CREATE INDEX IF NOT EXISTS idx_asset_recoveries_payout_status ON public.asset_recoveries(partner_payout_status);

CREATE INDEX IF NOT EXISTS idx_dana_talangan_case_id ON public.dana_talangan(case_id);
CREATE INDEX IF NOT EXISTS idx_dana_talangan_status ON public.dana_talangan(status);

CREATE INDEX IF NOT EXISTS idx_payments_case_id ON public.payments(case_id);
CREATE INDEX IF NOT EXISTS idx_payments_personnel_id ON public.payments(personnel_id);
CREATE INDEX IF NOT EXISTS idx_payments_payout_status ON public.payments(partner_payout_status);

CREATE INDEX IF NOT EXISTS idx_expenses_case_id ON public.expenses(case_id);
CREATE INDEX IF NOT EXISTS idx_settlements_case_id ON public.settlements(case_id);
CREATE INDEX IF NOT EXISTS idx_settlements_client_id ON public.settlements(client_id);

CREATE INDEX IF NOT EXISTS idx_ledger_account ON public.ledger(account);
CREATE INDEX IF NOT EXISTS idx_ledger_date ON public.ledger(date);

CREATE INDEX IF NOT EXISTS idx_petty_cash_personnel_id ON public.petty_cash(personnel_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON public.approvals(status);
CREATE INDEX IF NOT EXISTS idx_notifications_role ON public.notifications(for_role, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);


-- ==============================================================================
-- 6. TRIGGERS UNTUK AUTO-UPDATE updated_at
-- ==============================================================================

DO $$
DECLARE
    t text;
    table_list text[] := ARRAY[
        'users', 'clients', 'personnel', 'services', 'fees', 'contracts',
        'leads', 'customers', 'cases', 'assignments', 'sks', 'lawyer_notices',
        'comm_logs', 'assets', 'collections', 'asset_recoveries', 'dana_talangan',
        'payments', 'expenses', 'settlements', 'ledger', 'cash_accounts',
        'petty_cash', 'working_capital', 'documents', 'drive_folders',
        'approvals', 'notifications', 'settings'
    ];
BEGIN
    FOREACH t IN ARRAY table_list
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_set_updated_at_%I ON public.%I;
            CREATE TRIGGER trg_set_updated_at_%I
            BEFORE UPDATE ON public.%I
            FOR EACH ROW
            EXECUTE FUNCTION public.set_updated_at();
        ', t, t, t, t);
    END LOOP;
END;
$$;


-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) & POLICIES
-- ==============================================================================

-- Aktifkan RLS di seluruh tabel
DO $$
DECLARE
    t text;
    table_list text[] := ARRAY[
        'users', 'clients', 'personnel', 'services', 'fees', 'contracts',
        'leads', 'customers', 'cases', 'assignments', 'sks', 'lawyer_notices',
        'comm_logs', 'assets', 'collections', 'asset_recoveries', 'dana_talangan',
        'payments', 'expenses', 'settlements', 'ledger', 'cash_accounts',
        'petty_cash', 'working_capital', 'documents', 'drive_folders',
        'approvals', 'notifications', 'audit_logs', 'settings'
    ];
BEGIN
    FOREACH t IN ARRAY table_list
    LOOP
        -- Aktifkan RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        
        -- Hapus kebijakan lama jika ada
        EXECUTE format('DROP POLICY IF EXISTS "Allow full access to authenticated users on %I" ON public.%I;', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow anon read/write on %I" ON public.%I;', t, t);
        
        -- Kebijakan default untuk aplikasi Web / API (authenticated & anon)
        EXECUTE format('
            CREATE POLICY "Allow anon read/write on %I"
            ON public.%I
            FOR ALL
            TO public
            USING (true)
            WITH CHECK (true);
        ', t, t);
    END LOOP;
END;
$$;

-- Selesai
