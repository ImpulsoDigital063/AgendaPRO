-- ═══════════════════════════════════════════════════════════════
-- v112 · SINAL NO AGENDAMENTO (PIX direto pro salão)
--
-- Pedido da Wanessa Silva (05/08/2026), com a especificação dada por ela:
-- "quando o cliente realiza o agendamento, antes de confirmar deveria
-- aparecer o QR code do Pix da empresa, aí o cliente após o pagamento tem
-- seu agendamento confirmado. Na academia que trabalho é assim."
--
-- E o motivo, dito por ela antes: "os dois maiores gargalos de
-- agendamentos são as faltas". Medido na base, 30 dias: R$ 5.395 em
-- atendimento cancelado ou não comparecido.
--
-- COMO O DINHEIRO ANDA: direto do cliente pro salão, via PIX. O sistema
-- só monta o código (BR Code é formato aberto do BACEN — ver
-- src/lib/pix-brcode.ts). Não passamos perto do dinheiro de ninguém:
-- sem taxa, sem gateway, sem discussão regulatória.
--
-- A confirmação é MANUAL: o dono olha o banco e marca "recebi". Foi
-- decisão consciente — automatizar exige PSP com taxa e conta por
-- cliente, e o valor está em travar o horário, não em confirmar sozinho.
--
-- DEFAULT DESLIGADO. Pedir dinheiro antes do atendimento muda a relação
-- do negócio com a cliente dele: quem não quiser, não vê nada mudar.
-- Barbearia de bairro provavelmente nunca liga; clínica de estética com
-- procedimento caro liga no primeiro dia.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS pix_key text,
  ADD COLUMN IF NOT EXISTS pix_receiver_name text,
  ADD COLUMN IF NOT EXISTS pix_city text,
  ADD COLUMN IF NOT EXISTS sinal_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sinal_percent integer NOT NULL DEFAULT 50;

COMMENT ON COLUMN businesses.pix_key IS
  'Chave PIX do salão: CPF/CNPJ (só dígitos), e-mail, telefone (+55…) ou aleatória. '
  'O dinheiro do sinal cai direto aqui — o AgendaPRO não intermedia.';
COMMENT ON COLUMN businesses.pix_receiver_name IS
  'Nome de quem recebe, como está no banco. O padrão BR Code corta em 25 caracteres.';
COMMENT ON COLUMN businesses.pix_city IS
  'Cidade do recebedor. Obrigatória no BR Code, cortada em 15 caracteres.';
COMMENT ON COLUMN businesses.sinal_enabled IS
  'Exige sinal antes de confirmar o horário. Default false: só sente quem ligar.';
COMMENT ON COLUMN businesses.sinal_percent IS
  'Percentual do valor do serviço cobrado como sinal (a Wanessa pediu percentual).';

-- Estado do sinal no atendimento. Mantido separado de `status` de propósito:
-- status descreve o ATENDIMENTO (pending/confirmed/completed), e sinal
-- descreve o PAGAMENTO ANTECIPADO. Misturar os dois faria "pending" querer
-- dizer duas coisas diferentes dependendo do negócio.
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS sinal_valor numeric,
  ADD COLUMN IF NOT EXISTS sinal_pago_at timestamptz;

COMMENT ON COLUMN appointments.sinal_valor IS
  'Valor do sinal cobrado neste agendamento, congelado no momento da marcação. '
  'Congelado porque o percentual do negócio pode mudar depois — e o que vale é '
  'o que foi combinado com a cliente naquele dia.';
COMMENT ON COLUMN appointments.sinal_pago_at IS
  'Quando o dono confirmou que o sinal caiu na conta. NULL = aguardando.';

-- Busca da tela "aguardando sinal": atendimentos com sinal pendente.
CREATE INDEX IF NOT EXISTS idx_appointments_sinal_pendente
  ON appointments (business_id, appointment_date)
  WHERE sinal_valor IS NOT NULL AND sinal_pago_at IS NULL;
