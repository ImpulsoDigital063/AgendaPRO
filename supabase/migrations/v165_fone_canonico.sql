-- v165 · Telefone canônico em todas as tabelas (Eduardo, 21/10)
--
-- O mesmo número chega com máscara "(91) 99815-3748", só dígitos
-- "91998153748", com 55 na frente ou sem o 9 do celular, conforme a porta
-- de entrada. Comparar pelo texto partia a mesma cliente em duas fichas
-- (Kamilly, Wanessa, 21/10: a avaliação abriu ficha nova e "zerou" os pontos).
--
-- A coluna `fone` é calculada pelo banco a partir do telefone gravado: só
-- dígitos, sem DDI, com o 9 do celular garantido. É a mesma regra de
-- telefoneCanonico() em src/lib/phone-variants.ts. Toda busca por cliente
-- compara por ela. O telefone que aparece na tela fica como está.
--
-- Coluna GERADA de propósito: o ADD COLUMN preenche as linhas antigas sem
-- disparar os triggers de UPDATE de appointments (comissão, pontos, overlap),
-- e nenhuma escrita nova consegue gravar fora do padrão.

create or replace function public.fone_canon(raw text) returns text
language sql immutable parallel safe as $$
  select case
    when d = '' then null
    when length(d) = 10 and substr(d, 3, 1) ~ '[6-9]' then substr(d, 1, 2) || '9' || substr(d, 3)
    else d
  end
  from (
    select case when length(x) in (12, 13) and left(x, 2) = '55' then substr(x, 3) else x end as d
    from (select regexp_replace(coalesce(raw, ''), '\D', '', 'g') as x) a
  ) b
$$;

alter table public.customers          add column if not exists fone text generated always as (public.fone_canon(phone)) stored;
alter table public.clients            add column if not exists fone text generated always as (public.fone_canon(phone)) stored;
alter table public.appointments       add column if not exists fone text generated always as (public.fone_canon(client_phone)) stored;
alter table public.review_claims      add column if not exists fone text generated always as (public.fone_canon(customer_phone)) stored;
alter table public.coupon_redemptions add column if not exists fone text generated always as (public.fone_canon(customer_phone)) stored;
alter table public.waitlist           add column if not exists fone text generated always as (public.fone_canon(client_phone)) stored;
alter table public.sales              add column if not exists fone text generated always as (public.fone_canon(client_phone)) stored;
alter table public.message_inbox      add column if not exists fone text generated always as (public.fone_canon(telefone)) stored;
alter table public.message_optout     add column if not exists fone text generated always as (public.fone_canon(telefone)) stored;

create index if not exists customers_business_fone_idx    on public.customers (business_id, fone);
create index if not exists clients_fone_idx               on public.clients (fone);
create index if not exists appointments_business_fone_idx on public.appointments (business_id, fone);
create index if not exists waitlist_business_fone_idx     on public.waitlist (business_id, fone);

-- Os três triggers de pontos acham a ficha pelo customer_id do agendamento
-- e, sem ele, pela coluna `fone`. Antes casavam `phone = client_phone` exato:
-- agendamento com máscara e ficha só com dígitos não ganhava ponto nenhum.
-- Corpo igual ao que estava no banco em 21/10, só a busca da ficha mudou.

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

    IF EXISTS (
      SELECT 1 FROM points_transactions
      WHERE appointment_id = NEW.id AND reason = 'service'
    ) THEN RETURN NEW; END IF;

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

CREATE OR REPLACE FUNCTION public.reverse_points_on_uncomplete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
    IF OLD.status <> 'completed' OR NEW.status NOT IN
  ('cancelled', 'no_show') THEN
      RETURN NEW;
    END IF;

    SELECT COALESCE(SUM(points), 0) INTO v_service_total
    FROM points_transactions
    WHERE appointment_id = NEW.id AND reason = 'service';

    IF v_service_total > 0 THEN
      SELECT customer_id, professional_id
        INTO v_service_customer, v_service_professional
      FROM points_transactions
      WHERE appointment_id = NEW.id AND reason = 'service' AND
   points > 0
      LIMIT 1;

      IF v_service_customer IS NOT NULL THEN
        INSERT INTO points_transactions
          (customer_id, business_id, points, reason,
  appointment_id, professional_id)
        VALUES
          (v_service_customer, NEW.business_id,
  -v_service_total, 'service', NEW.id,
  v_service_professional);

        UPDATE customers
          SET total_points = GREATEST(0,
  COALESCE(total_points, 0) - v_service_total)
          WHERE id = v_service_customer;
      END IF;
    END IF;

    SELECT COALESCE(SUM(points), 0) INTO v_referral_total
    FROM points_transactions
    WHERE appointment_id = NEW.id AND reason = 'referral';

    IF v_referral_total > 0 THEN
      SELECT customer_id, professional_id
        INTO v_referrer, v_referrer_professional
      FROM points_transactions
      WHERE appointment_id = NEW.id AND reason = 'referral'
  AND points > 0
      LIMIT 1;

      IF v_referrer IS NOT NULL THEN
        INSERT INTO points_transactions
          (customer_id, business_id, points, reason,
  appointment_id, professional_id)
        VALUES
          (v_referrer, NEW.business_id, -v_referral_total,
  'referral', NEW.id, v_referrer_professional);

        UPDATE customers
          SET total_points = GREATEST(0,
  COALESCE(total_points, 0) - v_referral_total)
          WHERE id = v_referrer;

        SELECT id INTO v_credited_customer
        FROM customers
        WHERE business_id = NEW.business_id
          AND (id = NEW.customer_id OR fone = public.fone_canon(NEW.client_phone))
          AND referred_by = v_referrer
        LIMIT 1;

        IF v_credited_customer IS NOT NULL THEN
          UPDATE customers
            SET referral_credited_at = NULL
            WHERE id = v_credited_customer;
        END IF;
      END IF;
    END IF;

    SELECT COALESCE(SUM(points), 0) INTO v_punctuality_total
    FROM points_transactions
    WHERE appointment_id = NEW.id AND reason = 'punctuality';

    IF v_punctuality_total > 0 THEN
      SELECT customer_id, professional_id
        INTO v_punctuality_customer,
  v_punctuality_professional
      FROM points_transactions
      WHERE appointment_id = NEW.id AND reason = 'punctuality'
   AND points > 0
      LIMIT 1;

      IF v_punctuality_customer IS NOT NULL THEN
        INSERT INTO points_transactions
          (customer_id, business_id, points, reason,
  appointment_id, professional_id)
        VALUES
          (v_punctuality_customer, NEW.business_id,
  -v_punctuality_total, 'punctuality', NEW.id,
  v_punctuality_professional);

        UPDATE customers
          SET total_points = GREATEST(0,
  COALESCE(total_points, 0) - v_punctuality_total)
          WHERE id = v_punctuality_customer;

        UPDATE appointments
          SET punctuality_awarded = FALSE
          WHERE id = NEW.id;
      END IF;
    END IF;

    RETURN NEW;
  END;
  $function$;

CREATE OR REPLACE FUNCTION public.apply_no_show_penalty()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  DECLARE
    v_biz                public.businesses%ROWTYPE;
    v_customer_id        uuid;
    v_current_balance    integer;
    v_calculated_penalty integer;
    v_effective_penalty  integer;
  BEGIN
    IF NEW.status <> 'no_show' OR OLD.status = 'no_show' THEN
      RETURN NEW;
    END IF;
    SELECT * INTO v_biz FROM public.businesses WHERE id = NEW.business_id;
    IF NOT FOUND OR v_biz.no_show_punishment_enabled IS NOT TRUE THEN
      RETURN NEW;
    END IF;
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE business_id = NEW.business_id
      AND (id = NEW.customer_id OR fone = public.fone_canon(NEW.client_phone))
    ORDER BY (id = NEW.customer_id) DESC NULLS LAST, created_at
    LIMIT 1;
    IF v_customer_id IS NULL THEN
      RETURN NEW;
    END IF;
    IF v_biz.no_show_penalty_mode = 'fixed' THEN
      v_calculated_penalty := COALESCE(v_biz.no_show_fixed_points, 0);
    ELSE
      SELECT COALESCE(SUM(s.points), 0)
        INTO v_calculated_penalty
      FROM public.appointment_services aps
      JOIN public.services s ON s.id = aps.service_id
      WHERE aps.appointment_id = NEW.id;
    END IF;
    IF v_calculated_penalty <= 0 THEN
      RETURN NEW;
    END IF;
    SELECT COALESCE(SUM(points), 0)
      INTO v_current_balance
    FROM public.points_transactions
    WHERE customer_id = v_customer_id;
    v_effective_penalty := LEAST(v_calculated_penalty, v_current_balance);
    IF v_effective_penalty <= 0 THEN
      RETURN NEW;
    END IF;
    INSERT INTO public.points_transactions (customer_id, business_id, points, reason, appointment_id)
    VALUES (v_customer_id, NEW.business_id, -v_effective_penalty, 'no_show_penalty', NEW.id);
    UPDATE public.customers
      SET total_points = GREATEST(0, total_points - v_effective_penalty)
      WHERE id = v_customer_id;
    RETURN NEW;
  END;
  $function$;
