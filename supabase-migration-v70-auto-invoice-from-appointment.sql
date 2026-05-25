-- ============================================================
-- v70 · Comanda automática ao criar atendimento
-- ============================================================
-- Regra cravada por Eduardo (24/05/2026): comportamento Salão99-like.
-- Todo atendimento criado nasce já com uma COMANDA ABERTA (invoice status='open')
-- contendo o serviço como invoice_item type='appointment'. Daí o operador
-- pode ir adicionando produtos durante o atendimento (via "Add à comanda")
-- e fechar tudo no fim com "Receber pagamento".
--
-- Trigger AFTER INSERT em appointments:
--  - cria invoice (status=open, total = appointment.total_price)
--  - cria invoice_items (1 linha · type=appointment · reference_id=appt.id)
--  - UPDATE appointment.invoice_item_id pra ligar bilateralmente
--
-- IGNORA appointments com status='cancelled' ou 'no_show' (não faz sentido
-- comanda pra atendimento que já nasceu cancelado).
--
-- IGNORA se appointment.invoice_item_id JÁ existe (defensive · evita
-- duplicação se o caller já criou).
--
-- DADOS LEGADOS (1435 appointments importados Palace): NÃO ganham comanda
-- retroativamente. Só novos atendimentos a partir de agora.
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_create_invoice_for_appointment()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id uuid;
  v_invoice_number int;
  v_invoice_item_id uuid;
BEGIN
  -- Skip: cancelado ou no_show já no INSERT
  IF NEW.status IN ('cancelled', 'no_show') THEN
    RETURN NEW;
  END IF;

  -- Skip: já tem invoice (caller criou manualmente · ex: import com FK)
  IF NEW.invoice_item_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- next_invoice_number por business (função v54)
  v_invoice_number := public.next_invoice_number(NEW.business_id);

  -- Cria invoice em open
  INSERT INTO public.invoices (
    business_id, customer_id, invoice_number, status,
    subtotal, discount, total
  ) VALUES (
    NEW.business_id, NEW.customer_id, v_invoice_number, 'open',
    COALESCE(NEW.total_price, 0), 0, COALESCE(NEW.total_price, 0)
  )
  RETURNING id INTO v_invoice_id;

  -- Cria invoice_item type='appointment' apontando pro appointment
  INSERT INTO public.invoice_items (
    invoice_id, item_type, reference_id, description,
    professional_id, quantity, unit_price, discount, total
  ) VALUES (
    v_invoice_id, 'appointment', NEW.id,
    COALESCE(NEW.service_name, 'Atendimento'),
    NEW.professional_id, 1,
    COALESCE(NEW.total_price, 0), 0,
    COALESCE(NEW.total_price, 0)
  )
  RETURNING id INTO v_invoice_item_id;

  -- Liga o appointment ao invoice_item criado
  UPDATE public.appointments
    SET invoice_item_id = v_invoice_item_id
    WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_invoice_for_appointment ON public.appointments;
CREATE TRIGGER trg_auto_invoice_for_appointment
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_invoice_for_appointment();
