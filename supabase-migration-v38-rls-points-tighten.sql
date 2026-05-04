-- =================================================================
-- V38 — RLS HARDENING: points_transactions (gap V3)
-- =================================================================
--
-- Vulnerabilidade encontrada na auditoria 04/05/2026:
--
-- V3 (2024) criou points_transactions com 3 políticas:
--   1. "publico ver points" → SELECT (true)        ❌ qualquer um lê
--   2. "publico inserir points" → INSERT (true)    ❌ FRAUDE: atacante
--      pode dar 999.999 pts pra si mesmo via curl direto no Supabase
--   3. "dono gerencia points" → ALL (owner check)  ✅ correto
--
-- Risco real: cliente final via anon key consegue:
--   - INSERT manualmente { customer_id: "meu_uuid", points: 999999 }
--   - Sistema soma e ele troca por brindes infinitos
--
-- Esta migration:
--   - Remove as 2 políticas públicas (SELECT + INSERT)
--   - Mantém "dono gerencia" (admin do business via auth.uid())
--   - service_role bypassa RLS naturalmente — triggers SQL e
--     /api/customer-lookup continuam funcionando normalmente
--
-- Quem fica BLOQUEADO depois disso:
--   ❌ Cliente final via anon key (NÃO é caso de uso legítimo)
--   ❌ Atacante forjando inserts (objetivo da migration)
--
-- Quem continua funcionando:
--   ✅ Admin no painel (auth.uid() = owner) → "dono gerencia"
--   ✅ /api/customer-lookup (service_role bypass)
--   ✅ Trigger credit_points_on_confirm (V15) — roda como definer,
--      bypassa RLS
--   ✅ Cron jobs (service_role)
--
-- IDEMPOTENTE.
-- =================================================================

DROP POLICY IF EXISTS "publico ver points" ON points_transactions;
DROP POLICY IF EXISTS "publico inserir points" ON points_transactions;

-- A política "dono gerencia points" já existe (V3) e cobre dono.
-- Não recriar — mas validar:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'points_transactions'
      AND policyname = 'dono gerencia points'
  ) THEN
    RAISE NOTICE 'WARNING: política "dono gerencia points" não encontrada — RLS pode estar bloqueando admin';
  END IF;
END $$;

-- =================================================================
-- VALIDAÇÃO PÓS-MIGRATION
-- =================================================================
-- Confirmar que só 1 política sobrou:
--   SELECT policyname, cmd FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'points_transactions';
-- Esperado: 1 row (dono gerencia points / ALL)
--
-- Confirmar que tentativa anon de SELECT/INSERT é bloqueada:
--   (testar via Postman com anon key — esperado 401/403/empty)
