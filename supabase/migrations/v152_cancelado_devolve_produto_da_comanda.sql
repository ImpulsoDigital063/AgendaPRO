-- v152 · atendimento cancelado/falta: sai da comanda aberta e, se na comanda
-- só sobrou PRODUTO (o do combo), a comanda inteira é cancelada e o estoque
-- volta. (Eduardo 29/09/2026 · opção A)
--
-- Contexto: toda comanda nasce no agendamento (trigger v70/v77) e o produto
-- do combo é lançado no mesmo minuto — o estoque já baixa ao AGENDAR
-- (Studio MOOD: agendou 29/09 pra 02/10, 0,5 do LUXO 1 saiu na hora).
-- A versão anterior deste trigger (auditoria 29/09, aplicada direto no banco)
-- tirava só o serviço: a comanda ficava aberta cobrando só o produto e o
-- material seguia fora do estoque sem ter saído da prateleira.
--
-- O cancelamento pelo painel da dona já fazia isso na rota
-- (/api/admin/appointments/[id]/cancel · zera invoice_item_id no mesmo
-- update, então este trigger não roda nele). Aqui cobre os outros caminhos:
-- link da cliente, área da profissional, recepção, "faltou".
--
-- Não mexe em comanda com pagamento (dinheiro entrou → estorno é outra
-- conversa) nem em comanda que ainda tem outro atendimento (não dá pra saber
-- de qual atendimento é o produto; a dona decide na comanda).

CREATE OR REPLACE FUNCTION public.atendimento_cancelado_sai_da_comanda()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice_id uuid;
  v_status text;
  v_pagamentos int;
  v_itens_total numeric;
  v_itens_desc numeric;
  v_manual numeric;
  v_restantes int;
  v_outros_appts int;
  v_venda uuid;
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

  SELECT count(*) INTO v_outros_appts
  FROM public.invoice_items WHERE invoice_id = v_invoice_id AND item_type = 'appointment';

  -- Só sobrou produto (combo): cancela as vendas, devolve o estoque e
  -- cancela a comanda. Só as vendas que ainda não estavam canceladas
  -- devolvem (não devolve 2x).
  IF v_outros_appts = 0 THEN
    FOR v_venda IN
      UPDATE public.sales SET status = 'cancelled', paid_at = NULL
      WHERE id IN (
        SELECT reference_id FROM public.invoice_items
        WHERE invoice_id = v_invoice_id AND item_type = 'product' AND reference_id IS NOT NULL
      ) AND status <> 'cancelled'
      RETURNING id
    LOOP
      INSERT INTO public.stock_movements (business_id, product_id, type, quantity, reason)
      SELECT NEW.business_id, si.product_id, 'entry', si.quantity, 'Cancelamento do atendimento (combo)'
      FROM public.sale_items si
      JOIN public.products p ON p.id = si.product_id
      WHERE si.sale_id = v_venda AND si.product_id IS NOT NULL AND p.track_stock IS DISTINCT FROM false;
    END LOOP;
  END IF;

  SELECT count(*), coalesce(sum(total), 0), coalesce(sum(discount), 0)
    INTO v_restantes, v_itens_total, v_itens_desc
  FROM public.invoice_items WHERE invoice_id = v_invoice_id;

  IF v_restantes = 0 OR v_outros_appts = 0 THEN
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
$function$;
