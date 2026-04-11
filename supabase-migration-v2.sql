-- AgendaPRO — Migration V2
-- Rodar no SQL Editor do Supabase após o schema V1

-- 1. CLIENTES (cadastro persistente)
create table if not exists clients (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text unique not null,
  email text,
  created_at timestamptz default now()
);

alter table clients enable row level security;

create policy "publico criar cliente" on clients for insert with check (true);
create policy "publico ver cliente" on clients for select using (true);
create policy "publico atualizar cliente" on clients for update using (true);

-- 2. NOVAS COLUNAS EM APPOINTMENTS
alter table appointments
  add column if not exists client_id uuid references clients(id),
  add column if not exists client_email text,
  add column if not exists service_id uuid references services(id),
  add column if not exists service_name text,
  add column if not exists total_price decimal(10,2);

-- 3. MÚLTIPLOS SERVIÇOS POR AGENDAMENTO
create table if not exists appointment_services (
  id uuid default gen_random_uuid() primary key,
  appointment_id uuid references appointments(id) on delete cascade,
  service_id uuid references services(id),
  service_name text not null,
  price decimal(10,2),
  duration_minutes integer not null
);

alter table appointment_services enable row level security;

create policy "publico criar appointment_services" on appointment_services for insert with check (true);
create policy "publico ver appointment_services" on appointment_services for select using (true);
create policy "dono gerencia appointment_services" on appointment_services
  for all using (
    exists (
      select 1 from appointments a
      join businesses b on b.id = a.business_id
      where a.id = appointment_id and b.owner_id = auth.uid()
    )
  );

-- 4. COMISSÃO EM PROFISSIONAIS
alter table professionals
  add column if not exists commission_percentage decimal(5,2) default 0;
