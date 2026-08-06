-- ═══════════════════════════════════════════════════════════════
-- v117 · HORÁRIO QUE VENCEU NÃO É CANCELAMENTO
--
-- Achado na auditoria de 06/08. Quando o prazo do sinal estoura, a v115
-- solta o horário marcando `status = 'cancelled'` — o mesmo estado de quem
-- desmarcou de verdade. Sem nada que separe os dois, entram na mesma conta:
--   · quem nunca confirmou nem pagou (carrinho abandonado)
--   · quem tinha horário e desistiu
--
-- Isso suja justamente a métrica que originou o sinal. O "R$ 5.395 em
-- cancelado ou não comparecido em 30 dias", que foi o argumento pra
-- construir a feature, passaria a crescer sozinho conforme o sinal fosse
-- ligado — e a dona olharia o número achando que perdeu cliente.
--
-- Coluna e não status novo: 'cancelled' continua correto (o horário está
-- livre, a agenda tem que tratar igual). O que faltava era a ORIGEM.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS sinal_expirado_at timestamptz;

COMMENT ON COLUMN appointments.sinal_expirado_at IS
  'Quando o horário foi solto por falta de pagamento do sinal (v115). '
  'NULL = cancelamento de verdade (cliente ou dona desmarcaram). '
  'Preenchido = a cliente nunca confirmou; não contar como cancelamento '
  'em relatório de desistência.';

-- Relatório de cancelamento filtra por aqui; sem índice vira varredura na
-- tabela que mais cresce.
CREATE INDEX IF NOT EXISTS idx_appointments_sinal_expirado
  ON appointments (business_id, appointment_date)
  WHERE sinal_expirado_at IS NOT NULL;
