-- ============================================================
-- v69 · sales.invoice_id (FK pra comanda)
-- ============================================================
-- Micro-migration. NÃO recria nada.
--
-- Permite que UMA venda de produto (sales/sale_items) seja vinculada
-- à comanda (invoices) gerada quando o cliente paga atendimento + produtos
-- juntos. Sem essa FK, era impossível trazer venda de produto avulso
-- pra dentro do fechamento de uma comanda.
--
-- Por que rodar: a Comanda V1 (item_type='product') guarda reference_id
-- apontando pra sales.id. Pra ter rastreio bilateral (sale.invoice_id =
-- invoice.id), precisamos da FK no lado da sale também.
--
-- Idempotente: ADD COLUMN IF NOT EXISTS.
-- ============================================================

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_invoice
  ON public.sales (invoice_id) WHERE invoice_id IS NOT NULL;
