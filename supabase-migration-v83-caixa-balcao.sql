-- =================================================================
-- v83 · Caixa de balcão (port do Palace pro Studio Mood)
--
-- Traz pro agendapro o controle de dinheiro de balcão que já existe no
-- palace-system:
--   1. cash_openings  · fundo de troco / abertura de caixa do dia
--   2. cash_movements · sangria (saída) e suprimento (entrada)
--   3. cash_closings  · +conferência tripla (cartão + pix, além de dinheiro)
--
-- Dinheiro esperado na gaveta no fechamento:
--   esperado = fundo de troco + recebido em dinheiro + suprimentos − sangrias
--
-- RLS espelha cash_closings: dono FOR ALL · recepcionista SELECT + INSERT.
-- Sem UPDATE/DELETE pra recep = histórico imutável.
-- =================================================================

-- ┌──────────────────────────────────────────────────────────────────┐
-- │ 1. cash_openings · abertura de caixa / fundo de troco              │
-- └──────────────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS public.cash_openings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  opening_date date NOT NULL,
  opening_amount_cents int NOT NULL DEFAULT 0 CHECK (opening_amount_cents >= 0),
  opened_by_professional_id uuid REFERENCES public.professionals(id) ON DELETE SET NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, opening_date)
);

CREATE INDEX IF NOT EXISTS idx_cash_openings_business_date
  ON public.cash_openings(business_id, opening_date DESC);

COMMENT ON TABLE public.cash_openings IS
  'Abertura de caixa do dia · fundo de troco. Base do esperado na gaveta no fechamento.';

ALTER TABLE public.cash_openings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dono gerencia cash_openings" ON public.cash_openings;
CREATE POLICY "dono gerencia cash_openings" ON public.cash_openings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = cash_openings.business_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "recepcao ve cash_openings" ON public.cash_openings;
CREATE POLICY "recepcao ve cash_openings" ON public.cash_openings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.professionals WHERE business_id = cash_openings.business_id AND auth_user_id = auth.uid() AND is_receptionist = true)
  );

DROP POLICY IF EXISTS "recepcao abre cash_openings" ON public.cash_openings;
CREATE POLICY "recepcao abre cash_openings" ON public.cash_openings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.professionals WHERE business_id = cash_openings.business_id AND auth_user_id = auth.uid() AND is_receptionist = true)
  );

-- ┌──────────────────────────────────────────────────────────────────┐
-- │ 2. cash_movements · sangria (saída) + suprimento (entrada)         │
-- └──────────────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS public.cash_movements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  movement_date date NOT NULL,
  type text NOT NULL CHECK (type IN ('sangria', 'suprimento')),
  amount_cents int NOT NULL CHECK (amount_cents > 0),
  reason text,
  created_by_professional_id uuid REFERENCES public.professionals(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_movements_business_date
  ON public.cash_movements(business_id, movement_date DESC);

COMMENT ON TABLE public.cash_movements IS
  'Movimentos de caixa no dia · sangria (saída) e suprimento (entrada). Ajustam o esperado na gaveta.';

ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dono gerencia cash_movements" ON public.cash_movements;
CREATE POLICY "dono gerencia cash_movements" ON public.cash_movements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = cash_movements.business_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "recepcao ve cash_movements" ON public.cash_movements;
CREATE POLICY "recepcao ve cash_movements" ON public.cash_movements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.professionals WHERE business_id = cash_movements.business_id AND auth_user_id = auth.uid() AND is_receptionist = true)
  );

DROP POLICY IF EXISTS "recepcao registra cash_movements" ON public.cash_movements;
CREATE POLICY "recepcao registra cash_movements" ON public.cash_movements
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.professionals WHERE business_id = cash_movements.business_id AND auth_user_id = auth.uid() AND is_receptionist = true)
  );

-- ┌──────────────────────────────────────────────────────────────────┐
-- │ 3. cash_closings · conferência tripla (cartão + pix)              │
-- │    (colunas nullable · retrocompat com fechamentos antigos)        │
-- └──────────────────────────────────────────────────────────────────┘
ALTER TABLE public.cash_closings
  ADD COLUMN IF NOT EXISTS card_physical_count_cents BIGINT,
  ADD COLUMN IF NOT EXISTS card_diff_cents BIGINT,
  ADD COLUMN IF NOT EXISTS pix_physical_count_cents BIGINT,
  ADD COLUMN IF NOT EXISTS pix_diff_cents BIGINT;
