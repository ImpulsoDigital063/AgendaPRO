-- ============================================================
-- v76 · Pacotes (combo de N sessões com desconto)
-- ============================================================
-- Modelo cravado a partir de drilldown CIC do Salão99 + visão multi-segmento:
--
-- packages                · catálogo (dono cadastra) · combos de SERVIÇOS
-- package_items           · composição (serviço + quantidade + preço override)
-- customer_packages       · compras (cliente X comprou pacote Y)
-- customer_package_sessions · tracking de uso (cada vez que consumiu sessão)
--
-- Validade: dropdown 5 opções iguais Salão99 (none / days / weeks / months / years).
-- Receita: registrada na COMPRA (invoice_item type='package' já existe desde v54).
-- Sessões: cada uso vira appointment com price=0 + ref pro customer_package.
-- ============================================================

-- 1. CATÁLOGO · pacote cadastrado pelo dono
CREATE TABLE IF NOT EXISTS public.packages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  validity_kind text NOT NULL DEFAULT 'none' CHECK (validity_kind IN ('none', 'days', 'weeks', 'months', 'years')),
  validity_value int CHECK (validity_value IS NULL OR validity_value > 0),
  active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_packages_business_active
  ON public.packages(business_id, active);

-- 2. COMPOSIÇÃO · serviços que compõem o pacote
CREATE TABLE IF NOT EXISTS public.package_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(10,2) CHECK (unit_price IS NULL OR unit_price >= 0),
  -- unit_price NULL = usa o preço padrão do serviço no momento da venda
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_package_items_package ON public.package_items(package_id);
CREATE INDEX IF NOT EXISTS idx_package_items_service ON public.package_items(service_id);

-- 3. COMPRAS · cliente comprou pacote
CREATE TABLE IF NOT EXISTS public.customer_packages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.packages(id) ON DELETE SET NULL,
  -- package_id pode virar NULL se admin deletou o pacote do catálogo
  -- snapshot do nome + preço pago (não perde histórico se catálogo mudar)
  package_name text NOT NULL,
  price_paid numeric(10,2) NOT NULL,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'used_up', 'cancelled')),
  invoice_item_id uuid REFERENCES public.invoice_items(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_packages_business ON public.customer_packages(business_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_packages_customer ON public.customer_packages(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_packages_invoice_item ON public.customer_packages(invoice_item_id);

-- 4. SALDOS · quantas sessões de cada serviço o cliente AINDA tem
-- Snapshot no momento da compra · diminui conforme consome
CREATE TABLE IF NOT EXISTS public.customer_package_balances (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_package_id uuid NOT NULL REFERENCES public.customer_packages(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  service_name text NOT NULL, -- snapshot
  sessions_total int NOT NULL CHECK (sessions_total > 0),
  sessions_used int NOT NULL DEFAULT 0 CHECK (sessions_used >= 0),
  unit_price_snapshot numeric(10,2) NOT NULL, -- pra cálculo de desconto na exibição
  CHECK (sessions_used <= sessions_total)
);

CREATE INDEX IF NOT EXISTS idx_package_balances_customer_pkg ON public.customer_package_balances(customer_package_id);
CREATE INDEX IF NOT EXISTS idx_package_balances_service ON public.customer_package_balances(service_id);

-- 5. TRACKING · cada uso de sessão (qual atendimento consumiu)
CREATE TABLE IF NOT EXISTS public.customer_package_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_package_id uuid NOT NULL REFERENCES public.customer_packages(id) ON DELETE CASCADE,
  balance_id uuid NOT NULL REFERENCES public.customer_package_balances(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  professional_id uuid REFERENCES public.professionals(id) ON DELETE SET NULL,
  consumed_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

CREATE INDEX IF NOT EXISTS idx_package_sessions_customer_pkg ON public.customer_package_sessions(customer_package_id);
CREATE INDEX IF NOT EXISTS idx_package_sessions_appointment ON public.customer_package_sessions(appointment_id);

-- 6. RLS
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_package_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_package_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "packages_business_access" ON public.packages;
DROP POLICY IF EXISTS "package_items_business_access" ON public.package_items;
DROP POLICY IF EXISTS "customer_packages_business_access" ON public.customer_packages;
DROP POLICY IF EXISTS "package_balances_business_access" ON public.customer_package_balances;
DROP POLICY IF EXISTS "package_sessions_business_access" ON public.customer_package_sessions;

CREATE POLICY "packages_business_access" ON public.packages
  FOR ALL USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    OR business_id IN (
      SELECT business_id FROM public.professionals
      WHERE auth_user_id = auth.uid() AND active = true AND is_receptionist = true
    )
  );

CREATE POLICY "package_items_business_access" ON public.package_items
  FOR ALL USING (
    package_id IN (
      SELECT id FROM public.packages
      WHERE business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
         OR business_id IN (
           SELECT business_id FROM public.professionals
           WHERE auth_user_id = auth.uid() AND active = true AND is_receptionist = true
         )
    )
  );

CREATE POLICY "customer_packages_business_access" ON public.customer_packages
  FOR ALL USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    OR business_id IN (
      SELECT business_id FROM public.professionals
      WHERE auth_user_id = auth.uid() AND active = true AND is_receptionist = true
    )
  );

CREATE POLICY "package_balances_business_access" ON public.customer_package_balances
  FOR ALL USING (
    customer_package_id IN (
      SELECT id FROM public.customer_packages
      WHERE business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
         OR business_id IN (
           SELECT business_id FROM public.professionals
           WHERE auth_user_id = auth.uid() AND active = true AND is_receptionist = true
         )
    )
  );

CREATE POLICY "package_sessions_business_access" ON public.customer_package_sessions
  FOR ALL USING (
    customer_package_id IN (
      SELECT id FROM public.customer_packages
      WHERE business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
         OR business_id IN (
           SELECT business_id FROM public.professionals
           WHERE auth_user_id = auth.uid() AND active = true AND is_receptionist = true
         )
    )
  );

DO $$
BEGIN
  RAISE NOTICE 'v76 ok · pacotes (packages + items + customer_packages + balances + sessions)';
END $$;
