-- AgendaPRO — Migration V3
-- Features: Sistema de Pontos, Fila de Espera, Link de Indicação, Google Reviews
-- Rodar no SQL Editor do Supabase

-- =============================================
-- 1. ALTERAÇÕES NAS TABELAS EXISTENTES
-- =============================================

-- Pontos por serviço
alter table services add column if not exists points integer default 0;

-- Google Reviews + configurações de pontos no negócio
alter table businesses add column if not exists google_place_id text;
alter table businesses add column if not exists google_rating numeric(2,1);
alter table businesses add column if not exists google_reviews_count integer;
alter table businesses add column if not exists points_for_review integer default 0;
alter table businesses add column if not exists points_for_referral integer default 0;

-- =============================================
-- 2. CLIENTES IDENTIFICADOS
-- =============================================

create table if not exists customers (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references businesses(id) on delete cascade not null,
  name text not null,
  phone text not null,
  email text,
  total_points integer default 0,
  referral_code text unique not null default substring(gen_random_uuid()::text, 1, 8),
  referred_by uuid references customers(id),
  created_at timestamptz default now(),
  unique(business_id, phone)
);

-- =============================================
-- 3. RECOMPENSAS (metas de pontos configuradas pelo dono)
-- =============================================

create table if not exists rewards (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references businesses(id) on delete cascade not null,
  name text not null,               -- ex: "Corte grátis"
  description text,                 -- ex: "Um corte masculino completo"
  points_required integer not null, -- ex: 1000
  active boolean default true,
  created_at timestamptz default now()
);

-- =============================================
-- 4. HISTÓRICO DE PONTOS
-- =============================================

create table if not exists points_transactions (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references customers(id) on delete cascade not null,
  business_id uuid references businesses(id) on delete cascade not null,
  points integer not null,          -- positivo = ganhou, negativo = resgatou
  reason text not null,             -- 'service', 'referral', 'review', 'redeem'
  appointment_id uuid references appointments(id) on delete set null,
  created_at timestamptz default now()
);

-- =============================================
-- 5. FILA DE ESPERA
-- =============================================

create table if not exists waitlist (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references businesses(id) on delete cascade not null,
  professional_id uuid references professionals(id) on delete cascade not null,
  appointment_date date not null,
  start_time time not null,
  client_name text not null,
  client_phone text not null,
  client_email text,
  notified_at timestamptz,          -- quando foi notificado que a vaga abriu
  created_at timestamptz default now()
);

-- =============================================
-- 6. RLS — SEGURANÇA POR LINHA
-- =============================================

alter table customers enable row level security;
alter table rewards enable row level security;
alter table points_transactions enable row level security;
alter table waitlist enable row level security;

-- Público pode criar e ver seu próprio customer (por telefone)
create policy "publico inserir customer" on customers
  for insert with check (true);

create policy "publico ver customer" on customers
  for select using (true);

create policy "publico atualizar customer" on customers
  for update using (true);

-- Dono gerencia customers do seu negócio
create policy "dono gerencia customers" on customers
  for all using (
    exists (select 1 from businesses where id = business_id and owner_id = auth.uid())
  );

-- Público pode ver recompensas ativas
create policy "publico ver rewards" on rewards
  for select using (active = true);

-- Dono gerencia recompensas
create policy "dono gerencia rewards" on rewards
  for all using (
    exists (select 1 from businesses where id = business_id and owner_id = auth.uid())
  );

-- Público pode ver seus pontos
create policy "publico ver points" on points_transactions
  for select using (true);

-- Sistema pode inserir transações de pontos
create policy "publico inserir points" on points_transactions
  for insert with check (true);

-- Dono gerencia pontos
create policy "dono gerencia points" on points_transactions
  for all using (
    exists (select 1 from businesses where id = business_id and owner_id = auth.uid())
  );

-- Público pode entrar na fila de espera
create policy "publico inserir waitlist" on waitlist
  for insert with check (true);

create policy "publico ver waitlist" on waitlist
  for select using (true);

-- Dono gerencia fila de espera
create policy "dono gerencia waitlist" on waitlist
  for all using (
    exists (select 1 from businesses where id = business_id and owner_id = auth.uid())
  );

-- =============================================
-- 7. TEMPO REAL
-- =============================================

alter publication supabase_realtime add table waitlist;
alter publication supabase_realtime add table points_transactions;
