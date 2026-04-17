-- ============================================================
-- Migration V11: Tabela de assinaturas (subscriptions)
-- AgendaPRO — Billing com Mercado Pago
-- ============================================================
-- Regras de negócio:
--   - Trial: 14 dias, sem cartão
--   - Planos: Solo (R$67/mês = 6700 centavos), Equipe (R$107/mês = 10700 centavos)
--   - Grace period: 5 dias após falha de pagamento (bloqueia admin)
--   - Após 12 dias sem pagar (5+7): bloqueia página pública também
--   - Retenção de dados: 90 dias após cancelamento, depois deleta
--   - Reativação: automática quando pagamento é feito
-- ============================================================

-- 1. CRIAR TABELA DE ASSINATURAS
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Cada negócio tem no máximo uma assinatura
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,

  -- Plano: solo (R$67) ou equipe (R$107)
  plan TEXT NOT NULL CHECK (plan IN ('solo', 'equipe')),

  -- Status do ciclo de vida da assinatura
  status TEXT NOT NULL DEFAULT 'trial'
    CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'expired')),

  -- Dados do Mercado Pago (preenchidos pelo webhook)
  mp_subscription_id TEXT,
  mp_payer_id TEXT,

  -- Valor em centavos (evita problemas com decimal)
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),

  -- Datas do trial
  trial_ends_at TIMESTAMPTZ NOT NULL,

  -- Período atual de cobrança (NULL durante trial)
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,

  -- Grace period: 5 dias após falha no pagamento
  -- Admin bloqueado quando NOW() > grace_ends_at
  grace_ends_at TIMESTAMPTZ,

  -- Página pública bloqueada: grace_ends_at + 7 dias (total 12 dias sem pagar)
  public_blocked_at TIMESTAMPTZ,

  -- Cancelamento e retenção de dados
  cancelled_at TIMESTAMPTZ,
  data_delete_at TIMESTAMPTZ, -- cancelled_at + 90 dias

  -- Timestamps automáticos
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comentário na tabela
COMMENT ON TABLE subscriptions IS 'Assinaturas dos negócios — billing via Mercado Pago';
COMMENT ON COLUMN subscriptions.price_cents IS 'Valor em centavos: 6700 (solo) ou 10700 (equipe)';
COMMENT ON COLUMN subscriptions.grace_ends_at IS '5 dias após falha de pagamento — bloqueia admin após essa data';
COMMENT ON COLUMN subscriptions.public_blocked_at IS 'grace_ends_at + 7 dias — bloqueia página pública após essa data';
COMMENT ON COLUMN subscriptions.data_delete_at IS 'cancelled_at + 90 dias — dados serão deletados após essa data';


-- 2. ÍNDICES PARA CONSULTAS RÁPIDAS
-- Busca por business_id já está coberta pelo UNIQUE constraint
-- Índice composto para filtrar por status (ex: listar todos em trial, past_due, etc.)
CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON subscriptions(status);

-- Índice para buscar assinaturas que precisam de ação (grace expirado, dados pra deletar)
CREATE INDEX IF NOT EXISTS idx_subscriptions_grace_ends_at
  ON subscriptions(grace_ends_at)
  WHERE grace_ends_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_data_delete_at
  ON subscriptions(data_delete_at)
  WHERE data_delete_at IS NOT NULL;


-- 3. TRIGGER PARA ATUALIZAR updated_at AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Dropar e recriar o trigger (idempotente)
DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();


-- 4. SEGURANÇA (RLS)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Dono do negócio pode ver sua própria assinatura
-- Usa EXISTS para verificar que o usuário logado é o owner_id do business
DROP POLICY IF EXISTS "dono_ve_assinatura" ON subscriptions;
CREATE POLICY "dono_ve_assinatura" ON subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = subscriptions.business_id
        AND businesses.owner_id = auth.uid()
    )
  );

-- Nenhuma política de INSERT/UPDATE/DELETE para usuários normais
-- Todas as escritas são feitas via service_role (webhooks do Mercado Pago)
-- O service_role bypassa RLS automaticamente no Supabase


-- 5. MIGRAR NEGÓCIOS EXISTENTES
-- Para cada business existente, cria uma assinatura em trial
-- Negócios que já têm trial_ends_at: usa o valor existente
-- Negócios sem trial_ends_at: usa created_at + 14 dias
-- ON CONFLICT: não faz nada se já existir (seguro para rodar múltiplas vezes)
INSERT INTO subscriptions (business_id, plan, status, price_cents, trial_ends_at)
SELECT
  b.id,
  'solo',                -- plano padrão para migração
  'trial',               -- todos começam como trial
  6700,                  -- preço do plano solo em centavos
  COALESCE(b.trial_ends_at, b.created_at + INTERVAL '14 days')
FROM businesses b
ON CONFLICT (business_id) DO NOTHING;
