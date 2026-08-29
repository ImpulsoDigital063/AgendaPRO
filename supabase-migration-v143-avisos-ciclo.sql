-- v143 · o pacote de avisos tem CICLO PRÓPRIO, não mês do calendário
--
-- Decisão de 28/08: o pacote é PRÉ-PAGO e dura um mês. Isso quebra a conta
-- que a v141 assumia — contar consumo de 1º a 30 só vale se o ciclo for o
-- mês civil. Quem paga dia 12 tem ciclo de 12 a 12, e contar pelo calendário
-- daria a ela duas franquias no primeiro mês e nenhuma no seguinte.
--
-- `avisos_ate` é o que decide se o pacote está VALENDO. Sem ele, "contratou"
-- e "está pago" viram a mesma coisa — e no pré-pago não são: ela pode ter
-- escolhido o pacote e não ter pago o PIX ainda.

alter table public.businesses
  add column if not exists avisos_desde timestamptz,
  add column if not exists avisos_ate   timestamptz,
  -- Franquia DESTE ciclo. Fica na linha, e não no catálogo, porque a
  -- primeira compra é proporcional aos dias que faltam pro vencimento da
  -- mensalidade: quem contrata a 19 dias do fim paga menos e leva menos.
  -- Sem guardar aqui, o sistema leria 150 no catálogo e daria franquia
  -- cheia por um período que ela não pagou inteiro.
  add column if not exists avisos_unidades integer;

comment on column public.businesses.avisos_ate is
  'Fim do ciclo pago. null ou passado = pacote não vale, nada é enviado. Prova de pagamento, não de intenção.';
comment on column public.businesses.avisos_unidades is
  'Franquia deste ciclo. Proporcional na primeira compra; cheia nas renovações.';

create index if not exists businesses_avisos_ate_idx
  on public.businesses (avisos_ate)
  where avisos_pacote is not null;
