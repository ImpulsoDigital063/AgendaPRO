-- ============================================================
-- v74 · Desconto manual geral na comanda
-- ============================================================
-- Adiciona invoices.manual_discount (numeric default 0).
-- Separa do invoice.discount (que é soma dos descontos por item).
--
-- Operador aplica no rodapé: "cliente fechou tudo, dou R$20 de quebra"
-- sem precisar dividir manualmente entre itens.
--
-- Total final = sum(items.total) − manual_discount
-- ============================================================

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS manual_discount numeric(10,2) NOT NULL DEFAULT 0;

-- Sanity check
DO $$
DECLARE
  v_total int;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.invoices;
  RAISE NOTICE 'v74 ok · manual_discount adicionada em % invoices', v_total;
END $$;
