-- v142 · Comissão paga conta como despesa no fluxo (pedido do Eduardo, 27/08)
--
-- Hoje `lucro liquido = recebido - despesas`, e despesas le SO a tabela
-- expenses. Comissao paga a profissional sai do caixa e nao aparece em lugar
-- nenhum do financeiro — o lucro que a dona ve esta inflado.
--
-- POR QUE ATRAS DE CHAVE, se e mais correto:
-- ligar isso pra base inteira derruba o lucro liquido de 28 negocios de um dia
-- pro outro, sem elas entenderem por que. Duas ja tem historico de pagamento
-- registrado (Viva Cacheada R$1.073 e Studio MOOD R$570, julho) e o lucro
-- daquele mes mudaria retroativamente. Entao nasce `false` e liga negocio a
-- negocio, com aviso.
--
-- NAO entra `professional_salaries` de proposito: a Viva Cacheada ja lanca o
-- salario da Andressa como despesa manual (categoria salary, 39 linhas). Somar
-- os dois duplicaria o mesmo dinheiro.
--
-- Idempotente.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS comissao_no_fluxo boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.businesses.comissao_no_fluxo IS
  'false (padrao) = comissao paga nao aparece no financeiro, como sempre foi. true = pagamentos de comissao (paid_amount + bonus_amount) entram como despesa na aba Despesas, no fluxo de caixa e no lucro liquido.';
