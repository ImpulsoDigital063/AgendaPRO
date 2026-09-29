-- ============================================================
-- v149 · Atendimento cancelado/falta sai da comanda aberta, venha de onde vier
-- Auditoria da comanda · 29/09/2026 (C2)
-- ============================================================
--
-- Só o cancelamento do PAINEL (/api/admin/appointments/[id]/cancel) mexia
-- na comanda. Estes caminhos mudam só appointments.status e deixavam a
-- comanda ABERTA com o valor (aparece em Comandas e no "a receber"):
--   · cliente cancela pelo link (/api/appointment/action)
--   · profissional (/api/profissional/action)
--   · cartão da aba "Eu" e da recepção (AppointmentCard.updateStatus)
--   · sinal vencido (lib/sinal-expira) e /api/admin/sinal acao=cancelar
-- Em 29/09: 37 casos em cliente real (Olímpio 21, Wanessa 11, Gessica 5).
--
-- Regra (AFTER UPDATE do status · 1ª versão era BEFORE e o Postgres recusava:
-- apagar o item dispara o FK que mexe na própria linha em gravação):
--   status passou pra cancelled/no_show E o atendimento ainda está ligado a
--   uma comanda (invoice_item_id não nulo) E a comanda está ABERTA e SEM
--   pagamento → apaga o item do atendimento, desliga o invoice_item_id,
--   recalcula a comanda (mesma conta de /invoices/[id]/items) e, se não
--   sobrar item, cancela a comanda.
--
-- Não conflita com o painel: a rota de cancelar já grava invoice_item_id =
-- null na MESMA update (e faz a cascata completa dela) → a regra não age.
-- Comanda fechada ou com pagamento não é tocada (dinheiro já entrou; o
-- painel decide). Produto que estiver na mesma comanda fica lá (segue
-- aberto pra dona decidir) — a regra só tira o atendimento.
-- ============================================================

CREATE OR REPLACE FUNCTION public.atendimento_cancelado_sai_da_comanda()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
  v_status text;
  v_pagamentos int;
  v_itens_total numeric;
  v_itens_desc numeric;
  v_manual numeric;
  v_restantes int;
BEGIN
  IF NEW.status NOT IN ('cancelled', 'no_show')
     OR OLD.status IN ('cancelled', 'no_show')
     OR NEW.invoice_item_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT ii.invoice_id, i.status
    INTO v_invoice_id, v_status
  FROM public.invoice_items ii
  JOIN public.invoices i ON i.id = ii.invoice_id
  WHERE ii.id = NEW.invoice_item_id;

  IF v_invoice_id IS NULL OR v_status <> 'open' THEN
    RETURN NULL;
  END IF;

  SELECT count(*) INTO v_pagamentos FROM public.invoice_payments WHERE invoice_id = v_invoice_id;
  IF v_pagamentos > 0 THEN
    RETURN NULL;
  END IF;

  -- Desliga primeiro (update aninhado na própria linha é permitido no AFTER;
  -- as regras de status/pagamento não disparam de novo: nada disso muda).
  UPDATE public.appointments SET invoice_item_id = NULL WHERE id = NEW.id;
  DELETE FROM public.invoice_items WHERE id = NEW.invoice_item_id;

  SELECT count(*), coalesce(sum(total), 0), coalesce(sum(discount), 0)
    INTO v_restantes, v_itens_total, v_itens_desc
  FROM public.invoice_items WHERE invoice_id = v_invoice_id;

  IF v_restantes = 0 THEN
    UPDATE public.invoices
    SET status = 'cancelled', cancelled_at = now(),
        subtotal = 0, discount = 0, manual_discount = 0, total = 0
    WHERE id = v_invoice_id;
  ELSE
    SELECT least(coalesce(manual_discount, 0), v_itens_total) INTO v_manual
    FROM public.invoices WHERE id = v_invoice_id;
    UPDATE public.invoices
    SET subtotal = v_itens_total + v_itens_desc,
        discount = v_itens_desc + v_manual,
        manual_discount = v_manual,
        total = greatest(0, v_itens_total - v_manual)
    WHERE id = v_invoice_id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_atendimento_cancelado_sai_da_comanda ON public.appointments;
CREATE TRIGGER trg_atendimento_cancelado_sai_da_comanda
  AFTER UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.atendimento_cancelado_sai_da_comanda();

-- Verificação:
-- SELECT tgname FROM pg_trigger WHERE tgname = 'trg_atendimento_cancelado_sai_da_comanda';
