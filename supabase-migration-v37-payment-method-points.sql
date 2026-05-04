-- =================================================================
-- V37 — PAYMENT METHOD: ADICIONA 'points' (resgate de fidelidade)
-- =================================================================
--
-- Contexto: V34 introduziu payment_method com 4 valores fixos
-- (pix, cash, card, courtesy). Em 04/05/2026, ao revisar o fluxo
-- "Atendi + Recebi" decidimos:
--
--   - Adicionar 'points' (cliente trocou pontos do programa de
--     fidelidade pelo serviço — não traz caixa, mas é atendimento
--     real e gera comissão se acordado).
--   - REMOVER 'courtesy' da UI (era confuso misturar "como pagou"
--     com "por que não cobrei"). Cortesia agora vira ação de menu
--     separada, não método de pagamento.
--
-- A coluna no banco MANTÉM 'courtesy' como aceito (legacy) — registros
-- antigos continuam válidos. UI nova nunca produz courtesy.
--
-- IDEMPOTENTE.
-- =================================================================

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_payment_method_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_payment_method_check
  CHECK (
    payment_method IS NULL OR payment_method IN ('pix', 'cash', 'card', 'courtesy', 'points')
  );

-- =================================================================
-- VALIDAÇÃO
-- =================================================================
-- Distribuição atual de métodos (deve aceitar legados):
--   SELECT payment_method, COUNT(*) FROM appointments
--   WHERE payment_method IS NOT NULL GROUP BY payment_method;
