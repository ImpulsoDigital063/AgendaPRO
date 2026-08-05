-- ═══════════════════════════════════════════════════════════════
-- v113 · REGRA DE CANCELAMENTO DO SINAL
--
-- Regra ditada pela Wanessa Silva (05/08/2026), que é quem pediu o sinal:
--
--   "Cancelamento em até 24h ela pode reagendar, eu não devolvo valor."
--   "Cancelamento após 24h00 antes do procedimento a cliente perde o sinal."
--   "Cancelamento antes das 24h00, o valor fica disponível por até 30 dias
--    pra fazer um novo agendamento."
--
-- Traduzido em sistema:
--   · REMARCAR com +24h  → o sinal segue pro novo horário (é o mesmo
--     atendimento, então não mexe em dinheiro nenhum)
--   · CANCELAR com +24h  → o sinal vira CRÉDITO na ficha, válido 30 dias
--   · qualquer coisa com menos de 24h → perde o sinal
--   · em nenhum caso volta dinheiro — é crédito, não estorno
--
-- 24h e 30 dias são os números DELA. Clínica de procedimento caro pode
-- querer 48h; barbearia, 2h. Por isso viram configuração, com o valor
-- dela como padrão.
--
-- ⚠️ O CRÉDITO ABATE O PRÓXIMO SINAL (decisão do Eduardo, 05/08). Sem
-- isso o crédito seria inútil justamente no caso que o criou: a cliente
-- cancelou, ganhou R$ 9 de crédito, e ao remarcar pelo link o sistema
-- pediria outro PIX de R$ 9. Ela pagaria duas vezes pra usar o que já é
-- dela. Por isso `used_in_appointment_id` — o crédito existente pode ser
-- consumido no ato do agendamento, não só no fechamento da comanda.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS sinal_cancel_horas integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS sinal_credito_dias integer NOT NULL DEFAULT 30;

COMMENT ON COLUMN businesses.sinal_cancel_horas IS
  'Antecedência mínima (horas) para cancelar sem perder o sinal. Padrão 24, '
  'que é a regra da Wanessa. Abaixo disso o sinal é retido.';
COMMENT ON COLUMN businesses.sinal_credito_dias IS
  'Validade (dias) do crédito gerado quando a cliente cancela dentro do prazo.';

ALTER TABLE customer_credits
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS used_in_appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL;

COMMENT ON COLUMN customer_credits.expires_at IS
  'Quando o crédito perde a validade. NULL = não expira — é o comportamento '
  'de todo crédito criado antes da v113, que continua valendo pra sempre.';
COMMENT ON COLUMN customer_credits.used_in_appointment_id IS
  'Crédito consumido para pagar o SINAL deste agendamento. Diferente de '
  'used_in_invoice_id, que é consumo no fechamento da comanda.';

-- Busca do crédito disponível no ato do agendamento: por cliente, ainda não
-- usado (nem em comanda, nem em sinal) e dentro da validade.
CREATE INDEX IF NOT EXISTS idx_credits_disponivel
  ON customer_credits (business_id, customer_id)
  WHERE used_in_invoice_id IS NULL AND used_in_appointment_id IS NULL;
