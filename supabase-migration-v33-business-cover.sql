-- =================================================================
-- V33 — BANNER/CAPA DA PÁGINA PÚBLICA (cover_url + bucket)
-- =================================================================
--
-- Antes: pagina pública /{slug} mostrava gradient nas brand colors
-- como cover. Sem foto real do estabelecimento (fachada, ambiente),
-- pagina parecia generica.
--
-- Esta migration:
--
-- 1. Adiciona coluna `cover_url` em businesses (TEXT, nullable)
-- 2. Cria bucket public business-covers (max 5MB por arquivo)
-- 3. Policies de storage:
--    - Leitura: publica (qualquer um vê, igual ao professional-photos)
--    - INSERT/UPDATE/DELETE: só o owner do business
--
-- Path canonico: <business_id>/cover.<ext>
-- Limit total de assets: ~300KB por business apos compressao client
-- (browser-image-compression preset cover). 100 businesses = ~30MB.
--
-- IDEMPOTENTE.
-- =================================================================

-- 1. Coluna cover_url
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- 2. Bucket público pra capas
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('business-covers', 'business-covers', true, 5242880)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880;

-- 3. Policies de storage (idempotente)
DROP POLICY IF EXISTS "bc_public_read" ON storage.objects;
DROP POLICY IF EXISTS "bc_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "bc_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "bc_owner_delete" ON storage.objects;

-- Leitura pública (qualquer um vê a capa do estabelecimento)
CREATE POLICY "bc_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-covers');

-- Insert: só o owner do business pode subir cover do próprio
CREATE POLICY "bc_owner_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'business-covers'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND b.owner_id = auth.uid()
  )
);

-- Update: idem
CREATE POLICY "bc_owner_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'business-covers'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND b.owner_id = auth.uid()
  )
);

-- Delete: idem
CREATE POLICY "bc_owner_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'business-covers'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND b.owner_id = auth.uid()
  )
);
