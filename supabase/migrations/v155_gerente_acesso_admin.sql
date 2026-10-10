-- v155 · Gerente entra no painel do dono (10/10/2026)
--
-- Origem: Studio MOOD. A Izanara marcou a Marília como "Gerente" e ela só via
-- a agenda — `is_manager` era só etiqueta, nada no banco nem no app olhava pra
-- ele. Decisão do Eduardo: gerente acessa TUDO do admin, menos a Assinatura
-- AgendaPRO (plano, mensalidade, cancelar conta).
--
-- Como: uma função única `eh_gerente_do_negocio(bid)` e uma policy "gerente_*"
-- a mais em cada tabela do negócio. Nada existente é removido — dono, recepção
-- e profissional continuam com as mesmas policies de antes.
--
-- Fora de propósito: `subscriptions` (assinatura = só o dono), message_* sem
-- policy (só service role), push_subscriptions (é por usuário), clients.
--
-- Travas (o gerente não pode virar dono por tabela):
--   · professionals: não altera/apaga a linha do dono, não cria/marca ninguém
--     como dono (is_owner / role='owner').
--   · businesses: não troca owner_id; não apaga negócio (sem policy de DELETE).
-- Service role (auth.uid() nulo) passa direto: as rotas de API que usam service
-- role precisam fazer essa mesma checagem no app.

-- ─── 1. Função central ────────────────────────────────────────────────
-- SECURITY DEFINER pra ler `professionals` sem cair na RLS dela mesma
-- (recursão que derrubou a v47 — ver v48).
CREATE OR REPLACE FUNCTION eh_gerente_do_negocio(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM professionals
    WHERE business_id = p_business_id
      AND auth_user_id = auth.uid()
      AND active = true
      AND is_manager = true
  )
$$;

REVOKE ALL ON FUNCTION eh_gerente_do_negocio(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION eh_gerente_do_negocio(uuid) TO authenticated;

COMMENT ON FUNCTION eh_gerente_do_negocio(uuid) IS
  'v155 · true se quem chama é gerente ativo (professionals.is_manager) do negócio. Usada nas policies gerente_*.';

-- ─── 2. Tabelas com business_id ───────────────────────────────────────
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'activity_log', 'appointments', 'business_blocks',
    'cash_closings', 'cash_movements', 'cash_openings',
    'client_form_responses', 'client_form_templates',
    'commission_payments', 'companies', 'company_invoices', 'coupons',
    'customer_credits', 'customer_packages', 'customer_photos', 'customers',
    'expenses', 'gift_cards', 'invoices', 'merchant_devices', 'message_rules',
    'packages', 'points_transactions',
    'product_brands', 'product_categories', 'product_suppliers', 'products',
    'professional_salaries', 'professional_vouchers', 'professionals',
    'review_claims', 'rewards', 'sales', 'service_product_consumption',
    'services', 'stock_entries', 'stock_movements', 'waitlist',
    'working_hours_dates'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'gerente_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO authenticated
         USING (eh_gerente_do_negocio(business_id))
         WITH CHECK (eh_gerente_do_negocio(business_id))',
      'gerente_' || t, t
    );
  END LOOP;
END $$;

-- ─── 3. Tabelas filhas (sem business_id · vão pelo pai) ──────────────
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('appointment_services',      'appointment_id',      'appointments'),
    ('company_professionals',     'company_id',          'companies'),
    ('coupon_redemptions',        'coupon_id',           'coupons'),
    ('customer_package_balances', 'customer_package_id', 'customer_packages'),
    ('customer_package_sessions', 'customer_package_id', 'customer_packages'),
    ('gift_card_services',        'gift_card_id',        'gift_cards'),
    ('gift_card_sessions',        'gift_card_id',        'gift_cards'),
    ('invoice_items',             'invoice_id',          'invoices'),
    ('invoice_payments',          'invoice_id',          'invoices'),
    ('merchant_device_fees',      'device_id',           'merchant_devices'),
    ('package_items',             'package_id',          'packages'),
    ('sale_items',                'sale_id',             'sales'),
    ('stock_entry_items',         'entry_id',            'stock_entries'),
    ('working_hours',             'professional_id',     'professionals')
  ) AS v(filha, fk, pai) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'gerente_' || r.filha, r.filha);
    EXECUTE format(
      'CREATE POLICY %1$I ON %2$I FOR ALL TO authenticated
         USING (EXISTS (SELECT 1 FROM %4$I x WHERE x.id = %2$I.%3$I AND eh_gerente_do_negocio(x.business_id)))
         WITH CHECK (EXISTS (SELECT 1 FROM %4$I x WHERE x.id = %2$I.%3$I AND eh_gerente_do_negocio(x.business_id)))',
      'gerente_' || r.filha, r.filha, r.fk, r.pai
    );
  END LOOP;
END $$;

-- ─── 4. businesses · gerente edita configurações, não apaga ──────────
DROP POLICY IF EXISTS gerente_businesses ON businesses;
CREATE POLICY gerente_businesses ON businesses FOR UPDATE TO authenticated
  USING (eh_gerente_do_negocio(id))
  WITH CHECK (eh_gerente_do_negocio(id));

CREATE OR REPLACE FUNCTION trava_troca_de_dono()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id
     AND auth.uid() IS NOT NULL
     AND auth.uid() IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'so_o_dono_troca_o_dono' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_trava_troca_de_dono ON businesses;
CREATE TRIGGER trg_trava_troca_de_dono
  BEFORE UPDATE OF owner_id ON businesses
  FOR EACH ROW EXECUTE FUNCTION trava_troca_de_dono();

-- ─── 5. professionals · gerente não mexe no dono nem cria dono ───────
CREATE OR REPLACE FUNCTION trava_gerente_no_dono()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bid   uuid := COALESCE(NEW.business_id, OLD.business_id);
  v_owner uuid;
BEGIN
  -- service role / rotinas do sistema
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT owner_id INTO v_owner FROM businesses WHERE id = v_bid;

  -- dono faz o que quiser; quem não é gerente já é limitado pela RLS
  IF auth.uid() = v_owner OR NOT eh_gerente_do_negocio(v_bid) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE')
     AND (OLD.is_owner = true OR OLD.role = 'owner' OR OLD.auth_user_id = v_owner) THEN
    RAISE EXCEPTION 'gerente_nao_altera_o_dono' USING ERRCODE = '42501';
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE')
     AND (NEW.is_owner = true OR NEW.role = 'owner') THEN
    RAISE EXCEPTION 'gerente_nao_cria_dono' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_trava_gerente_no_dono ON professionals;
CREATE TRIGGER trg_trava_gerente_no_dono
  BEFORE INSERT OR UPDATE OR DELETE ON professionals
  FOR EACH ROW EXECUTE FUNCTION trava_gerente_no_dono();

-- ─── 6. Storage · capa do negócio (pasta = business_id) ─────────────
-- product-photos e professional-photos já aceitam qualquer autenticado.
-- Compara em texto: pasta que não é uuid não pode estourar cast e derrubar o
-- upload do próprio dono (policies são avaliadas juntas).
CREATE OR REPLACE FUNCTION eh_gerente_do_negocio_pasta(p_pasta text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM professionals
    WHERE business_id::text = p_pasta
      AND auth_user_id = auth.uid()
      AND active = true
      AND is_manager = true
  )
$$;
REVOKE ALL ON FUNCTION eh_gerente_do_negocio_pasta(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION eh_gerente_do_negocio_pasta(text) TO authenticated;

DROP POLICY IF EXISTS bc_gerente_insert ON storage.objects;
DROP POLICY IF EXISTS bc_gerente_update ON storage.objects;
DROP POLICY IF EXISTS bc_gerente_delete ON storage.objects;
CREATE POLICY bc_gerente_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'business-covers' AND eh_gerente_do_negocio_pasta((storage.foldername(name))[1]));
CREATE POLICY bc_gerente_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'business-covers' AND eh_gerente_do_negocio_pasta((storage.foldername(name))[1]));
CREATE POLICY bc_gerente_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'business-covers' AND eh_gerente_do_negocio_pasta((storage.foldername(name))[1]));
