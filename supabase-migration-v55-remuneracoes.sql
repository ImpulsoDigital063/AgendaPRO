-- ============================================================
-- v55 · Remunerações (módulo Comissões/Vales/Salários)
-- ============================================================

-- 1. Pagamentos de comissão (criar PRIMEIRO · vouchers referencia)
CREATE TABLE IF NOT EXISTS public.commission_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_amount numeric(10,2) NOT NULL,
  paid_amount numeric(10,2) NOT NULL,
  notes text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commission_payments_prof_period ON public.commission_payments(professional_id, period_start, period_end);

-- 2. Vales (adiantamentos)
CREATE TABLE IF NOT EXISTS public.professional_vouchers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  description text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  used_in_payment_id uuid REFERENCES public.commission_payments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vouchers_prof_date ON public.professional_vouchers(professional_id, date DESC);

-- 3. Salários (entidade separada de comissão)
CREATE TABLE IF NOT EXISTS public.professional_salaries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  description text DEFAULT 'Salário',
  date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salaries_prof_date ON public.professional_salaries(professional_id, date DESC);

-- 4. Liga appointments a commission_payment
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS commission_payment_id uuid REFERENCES public.commission_payments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_commission_payment ON public.appointments(commission_payment_id);

-- 5. Config de comissão por profissional
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS commission_type text NOT NULL DEFAULT 'simple' CHECK (commission_type IN ('simple', 'advanced')),
  ADD COLUMN IF NOT EXISTS default_commission_percent numeric(5,2) NOT NULL DEFAULT 40 CHECK (default_commission_percent >= 0 AND default_commission_percent <= 100),
  ADD COLUMN IF NOT EXISTS payment_fee_rule text NOT NULL DEFAULT 'system' CHECK (payment_fee_rule IN ('system', 'never')),
  ADD COLUMN IF NOT EXISTS discount_rule text NOT NULL DEFAULT 'apply' CHECK (discount_rule IN ('apply', 'never')),
  ADD COLUMN IF NOT EXISTS tip_rule text NOT NULL DEFAULT 'all' CHECK (tip_rule IN ('all', 'own_only'));

-- 6. RLS
ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_salaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commission_payments_business_access" ON public.commission_payments;
DROP POLICY IF EXISTS "vouchers_business_access" ON public.professional_vouchers;
DROP POLICY IF EXISTS "salaries_business_access" ON public.professional_salaries;

CREATE POLICY "commission_payments_business_access" ON public.commission_payments
  FOR ALL USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    OR business_id IN (
      SELECT business_id FROM public.professionals
      WHERE auth_user_id = auth.uid() AND active = true AND is_receptionist = true
    )
  );

CREATE POLICY "vouchers_business_access" ON public.professional_vouchers
  FOR ALL USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    OR business_id IN (
      SELECT business_id FROM public.professionals
      WHERE auth_user_id = auth.uid() AND active = true AND is_receptionist = true
    )
  );

CREATE POLICY "salaries_business_access" ON public.professional_salaries
  FOR ALL USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    OR business_id IN (
      SELECT business_id FROM public.professionals
      WHERE auth_user_id = auth.uid() AND active = true AND is_receptionist = true
    )
  );
