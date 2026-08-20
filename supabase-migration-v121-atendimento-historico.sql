-- v121 · 20/08/2026 · lançamento de atendimento ANTIGO (histórico) na ficha
--
-- Pedido da Wanessa Silva Estética (19/08, WhatsApp): "poder adicionar os
-- procedimentos com data retroativa... queremos colocar os antigos. Se não
-- fica só como observação". Toda cliente que migra de papel/outro sistema
-- chega com histórico pra trazer — por isso vale pra todos os negócios.
--
-- SEMÂNTICA CRAVADA (Eduardo, 20/08): é REGISTRO, não dinheiro.
--   · nasce status='completed' ⇒ o gatilho da v70/v71 NÃO cria comanda
--   · total_price = 0          ⇒ fica fora de "Em aberto" no financeiro,
--                                que exige total_price > 0
--   · sem sinal, sem comissão, sem pontos (todos dependem de invoice/pago)
--
-- A coluna existe pra que a tela saiba dizer "registro antigo" e pra que
-- qualquer relatório futuro consiga separar histórico importado de
-- atendimento que o sistema de fato operou. NULL/false = tudo que existe
-- hoje: esta migration não muda uma linha sequer da base atual.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS historical BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN appointments.historical IS
  'true = atendimento ANTIGO lancado a mao na ficha do cliente (v121). Registro de historico: nasce completed, total_price 0, sem comanda/comissao/pontos. false = atendimento operado pelo sistema.';

-- λ.prova-na-fonte — depois de rodar:
--   SELECT count(*) FILTER (WHERE historical) AS historicos,
--          count(*) FILTER (WHERE NOT historical) AS operados
--     FROM appointments;
--   -- esperado logo apos a migration: historicos = 0
