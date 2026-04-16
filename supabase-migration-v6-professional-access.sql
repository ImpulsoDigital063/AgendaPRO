-- AgendaPRO — Migration V6
-- Feature: Acesso individual do profissional + Log de atividades
-- Rodar no SQL Editor do Supabase

-- =============================================
-- 1. NOVOS CAMPOS EM PROFESSIONALS
-- =============================================

-- Email do profissional (usado para login)
alter table professionals add column if not exists email text;

-- ID do user no Supabase Auth (linkado quando admin convida)
alter table professionals add column if not exists auth_user_id uuid references auth.users(id);

-- Role: 'owner' (dono do negócio, criado no cadastro) ou 'professional' (convidado)
alter table professionals add column if not exists role text default 'professional'
  check (role in ('owner', 'professional'));

-- Índice único para evitar email duplicado por negócio
create unique index if not exists professionals_email_business_idx
  on professionals(business_id, email) where email is not null;

-- Índice para lookup rápido por auth_user_id
create unique index if not exists professionals_auth_user_idx
  on professionals(auth_user_id) where auth_user_id is not null;

-- =============================================
-- 2. LOG DE ATIVIDADES
-- =============================================

create table if not exists activity_log (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references businesses(id) on delete cascade not null,
  professional_id uuid references professionals(id) on delete set null,
  action text not null,             -- 'confirm', 'cancel', 'reschedule', 'login'
  target_type text,                 -- 'appointment', 'service', etc.
  target_id uuid,                   -- ID do recurso afetado
  description text,                 -- "João confirmou agendamento de Maria às 14:00"
  created_at timestamptz default now()
);

-- =============================================
-- 3. RLS — SEGURANÇA
-- =============================================

alter table activity_log enable row level security;

-- Dono vê todo o log do negócio
create policy "dono ve log" on activity_log
  for select using (
    exists (select 1 from businesses where id = business_id and owner_id = auth.uid())
  );

-- Profissional vê só o próprio log
create policy "profissional ve proprio log" on activity_log
  for select using (
    exists (select 1 from professionals where id = professional_id and auth_user_id = auth.uid())
  );

-- Sistema pode inserir log (via service role ou RPC)
create policy "inserir log" on activity_log
  for insert with check (true);

-- =============================================
-- 4. PROFISSIONAL AUTENTICADO VÊ SEUS DADOS
-- =============================================

-- Profissional autenticado pode ver agendamentos dele
create policy "profissional ve seus agendamentos" on appointments
  for select using (
    exists (
      select 1 from professionals
      where id = professional_id and auth_user_id = auth.uid()
    )
  );

-- Profissional pode atualizar status dos seus agendamentos
create policy "profissional atualiza seus agendamentos" on appointments
  for update using (
    exists (
      select 1 from professionals
      where id = professional_id and auth_user_id = auth.uid()
    )
  );

-- Profissional pode ver seus próprios dados
create policy "profissional ve a si mesmo" on professionals
  for select using (auth_user_id = auth.uid());

-- Profissional pode ver horários dele
create policy "profissional ve seus horarios" on working_hours
  for select using (
    exists (
      select 1 from professionals
      where id = professional_id and auth_user_id = auth.uid()
    )
  );

-- Profissional pode ver serviços do negócio dele
create policy "profissional ve servicos do negocio" on services
  for select using (
    exists (
      select 1 from professionals p
      where p.business_id = business_id and p.auth_user_id = auth.uid()
    )
  );

-- Profissional pode ver dados básicos do negócio dele
-- (já existe policy "publico ver negocio" que permite select pra todos)

-- =============================================
-- 5. ÍNDICES DE PERFORMANCE
-- =============================================

create index if not exists activity_log_business_idx on activity_log(business_id, created_at desc);
create index if not exists activity_log_professional_idx on activity_log(professional_id, created_at desc);
