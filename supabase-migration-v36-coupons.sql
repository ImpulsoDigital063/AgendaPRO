-- =================================================================
-- V36 — SISTEMA DE CUPONS "OI SUMIDO"
-- =================================================================
--
-- Reativa clientes sumidos via cupom de desconto enviado por
-- WhatsApp (deep link wa.me, sem API oficial — sem risco de ban).
-- Dono do AgendaPRO clica em cada cliente, abre conversa pré-
-- formatada com mensagem + link com cupom embutido. Cliente
-- aplica no booking e ganha desconto.
--
-- IDEMPOTENTE.
-- =================================================================

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  -- Codigo curto e legivel (ex: SUMIDO7K9). UNIQUE GLOBAL pra simplificar
  -- a validacao no booking (so 1 lookup por code).
  code TEXT NOT NULL UNIQUE,
  -- Tipo do desconto: fixed (R$X off) ou percent (X% off).
  discount_type TEXT NOT NULL CHECK (discount_type IN ('fixed', 'percent')),
  -- Valor: pra fixed e em reais (positivo). Pra percent e 0-100.
  discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  -- ID da campanha que gerou (UUID textual). Permite agrupar e medir ROI.
  campaign_id TEXT,
  -- Mensagem que sera enviada (pra historico)
  whatsapp_message TEXT,
  -- Quando o dono efetivou o envio (clicou no botao do WhatsApp)
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pra validar cupom no booking (lookup por code)
-- ja eh implicito pelo UNIQUE em code.

-- Index pra listar cupons do business + filtrar status (ativo/usado/expirado)
CREATE INDEX IF NOT EXISTS idx_coupons_business_created
  ON public.coupons (business_id, created_at DESC);

-- Index pra buscar cupons ativos de um customer especifico
CREATE INDEX IF NOT EXISTS idx_coupons_customer_active
  ON public.coupons (customer_id, expires_at)
  WHERE used_at IS NULL;

-- RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupons_owner_all" ON public.coupons;
CREATE POLICY "coupons_owner_all"
ON public.coupons
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = coupons.business_id
      AND b.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = coupons.business_id
      AND b.owner_id = auth.uid()
  )
);

-- Policy publica de leitura — pra validacao do cupom no booking. So
-- libera SELECT (read-only). UPDATE/DELETE continua so pelo owner.
DROP POLICY IF EXISTS "coupons_public_read" ON public.coupons;
CREATE POLICY "coupons_public_read"
ON public.coupons FOR SELECT
USING (TRUE);

-- =================================================================
-- Funcao geradora de codigo curto e legivel
-- =================================================================
-- Formato: PRO + 5 caracteres alfanumericos. Ex: PROA7K9X
-- Prefixo "PRO" reforca branding AgendaPRO. Evita 0/O/1/I
-- (confusao visual). 32^5 = ~33M combinacoes.
-- =================================================================

CREATE OR REPLACE FUNCTION public.generate_coupon_code(prefix TEXT DEFAULT 'PRO')
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := prefix;
  i INT;
BEGIN
  FOR i IN 1..5 LOOP
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  RETURN result;
END $$;
