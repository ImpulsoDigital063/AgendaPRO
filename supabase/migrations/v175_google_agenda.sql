-- v175 — GOOGLE AGENDA (Ivna, 24/10/2026): todo agendamento vai pro Google
-- Agenda da dona, na hora. Um sentido só (AgendaPRO → Google), opção B do
-- Eduardo. Mexer no Google NÃO volta pro sistema.
--
-- Por que gatilho no banco e não chamada nas telas: o agendamento é gravado
-- em ~13 lugares (link público, painel, recepção, cartão, fechar dia...),
-- vários direto do navegador. Ligar o Google tela por tela = a primeira que
-- ficar de fora quebra a sincronia. Aqui qualquer insert/update/delete em
-- appointments avisa a rota /api/google-agenda/sync, venha de onde vier.
--
-- Custo zero pros outros negócios: o gatilho sai na primeira linha se o
-- negócio não tem conexão com o Google.
--
-- O id do evento no Google é o próprio id do agendamento (sem hífens), então
-- aviso em dobro nunca cria evento duplicado.

create extension if not exists pg_net with schema extensions;

-- Conexão do negócio com o Google (uma por negócio: a agenda da dona).
-- refresh_token_cifrado = AES-256-GCM com GOOGLE_AGENDA_CHAVE (só o servidor abre).
-- professional_id null = todos os atendimentos da clínica; preenchido = só os dela.
create table if not exists google_agenda_conexoes (
  business_id            uuid primary key references businesses(id) on delete cascade,
  google_email           text,
  refresh_token_cifrado  text not null,
  calendar_id            text not null default 'primary',
  professional_id        uuid references professionals(id) on delete set null,
  conectado_por          uuid references auth.users(id) on delete set null,
  conectado_em           timestamptz not null default now(),
  erro                   text,
  erro_em                timestamptz
);

-- Estado de cada agendamento no Google. Sem FK em appointment_id de propósito:
-- quando o agendamento é apagado, a rota ainda precisa achar o evento pra apagar.
create table if not exists google_agenda_eventos (
  appointment_id   uuid primary key,
  business_id      uuid not null references businesses(id) on delete cascade,
  sincronizado_em  timestamptz,
  erro             text,
  erro_em          timestamptz
);
create index if not exists google_agenda_eventos_erro_idx
  on google_agenda_eventos (business_id) where erro is not null;

-- Endereço da rota e segredo que o gatilho manda no cabeçalho. Uma linha só.
-- Prévia do branch e produção usam o MESMO banco: sync_url aponta pra onde o
-- código está no ar (prévia enquanto testa, domínio de produção depois do merge).
create table if not exists google_agenda_config (
  id           int primary key default 1 check (id = 1),
  sync_url     text,
  sync_secret  text
);

-- Só o service_role lê/escreve (RLS ligada e nenhuma policy).
alter table google_agenda_conexoes enable row level security;
alter table google_agenda_eventos  enable row level security;
alter table google_agenda_config   enable row level security;

create or replace function google_agenda_avisar() returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_business uuid;
  v_appt     uuid;
  v_url      text;
  v_secret   text;
begin
  if tg_op = 'DELETE' then
    v_business := old.business_id;
    v_appt := old.id;
  else
    v_business := new.business_id;
    v_appt := new.id;
  end if;

  if not exists (select 1 from google_agenda_conexoes where business_id = v_business) then
    return null;
  end if;

  select sync_url, sync_secret into v_url, v_secret from google_agenda_config where id = 1;
  if v_url is null or v_secret is null then
    return null;
  end if;

  -- pg_net só manda depois do commit; se o agendamento for desfeito, o aviso some junto
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('appointment_id', v_appt, 'business_id', v_business),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-sync-secret', v_secret),
    timeout_milliseconds := 15000
  );
  return null;
exception when others then
  -- o Google nunca derruba um agendamento: no pior caso a faxina diária reenvia
  return null;
end;
$$;

drop trigger if exists google_agenda_avisar on appointments;
create trigger google_agenda_avisar
  after insert or delete or update of
    professional_id, client_name, client_phone, service_name,
    appointment_date, start_time, end_time, status, notes
  on appointments
  for each row execute function google_agenda_avisar();
