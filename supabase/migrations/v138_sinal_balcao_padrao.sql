-- v138 · Sinal no balcão: quem decide é a dona, agendamento por agendamento.
--
-- Até aqui, negócio com sinal ligado grudava sinal em TODO agendamento feito
-- no painel. A pergunta existia (v131/v134) mas ficava trancada atrás de
-- `sinal_por_agendamento`, ligada em 1 das 4 contas — e essa era a de teste.
--
-- O estrago, medido em 26/08/2026: a Wanessa e a Lettícia perderam
-- agendamentos que ELAS MESMAS marcaram no balcão. O sinal entrou sozinho,
-- venceu no prazo e o horário voltou pra agenda sem aviso nenhum. Nenhuma das
-- duas tinha pedido sinal daquelas clientes.
--
-- Não dá pra simplesmente tirar o sinal do balcão: a Gessica marca tudo no
-- painel e já recebeu 8 sinais, cobrando na hora e marcando como recebido.
-- Pra ela o sinal no agendamento próprio é ferramenta de trabalho.
--
-- Então a pergunta passa a aparecer SEMPRE que o sinal se aplica, e esta
-- coluna guarda apenas qual lado já vem marcado.
--
-- Padrão FALSE de propósito: errar pro lado de "não cobrar" custa um clique;
-- errar pro lado de "cobrar" apaga agendamento da agenda. Quem cobra sinal no
-- balcão liga a preferência uma vez, na aba Sinal.

alter table public.businesses
  add column if not exists sinal_balcao_padrao boolean not null default false;

comment on column public.businesses.sinal_balcao_padrao is
  'Agendamento feito no painel/recepção: a pergunta "cobrar sinal?" já vem marcada como SIM. Padrão false — v138.';
