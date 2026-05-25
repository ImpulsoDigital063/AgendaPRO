-- ============================================================
-- BACKFILL · Cria invoices retroativas pra appointments antigos
-- ============================================================
-- Roda 1x · cria 1 invoice por appointment sem invoice_item_id, ignorando
-- cancelados/no_show. Idempotente (WHERE invoice_item_id IS NULL).
--
-- Preserva histórico: invoice.created_at = appointment.created_at,
-- closed_at = paid_at original, payment_method idem.
--
-- Resultado esperado pra Palace: ~821 invoices criadas, status open
-- pra atendimentos não pagos, closed (+ invoice_payment) pra pagos.
-- ============================================================

DO $$
DECLARE
  appt RECORD;
  v_invoice_id uuid;
  v_invoice_item_id uuid;
  v_invoice_number int;
  v_count_total int := 0;
  v_count_paid int := 0;
BEGIN
  FOR appt IN
    SELECT
      id, business_id, customer_id, total_price, service_name,
      professional_id, paid_at, payment_method, payment_card_brand,
      payment_card_type, payment_fee_percent, payment_installments,
      created_at, status
    FROM public.appointments
    WHERE invoice_item_id IS NULL
      AND status NOT IN ('cancelled', 'no_show')
    ORDER BY created_at  -- mantém ordem cronológica nos invoice_number
  LOOP
    v_invoice_number := public.next_invoice_number(appt.business_id);

    -- 1. Cria invoice (open ou closed conforme paid_at)
    INSERT INTO public.invoices (
      business_id, customer_id, invoice_number, status,
      subtotal, discount, total,
      closed_at, created_at
    ) VALUES (
      appt.business_id, appt.customer_id, v_invoice_number,
      CASE WHEN appt.paid_at IS NOT NULL THEN 'closed' ELSE 'open' END,
      COALESCE(appt.total_price, 0), 0, COALESCE(appt.total_price, 0),
      appt.paid_at,
      appt.created_at
    )
    RETURNING id INTO v_invoice_id;

    -- 2. Cria invoice_item type=appointment apontando pro appt
    INSERT INTO public.invoice_items (
      invoice_id, item_type, reference_id, description,
      professional_id, quantity, unit_price, discount, total,
      created_at
    ) VALUES (
      v_invoice_id, 'appointment', appt.id,
      COALESCE(appt.service_name, 'Atendimento'),
      appt.professional_id, 1,
      COALESCE(appt.total_price, 0), 0,
      COALESCE(appt.total_price, 0),
      appt.created_at
    )
    RETURNING id INTO v_invoice_item_id;

    -- 3. Liga bilateralmente
    UPDATE public.appointments
      SET invoice_item_id = v_invoice_item_id
      WHERE id = appt.id;

    -- 4. Se já estava pago, cria invoice_payment correspondente
    IF appt.paid_at IS NOT NULL THEN
      INSERT INTO public.invoice_payments (
        invoice_id, payment_method, amount,
        card_brand, card_type, installments, fee_percent,
        paid_at
      ) VALUES (
        v_invoice_id, COALESCE(appt.payment_method, 'cash'),
        COALESCE(appt.total_price, 0),
        appt.payment_card_brand, appt.payment_card_type,
        COALESCE(appt.payment_installments, 1),
        COALESCE(appt.payment_fee_percent, 0),
        appt.paid_at
      );
      v_count_paid := v_count_paid + 1;
    END IF;

    v_count_total := v_count_total + 1;
  END LOOP;

  RAISE NOTICE 'Backfill concluído: % invoices criadas (% já com pagamento)', v_count_total, v_count_paid;
END $$;


-- ────────────────────────────────────────────────────────────
-- VERIFICAÇÃO (rodar separado · NÃO altera nada)
-- ────────────────────────────────────────────────────────────
SELECT
  b.name AS negocio,
  COUNT(*) FILTER (WHERE a.invoice_item_id IS NULL AND a.status NOT IN ('cancelled', 'no_show')) AS appts_sem_invoice,
  COUNT(*) FILTER (WHERE a.invoice_item_id IS NOT NULL) AS appts_com_invoice,
  COUNT(*) FILTER (WHERE a.status IN ('cancelled', 'no_show')) AS appts_cancelados
FROM public.appointments a
JOIN public.businesses b ON b.id = a.business_id
GROUP BY b.name
ORDER BY appts_sem_invoice DESC;
