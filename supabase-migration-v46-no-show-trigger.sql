-- =====================================================================
-- v46 — TRIGGER `apply_no_show_penalty` · 14/05/2026
-- =====================================================================
--
-- Quando appointments.status vira 'no_show' E o business tem
-- no_show_punishment_enabled=TRUE, esta function deduz pontos do
-- customer associado.
--
-- Espelho conceitual do trigger `credit_points_on_confirm` (v15) — mesma
-- arquitetura, mesma estratégia de match de customer via phone.
--
-- REGRAS (cravadas com Eduardo 14/05):
--   · Só dispara quando OLD.status != 'no_show' E NEW.status = 'no_show'
--     (idempotente · não pune 2x se admin tocar status duplo)
--   · Skip se business.no_show_punishment_enabled = FALSE
--   · Skip se customer não existe (cliente que nunca agendou antes nessa
--     base · 99% das vezes é cliente público que só agendou agora)
--   · Modo 'proportional' = SUM(services.points) dos appointment_services
--   · Modo 'fixed' = businesses.no_show_fixed_points
--   · CLAMP em zero: penalty = MIN(penalty, saldo_atual_customer)
--   · Se penalty resultante = 0 (cliente sem saldo ou sem points
--     definidos): não insere transaction · não polui histórico
--
-- IDEMPOTENTE. Não afeta:
--   · Trigger credit_points_on_confirm (v15) — esse continua independente
--   · Trigger reverse_points (v16) — esse continua independente
--   · Businesses com no_show_punishment_enabled=FALSE (default · 100% dos
--     existentes na hora deste deploy)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.apply_no_show_penalty()
RETURNS TRIGGER AS $$
DECLARE
  v_biz                public.businesses%ROWTYPE;
  v_customer_id        uuid;
  v_current_balance    integer;
  v_calculated_penalty integer;
  v_effective_penalty  integer;
BEGIN
  -- 1. Guard · só dispara na transição PRA no_show
  IF NEW.status <> 'no_show' OR OLD.status = 'no_show' THEN
    RETURN NEW;
  END IF;

  -- 2. Carrega business · sem RLS dentro de SECURITY DEFINER
  SELECT * INTO v_biz FROM public.businesses WHERE id = NEW.business_id;
  IF NOT FOUND OR v_biz.no_show_punishment_enabled IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- 3. Match customer via phone (mesma estratégia da v15)
  -- customers.phone tem UNIQUE (business_id, phone) — só 1 row possível
  SELECT id INTO v_customer_id
  FROM public.customers
  WHERE business_id = NEW.business_id
    AND phone = NEW.client_phone
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Cliente público que agendou sem cadastro completo · não tem
    -- saldo de pontos pra punir · skip silencioso.
    RETURN NEW;
  END IF;

  -- 4. Calcula penalty conforme modo
  IF v_biz.no_show_penalty_mode = 'fixed' THEN
    v_calculated_penalty := COALESCE(v_biz.no_show_fixed_points, 0);
  ELSE
    -- 'proportional' (default) · soma points dos services do appointment
    SELECT COALESCE(SUM(s.points), 0)
      INTO v_calculated_penalty
    FROM public.appointment_services aps
    JOIN public.services s ON s.id = aps.service_id
    WHERE aps.appointment_id = NEW.id;
  END IF;

  IF v_calculated_penalty <= 0 THEN
    -- Serviço sem points configurado · nada a tirar · skip.
    RETURN NEW;
  END IF;

  -- 5. CLAMP em zero · pega saldo atual e limita
  SELECT COALESCE(SUM(points), 0)
    INTO v_current_balance
  FROM public.points_transactions
  WHERE customer_id = v_customer_id;

  v_effective_penalty := LEAST(v_calculated_penalty, v_current_balance);

  IF v_effective_penalty <= 0 THEN
    -- Customer sem saldo · nada a deduzir · skip (decisão 4 com Eduardo).
    RETURN NEW;
  END IF;

  -- 6. Insere transaction NEGATIVA · denormalized também em customers
  INSERT INTO public.points_transactions (
    customer_id, business_id, points, reason, appointment_id
  ) VALUES (
    v_customer_id, NEW.business_id, -v_effective_penalty,
    'no_show_penalty', NEW.id
  );

  UPDATE public.customers
    SET total_points = GREATEST(0, total_points - v_effective_penalty)
    WHERE id = v_customer_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger AFTER UPDATE OF status
-- Roda DEPOIS de credit_points_on_confirm (v15) porque o status só pode
-- ir pra 1 estado terminal por vez (completed XOR no_show). Sem conflito.
DROP TRIGGER IF EXISTS trg_apply_no_show_penalty ON public.appointments;
CREATE TRIGGER trg_apply_no_show_penalty
AFTER UPDATE OF status ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.apply_no_show_penalty();

-- =====================================================================
-- VALIDAÇÃO PÓS-MIGRATION
-- =====================================================================
-- SELECT tgname, tgtype FROM pg_trigger WHERE tgname = 'trg_apply_no_show_penalty';
-- → esperado: 1 linha
--
-- TESTE em business com no_show_punishment_enabled=TRUE:
-- UPDATE appointments SET status='no_show' WHERE id='<test_id>';
-- SELECT * FROM points_transactions WHERE appointment_id='<test_id>';
-- → esperado: 1 row com points negativo · reason='no_show_penalty'
-- =====================================================================
