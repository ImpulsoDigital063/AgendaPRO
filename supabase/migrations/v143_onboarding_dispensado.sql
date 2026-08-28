-- v143 · Dispensar o checklist de primeiros passos (28/08/2026)
--
-- O card "Primeiros passos" só sumia quando os 5 itens estavam completos.
-- Negócio que já opera fica com ele na tela por causa de item que nunca vai
-- fazer sentido — no Studio Isis Melo sobraram "sua foto profissional" e
-- "receber o 1º agendamento" depois que limpamos os dados de teste.
--
-- Agora a dona pode fechar o card. Default false: quem nunca clicar continua
-- vendo o checklist como sempre.
--
-- Idempotente.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS onboarding_dispensado boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.businesses.onboarding_dispensado IS
  'true = a dona fechou o card de primeiros passos e ele nao volta. false (padrao) = card aparece ate os 5 itens serem concluidos.';
