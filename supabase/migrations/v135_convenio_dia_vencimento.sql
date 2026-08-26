-- v135 · Dia de vencimento da empresa conveniada (25/08/2026)
--
-- Por que existe: os avisos de cobrança do convênio usavam um limiar de 20
-- dias que EU inventei — não vinha de acordo nenhum com a empresa. Aviso
-- baseado em número inventado é aviso que erra nos dois sentidos: grita
-- quando está no prazo e cala quando está atrasado.
--
-- O Gustavo (CAF) descreveu o acordo real no áudio de 25/08: "eu vou supor
-- que a prefeitura vai me pagar, por exemplo, todo dia 10". Com o dia
-- guardado, a fatura da competência YYYY-MM vence no dia N do mês SEGUINTE,
-- e "atrasada" passa a ser um fato, não um palpite.
--
-- Nulo = empresa sem prazo combinado. Nesse caso o sistema não afirma atraso,
-- só mostra há quanto tempo o atendimento mais antigo está em aberto.

alter table companies
  add column if not exists dia_vencimento smallint;

alter table companies
  drop constraint if exists companies_dia_vencimento_check;

alter table companies
  add constraint companies_dia_vencimento_check
  check (dia_vencimento is null or (dia_vencimento between 1 and 31));

comment on column companies.dia_vencimento is
  'Dia do mês em que a empresa paga a fatura da competência anterior (ex: 10 = fatura de julho vence 10/08). Nulo = sem prazo combinado; o sistema não afirma atraso.';
