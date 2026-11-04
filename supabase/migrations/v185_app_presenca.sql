-- v185 · PRESENÇA DO APP: QUEM ESTÁ EM QUAL VERSÃO — 04/11/2026
--
-- Eduardo, 04/11: o app instalado no iPhone (Studio Marcela) ficou na versão
-- antiga depois do deploy da Tela cheia, e a gente não tinha como saber quem
-- mais estava assim. "Ligar pra cliente pedindo reinstalar está fora de questão."
--
-- Cada aparelho que abre o painel (/admin, /profissional, /recepcao) conta,
-- no máximo 1x a cada 30 min (ou na hora, se a versão mudou):
--   versão do build · commit · versão do service worker · endereço (origin) ·
--   se está instalado na tela de início · user agent · negócio · usuário ·
--   de qual endereço foi trazido (veio_de) · primeira e última vez.
-- Cliente: src/lib/app-versao.ts (registrarPresenca) via AtualizadorPWA.
--
-- Escrita SÓ pela RPC (security definer): o usuário vem de auth.uid() e o
-- negócio é resolvido aqui dentro (dono → businesses.owner_id; profissional,
-- recepção e gerente → professionals.auth_user_id). O aparelho não escolhe
-- de quem é a linha. Leitura: cada um vê só as próprias linhas; o painel da
-- Impulso lê com service_role / SQL editor.
--
-- NÃO APLICADA. Aplicar só depois do ok do Eduardo, no projeto
-- aazvqjhebfcoruyipoaw (AgendaPRO). Sem ela o app funciona igual: a RPC
-- falha calada e o cliente tenta de novo em 30 min.

create table if not exists public.app_presenca (
  aparelho      text        not null check (char_length(aparelho) between 1 and 64),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  business_id   uuid        references public.businesses(id) on delete cascade,
  area          text        not null check (area in ('admin', 'profissional', 'recepcao')),
  versao        text        not null,
  commit_sha    text,
  sw_versao     text,
  origem        text        not null,
  instalado     boolean     not null default false,
  user_agent    text,
  veio_de       text,
  aberturas     integer     not null default 1,
  primeira_vez  timestamptz not null default now(),
  ultima_vez    timestamptz not null default now(),
  primary key (aparelho, user_id)
);

create index if not exists app_presenca_business_ix on public.app_presenca (business_id, ultima_vez desc);
create index if not exists app_presenca_ultima_ix   on public.app_presenca (ultima_vez desc);

alter table public.app_presenca enable row level security;

drop policy if exists app_presenca_le_propria on public.app_presenca;
create policy app_presenca_le_propria on public.app_presenca
  for select to authenticated
  using (user_id = auth.uid());
-- Sem policy de insert/update/delete: só a RPC escreve.

revoke all on public.app_presenca from anon, authenticated;
grant select on public.app_presenca to authenticated;

create or replace function public.registrar_presenca_app(
  p_aparelho    text,
  p_area        text,
  p_versao      text,
  p_commit      text    default null,
  p_sw_versao   text    default null,
  p_origem      text    default null,
  p_instalado   boolean default false,
  p_user_agent  text    default null,
  p_veio_de     text    default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_business uuid;
begin
  if v_user is null then
    return;
  end if;
  if p_aparelho is null or char_length(p_aparelho) not between 1 and 64 then
    return;
  end if;
  if p_area not in ('admin', 'profissional', 'recepcao') then
    return;
  end if;

  select b.id into v_business
    from businesses b
   where b.owner_id = v_user
   limit 1;

  if v_business is null then
    select p.business_id into v_business
      from professionals p
     where p.auth_user_id = v_user
       and coalesce(p.active, true)
     order by p.created_at desc nulls last
     limit 1;
  end if;

  insert into app_presenca (
    aparelho, user_id, business_id, area, versao, commit_sha, sw_versao,
    origem, instalado, user_agent, veio_de
  ) values (
    p_aparelho, v_user, v_business, p_area,
    left(coalesce(p_versao, 'desconhecida'), 80),
    left(p_commit, 40),
    left(p_sw_versao, 20),
    left(coalesce(p_origem, '?'), 200),
    coalesce(p_instalado, false),
    left(p_user_agent, 300),
    left(p_veio_de, 200)
  )
  on conflict (aparelho, user_id) do update
    set business_id = excluded.business_id,
        area        = excluded.area,
        versao      = excluded.versao,
        commit_sha  = excluded.commit_sha,
        sw_versao   = excluded.sw_versao,
        origem      = excluded.origem,
        instalado   = excluded.instalado,
        user_agent  = excluded.user_agent,
        veio_de     = coalesce(excluded.veio_de, app_presenca.veio_de),
        aberturas   = app_presenca.aberturas + 1,
        ultima_vez  = now();
end;
$$;

revoke all on function public.registrar_presenca_app(text, text, text, text, text, text, boolean, text, text) from public, anon;
grant execute on function public.registrar_presenca_app(text, text, text, text, text, text, boolean, text, text) to authenticated;

-- ─── Conferência depois de aplicar (read-after-write) ───────────────────
-- select relrowsecurity from pg_class where relname = 'app_presenca';            -- true
-- select polname, polcmd from pg_policy where polrelid = 'public.app_presenca'::regclass;  -- só select
-- select has_function_privilege('anon', 'public.registrar_presenca_app(text,text,text,text,text,text,boolean,text,text)', 'execute');  -- false
--
-- Consulta "quem está desatualizado": supabase/consultas/app_desatualizados.sql
