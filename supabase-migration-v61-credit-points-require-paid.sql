-- v61 — Pontos só creditam após pagamento confirmado
--
-- Regra cravada por Eduardo em 19/05/2026:
-- "Pontos só podem ser creditados depois de marcar como pago. É uma
-- regra que vale para pontuação e para o financeiro."
--
-- Bug encontrado: trigger v15 disparava em qualquer UPDATE de status pra
-- 'completed', creditando pontos mesmo com paid_at NULL · violava a regra.
--
-- Mudancas:
-- 1. Função credit_points_on_confirm agora exige NEW.paid_at IS NOT NULL
-- 2. Idempotência via points_transactions movida pro topo (cobre as 2
--    transicoes possiveis: status→completed com paid_at OU paid_at sendo
--    setado depois quando ja era completed)
-- 3. Trigger passa a escutar UPDATE OF status, paid_at (em vez de só status)
--    pra detectar quando o pagamento e' confirmado posteriormente via
--    /api/admin/appointments/[id]/payment (recepção / dono / profissional)
--
-- Combina com:
-- - Remocao do botao "Atendi" branco no AppointmentCard/ProfAppointmentCard
-- - Desligamento do cron /api/cron/auto-complete (deixava status='completed'
--   com paid_at=NULL · regra cravada nao admite mais isso)
--
-- Idempotente.

CREATE OR REPLACE FUNCTION credit_points_on_confirm()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id uuid;
  v_referrer_id uuid;
  v_referral_pts integer;
  v_already_credited timestamptz;
  v_service_pts integer;
BEGIN
  -- Gate 1: precisa estar completed
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  -- Gate 2: precisa ter pagamento confirmado
  IF NEW.paid_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Idempotência: cobre tanto a transição status→completed (com paid_at
  -- ja setado pelo "Atendi e recebi") quanto paid_at sendo setado depois
  -- via endpoint /payment quando ja era completed.
  IF EXISTS (
    SELECT 1 FROM points_transactions
    WHERE appointment_id = NEW.id AND reason = 'service'
  ) THEN
    RETURN NEW;
  END IF;

  -- Busca customer relacionado (por business + phone)
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
  -- (a) PONTOS DE SERVIÇO
  -- ============================================================
  SELECT COALESCE(SUM(s.points), 0) INTO v_service_pts
  FROM appointment_services aps
  JOIN services s ON s.id = aps.service_id
  WHERE aps.appointment_id = NEW.id;

  IF v_service_pts > 0 THEN
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

-- Recria trigger pra escutar status E paid_at
DROP TRIGGER IF EXISTS trg_credit_points_on_confirm ON appointments;
CREATE TRIGGER trg_credit_points_on_confirm
AFTER UPDATE OF status, paid_at ON appointments
FOR EACH ROW
EXECUTE FUNCTION credit_points_on_confirm();
