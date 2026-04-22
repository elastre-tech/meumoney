-- ============================================
-- MeuMoney — Migração: adicionar onboarding_step
-- Rodar no Supabase SQL Editor
-- ============================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 0;
