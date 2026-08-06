-- v118 · Dispensar o sinal de quem a dona confia
--
-- Pergunta do Eduardo em 06/08: "e se elas quiserem ativar o sinal mas não
-- cobrar de todas? muitas vezes já tem ali as clientes de confiança que nem
-- precisa cobrar".
--
-- Hoje é liga/desliga por negócio: ligou, todo agendamento com valor gera
-- sinal. Não existe isenção — e o atalho que a dona descobre sozinha faz ela
-- PERDER DINHEIRO. Sem opção de dispensar, ela abre o atendimento e clica em
-- "Recebi o sinal" sem ter recebido, só pra confirmar o horário. Isso grava
-- sinal_pago_at; depois, ao faturar a comanda de R$ 50, o sistema abate os
-- R$ 10 do sinal e cobra R$ 40. Ela perde os R$ 10 e não percebe, porque
-- todas as telas dizem que está certo.
--
-- Duas saídas, porque são dois casos diferentes:
--   · sinal_isento na ficha — a cliente antiga que nunca falta, que não faz
--     sentido cobrar TODA vez
--   · botão "dispensar" no atendimento — "hoje eu não vou cobrar dessa"
-- Nenhuma das duas finge que houve pagamento.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS sinal_isento boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN customers.sinal_isento IS
  'Cliente de confiança: não gera sinal ao agendar, mesmo com o sinal ligado no negócio. v118.';

-- Quem tem muita cliente isenta vai filtrar por isso na ficha; e a checagem
-- roda em todo agendamento quando o negócio cobra sinal.
CREATE INDEX IF NOT EXISTS idx_customers_sinal_isento
  ON customers(business_id) WHERE sinal_isento = true;
