-- =================================================================
-- V172 — Preço por profissional no mesmo serviço
-- =================================================================
--
-- ORIGEM: Ivna Loyola (Ivna Loyola Beauty Clinic, 22–23/10/2026): cílios
-- com a Ilana custam o preço do cadastro; com a Ivna, "em média 20,00 mais
-- caro". A cliente precisa VER a diferença na hora de escolher, e a dona
-- precisa conseguir mudar sozinha (Eduardo, 23/10: "deixa isso fácil dela
-- alterar").
--
-- REGRA: uma linha aqui = o preço daquele serviço com aquela profissional.
-- Sem linha = vale o services.price de sempre. Só é lido quando
-- businesses.preco_por_profissional = true (recurso ligado por conta,
-- mesmo modelo do CAF).
--
-- Só cria tabela nova e uma coluna com default false. Nenhum dado
-- existente muda.
-- =================================================================

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS preco_por_profissional boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.service_professional_prices (
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (service_id, professional_id)
);

CREATE INDEX IF NOT EXISTS idx_service_professional_prices_business
  ON public.service_professional_prices (business_id);

ALTER TABLE public.service_professional_prices ENABLE ROW LEVEL SECURITY;

-- Dono gerencia tudo do negócio dele
DROP POLICY IF EXISTS "dono gerencia preco por profissional" ON public.service_professional_prices;
CREATE POLICY "dono gerencia preco por profissional" ON public.service_professional_prices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = service_professional_prices.business_id AND b.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = service_professional_prices.business_id AND b.owner_id = auth.uid())
  );

-- Gerente (v155) gerencia como o dono
DROP POLICY IF EXISTS "gerente_service_professional_prices" ON public.service_professional_prices;
CREATE POLICY "gerente_service_professional_prices" ON public.service_professional_prices
  FOR ALL TO authenticated
  USING (eh_gerente_do_negocio(business_id))
  WITH CHECK (eh_gerente_do_negocio(business_id));

-- Público lê (link de agendamento, sem login) — é preço, já é público em services.
DROP POLICY IF EXISTS "public ve preco por profissional" ON public.service_professional_prices;
CREATE POLICY "public ve preco por profissional" ON public.service_professional_prices
  FOR SELECT USING (true);

-- Conferência depois de rodar:
--   SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'public.service_professional_prices'::regclass;
--   → 3 linhas: dono (*), gerente (*), public (r)
