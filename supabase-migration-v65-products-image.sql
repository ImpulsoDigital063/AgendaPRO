-- ============================================================
-- v65 · Imagem do produto
-- ============================================================
-- Cravado 22/05 madrugada. Studio Mood tem foto em 100% dos 85 SKUs
-- do catalogo Kyte. Universal · serve Palace e Studio Mood.
--
-- Apenas adiciona coluna · o bucket Supabase precisa ser criado
-- manualmente pelo painel (Storage → New bucket → name "product-photos"
-- → public). RLS do bucket: leitura publica, upload owner/recep.
-- ============================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_url text;
