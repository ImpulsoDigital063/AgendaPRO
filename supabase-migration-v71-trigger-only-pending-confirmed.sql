-- ============================================================
-- v71 · Trigger auto-invoice ignora appointments completed/cancelled/no_show
-- ============================================================
-- Atualiza o trigger da v70 pra disparar SÓ pra status IN (pending, confirmed).
--
-- Por que: quando o operador adiciona serviço extra a uma comanda existente
-- (via /admin/comandas/[id] → + Adicionar serviço), criamos um appointment
-- já com status='completed' (serviço já foi feito). Sem esse ajuste, o
-- trigger v70 criaria uma SEGUNDA invoice pro mesmo serviço · loop ruim.
--
-- Comportamento esperado:
--  - INSERT appointment status=pending    → cria invoice auto ✓
--  - INSERT appointment status=confirmed  → cria invoice auto ✓
--  - INSERT appointment status=completed  → NÃO cria (caller já vincula)
--  - INSERT appointment status=cancelled  → NÃO cria
--  - INSERT appointment status=no_show    → NÃO cria
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_create_invoice_for_appointment()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id uuid;
  v_invoice_number int;
  v_invoice_item_id uuid;
BEGIN
  -- Só cria comanda automática pra agendamentos vivos (pending/confirmed).
  -- Outros estados (completed, cancelled, no_show) são casos especiais
  -- em que o caller já cuida da invoice (ex: serviço extra na comanda).
  IF NEW.status NOT IN ('pending', 'confirmed') THEN
    RETURN NEW;
  END IF;

  -- Skip: já tem invoice (defensive)
  IF NEW.invoice_item_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_invoice_number := public.next_invoice_number(NEW.business_id);

  INSERT INTO public.invoices (
    business_id, customer_id, invoice_number, status,
    subtotal, discount, total
  ) VALUES (
    NEW.business_id, NEW.customer_id, v_invoice_number, 'open',
    COALESCE(NEW.total_price, 0), 0, COALESCE(NEW.total_price, 0)
  )
  RETURNING id INTO v_invoice_id;

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

  UPDATE public.appointments
    SET invoice_item_id = v_invoice_item_id
    WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger já existe da v70 · só recriar a função basta (REPLACE FUNCTION).
-- Reafirma pra garantir:
DROP TRIGGER IF EXISTS trg_auto_invoice_for_appointment ON public.appointments;
CREATE TRIGGER trg_auto_invoice_for_appointment
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_invoice_for_appointment();
