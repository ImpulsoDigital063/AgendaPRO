-- =================================================================
-- V34 — RASTREAMENTO DE PAGAMENTO (paid_at + payment_method)
-- =================================================================
--
-- Antes: KPI "Realizado" do financeiro usava status='completed' como
-- proxy de "dinheiro recebido". Mas na vida real, cliente pode ter
-- sido atendido e ainda não ter pago (ex: vai pagar PIX depois). Dono
-- ficava com KPI mentindo sobre o caixa.
--
-- Esta migration adiciona:
-- 1. `paid_at` — timestamp de quando o pagamento entrou (NULL se não pago)
-- 2. `payment_method` — pix | cash | card | courtesy (NULL se não pago)
--
-- Index: (business_id, paid_at) pra queries de "pago no período" sem
-- table scan em uso massa.
--
-- IDEMPOTENTE.
-- =================================================================

-- 1. Colunas em appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- 2. Constraint: só os 4 métodos válidos (ou NULL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_payment_method_check'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_payment_method_check
      CHECK (payment_method IS NULL OR payment_method IN ('pix', 'cash', 'card', 'courtesy'));
  END IF;
END $$;

-- 3. Index pra queries "pago no período" (uso em massa)
CREATE INDEX IF NOT EXISTS idx_appointments_business_paid_at
  ON public.appointments (business_id, paid_at)
  WHERE paid_at IS NOT NULL;
