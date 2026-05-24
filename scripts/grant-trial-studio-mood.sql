-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  GRANT TRIAL · STUDIO MOOD (MOOD HAIRSTYLE STORE)                 ║
-- ║  Reunião 22/05/2026 · Equipe Mensal R$97 · trial cortesia 7d      ║
-- ║                                                                    ║
-- ║  CLIENTE: Izanara · Alagoinhas/BA · loja+salão de tranças        ║
-- ║  IG @mood.hairstyle.store · 85 SKUs no Kyte FREE                  ║
-- ║  CHEGOU VIA ChatGPT recomendação · canal AEO novo                ║
-- ║                                                                    ║
-- ║  ESTRATÉGIA: trial 7 dias cortesia (25/05 → 01/06) + conversão    ║
-- ║              pra mensal_pix R$ 97                                  ║
-- ║                                                                    ║
-- ║  PRÉ-REQUISITO: Izanara JÁ TEM auth criado                       ║
-- ║   (iza-silva05@hotmail.com · ID 260809d9-1f86-4aaa-8e73-...)     ║
-- ║   Mas NÃO TEM business ainda · precisa criar no /cadastro         ║
-- ║   antes de rodar BLOCO 1                                          ║
-- ║                                                                    ║
-- ║  COMO USAR:                                                        ║
-- ║   1. Izanara cria business no /cadastro guiada por Eduardo        ║
-- ║   2. Rodar BLOCO 0 → confirma criação                              ║
-- ║   3. Rodar BLOCO 1 → libera 7 dias de cortesia                   ║
-- ║   4. NO 7º DIA (01/06/2026) → rodar BLOCO 4 (mensal_pix R$97)    ║
-- ║                                                                    ║
-- ║  ATENÇÃO: aba SQL nova entre blocos (buffer do editor não limpa) ║
-- ╚══════════════════════════════════════════════════════════════════╝


-- ┌──────────────────────────────────────────────────────────────────┐
-- │ BLOCO 0 · DIAGNÓSTICO (rodar PRIMEIRO · não altera nada)         │
-- │ Confirma que a Izanara criou o business e em que estado está     │
-- └──────────────────────────────────────────────────────────────────┘
SELECT
  u.email           AS email_owner,
  b.id              AS business_id,
  b.name            AS negocio,
  b.slug,
  b.acquisition_channel,
  b.primary_need,
  b.created_at      AS criado_em,
  s.status,
  s.plan,
  s.plan_modalidade,
  s.provider,
  s.price_cents,
  s.pago_ate,
  s.current_period_end
FROM auth.users u
LEFT JOIN businesses b      ON b.owner_id   = u.id
LEFT JOIN subscriptions s   ON s.business_id = b.id
WHERE u.email = 'iza-silva05@hotmail.com';
-- ESPERADO: 1 linha · business_id NOT NULL (se já criou) ·
--           acquisition_channel = 'chatgpt_ia' (esperado)


-- ┌──────────────────────────────────────────────────────────────────┐
-- │ BLOCO 1 · LIBERAR 7 DIAS · PLAN EQUIPE · CORTESIA                │
-- │                                                                    │
-- │  - plan: solo → equipe                                            │
-- │  - provider='cortesia' · plan_modalidade=NULL                    │
-- │    → cron de billing IGNORA (filtra IN mensal_pix/anual_pix/etc) │
-- │  - pago_ate = hoje + 7 dias                                       │
-- │  - price_cents = 9700 (R$97 · Equipe MENSAL · não é o anual)    │
-- │                                                                    │
-- │  LEMBRETE MANUAL: criar evento Google Calendar 01/06/2026 09h    │
-- │  pra rodar BLOCO 4 e converter pra mensal_pix R$97               │
-- └──────────────────────────────────────────────────────────────────┘
UPDATE subscriptions
SET
  plan                  = 'equipe',
  status                = 'active',
  provider              = 'cortesia',
  plan_modalidade       = NULL,
  price_cents           = 9700,
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
  WHERE u.email = 'iza-silva05@hotmail.com'
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
  WHERE u.email = 'iza-silva05@hotmail.com'
);


-- ┌──────────────────────────────────────────────────────────────────┐
-- │ BLOCO 3 · ESTENDER TRIAL +N DIAS                                  │
-- │ Útil se ela pedir mais tempo pra testar antes de pagar           │
-- └──────────────────────────────────────────────────────────────────┘
UPDATE subscriptions
SET
  pago_ate              = pago_ate + interval '7 days',     -- ← AJUSTAR DIAS
  current_period_end    = current_period_end + interval '7 days'
WHERE business_id = (
  SELECT b.id
  FROM businesses b
  JOIN auth.users u ON u.id = b.owner_id
  WHERE u.email = 'iza-silva05@hotmail.com'
)
RETURNING pago_ate;


-- ┌──────────────────────────────────────────────────────────────────┐
-- │ BLOCO 4 · CONVERTER PRA PAGANTE · EQUIPE MENSAL R$97 (mensal_pix)│
-- │ Rodar NO 7º DIA (01/06/2026) se ela confirmou que vai ficar      │
-- │                                                                    │
-- │  - provider: cortesia → asaas                                     │
-- │  - plan_modalidade = 'mensal_pix' (R$97 · cobra todo mês)        │
-- │  - pago_ate = +30 dias (não 365 · ela escolheu MENSAL não anual) │
-- │  - cron de billing detecta D-3 do pago_ate · cria PIX · envia    │
-- │                                                                    │
-- │  IMPORTANTE: ⚠️  PALACE é ANUAL R$970 · STUDIO MOOD é MENSAL R$97 │
-- │  Não confundir os 2 quando rodar conversão.                      │
-- └──────────────────────────────────────────────────────────────────┘
UPDATE subscriptions
SET
  provider              = 'asaas',
  plan_modalidade       = 'mensal_pix',
  price_cents           = 9700,
  pago_ate              = now() + interval '30 days',
  current_period_start  = now(),
  current_period_end    = now() + interval '30 days'
WHERE business_id = (
  SELECT b.id
  FROM businesses b
  JOIN auth.users u ON u.id = b.owner_id
  WHERE u.email = 'iza-silva05@hotmail.com'
)
RETURNING plan, plan_modalidade, provider, pago_ate, price_cents;
-- ESPERADO: provider=asaas · plan_modalidade=mensal_pix · pago_ate ≈ hoje + 30 dias


-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  REFERÊNCIA · valores de price_cents                              ║
-- ║   Solo mensal     · 6700     (R$ 67)                               ║
-- ║   Equipe mensal   · 9700     (R$ 97) ← ESTE                       ║
-- ║   Solo anual_pix  · 67000    (R$ 670)                              ║
-- ║   Equipe anual_pix· 97000    (R$ 970)                              ║
-- ╚══════════════════════════════════════════════════════════════════╝
