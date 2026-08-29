-- v141 · message_log ganha ENTREGA, não só "mandei"
--
-- Até aqui `status = 'enviado'` significava "o provedor aceitou". Nunca
-- significou que chegou. Em 21/08 cinco mensagens foram aceitas com
-- messageId, gravadas como enviadas, e três nunca chegaram no aparelho de
-- ninguém — o painel dizia uma coisa e a realidade era outra.
--
-- A Cloud API resolve isso na fonte: ela manda webhook de status
-- (sent → delivered → read, e failed com código). Estas colunas são onde
-- esse fato mora. `status` segue sendo "o que tentamos"; as datas abaixo
-- são "o que aconteceu de verdade".

alter table public.message_log
  add column if not exists entregue_em    timestamptz,
  add column if not exists lido_em        timestamptz,
  add column if not exists falhou_em      timestamptz,
  add column if not exists falha_codigo   text,
  add column if not exists falha_motivo   text,
  -- Quanto essa mensagem consumiu da franquia do pacote. Utilidade = 1,
  -- marketing (aniversário, retorno) = 7, porque custa ~7x mais na Meta.
  -- Guardar aqui, no momento do envio, evita recalcular categoria depois —
  -- e a Meta pode RECLASSIFICAR um template já aprovado, o que mudaria o
  -- passado se a conta fosse feita na hora de faturar.
  add column if not exists unidades       smallint not null default 1;

-- O webhook de status chega identificado pelo id da Meta, não pela nossa
-- chave. Sem este índice, cada callback vira varredura da tabela inteira —
-- e são até 3 callbacks por mensagem enviada.
create index if not exists message_log_provider_id_idx
  on public.message_log (provider_id)
  where provider_id is not null;

-- Contagem da franquia do mês por negócio: soma de `unidades` no período.
create index if not exists message_log_business_created_idx
  on public.message_log (business_id, created_at desc);

comment on column public.message_log.entregue_em is
  'Quando a Meta confirmou ENTREGA no aparelho. null = ainda não confirmada. Isto, e não status, é a prova.';
comment on column public.message_log.unidades is
  'Unidades consumidas da franquia. 1 = utilidade, 7 = marketing.';
