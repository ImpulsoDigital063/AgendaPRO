-- v140 · Cartão presente (bônus do setup do Studio Isis Melo · 27/08/2026)
--
-- Backport do SystemPalace (migration v104 de lá). Vale-presente em dois modos:
--   · 'services' — X sessões de um serviço ("3 manicures de presente")
--   · 'value'    — crédito em R$ que a presenteada gasta como quiser
--
-- Três tabelas: o cartão, os serviços que ele cobre e o tracking de
-- reserva/consumo (espelha o desenho de pacotes).
--
-- RECEITA CONTA NA VENDA, NAO NO RESGATE. O cartão entra na comanda como
-- invoice_item (item_type 'gift_card', liberado no fim deste arquivo) no dia da
-- compra. Quando a presenteada resgata, o atendimento sai com valor abatido e
-- NAO entra de novo no caixa — senão o faturamento do salão dobra no papel.
--
-- As tabelas nascem vazias e nada as lê até as telas subirem. Quem controla se
-- o recurso aparece é businesses.cartao_presente_enabled (v131, default false),
-- ligada só no tenant da Isis.
--
-- Idempotente.

-- 1. VALE emitido
CREATE TABLE IF NOT EXISTS public.gift_cards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  code text NOT NULL,                                    -- ex: PALACE-7K2Q (impresso no cartão)
  mode text NOT NULL CHECK (mode IN ('services','value')),
  buyer_name text,                                       -- comprador (avulso, não precisa ser customer)
  buyer_phone text,
  recipient_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  recipient_name text NOT NULL,                          -- snapshot da presenteada
  price_paid numeric(10,2) NOT NULL CHECK (price_paid >= 0),
  value_total numeric(10,2) CHECK (value_total IS NULL OR value_total >= 0),  -- modo 'value'
  value_used  numeric(10,2) NOT NULL DEFAULT 0 CHECK (value_used >= 0),       -- modo 'value'
  purchased_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','used_up','cancelled')),
  invoice_item_id uuid REFERENCES public.invoice_items(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gift_cards_value_requires_total CHECK (mode <> 'value' OR value_total IS NOT NULL),
  CONSTRAINT gift_cards_value_used_le_total  CHECK (value_total IS NULL OR value_used <= value_total)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_gift_cards_business_code ON public.gift_cards(business_id, code);
CREATE INDEX IF NOT EXISTS idx_gift_cards_business_status ON public.gift_cards(business_id, status);
CREATE INDEX IF NOT EXISTS idx_gift_cards_recipient ON public.gift_cards(recipient_customer_id, status);
CREATE INDEX IF NOT EXISTS idx_gift_cards_invoice_item ON public.gift_cards(invoice_item_id);

-- 2. SERVIÇOS do vale (modo 'services') · saldo por serviço · espelha customer_package_balances
CREATE TABLE IF NOT EXISTS public.gift_card_services (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gift_card_id uuid NOT NULL REFERENCES public.gift_cards(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  service_name text NOT NULL,                            -- snapshot
  sessions_total int NOT NULL CHECK (sessions_total > 0),
  sessions_used  int NOT NULL DEFAULT 0 CHECK (sessions_used >= 0),
  unit_price_snapshot numeric(10,2) NOT NULL,            -- base de comissão da sessão (D-comissão)
  CHECK (sessions_used <= sessions_total)
);
CREATE INDEX IF NOT EXISTS idx_gift_card_services_card ON public.gift_card_services(gift_card_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_services_service ON public.gift_card_services(service_id);

-- 3. TRACKING de reserva/consumo · espelha customer_package_sessions + status (reserva ao agendar)
--    modo 'services': status reserved→consumed, gift_card_service_id preenchido.
--    modo 'value'   : linha de abate no atendimento, amount = R$ abatido.
CREATE TABLE IF NOT EXISTS public.gift_card_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gift_card_id uuid NOT NULL REFERENCES public.gift_cards(id) ON DELETE CASCADE,
  gift_card_service_id uuid REFERENCES public.gift_card_services(id) ON DELETE CASCADE,  -- null no modo value
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  professional_id uuid REFERENCES public.professionals(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','consumed')),
  amount numeric(10,2),                                  -- modo value: quanto abateu
  reserved_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  notes text
);
CREATE INDEX IF NOT EXISTS idx_gift_card_sessions_card ON public.gift_card_sessions(gift_card_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_sessions_appointment ON public.gift_card_sessions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_sessions_status ON public.gift_card_sessions(gift_card_id, status);

-- 4. RLS · mesmo padrão de packages/v76 (owner do business + recep ativa)
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gift_cards_business_access" ON public.gift_cards;
CREATE POLICY "gift_cards_business_access" ON public.gift_cards
  FOR ALL USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    OR business_id IN (
      SELECT business_id FROM public.professionals
      WHERE auth_user_id = auth.uid() AND active = true AND is_receptionist = true
    )
  );

DROP POLICY IF EXISTS "gift_card_services_business_access" ON public.gift_card_services;
CREATE POLICY "gift_card_services_business_access" ON public.gift_card_services
  FOR ALL USING (
    gift_card_id IN (
      SELECT id FROM public.gift_cards
      WHERE business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
         OR business_id IN (
           SELECT business_id FROM public.professionals
           WHERE auth_user_id = auth.uid() AND active = true AND is_receptionist = true
         )
    )
  );

DROP POLICY IF EXISTS "gift_card_sessions_business_access" ON public.gift_card_sessions;
CREATE POLICY "gift_card_sessions_business_access" ON public.gift_card_sessions
  FOR ALL USING (
    gift_card_id IN (
      SELECT id FROM public.gift_cards
      WHERE business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
         OR business_id IN (
           SELECT business_id FROM public.professionals
           WHERE auth_user_id = auth.uid() AND active = true AND is_receptionist = true
         )
    )
  );

-- 5. invoice_items.item_type precisa aceitar 'gift_card'
--    (hoje: appointment|product|package|credit). Descobre o nome do CHECK
--    dinamicamente pra não depender de nome hardcoded.
DO $$
DECLARE cn text;
BEGIN
  SELECT conname INTO cn
    FROM pg_constraint
   WHERE conrelid = 'public.invoice_items'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%item_type%';
  IF cn IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.invoice_items DROP CONSTRAINT %I', cn);
  END IF;
END $$;
ALTER TABLE public.invoice_items
  ADD CONSTRAINT invoice_items_item_type_check
  CHECK (item_type IN ('appointment','product','package','credit','gift_card'));

DO $$ BEGIN RAISE NOTICE 'v104 ok · gift_cards (vale-presente: modo serviços | valor)'; END $$;

-- ============================================================
-- ROLLBACK (se precisar reverter na janela de fechamento):
--   ALTER TABLE public.invoice_items DROP CONSTRAINT IF EXISTS invoice_items_item_type_check;
--   ALTER TABLE public.invoice_items ADD CONSTRAINT invoice_items_item_type_check
--     CHECK (item_type IN ('appointment','product','package','credit'));
--   DROP TABLE IF EXISTS public.gift_card_sessions;
--   DROP TABLE IF EXISTS public.gift_card_services;
--   DROP TABLE IF EXISTS public.gift_cards;
-- (seguro: tabelas novas, nada em uso depende delas até as rotas subirem)
-- ============================================================
