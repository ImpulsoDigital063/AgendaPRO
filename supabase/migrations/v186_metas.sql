-- v186 · ABA METAS: META DE FATURAMENTO DO MÊS + SONHO (opcional) — 04/11/2026
--
-- Letícia (Viva Cacheada) pediu meta de venda; Eduardo desenhou a aba Metas
-- (04/11): "dar clareza e não trazer mais uma tela que tem que dominar".
--   · meta = SÓ faturamento do mês, régua = competência (a mesma do Hub
--     Financeiro, src/lib/financeiro/resumo-do-periodo.ts · receitaDoPeriodo);
--   · sonho = opcional, 1 por negócio (nome, custo, até quando).
--
--   · cofrinho do sonho = MANUAL (guardei/retirei), só anotação; saldo no banco.
--
-- Quem lê e escreve: a dona (businesses.owner_id) e a gerente ativa que NÃO
-- teve a área "financeiro" bloqueada (v156 · gerente_areas_bloqueadas).
-- O app confere a mesma regra antes (lib/permissoes-gerente: /admin/metas e
-- /api/admin/metas são da área financeiro).
--
-- Avisos (push): 2 jobs no pg_cron (mesmo esquema da v183, segredo no Vault
-- 'agendapro_cron_secret'):
--   · segunda 08:00 BRT  → /api/cron/metas?tipo=semana ("Semana passada: R$ X · faltam R$ Z")
--   · todo dia 21:00 BRT → /api/cron/metas?tipo=bateu  ("Bateu a meta!", 1x por mês)
-- Só percorre negócios COM meta no mês (custo de CPU proporcional a quem usa).
--
-- NÃO APLICADA. Projeto aazvqjhebfcoruyipoaw (AgendaPRO). Ordem: aplicar →
-- conferir → push do código.

-- ─── 1. Quem pode mexer nas metas de um negócio ─────────────────────────
-- SECURITY DEFINER para ler professionals sem cair na RLS dela (v48).
create or replace function public.pode_ver_metas(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from businesses b
     where b.id = p_business_id and b.owner_id = auth.uid()
  ) or exists (
    select 1 from professionals p
     where p.business_id = p_business_id
       and p.auth_user_id = auth.uid()
       and p.active = true
       and p.is_manager = true
       and not ('financeiro' = any(coalesce(p.gerente_areas_bloqueadas, '{}'::text[])))
  )
$$;

revoke all on function public.pode_ver_metas(uuid) from public, anon;
grant execute on function public.pode_ver_metas(uuid) to authenticated;

comment on function public.pode_ver_metas(uuid) is
  'v186 · true se quem chama é a dona do negócio ou gerente ativa com a área financeiro liberada.';

-- ─── 2. Meta do mês ────────────────────────────────────────────────────
create table if not exists public.metas_mes (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses(id) on delete cascade,
  -- primeiro dia do mês (AAAA-MM-01)
  mes               date not null check (extract(day from mes) = 1),
  valor             numeric(12,2) not null check (valor > 0 and valor < 100000000),
  -- o valor que o sistema sugeriu quando ela definiu (pra saber se aceitou)
  sugerido          numeric(12,2),
  -- ticket médio calculado ao definir (traduz "faltam R$ Z" em atendimentos
  -- na aba sem refazer 6 meses de conta a cada abertura)
  ticket_medio      numeric(12,2) check (ticket_medio is null or ticket_medio > 0),
  -- push "Bateu a meta!" já foi (1x por mês)
  bateu_avisado_em  timestamptz,
  criado_por        uuid references auth.users(id) on delete set null,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now(),
  unique (business_id, mes)
);

create index if not exists metas_mes_mes_ix on public.metas_mes (mes);

alter table public.metas_mes enable row level security;

drop policy if exists metas_mes_select on public.metas_mes;
create policy metas_mes_select on public.metas_mes
  for select to authenticated using (public.pode_ver_metas(business_id));

drop policy if exists metas_mes_insert on public.metas_mes;
create policy metas_mes_insert on public.metas_mes
  for insert to authenticated with check (public.pode_ver_metas(business_id));

drop policy if exists metas_mes_update on public.metas_mes;
create policy metas_mes_update on public.metas_mes
  for update to authenticated
  using (public.pode_ver_metas(business_id))
  with check (public.pode_ver_metas(business_id));

drop policy if exists metas_mes_delete on public.metas_mes;
create policy metas_mes_delete on public.metas_mes
  for delete to authenticated using (public.pode_ver_metas(business_id));

revoke all on public.metas_mes from anon;
grant select, insert, update, delete on public.metas_mes to authenticated;

-- ─── 3. Sonho (opcional, 1 por negócio) ────────────────────────────────
create table if not exists public.metas_sonho (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null unique references public.businesses(id) on delete cascade,
  titulo         text not null check (char_length(btrim(titulo)) between 1 and 80),
  custo          numeric(12,2) check (custo is null or (custo > 0 and custo < 100000000)),
  -- mês-alvo (AAAA-MM-01); null = sem prazo
  ate_mes        date check (ate_mes is null or extract(day from ate_mes) = 1),
  -- mês em que ela criou (início da trilha "você está aqui")
  desde_mes      date not null default date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date,
  -- ela marcou como conquistado (guardado >= custo)
  conquistado_em timestamptz,
  criado_por     uuid references auth.users(id) on delete set null,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

alter table public.metas_sonho enable row level security;

drop policy if exists metas_sonho_select on public.metas_sonho;
create policy metas_sonho_select on public.metas_sonho
  for select to authenticated using (public.pode_ver_metas(business_id));

drop policy if exists metas_sonho_insert on public.metas_sonho;
create policy metas_sonho_insert on public.metas_sonho
  for insert to authenticated with check (public.pode_ver_metas(business_id));

drop policy if exists metas_sonho_update on public.metas_sonho;
create policy metas_sonho_update on public.metas_sonho
  for update to authenticated
  using (public.pode_ver_metas(business_id))
  with check (public.pode_ver_metas(business_id));

drop policy if exists metas_sonho_delete on public.metas_sonho;
create policy metas_sonho_delete on public.metas_sonho
  for delete to authenticated using (public.pode_ver_metas(business_id));

revoke all on public.metas_sonho from anon;
grant select, insert, update, delete on public.metas_sonho to authenticated;

-- ─── 4. Cofrinho do sonho (manual) ─────────────────────────────────────
-- Eduardo 04/11: o sistema NUNCA mexe em dinheiro, só anota o que ela informa.
-- Saldo = soma dos movimentos (guardei +, retirei −), calculado NO BANCO
-- (função cofrinho_saldo). Travas, também no banco:
--   · retirada maior que o saldo → erro (saldo nunca negativo);
--   · só o ÚLTIMO lançamento pode ser apagado ("desfazer o último por engano").
-- O sonho trava a linha (FOR UPDATE) pra dois lançamentos ao mesmo tempo não
-- passarem juntos pela conta do saldo.
create table if not exists public.metas_cofrinho (
  id          uuid primary key default gen_random_uuid(),
  sonho_id    uuid not null references public.metas_sonho(id) on delete cascade,
  -- preenchido pelo trigger a partir do sonho (a RLS confere este)
  business_id uuid not null references public.businesses(id) on delete cascade,
  tipo        text not null check (tipo in ('guardei', 'retirei')),
  valor       numeric(12,2) not null check (valor > 0 and valor < 100000000),
  motivo      text check (motivo is null or char_length(motivo) <= 60),
  criado_por  uuid references auth.users(id) on delete set null,
  criado_em   timestamptz not null default now()
);

create index if not exists metas_cofrinho_sonho_ix on public.metas_cofrinho (sonho_id, criado_em desc);

create or replace function public.cofrinho_saldo(p_sonho_id uuid)
returns numeric
language sql
stable
set search_path = public
as $$
  select coalesce(sum(case when tipo = 'guardei' then valor else -valor end), 0)
    from metas_cofrinho
   where sonho_id = p_sonho_id
$$;

revoke all on function public.cofrinho_saldo(uuid) from public, anon;
grant execute on function public.cofrinho_saldo(uuid) to authenticated, service_role;

create or replace function public.cofrinho_antes_de_inserir()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_business uuid;
  v_saldo    numeric;
begin
  select business_id into v_business from metas_sonho where id = new.sonho_id for update;
  if v_business is null then
    raise exception 'sonho não encontrado';
  end if;
  new.business_id := v_business;
  new.criado_em := clock_timestamp();
  if new.tipo = 'retirei' then
    v_saldo := cofrinho_saldo(new.sonho_id);
    if new.valor > v_saldo then
      raise exception 'retirada maior que o guardado (saldo %)', v_saldo using errcode = 'check_violation';
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists cofrinho_antes_de_inserir on public.metas_cofrinho;
create trigger cofrinho_antes_de_inserir
  before insert on public.metas_cofrinho
  for each row execute function public.cofrinho_antes_de_inserir();

create or replace function public.cofrinho_antes_de_apagar()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- apagar o sonho leva os movimentos junto (cascade): aí não confere
  if not exists (select 1 from metas_sonho where id = old.sonho_id) then
    return old;
  end if;
  perform 1 from metas_sonho where id = old.sonho_id for update;
  if exists (
    select 1 from metas_cofrinho
     where sonho_id = old.sonho_id
       and (criado_em, id) > (old.criado_em, old.id)
  ) then
    raise exception 'só o último lançamento pode ser desfeito' using errcode = 'check_violation';
  end if;
  return old;
end
$$;

drop trigger if exists cofrinho_antes_de_apagar on public.metas_cofrinho;
create trigger cofrinho_antes_de_apagar
  before delete on public.metas_cofrinho
  for each row execute function public.cofrinho_antes_de_apagar();

alter table public.metas_cofrinho enable row level security;

drop policy if exists metas_cofrinho_select on public.metas_cofrinho;
create policy metas_cofrinho_select on public.metas_cofrinho
  for select to authenticated using (public.pode_ver_metas(business_id));

drop policy if exists metas_cofrinho_insert on public.metas_cofrinho;
create policy metas_cofrinho_insert on public.metas_cofrinho
  for insert to authenticated with check (public.pode_ver_metas(business_id));

drop policy if exists metas_cofrinho_delete on public.metas_cofrinho;
create policy metas_cofrinho_delete on public.metas_cofrinho
  for delete to authenticated using (public.pode_ver_metas(business_id));
-- sem UPDATE: lançamento errado se desfaz (apaga o último) e lança de novo

revoke all on public.metas_cofrinho from anon;
grant select, insert, delete on public.metas_cofrinho to authenticated;

-- ─── 5. Avisos por push (pg_cron, igual v183) ──────────────────────────
-- Horários em UTC (Brasília = UTC-3).
select cron.unschedule(jobid)
  from cron.job
 where jobname in ('agendapro-metas-semana', 'agendapro-metas-bateu');

select cron.schedule(
  'agendapro-metas-semana',
  '0 11 * * 1',
  $job$
  select net.http_get(
    url := 'https://www.agendapro.net.br/api/cron/metas?tipo=semana',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'agendapro_cron_secret')
    ),
    timeout_milliseconds := 60000
  );
  $job$
);

select cron.schedule(
  'agendapro-metas-bateu',
  '0 0 * * *',
  $job$
  select net.http_get(
    url := 'https://www.agendapro.net.br/api/cron/metas?tipo=bateu',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'agendapro_cron_secret')
    ),
    timeout_milliseconds := 60000
  );
  $job$
);

-- ─── Conferência (rodar depois) ────────────────────────────────────────
-- select tablename, policyname, cmd from pg_policies where tablename in ('metas_mes','metas_sonho','metas_cofrinho') order by 1,2;
-- select jobname, schedule from cron.job where jobname like 'agendapro-metas-%';
