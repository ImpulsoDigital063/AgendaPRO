-- =================================================================
-- V87 — TAXAS DE CARTÃO NA VENDA DIRETA DE PRODUTO (sales)
-- =================================================================
--
-- Eduardo 09/06/2026: "sistema tem que estar em plena comunicação".
-- A venda direta de produto (rota Vender Produto · sem comanda) agora
-- pode receber na hora (pix/dinheiro/cartão). Faltavam as colunas de
-- snapshot do cartão pra a taxa de maquininha FLUIR pro líquido — igual
-- já acontece em appointments (v49/v52) e invoice_payments.
--
-- Espelha exatamente as colunas de appointments (v49 + v52):
--   payment_device_id · payment_card_brand · payment_card_type ·
--   payment_fee_percent · payment_installments
--
-- Snapshot: a taxa é gravada no momento da venda · não muda se o
-- cadastro da maquininha mudar depois (relatório histórico fiel).
--
-- IDEMPOTENTE.
-- =================================================================

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS payment_device_id uuid REFERENCES public.merchant_devices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_card_brand text,
  ADD COLUMN IF NOT EXISTS payment_card_type text,
  ADD COLUMN IF NOT EXISTS payment_fee_percent numeric(5,2),
  ADD COLUMN IF NOT EXISTS payment_installments integer;

-- Constraint card_type só se preenchido (espelha appointments)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_payment_card_type_check'
  ) THEN
    ALTER TABLE public.sales
      ADD CONSTRAINT sales_payment_card_type_check
      CHECK (payment_card_type IS NULL OR payment_card_type IN ('credit', 'debit'));
  END IF;
END $$;

COMMENT ON COLUMN public.sales.payment_device_id IS
  'FK merchant_devices — só quando payment_method=card. ON DELETE SET NULL pra não perder a venda se a maquininha for deletada.';
COMMENT ON COLUMN public.sales.payment_fee_percent IS
  'Snapshot da taxa % aplicada no momento da venda. Usado no fluxo de caixa pra calcular o líquido da venda direta de produto.';

-- =================================================================
-- VALIDAÇÃO
-- =================================================================
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name='sales'
--   AND column_name IN ('payment_device_id','payment_card_brand','payment_card_type','payment_fee_percent','payment_installments');
-- ESPERADO: 5 linhas
-- =================================================================
