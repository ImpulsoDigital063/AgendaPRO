-- v180 · ASAAS: um pagamento renova uma vez só (03/11/2026)
--
-- O webhook recebe CONFIRMED e RECEIVED (e retentativas) para o MESMO
-- pagamento e renovava pago_ate em cada um. O código grava aqui o id do
-- pagamento antes de processar; o UNIQUE barra o segundo.
-- Só acrescenta tabela. Sem ela o código processa como antes (falha aberta).
create table if not exists public.asaas_pagamentos_processados (
  payment_id text primary key,
  evento     text not null,
  created_at timestamptz not null default now()
);
alter table public.asaas_pagamentos_processados enable row level security;
-- sem policy: só o service role (webhook) lê e grava
revoke all on public.asaas_pagamentos_processados from anon, authenticated;
