-- ============================================================
-- v148 · Estoque: recepção grava de verdade + consumo em serviço uma vez só
-- Auditoria do módulo de produtos · 28/09/2026 (T17 + T18)
-- ============================================================
--
-- T17 · RECEPÇÃO
-- A recepcionista só tinha SELECT em products (v63). Editar/excluir produto
-- e ajustar estoque mostravam "Salvo!" e não gravavam: o movimento entrava
-- no histórico (ela tem INSERT em stock_movements) mas o UPDATE do trigger
-- apply_stock_movement rodava com a permissão DELA e atingia 0 linhas.
--  1. apply_stock_movement vira SECURITY DEFINER: quem pode movimentar
--     continua decidido pela RLS de stock_movements; o trigger só aplica.
--  2. Recepção ganha UPDATE em products do próprio negócio (edição e
--     "excluir" = active=false). INSERT/DELETE físico continuam só do dono.
--
-- T18 · CONSUMO DE PRODUTO EM SERVIÇO (v68)
-- O trigger baixava quando status virava 'completed' OU quando paid_at saía
-- de NULL — no fluxo comum são dois UPDATEs, então baixava 2x. E nada
-- devolvia o material quando o atendimento era cancelado ou o item saía da
-- comanda (e ao faturar de novo baixava mais uma vez).
-- Agora: "consumido" = status completed OU pago. Baixa quando passa de
-- não-consumido pra consumido; devolve quando volta de consumido pra não.
-- SECURITY DEFINER também aqui: profissional que marca "atendido" não tem
-- INSERT em stock_movements e o UPDATE do atendimento falhava.
-- Limite: a devolução usa a receita de consumo ATUAL do serviço.
--
-- Em 28/09 nenhum negócio tinha regra de consumo cadastrada e nenhuma
-- recepcionista tinha movimentado estoque — nada a reconciliar.
-- ============================================================

-- ── T17.1 · trigger de estoque com permissão do dono da função ──────────
CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET quantity = quantity + NEW.quantity,
      updated_at = now()
  WHERE id = NEW.product_id
    AND business_id = NEW.business_id; -- movimento só mexe em produto do mesmo negócio
  RETURN NEW;
END;
$$;

-- ── T17.2 · recepção edita produto do próprio negócio ───────────────────
DROP POLICY IF EXISTS "recepcao edita produtos" ON public.products;
CREATE POLICY "recepcao edita produtos" ON public.products
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.professionals
      WHERE business_id = products.business_id
        AND auth_user_id = auth.uid()
        AND is_receptionist = true
        AND active = true
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.professionals
      WHERE business_id = products.business_id
        AND auth_user_id = auth.uid()
        AND is_receptionist = true
        AND active = true
    )
  );

-- ── T18 · consumo em serviço: uma baixa, com devolução ──────────────────
CREATE OR REPLACE FUNCTION public.consume_service_products()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  consumption_record RECORD;
  appt_service_ids uuid[];
  era_consumido boolean;
  agora_consumido boolean;
  sinal integer;
BEGIN
  era_consumido   := (OLD.status = 'completed') OR (OLD.paid_at IS NOT NULL);
  agora_consumido := (NEW.status = 'completed') OR (NEW.paid_at IS NOT NULL);

  IF agora_consumido = era_consumido THEN
    RETURN NEW; -- nada mudou do ponto de vista do material
  END IF;
  sinal := CASE WHEN agora_consumido THEN -1 ELSE 1 END; -- -1 baixa · +1 devolve

  -- service_id principal + appointment_services
  appt_service_ids := ARRAY[]::uuid[];
  IF NEW.service_id IS NOT NULL THEN
    appt_service_ids := array_append(appt_service_ids, NEW.service_id);
  END IF;

  SELECT array_agg(service_id) INTO appt_service_ids
  FROM (
    SELECT unnest(appt_service_ids) AS service_id
    UNION
    SELECT service_id FROM public.appointment_services WHERE appointment_id = NEW.id
  ) AS combined
  WHERE service_id IS NOT NULL;

  FOR consumption_record IN
    SELECT
      spc.product_id,
      spc.quantity,
      p.track_stock,
      p.quantity AS current_stock
    FROM public.service_product_consumption spc
    INNER JOIN public.products p ON p.id = spc.product_id
    WHERE spc.service_id = ANY(appt_service_ids)
      AND spc.business_id = NEW.business_id
      AND p.active = true
  LOOP
    IF consumption_record.track_stock IS NOT TRUE THEN
      CONTINUE;
    END IF;

    INSERT INTO public.stock_movements (
      business_id, product_id, type, quantity, reason
    ) VALUES (
      NEW.business_id,
      consumption_record.product_id,
      CASE WHEN sinal < 0 THEN 'exit' ELSE 'entry' END,
      sinal * consumption_record.quantity,
      CASE
        WHEN sinal > 0 THEN 'Consumo devolvido · atendimento desfeito'
        WHEN consumption_record.current_stock < consumption_record.quantity
          THEN 'Consumo no atendimento · estoque insuficiente (reconciliar)'
        ELSE 'Consumo no atendimento'
      END
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- trigger já existe (v68) e aponta pra mesma função · recria por garantia
DROP TRIGGER IF EXISTS trg_consume_service_products ON public.appointments;
CREATE TRIGGER trg_consume_service_products
  AFTER UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.consume_service_products();

-- ── Verificação (rodar depois; tem que listar as duas com prosecdef = true)
-- SELECT proname, prosecdef FROM pg_proc
--  WHERE proname IN ('apply_stock_movement','consume_service_products');
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'products';
