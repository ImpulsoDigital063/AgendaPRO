-- ============================================================
-- v54 · Comandas/Faturas (módulo Vendas · modelo HÍBRIDO)
-- ============================================================
-- Modelo híbrido cravado: appointment.paid_at continua direto pra venda 1-pra-1.
-- Comanda (invoice) só aparece quando agrupa múltiplos itens (Atendimento + Produto + Pacote)
-- ou quando admin decide "fechar comanda" manualmente.
--
-- 3 tabelas novas: invoices · invoice_items · invoice_payments
-- 1 campo novo: appointments.invoice_item_id (FK opcional)
-- 1 função: next_invoice_number(business_id) -- sequencial por business
-- RLS: owner do business + recepcionista ativa
-- ============================================================

-- 1. Tabela invoices (comanda/fatura)
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  invoice_number int NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  discount numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  cancelled_at timestamptz,
  UNIQUE (business_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_business_status ON public.invoices(business_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.invoices(customer_id);

-- 2. Função: próximo invoice_number por business (sequencial global)
CREATE OR REPLACE FUNCTION public.next_invoice_number(p_business_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  next_num int;
BEGIN
  SELECT COALESCE(MAX(invoice_number), 0) + 1 INTO next_num
  FROM public.invoices
  WHERE business_id = p_business_id;
  RETURN next_num;
END;
$$;

-- 3. Tabela invoice_items (itens da comanda)
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('appointment', 'product', 'package', 'credit')),
  reference_id uuid,
  description text NOT NULL,
  professional_id uuid REFERENCES public.professionals(id) ON DELETE SET NULL,
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  discount numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL,
  commission_amount numeric(10,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_reference ON public.invoice_items(reference_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_professional ON public.invoice_items(professional_id);

-- 4. Tabela invoice_payments (múltiplos pagamentos por comanda)
CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  payment_method text NOT NULL,
  amount numeric(10,2) NOT NULL,
  device_id uuid REFERENCES public.merchant_devices(id) ON DELETE SET NULL,
  card_brand text,
  card_type text,
  installments int DEFAULT 1,
  fee_percent numeric(5,2) DEFAULT 0,
  paid_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON public.invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_paid_at ON public.invoice_payments(paid_at);

-- 5. appointments ganha invoice_item_id (FK opcional · liga ao item da comanda)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS invoice_item_id uuid REFERENCES public.invoice_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_invoice_item ON public.appointments(invoice_item_id);

-- 6. RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

-- Drop policies antigas (caso reexecução)
DROP POLICY IF EXISTS "invoices_business_access" ON public.invoices;
DROP POLICY IF EXISTS "invoice_items_business_access" ON public.invoice_items;
DROP POLICY IF EXISTS "invoice_payments_business_access" ON public.invoice_payments;

-- Owner ou recep ativa do business pode tudo
CREATE POLICY "invoices_business_access" ON public.invoices
  FOR ALL USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    OR business_id IN (
      SELECT business_id FROM public.professionals
      WHERE auth_user_id = auth.uid() AND active = true AND is_receptionist = true
    )
  );

CREATE POLICY "invoice_items_business_access" ON public.invoice_items
  FOR ALL USING (
    invoice_id IN (
      SELECT id FROM public.invoices
      WHERE business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
         OR business_id IN (
           SELECT business_id FROM public.professionals
           WHERE auth_user_id = auth.uid() AND active = true AND is_receptionist = true
         )
    )
  );

CREATE POLICY "invoice_payments_business_access" ON public.invoice_payments
  FOR ALL USING (
    invoice_id IN (
      SELECT id FROM public.invoices
      WHERE business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
         OR business_id IN (
           SELECT business_id FROM public.professionals
           WHERE auth_user_id = auth.uid() AND active = true AND is_receptionist = true
         )
    )
  );
