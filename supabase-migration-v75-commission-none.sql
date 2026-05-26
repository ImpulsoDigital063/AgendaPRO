-- ============================================================
-- v75 · Comissão "Sem comissão" explícita em produtos
-- ============================================================
-- Estado atual: products.commission_type ∈ ('percent', 'fixed', NULL).
-- NULL caía no fallback (% padrão do prof) — comportamento implícito.
--
-- Eduardo cravou 25/05: maior parte das vendas de produto NÃO é
-- comissionada (Salão99 mesmo faz assim). Adicionando 'none' explícito
-- pra dono marcar "este produto não gera comissão pra ninguém".
--
-- NULL continua = fallback (% do prof) · zero impacto retroativo.
-- ============================================================

-- products.commission_type
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_commission_type_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_commission_type_check
  CHECK (commission_type IS NULL OR commission_type IN ('percent', 'fixed', 'none'));

-- sale_items.commission_type (snapshot histórico das vendas)
-- Importante manter sincronizado pra novas vendas com 'none' não falharem
ALTER TABLE public.sale_items
  DROP CONSTRAINT IF EXISTS sale_items_commission_type_check;
ALTER TABLE public.sale_items
  ADD CONSTRAINT sale_items_commission_type_check
  CHECK (commission_type IS NULL OR commission_type IN ('percent', 'fixed', 'none'));

DO $$
BEGIN
  RAISE NOTICE 'v75 ok · commission_type agora aceita ''none'' em products + sale_items';
END $$;
