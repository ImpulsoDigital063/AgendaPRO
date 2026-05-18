-- =================================================================
-- V49 — TAXAS DE MAQUININHA (merchant fees)
-- =================================================================
--
-- Cravado durante venda Palace Nail Spa 17/05/2026 (Marko pediu
-- taxas de cartão pra fechamento de caixa correto). Universal — qualquer
-- business pode cadastrar maquininhas/bandeiras/taxas.
--
-- Modelagem:
--   - `merchant_devices`: maquininhas do business (InfinitePay, Stone, etc)
--   - `merchant_device_fees`: % por device × bandeira × tipo (crédito/débito)
--   - `appointments` ganha 4 colunas: device_id, brand, card_type, fee_percent
--     (snapshot da taxa aplicada · histórico não muda se taxa mudar depois)
--
-- Bandeiras suportadas (text livre, validado por enum suave no app):
--   visa · mastercard · elo · amex · hipercard · outros
--
-- IDEMPOTENTE.
-- =================================================================


-- ┌──────────────────────────────────────────────────────────────────┐
-- │ 1. TABELA merchant_devices (maquininhas)                          │
-- └──────────────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS public.merchant_devices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merchant_devices_business
  ON public.merchant_devices(business_id, active);

COMMENT ON TABLE public.merchant_devices IS
  'Maquininhas de cartão cadastradas pelo business (ex: InfinitePay, Stone, Cielo). Cada device pode ter várias bandeiras com taxas diferentes em merchant_device_fees.';


-- ┌──────────────────────────────────────────────────────────────────┐
-- │ 2. TABELA merchant_device_fees (taxa por device + brand + tipo)  │
-- └──────────────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS public.merchant_device_fees (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id uuid NOT NULL REFERENCES public.merchant_devices(id) ON DELETE CASCADE,
  brand text NOT NULL,
  card_type text NOT NULL CHECK (card_type IN ('credit', 'debit')),
  rate_percent numeric(5,2) NOT NULL CHECK (rate_percent >= 0 AND rate_percent < 100),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(device_id, brand, card_type)
);

CREATE INDEX IF NOT EXISTS idx_merchant_device_fees_device
  ON public.merchant_device_fees(device_id, active);

COMMENT ON TABLE public.merchant_device_fees IS
  'Taxa % por combinação maquininha × bandeira × tipo (crédito/débito). UNIQUE(device, brand, card_type) garante 1 taxa única por combinação.';


-- ┌──────────────────────────────────────────────────────────────────┐
-- │ 3. APPOINTMENTS — colunas de snapshot do pagamento em cartão     │
-- └──────────────────────────────────────────────────────────────────┘
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS payment_device_id uuid REFERENCES public.merchant_devices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_card_brand text,
  ADD COLUMN IF NOT EXISTS payment_card_type text,
  ADD COLUMN IF NOT EXISTS payment_fee_percent numeric(5,2);

-- Constraint card_type só se preenchido
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_payment_card_type_check'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_payment_card_type_check
      CHECK (payment_card_type IS NULL OR payment_card_type IN ('credit', 'debit'));
  END IF;
END $$;

COMMENT ON COLUMN public.appointments.payment_device_id IS
  'FK pra merchant_devices — só preenchido quando payment_method = card. Histórico: ON DELETE SET NULL pra não perder o appointment se a maquininha for deletada.';
COMMENT ON COLUMN public.appointments.payment_card_brand IS
  'Snapshot da bandeira (visa/master/etc) no momento do pagamento. Snapshot porque o nome da bandeira é exibido em relatórios e pode evoluir.';
COMMENT ON COLUMN public.appointments.payment_card_type IS
  'credit ou debit. Snapshot pq tipo influencia cálculo de taxa.';
COMMENT ON COLUMN public.appointments.payment_fee_percent IS
  'Snapshot da taxa % aplicada (de merchant_device_fees no momento). Snapshot porque rate_percent pode mudar depois e o histórico do appointment não pode mudar — relatório de financeiro depende de saber a taxa REAL aplicada na hora.';


-- ┌──────────────────────────────────────────────────────────────────┐
-- │ 4. RLS — merchant_devices                                         │
-- └──────────────────────────────────────────────────────────────────┘
ALTER TABLE public.merchant_devices ENABLE ROW LEVEL SECURITY;

-- Dono gerencia
DROP POLICY IF EXISTS "dono gerencia devices" ON public.merchant_devices;
CREATE POLICY "dono gerencia devices" ON public.merchant_devices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = merchant_devices.business_id
        AND owner_id = auth.uid()
    )
  );

-- Recepcionista vê (pra escolher na hora do pagamento)
DROP POLICY IF EXISTS "recepcao ve devices" ON public.merchant_devices;
CREATE POLICY "recepcao ve devices" ON public.merchant_devices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.professionals
      WHERE business_id = merchant_devices.business_id
        AND auth_user_id = auth.uid()
        AND is_receptionist = true
    )
  );

-- Profissional comum vê (pra escolher na hora do pagamento dos próprios atendimentos)
DROP POLICY IF EXISTS "profissional ve devices do negocio" ON public.merchant_devices;
CREATE POLICY "profissional ve devices do negocio" ON public.merchant_devices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.professionals
      WHERE business_id = merchant_devices.business_id
        AND auth_user_id = auth.uid()
    )
  );


-- ┌──────────────────────────────────────────────────────────────────┐
-- │ 5. RLS — merchant_device_fees                                     │
-- └──────────────────────────────────────────────────────────────────┘
ALTER TABLE public.merchant_device_fees ENABLE ROW LEVEL SECURITY;

-- Dono gerencia (via FK no device)
DROP POLICY IF EXISTS "dono gerencia fees" ON public.merchant_device_fees;
CREATE POLICY "dono gerencia fees" ON public.merchant_device_fees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.merchant_devices d
      JOIN public.businesses b ON b.id = d.business_id
      WHERE d.id = merchant_device_fees.device_id
        AND b.owner_id = auth.uid()
    )
  );

-- Recep vê (pra calcular taxa no fluxo de pagamento)
DROP POLICY IF EXISTS "recepcao ve fees" ON public.merchant_device_fees;
CREATE POLICY "recepcao ve fees" ON public.merchant_device_fees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.merchant_devices d
      JOIN public.professionals p ON p.business_id = d.business_id
      WHERE d.id = merchant_device_fees.device_id
        AND p.auth_user_id = auth.uid()
        AND p.is_receptionist = true
    )
  );

-- Profissional vê (pra calcular taxa nos próprios atendimentos)
DROP POLICY IF EXISTS "profissional ve fees" ON public.merchant_device_fees;
CREATE POLICY "profissional ve fees" ON public.merchant_device_fees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.merchant_devices d
      JOIN public.professionals p ON p.business_id = d.business_id
      WHERE d.id = merchant_device_fees.device_id
        AND p.auth_user_id = auth.uid()
    )
  );


-- =================================================================
-- VALIDAÇÃO PÓS-MIGRATION
-- =================================================================
-- 1. Confirma tabelas:
--    SELECT table_name FROM information_schema.tables
--    WHERE table_name IN ('merchant_devices', 'merchant_device_fees');
--    ESPERADO: 2 linhas
--
-- 2. Confirma colunas em appointments:
--    SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'appointments'
--      AND column_name IN ('payment_device_id','payment_card_brand','payment_card_type','payment_fee_percent');
--    ESPERADO: 4 linhas
--
-- 3. Teste de UNIQUE em fees:
--    INSERT em duas linhas iguais (device, brand, card_type) deve falhar.
-- =================================================================
