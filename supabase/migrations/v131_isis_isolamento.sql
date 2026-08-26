-- v131 · Isolamento do setup do Studio Isis Melo (pago em 25/08/2026)
--
-- Seis chaves e duas colunas de dados. NADA aqui muda o comportamento dos
-- outros negócios: as chaves nascem no comportamento ATUAL e só o tenant
-- 192ff88d-d435-4897-92d4-a19a007d4804 é ligado depois, por UPDATE.
--
-- ⚠️ DUAS DELAS NASCEM `true` — não é descuido. Nessas eu estou REMOVENDO
-- capacidade que a base inteira usa hoje. Se nascessem `false`, 27 negócios
-- perderiam edição de horário e cancelamento no mesmo deploy.
--
-- Idempotente.

-- ─────────────────────────────────────────────────────────────
-- 1. CHAVES EM businesses
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS prof_edita_horario       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS prof_cancela_agendamento boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS prof_adiciona_servico    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sinal_por_agendamento    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS comissao_por_servico     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cartao_presente_enabled  boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.businesses.prof_edita_horario IS
  'true (padrao) = profissional edita os proprios working_hours, como sempre foi (RLS v19). false = so dono e recepcao definem horario.';
COMMENT ON COLUMN public.businesses.prof_cancela_agendamento IS
  'true (padrao) = profissional cancela pela area dela (api/profissional/action). false = ela conclui e confirma, mas nao cancela.';
COMMENT ON COLUMN public.businesses.prof_adiciona_servico IS
  'false (padrao) = area profissional nao mexe na comanda. true = pode ACRESCENTAR servico num atendimento existente, nunca remover.';
COMMENT ON COLUMN public.businesses.sinal_por_agendamento IS
  'false (padrao) = sinal segue a regra do negocio + isencao por cliente (customers.sinal_isento). true = pergunta em cada agendamento se cobra.';
COMMENT ON COLUMN public.businesses.comissao_por_servico IS
  'false (padrao) = comissao vem de professionals.commission_percentage. true = services.commission_percent manda quando preenchido.';
COMMENT ON COLUMN public.businesses.cartao_presente_enabled IS
  'false (padrao) = sem cartao presente. true = libera venda e resgate de vale-presente.';

-- ─────────────────────────────────────────────────────────────
-- 2. COLUNAS DE DADOS (nascem nulas · ninguem sente)
-- ─────────────────────────────────────────────────────────────

-- % da profissional NESSE servico. Null = cai na porcentagem da pessoa,
-- que e o comportamento de hoje. Regra da Isis: o percentual acompanha quem
-- fornece o material (manicure/pedicure 50% porque o material e do studio;
-- podologia e gel no pe 70% porque o material e dela).
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS commission_percent numeric(5,2) NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'services_commission_percent_range'
  ) THEN
    ALTER TABLE public.services
      ADD CONSTRAINT services_commission_percent_range
      CHECK (commission_percent IS NULL OR (commission_percent >= 0 AND commission_percent <= 100));
  END IF;
END $$;

COMMENT ON COLUMN public.services.commission_percent IS
  'Porcentagem da profissional NESTE servico (0-100). Null = usa professionals.commission_percentage. So tem efeito com businesses.comissao_por_servico.';

-- Decisao tomada no ato do agendamento: cobra sinal desse ou nao.
-- Null = ninguem decidiu, vale a regra do negocio (comportamento de hoje).
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS sinal_cobrar boolean NULL;

COMMENT ON COLUMN public.appointments.sinal_cobrar IS
  'Decisao por agendamento: true = cobra sinal, false = dispensa. Null = nao perguntado, vale a regra do negocio. So tem efeito com businesses.sinal_por_agendamento.';
