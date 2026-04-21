-- V16 — Reverter pontos quando appointment 'completed' for cancelado ou marcado no_show
-- Resolve gap: trigger v15 só credita, nunca debita. Se o profissional cancela ou marca
-- no_show DEPOIS do cron auto-completar, os pontos ficavam pra sempre.
-- Idempotente: insere transação negativa só se a soma das transações ainda for positiva.

CREATE OR REPLACE FUNCTION reverse_points_on_uncomplete()
RETURNS TRIGGER AS $$
DECLARE
  v_service_total integer;
  v_referral_total integer;
  v_service_customer uuid;
  v_referrer uuid;
  v_credited_customer uuid;
BEGIN
  -- Só dispara em transições completed -> cancelled OU completed -> no_show
  IF OLD.status <> 'completed' OR NEW.status NOT IN ('cancelled', 'no_show') THEN
    RETURN NEW;
  END IF;

  -- ============================================================
  -- (a) REVERTER PONTOS DE SERVIÇO
  -- ============================================================
  SELECT COALESCE(SUM(points), 0) INTO v_service_total
  FROM points_transactions
  WHERE appointment_id = NEW.id AND reason = 'service';

  -- v_service_total > 0 = ainda não foi revertido (se já tinha negativo, soma seria 0)
  IF v_service_total > 0 THEN
    SELECT customer_id INTO v_service_customer
    FROM points_transactions
    WHERE appointment_id = NEW.id AND reason = 'service' AND points > 0
    LIMIT 1;

    IF v_service_customer IS NOT NULL THEN
      INSERT INTO points_transactions (customer_id, business_id, points, reason, appointment_id)
      VALUES (v_service_customer, NEW.business_id, -v_service_total, 'service', NEW.id);

      UPDATE customers
        SET total_points = GREATEST(0, COALESCE(total_points, 0) - v_service_total)
        WHERE id = v_service_customer;
    END IF;
  END IF;

  -- ============================================================
  -- (b) REVERTER PONTOS DE REFERRAL
  -- ============================================================
  SELECT COALESCE(SUM(points), 0) INTO v_referral_total
  FROM points_transactions
  WHERE appointment_id = NEW.id AND reason = 'referral';

  IF v_referral_total > 0 THEN
    SELECT customer_id INTO v_referrer
    FROM points_transactions
    WHERE appointment_id = NEW.id AND reason = 'referral' AND points > 0
    LIMIT 1;

    IF v_referrer IS NOT NULL THEN
      INSERT INTO points_transactions (customer_id, business_id, points, reason, appointment_id)
      VALUES (v_referrer, NEW.business_id, -v_referral_total, 'referral', NEW.id);

      UPDATE customers
        SET total_points = GREATEST(0, COALESCE(total_points, 0) - v_referral_total)
        WHERE id = v_referrer;

      -- Reabre o crédito de referral pro customer indicado:
      -- se ele agendar de novo e completar, o referral conta.
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_reverse_points_on_uncomplete ON appointments;
CREATE TRIGGER trg_reverse_points_on_uncomplete
AFTER UPDATE OF status ON appointments
FOR EACH ROW
EXECUTE FUNCTION reverse_points_on_uncomplete();

-- =============================================================
-- BACKFILL: agendamentos que já estão cancelled/no_show E têm
-- transação positiva sem reversal correspondente. Insere o estorno.
-- =============================================================
DO $$
DECLARE
  r RECORD;
  v_total integer;
BEGIN
  FOR r IN
    SELECT a.id, a.business_id, pt.customer_id, pt.reason
    FROM appointments a
    JOIN points_transactions pt ON pt.appointment_id = a.id
    WHERE a.status IN ('cancelled', 'no_show')
      AND pt.reason IN ('service', 'referral')
    GROUP BY a.id, a.business_id, pt.customer_id, pt.reason
    HAVING SUM(pt.points) > 0
  LOOP
    SELECT COALESCE(SUM(points), 0) INTO v_total
    FROM points_transactions
    WHERE appointment_id = r.id AND reason = r.reason;

    IF v_total > 0 THEN
      INSERT INTO points_transactions (customer_id, business_id, points, reason, appointment_id)
      VALUES (r.customer_id, r.business_id, -v_total, r.reason, r.id);

      UPDATE customers
        SET total_points = GREATEST(0, COALESCE(total_points, 0) - v_total)
        WHERE id = r.customer_id;
    END IF;
  END LOOP;
END $$;
