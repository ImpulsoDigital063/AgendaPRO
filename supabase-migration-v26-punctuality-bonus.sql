-- ============================================================
-- Migration V26: Bônus de pontualidade
-- AgendaPRO — feature sugerida pelo Fundador #1 (Barbeiro Palmas, 28/04)
-- ============================================================
-- Regra de negócio:
--   - Profissional decide na hora do "Atendi": clica botão extra "+Pontualidade"
--   - Cliente recebe pts adicionais (default 10) pelo bom comportamento
--   - Valor configurável por negócio em Configurações → Fidelidade
--   - Reverte automaticamente se appointment volta de completed pra cancelled/no_show
--
-- Idempotente: pode rodar várias vezes sem corromper estado.
-- ============================================================


-- 1. CONFIGURAÇÃO POR NEGÓCIO
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS punctuality_bonus_points INTEGER NOT NULL DEFAULT 10;

COMMENT ON COLUMN businesses.punctuality_bonus_points IS
  'Pts extras dados ao cliente quando profissional clica "+Pontualidade" ao confirmar atendimento. Default 10.';


-- 2. FLAG NO AGENDAMENTO (idempotência: evita conceder duas vezes)
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS punctuality_awarded BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN appointments.punctuality_awarded IS
  'TRUE quando o profissional concedeu o bônus de pontualidade nesse agendamento.';


-- 3. ESTENDE TRIGGER reverse_points_on_uncomplete
-- Quando appointment volta de completed pra cancelled/no_show, também reverte punctuality.
CREATE OR REPLACE FUNCTION reverse_points_on_uncomplete()
RETURNS TRIGGER AS $func$
DECLARE
  v_service_total integer;
  v_referral_total integer;
  v_punctuality_total integer;
  v_service_customer uuid;
  v_service_professional uuid;
  v_referrer uuid;
  v_referrer_professional uuid;
  v_punctuality_customer uuid;
  v_punctuality_professional uuid;
  v_credited_customer uuid;
BEGIN
  IF OLD.status <> 'completed' OR NEW.status NOT IN ('cancelled', 'no_show') THEN
    RETURN NEW;
  END IF;

  -- (a) REVERTER PONTOS DE SERVICO
  SELECT COALESCE(SUM(points), 0) INTO v_service_total
  FROM points_transactions
  WHERE appointment_id = NEW.id AND reason = 'service';

  IF v_service_total > 0 THEN
    SELECT customer_id, professional_id
      INTO v_service_customer, v_service_professional
    FROM points_transactions
    WHERE appointment_id = NEW.id AND reason = 'service' AND points > 0
    LIMIT 1;

    IF v_service_customer IS NOT NULL THEN
      INSERT INTO points_transactions
        (customer_id, business_id, points, reason, appointment_id, professional_id)
      VALUES
        (v_service_customer, NEW.business_id, -v_service_total, 'service', NEW.id, v_service_professional);

      UPDATE customers
        SET total_points = GREATEST(0, COALESCE(total_points, 0) - v_service_total)
        WHERE id = v_service_customer;
    END IF;
  END IF;

  -- (b) REVERTER PONTOS DE REFERRAL
  SELECT COALESCE(SUM(points), 0) INTO v_referral_total
  FROM points_transactions
  WHERE appointment_id = NEW.id AND reason = 'referral';

  IF v_referral_total > 0 THEN
    SELECT customer_id, professional_id
      INTO v_referrer, v_referrer_professional
    FROM points_transactions
    WHERE appointment_id = NEW.id AND reason = 'referral' AND points > 0
    LIMIT 1;

    IF v_referrer IS NOT NULL THEN
      INSERT INTO points_transactions
        (customer_id, business_id, points, reason, appointment_id, professional_id)
      VALUES
        (v_referrer, NEW.business_id, -v_referral_total, 'referral', NEW.id, v_referrer_professional);

      UPDATE customers
        SET total_points = GREATEST(0, COALESCE(total_points, 0) - v_referral_total)
        WHERE id = v_referrer;

      SELECT id INTO v_credited_customer
      FROM customers
      WHERE business_id = NEW.business_id
        AND phone = NEW.client_phone
        AND referred_by = v_referrer
      LIMIT 1;

      IF v_credited_customer IS NOT NULL THEN
        UPDATE customers
          SET referral_credited_at = NULL
          WHERE id = v_credited_customer;
      END IF;
    END IF;
  END IF;

  -- (c) REVERTER PONTOS DE PUNCTUALITY (novo na V26)
  SELECT COALESCE(SUM(points), 0) INTO v_punctuality_total
  FROM points_transactions
  WHERE appointment_id = NEW.id AND reason = 'punctuality';

  IF v_punctuality_total > 0 THEN
    SELECT customer_id, professional_id
      INTO v_punctuality_customer, v_punctuality_professional
    FROM points_transactions
    WHERE appointment_id = NEW.id AND reason = 'punctuality' AND points > 0
    LIMIT 1;

    IF v_punctuality_customer IS NOT NULL THEN
      INSERT INTO points_transactions
        (customer_id, business_id, points, reason, appointment_id, professional_id)
      VALUES
        (v_punctuality_customer, NEW.business_id, -v_punctuality_total, 'punctuality', NEW.id, v_punctuality_professional);

      UPDATE customers
        SET total_points = GREATEST(0, COALESCE(total_points, 0) - v_punctuality_total)
        WHERE id = v_punctuality_customer;

      -- Reseta a flag pra permitir conceder de novo se o profissional reativar o appointment
      UPDATE appointments
        SET punctuality_awarded = FALSE
        WHERE id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- FIM DA MIGRATION V26
-- ============================================================
-- Pós-aplicação:
--   1. Verificar campo novo: SELECT punctuality_bonus_points FROM businesses LIMIT 1;
--   2. Confirmar que appointments tem coluna punctuality_awarded
--   3. Deploy do código que adiciona o botão "+Pontualidade" no card de agendamento
-- ============================================================
