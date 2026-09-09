-- v150 · segundo tour da aba Sumidos.
--
-- Eduardo, 08/09: o primeiro tour apresenta a lista e para. Quando a dona
-- rola até a parte de criar o cupom, aparece o convite pro segundo, que
-- explica desconto, mensagem editável e prévia.
--
-- Coluna própria porque são duas decisões diferentes: ela pode ter visto o
-- primeiro e ainda não ter descido até o segundo.

alter table public.businesses
  add column if not exists tour_sumidos_2_em timestamptz;

comment on column public.businesses.tour_sumidos_2_em is
  'Quando a dona viu (ou pulou) o SEGUNDO tour da aba Sumidos — o de criar cupom e editar a mensagem. NULL = ainda não viu.';
