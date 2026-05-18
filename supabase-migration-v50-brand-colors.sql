-- =================================================================
-- V50 — BRAND COLORS por business (identidade visual customizada)
-- =================================================================
--
-- Cravado durante personalização da Palace Nail Spa Macaé (esmalteria
-- premium · paleta teal #01A197 + dourado #C9A961 + ivory #F2E8DA).
-- Universal — qualquer business pode setar paleta própria.
--
-- Modelo:
--   - 4 colunas hex em businesses (primary/secondary/accent/neutral)
--   - brand_logo_url pra logo customizada
--   - NULL = default AgendaPRO (azul atual via CSS variables)
--
-- Validação: hex format (#XXXXXX) via CHECK.
--
-- IDEMPOTENTE.
-- =================================================================

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS brand_primary text,
  ADD COLUMN IF NOT EXISTS brand_secondary text,
  ADD COLUMN IF NOT EXISTS brand_accent text,
  ADD COLUMN IF NOT EXISTS brand_neutral text,
  ADD COLUMN IF NOT EXISTS brand_logo_url text;

-- Validação de formato hex (#RRGGBB) · permite NULL (= usar default)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'businesses_brand_hex_check'
  ) THEN
    ALTER TABLE public.businesses
      ADD CONSTRAINT businesses_brand_hex_check
      CHECK (
        (brand_primary IS NULL OR brand_primary ~ '^#[0-9A-Fa-f]{6}$') AND
        (brand_secondary IS NULL OR brand_secondary ~ '^#[0-9A-Fa-f]{6}$') AND
        (brand_accent IS NULL OR brand_accent ~ '^#[0-9A-Fa-f]{6}$') AND
        (brand_neutral IS NULL OR brand_neutral ~ '^#[0-9A-Fa-f]{6}$')
      );
  END IF;
END $$;

COMMENT ON COLUMN public.businesses.brand_primary IS
  'Cor primária da identidade (hex #RRGGBB). NULL = usa default AgendaPRO. Aplicada em accents, KPIs, botões CTA via CSS variables no layout.';
COMMENT ON COLUMN public.businesses.brand_secondary IS
  'Cor de suporte. Aplicada em fundos sutis e detalhes ornamentais.';
COMMENT ON COLUMN public.businesses.brand_accent IS
  'Cor de destaque pontual (links, badges, hovers).';
COMMENT ON COLUMN public.businesses.brand_neutral IS
  'Neutro próximo do background. Usado em superfícies elevadas.';
COMMENT ON COLUMN public.businesses.brand_logo_url IS
  'URL pública do logo do business (substitui o logo AgendaPRO nos painéis admin/recep). NULL = mantém AgendaPRO.';


-- =================================================================
-- APLICAÇÃO IMEDIATA — paleta Palace Nail Spa Macaé
-- (Eduardo cravou 17/05/2026 baseado em estudo CIC do @palacenailspa_)
-- =================================================================
UPDATE public.businesses
SET
  brand_primary   = '#01A197',  -- Teal Joia (28% do feed · cor de bandeira)
  brand_secondary = '#C9A961',  -- Dourado Champanhe (luxo)
  brand_accent    = '#F2E8DA',  -- Creme Ivory (fundo respirado)
  brand_neutral   = '#1A1A1A'   -- Preto Suave (tipografia)
WHERE id = 'ee6f0b22-5a46-406a-a3d4-b901551c4261';
