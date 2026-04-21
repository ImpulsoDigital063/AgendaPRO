-- V15 — Status 'completed' e 'no_show' + trigger credita em 'completed'
-- Resolve farma de pontos: cliente pontuava ao confirmar, mas se cancelasse/faltasse ficava com pontos.
-- Baseado no V13, mudando o gatilho de 'confirmed' -> 'completed'.
-- Idempotente.

-- 1. Atualiza CHECK do status pra incluir 'completed' e 'no_show'
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE appointments ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('pending', 'confirmed', 'completed', 'no_show', 'cancelled'));

-- 2. Substitui trigger pra creditar pontos quando vira 'completed' (era 'confirmed')
CREATE OR REPLACE FUNCTION credit_points_on_confirm()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id uuid;
  v_referrer_id uuid;
  v_referral_pts integer;
  v_already_credited timestamptz;
  v_service_pts integer;
BEGIN
  -- so dispara quando status muda PARA completed
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- busca o customer relacionado a esse appointment (por business + phone)
  SELECT c.id, c.referred_by, c.referral_credited_at
    INTO v_customer_id, v_referrer_id, v_already_credited
  FROM customers c
  WHERE c.business_id = NEW.business_id
    AND c.phone = NEW.client_phone
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- ============================================================
  -- (a) PONTOS DE SERVICO
  -- ============================================================
  -- Idempotencia: se ja existe transaction reason='service' pra esse appointment, nao duplica
  SELECT COALESCE(SUM(s.points), 0) INTO v_service_pts
  FROM appointment_services aps
  JOIN services s ON s.id = aps.service_id
  WHERE aps.appointment_id = NEW.id;

  IF v_service_pts > 0 AND NOT EXISTS (
    SELECT 1 FROM points_transactions
    WHERE appointment_id = NEW.id AND reason = 'service'
  ) THEN
    INSERT INTO points_transactions (customer_id, business_id, points, reason, appointment_id)
    VALUES (v_customer_id, NEW.business_id, v_service_pts, 'service', NEW.id);

    UPDATE customers
      SET total_points = COALESCE(total_points, 0) + v_service_pts
      WHERE id = v_customer_id;
  END IF;

  -- ============================================================
  -- (b) PONTOS DE REFERRAL
  -- ============================================================
  IF v_referrer_id IS NOT NULL AND v_already_credited IS NULL THEN
    SELECT points_for_referral INTO v_referral_pts
    FROM businesses
    WHERE id = NEW.business_id;

    IF v_referral_pts IS NULL OR v_referral_pts <= 0 THEN
      UPDATE customers SET referral_credited_at = now() WHERE id = v_customer_id;
    ELSE
      INSERT INTO points_transactions (customer_id, business_id, points, reason, appointment_id)
      VALUES (v_referrer_id, NEW.business_id, v_referral_pts, 'referral', NEW.id);

      UPDATE customers
        SET total_points = COALESCE(total_points, 0) + v_referral_pts
        WHERE id = v_referrer_id;

      UPDATE customers
        SET referral_credited_at = now()
        WHERE id = v_customer_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recria trigger pra disparar em UPDATE de status
DROP TRIGGER IF EXISTS trg_credit_points_on_confirm ON appointments;
CREATE TRIGGER trg_credit_points_on_confirm
AFTER UPDATE OF status ON appointments
FOR EACH ROW
EXECUTE FUNCTION credit_points_on_confirm();

-- 4. Backfill — agendamentos confirmados com horario passado viram completed
UPDATE appointments
SET status = 'completed'
WHERE status = 'confirmed'
  AND (
    appointment_date < CURRENT_DATE
    OR (appointment_date = CURRENT_DATE AND end_time < CURRENT_TIME)
  );
