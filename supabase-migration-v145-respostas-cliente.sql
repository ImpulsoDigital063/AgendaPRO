-- v145 · a resposta da cliente precisa chegar em alguém
--
-- Buraco criado pela própria migração: na W-API a mensagem da cliente
-- chegava no aparelho de alguém. Na Cloud API ela chega no webhook e, sem
-- esta tabela, morre no log — a dona nunca fica sabendo.
--
-- E vai acontecer na primeira semana: a cliente recebe "seu horário é
-- amanhã às 14h" e responde "não vou poder ir". Do jeito que estava, esse
-- horário ficaria bloqueado na agenda e ninguém saberia por quê.
--
-- `business_id` pode ser null: quando não dá pra ligar o telefone a nenhum
-- agendamento, não dá pra dizer de quem é a cliente. Essas ficam sem dono
-- em vez de sumirem.

create table if not exists public.message_inbox (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid references public.businesses(id) on delete cascade,
  telefone       text not null,
  -- Nome de quem respondeu, quando dá pra saber pelo agendamento.
  cliente_nome   text,
  texto          text not null,
  appointment_id uuid references public.appointments(id) on delete set null,
  -- Marcada quando a dona abre a lista. Enquanto null, conta no badge.
  lida_em        timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists inbox_business_lida_idx
  on public.message_inbox (business_id, lida_em, created_at desc);

-- Sem policy: só o service role entra, pelas rotas que conferem o negócio.
-- Mensagem de cliente de um salão não pode ser lida por outro.
alter table public.message_inbox enable row level security;

comment on table public.message_inbox is
  'O que a cliente escreveu de volta. Sem isso a resposta morre no webhook e a dona nunca vê.';
