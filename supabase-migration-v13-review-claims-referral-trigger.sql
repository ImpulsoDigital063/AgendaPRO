-- V13 — Review claims (aprovação manual) + referral trigger no confirm
-- Aplicar DEPOIS da V12.
-- Idempotente.

-- ============================================================
-- 1. TABELA review_claims
-- ============================================================
-- Cliente pede pontos por avaliação no Google → fica pending.
-- Dono olha no Google, aprova ou rejeita.
CREATE TABLE IF NOT EXISTS review_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_phone text NOT NULL,
  customer_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  points_awarded integer,
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  notes text
);

CREATE INDEX IF NOT EXISTS idx_review_claims_business_status
  ON review_claims(business_id, status);
CREATE INDEX IF NOT EXISTS idx_review_claims_customer
  ON review_claims(customer_id);

-- Um customer só pode ter 1 claim approved por negócio (não pode farmar pontos)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_review_claim_approved
  ON review_claims(business_id, customer_id)
  WHERE status = 'approved';

-- Um customer só pode ter 1 claim pending por negócio (evita spam)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_review_claim_pending
  ON review_claims(business_id, customer_id)
  WHERE status = 'pending';

ALTER TABLE review_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin sees own business claims" ON review_claims;
CREATE POLICY "admin sees own business claims" ON review_claims
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = review_claims.business_id AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "admin updates own business claims" ON review_claims;
CREATE POLICY "admin updates own business claims" ON review_claims
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = review_claims.business_id AND b.owner_id = auth.uid()
    )
  );

-- ============================================================
-- 2. Coluna customers.referral_credited_at
-- ============================================================
-- Garante que o indicador só ganha pontos UMA vez por cliente indicado,
-- mesmo que o indicado faça vários agendamentos confirmados.
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS referral_credited_at timestamptz;

-- ============================================================
-- 3. TRIGGER: credita pontos (serviço + referral) no confirmed
-- ============================================================
-- Dispara: UPDATE appointments SET status='confirmed' (vindo de qualquer outro status)
--
-- Ações:
-- (a) Soma points dos services do appointment → credita o customer (reason='service')
-- (b) Se o customer tem referred_by e ainda não foi creditado → credita o referrer (reason='referral')
--
-- Regra: pontos só são creditados quando o dono/profissional confirma o agendamento.
-- Cancelamento após confirmação NÃO reverte pontos.
CREATE OR REPLACE FUNCTION credit_points_on_confirm()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id uuid;
  v_referrer_id uuid;
  v_referral_pts integer;
  v_already_credited timestamptz;
  v_service_pts integer;
BEGIN
  -- só dispara quando status muda PARA confirmed
  IF NEW.status <> 'confirmed' OR OLD.status = 'confirmed' THEN
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
  -- (a) PONTOS DE SERVIÇO
  -- ============================================================
  -- Idempotência: se já existe uma transaction reason='service' pra esse appointment,
  -- não duplica (ex: re-confirmação após cancelamento).
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
      -- Programa sem pontos — ainda assim marca como "creditado" pra não reavaliar toda vez
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

-- Remove o trigger antigo se existir (renomeamos de credit_referral → credit_points)
DROP TRIGGER IF EXISTS trg_credit_referral_on_confirm ON appointments;
DROP TRIGGER IF EXISTS trg_credit_points_on_confirm ON appointments;
CREATE TRIGGER trg_credit_points_on_confirm
AFTER UPDATE OF status ON appointments
FOR EACH ROW
EXECUTE FUNCTION credit_points_on_confirm();
