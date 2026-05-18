-- =================================================================
-- V51 — CASH CLOSINGS (fechamento de caixa diário pela recepção)
-- =================================================================
--
-- Cravado durante personalização da Palace Nail Spa Macaé (18/05/2026).
-- Recepção precisa fechar o caixa no fim do dia · informa quanto tem
-- de espécie física · sistema calcula totais via paid_at + payment_method
-- dos appointments do dia · registra fechamento auditável.
--
-- Universal — qualquer business com recep pode usar.
--
-- IDEMPOTENTE.
-- =================================================================

CREATE TABLE IF NOT EXISTS public.cash_closings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  closed_by_professional_id uuid REFERENCES public.professionals(id) ON DELETE SET NULL,
  closed_at timestamptz NOT NULL DEFAULT now(),
  closing_date date NOT NULL,

  -- Totais calculados (centavos · evita drift de float)
  total_pix_cents int NOT NULL DEFAULT 0,
  total_cash_cents int NOT NULL DEFAULT 0,
  total_card_credit_cents int NOT NULL DEFAULT 0,
  total_card_debit_cents int NOT NULL DEFAULT 0,
  total_card_fees_cents int NOT NULL DEFAULT 0,
  total_courtesy_cents int NOT NULL DEFAULT 0,
  total_points_redeemed int NOT NULL DEFAULT 0,

  -- Bruto = soma de tudo recebido (com taxa de cartão incluída no bruto · empresa "perde" só no fim)
  -- Líquido = bruto - taxas de cartão (= o que efetivamente entra no banco)
  total_gross_cents int NOT NULL DEFAULT 0,
  total_net_cents int NOT NULL DEFAULT 0,

  -- Conferência de espécie · recep informa o que tem fisicamente no caixa
  cash_physical_count_cents int,
  cash_diff_cents int,  -- physical_count - total_cash_cents (positivo = sobra, negativo = falta)

  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(business_id, closing_date)
);

CREATE INDEX IF NOT EXISTS idx_cash_closings_business_date
  ON public.cash_closings(business_id, closing_date DESC);

COMMENT ON TABLE public.cash_closings IS
  'Fechamento de caixa diário · totais por método de pagamento calculados via appointments.paid_at do dia. UNIQUE(business_id, closing_date) = 1 fechamento por dia.';

COMMENT ON COLUMN public.cash_closings.cash_diff_cents IS
  'Diferença entre dinheiro físico no caixa e total registrado no sistema. Positivo = sobra, negativo = falta. Útil pra rastrear erros operacionais.';


-- ┌──────────────────────────────────────────────────────────────────┐
-- │ RLS                                                                │
-- └──────────────────────────────────────────────────────────────────┘
ALTER TABLE public.cash_closings ENABLE ROW LEVEL SECURITY;

-- Dono gerencia tudo
DROP POLICY IF EXISTS "dono gerencia cash_closings" ON public.cash_closings;
CREATE POLICY "dono gerencia cash_closings" ON public.cash_closings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = cash_closings.business_id
        AND owner_id = auth.uid()
    )
  );

-- Recepcionista do business pode VER + INSERIR (fechar)
-- Não permite UPDATE/DELETE · histórico imutável (só dono corrige se precisar)
DROP POLICY IF EXISTS "recepcao ve cash_closings" ON public.cash_closings;
CREATE POLICY "recepcao ve cash_closings" ON public.cash_closings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.professionals
      WHERE business_id = cash_closings.business_id
        AND auth_user_id = auth.uid()
        AND is_receptionist = true
    )
  );

DROP POLICY IF EXISTS "recepcao fecha caixa" ON public.cash_closings;
CREATE POLICY "recepcao fecha caixa" ON public.cash_closings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.professionals
      WHERE business_id = cash_closings.business_id
        AND auth_user_id = auth.uid()
        AND is_receptionist = true
    )
  );
