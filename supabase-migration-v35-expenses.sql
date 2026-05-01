-- =================================================================
-- V35 — TABELA DE DESPESAS (expenses)
-- =================================================================
--
-- Antes: painel financeiro mostrava só receita. Dono nao via LUCRO
-- REAL (receita - despesas). Decisao operacional cega — dava ate
-- impressao de tar lucrando quando na verdade aluguel + produtos +
-- comissão deixava no zero.
--
-- Esta migration:
-- 1. Cria tabela `expenses` com 7 categorias pre-definidas
-- 2. RLS: so o owner do business
-- 3. Index: (business_id, occurred_at DESC) pra "despesas do mês"
--
-- IDEMPOTENTE.
-- =================================================================

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN (
    'rent', 'products', 'salary', 'utilities', 'marketing', 'taxes', 'other'
  )),
  occurred_at DATE NOT NULL DEFAULT CURRENT_DATE,
  recurring BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_business_date
  ON public.expenses (business_id, occurred_at DESC);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_owner_all" ON public.expenses;
CREATE POLICY "expenses_owner_all"
ON public.expenses
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = expenses.business_id
      AND b.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = expenses.business_id
      AND b.owner_id = auth.uid()
  )
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.touch_expenses_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS expenses_touch_updated_at ON public.expenses;
CREATE TRIGGER expenses_touch_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.touch_expenses_updated_at();
