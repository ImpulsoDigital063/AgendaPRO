-- ============================================================
-- v64 · Produtos · paridade Salão99 + variante de cor
-- ============================================================
-- Cravado 22/05/2026 madrugada após drilldown CIC do catálogo Kyte do
-- Studio Mood (https://moodstore.kyte.site/pt-BR). Adiciona:
--
-- · Marca (product_brands) · 6 marcas reais no catálogo: Cherey, BeYou,
--   Brazilian Idol, Fashion Line, Morden Girl, Ser Mulher
-- · Categoria (product_categories) · Studio Mood não tem mas Salão99
--   exige · útil pra agrupar Jumbo/Crochet/Acessório/Cremes
-- · Variante (text livre · ex "#T1B/27", "Preto") · catálogo Kyte tem
--   o mesmo produto em N cores (JUMBO EVOLUTION × 6 cores)
-- · 8 colunas extras pra paridade Salão99 (expires_at, pack_quantity,
--   barcode, sku, track_stock, sale_active, commission_type,
--   commission_value)
--
-- Fornecedor (product_suppliers) cortado desta entrega · move pra
-- backlog · não há sinal forte no catálogo de Studio Mood.
-- ============================================================

-- ============================================================
-- TABELAS NOVAS · Marca + Categoria
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, name)
);

CREATE INDEX IF NOT EXISTS idx_product_brands_business
  ON public.product_brands (business_id) WHERE active = true;

CREATE TABLE IF NOT EXISTS public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, name)
);

CREATE INDEX IF NOT EXISTS idx_product_categories_business
  ON public.product_categories (business_id) WHERE active = true;

-- ============================================================
-- COLUNAS EXTRAS em products
-- ============================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.product_brands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.product_categories(id) ON DELETE SET NULL,
  -- variante de cor/tom · texto livre porque varia muito (#T1B/27, "Preto", "Marsala")
  ADD COLUMN IF NOT EXISTS variant text,
  -- validade do produto (ex shampoo, cosmético com prazo)
  ADD COLUMN IF NOT EXISTS expires_at date,
  -- quantidade por embalagem (ex 300 pra 300ml em 1 frasco)
  ADD COLUMN IF NOT EXISTS pack_quantity decimal(10, 3),
  ADD COLUMN IF NOT EXISTS barcode text,
  -- referência interna do dono (ex 123ABC)
  ADD COLUMN IF NOT EXISTS sku text,
  -- toggle: pode ter produto sem controlar estoque (ex serviço empacotado)
  ADD COLUMN IF NOT EXISTS track_stock boolean NOT NULL DEFAULT true,
  -- toggle: produto pode ser só uso interno (não vende, só consome)
  ADD COLUMN IF NOT EXISTS sale_active boolean NOT NULL DEFAULT true,
  -- comissão de venda · 'percent' (0-100) ou 'fixed' (R$)
  ADD COLUMN IF NOT EXISTS commission_type text CHECK (commission_type IS NULL OR commission_type IN ('percent', 'fixed')),
  ADD COLUMN IF NOT EXISTS commission_value decimal(10, 2);

CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products (brand_id) WHERE active = true AND brand_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category_id) WHERE active = true AND category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products (business_id, sku) WHERE sku IS NOT NULL;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.product_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dono gerencia brands" ON public.product_brands;
CREATE POLICY "dono gerencia brands" ON public.product_brands
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "recepcao ve brands" ON public.product_brands;
CREATE POLICY "recepcao ve brands" ON public.product_brands
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.professionals
      WHERE business_id = product_brands.business_id
        AND auth_user_id = auth.uid()
        AND is_receptionist = true
    )
  );

DROP POLICY IF EXISTS "dono gerencia categories" ON public.product_categories;
CREATE POLICY "dono gerencia categories" ON public.product_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "recepcao ve categories" ON public.product_categories;
CREATE POLICY "recepcao ve categories" ON public.product_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.professionals
      WHERE business_id = product_categories.business_id
        AND auth_user_id = auth.uid()
        AND is_receptionist = true
    )
  );
