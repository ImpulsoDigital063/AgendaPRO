-- v4 — Personalização de marca (white-label soft) por negócio.
-- Roda no SQL Editor do Supabase.

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS brand_primary   text DEFAULT '#3B82F6',
  ADD COLUMN IF NOT EXISTS brand_secondary text DEFAULT '#06B6D4',
  ADD COLUMN IF NOT EXISTS brand_mode      text DEFAULT 'dark' CHECK (brand_mode IN ('dark','light'));

-- Backfill defensivo (caso existam linhas legacy com NULL).
UPDATE businesses
SET brand_primary   = COALESCE(brand_primary,   '#3B82F6'),
    brand_secondary = COALESCE(brand_secondary, '#06B6D4'),
    brand_mode      = COALESCE(brand_mode,      'dark');
