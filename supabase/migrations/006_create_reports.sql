-- MeuMoney — Migração: tabela reports (reportar bugs/problemas)
-- Rodar no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'bug',
  status TEXT NOT NULL DEFAULT 'open',
  context JSONB,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_own" ON public.reports
  FOR SELECT USING (user_id = auth.uid());

-- Index
CREATE INDEX idx_reports_user ON public.reports(user_id, created_at DESC);
CREATE INDEX idx_reports_status ON public.reports(status);
