-- ==============================================================================
-- ARMS (Agency Recovery Management System) - Control Tower
-- Initial Seed Data for Supabase
-- Version: 1.0.0
-- ==============================================================================

-- 1. USERS (Pengguna Sistem Control Tower)
INSERT INTO public.users (id, username, name, email, role, department, status, last_login, created_at)
VALUES
('USR-001', 'superadmin', 'Super Admin Control Tower', 'admin@arms-controltower.co.id', 'SUPER_ADMIN_OPS', 'Control Tower Operations', 'ACTIVE', '2026-08-18T10:00:00Z', '2026-01-01T08:00:00Z'),
('USR-002', 'direktur', 'Direktur Utama (Executive Approver)', 'direktur@arms-controltower.co.id', 'APPROVER_EXECUTIVE', 'Direksi & Executive Board', 'ACTIVE', '2026-08-18T10:00:00Z', '2026-01-01T08:00:00Z'),
('USR-003', 'komisaris', 'Dewan Komisaris', 'komisaris@arms-controltower.co.id', 'VIEWER_COMMISSIONER', 'Dewan Pengawas & Komisaris', 'ACTIVE', '2026-08-18T10:00:00Z', '2026-01-01T08:00:00Z'),
('USR-004', 'investor', 'Investor & Funder Partner', 'investor@funderpool.co.id', 'VIEWER_INVESTOR', 'Strategic Liquidity & Investor', 'ACTIVE', '2026-08-18T10:00:00Z', '2026-01-01T08:00:00Z')
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    status = EXCLUDED.status;

-- 2. CLIENTS (Klien Multifinance & Kreditur Perorangan)
INSERT INTO public.clients (
    id, client_code, company_name, industry, client_type, nik_ktp, contact_person,
    phone, email, address, tier, active_cases_count, status,
    gdrive_folder_url, gdrive_folder_id, proposal_drive_url, proposal_drive_folder_id,
    proposal_status, mou_drive_url, mou_drive_folder_id, mou_contract_no,
    mou_status, skp_drive_folder_url, skp_drive_folder_id, created_at
)
VALUES
(
    'CLI-001', 'CLI-ADIRA', 'PT Adira Dinamika Multi Finance Tbk', 'MULTIFINANCE', 'MULTIFINANCE', NULL,
    'Bapak Budi Santoso (Head of Remedial)', '021-52901111', 'remedial.head@adira.co.id',
    'Adira Tower, Jl. M.T. Haryono Tbk No. 42, Jakarta Selatan', 'TIER_1', 2, 'ACTIVE',
    'https://drive.google.com/drive/folders/1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS?usp=sharing', 'GDRIVE-CLI-ADIRA-001',
    'https://drive.google.com/file/d/1ADIRA_PROPOSAL_KERJASAMA_2026/view?usp=sharing', 'PROP-ADIRA-2026',
    'ACCEPTED', 'https://drive.google.com/file/d/1ADIRA_MOU_PKS_PT_MJ_2026/view?usp=sharing', 'MOU-ADIRA-2026',
    'MOU/MJ-ADIRA/2026/089', 'ACTIVE', 'https://drive.google.com/drive/folders/1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS?usp=sharing',
    'SKP-FLD-ADIRA', '2026-01-15T08:00:00Z'
),
(
    'CLI-002', 'CLI-BRI', 'PT Bank Rakyat Indonesia (Persero) Tbk', 'BANKING', 'MULTIFINANCE', NULL,
    'Ibu Ratna Dewi (VP Consumer NPL)', '021-5758900', 'npl_consumer@bri.co.id',
    'Gedung BRI 1, Jl. Jend. Sudirman Kav. 44-46, Jakarta Pusat', 'TIER_1', 0, 'ACTIVE',
    'https://drive.google.com/drive/folders/1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS?usp=sharing', 'GDRIVE-CLI-BRI-002',
    'https://drive.google.com/file/d/1BRI_PROPOSAL_KERJASAMA_2026/view?usp=sharing', 'PROP-BRI-2026',
    'SENT', 'https://drive.google.com/file/d/1BRI_MOU_PKS_PT_MJ_2026/view?usp=sharing', 'MOU-BRI-2026',
    'MOU/MJ-BRI/2026/012', 'SIGNED', 'https://drive.google.com/drive/folders/1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS?usp=sharing',
    'SKP-FLD-BRI', '2026-02-01T08:00:00Z'
),
(
    'CLI-003', 'CLI-AKULAKU', 'PT Akulaku Finance Indonesia', 'FINTECH', 'MULTIFINANCE', NULL,
    'Bapak Kevin Wijaya (Collection Manager)', '021-29208888', 'collection@akulaku.com',
    'Sahid Sudirman Center Lt. 18, Jl. Jend. Sudirman, Jakarta Pusat', 'TIER_2', 1, 'ACTIVE',
    'https://drive.google.com/drive/folders/1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS?usp=sharing', 'GDRIVE-CLI-AKULAKU-003',
    'https://drive.google.com/file/d/1AKULAKU_PROPOSAL_KERJASAMA_2026/view?usp=sharing', 'PROP-AKU-2026',
    'ACCEPTED', 'https://drive.google.com/file/d/1AKULAKU_MOU_PKS_PT_MJ_2026/view?usp=sharing', 'MOU-AKU-2026',
    'MOU/MJ-AKULAKU/2026/045', 'ACTIVE', 'https://drive.google.com/drive/folders/1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS?usp=sharing',
    'SKP-FLD-AKULAKU', '2026-02-20T08:00:00Z'
),
(
    'CLI-004', 'CLI-PER-01', 'H. Rahmat Hidayat, S.E. (Kreditur Perorangan)', 'PERORANGAN', 'PERORANGAN', '3302101506780002',
    'H. Rahmat Hidayat', '0813-2233-4455', 'rahmat.hidayat@gmail.com',
    'Jl. Overste Isdiman No. 88, Purwokerto Lor, Banyumas', 'TIER_1', 0, 'ACTIVE',
    'https://drive.google.com/drive/folders/1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS?usp=sharing', NULL,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-01T08:00:00Z'
)
ON CONFLICT (id) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    status = EXCLUDED.status,
    active_cases_count = EXCLUDED.active_cases_count;

-- 3. PERSONNEL (Karyawan & Mitra Debt Collector)
INSERT INTO public.personnel (
    id, type, full_name, nik_ktp, birth_place_date, address, phone_number,
    email, bank_name, account_number, account_name, emergency_contact,
    position, status, gdrive_folder_url, gdrive_folder_id, ktp_drive_folder_url,
    ktp_drive_file_id, created_at
)
VALUES
(
    'PER-001', 'KARYAWAN', 'Rian Firmansyah, S.H.', '3174091208900001', 'Jakarta, 12 Agustus 1990',
    'Jl. Kebon Jeruk Raya No. 15, Jakarta Barat', '0812-8888-9900', 'rian.firmansyah@arms-controltower.co.id',
    'Bank Mandiri', '123-00-0987654-3', 'Rian Firmansyah', 'Istri - Maya (0812-9900-1122)',
    'Supervisor Field Operations & Legal', 'ACTIVE',
    'https://drive.google.com/drive/folders/1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS?usp=sharing', 'GDRIVE-PER-RIAN-001',
    'https://drive.google.com/file/d/1RIAN_KTP_DOC_2026/view?usp=sharing', 'GDRIVE-KTP-RIAN', '2026-01-10T08:00:00Z'
),
(
    'PER-002', 'MITRA_DC', 'Ahmad Hidayat', '3275021505880003', 'Bandung, 15 Mei 1988',
    'Jl. Margahayu Raya No. 88, Bekasi', '0857-1122-3344', 'ahmad.dc@gmail.com',
    'BCA', '883-0912-441', 'Ahmad Hidayat', 'Adik - Dedi (0857-9988-7766)',
    'Field Specialist Recovery Nmax & Mobil', 'ACTIVE',
    'https://drive.google.com/drive/folders/1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS?usp=sharing', 'GDRIVE-PER-AHMAD-002',
    'https://drive.google.com/file/d/1AHMAD_KTP_DOC_2026/view?usp=sharing', 'GDRIVE-KTP-AHMAD', '2026-01-12T08:00:00Z'
)
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone_number = EXCLUDED.phone_number,
    status = EXCLUDED.status;

-- 4. SERVICES (Katalog Layanan)
INSERT INTO public.services (id, service_code, name, category, description, default_fee_type, status, created_at)
VALUES
(
    'SRV-001', 'SRV-RECOVERY-UNIT', 'Penagihan & Recovery Unit Kendaraan', 'RECOVERY_UNIT',
    'Jasa penelusuran, penagihan, dan eksekusi pengamanan unit kendaraan bermotor (R2/R4) yang menunggak.', 'SUCCESS_FEE', 'ACTIVE', '2026-01-01T08:00:00Z'
),
(
    'SRV-002', 'SRV-DANA-TALANGAN', 'Liquidity Bridging & Dana Talangan Penarikan', 'DANA_TALANGAN_PENARIKAN',
    'Penyediaan dana talangan untuk biaya towing, gudang, dan operasional taktis penarikan unit.', 'PERCENT', 'ACTIVE', '2026-01-01T08:00:00Z'
),
(
    'SRV-003', 'SRV-SOMASI-HUKUM', 'Somasi Hukum & Mediasi Penagihan Korporat', 'PENAGIHAN_KORPORAT',
    'Penerbitan Somasi 1, 2, Terakhir oleh Kantor Hukum serta mediasi penyelesaian hutang.', 'FIXED', 'ACTIVE', '2026-01-01T08:00:00Z'
),
(
    'SRV-004', 'SRV-PENAGIHAN-PERORANGAN', 'Penagihan & Mediasi Piutang Perorangan', 'PENAGIHAN_PERORANGAN',
    'Layanan penagihan dan mediasi piutang perseorangan/individu (Surat Pengakuan Hutang/SPH, Kwitansi, Pinjaman Pribadi, Cek/Bilyet Giro Kosong) secara persuasif dan hukum.', 'SUCCESS_FEE', 'ACTIVE', '2026-01-01T08:00:00Z'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    status = EXCLUDED.status;

-- 5. FEES (Konfigurasi Fee Klien)
INSERT INTO public.fees (id, client_id, client_name, service_id, service_name, fee_type, success_fee_percent, effective_date, status, created_at)
VALUES
('FEE-001', 'CLI-001', 'PT Adira Dinamika Multi Finance Tbk', 'SRV-001', 'Penagihan & Recovery Unit Kendaraan', 'SUCCESS_FEE', 15.00, '2026-01-15', 'ACTIVE', '2026-01-15T08:00:00Z'),
('FEE-002', 'CLI-003', 'PT Akulaku Finance Indonesia', 'SRV-001', 'Penagihan & Recovery Unit Kendaraan', 'SUCCESS_FEE', 18.00, '2026-02-20', 'ACTIVE', '2026-02-20T08:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- 6. CONTRACTS (Kontrak & Perjanjian Kerjasama)
INSERT INTO public.contracts (
    id, contract_no, client_id, client_name, title, start_date, end_date,
    fee_structure_summary, status, approved_by, approved_at, drive_document_url, created_at
)
VALUES
(
    'CTR-001', 'MOU/MJ-ADIRA/2026/089', 'CLI-001', 'PT Adira Dinamika Multi Finance Tbk',
    'MoU & PKS Kerjasama Penagihan & Recovery Unit 2026', '2026-01-15', '2027-01-15',
    'Success Fee 15% dari total penagihan / hasil lelang unit', 'ACTIVE', 'Direktur Utama',
    '2026-01-16T10:00:00Z', 'https://drive.google.com/file/d/1ADIRA_MOU_PKS_PT_MJ_2026/view?usp=sharing', '2026-01-15T08:00:00Z'
),
(
    'CTR-002', 'MOU/MJ-AKULAKU/2026/045', 'CLI-003', 'PT Akulaku Finance Indonesia',
    'MoU & PKS Kerjasama Asset Recovery & Remedial 2026', '2026-02-20', '2027-02-20',
    'Success Fee 18% per unit secured / pelunasan', 'ACTIVE', 'Direktur Utama',
    '2026-02-21T09:30:00Z', 'https://drive.google.com/file/d/1AKULAKU_MOU_PKS_PT_MJ_2026/view?usp=sharing', '2026-02-20T08:00:00Z'
)
ON CONFLICT (id) DO NOTHING;

-- 7. CUSTOMERS (Debitur)
INSERT INTO public.customers (
    id, customer_code, contract_no, nik_ktp, full_name, phone,
    address_current, address_ktp, workplace, emergency_contact_name,
    emergency_contact_phone, due_date, installment_amount, total_installment,
    penalty_amount, vehicle_merk_type, vehicle_police_no, risk_notes,
    gdrive_folder_url, created_at
)
VALUES
(
    'CUST-001', 'DEB-ADR-001', 'ADR-2026-98124', '3175081905850004', 'Budi Setiawan', '0812-3456-7890',
    'Jl. Merdeka Barat No. 45, Jakarta Barat', 'Jl. Merdeka Barat No. 45, RT 02/05, Jakarta Barat', 'PT Maju Terus Logistik',
    'Siti Nurhaliza (Istri)', '0812-9988-7711', '2026-05-15', 'Rp 4.750.000 / Bulan', 142500000.00,
    'Rp 2.150.000', 'Toyota Avanza Veloz 1.5 AT (2022)', 'B 1829 KLC',
    'Debitur menunggak 4 bulan (DPD 120+). Unit terpantau masih beroperasi di area Jakarta Barat.',
    'https://drive.google.com/drive/folders/1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS?usp=sharing', '2026-03-01T08:00:00Z'
),
(
    'CUST-002', 'DEB-ADR-002', 'ADR-2026-77319', '3276012408890002', 'Hendri Gunawan', '0813-7766-5544',
    'Perum Grand Galaxy City Blok EB No. 12, Bekasi Selatan', 'Perum Grand Galaxy City Blok EB No. 12, Bekasi Selatan', 'CV Bintang Mandiri',
    'Ratna (Ibu)', '0813-1122-3300', '2026-06-10', 'Rp 6.850.000 / Bulan', 215000000.00,
    'Rp 3.400.000', 'Honda HR-V E CVT (2023)', 'B 2099 JKL',
    'Unit dipindahtangankan tanpa izin lising. Perlu mediasi khusus atau penarikan lapangan.',
    'https://drive.google.com/drive/folders/1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS?usp=sharing', '2026-03-05T08:00:00Z'
),
(
    'CUST-003', 'DEB-AKU-001', 'AKU-2026-44211', '3171035511940008', 'Dewi Lestari', '0856-9900-1122',
    'Apartemen Green Pramuka Tower F Lt. 15, Jakarta Pusat', 'Jl. Cempaka Putih Timur No. 8, Jakarta Pusat', 'Karyawan Swasta',
    'Agus (Kakak)', '0856-1122-3344', '2026-07-01', 'Rp 1.450.000 / Bulan', 28750000.00,
    'Rp 650.000', 'Yamaha NMAX 155 Connected (2023)', 'B 4910 PXZ',
    'Nomor sulit dihubungi, alamat tinggal sesuai aplikasi.',
    'https://drive.google.com/drive/folders/1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS?usp=sharing', '2026-03-10T08:00:00Z'
)
ON CONFLICT (id) DO NOTHING;

-- 8. CASES (Kasus Piutang & Penagihan)
INSERT INTO public.cases (
    id, case_no, client_id, client_name, client_type, contract_id, customer_id,
    debtor_name, debtor_nik, multifinance_contract_no, service_id, service_name,
    principal_debt_os, overdue_days, dpd_bucket, asset_summary, gdrive_folder_name,
    gdrive_folder_url, gdrive_folder_id, skp_drive_document_url, sph_drive_document_url,
    fee_type_snapshot, fee_percent_snapshot, status, current_personnel_id, current_personnel_name, created_at
)
VALUES
(
    'CAS-001', 'CAS/ADR/2026/001', 'CLI-001', 'PT Adira Dinamika Multi Finance Tbk', 'MULTIFINANCE',
    'CTR-001', 'CUST-001', 'Budi Setiawan', '3175081905850004', 'ADR-2026-98124', 'SRV-001', 'Penagihan & Recovery Unit Kendaraan',
    142500000.00, 124, '90-180', 'Toyota Avanza Veloz 1.5 AT 2022 (B 1829 KLC)', '📁 DEBITUR_BUDI_SETIAWAN',
    'https://drive.google.com/drive/folders/1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS?usp=sharing', 'GDRIVE-DEB-BUDI-001',
    'https://drive.google.com/file/d/1SKP_BUDI_SETIAWAN_ADIRA_2026/view?usp=sharing',
    'https://drive.google.com/file/d/1SPH_KTP_BUDI_SETIAWAN/view?usp=sharing',
    'SUCCESS_FEE', 15.00, 'FIELD_ACTION', 'PER-001', 'Rian Firmansyah, S.H.', '2026-03-01T08:00:00Z'
),
(
    'CAS-002', 'CAS/ADR/2026/002', 'CLI-001', 'PT Adira Dinamika Multi Finance Tbk', 'MULTIFINANCE',
    'CTR-001', 'CUST-002', 'Hendri Gunawan', '3276012408890002', 'ADR-2026-77319', 'SRV-001', 'Penagihan & Recovery Unit Kendaraan',
    215000000.00, 145, '90-180', 'Honda HR-V E CVT 2023 (B 2099 JKL)', '📁 DEBITUR_HENDRI_GUNAWAN',
    'https://drive.google.com/drive/folders/1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS?usp=sharing', 'GDRIVE-DEB-HENDRI-002',
    'https://drive.google.com/file/d/1SKP_HENDRI_GUNAWAN_ADIRA_2026/view?usp=sharing',
    'https://drive.google.com/file/d/1SPH_KTP_HENDRI_GUNAWAN/view?usp=sharing',
    'SUCCESS_FEE', 15.00, 'ASSIGNED', 'PER-002', 'Ahmad Hidayat', '2026-03-05T08:00:00Z'
),
(
    'CAS-003', 'CAS/AKU/2026/001', 'CLI-003', 'PT Akulaku Finance Indonesia', 'MULTIFINANCE',
    'CTR-002', 'CUST-003', 'Dewi Lestari', '3171035511940008', 'AKU-2026-44211', 'SRV-001', 'Penagihan & Recovery Unit Kendaraan',
    28750000.00, 95, '90-180', 'Yamaha NMAX 155 Connected 2023 (B 4910 PXZ)', '📁 DEBITUR_DEWI_LESTARI',
    'https://drive.google.com/drive/folders/1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS?usp=sharing', 'GDRIVE-DEB-DEWI-003',
    'https://drive.google.com/file/d/1SKP_DEWI_LESTARI_AKULAKU_2026/view?usp=sharing',
    'https://drive.google.com/file/d/1SPH_KTP_DEWI_LESTARI/view?usp=sharing',
    'SUCCESS_FEE', 18.00, 'ASSIGNED', 'PER-002', 'Ahmad Hidayat', '2026-03-10T08:00:00Z'
)
ON CONFLICT (id) DO NOTHING;

-- 9. ASSIGNMENTS (Penugasan Lapangan)
INSERT INTO public.assignments (
    id, assignment_no, case_id, case_no, debtor_name, personnel_id, personnel_name,
    assigned_date, target_date, sla_days, instructions, status, gdrive_folder_url, created_at
)
VALUES
(
    'ASG-001', 'ASG/MJ/2026/001', 'CAS-001', 'CAS/ADR/2026/001', 'Budi Setiawan',
    'PER-001', 'Rian Firmansyah, S.H.', '2026-03-02', '2026-03-16', 14,
    'Kunjungi debitur di kantor dan rumah. Bawa Surat Tugas & Kuasa Resmi.',
    'IN_PROGRESS', 'https://drive.google.com/drive/folders/1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS?usp=sharing', '2026-03-02T08:00:00Z'
)
ON CONFLICT (id) DO NOTHING;

-- 10. SKS (Surat Kuasa & Surat Tugas)
INSERT INTO public.sks (
    id, sk_number, case_id, case_no, debtor_name, client_type, client_name,
    pemberi_kuasa_type, personnel_id, personnel_name, issued_date, expiry_date,
    status, approved_by, approved_at, drive_folder_url, drive_document_url, created_at
)
VALUES
(
    'SK-001', 'SK/MJ/ADR/2026/001', 'CAS-001', 'CAS/ADR/2026/001', 'Budi Setiawan',
    'MULTIFINANCE', 'PT Adira Dinamika Multi Finance Tbk', 'PERUSAHAAN',
    'PER-001', 'Rian Firmansyah, S.H.', '2026-03-01', '2026-04-01',
    'ACTIVE', 'Direktur Utama', '2026-03-01T10:00:00Z',
    'https://drive.google.com/drive/folders/1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS?usp=sharing',
    'https://drive.google.com/file/d/1SKP_BUDI_SETIAWAN_ADIRA_2026/view?usp=sharing', '2026-03-01T08:00:00Z'
),
(
    'SK-002', 'SK/MJ/ADR/2026/002', 'CAS-002', 'CAS/ADR/2026/002', 'Hendri Gunawan',
    'MULTIFINANCE', 'PT Adira Dinamika Multi Finance Tbk', 'PERUSAHAAN',
    'PER-002', 'Ahmad Hidayat', '2026-03-05', '2026-04-05',
    'ACTIVE', 'Direktur Utama', '2026-03-05T11:00:00Z',
    'https://drive.google.com/drive/folders/1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS?usp=sharing',
    'https://drive.google.com/file/d/1SKP_HENDRI_GUNAWAN_ADIRA_2026/view?usp=sharing', '2026-03-05T08:00:00Z'
),
(
    'SK-003', 'SK/MJ/AKU/2026/001', 'CAS-003', 'CAS/AKU/2026/001', 'Dewi Lestari',
    'MULTIFINANCE', 'PT Akulaku Finance Indonesia', 'PERUSAHAAN',
    'PER-002', 'Ahmad Hidayat', '2026-03-10', '2026-04-10',
    'ACTIVE', 'Direktur Utama', '2026-03-10T09:00:00Z',
    'https://drive.google.com/drive/folders/1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS?usp=sharing',
    'https://drive.google.com/file/d/1SKP_DEWI_LESTARI_AKULAKU_2026/view?usp=sharing', '2026-03-10T08:00:00Z'
)
ON CONFLICT (id) DO NOTHING;

-- 11. CASH ACCOUNTS (Rekening Kas & Bank)
INSERT INTO public.cash_accounts (
    id, account_name, bank_name, account_no, account_holder, branch, balance, type, notes, last_updated, created_at
)
VALUES
(
    'ACC-001', 'Rekening Utama Modal Kerja & Penampungan', 'Bank Mandiri', '137-00-998877-1',
    'PT MITRA JASA TAMA', 'KC Jakarta Sudirman', 0.00, 'MODAL_KERJA_POOL',
    'Rekening penerimaan injeksi modal kerja direksi & investor', '2026-08-18T12:00:00Z', '2026-08-18T12:00:00Z'
),
(
    'ACC-002', 'Rekening Vault Likuiditas & Dana Talangan', 'Bank Central Asia (BCA)', '883-00-112233-5',
    'PT MITRA JASA TAMA', 'KCU Thamrin', 0.00, 'TALANGAN_VAULT',
    'Pool dana talangan penarikan unit & bridging fee', '2026-08-18T12:00:00Z', '2026-08-18T12:00:00Z'
),
(
    'ACC-003', 'Rekening Operasional & Biaya Lapangan', 'Bank Negara Indonesia (BNI)', '023-456-7890',
    'PT MITRA JASA TAMA', 'KC Senayan', 0.00, 'OPERATIONAL',
    'Rekening operasional disbursement towing, SPV & desk ops', '2026-08-18T12:00:00Z', '2026-08-18T12:00:00Z'
),
(
    'ACC-004', 'Kas Kecil Operasional (Petty Cash Vault)', 'Cash on Hand (Brankas Kantor)', 'PETTY-CASH-OPS',
    'Finance & Kasir PT MJT', 'Kantor Pusat Karawang', 0.00, 'PETTY_CASH',
    'Kas tunai brankas kantor untuk pengeluaran taktis harian', '2026-08-18T12:00:00Z', '2026-08-18T12:00:00Z'
)
ON CONFLICT (id) DO NOTHING;

-- 12. DRIVE FOLDERS (Folder Google Drive)
INSERT INTO public.drive_folders (id, name, category, folder_url, description, is_system_default, created_at)
VALUES
('FLD-01', '01. Surat Tugas & Surat Kuasa (SK)', 'SK', 'https://drive.google.com/drive/folders/1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS?usp=sharing', 'Folder arsip scan PDF Surat Kuasa & Surat Tugas lapangan penagihan', TRUE, '2026-08-18T12:00:00Z'),
('FLD-02', '02. Surat Somasi & Dokumen Litigasi Advokat', 'LAWYER_SOMASI', 'https://drive.google.com/drive/folders/1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS?usp=sharing', 'Folder berkas somasi I/II/Terakhir dan dokumen gugatan hukum', TRUE, '2026-08-18T12:00:00Z'),
('FLD-03', '03. MoU & Perjanjian Kerjasama Kemitraan', 'MOU_KONTRAK', 'https://drive.google.com/drive/folders/1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS?usp=sharing', 'Folder arsip kontrak kerjasama multifinance dan kreditur perorangan', TRUE, '2026-08-18T12:00:00Z'),
('FLD-04', '04. Berkas Debitur (KTP, SPH & Perjanjian Pokok)', 'DEBTOR_CASES', 'https://drive.google.com/drive/folders/1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS?usp=sharing', 'Folder arsip identitas debitur, surat pengakuan hutang, dan sertifikat fidusia', TRUE, '2026-08-18T12:00:00Z'),
('FLD-05', '05. Berita Acara Serah Terima & Dokumentasi Lapangan', 'FIELD_OPS', 'https://drive.google.com/drive/folders/1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS?usp=sharing', 'Folder foto unit kendaraan, temu debitur, dan BAST penarikan', TRUE, '2026-08-18T12:00:00Z'),
('FLD-06', '06. Bukti Pembayaran, Transfer & Kwitansi Keuangan', 'FINANCE_RECEIPTS', 'https://drive.google.com/drive/folders/1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS?usp=sharing', 'Folder struk transfer pelunasan, kwitansi kas, dan bukti talangan', TRUE, '2026-08-18T12:00:00Z'),
('FLD-07', '07. Laporan Settlement & Rekonsiliasi Pelunasan', 'SETTLEMENT', 'https://drive.google.com/drive/folders/1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS?usp=sharing', 'Folder laporan penyelesaian perkara dan pembagian hak tagih', TRUE, '2026-08-18T12:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- 13. NOTIFICATIONS (Notifikasi Sistem)
INSERT INTO public.notifications (id, title, message, type, for_role, is_read, created_at)
VALUES
(
    'NTF-001', 'Database Bersih',
    'Data operasional telah disinkronkan ke database Supabase ARMS Control Tower.',
    'SYSTEM', 'SUPER_ADMIN_OPS', FALSE, '2026-08-18T12:00:00Z'
)
ON CONFLICT (id) DO NOTHING;

-- 14. AUDIT LOGS (Audit Log Awal)
INSERT INTO public.audit_logs (id, timestamp, username, user_role, action, module_name, target_id, details, ip_address, created_at)
VALUES
(
    'AUD-001', '2026-08-18T12:00:00Z', 'superadmin', 'SUPER_ADMIN_OPS', 'CREATE',
    'SYSTEM_INIT', 'ALL_TABLES', 'Inisialisasi skema tabel Supabase untuk ARMS Control Tower', '127.0.0.1', '2026-08-18T12:00:00Z'
)
ON CONFLICT (id) DO NOTHING;

-- 15. SETTINGS (Pengaturan Aplikasi)
INSERT INTO public.settings (
    id, google_sheet_id, apps_script_web_app_url, google_drive_folder_id,
    google_drive_folder_url, company_name, company_phone, company_email,
    company_address, default_fee_percent, default_company_commission_split_percent,
    auto_sync_with_google_sheets, created_at
)
VALUES
(
    'app_settings', '', '', '1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS',
    'https://drive.google.com/drive/folders/1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS?usp=sharing',
    'PT MJ Agency Recovery Indonesia', '021-555-8989', 'admin@arms-controltower.co.id',
    'Gedung Control Tower Ops Lt. 12, Jakarta', 15.00, 20.00,
    TRUE, '2026-08-18T12:00:00Z'
)
ON CONFLICT (id) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    company_email = EXCLUDED.company_email,
    company_phone = EXCLUDED.company_phone;
