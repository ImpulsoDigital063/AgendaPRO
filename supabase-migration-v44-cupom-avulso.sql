-- =====================================================================
-- v44 — CUPOM AVULSO (standalone) · 14/05/2026
-- =====================================================================
--
-- IDEIA 3 do Olímpio: gerar cupom genérico pra divulgar e atrair clientela
-- (panfleto / WhatsApp do funcionário / IG). Diferente do "Oi Sumido" e
-- "Aniversariantes":
--   · Não vinculado a um customer específico (customer_id = NULL)
--   · Múltiplos clientes podem usar (1 uso POR TELEFONE · sem limite total)
--   · Opcionalmente direcionado a um profissional (caso Olímpio · rapaz dele)
--
-- Coexiste com cupons de campanha (Oi Sumido/Aniversário) na mesma tabela:
--   · is_standalone = FALSE → modelo antigo · 1 uso global · marca used_at
--   · is_standalone = TRUE  → novo modelo · multi-uso · usa coupon_redemptions
--
-- IDEMPOTENTE. Additive only — registros existentes não mudam de comportamento.
-- =====================================================================

-- 1. COLUNAS NOVAS EM `coupons`
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_standalone   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS standalone_label TEXT;

COMMENT ON COLUMN public.coupons.professional_id IS
  'Profissional pra quem o cupom direciona (decisão 1C com Eduardo 14/05). NULL = qualquer profissional do business atende.';

COMMENT ON COLUMN public.coupons.is_standalone IS
  'TRUE = cupom avulso (multi-uso por telefone via coupon_redemptions). FALSE = cupom de campanha (1 uso global via used_at).';

COMMENT ON COLUMN public.coupons.standalone_label IS
  'Nome amigável da campanha pro dono identificar (ex: "Promo do rapaz", "Inauguração"). Só preenchido em is_standalone=TRUE.';

CREATE INDEX IF NOT EXISTS idx_coupons_standalone_active
  ON public.coupons (business_id, expires_at)
  WHERE is_standalone = TRUE;

CREATE INDEX IF NOT EXISTS idx_coupons_professional
  ON public.coupons (professional_id)
  WHERE professional_id IS NOT NULL;

-- 2. TABELA `coupon_redemptions` (rastreia usos individuais)
-- Pra cupom standalone, cada uso vira uma row aqui. UNIQUE (coupon_id, phone)
-- garante 1 uso por telefone (decisão 2B com Eduardo).
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  -- Telefone normalizado pra dígitos-only (mesmo formato que customer-lookup usa).
  -- Trim() + replace(/\D/g, '') no caller. Banco confia que vem normalizado.
  customer_phone TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, customer_phone)
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon
  ON public.coupon_redemptions (coupon_id);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_phone
  ON public.coupon_redemptions (customer_phone);

-- 3. RLS — owner do business gerencia · público pode INSERT (booking)
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupon_redemptions_owner_all" ON public.coupon_redemptions;
CREATE POLICY "coupon_redemptions_owner_all"
ON public.coupon_redemptions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.coupons c
    JOIN public.businesses b ON b.id = c.business_id
    WHERE c.id = coupon_redemptions.coupon_id
      AND b.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "coupon_redemptions_public_read" ON public.coupon_redemptions;
CREATE POLICY "coupon_redemptions_public_read"
ON public.coupon_redemptions FOR SELECT
USING (TRUE);

-- INSERT público acontece via service-role no /api/coupons/use — não precisamos
-- liberar INSERT direto via anon (sempre passa pelo endpoint).

-- =====================================================================
-- VALIDAÇÃO PÓS-MIGRATION (rodar manualmente após APPLY)
-- =====================================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='coupons'
--   AND column_name IN ('professional_id','is_standalone','standalone_label');
--
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema='public' AND table_name='coupon_redemptions';
--
-- SELECT indexname FROM pg_indexes
-- WHERE tablename IN ('coupons','coupon_redemptions')
-- ORDER BY indexname;
-- =====================================================================
