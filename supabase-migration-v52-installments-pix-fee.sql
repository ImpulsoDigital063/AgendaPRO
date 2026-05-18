-- =================================================================
-- V52 — Parcelamento de crédito + taxa Pix configurável
-- =================================================================
--
-- Pedido implícito do Marko (Palace Nail Spa) baseado nos prints do
-- sistema antigo dele · 18/05/2026.
--
-- Mudanças:
--   1. merchant_device_fees ganha 3 colunas pra suporte a parcelado:
--      allows_installments · installments_max · installment_rate_percent
--   2. businesses ganha pix_fee_percent (default 0 · alguns adquirentes
--      cobram taxa Pix com antecipação)
--   3. appointments ganha payment_installments (snapshot · nº parcelas
--      no momento do pagamento)
--
-- IDEMPOTENTE.
-- =================================================================

-- 1. merchant_device_fees · parcelamento
ALTER TABLE public.merchant_device_fees
  ADD COLUMN IF NOT EXISTS allows_installments boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS installments_max int NOT NULL DEFAULT 1
    CHECK (installments_max >= 1 AND installments_max <= 12),
  ADD COLUMN IF NOT EXISTS installment_rate_percent numeric(5,2)
    CHECK (installment_rate_percent IS NULL OR (installment_rate_percent >= 0 AND installment_rate_percent < 100));

COMMENT ON COLUMN public.merchant_device_fees.allows_installments IS
  'TRUE = essa combinação maquininha+bandeira+tipo permite parcelado. Faz sentido só pra card_type=credit · débito é sempre à vista.';
COMMENT ON COLUMN public.merchant_device_fees.installments_max IS
  'Máximo de parcelas (1-12) quando allows_installments=true. Default 1 = à vista.';
COMMENT ON COLUMN public.merchant_device_fees.installment_rate_percent IS
  'Taxa % aplicada quando o cliente parcelar (>= 2x). NULL = usa rate_percent normal. Geralmente maior que rate_percent.';


-- 2. businesses · taxa Pix
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS pix_fee_percent numeric(5,2) NOT NULL DEFAULT 0
    CHECK (pix_fee_percent >= 0 AND pix_fee_percent < 100);

COMMENT ON COLUMN public.businesses.pix_fee_percent IS
  'Taxa % cobrada pelo PSP de Pix no business. Default 0 (maioria não cobra · InfinitePay padrão é 0%). Aplicada como snapshot em appointments.payment_fee_percent quando payment_method=pix.';


-- 3. appointments · snapshot do nº de parcelas
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS payment_installments int NOT NULL DEFAULT 1
    CHECK (payment_installments >= 1 AND payment_installments <= 12);

COMMENT ON COLUMN public.appointments.payment_installments IS
  'Nº de parcelas quando pago em cartão crédito parcelado. Snapshot pra histórico não mudar se a config da maquininha mudar.';


-- =================================================================
-- VALIDAÇÃO
-- =================================================================
-- SELECT column_name, data_type, column_default FROM information_schema.columns
-- WHERE table_name = 'merchant_device_fees'
--   AND column_name IN ('allows_installments', 'installments_max', 'installment_rate_percent');
-- esperado: 3 linhas
