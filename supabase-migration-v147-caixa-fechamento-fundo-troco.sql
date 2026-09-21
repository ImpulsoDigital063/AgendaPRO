-- =================================================================
-- v147 · cash_closings.opening_amount_cents (fundo de troco no fechamento)
--
-- JÁ APLICADA EM PRODUÇÃO em 21/09/2026 pelo Eduardo, no SQL Editor.
-- Este arquivo existe pra um banco novo nascer igual ao de produção.
--
-- O que aconteceu: o caixa de balcão (v83, portado do Palace em 07/06)
-- grava `opening_amount_cents` DENTRO do fechamento — é o fundo de troco do
-- dia congelado no histórico. A v83 criou essa coluna só em `cash_openings`
-- e esqueceu `cash_closings`. Resultado: TODO "Fechar caixa do dia" falhava
-- com "Could not find the 'opening_amount_cents' column of 'cash_closings'
-- in the schema cache". De 07/06 a 21/09 a tabela ficou com ZERO linhas:
-- nenhum negócio conseguiu fechar o caixa. Quem reportou foi o Gustavo Souza
-- Hair, no primeiro dia como pagante.
--
-- Provado depois de aplicar: fechamento com login de dona (RLS real) num
-- negócio descartável → 201 e lido de volta com a coluna preenchida.
-- =================================================================

-- Fundo de troco do dia no momento do fechamento (cópia de cash_openings).
ALTER TABLE public.cash_closings
  ADD COLUMN IF NOT EXISTS opening_amount_cents BIGINT;

-- Faz o PostgREST enxergar a coluna na hora (o erro era de "schema cache").
NOTIFY pgrst, 'reload schema';
