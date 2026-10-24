-- v174 · Sinal conferido pela recepção (Ivna Loyola, 24/10/2026)
--
-- Na clínica da Ivna a cliente manda o comprovante do PIX pro WhatsApp da
-- clínica, que fica com a recepção. Com a opção ligada, a recepção também é
-- avisada quando a cliente diz que pagou e ganha "Sinais a conferir" pra
-- marcar "Recebi o sinal". O "Já paguei" segue confirmando o horário como em
-- todo negócio (modelo da Wanessa, v146).
--
-- Sem a opção (padrão), nada muda.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS sinal_conferido_pela_recepcao boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.businesses.sinal_conferido_pela_recepcao IS
  'v174 · a recepção confere o comprovante do sinal: recebe o aviso de "disse que pagou" e tem "Sinais a conferir". O "Já paguei" confirma o horário como sempre.';

-- Conferência depois de rodar:
--   SELECT column_name, data_type, column_default FROM information_schema.columns
--   WHERE table_name = 'businesses' AND column_name = 'sinal_conferido_pela_recepcao';
