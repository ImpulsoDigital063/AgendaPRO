-- v122 · 28/08/2026 — serviço mais longo que o turno pode atravessar o intervalo
--
-- PROBLEMA (reporte do Diogo, DN Diogo Nogueira, 21/08):
-- "quando cliente quiser marcar manhã e tarde não consegue".
-- O expediente dele é partido em dois períodos (08:30-12:00 e 13:30-17:00, 210min
-- cada) e generateSlots exige que o serviço INTEIRO caiba dentro de UM período
-- (`current + dur <= endMin`). Logo nenhum agendamento atravessa o almoço, e quem
-- precisa do dia todo só consegue meio período. Ele vinha bloqueando os dias na mão.
--
-- REGRA (derivada, não é botão por serviço):
-- com a chave ligada, o serviço que NÃO CABE em nenhum período do dia passa a ser
-- oferecido na janela contínua (início do primeiro período → fim do último). O
-- serviço que cabe continua preso ao turno, então o intervalo segue protegido
-- pra tudo que não precisa dele.
--
-- POR QUE DERIVADA DA DURAÇÃO E NÃO UMA COLUNA EM services:
-- o Diogo edita o próprio cadastro e já apagou/recriou um serviço em vez de editar
-- (29/07). Um campo invisível pra ele morreria em silêncio na recriação; a duração
-- ele mesmo controla.
--
-- DEFAULT false: sem isso, todo tenant com serviço mais longo que o turno passaria
-- a permitir marcação em cima do intervalo sem ter pedido.
--
-- ⚠️ ORDEM: rodar ESTE ARQUIVO ANTES do push. O link público seleciona os campos do
-- business por nome; coluna inexistente no select devolve erro, o notFound() dispara
-- e o /[slug] de TODOS os tenants cai em 404 (provado em 30/07 na v100).

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS servico_longo_atravessa_intervalo boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN businesses.servico_longo_atravessa_intervalo IS
  'Serviço que não cabe em nenhum período do dia é oferecido na janela contínua, atravessando o intervalo. false = comportamento histórico (serviço preso ao turno).';
