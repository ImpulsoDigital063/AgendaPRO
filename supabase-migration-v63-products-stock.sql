-- ============================================================
-- v63 · Controle de estoque (produtos + movimentações)
-- ============================================================
-- Cravado 22/05/2026 a pedido da Izanara (Studio Mood) · gap competitivo
-- com Salão99 e munição pra reunião 23/05 13h. Universal pro AgendaPRO.
--
-- MVP V1: produtos cadastrados + ajuste de quantidade + alerta de mínimo.
-- Sem vínculo com appointments ainda (compra avulsa fica fora).
-- Sem categorização (depois).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  -- unidade de medida (un, ml, g, kg, l etc) · default 'un'
  unit text NOT NULL DEFAULT 'un',
  -- preço de venda (opcional · alguns são pra uso interno)
  price decimal(10, 2),
  -- custo de aquisição (entra pro custo total)
  cost decimal(10, 2),
  -- quantidade atual em estoque (numérica pra suportar 0.5kg, 250ml etc)
  quantity decimal(10, 3) NOT NULL DEFAULT 0,
  -- alerta de mínimo · quando quantity < min_quantity, UI destaca
  min_quantity decimal(10, 3) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_business
  ON public.products (business_id) WHERE active = true;

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  -- type: entry (entrada/reposição) · exit (saída/uso) · adjust (ajuste manual)
  type text NOT NULL CHECK (type IN ('entry', 'exit', 'adjust')),
  -- quantity é o DELTA: positivo pra entry, negativo pra exit, qualquer pra adjust
  quantity decimal(10, 3) NOT NULL,
  reason text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product
  ON public.stock_movements (product_id, created_at DESC);

-- ============================================================
-- TRIGGER: atualiza products.quantity automaticamente
-- ao inserir stock_movement
-- ============================================================
CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products
  SET quantity = quantity + NEW.quantity,
      updated_at = now()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_apply_stock_movement ON public.stock_movements;
CREATE TRIGGER trg_apply_stock_movement
  AFTER INSERT ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.apply_stock_movement();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Owner gerencia produtos do próprio business
DROP POLICY IF EXISTS "dono gerencia produtos" ON public.products;
CREATE POLICY "dono gerencia produtos" ON public.products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
  );

-- Recepcionista vê + atualiza produtos (usa pra dar baixa em saída)
DROP POLICY IF EXISTS "recepcao ve produtos" ON public.products;
CREATE POLICY "recepcao ve produtos" ON public.products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.professionals
      WHERE business_id = products.business_id
        AND auth_user_id = auth.uid()
        AND is_receptionist = true
    )
  );

-- Owner e recep podem registrar movimentações
DROP POLICY IF EXISTS "dono gerencia movimentos" ON public.stock_movements;
CREATE POLICY "dono gerencia movimentos" ON public.stock_movements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "recepcao ve movimentos" ON public.stock_movements;
CREATE POLICY "recepcao ve movimentos" ON public.stock_movements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.professionals
      WHERE business_id = stock_movements.business_id
        AND auth_user_id = auth.uid()
        AND is_receptionist = true
    )
  );

DROP POLICY IF EXISTS "recepcao cria movimentos" ON public.stock_movements;
CREATE POLICY "recepcao cria movimentos" ON public.stock_movements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.professionals
      WHERE business_id = stock_movements.business_id
        AND auth_user_id = auth.uid()
        AND is_receptionist = true
    )
  );
