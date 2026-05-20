-- =================================================================
-- Setar branding completo do Palace Nail Spa Macaé
-- =================================================================
-- Logo + paleta cravada (pedido direto do Marko · ele/Luana focam
-- muito em identidade visual)
--
-- business_id: ee6f0b22-5a46-406a-a3d4-b901551c4261
--
-- Paleta extraída dos arquivos oficiais (CDR/EPS/PDF):
-- - Turquesa (primária):     #1AA9A8
-- - Dourado/champagne (sec): #C9A87C
-- - Nude/rosa-chá (accent):  #D9B5A7
-- - Creme (neutro):          #F4EDE0
-- =================================================================

-- IMPORTANTE: logo TRADICIONAL/PRINCIPAL = fundo turquesa (logo-on-teal.png).
-- Versões com fundo creme/nude variam em OUTRAS telas, NUNCA na principal.
-- NÃO usar versão mono · NÃO usar SVG simplificado · só os arquivos que Marko entregou.
--
-- Colunas:
-- - brand_logo_url: usada no painel admin/recepção/profissional
-- - logo_url: usada na página pública /[slug] (cliente final agendando)
-- - cover_url: banner horizontal de hero na página pública
UPDATE public.businesses
SET
  brand_logo_url   = '/brand/palace/logo-on-teal.png',
  logo_url         = '/brand/palace/logo-on-teal.png',
  cover_url        = '/brand/palace/logo-on-teal.png',
  brand_primary    = '#1AA9A8',
  brand_secondary  = '#C9A87C',
  brand_accent     = '#D9B5A7',
  brand_mode       = 'light'
WHERE id = 'ee6f0b22-5a46-406a-a3d4-b901551c4261';

-- Verificar
SELECT
  id, name, slug,
  brand_logo_url,
  logo_url,
  cover_url,
  brand_primary,
  brand_secondary,
  brand_accent,
  brand_mode
FROM public.businesses
WHERE id = 'ee6f0b22-5a46-406a-a3d4-b901551c4261';
