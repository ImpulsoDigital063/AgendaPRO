-- v116 · O crédito do sinal nunca chegou a existir
--
-- Achado no teste do Eduardo em 06/08: ele pagou o sinal, cancelou pelo
-- painel, e nenhum crédito apareceu na ficha da cliente.
--
-- A causa não era falta de código — a rota chama aplicarRegraDoSinal certinho.
-- É que customer_credits.origin tem um CHECK que só aceita 'advance' e
-- 'other', e a v113 passou a gravar 'sinal_cancelado' e 'sinal' sem mexer
-- nele. Todo insert de crédito era recusado pelo banco. E como o código fazia
-- `await db.insert(...)` sem olhar o erro, falhava calado: a tela dizia
-- cancelado, o banco dizia cancelado, e o dinheiro da cliente sumia no meio.
--
-- Isso ia além do crédito não aparecer. No link público, quando o crédito da
-- cliente é MAIOR que o sinal, a sobra volta como crédito novo — e esse
-- insert também morria aqui. Crédito de R$ 20 num sinal de R$ 9 viraria R$ 20
-- consumidos e R$ 11 perdidos. Ninguém tinha caído nisso ainda porque só o
-- demo estava com sinal ligado.
--
-- Origens novas:
--   sinal_cancelado · sinal que virou crédito ao cancelar
--   sinal           · sobra de um crédito usado pra pagar sinal
-- Devolução em dinheiro NÃO entra aqui: o valor já saiu do caixa e voltou pra
-- cliente, então não é saldo. Fica registrado nas observações do atendimento.

ALTER TABLE customer_credits
  DROP CONSTRAINT IF EXISTS customer_credits_origin_check;

ALTER TABLE customer_credits
  ADD CONSTRAINT customer_credits_origin_check
  CHECK (origin IN ('advance', 'other', 'sinal', 'sinal_cancelado'));

COMMENT ON COLUMN customer_credits.origin IS
  'De onde veio o crédito: advance (adiantamento), other, sinal (sobra de crédito usado no sinal), sinal_cancelado (sinal virou crédito). v116.';
