-- =================================================================
-- v85 · Expiração automática de TRIAL / CORTESIA
--
-- Problema (cravado 07/06/2026): o gate de acesso (layout.tsx) só bloqueia
-- por `status`, nunca por data. O cron billing-check só processa PIX. Logo,
-- trial/cortesia (active, sem renovação automática) NUNCA vira o status
-- quando pago_ate vence → vira acesso grátis vitalício.
--
-- Fix: cron passa a expirar esses casos (vira pending_payment = paywall).
-- Mas cortesia PERMANENTE (ex: Palace) não pode ser bloqueada. Esse flag
-- marca quem é isento.
-- =================================================================

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS permanent_courtesy boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.subscriptions.permanent_courtesy IS
  'true = cortesia vitalícia, NUNCA expira/bloqueia (ex: Palace). false (default) = trial/cortesia normal, expira no pago_ate via cron billing-check.';

DO $$ BEGIN RAISE NOTICE 'v85 ok · subscriptions.permanent_courtesy criado (default false)'; END $$;
