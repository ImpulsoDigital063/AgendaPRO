-- v92 · Negócio escolhe quais fichas de nicho ativa
--
-- Sem isso, TODA ficha do segmento aparece no picker (um salão de cabelo via
-- cílios + facial + capilar). Agora o dono marca/desmarca em Configurações →
-- Fichas Modelo. enabled_niche_fichas = array de slugs ativados.
--   NULL  = default (mostra todas as fichas do segmento · retrocompatível)
--   {...} = mostra só as escolhidas
--   {}    = nenhuma
-- Idempotente. Rodar no SQL Editor.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS enabled_niche_fichas text[];
