-- ============================================================
-- v78 · Slot extra de profissional por business
-- ============================================================
-- Eduardo cravou 26/05/2026: liberar +1 prof pro Marko (Palace) sem
-- mudar regras globais. Marko tem freelancers entrando/saindo e
-- precisa de mais flexibilidade que o limite Equipe (5).
--
-- Solução: coluna `subscriptions.extra_professional_slots` (INTEGER
-- NOT NULL DEFAULT 0) que SOMA ao limite do plano. Trigger v47
-- atualizado pra considerar.
--
-- Pra Marko: UPDATE manual pra setar extra_professional_slots = 1.
-- Pra outros: stay 0 (sem mudança).
--
-- Vantagens:
--   1. Reversível (UPDATE pra 0 volta ao normal)
--   2. Vira upsell futuro ("+1 prof por R$X/mês")
--   3. Sem mudar pricing global · mantém posicionamento
--   4. Recep continua fora do limite (regra v47 preservada)
--
-- ─── Checklist aplicado ─────────────────────────────────────
-- 1. Quem dispara? Adm autenticado (sempre). Zero anon. Sem RLS risk.
-- 2. Tabelas tocadas: subscriptions (add column), professionals
--    (trigger BEFORE INSERT lê subscription).
-- 3. Dado obrigatório: DEFAULT 0 garante nunca null · backfill auto.
-- 4. Fluxo prod:
--    - Olímpio (Solo, extra=0): limite 2 inalterado · zero impacto
--    - Marko (Equipe, extra=1 pós UPDATE): limite passa de 5 → 6
--    - Letícia (recep): não conta no limite (regra v47 preservada)
-- 5. Schema: additive. Sem RLS nova. Trigger atualizado preservando
--    semântica anterior quando extra=0.
-- 6. Se quebrar: RAISE EXCEPTION continua firme. COALESCE(extra, 0)
--    mata fallback. UI mostra mensagem amigável.
-- ============================================================

-- 1. Add coluna idempotente
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS extra_professional_slots INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.subscriptions.extra_professional_slots IS
  'Slots adicionais de profissional além do limite do plano (Solo=2, Equipe=5). Default 0. Cravado pelo Adm manualmente · vira upsell futuro.';

-- Defesa: bloqueia valor negativo (não faz sentido)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscriptions_extra_slots_non_negative'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_extra_slots_non_negative
      CHECK (extra_professional_slots >= 0);
  END IF;
END $$;


-- 2. Atualizar trigger v47 pra somar slots extras
CREATE OR REPLACE FUNCTION check_professional_limit()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_plan text;
  prof_count int;
  recep_count int;
  max_allowed int;
  extra_slots int;
BEGIN
  -- 1. Plan + extra slots da subscription
  SELECT s.plan, COALESCE(s.extra_professional_slots, 0)
    INTO current_plan, extra_slots
  FROM public.subscriptions s
  WHERE s.business_id = NEW.business_id
  LIMIT 1;

  -- 2. RECEPCIONISTA: regra v47 preservada (extra_slots NÃO afeta recep)
  IF NEW.is_receptionist = true THEN
    IF current_plan = 'solo' THEN
      RAISE EXCEPTION
        'Plano Solo não inclui recepcionista. Faça upgrade pro Equipe pra ter recepção dedicada.'
        USING errcode = 'P0001',
              hint = 'Plano Equipe inclui 5 profissionais + 1 recepcionista por R$97/mês.';
    END IF;

    SELECT count(*) INTO recep_count
    FROM public.professionals
    WHERE business_id = NEW.business_id
      AND is_receptionist = true;

    IF recep_count >= 1 THEN
      RAISE EXCEPTION
        'Plano Equipe inclui 1 recepcionista. Pra trocar quem é recepção, remova a recepcionista atual primeiro.'
        USING errcode = 'P0001';
    END IF;

    RETURN NEW;
  END IF;

  -- 3. PROFISSIONAL: limite do plano + slots extras
  IF current_plan = 'solo' THEN
    max_allowed := 2;
  ELSIF current_plan = 'equipe' THEN
    max_allowed := 5;
  ELSE
    -- Sem subscription (onboarding) ou plano desconhecido: deixa criar.
    RETURN NEW;
  END IF;

  -- Soma slots extras (default 0 não muda nada · valor > 0 expande limite)
  max_allowed := max_allowed + extra_slots;

  -- 4. Conta profissionais (NÃO inclui recepcionistas · regra v47)
  SELECT count(*) INTO prof_count
  FROM public.professionals
  WHERE business_id = NEW.business_id
    AND is_receptionist = false;

  -- 5. Bloqueia se exceder
  IF prof_count >= max_allowed THEN
    RAISE EXCEPTION
      'Plano % permite no máximo % profissionais%. Pra adicionar mais, fale com a Impulso.',
      current_plan, max_allowed,
      CASE WHEN extra_slots > 0
           THEN ' (' || (max_allowed - extra_slots) || ' do plano + ' || extra_slots || ' extra' ||
                CASE WHEN extra_slots > 1 THEN 's' ELSE '' END || ')'
           ELSE '' END
      USING errcode = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger já existe (v30 / v47) · REPLACE FUNCTION basta.

-- ============================================================
-- VALIDAÇÃO PÓS-APLICAÇÃO
-- ============================================================
-- Confirma coluna existe:
--   SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='subscriptions'
--     AND column_name='extra_professional_slots';
--   Esperado: extra_professional_slots | integer | 0
--
-- Confirma trigger continua SECURITY DEFINER:
--   SELECT proname, prosecdef FROM pg_proc
--   WHERE proname='check_professional_limit';
--   Esperado: prosecdef = t
--
-- Pra Marko (substituir <business_id_palace>):
--   UPDATE public.subscriptions
--     SET extra_professional_slots = 1
--     WHERE business_id = '<business_id_palace>';
-- Verificar antes:
--   SELECT s.business_id, b.name, s.plan, s.extra_professional_slots
--   FROM subscriptions s JOIN businesses b ON b.id = s.business_id
--   WHERE b.name ILIKE '%palace%';
-- ============================================================
