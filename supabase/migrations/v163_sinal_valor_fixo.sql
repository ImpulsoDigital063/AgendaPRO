-- v163 — sinal em valor fixo, com faixa opcional por preço
--
-- POR QUE (Ivna Loyola Beauty Clinic, 16/10/2026)
-- "Cobramos uma taxa de agendamento, fixa no valor de R$30, e para
-- procedimentos acima de R$500 uma taxa fixa de R$100." O sinal só sabia
-- porcentagem, e nenhuma porcentagem única chega nesses dois números.
-- Perguntada se a porcentagem servia: "Precisa realmente ser valor fixo,
-- pois como já fazemos assim há anos eu prefiro permanecer dessa forma".
--
-- Colunas:
--   sinal_modo         'percentual' (o de sempre) ou 'fixo'
--   sinal_valor_fixo   valor do sinal no modo fixo
--   sinal_faixa_acima  opcional: total do horário a partir do qual muda o valor
--   sinal_faixa_valor  opcional: valor do sinal quando o total passa da faixa
--
-- Todo negócio que já existe fica em 'percentual' — nada muda pra eles.
-- A conta está em src/lib/pix-brcode.ts → valorDoSinal().

alter table businesses
  add column if not exists sinal_modo text not null default 'percentual'
    check (sinal_modo in ('percentual', 'fixo')),
  add column if not exists sinal_valor_fixo numeric(10,2)
    check (sinal_valor_fixo is null or sinal_valor_fixo > 0),
  add column if not exists sinal_faixa_acima numeric(10,2)
    check (sinal_faixa_acima is null or sinal_faixa_acima > 0),
  add column if not exists sinal_faixa_valor numeric(10,2)
    check (sinal_faixa_valor is null or sinal_faixa_valor > 0);
