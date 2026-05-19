-- =================================================================
-- V59 — coluna import_external_id em expenses (idempotência de imports)
-- =================================================================
--
-- Necessario pra rodar import de despesas do Salao99 multiplas vezes
-- sem duplicar. Hash deterministico de (name | occurred_at | amount)
-- por business.
--
-- IDEMPOTENTE.
-- =================================================================

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS import_external_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_business_import_external
  ON public.expenses (business_id, import_external_id)
  WHERE import_external_id IS NOT NULL;
