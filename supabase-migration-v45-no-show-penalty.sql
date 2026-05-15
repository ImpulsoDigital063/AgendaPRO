-- =====================================================================
-- v45 — PUNIÇÃO POR NÃO-COMPARECIMENTO (no-show penalty) · 14/05/2026
-- =====================================================================
--
-- IDEIA 2 do Olímpio: cliente que marca e não vem sem avisar perde
-- pontos. Decisões cravadas com Eduardo (sessão 14/05):
--
--   1. OPT-IN por business · default OFF (zero impacto em quem não ligar)
--   2. 2 modos: 'proportional' (pontos que ganharia) ou 'fixed' (valor cravado)
--   3. Saldo CLAMP em 0 · nunca negativo
--   4. Aplicação INSTANTÂNEA quando status vira 'no_show'
--   5. Reversão 1-click pelo dono (relevar caso de emergência)
--
-- A função/trigger que efetiva a punição vem na v46 (separada · pra ficar
-- fácil de reverter caso bug). Esta v45 só prepara o schema.
--
-- IDEMPOTENTE. Additive only — businesses existentes ficam com
-- no_show_punishment_enabled=FALSE · zero comportamento muda.
-- =====================================================================

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS no_show_punishment_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS no_show_penalty_mode       TEXT    NOT NULL DEFAULT 'proportional',
  ADD COLUMN IF NOT EXISTS no_show_fixed_points       INTEGER NOT NULL DEFAULT 20;

-- Flag de envio do lembrete 3h (espelho de reminded_1d e reminded_1h da v7).
-- Cron reminder-3h marca TRUE depois de enviar · evita duplo envio se cron
-- rodar 2x na mesma janela.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reminded_3h BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_appointments_reminder3h_pending
  ON public.appointments (appointment_date, status)
  WHERE reminded_3h = FALSE;

-- CHECK constraints (defensivas · evitam valores que iriam confundir o trigger)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'businesses_no_show_penalty_mode_check'
  ) THEN
    ALTER TABLE public.businesses
      ADD CONSTRAINT businesses_no_show_penalty_mode_check
      CHECK (no_show_penalty_mode IN ('proportional', 'fixed'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'businesses_no_show_fixed_points_check'
  ) THEN
    ALTER TABLE public.businesses
      ADD CONSTRAINT businesses_no_show_fixed_points_check
      CHECK (no_show_fixed_points >= 0 AND no_show_fixed_points <= 10000);
  END IF;
END $$;

COMMENT ON COLUMN public.businesses.no_show_punishment_enabled IS
  'Quando TRUE · status no_show dispara dedução de pontos via trigger apply_no_show_penalty (v46). Default FALSE · negócio existente não muda comportamento.';

COMMENT ON COLUMN public.businesses.no_show_penalty_mode IS
  '"proportional" = perde pontos que ganharia naquele atendimento (soma services.points). "fixed" = perde no_show_fixed_points (valor cravado pelo dono).';

COMMENT ON COLUMN public.businesses.no_show_fixed_points IS
  'Quantos pontos perde por no-show quando mode=fixed. Ignorado quando mode=proportional. Default 20.';

-- points_transactions.reason já é TEXT livre (v3 · sem CHECK). Trigger vai
-- inserir reason='no_show_penalty' (débito) ou 'no_show_relevado' (reversão).
-- Documentamos via COMMENT, sem CHECK pra não quebrar reasons históricos.
COMMENT ON COLUMN public.points_transactions.reason IS
  'Motivo do delta. Valores conhecidos: service · referral · review · manual · punctuality · redemption · no_show_penalty (v45) · no_show_relevado (v45).';

-- =====================================================================
-- VALIDAÇÃO PÓS-MIGRATION
-- =====================================================================
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='businesses'
--   AND column_name LIKE 'no_show%';
-- → esperado: 3 linhas com defaults FALSE / 'proportional' / 20
-- =====================================================================
