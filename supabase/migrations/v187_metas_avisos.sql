-- v187 · AVISOS DA ABA METAS (push) — 05/11/2026
--
-- Eduardo aprovou (05/11) 5 avisos novos além do "bateu" e do "semana" da v186:
--   fechamento (dia 1) · quase lá (≥90%) · reta final (≤3 dias de trabalho)
--   · abaixo do ritmo (dia 15) · sem meta (dia 3).
-- Regra: no máximo 1 aviso de Metas por negócio por dia, prioridade
--   bateu > fechamento > quase > reta > ritmo > sem_meta > semana
-- (decisão em src/lib/metas/avisos.ts; envio em /api/cron/metas).
--
--   1. businesses.metas_avisos (padrão ligado) — a dona desliga os avisos.
--   2. metas_avisos_log — o que foi mandado. unique (business_id, dia) = 1 por
--      dia NO BANCO (o cron grava a linha antes do push, como reserva).
--   3. metas_avisos_ligados / metas_avisos_definir — a tela lê e grava a
--      preferência por /api/admin/metas/avisos sem depender de grant de coluna.
--   4. pg_cron: o job "semana" (segunda 8h) vira "diario" (todo dia 8h), que
--      decide qual aviso cabe; o "bateu" das 21h continua (v186).
--
-- NÃO APLICADA. Projeto aazvqjhebfcoruyipoaw (AgendaPRO). Ordem: aplicar →
-- conferir → push do código. Entre aplicar e o deploy, o job diário chama
-- tipo=diario no código velho e recebe 400 (sem aviso naquela manhã, sem dano).

-- ─── 1. Preferência da dona ────────────────────────────────────────────
alter table public.businesses
  add column if not exists metas_avisos boolean not null default true;

comment on column public.businesses.metas_avisos is
  'v187 · false = a dona desligou os avisos (push) da aba Metas. Lida/gravada por metas_avisos_ligados / metas_avisos_definir.';

-- ─── 2. Log dos avisos ─────────────────────────────────────────────────
create table if not exists public.metas_avisos_log (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  -- dia em Brasília em que o aviso saiu
  dia         date not null,
  tipo        text not null check (tipo in ('bateu', 'fechamento', 'quase', 'reta', 'ritmo', 'sem_meta', 'semana')),
  titulo      text not null,
  corpo       text not null,
  url         text not null,
  -- aparelhos que aceitaram o push (0 = sem aparelho / todos falharam)
  aparelhos   integer not null default 0,
  criado_em   timestamptz not null default now(),
  unique (business_id, dia)
);

create index if not exists metas_avisos_log_dia_ix on public.metas_avisos_log (dia);

alter table public.metas_avisos_log enable row level security;

-- só leitura pra quem vê as metas; quem escreve é o cron (service role)
drop policy if exists metas_avisos_log_select on public.metas_avisos_log;
create policy metas_avisos_log_select on public.metas_avisos_log
  for select to authenticated using (public.pode_ver_metas(business_id));

revoke all on public.metas_avisos_log from anon, authenticated;
grant select on public.metas_avisos_log to authenticated;

-- ─── 3. Ler e gravar a preferência ─────────────────────────────────────
create or replace function public.metas_avisos_ligados(p_business_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v boolean;
begin
  if not public.pode_ver_metas(p_business_id) then
    raise exception 'sem acesso às metas deste negócio' using errcode = '42501';
  end if;
  select metas_avisos into v from businesses where id = p_business_id;
  return coalesce(v, true);
end
$$;

revoke all on function public.metas_avisos_ligados(uuid) from public, anon;
grant execute on function public.metas_avisos_ligados(uuid) to authenticated;

create or replace function public.metas_avisos_definir(p_business_id uuid, p_ligado boolean)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v boolean;
begin
  if p_ligado is null then
    raise exception 'p_ligado não pode ser nulo' using errcode = '22004';
  end if;
  -- só a dona: os avisos vão pro aparelho dela
  update businesses set metas_avisos = p_ligado
   where id = p_business_id and owner_id = auth.uid()
  returning metas_avisos into v;
  if not found then
    raise exception 'só a dona liga ou desliga os avisos de Metas' using errcode = '42501';
  end if;
  return v;
end
$$;

revoke all on function public.metas_avisos_definir(uuid, boolean) from public, anon;
grant execute on function public.metas_avisos_definir(uuid, boolean) to authenticated;

-- ─── 4. pg_cron (mesmo esquema da v186, segredo no Vault) ──────────────
-- Horários em UTC (Brasília = UTC-3): 11:00 UTC = 08:00 BRT.
select cron.unschedule(jobid)
  from cron.job
 where jobname in ('agendapro-metas-semana', 'agendapro-metas-diario');

select cron.schedule(
  'agendapro-metas-diario',
  '0 11 * * *',
  $job$
  select net.http_get(
    url := 'https://www.agendapro.net.br/api/cron/metas?tipo=diario',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'agendapro_cron_secret')
    ),
    timeout_milliseconds := 60000
  );
  $job$
);
-- 'agendapro-metas-bateu' (0 0 * * * = 21:00 BRT) segue como na v186.

-- ─── Conferência (rodar depois) ────────────────────────────────────────
-- select column_name, column_default from information_schema.columns where table_name = 'businesses' and column_name = 'metas_avisos';
-- select policyname, cmd from pg_policies where tablename = 'metas_avisos_log';
-- select jobname, schedule from cron.job where jobname like 'agendapro-metas-%' order by 1;
--   esperado: agendapro-metas-bateu 0 0 * * * · agendapro-metas-diario 0 11 * * *
