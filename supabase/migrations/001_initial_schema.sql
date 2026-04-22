-- ============================================
-- MeuMoney — Schema Inicial
-- Rodar no Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ============================================

-- Extensoes
create extension if not exists "uuid-ossp";

-- ============================================
-- TABELA: users
-- Estende o auth.users do Supabase com dados do WhatsApp
-- ============================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique not null,            -- telefone no formato E.164 (+5547999999999)
  wa_id text unique,                     -- WhatsApp ID (pode diferir do phone)
  name text,                             -- nome do perfil do WhatsApp
  plan text default 'free',              -- free | premium
  plan_expires_at timestamptz,
  onboarded_at timestamptz,              -- null = nunca completou onboarding
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- TABELA: categories
-- Categorias de transacao (padrao + custom do usuario)
-- ============================================
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,  -- null = categoria padrao global
  name text not null,
  type text not null check (type in ('income', 'expense')),
  icon text,                             -- emoji ou nome do icone
  keywords text[] default '{}',          -- keywords pra auto-categorizacao
  is_default boolean default false,
  created_at timestamptz default now()
);

-- ============================================
-- TABELA: transactions
-- Registro financeiro principal
-- ============================================
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(12,2) not null,
  description text,
  source text not null check (source in ('text', 'image', 'audio', 'manual')),
  ai_confidence numeric(3,2),            -- 0.00 a 1.00
  receipt_url text,                      -- URL no Supabase Storage
  date date not null default current_date,
  created_at timestamptz default now()
);

-- ============================================
-- TABELA: messages
-- Log de todas as mensagens do WhatsApp (auditoria + debug)
-- ============================================
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  wa_message_id text unique not null,    -- ID da mensagem no WhatsApp (deduplicacao)
  direction text not null check (direction in ('inbound', 'outbound')),
  type text not null,                    -- text, image, audio, template, interactive
  content jsonb,                         -- conteudo raw da mensagem
  transaction_id uuid references public.transactions(id) on delete set null,
  processed_at timestamptz,
  error text,
  created_at timestamptz default now()
);

-- ============================================
-- TABELA: monthly_reports
-- Relatorios mensais pre-calculados
-- ============================================
create table public.monthly_reports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  month integer not null,                -- 1-12
  year integer not null,
  total_income numeric(12,2) default 0,
  total_expense numeric(12,2) default 0,
  balance numeric(12,2) default 0,
  category_breakdown jsonb,              -- { "Alimentacao": 450.00, "Transporte": 120.00 }
  generated_at timestamptz default now(),
  unique(user_id, month, year)
);

-- ============================================
-- RLS (Row Level Security)
-- ============================================
alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.messages enable row level security;
alter table public.monthly_reports enable row level security;

-- Users: so ve o proprio perfil
create policy "users_own" on public.users
  for all using (auth.uid() = id);

-- Categories: ve as proprias + as padrao (user_id is null)
create policy "categories_own_or_default" on public.categories
  for select using (user_id = auth.uid() or user_id is null);
create policy "categories_manage_own" on public.categories
  for all using (user_id = auth.uid());

-- Transactions: so as proprias
create policy "transactions_own" on public.transactions
  for all using (user_id = auth.uid());

-- Messages: so as proprias
create policy "messages_own" on public.messages
  for all using (user_id = auth.uid());

-- Monthly reports: so os proprios
create policy "reports_own" on public.monthly_reports
  for all using (user_id = auth.uid());

-- ============================================
-- INDEXES
-- ============================================
create index idx_transactions_user_date on public.transactions(user_id, date desc);
create index idx_transactions_category on public.transactions(category_id);
create index idx_messages_wa_id on public.messages(wa_message_id);
create index idx_messages_user on public.messages(user_id, created_at desc);
create index idx_categories_user on public.categories(user_id);

-- ============================================
-- SEED: Categorias padrao
-- ============================================
insert into public.categories (name, type, icon, keywords, is_default) values
  -- Despesas
  ('Alimentação', 'expense', '🍔', array['mercado', 'supermercado', 'restaurante', 'lanche', 'almoço', 'jantar', 'café', 'padaria', 'ifood', 'rappi', 'feira', 'açougue', 'hortifruti', 'pizza', 'hambúrguer', 'sushi', 'comida'], true),
  ('Transporte', 'expense', '🚗', array['uber', '99', 'gasolina', 'combustível', 'estacionamento', 'pedágio', 'ônibus', 'metrô', 'trem', 'táxi', 'moto', 'posto', 'etanol', 'diesel', 'manutenção carro'], true),
  ('Moradia', 'expense', '🏠', array['aluguel', 'condomínio', 'iptu', 'luz', 'água', 'gás', 'internet', 'energia', 'conta de luz', 'conta de água', 'celular', 'telefone', 'wifi'], true),
  ('Saúde', 'expense', '🏥', array['farmácia', 'remédio', 'médico', 'consulta', 'exame', 'dentista', 'hospital', 'plano de saúde', 'academia', 'drogaria', 'medicamento'], true),
  ('Educação', 'expense', '📚', array['faculdade', 'curso', 'escola', 'livro', 'material', 'mensalidade', 'udemy', 'alura', 'inglês', 'aula'], true),
  ('Lazer', 'expense', '🎮', array['cinema', 'netflix', 'spotify', 'jogo', 'viagem', 'bar', 'festa', 'show', 'teatro', 'parque', 'streaming', 'assinatura', 'hobby'], true),
  ('Compras', 'expense', '🛍️', array['roupa', 'sapato', 'shopping', 'presente', 'eletrônico', 'celular', 'amazon', 'shopee', 'mercado livre', 'magalu', 'shein'], true),
  ('Pets', 'expense', '🐾', array['ração', 'veterinário', 'pet', 'petshop', 'cachorro', 'gato', 'banho', 'tosa', 'vacina pet'], true),
  ('Outros', 'expense', '📦', array[]::text[], true),
  ('Vestuário', 'expense', '👕', array['tênis', 'tenis', 'loja', 'camiseta', 'calça', 'vestido', 'blusa', 'jaqueta'], true),
  ('Serviços', 'expense', '⚡', array['conta', 'fatura', 'parcela', 'boleto'], true),
  -- Receitas
  ('Salário', 'income', '💼', array['salário', 'salario', 'holerite', 'pagamento', 'contracheque', 'folha'], true),
  ('Freelance', 'income', '💻', array['freelance', 'freela', 'job', 'projeto', 'consultoria', 'serviço', 'bico', 'extra'], true),
  ('Investimentos', 'income', '📈', array['dividendo', 'rendimento', 'juros', 'investimento', 'ação', 'fundo', 'cdb', 'tesouro', 'poupança'], true),
  ('Vendas', 'income', '🏷️', array['venda', 'vendi', 'vendido'], true),
  ('Outros', 'income', '💰', array[]::text[], true);
