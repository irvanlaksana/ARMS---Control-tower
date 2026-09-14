-- =============================================================================
-- Supabase Migration: 20260914000000_add_asset_recovery_manual_fees.sql
-- Tambah kolom "Biaya Tambahan Manual" pada tabel asset_recoveries (BAST /
-- Eksekusi Unit) agar tombol "+ Tambah Biaya" di modul Asset Repossession,
-- BAST & Commission Settlement dan Eksekusi Unit & Penyerahan BAST tersimpan
-- permanen — skemanya mengikuti `payments.manual_splits` yang sudah ada.
--
-- Nilai `repossession_fee`, `company_fee_amount`, dan `partner_commission_amount`
-- sudah mencakup biaya manual ini (tier engine + biaya tambahan manual).
-- =============================================================================

ALTER TABLE public.asset_recoveries
    ADD COLUMN IF NOT EXISTS manual_splits JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS manual_fees_total NUMERIC(18,2) DEFAULT 0;

COMMENT ON COLUMN public.asset_recoveries.manual_splits IS 'Daftar biaya tambahan manual [{name, amount, allocation: COMPANY|SPLIT}] di luar kalkulasi tier engine';
COMMENT ON COLUMN public.asset_recoveries.manual_fees_total IS 'Total seluruh biaya tambahan manual pada BAST ini (sudah termasuk dalam repossession_fee)';
