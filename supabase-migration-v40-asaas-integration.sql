-- ============================================================
-- MIGRATION v40 — Integração Asaas (alternativa ao Mercado Pago)
-- ============================================================
-- Data: 2026-05-07
-- Motivo: MP tá com fricção alta no checkout cartão (cruza email/CPF
--         do cartão com a conta MP do dono). Asaas não tem essa regra
--         e cobra ~5x menos taxa (1,99% vs 9,99%).
--
-- Estratégia: adicionar campos paralelos sem tocar nos do MP.
-- Feature flag BILLING_PROVIDER decide qual provider usar.
-- Migration 100% aditiva — não quebra nada existente.
-- ============================================================

-- 1. Adicionar campos Asaas em subscriptions
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_payment_id_atual TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'mercado_pago';

-- 2. Constraint pro campo provider (apenas valores válidos)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscriptions_provider_check'
  ) THEN
    ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_provider_check
      CHECK (provider IN ('mercado_pago', 'asaas'));
  END IF;
END $$;

-- 3. Índices pra busca rápida (webhook precisa achar subscription pelo ID Asaas)
CREATE INDEX IF NOT EXISTS idx_subscriptions_asaas_subscription_id
  ON subscriptions(asaas_subscription_id)
  WHERE asaas_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_asaas_payment_id_atual
  ON subscriptions(asaas_payment_id_atual)
  WHERE asaas_payment_id_atual IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_asaas_customer_id
  ON subscriptions(asaas_customer_id)
  WHERE asaas_customer_id IS NOT NULL;

-- 4. Comentários pra documentar
COMMENT ON COLUMN subscriptions.asaas_customer_id IS
  'ID do customer no Asaas (cust_xxx). Criado uma vez, reusado em todas as cobranças do business.';

COMMENT ON COLUMN subscriptions.asaas_subscription_id IS
  'ID da subscription recorrente Asaas (sub_xxx). Usado pra cartão recorrente.';

COMMENT ON COLUMN subscriptions.asaas_payment_id_atual IS
  'ID da última cobrança paga (pay_xxx). Usado pra refund e tracking.';

COMMENT ON COLUMN subscriptions.provider IS
  'Provider de pagamento ativo: mercado_pago (legado) ou asaas (novo). Default mp pra retrocompat.';

-- ============================================================
-- VERIFICAÇÃO PÓS-MIGRATION
-- ============================================================
-- Rodar pra confirmar que tudo foi aplicado:
--
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'subscriptions'
--   AND column_name IN ('asaas_customer_id', 'asaas_subscription_id',
--                       'asaas_payment_id_atual', 'provider')
-- ORDER BY column_name;
--
-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'subscriptions'
--   AND indexname LIKE '%asaas%';
-- ============================================================
