-- ==============================================================================
-- Supabase Migration: 20260907000100_fix_security_definer_views.sql
-- Fix: Security Definer View warning on all public views
-- Sets security_invoker = true so views enforce the querying user's RLS policies
-- ==============================================================================

-- 1. Mengubah view menjadi SECURITY INVOKER (PostgreSQL 15+)
ALTER VIEW IF EXISTS public.fee_configs SET (security_invoker = true);
ALTER VIEW IF EXISTS public.communication_logs SET (security_invoker = true);
ALTER VIEW IF EXISTS public.funding SET (security_invoker = true);
ALTER VIEW IF EXISTS public.cash SET (security_invoker = true);
ALTER VIEW IF EXISTS public.petty_cash_transactions SET (security_invoker = true);
ALTER VIEW IF EXISTS public.working_capital_transactions SET (security_invoker = true);
ALTER VIEW IF EXISTS public.approval_requests SET (security_invoker = true);
ALTER VIEW IF EXISTS public.app_settings SET (security_invoker = true);
ALTER VIEW IF EXISTS public.surat_kuasa SET (security_invoker = true);
