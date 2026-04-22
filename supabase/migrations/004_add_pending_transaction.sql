-- ============================================
-- MeuMoney — Migração: adicionar pending_transaction
-- Rodar no Supabase SQL Editor
-- ============================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pending_transaction jsonb DEFAULT NULL;
