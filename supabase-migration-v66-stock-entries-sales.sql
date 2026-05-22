-- ============================================================
-- v66 · Entrada de Estoque + Venda Avulsa de Produto + Fornecedor
-- ============================================================
-- Cravado 22/05 manhã após drilldown CIC Blocos 4-5 do Salão99
-- (READ-ONLY). Integração Produtos × Caixa × Despesas.
--
-- Universal · serve Palace e Studio Mood.
--
-- NOVAS TABELAS:
-- · product_suppliers (paridade Salão99 · associa fornecedor a produto)
-- · stock_entries (compra/recebimento · gera despesa automática)
-- · stock_entry_items (linhas da entrada)
-- · sales (venda unificada · type discriminador)
-- · sale_items (linhas da venda · dá baixa automática no estoque)
--
-- TRIGGERS:
-- · stock_entry_item INSERT → cria stock_movement type=entry
-- · sale_item INSERT → cria stock_movement type=exit
-- · O trigger v63 (apply_stock_movement) já atualiza products.quantity
--
-- DESPESA AUTOMÁTICA: a API faz INSERT em stock_entries + items E em
-- expenses (categoria 'products') na mesma transação. Cravado no
-- backend pra ter um único ponto de coordenação.
-- ============================================================

-- ============================================================
-- 1. FORNECEDORES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  contact text, -- telefone, email ou nome do contato (campo livre)
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, name)
);

CREATE INDEX IF NOT EXISTS idx_product_suppliers_business
  ON public.product_suppliers (business_id) WHERE active = true;

-- Associa fornecedor ao produto (Salão99 já tem o campo no cadastro · agora persistido)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.product_suppliers(id) ON DELETE SET NULL;

-- ============================================================
-- 2. ENTRADA DE ESTOQUE (compra/recebimento)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stock_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  supplier_id uuid REFERENCES public.product_suppliers(id) ON DELETE SET NULL,
  -- NF da compra · número visível na nota
  invoice_number text,
  -- chave da NF eletrônica (44 dígitos) · opcional
  invoice_key text,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  total_cost decimal(10, 2) NOT NULL DEFAULT 0,
  notes text,
  -- vínculo com a despesa criada automaticamente (rastreio reverso)
  expense_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_entries_business
  ON public.stock_entries (business_id, entry_date DESC);

CREATE TABLE IF NOT EXISTS public.stock_entry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid REFERENCES public.stock_entries(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity decimal(10, 3) NOT NULL CHECK (quantity > 0),
  unit_cost decimal(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_entry_items_entry
  ON public.stock_entry_items (entry_id);

-- Trigger: ao inserir item de entrada, cria movimentação positiva
-- (o trigger v63 apply_stock_movement já atualiza products.quantity)
CREATE OR REPLACE FUNCTION public.entry_item_to_movement()
RETURNS TRIGGER AS $$
DECLARE
  v_business_id uuid;
BEGIN
  SELECT business_id INTO v_business_id FROM public.stock_entries WHERE id = NEW.entry_id;
  INSERT INTO public.stock_movements (business_id, product_id, type, quantity, reason, created_by)
  VALUES (v_business_id, NEW.product_id, 'entry', NEW.quantity, 'Entrada de estoque · NF',
    (SELECT created_by FROM public.stock_entries WHERE id = NEW.entry_id));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_entry_item_to_movement ON public.stock_entry_items;
CREATE TRIGGER trg_entry_item_to_movement
  AFTER INSERT ON public.stock_entry_items
  FOR EACH ROW EXECUTE FUNCTION public.entry_item_to_movement();

-- ============================================================
-- 3. VENDAS (unificadas · type discriminador)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  -- Tipos espelhando Salão99: atendimento, venda de produto, pacote, crédito avulso
  type text NOT NULL DEFAULT 'product_sale' CHECK (type IN ('service_appointment', 'product_sale', 'package_sale', 'credit_topup')),
  -- Cliente obrigatório (Salão99 também exige)
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_phone text,
  -- Profissional que recebe a comissão (default = usuário logado · pode ser editado)
  professional_id uuid REFERENCES public.professionals(id) ON DELETE SET NULL,
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  total decimal(10, 2) NOT NULL DEFAULT 0,
  discount decimal(10, 2) NOT NULL DEFAULT 0,
  -- Pagamento desacoplado da venda (Salão99 pattern) · pending até FATURAR
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at timestamptz,
  payment_method text CHECK (payment_method IS NULL OR payment_method IN ('cash', 'pix', 'card', 'courtesy', 'points')),
  notes text,
  -- vínculo opcional com appointment (quando a venda vem do fechamento de atendimento)
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_business_date
  ON public.sales (business_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_professional
  ON public.sales (professional_id, sale_date DESC) WHERE professional_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL, -- snapshot do nome no momento da venda
  quantity decimal(10, 3) NOT NULL CHECK (quantity > 0),
  unit_price decimal(10, 2) NOT NULL DEFAULT 0,
  discount decimal(10, 2) NOT NULL DEFAULT 0,
  -- Comissão snapshot no momento da venda (resistente a alteração do cadastro)
  commission_type text CHECK (commission_type IS NULL OR commission_type IN ('percent', 'fixed')),
  commission_value decimal(10, 2),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items (sale_id);

-- Trigger: ao inserir item de venda, cria movimentação negativa
-- (baixa automática · respeita o flag track_stock do produto)
CREATE OR REPLACE FUNCTION public.sale_item_to_movement()
RETURNS TRIGGER AS $$
DECLARE
  v_business_id uuid;
  v_track_stock boolean;
BEGIN
  SELECT business_id INTO v_business_id FROM public.sales WHERE id = NEW.sale_id;
  -- Só baixa se o produto controla estoque · senão é só venda contábil
  SELECT track_stock INTO v_track_stock FROM public.products WHERE id = NEW.product_id;
  IF v_track_stock IS NOT TRUE THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.stock_movements (business_id, product_id, type, quantity, reason, created_by)
  VALUES (v_business_id, NEW.product_id, 'exit', -NEW.quantity, 'Venda de produto',
    (SELECT created_by FROM public.sales WHERE id = NEW.sale_id));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sale_item_to_movement ON public.sale_items;
CREATE TRIGGER trg_sale_item_to_movement
  AFTER INSERT ON public.sale_items
  FOR EACH ROW EXECUTE FUNCTION public.sale_item_to_movement();

-- ============================================================
-- 4. RLS
-- ============================================================
ALTER TABLE public.product_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_entry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dono gerencia suppliers" ON public.product_suppliers;
CREATE POLICY "dono gerencia suppliers" ON public.product_suppliers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "recep ve suppliers" ON public.product_suppliers;
CREATE POLICY "recep ve suppliers" ON public.product_suppliers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.professionals WHERE business_id = product_suppliers.business_id AND auth_user_id = auth.uid() AND is_receptionist = true)
  );

DROP POLICY IF EXISTS "dono gerencia stock_entries" ON public.stock_entries;
CREATE POLICY "dono gerencia stock_entries" ON public.stock_entries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "dono gerencia stock_entry_items" ON public.stock_entry_items;
CREATE POLICY "dono gerencia stock_entry_items" ON public.stock_entry_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.stock_entries e JOIN public.businesses b ON b.id = e.business_id
            WHERE e.id = entry_id AND b.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "dono gerencia sales" ON public.sales;
CREATE POLICY "dono gerencia sales" ON public.sales
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "recep gerencia sales" ON public.sales;
CREATE POLICY "recep gerencia sales" ON public.sales
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.professionals WHERE business_id = sales.business_id AND auth_user_id = auth.uid() AND is_receptionist = true)
  );

DROP POLICY IF EXISTS "dono gerencia sale_items" ON public.sale_items;
CREATE POLICY "dono gerencia sale_items" ON public.sale_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.sales s JOIN public.businesses b ON b.id = s.business_id
            WHERE s.id = sale_id AND b.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "recep gerencia sale_items" ON public.sale_items;
CREATE POLICY "recep gerencia sale_items" ON public.sale_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.sales s JOIN public.professionals p ON p.business_id = s.business_id
            WHERE s.id = sale_id AND p.auth_user_id = auth.uid() AND p.is_receptionist = true)
  );
