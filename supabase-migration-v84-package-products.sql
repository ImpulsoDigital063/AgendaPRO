-- =================================================================
-- v84 · Pacote/combo aceita PRODUTO (não só serviço)
--
-- Caso Studio Mood: combo "serviço + produto" (ex: trança + jumbo), executado
-- numa sessão. O produto é ENTREGUE na compra do pacote (Opção A):
--   - serviço  → vira saldo de sessão (customer_package_balances · igual antes)
--   - produto  → baixa estoque na venda (stock_movement exit), SEM virar venda
--                separada (a receita é o preço do pacote · não duplica)
--
-- package_items passa a aceitar service_id OU product_id (exatamente um).
-- =================================================================

-- service_id deixa de ser obrigatório (item pode ser produto)
ALTER TABLE public.package_items ALTER COLUMN service_id DROP NOT NULL;

-- coluna do produto
ALTER TABLE public.package_items
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE RESTRICT;

-- exatamente um dos dois (serviço XOR produto)
ALTER TABLE public.package_items DROP CONSTRAINT IF EXISTS package_items_service_xor_product;
ALTER TABLE public.package_items
  ADD CONSTRAINT package_items_service_xor_product CHECK (
    (service_id IS NOT NULL AND product_id IS NULL)
    OR (service_id IS NULL AND product_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_package_items_product ON public.package_items(product_id);

DO $$ BEGIN RAISE NOTICE 'v84 ok · package_items aceita produto (XOR serviço)'; END $$;
