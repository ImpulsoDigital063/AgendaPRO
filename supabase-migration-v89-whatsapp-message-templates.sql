-- v89 · Modelos de mensagem de WhatsApp editáveis pelo dono
--
-- Z-API fica dormindo até 10 pagantes · por ora os envios são MANUAIS (wa.me).
-- O dono edita os textos de Confirmação e Lembrete em Configurações > Mensagens.
-- NULL = usa o template padrão do código (lib/message-templates.ts).
--
-- Variáveis suportadas: {cliente} {servico} {data} {hora} {negocio} {profissional}

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS whatsapp_confirmation_template text,
  ADD COLUMN IF NOT EXISTS whatsapp_reminder_template text;

COMMENT ON COLUMN public.businesses.whatsapp_confirmation_template IS
  'Modelo da mensagem de confirmação (wa.me manual). NULL = padrão do código. Vars: {cliente} {servico} {data} {hora} {negocio} {profissional}';
COMMENT ON COLUMN public.businesses.whatsapp_reminder_template IS
  'Modelo da mensagem de lembrete (wa.me manual). NULL = padrão do código. Vars: {cliente} {servico} {data} {hora} {negocio} {profissional}';
