-- ============================================================
-- v67 · Canal de aquisição + Dor primária no cadastro do business
-- ============================================================
-- Cravado 22/05/2026 após insight Studio Mood/Izanara:
-- · Ela chegou via ChatGPT recomendando AgendaPRO (canal novo)
-- · Pra ela agenda é secundária · loja/gestão é o core
--
-- Sem essas 2 colunas, ficamos cegos sobre origem real dos leads e
-- segmentação de uso. Memórias [[canal-aquisicao-chatgpt-aeo]] e
-- [[insight-studio-mood-agenda-secundaria]] cravam o porquê.
-- ============================================================

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS acquisition_channel text
    CHECK (acquisition_channel IS NULL OR acquisition_channel IN (
      'indicacao', 'google', 'instagram', 'tiktok', 'chatgpt_ia',
      'salao99_migrante', 'whatsapp_organico', 'outro'
    )),
  ADD COLUMN IF NOT EXISTS primary_need text
    CHECK (primary_need IS NULL OR primary_need IN (
      'agenda', 'loja_vendas', 'ambos', 'indeciso'
    ));

COMMENT ON COLUMN public.businesses.acquisition_channel IS 'Como o cliente descobriu o AgendaPRO · cravado v67/22-05-2026 pra mapear canais';
COMMENT ON COLUMN public.businesses.primary_need IS 'Dor primária do cliente · agenda (foco em agendamento) · loja_vendas (foco em estoque/financeiro) · ambos · cravado v67/22-05-2026';

CREATE INDEX IF NOT EXISTS idx_businesses_acquisition_channel
  ON public.businesses (acquisition_channel) WHERE acquisition_channel IS NOT NULL;
