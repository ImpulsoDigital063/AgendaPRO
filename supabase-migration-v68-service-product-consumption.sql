-- ============================================================
-- v68 · Service ↔ Produto (consumo interno automático)
-- ============================================================
-- Cravado 22/05/2026 após drilldown CIC dos blocos 4-5 do Salão99:
-- eles têm tab "Uso de Produtos" dentro do serviço · ao fechar
-- atendimento o estoque cai automaticamente. Replicamos com mesma UX
-- + edge case "consumo não baixado" pra reconciliação.
--
-- Universal · serve Palace (esmalte/cera por serviço) e Studio Mood
-- (creme/gel/jumbo consumido em hidratação/instalação de tranças).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.service_product_consumption (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  -- Quantidade consumida por execução · ex: hidratação consome 30ml de creme
  quantity decimal(10, 3) NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Mesma combinação não duplica
  UNIQUE (service_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_service_product_consumption_service
  ON public.service_product_consumption (service_id);

CREATE INDEX IF NOT EXISTS idx_service_product_consumption_business
  ON public.service_product_consumption (business_id);

-- ============================================================
-- TRIGGER: ao fechar atendimento (status='completed' OU paid_at
-- preenchido vindo de NULL), baixa o estoque dos produtos vinculados
-- via service_id do appointment.
--
-- Edge case (cravado por Eduardo no drilldown CIC):
-- - Se produto não tem estoque suficiente, registra movimento mesmo
--   assim com reason 'Consumo não baixado · estoque insuficiente'
--   pra reconciliação posterior. NÃO bloqueia o fechamento.
-- - Respeita track_stock=false (não baixa produto sem controle)
-- - Respeita appointment_services (multi-serviços do mesmo appt)
-- ============================================================
CREATE OR REPLACE FUNCTION public.consume_service_products()
RETURNS TRIGGER AS $$
DECLARE
  consumption_record RECORD;
  appt_service_ids uuid[];
BEGIN
  -- Só dispara se: passou de não-completed pra completed OU paid_at virou not null
  IF (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed'))
     OR (NEW.paid_at IS NOT NULL AND OLD.paid_at IS NULL)
  THEN
    -- Coleta service_id principal + appointment_services
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

    -- Pra cada produto vinculado a esses serviços
    FOR consumption_record IN
      SELECT
        spc.product_id,
        spc.quantity,
        p.track_stock,
        p.quantity AS current_stock,
        p.name AS product_name
      FROM public.service_product_consumption spc
      INNER JOIN public.products p ON p.id = spc.product_id
      WHERE spc.service_id = ANY(appt_service_ids)
        AND spc.business_id = NEW.business_id
        AND p.active = true
    LOOP
      -- Pula produtos sem controle de estoque
      IF consumption_record.track_stock IS NOT TRUE THEN
        CONTINUE;
      END IF;

      -- Insere movimento (negativo · trigger v63 atualiza products.quantity)
      -- Mesmo se estoque insuficiente, registra (vira negativo) com reason claro
      INSERT INTO public.stock_movements (
        business_id, product_id, type, quantity, reason
      ) VALUES (
        NEW.business_id,
        consumption_record.product_id,
        'exit',
        -consumption_record.quantity,
        CASE
          WHEN consumption_record.current_stock < consumption_record.quantity
          THEN 'Consumo no atendimento · estoque insuficiente (reconciliar)'
          ELSE 'Consumo no atendimento'
        END
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_consume_service_products ON public.appointments;
CREATE TRIGGER trg_consume_service_products
  AFTER UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.consume_service_products();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.service_product_consumption ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dono gerencia service_product_consumption" ON public.service_product_consumption;
CREATE POLICY "dono gerencia service_product_consumption" ON public.service_product_consumption
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "recep ve service_product_consumption" ON public.service_product_consumption;
CREATE POLICY "recep ve service_product_consumption" ON public.service_product_consumption
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.professionals
      WHERE business_id = service_product_consumption.business_id
        AND auth_user_id = auth.uid()
        AND is_receptionist = true
    )
  );
