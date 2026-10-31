-- =================================================================
-- V152 — Taxa de maquininha por número de parcelas
-- =================================================================
--
-- Wanessa 31/10/2026: a maquininha cobra uma taxa para cada parcela
-- (2x, 3x, ... 12x), e o sistema só guardava uma taxa de parcelado.
--
-- installment_rates = {"2": 5.39, "3": 6.10, ...}
-- Vazio = usa installment_rate_percent (cadastros antigos seguem iguais).
-- O pagamento continua guardando a taxa aplicada como snapshot, então o
-- histórico não muda.
--
-- IDEMPOTENTE.
-- =================================================================

ALTER TABLE public.merchant_device_fees
  ADD COLUMN IF NOT EXISTS installment_rates jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.merchant_device_fees.installment_rates IS
  'Taxa % por número de parcelas, ex {"2": 5.39, "3": 6.10}. Vazio = usa installment_rate_percent. Lido por taxaDaParcela (src/lib/taxa-parcela.ts).';

-- VALIDAÇÃO
-- SELECT column_name, data_type, column_default FROM information_schema.columns
-- WHERE table_name = 'merchant_device_fees' AND column_name = 'installment_rates';
-- esperado: 1 linha, jsonb, default '{}'
