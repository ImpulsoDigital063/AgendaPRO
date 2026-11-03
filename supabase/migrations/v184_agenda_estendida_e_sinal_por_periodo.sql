-- v184 · AGENDA ESTENDIDA ATÉ UMA DATA + SINAL DIFERENTE POR PERÍODO — 03/11/2026
--
-- Pedido da Ivna Loyola (03/11):
--   · "a agenda de dezembro só mostra 30 dias; dá pra ir até o fim de dezembro?"
--   · "pra agenda de dezembro a taxa de agendamento será R$ 50; qualquer outra
--     data continua R$ 30"
--
-- booking_estende_ate: o link público mostra os dias pelo menos ATÉ esta data
--   (inclusive), além da janela normal (booking_days_with_service / 30 dias).
--   Depois que a data passa, não faz nada: volta sozinho à janela normal.
--   NULL = como sempre.
--
-- sinal_periodo_inicio / _fim / _valor: no modo de sinal FIXO, atendimento
--   COM DATA dentro do período (inclusive) paga sinal_periodo_valor no lugar
--   de sinal_valor_fixo. A faixa (sinal_faixa_acima/_valor) continua valendo
--   por cima. Conta em valorDoSinal() (src/lib/pix-brcode.ts). NULL = como sempre.
--
-- anon lê businesses POR COLUNA (v178): coluna nova sem grant some do link
-- público e o select inteiro falha. Por isso o grant abaixo.

alter table public.businesses
  add column if not exists booking_estende_ate date,
  add column if not exists sinal_periodo_inicio date,
  add column if not exists sinal_periodo_fim date,
  add column if not exists sinal_periodo_valor numeric(10,2);

alter table public.businesses
  drop constraint if exists businesses_sinal_periodo_ck;
alter table public.businesses
  add constraint businesses_sinal_periodo_ck check (
    (sinal_periodo_inicio is null and sinal_periodo_fim is null and sinal_periodo_valor is null)
    or (sinal_periodo_inicio is not null and sinal_periodo_fim is not null
        and sinal_periodo_fim >= sinal_periodo_inicio
        and sinal_periodo_valor is not null and sinal_periodo_valor > 0)
  );

grant select (booking_estende_ate, sinal_periodo_inicio, sinal_periodo_fim, sinal_periodo_valor)
  on public.businesses to anon;
