-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  GRANT TRIAL · PALACE NAIL SPA MACAÉ                              ║
-- ║  Fechamento 17/05/2026 · Equipe Anual R$970 · cliente premium     ║
-- ║                                                                    ║
-- ║  ESTRATÉGIA: trial 7 dias cortesia + conversão automática         ║
-- ║                                                                    ║
-- ║  COMO USAR:                                                        ║
-- ║   1. Rodar BLOCO 0 → confirma email/slug/estado atual              ║
-- ║   2. Rodar BLOCO 1 → libera 7 dias                                ║
-- ║   3. NO 7º DIA (24/05/2026) → rodar BLOCO 4 (converte pra anual)  ║
-- ║                                                                    ║
-- ║  ATENÇÃO: aba SQL nova entre blocos (buffer do editor não limpa)  ║
-- ╚══════════════════════════════════════════════════════════════════╝


-- ┌──────────────────────────────────────────────────────────────────┐
-- │ BLOCO 0 · DIAGNÓSTICO (rodar PRIMEIRO · não altera nada)         │
-- │ Confirma que a conta existe e em que estado está                 │
-- └──────────────────────────────────────────────────────────────────┘
SELECT
  u.email           AS email_owner,
  b.id              AS business_id,
  b.name            AS negocio,
  b.slug,
  b.created_at      AS criado_em,
  s.status,
  s.plan,
  s.plan_modalidade,
  s.provider,
  s.price_cents,
  s.pago_ate,
  s.current_period_end
FROM auth.users u
JOIN businesses b      ON b.owner_id   = u.id
LEFT JOIN subscriptions s ON s.business_id = b.id
WHERE u.email = 'palacenailspamacae@gmail.com';
-- ESPERADO: 1 linha · status provável = 'pending_payment' · plan = 'solo'


-- ┌──────────────────────────────────────────────────────────────────┐
-- │ BLOCO 1 · LIBERAR 7 DIAS · PLAN EQUIPE · CORTESIA                │
-- │                                                                    │
-- │  - plan: solo → equipe                                            │
-- │  - provider='cortesia' · plan_modalidade=NULL                    │
-- │    → cron de billing IGNORA (filtra IN anual_pix/etc)            │
-- │  - pago_ate = hoje + 7 dias                                       │
-- │  - price_cents = 97000 (R$970 · Equipe Anual · pré-setado)       │
-- │                                                                    │
-- │  LEMBRETE MANUAL: criar evento Google Calendar 24/05/2026 09h    │
-- │  pra rodar BLOCO 4 e converter pra anual_pix                     │
-- └──────────────────────────────────────────────────────────────────┘
UPDATE subscriptions
SET
  plan                  = 'equipe',
  status                = 'active',
  provider              = 'cortesia',
  plan_modalidade       = NULL,
  price_cents           = 97000,
  setup_paid_at         = now(),
  current_period_start  = now(),
  current_period_end    = now() + interval '7 days',
  pago_ate              = now() + interval '7 days',
  refund_deadline_at    = NULL,
  grace_ends_at         = NULL,
  public_blocked_at     = NULL,
  pix_link_atual        = NULL
WHERE business_id = (
  SELECT b.id
  FROM businesses b
  JOIN auth.users u ON u.id = b.owner_id
  WHERE u.email = 'palacenailspamacae@gmail.com'
)
RETURNING plan, plan_modalidade, status, provider, pago_ate, price_cents;
-- ESPERADO: 1 linha · plan=equipe · provider=cortesia · pago_ate ≈ hoje + 7 dias


-- ┌──────────────────────────────────────────────────────────────────┐
-- │ BLOCO 2 · ROLLBACK (se algo der errado)                           │
-- │ Volta pro estado pré-ativação (pending_payment · cai em /bloqueado)│
-- └──────────────────────────────────────────────────────────────────┘
UPDATE subscriptions
SET
  plan                  = 'solo',
  status                = 'pending_payment',
  provider              = 'asaas',
  plan_modalidade       = NULL,
  price_cents           = 6700,
  setup_paid_at         = NULL,
  current_period_start  = NULL,
  current_period_end    = NULL,
  pago_ate              = NULL,
  grace_ends_at         = NULL,
  public_blocked_at     = NULL
WHERE business_id = (
  SELECT b.id
  FROM businesses b
  JOIN auth.users u ON u.id = b.owner_id
  WHERE u.email = 'palacenailspamacae@gmail.com'
);


-- ┌──────────────────────────────────────────────────────────────────┐
-- │ BLOCO 3 · ESTENDER TRIAL +N DIAS                                  │
-- │ Útil se ela pediu mais tempo pra testar antes de pagar           │
-- └──────────────────────────────────────────────────────────────────┘
UPDATE subscriptions
SET
  pago_ate              = pago_ate + interval '3 days',     -- ← AJUSTAR DIAS
  current_period_end    = current_period_end + interval '3 days'
WHERE business_id = (
  SELECT b.id
  FROM businesses b
  JOIN auth.users u ON u.id = b.owner_id
  WHERE u.email = 'palacenailspamacae@gmail.com'
)
RETURNING pago_ate;


-- ┌──────────────────────────────────────────────────────────────────┐
-- │ BLOCO 4 · CONVERTER PRA PAGANTE · EQUIPE ANUAL R$970             │
-- │ Rodar NO 7º DIA (24/05/2026) se ela confirmou que vai ficar      │
-- │                                                                    │
-- │  - provider: cortesia → asaas                                     │
-- │  - plan_modalidade = 'anual_pix' (R$970)                          │
-- │  - pago_ate = +365 dias a partir de hoje (período de cobertura)  │
-- │  - cron de billing detecta D-3 do pago_ate · cria PIX · envia    │
-- │                                                                    │
-- │  IMPORTANTE: gerar PIX no Asaas R$970 ANTES de rodar este bloco  │
-- │  (ou deixar o cron gerar D-3 do novo pago_ate)                   │
-- └──────────────────────────────────────────────────────────────────┘
UPDATE subscriptions
SET
  provider              = 'asaas',
  plan_modalidade       = 'anual_pix',
  price_cents           = 97000,
  pago_ate              = now() + interval '365 days',
  current_period_start  = now(),
  current_period_end    = now() + interval '365 days'
WHERE business_id = (
  SELECT b.id
  FROM businesses b
  JOIN auth.users u ON u.id = b.owner_id
  WHERE u.email = 'palacenailspamacae@gmail.com'
)
RETURNING plan, plan_modalidade, provider, pago_ate, price_cents;
-- ESPERADO: provider=asaas · plan_modalidade=anual_pix · pago_ate ≈ hoje + 365 dias


-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  REFERÊNCIA · valores de price_cents                              ║
-- ║   Solo mensal     · 6700     (R$ 67)                               ║
-- ║   Equipe mensal   · 9700     (R$ 97)                               ║
-- ║   Solo anual_pix  · 67000    (R$ 670)                              ║
-- ║   Equipe anual_pix· 97000    (R$ 970) ← ESTE                       ║
-- ╚══════════════════════════════════════════════════════════════════╝
