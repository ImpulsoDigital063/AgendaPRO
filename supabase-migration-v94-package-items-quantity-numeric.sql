-- ============================================================
-- v94 · package_items.quantity: integer -> numeric
-- ============================================================
-- Cravado 21/07/2026 · caso Studio Mood (Izanara, trancista).
--
-- POR QUÊ:
-- O combo dela é trança (serviço R$195) + cabelo. O cabelo vem em
-- pacote de 9 gomos (R$139,90) e ela usa 4,5 gomos por cliente —
-- ou seja, MEIO pacote. Rende 2 clientes por pacote.
-- Com `quantity integer` esse combo não entra: 0,5 é rejeitado.
--
-- Fração já foi PROVADA no banco (21/07, tenant de teste): vínculo
-- de 0,5 baixou estoque 5 -> 4,5 -> 4,0, com stock_movements de
-- -0.5. `products.quantity`, `stock_movements.quantity` e
-- `service_product_consumption.quantity` já são numeric.
-- `package_items.quantity` é a única peça ainda integer.
--
-- ANÁLISE DE IMPACTO (feita antes, 21/07):
--  · package_items tem 0 LINHAS na base inteira (nenhum negócio
--    cadastrou pacote/combo) -> zero risco de dado existente.
--  · integer -> numeric é widening: todo valor antigo continua
--    válido, sem USING, sem perda.
--  · Leitores (todos usam Number(), nenhum parseInt/isInteger):
--      api/admin/packages/route.ts:45          Number(obj.quantity)
--      api/admin/packages/[id]/route.ts:92     Number(it.quantity)
--      api/admin/packages/sell/route.ts:84
--      components/admin/pacotes/PacoteFormModal.tsx:105,138
--      components/admin/pacotes/PacotesView.tsx:196-199
--      components/admin/clientes/VenderPacoteModal.tsx:93,96
--      app/admin/(protected)/pacotes/page.tsx:32
--      app/recepcao/(protected)/pacotes/page.tsx:35
--  · Validação do server JÁ aceita fração:
--      packages/route.ts:46  if (!Number.isFinite(qty) || qty <= 0)
--  · Form JÁ aceita fração: PacoteFormModal.tsx:328  step={0.01}
--  -> a coluna era o ÚNICO bloqueio.
--
-- NÃO MEXE em customer_package_balances.sessions_total/sessions_used
-- (continuam integer) — sessão de pacote é contagem inteira, é outro
-- conceito. Só o item do catálogo passa a aceitar fração.
-- ============================================================

ALTER TABLE public.package_items
  ALTER COLUMN quantity TYPE numeric(10, 3);

-- DEFAULT 1 e CHECK (quantity > 0) continuam válidos com numeric.
-- Reafirma o default explicitamente (ALTER TYPE preserva, mas deixa cravado).
ALTER TABLE public.package_items
  ALTER COLUMN quantity SET DEFAULT 1;

COMMENT ON COLUMN public.package_items.quantity IS
  'Quantidade do item consumida por execução do combo. NUMERIC pra aceitar fração de embalagem (ex: 0,5 pacote de cabelo · Studio Mood v94).';

-- ============================================================
-- VERIFICAÇÃO (rodar depois, deve retornar numeric)
-- ============================================================
-- SELECT column_name, data_type, numeric_precision, numeric_scale, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'package_items' AND column_name = 'quantity';
