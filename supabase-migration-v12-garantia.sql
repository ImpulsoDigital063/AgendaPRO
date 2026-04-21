-- ============================================================
-- Migration V12: trial → garantia (Clube Fundador)
-- AgendaPRO — Política oficial 2026-04-20
-- ============================================================
-- Regras de negócio nova política:
--   - SEM trial pré-pago
--   - Cliente paga setup + 1ª mensalidade na hora
--   - 7 dias de garantia pós-pagamento (refund sem burocracia)
--   - Planos:
--       Solo: setup R$147 (14700) + R$47/mês (4700)
--       Equipe: setup R$197 (19700) + R$67/mês (6700)
--   - Clube Fundador: 10 primeiros travam preço vitalício
--   - Status: pending_payment → active (após MP confirmar)
--               → cancelled (se refund dentro dos 7 dias)
--               → past_due → cancelled (se não pagar 5+7 dias)
-- ============================================================
--
-- IMPORTANTE: Esta migration substitui a V11. Se V11 já foi
-- aplicada (com status 'trial'), esta migration ajusta os
-- registros existentes. Se V11 NÃO foi aplicada, esta migration
-- assume que a tabela subscriptions ainda não existe e cria.
-- ============================================================


-- 1. CRIAR TABELA SE NÃO EXISTIR (cenário: V11 nunca foi aplicada)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  plan TEXT NOT NULL CHECK (plan IN ('solo', 'equipe')),
  status TEXT NOT NULL DEFAULT 'pending_payment',
  mp_subscription_id TEXT,
  mp_payer_id TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  setup_cents INTEGER NOT NULL DEFAULT 0 CHECK (setup_cents >= 0),
  setup_paid_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  refund_deadline_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  grace_ends_at TIMESTAMPTZ,
  public_blocked_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  data_delete_at TIMESTAMPTZ,
  founders_club BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 2. AJUSTAR CONSTRAINT DE STATUS (adicionar 'pending_payment')
ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('pending_payment', 'trial', 'active', 'past_due', 'cancelled', 'expired'));


-- 3. ADICIONAR COLUNAS NOVAS (idempotente)
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS setup_cents INTEGER NOT NULL DEFAULT 0;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS setup_paid_at TIMESTAMPTZ;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS refund_deadline_at TIMESTAMPTZ;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS founders_club BOOLEAN NOT NULL DEFAULT FALSE;


-- 4. AJUSTAR trial_ends_at PARA PERMITIR NULL
-- (só se a coluna existir — herança de V11; se V11 não foi aplicada, coluna não existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'trial_ends_at'
  ) THEN
    ALTER TABLE subscriptions ALTER COLUMN trial_ends_at DROP NOT NULL;
  END IF;
END $$;


-- 5. ALTERAR DEFAULT DE STATUS
ALTER TABLE subscriptions
  ALTER COLUMN status SET DEFAULT 'pending_payment';


-- 6. COMENTÁRIOS ATUALIZADOS
COMMENT ON COLUMN subscriptions.status IS
  'pending_payment (cadastrou, aguarda MP) | active (pago, ativo) | past_due (falha pgto) | cancelled | expired';
COMMENT ON COLUMN subscriptions.setup_cents IS
  'Setup one-shot em centavos: 14700 (Solo R$147) ou 19700 (Equipe R$197)';
COMMENT ON COLUMN subscriptions.price_cents IS
  'Mensalidade em centavos: 4700 (Solo R$47) ou 6700 (Equipe R$67) — Clube Fundador';
COMMENT ON COLUMN subscriptions.refund_deadline_at IS
  'setup_paid_at + 7 dias — prazo limite pra cliente pedir reembolso';
COMMENT ON COLUMN subscriptions.founders_club IS
  'TRUE pros 10 primeiros — trava preço vitalício';


-- 7. ÍNDICE NOVO — refund_deadline_at (pra cron futuro)
CREATE INDEX IF NOT EXISTS idx_subscriptions_refund_deadline
  ON subscriptions(refund_deadline_at)
  WHERE refund_deadline_at IS NOT NULL AND refunded_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_founders_club
  ON subscriptions(founders_club)
  WHERE founders_club = TRUE;


-- 8. MIGRAR REGISTROS EXISTENTES (se V11 foi aplicada com status 'trial')
-- Converte trials ativos em pending_payment (sem data de expiração)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'trial_ends_at'
  ) THEN
    UPDATE subscriptions
    SET status = 'pending_payment', trial_ends_at = NULL
    WHERE status = 'trial';
  ELSE
    UPDATE subscriptions
    SET status = 'pending_payment'
    WHERE status = 'trial';
  END IF;
END $$;

-- Ajusta price_cents pros novos valores (quem estava em 6700/10700 vai pra 4700/6700)
UPDATE subscriptions
SET price_cents = 4700, setup_cents = 14700
WHERE plan = 'solo' AND price_cents = 6700;

UPDATE subscriptions
SET price_cents = 6700, setup_cents = 19700
WHERE plan = 'equipe' AND price_cents = 10700;


-- 9. REMOVER trial_ends_at DA TABELA businesses (se existir)
-- A lógica de bloqueio agora é 100% via subscriptions
-- SEGURO rodar várias vezes (IF EXISTS)
ALTER TABLE businesses
  DROP COLUMN IF EXISTS trial_ends_at;


-- ============================================================
-- FIM DA MIGRATION V12
-- ============================================================
-- Pós-aplicação:
--   1. Verificar que todas as subscriptions existentes viraram pending_payment
--   2. Verificar que price_cents está em 4700/6700 (não 6700/10700)
--   3. Deploy do código nova versão (api/cadastro + api/billing/status)
--   4. Configurar webhook Mercado Pago pra setar status=active + setup_paid_at
-- ============================================================
