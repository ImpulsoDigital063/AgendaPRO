-- ═══════════════════════════════════════════════════════════════
-- v119 · MOTOR DE MENSAGENS AUTOMÁTICAS
--
-- Pedido que veio de várias clientes ao mesmo tempo (Elaine, da clínica,
-- 07/08: "preciso de lembretes automáticos de horário para os pacientes,
-- lembrete de aniversário e controle de prazo pra lembrar quando chegar a
-- hora de voltar").
--
-- Três pedidos, UMA máquina: o que muda entre lembrete, aniversário e
-- retorno é só o GATILHO. Por isso isto não nasce como "lembrete por
-- WhatsApp" — nasce como motor de regras. Gatilho novo vira linha nova,
-- não projeto novo.
--
-- O CANAL é plugável de propósito. Hoje o lembrete sai por email (Resend);
-- o WhatsApp entra quando o número existir, e vira o padrão com o email
-- como rede de segurança — se o WhatsApp falhar (número errado, cliente
-- sem WhatsApp, sessão caída), o email sai. Nunca os dois pra mesma
-- pessoa: isso é ruído e faz o dono desligar as duas coisas.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. REGRAS POR NEGÓCIO ───────────────────────────────────────
--
-- Uma linha por tipo de mensagem, por negócio. Sem linha = usa o padrão
-- do código (ver DEFAULTS em src/lib/mensagens/regras.ts).
CREATE TABLE IF NOT EXISTS message_rules (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  tipo         text NOT NULL,
  enabled      boolean NOT NULL DEFAULT false,

  -- Quando disparar, relativo ao gatilho. Negativo = antes.
  -- lembrete_vespera: -1440 (24h antes) · lembrete_dia: -180 (3h antes)
  -- confirmacao: 0 (na hora) · aniversario/retorno: ignorado, usa hora_do_dia
  offset_minutos integer NOT NULL DEFAULT 0,

  -- Pra gatilho de calendário (aniversário, retorno): que horas do dia sai.
  -- 09:00 BR — cedo o bastante pra ser útil, tarde o bastante pra não acordar.
  hora_do_dia  time NOT NULL DEFAULT '09:00',

  -- Dias sem voltar que caracterizam "hora de retornar". Só pro tipo retorno.
  retorno_dias integer,

  -- Texto próprio da dona. NULL = texto padrão do sistema.
  -- Nasce NULL de propósito: na Fase 1 o número é do AgendaPRO, e quem leva
  -- o bloqueio por mensagem mal escrita é ele. Edição livre entra junto com
  -- o número próprio (Fase 2), quando o risco passa a ser de quem escreve.
  template     text,

  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),

  CONSTRAINT message_rules_tipo_check CHECK (tipo IN (
    'confirmacao',            -- cliente · na hora que marca
    'lembrete_vespera',       -- cliente · 1 dia antes
    'lembrete_dia',           -- cliente · no dia, X horas antes
    'aniversario',            -- cliente · na data de nascimento
    'retorno',                -- cliente · X dias sem voltar  (remarketing)
    'dono_novo_agendamento',  -- dono · entrou agendamento
    'dono_cancelamento'       -- dono · liberou horário
  )),
  CONSTRAINT message_rules_unica UNIQUE (business_id, tipo)
);

COMMENT ON TABLE message_rules IS
  'Quais mensagens automáticas cada negócio manda e quando. Sem linha = padrão do código.';
COMMENT ON COLUMN message_rules.template IS
  'Texto próprio da dona (Fase 2). NULL = padrão do sistema com variáveis.';

-- ── 2. REGISTRO DE ENVIO ────────────────────────────────────────
--
-- Serve a DOIS propósitos, e o primeiro é o que importa: idempotência.
-- Cliente que recebe o mesmo lembrete duas vezes não acha o sistema
-- redundante, acha ele quebrado — e denuncia como spam. Denúncia é o que
-- derruba número de WhatsApp, não volume.
--
-- A trava é a `chave`, montada por quem envia:
--   lembrete_vespera:<appointment_id>
--   aniversario:<customer_id>:2026
--   retorno:<customer_id>:2026-08
-- UNIQUE nela resolve todos os casos sem uma coluna por gatilho.
CREATE TABLE IF NOT EXISTS message_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    uuid REFERENCES businesses(id) ON DELETE CASCADE,
  chave          text NOT NULL UNIQUE,
  tipo           text NOT NULL,
  canal          text NOT NULL,               -- whatsapp | email
  destino        text NOT NULL,               -- telefone (só dígitos) ou email
  status         text NOT NULL,               -- enviado | falhou | ignorado
  erro           text,
  provider_id    text,                        -- id da mensagem no provedor
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  customer_id    uuid REFERENCES customers(id) ON DELETE SET NULL,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_log_negocio
  ON message_log (business_id, created_at DESC);

COMMENT ON COLUMN message_log.chave IS
  'Trava de idempotência. UNIQUE: o mesmo aviso nunca sai duas vezes.';

-- ── 3. QUEM PEDIU PRA NÃO RECEBER ───────────────────────────────
--
-- Toda mensagem carrega "responda PARE pra não receber". Respeitar isso
-- não é gentileza: é o que separa aviso de spam pra quem recebe, e é a
-- diferença entre um número que dura e um número que cai.
--
-- business_id NULL = pediu pra sair de tudo, de qualquer salão.
CREATE TABLE IF NOT EXISTS message_optout (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  telefone    text NOT NULL,                  -- só dígitos, com DDI
  motivo      text,
  created_at  timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_optout_unico
  ON message_optout (COALESCE(business_id::text, 'todos'), telefone);

-- ── 4. CANAL PRÓPRIO DO NEGÓCIO (Fase 2) ────────────────────────
--
-- Fase 1: uma instância só, do AgendaPRO, manda por todos — o nome do
-- salão vai DENTRO da mensagem. Fase 2: quem quiser conecta o próprio
-- número e passa a mandar dele.
--
-- As colunas nascem agora pra a Fase 2 ser uma configuração, não outra
-- migration. NULL = usa a instância do sistema.
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS wapp_instance_id text,
  ADD COLUMN IF NOT EXISTS wapp_token text,
  ADD COLUMN IF NOT EXISTS wapp_numero text;

COMMENT ON COLUMN businesses.wapp_instance_id IS
  'Instância própria do negócio (Fase 2). NULL = manda pela instância do AgendaPRO.';

-- ── 5. RLS ──────────────────────────────────────────────────────
--
-- message_rules: a dona mexe nas regras DELA.
-- message_log e message_optout: NENHUMA policy de propósito — só o
-- service_role entra. São dados de envio (telefone de cliente final,
-- erro de provedor) que nenhuma tela do painel precisa ler direto; quem
-- lê é rota de servidor. Ver reference_supabase_security_definer_lockdown:
-- tabela nova nasce fechada, abre depois se precisar.
ALTER TABLE message_rules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_optout ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS message_rules_dono ON message_rules;
CREATE POLICY message_rules_dono ON message_rules FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
