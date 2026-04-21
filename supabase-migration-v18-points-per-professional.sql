-- V18 Pontuacao por profissional (opcional, toggle no admin)
-- Mantem retrocompatibilidade: default 'business' replica o comportamento atual.
-- Quando o admin liga 'professional', o saldo passa a ser calculado por profissional
-- no meus-pontos do cliente. As recompensas continuam definidas no negocio.
-- Idempotente.

-- ============================================================
-- 1. Coluna points_mode em businesses
-- ============================================================
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS points_mode text NOT NULL DEFAULT 'business';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'businesses_points_mode_check'
  ) THEN
    ALTER TABLE businesses
      ADD CONSTRAINT businesses_points_mode_check
      CHECK (points_mode IN ('business', 'professional'));
  END IF;
END $$;

-- ============================================================
-- 2. Coluna professional_id em points_transactions
-- ============================================================
ALTER TABLE points_transactions
  ADD COLUMN IF NOT EXISTS professional_id uuid
  REFERENCES professionals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_points_transactions_professional
  ON points_transactions(professional_id);

CREATE INDEX IF NOT EXISTS idx_points_transactions_customer_professional
  ON points_transactions(customer_id, professional_id);

-- ============================================================
-- 3. Backfill: transacoes com appointment_id pegam do appointment
-- ============================================================
UPDATE points_transactions pt
SET professional_id = a.professional_id
FROM appointments a
WHERE pt.appointment_id = a.id
  AND pt.professional_id IS NULL
  AND a.professional_id IS NOT NULL;

-- ============================================================
-- 4. Backfill review: atribui ao profissional do ultimo atendimento completo do cliente
-- ============================================================
UPDATE points_transactions pt
SET professional_id = sub.professional_id
FROM (
  SELECT DISTINCT ON (pt2.id)
    pt2.id AS pt_id,
    a.professional_id
  FROM points_transactions pt2
  JOIN customers c ON c.id = pt2.customer_id
  JOIN appointments a
    ON a.business_id = pt2.business_id
   AND a.client_phone = c.phone
   AND a.status = 'completed'
  WHERE pt2.reason = 'review'
    AND pt2.professional_id IS NULL
  ORDER BY pt2.id, a.appointment_date DESC, a.start_time DESC
) sub
WHERE pt.id = sub.pt_id;

-- ============================================================
-- 5. Trigger credit_points_on_confirm: inclui professional_id
-- ============================================================
CREATE OR REPLACE FUNCTION credit_points_on_confirm()
RETURNS TRIGGER AS $func$
DECLARE
  v_customer_id uuid;
  v_referrer_id uuid;
  v_referral_pts integer;
  v_already_credited timestamptz;
  v_service_pts integer;
BEGIN
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  SELECT c.id, c.referred_by, c.referral_credited_at
    INTO v_customer_id, v_referrer_id, v_already_credited
  FROM customers c
  WHERE c.business_id = NEW.business_id
    AND c.phone = NEW.client_phone
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- (a) PONTOS DE SERVICO
  SELECT COALESCE(SUM(s.points), 0) INTO v_service_pts
  FROM appointment_services aps
  JOIN services s ON s.id = aps.service_id
  WHERE aps.appointment_id = NEW.id;

  IF v_service_pts > 0 AND NOT EXISTS (
    SELECT 1 FROM points_transactions
    WHERE appointment_id = NEW.id AND reason = 'service'
  ) THEN
    INSERT INTO points_transactions
      (customer_id, business_id, points, reason, appointment_id, professional_id)
    VALUES
      (v_customer_id, NEW.business_id, v_service_pts, 'service', NEW.id, NEW.professional_id);

    UPDATE customers
      SET total_points = COALESCE(total_points, 0) + v_service_pts
      WHERE id = v_customer_id;
  END IF;

  -- (b) PONTOS DE REFERRAL
  IF v_referrer_id IS NOT NULL AND v_already_credited IS NULL THEN
    SELECT points_for_referral INTO v_referral_pts
    FROM businesses
    WHERE id = NEW.business_id;

    IF v_referral_pts IS NULL OR v_referral_pts <= 0 THEN
      UPDATE customers SET referral_credited_at = now() WHERE id = v_customer_id;
    ELSE
      INSERT INTO points_transactions
        (customer_id, business_id, points, reason, appointment_id, professional_id)
      VALUES
        (v_referrer_id, NEW.business_id, v_referral_pts, 'referral', NEW.id, NEW.professional_id);

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
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. Trigger reverse_points_on_uncomplete: herda professional_id da transacao original
-- ============================================================
CREATE OR REPLACE FUNCTION reverse_points_on_uncomplete()
RETURNS TRIGGER AS $func$
DECLARE
  v_service_total integer;
  v_referral_total integer;
  v_service_customer uuid;
  v_service_professional uuid;
  v_referrer uuid;
  v_referrer_professional uuid;
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

  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;
