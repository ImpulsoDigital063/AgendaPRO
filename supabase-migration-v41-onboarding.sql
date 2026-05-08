-- =====================================================================
-- v41 — Tutorial admin no 1º acesso
-- =====================================================================
-- Adiciona 4 flags em businesses pra controlar:
--  · welcome_modal_seen           — modal de boas-vindas dismissed
--  · onboarding_horarios_revisado — admin abriu/confirmou horários
--  · qr_code_compartilhado        — admin clicou "já compartilhei" (passo 4 do checklist)
--  · fidelidade_dica_lida         — card educativo de fidelidade dismissed
--
-- Todas com default false, additive only — nada quebra pra negócios existentes.
-- Negócios pré-existentes vão ver o tutorial uma vez tb (intencional — eles
-- também vão se beneficiar das dicas estratégicas de fidelidade).
-- =====================================================================

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS welcome_modal_seen           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_horarios_revisado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS qr_code_compartilhado        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fidelidade_dica_lida         boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN businesses.welcome_modal_seen IS
  'Modal de boas-vindas 3 slides — true após admin clicar "Bora começar" ou "X" no 1º acesso ao /admin home.';

COMMENT ON COLUMN businesses.onboarding_horarios_revisado IS
  'Passo 1 do checklist — true quando admin abre /configuracoes?tab=horarios e clica salvar.';

COMMENT ON COLUMN businesses.qr_code_compartilhado IS
  'Passo 4 do checklist — true quando admin clica "Já compartilhei" no DivulgarCard ou aba QR Code.';

COMMENT ON COLUMN businesses.fidelidade_dica_lida IS
  'Card educativo no topo da FidelidadeTab — true após admin dismissar.';
