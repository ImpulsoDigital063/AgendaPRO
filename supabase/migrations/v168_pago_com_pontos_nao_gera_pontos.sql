-- v168 · Atendimento pago com pontos não gera pontos (Eduardo, 21/10)
--
-- No teste da v167 a cliente trocou 800 pts por um serviço grátis e ganhou
-- +80 pelo mesmo atendimento. Regra do Eduardo: "atendimentos por pontos,
-- não gera pontos". Corpo igual ao da v165, só o bloco v168 é novo.
--
-- "Já creditado" passa a ser soma positiva de 'service', não existir linha:
-- pago no pix, repago com pontos (estorna, soma 0) e repago no pix de novo
-- volta a creditar.

CREATE OR REPLACE FUNCTION public.credit_points_on_confirm()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  DECLARE
    v_customer_id uuid;
    v_referrer_id uuid;
    v_referral_pts integer;
    v_already_credited timestamptz;
    v_service_pts integer;
  BEGIN
    IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
    IF NEW.paid_at IS NULL THEN RETURN NEW; END IF;

    -- v168 · atendimento pago com PONTOS não gera pontos (Eduardo 21/10).
    -- Se já tinha gerado (pago antes no pix e repago com pontos), devolve.
    IF NEW.payment_method = 'points' THEN
      SELECT COALESCE(SUM(points), 0), MIN(customer_id::text)::uuid
        INTO v_service_pts, v_customer_id
      FROM points_transactions
      WHERE appointment_id = NEW.id AND reason = 'service';
      IF v_service_pts > 0 AND v_customer_id IS NOT NULL THEN
        INSERT INTO points_transactions (customer_id, business_id, points, reason, appointment_id)
        VALUES (v_customer_id, NEW.business_id, -v_service_pts, 'service', NEW.id);
        UPDATE customers SET total_points = GREATEST(0, COALESCE(total_points, 0) - v_service_pts) WHERE id = v_customer_id;
      END IF;
      RETURN NEW;
    END IF;

    -- Já creditado = soma positiva (antes: existir qualquer linha). Com o
    -- estorno, a soma volta a 0 e repagar no pix credita de novo.
    IF (
      SELECT COALESCE(SUM(points), 0) FROM points_transactions
      WHERE appointment_id = NEW.id AND reason = 'service'
    ) > 0 THEN RETURN NEW; END IF;

    SELECT c.id, c.referred_by, c.referral_credited_at
      INTO v_customer_id, v_referrer_id, v_already_credited
    FROM customers c
    WHERE c.business_id = NEW.business_id
      AND (c.id = NEW.customer_id OR c.fone = public.fone_canon(NEW.client_phone))
    ORDER BY (c.id = NEW.customer_id) DESC NULLS LAST, c.created_at
    LIMIT 1;

    IF v_customer_id IS NULL THEN RETURN NEW; END IF;

    SELECT COALESCE(SUM(s.points), 0) INTO v_service_pts
    FROM appointment_services aps
    JOIN services s ON s.id = aps.service_id
    WHERE aps.appointment_id = NEW.id;

    IF v_service_pts > 0 THEN
      INSERT INTO points_transactions (customer_id, business_id, points, reason, appointment_id)
      VALUES (v_customer_id, NEW.business_id, v_service_pts, 'service', NEW.id);
      UPDATE customers SET total_points = COALESCE(total_points, 0) + v_service_pts WHERE id = v_customer_id;
    END IF;

    IF v_referrer_id IS NOT NULL AND v_already_credited IS NULL THEN
      SELECT points_for_referral INTO v_referral_pts FROM businesses WHERE id = NEW.business_id;
      IF v_referral_pts IS NULL OR v_referral_pts <= 0 THEN
        UPDATE customers SET referral_credited_at = now() WHERE id = v_customer_id;
      ELSE
        INSERT INTO points_transactions (customer_id, business_id, points, reason, appointment_id)
        VALUES (v_referrer_id, NEW.business_id, v_referral_pts, 'referral', NEW.id);
        UPDATE customers SET total_points = COALESCE(total_points, 0) + v_referral_pts WHERE id = v_referrer_id;
        UPDATE customers SET referral_credited_at = now() WHERE id = v_customer_id;
      END IF;
    END IF;

    RETURN NEW;
  END;
  $function$;
