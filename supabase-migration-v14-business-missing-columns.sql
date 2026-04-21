-- V14 — Adiciona colunas faltantes em `businesses`
-- Causou 404 em todas as páginas públicas porque o select da app pedia
-- colunas que nunca foram criadas no banco.
-- Idempotente.

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS brand_primary          text DEFAULT '#3B82F6',
  ADD COLUMN IF NOT EXISTS brand_secondary        text DEFAULT '#06B6D4',
  ADD COLUMN IF NOT EXISTS brand_mode             text DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS category               text,
  ADD COLUMN IF NOT EXISTS whatsapp_instance_id   text,
  ADD COLUMN IF NOT EXISTS whatsapp_token         text,
  ADD COLUMN IF NOT EXISTS slot_interval_minutes  integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS max_daily_appointments integer;

-- Constraint do brand_mode (só aceita 'dark' ou 'light')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'businesses' AND constraint_name = 'businesses_brand_mode_check'
  ) THEN
    ALTER TABLE businesses
      ADD CONSTRAINT businesses_brand_mode_check
      CHECK (brand_mode IN ('dark','light'));
  END IF;
END $$;

-- Backfill pra registros legacy
UPDATE businesses
SET
  brand_primary   = COALESCE(brand_primary,   '#3B82F6'),
  brand_secondary = COALESCE(brand_secondary, '#06B6D4'),
  brand_mode      = COALESCE(brand_mode,      'dark'),
  slot_interval_minutes = COALESCE(slot_interval_minutes, 30);
