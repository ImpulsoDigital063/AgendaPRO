-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  GRANT TRIAL · VIVA CACHEADA                                      ║
-- ║  Reunião 12/05/2026 · cortesia 90 dias em troca de divulgação    ║
-- ║                                                                    ║
-- ║  CONTEXTO: esposa do Gabriel (cliente Impulso · GB Nutrition).    ║
-- ║  Salão de nicho cacheadas · lead-4 quente via network do Renato.  ║
-- ║                                                                    ║
-- ║  COMO USAR: 4 blocos separados. Rodar APENAS o que precisar.      ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ┌──────────────────────────────────────────────────────────────────┐
-- │ BLOCO 0 · DIAGNÓSTICO (rodar ANTES pra ver estado atual)         │
-- │ Mostra o que tá no banco hoje · sem alterar nada                 │
-- └──────────────────────────────────────────────────────────────────┘
-- TROCA 'viva-cacheada' pelo slug REAL que ela escolheu no cadastro
SELECT
  b.id              AS business_id,
  b.name            AS negocio,
  b.slug,
  b.created_at      AS criado_em,
  s.status,
  s.plan,
  s.plan_modalidade,
  s.provider,
  s.setup_paid_at,
  s.pago_ate,
  s.current_period_end
FROM businesses b
LEFT JOIN subscriptions s ON s.business_id = b.id
WHERE b.slug = 'viva-cacheada';   -- ← TROCA AQUI


-- ┌──────────────────────────────────────────────────────────────────┐
-- │ BLOCO 1 · ATIVAR TRIAL 90 DIAS (rodar quando ela tá em /bloqueado)│
-- │                                                                    │
-- │ - provider='cortesia' · marca como brinde                         │
-- │ - plan_modalidade=NULL · NÃO entra no cron de billing            │
-- │   (cron filtra IN mensal_pix/semestral_pix/anual_pix)            │
-- │ - sem email automático D-7 · LEMBRETE MANUAL no Google Calendar  │
-- └──────────────────────────────────────────────────────────────────┘
UPDATE subscriptions
SET
  status                = 'active',
  setup_paid_at         = now(),
  pago_ate              = now() + interval '90 days',
  current_period_start  = now(),
  current_period_end    = now() + interval '90 days',
  refund_deadline_at    = NULL,            -- cortesia · sem refund
  provider              = 'cortesia',
  plan                  = 'solo',
  plan_modalidade       = NULL,            -- não entra no cron
  grace_ends_at         = NULL,
  public_blocked_at     = NULL,
  pix_link_atual        = NULL
WHERE business_id = (
  SELECT id FROM businesses WHERE slug = 'viva-cacheada'   -- ← TROCA AQUI
)
RETURNING id, plan, plan_modalidade, status, pago_ate, provider;
-- ESPERADO: 1 linha · pago_ate ≈ hoje + 90 dias · status = active


-- ┌──────────────────────────────────────────────────────────────────┐
-- │ BLOCO 2 · ROLLBACK (se algo der errado e quiser voltar)          │
-- │ Reverte pra estado pré-pagamento · ela cai em /bloqueado de novo │
-- └──────────────────────────────────────────────────────────────────┘
UPDATE subscriptions
SET
  status                = 'pending_payment',
  setup_paid_at         = NULL,
  pago_ate              = NULL,
  current_period_start  = NULL,
  current_period_end    = NULL,
  refund_deadline_at    = NULL,
  provider              = 'asaas',
  plan_modalidade       = NULL,
  grace_ends_at         = NULL,
  public_blocked_at     = NULL
WHERE business_id = (
  SELECT id FROM businesses WHERE slug = 'viva-cacheada'   -- ← TROCA AQUI
);


-- ┌──────────────────────────────────────────────────────────────────┐
-- │ BLOCO 3 · ESTENDER TRIAL +30 DIAS                                 │
-- │ Útil se ela cumpriu parte da divulgação mas precisa de mais tempo │
-- └──────────────────────────────────────────────────────────────────┘
UPDATE subscriptions
SET
  pago_ate              = pago_ate + interval '30 days',
  current_period_end    = current_period_end + interval '30 days'
WHERE business_id = (
  SELECT id FROM businesses WHERE slug = 'viva-cacheada'   -- ← TROCA AQUI
)
RETURNING pago_ate;


-- ┌──────────────────────────────────────────────────────────────────┐
-- │ BLOCO 4 · CONVERTER PRA PAGANTE (após o trial · ela quer ficar)  │
-- │ Coloca no fluxo normal · próximo cron de billing gera PIX D-3   │
-- │ NÃO renova automaticamente · ela vai pagar PIX mensal            │
-- └──────────────────────────────────────────────────────────────────┘
UPDATE subscriptions
SET
  provider              = 'asaas',
  plan_modalidade       = 'mensal_pix',
  -- pago_ate fica o que já tava (último dia do trial) · cron D-3 gera PIX
  setup_paid_at         = setup_paid_at  -- preserva data original
WHERE business_id = (
  SELECT id FROM businesses WHERE slug = 'viva-cacheada'   -- ← TROCA AQUI
)
RETURNING plan_modalidade, pago_ate;
-- DEPOIS: cron de billing detecta D-3 do pago_ate · cria PIX · envia email
