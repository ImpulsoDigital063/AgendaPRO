-- ============================================================
-- Migration V27: Modalidades de pagamento (cartão recorrente + PIX único)
-- AgendaPRO — atende cliente brasileiro com fluxo PIX (mensal/semestral/anual)
-- ============================================================
-- Contexto:
--   MP preapproval (recorrente) só aceita cartão / saldo MP — PIX é pagamento único.
--   Pra atender cliente sem cartão, criamos 3 modalidades PIX:
--     - mensal_pix:    R$ 67 a cada 30 dias (PIX gerado a cada mês)
--     - semestral_pix: R$ 350 cobrado 1x (cobre 6 meses)
--     - anual_pix:     R$ 670 cobrado 1x (cobre 12 meses)
--   Mantém:
--     - mensal_cartao: R$ 67/mês via preapproval automático
--
-- Idempotente: pode rodar várias vezes sem corromper estado.
-- ============================================================


-- 1. plan_modalidade: como o cliente paga (4 opções)
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS plan_modalidade TEXT;

COMMENT ON COLUMN subscriptions.plan_modalidade IS
  'Como o cliente paga: mensal_cartao (preapproval MP recorrente), mensal_pix (PIX único renovado mensalmente via cron), semestral_pix (PIX único cobre 6 meses), anual_pix (PIX único cobre 12 meses)';


-- 2. pago_ate: até quando o pagamento atual cobre (data de vencimento)
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS pago_ate TIMESTAMPTZ;

COMMENT ON COLUMN subscriptions.pago_ate IS
  'Até quando o pagamento atual cobre. Cron daily verifica este campo pra alertar (D-3 a D-1) e bloquear (D+6+). NULL = não pagou ainda.';


-- 3. pix_link_atual: URL/QR do PIX vigente
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS pix_link_atual TEXT;

COMMENT ON COLUMN subscriptions.pix_link_atual IS
  'URL do PIX vigente gerado pelo MP. Cron regenera mensalmente pra mensal_pix. Cliente pode acessar via /admin pra pagar.';


-- 4. mp_payment_id_atual: rastreio webhook
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS mp_payment_id_atual TEXT;

COMMENT ON COLUMN subscriptions.mp_payment_id_atual IS
  'ID do payment do MP corrente (não preapproval). Webhook payment.created usa pra identificar a subscription correta e atualizar pago_ate.';


-- 5. Constraint: plan_modalidade só aceita os 4 valores válidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscriptions_plan_modalidade_check'
  ) THEN
    ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_plan_modalidade_check
      CHECK (
        plan_modalidade IS NULL
        OR plan_modalidade IN ('mensal_cartao', 'mensal_pix', 'semestral_pix', 'anual_pix')
      );
  END IF;
END $$;


-- 6. Backfill: subscriptions existentes (active/past_due) viram mensal_cartao
-- (todas as anteriores foram via preapproval cartão)
UPDATE subscriptions
SET plan_modalidade = 'mensal_cartao'
WHERE plan_modalidade IS NULL
  AND status IN ('active', 'past_due', 'cancelled');


-- 7. Backfill pago_ate: subscriptions active com current_period_end definido
UPDATE subscriptions
SET pago_ate = current_period_end
WHERE plan_modalidade = 'mensal_cartao'
  AND status = 'active'
  AND pago_ate IS NULL
  AND current_period_end IS NOT NULL;


-- 8. Índice pro cron diário (busca subscriptions PIX vencendo)
CREATE INDEX IF NOT EXISTS idx_subscriptions_pago_ate_modalidade
  ON subscriptions(pago_ate, plan_modalidade)
  WHERE plan_modalidade IN ('mensal_pix', 'semestral_pix', 'anual_pix');


-- ============================================================
-- VALIDAÇÃO PÓS-APLICAÇÃO
-- ============================================================
-- Confirma que as 4 colunas existem:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'subscriptions'
--     AND column_name IN ('plan_modalidade', 'pago_ate', 'pix_link_atual', 'mp_payment_id_atual');
-- Esperado: 4 rows.
--
-- Confirma constraint:
--   SELECT conname FROM pg_constraint WHERE conname = 'subscriptions_plan_modalidade_check';
-- Esperado: 1 row.
--
-- Testa constraint (deve falhar):
--   INSERT INTO subscriptions (business_id, plan, status, plan_modalidade)
--   VALUES (gen_random_uuid(), 'solo', 'pending_payment', 'modalidade_invalida');
-- Esperado: erro check constraint violated.
-- ============================================================
