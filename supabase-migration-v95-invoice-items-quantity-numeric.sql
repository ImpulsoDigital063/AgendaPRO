-- ============================================================
-- v95 · invoice_items.quantity: integer -> numeric
-- ============================================================
-- Cravado 21/07/2026 · BUG REAL pego em teste local antes do deploy.
--
-- O QUE ACONTECIA:
-- Ao aplicar um combo com fração (0,5 pacote de cabelo · Studio Mood):
--   1. sale_items.quantity  = numeric -> aceita 0,5 -> trigger v66 BAIXA ESTOQUE
--   2. invoice_items.quantity = integer -> REJEITA 0,5 -> rota devolve 500
--   3. resultado: material sai do estoque e NÃO entra na comanda
--      (comanda fechou em R$195 em vez de R$290 · R$95 perdidos por
--       atendimento, silenciosamente)
--
-- As duas tabelas discordavam sobre o mesmo dado. Esta migration alinha.
--
-- ANÁLISE DE IMPACTO (feita antes, 21/07):
--  · 1.342 linhas em invoice_items na base inteira.
--  · TODAS com quantity = 1 (único valor distinto) -> nenhum dado quebra.
--  · integer -> numeric é widening: todo valor antigo continua válido,
--    sem USING, sem perda.
--  · Nenhum consumidor força inteiro: varredura por parseInt / Math.round /
--    Math.floor / Math.ceil em src/app/api/admin/invoices/ e
--    src/components/admin/comandas/ não retornou nada.
--  · sale_items.quantity JÁ é numeric (não precisa mexer).
--
-- PENDÊNCIA SEPARADA (não resolvida aqui · é código, não schema):
-- a rota invoices/[id]/items faz rollback da `sale` quando o insert do
-- invoice_item falha (route.ts:193-196), mas NÃO reverte o stock_movement
-- já gerado pelo trigger. Estoque fica baixado sem venda associada.
-- Só aparecia quando o insert falhava — o que esta migration passa a evitar,
-- mas o rollback incompleto continua lá pra outros modos de falha.
-- ============================================================

ALTER TABLE public.invoice_items
  ALTER COLUMN quantity TYPE numeric(10, 3);

COMMENT ON COLUMN public.invoice_items.quantity IS
  'Quantidade do item na comanda. NUMERIC pra aceitar fração de embalagem (ex: 0,5 pacote de cabelo consumido num combo · v95).';

-- ============================================================
-- VERIFICAÇÃO (deve voltar numeric / 10 / 3)
-- ============================================================
-- SELECT column_name, data_type, numeric_precision, numeric_scale
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'invoice_items' AND column_name = 'quantity';
