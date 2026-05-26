-- ============================================================
-- v77 · HOTFIX P0 · Trigger auto-invoice precisa de SECURITY DEFINER
-- ============================================================
-- Bug reportado por Olímpio (Palmas) em 26/05/2026 09:34:
--   "desde ontem os clientes não conseguem agendar"
--   Cliente público (Donis · 63 98475-0554) tentou Corte Degrade R$40 às
--   14:30 do dia 26/05 e recebeu "Erro ao agendar. Tente novamente."
--
-- Causa raiz:
--   1. Trigger v70/v71 auto_create_invoice_for_appointment dispara AFTER
--      INSERT em appointments e cria invoice + invoice_item.
--   2. Trigger foi declarado sem SECURITY DEFINER · roda com o role do
--      caller (anon, quando o cliente público faz booking).
--   3. RLS "invoices_business_access" (v54) só permite acesso quando o
--      auth.uid() é dono do business OU recep ativa. Anon não é nenhum
--      dos dois.
--   4. Resultado: INSERT em appointments dispara trigger → trigger tenta
--      INSERT em invoices → bloqueado por RLS → erro propaga → INSERT
--      do appointment é cancelado → BookingFlow.tsx mostra erro genérico.
--
-- Por que demorou pra explodir:
--   - Trigger entrou em prod 24/05. Primeiro cliente público que tentou
--     agendar depois disso bateu no bug. Olímpio reportou 26/05.
--   - Fluxo /admin (autenticado) não quebra · auth.uid() bate em RLS.
--
-- Fix:
--   Adiciona SECURITY DEFINER + SET search_path = public na função.
--   Função passa a rodar com permissão do owner do DB (postgres) que tem
--   bypass nativo de RLS. Continua segura porque a função:
--   - É AFTER INSERT em appointments (não pode ser chamada solta · vide
--     CREATE TRIGGER abaixo)
--   - Só insere na invoice do business do NEW appointment
--   - Tem checks defensivos (status, invoice_item_id já existe)
--
-- search_path explícito = mitigação contra hijack via schema (pattern
-- recomendado por Supabase pra SECURITY DEFINER).
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_create_invoice_for_appointment()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
  v_invoice_number int;
  v_invoice_item_id uuid;
BEGIN
  -- Só cria comanda automática pra agendamentos vivos (pending/confirmed).
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

-- Trigger já existe (v70/v71) · CREATE OR REPLACE FUNCTION basta.
-- Reafirma só pra garantir consistência:
DROP TRIGGER IF EXISTS trg_auto_invoice_for_appointment ON public.appointments;
CREATE TRIGGER trg_auto_invoice_for_appointment
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_invoice_for_appointment();

-- ============================================================
-- VALIDAÇÃO PÓS-APLICAÇÃO
-- ============================================================
-- Confirma SECURITY DEFINER:
--   SELECT proname, prosecdef
--   FROM pg_proc
--   WHERE proname = 'auto_create_invoice_for_appointment';
--   Esperado: prosecdef = t (true)
--
-- Teste prático: pedir o Olímpio mandar o Donis tentar de novo, ou
-- agendar manualmente via /palmas-do-olimpio em aba anônima.
-- ============================================================
