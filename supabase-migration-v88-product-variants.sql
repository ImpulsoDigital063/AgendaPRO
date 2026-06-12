-- =================================================================
-- V88 — VARIANTES DE PRODUTO (agrupamento · Caminho A)
-- =================================================================
--
-- Eduardo 11/06/2026 (pedido da Izanara · vale pra todo o sistema): o mesmo
-- produto pode ter variantes (cor, tamanho, sabor…), cada uma com ESTOQUE e
-- PREÇO próprios.
--
-- Caminho A (escolhido): cada variante continua sendo uma LINHA em products
-- (já tem estoque/preço/sku por linha · o motor de venda/estoque/comissão
-- referencia product_id e não muda). As variantes do mesmo produto-base
-- compartilham um variant_group_id e o MESMO name; o campo `variant` guarda o
-- rótulo da variante ("Vermelho", "P", "Morango"). Produto sem variante fica
-- com variant_group_id NULL (comportamento atual intacto).
--
-- Não mexe em sale_items, stock_movements, triggers nem nas telas financeiras —
-- só adiciona o agrupamento. Risco baixo.
--
-- IDEMPOTENTE.
-- =================================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS variant_group_id uuid;

-- Índice pra agrupar variantes do mesmo produto rápido (lista, picker).
CREATE INDEX IF NOT EXISTS idx_products_variant_group
  ON public.products(business_id, variant_group_id)
  WHERE variant_group_id IS NOT NULL;

COMMENT ON COLUMN public.products.variant_group_id IS
  'Agrupa variantes do MESMO produto-base (cor/tamanho/sabor). Variantes do mesmo grupo compartilham name; o campo variant guarda o rótulo. NULL = produto sem variantes (avulso). Caminho A da v88 — cada variante é uma linha products, com estoque/preço próprios.';

-- =================================================================
-- VALIDAÇÃO
-- =================================================================
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name='products' AND column_name='variant_group_id';
-- ESPERADO: 1 linha
-- =================================================================
