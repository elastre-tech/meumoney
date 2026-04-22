-- MeuMoney — Migração: adicionar categoria Comissão
-- Rodar no Supabase SQL Editor

INSERT INTO public.categories (name, type, icon, keywords, is_default)
SELECT 'Comissão', 'income', '💸', array['comissão', 'comissao'], true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Comissão' AND is_default = true);
