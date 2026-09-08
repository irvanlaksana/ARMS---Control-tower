-- =============================================================================
-- Supabase Migration: 20260908000000_add_personnel_sppi.sql
-- Tambah kolom berkas SPPI (opsional) pada tabel personnel.
-- File image diunggah ke Google Drive:
--   PT_MJ_INDONESIA / DATABASE_KARYAWAN / <NAMA> / 02_SPPI /
-- =============================================================================

ALTER TABLE public.personnel
    ADD COLUMN IF NOT EXISTS sppi_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS sppi_drive_file_id TEXT,
    ADD COLUMN IF NOT EXISTS sppi_drive_folder_url TEXT;

COMMENT ON COLUMN public.personnel.sppi_photo_url IS 'URL pratinjau / tautan Google Drive berkas SPPI (opsional)';
COMMENT ON COLUMN public.personnel.sppi_drive_file_id IS 'Google Drive file ID berkas SPPI';
COMMENT ON COLUMN public.personnel.sppi_drive_folder_url IS 'Tautan Google Drive file/folder SPPI';
