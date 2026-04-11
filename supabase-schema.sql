-- AgendaPRO — Schema V1
-- Rodar no SQL Editor do Supabase

-- 1. NEGÓCIOS (barbearias, salões, etc.)
create table businesses (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  phone text,
  address text,
  logo_url text,
  slug text unique not null,
  owner_id uuid references auth.users(id),
  created_at timestamptz default now()
);

-- 2. PROFISSIONAIS (barbeiros, cabeleireiros, etc.)
create table professionals (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references businesses(id) on delete cascade,
  name text not null,
  photo_url text,
  active boolean default true,
  created_at timestamptz default now()
);

-- 3. SERVIÇOS (corte, barba, progressiva, etc.)
create table services (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references businesses(id) on delete cascade,
  name text not null,
  price decimal(10,2),
  duration_minutes integer default 30,
  active boolean default true
);

-- 4. HORÁRIOS DE TRABALHO (por profissional, por dia da semana)
create table working_hours (
  id uuid default gen_random_uuid() primary key,
  professional_id uuid references professionals(id) on delete cascade,
  day_of_week integer not null, -- 0=Dom 1=Seg 2=Ter 3=Qua 4=Qui 5=Sex 6=Sab
  start_time time not null,
  end_time time not null,
  slot_duration integer default 40 -- minutos por atendimento
);

-- 5. AGENDAMENTOS
create table appointments (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references businesses(id) on delete cascade,
  professional_id uuid references professionals(id) on delete cascade,
  client_name text not null,
  client_phone text not null,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  status text default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  notes text,
  created_at timestamptz default now()
);

-- 6. ATIVAR SEGURANÇA POR LINHA (RLS)
alter table businesses enable row level security;
alter table professionals enable row level security;
alter table services enable row level security;
alter table working_hours enable row level security;
alter table appointments enable row level security;

-- 7. POLÍTICAS DE ACESSO

-- Público pode ver dados do negócio
create policy "publico ver negocio" on businesses for select using (true);
create policy "publico ver profissionais" on professionals for select using (active = true);
create policy "publico ver servicos" on services for select using (active = true);
create policy "publico ver horarios" on working_hours for select using (true);
create policy "publico ver agendamentos" on appointments for select using (true);

-- Público pode criar agendamento
create policy "publico criar agendamento" on appointments
  for insert with check (true);

-- Dono gerencia tudo
create policy "dono gerencia negocio" on businesses
  for all using (auth.uid() = owner_id);

create policy "dono gerencia profissionais" on professionals
  for all using (
    exists (select 1 from businesses where id = business_id and owner_id = auth.uid())
  );

create policy "dono gerencia servicos" on services
  for all using (
    exists (select 1 from businesses where id = business_id and owner_id = auth.uid())
  );

create policy "dono gerencia horarios" on working_hours
  for all using (
    exists (
      select 1 from professionals p
      join businesses b on b.id = p.business_id
      where p.id = professional_id and b.owner_id = auth.uid()
    )
  );

create policy "dono gerencia agendamentos" on appointments
  for all using (
    exists (select 1 from businesses where id = business_id and owner_id = auth.uid())
  );

-- 8. TEMPO REAL — habilitar para agendamentos
alter publication supabase_realtime add table appointments;
