-- ============================================================
-- Migration V25: realinha pricing oficial (2026-04-27)
-- AgendaPRO — Política travada no /admin/bloqueado, LPs e SCRIPT-VENDA
-- ============================================================
-- Política nova:
--   Solo:   R$ 67/mês  (6700 centavos) — antes 4700
--   Equipe: R$ 97/mês  (9700 centavos) — antes 6700 (e antes disso 10700 na V11)
--   Setup:  R$197 (19700 centavos) — ISENTO pros 10 primeiros (Clube Fundador)
--
-- Esta migration:
--   1. Reescreve price_cents nas linhas existentes pra bater com o novo preço
--   2. Zera setup_cents pra quem entrou como founders_club=TRUE (isenção)
--   3. Atualiza COMMENTs pra refletir os valores corretos
--
-- Idempotente: pode rodar várias vezes sem corromper estado.
-- ============================================================


-- 1. SOLO — todo mundo que estava em 4700 (V12 antiga) ou 6700 com plan=solo
--    permanece em 6700 (preço NOVO). Aqui a gente só sobe os 4700 antigos.
UPDATE subscriptions
SET price_cents = 6700
WHERE plan = 'solo' AND price_cents IN (4700, 6700);


-- 2. EQUIPE — sobe 6700 (V12 antiga) e 10700 (V11 mais antiga ainda) pra 9700
UPDATE subscriptions
SET price_cents = 9700
WHERE plan = 'equipe' AND price_cents IN (6700, 10700, 9700);


-- 3. CLUBE FUNDADOR — quem entrou pelo cadastro em pending_payment
--    deve estar com setup_cents = 0 (isento). Migra registros antigos
--    que ficaram com 14700/19700 mas eram founders.
UPDATE subscriptions
SET setup_cents = 0
WHERE founders_club = TRUE
  AND status IN ('pending_payment', 'active')
  AND setup_cents > 0
  AND setup_paid_at IS NULL;


-- 4. ATUALIZAR COMMENTS pra refletir o novo pricing
COMMENT ON COLUMN subscriptions.price_cents IS
  'Mensalidade em centavos: 6700 (Solo R$67) ou 9700 (Equipe R$97) — política 2026-04-27';
COMMENT ON COLUMN subscriptions.setup_cents IS
  'Setup one-shot em centavos: 0 (isento Clube Fundador) ou 19700 (R$197 a partir do cliente 11+)';


-- ============================================================
-- FIM DA MIGRATION V25
-- ============================================================
-- Verificação pós-aplicação:
--   SELECT plan, price_cents, setup_cents, founders_club, COUNT(*)
--   FROM subscriptions
--   GROUP BY plan, price_cents, setup_cents, founders_club;
--
-- Esperado:
--   solo  | 6700 | 0 | true   (Clube Fundador entrando)
--   solo  | 6700 | 19700 | false  (a partir do cliente 11+)
--   equipe| 9700 | 0 | true
--   equipe| 9700 | 19700 | false
-- ============================================================
