-- v174 · Sinal conferido pela recepção (Ivna Loyola, 24/10/2026)
--
-- Por que existe: na clínica da Ivna a cliente manda o comprovante do PIX pro
-- WhatsApp da clínica e quem confere é a recepção (ou a dona). O "Já paguei"
-- da cliente NÃO confirma o horário: ele fica reservado (o prazo para de
-- correr, v146) até alguém conferir e tocar em "Recebi o sinal". Aí sim o
-- horário confirma e a cliente recebe a confirmação.
--
-- Sem a opção (padrão), nada muda: o "Já paguei" segue confirmando o horário
-- como sempre (Wanessa, Gessica e as outras contas com sinal).
--
-- Também liga o aviso de "disse que pagou" no celular da recepção, não só no
-- da dona.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS sinal_conferido_pela_recepcao boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.businesses.sinal_conferido_pela_recepcao IS
  'v174 · "Já paguei" não confirma o horário; a recepção/dona confere o comprovante e o "Recebi o sinal" confirma e manda a confirmação.';

-- Conferência depois de rodar:
--   SELECT column_name, data_type, column_default FROM information_schema.columns
--   WHERE table_name = 'businesses' AND column_name = 'sinal_conferido_pela_recepcao';
