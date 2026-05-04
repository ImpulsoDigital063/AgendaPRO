-- =================================================================
-- V39 — DEFESA EM PROFUNDIDADE: trigger anti cross-business em points
-- =================================================================
--
-- Contexto: V38 fechou RLS pública em points_transactions. service_role
-- continua tendo acesso (necessário pra triggers e admin lookup).
--
-- Mas service_role bypass RLS NA PORTA DE ENTRADA. Se um bug de código
-- (ou comprometimento de service_role key) levar a INSERT com
-- customer_id de UM business e business_id de OUTRO business, a row
-- entra. Isso permitiria:
--   - Atacante com service_role inserir pontos pra customer alheio
--   - Bug em código admin acidentalmente cruza dados entre businesses
--
-- Esta migration adiciona validação NO BANCO via trigger BEFORE INSERT
-- /UPDATE. Mesmo se RLS for burlada, banco rejeita inconsistência.
-- Defesa em profundidade clássica: 2 camadas independentes.
--
-- Trigger valida:
--   1. customer_id.business_id == NEW.business_id  (anti cross-business)
--
-- IDEMPOTENTE.
-- =================================================================

CREATE OR REPLACE FUNCTION validate_points_business_match()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_business uuid;
BEGIN
  -- Skip se customer_id ou business_id null (pode acontecer em edge cases)
  IF NEW.customer_id IS NULL OR NEW.business_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT business_id INTO v_customer_business
  FROM customers
  WHERE id = NEW.customer_id;

  -- Se customer não existe, deixa o FK constraint reclamar (não nosso problema)
  IF v_customer_business IS NULL THEN
    RETURN NEW;
  END IF;

  -- Cross-business detected: rejeita
  IF v_customer_business <> NEW.business_id THEN
    RAISE EXCEPTION 'Cross-business violation: customer % pertence ao business %, não ao business %',
      NEW.customer_id, v_customer_business, NEW.business_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_points_business_match ON points_transactions;
CREATE TRIGGER trg_validate_points_business_match
BEFORE INSERT OR UPDATE OF customer_id, business_id ON points_transactions
FOR EACH ROW
EXECUTE FUNCTION validate_points_business_match();

-- =================================================================
-- VALIDAÇÃO PÓS-MIGRATION
-- =================================================================
-- Confirma que o trigger existe:
--   SELECT tgname FROM pg_trigger WHERE tgname = 'trg_validate_points_business_match';
--
-- Teste manual (deve falhar com cross-business):
--   INSERT INTO points_transactions (customer_id, business_id, points, reason)
--   VALUES ('<customer_de_business_A>', '<business_B>', 10, 'service');
--   ERROR:  Cross-business violation: customer ... pertence ao business ...
