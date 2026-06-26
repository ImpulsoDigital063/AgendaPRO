-- v91 · Fichas dedicadas por nicho (cílios é a 1ª)
--
-- As fichas de nicho não são templates do client_form_templates — são config
-- no código (src/lib/fichas). A resposta preenchida é guardada em
-- client_form_responses com template_id = NULL e niche_slug = 'cilios'.
-- Imagens (mapeamento/assinatura) vão pro Storage (bucket 'fichas'); no banco
-- fica só o link.
--
-- Idempotente. Rodar no SQL Editor.

ALTER TABLE public.client_form_responses
  ADD COLUMN IF NOT EXISTS niche_slug text;

-- Permite resposta sem template (ficha de nicho não tem template row)
ALTER TABLE public.client_form_responses
  ALTER COLUMN template_id DROP NOT NULL;

-- Acelera listar fichas de nicho por cliente
CREATE INDEX IF NOT EXISTS idx_cfr_customer_niche
  ON public.client_form_responses(customer_id, niche_slug);
