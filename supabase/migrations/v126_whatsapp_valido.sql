-- v126 — memória de "esse número tem WhatsApp?"
--
-- POR QUE EXISTE
-- Mandar pra número sem WhatsApp não dá erro: o provedor aceita, devolve
-- messageId e o message_log grava "enviado". A dona vê "avisada" e a cliente
-- nunca foi avisada. Medido em 21/08/2026: 21 dos 718 clientes com telefone
-- (2,9%) estão em formato que provavelmente não tem WhatsApp — 11 fixos e
-- 10 celulares com dígito faltando.
--
-- Não dá pra decidir isso por formato: WhatsApp Business aceita número fixo,
-- e fixo com WhatsApp é justamente o perfil de salão. Só perguntando.
--
-- POR QUE GUARDAR
-- A resposta não muda de um lembrete pro outro. Sem esta coluna seria uma
-- chamada HTTP por mensagem enviada; com ela, uma por cliente.

alter table customers
  add column if not exists whatsapp_valido boolean,
  add column if not exists whatsapp_checado_em timestamptz;

comment on column customers.whatsapp_valido is
  'null = nunca perguntado. true = tem WhatsApp. false = não tinha em whatsapp_checado_em.';

comment on column customers.whatsapp_checado_em is
  'Quando foi perguntado. O false REVALIDA depois de 30 dias: a cliente pode ter instalado o WhatsApp desde então, e marcar "não tem" pra sempre criaria um silêncio permanente que ninguém investiga. O true não revalida — quem tem não deixa de ter de um jeito que nos afete.';

-- Só quem tem resposta negativa velha precisa ser reperguntado; o índice
-- serve a essa varredura e fica pequeno.
create index if not exists idx_customers_whatsapp_recheck
  on customers (whatsapp_checado_em)
  where whatsapp_valido is false;
