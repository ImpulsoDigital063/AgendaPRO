-- ============================================================
-- v150 · Reserva da comanda durante o pagamento (anti clique duplo)
-- Auditoria da comanda · 29/09/2026 (M5)
-- ============================================================
--
-- Dois toques rápidos em "Pix" (ou dois aparelhos) no Faturar/Receber
-- pagamento: as duas requisições liam a comanda ainda ABERTA e gravavam
-- pagamento em dobro (e, no Faturar com produto, baixavam o estoque 2x).
--
-- invoices.fechando_desde = "alguém começou a pagar esta comanda em ...".
-- A rota só segue se conseguir marcar (update condicional: vazio ou mais
-- velho que 2 min). A segunda requisição não consegue e recebe 409.
-- Se a primeira falhar no meio, a reserva vence sozinha em 2 minutos —
-- ninguém fica travado. Comanda fechada não precisa limpar (status manda).
-- ============================================================

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS fechando_desde timestamptz;

-- Verificação:
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name = 'invoices' AND column_name = 'fechando_desde';
