-- =====================================================================
-- v43 — Permitir provider='cortesia' em subscriptions
-- =====================================================================
-- Bug descoberto em 14/05/2026 ao tentar ativar trial da Leticia (Viva
-- Cacheada): o script `grant-trial-viva-cacheada.sql` seta provider='cortesia',
-- mas a CHECK constraint criada na v40 (subscriptions_provider_check) só
-- aceita 'mercado_pago' ou 'asaas'. Migration falhava com SQLSTATE 23514.
--
-- Cortesia é caso real e recorrente:
--  · Leticia / Viva Cacheada (trial 90 dias em troca de divulgação)
--  · Futuros parceiros (vídeo-makers, agências, indicadores)
--  · Cortesia interna pra QA / time
--
-- Esta migration:
--  1. Remove a constraint antiga
--  2. Cria nova constraint aceitando os 3 valores
--
-- IDEMPOTENTE. Additive (não remove valores existentes — só adiciona um).
-- Zero impacto em registros atuais — nenhum tem provider='cortesia' ainda.
-- =====================================================================

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_provider_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_provider_check
  CHECK (provider IN ('mercado_pago', 'asaas', 'cortesia'));

COMMENT ON COLUMN public.subscriptions.provider IS
  'Provider de pagamento ativo: mercado_pago (legado) | asaas (novo) | cortesia (trial gratuito · não entra no cron de billing).';

-- =====================================================================
-- VALIDAÇÃO PÓS-MIGRATION
-- =====================================================================
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conname = 'subscriptions_provider_check';
-- → esperado: CHECK (provider IN ('mercado_pago','asaas','cortesia'))
-- =====================================================================
