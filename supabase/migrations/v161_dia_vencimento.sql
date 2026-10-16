-- v161 · Dia fixo de vencimento da mensalidade (15/10/2026)
-- Eduardo: "data fixa, mesmo que seja paga em outra · no banco tem que sempre
-- estar registrada a original". O webhook renovava a partir do dia do
-- pagamento e a data andava (Studio MOOD: 08 → 13 → 20 → 29).
-- NULL = ainda não definido: o código usa o dia do pago_ate atual e grava
-- aqui no próximo pagamento confirmado.
alter table public.subscriptions
  add column if not exists dia_vencimento smallint
  check (dia_vencimento between 1 and 31);

comment on column public.subscriptions.dia_vencimento is
  'Dia fixo (1-31) do vencimento da mensalidade. Original do cliente; não muda quando ele paga atrasado. Mês sem o dia → último dia do mês.';
