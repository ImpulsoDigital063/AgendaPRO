-- v151 · Comissão paga no dia do atendimento (Izanara · Studio Mood, 03/10/2026)
--
-- Ela paga a profissional por Pix a cada atendimento. Sem esta chave, o
-- Financeiro/Fluxo/Remunerações acumulavam "Comissão a pagar" até ela registrar
-- cada Pix de novo em Remunerações. Ligada, a comissão gerada já conta como
-- paga quando o atendimento é pago. Só calcula, não grava commission_payments.
-- Decisão do Eduardo: vale SÓ pra Studio Mood (sem tela de configuração).

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS comissao_paga_no_atendimento boolean NOT NULL DEFAULT false;

UPDATE public.businesses
   SET comissao_paga_no_atendimento = true
 WHERE id = 'e77e2e57-7503-4e44-a6f2-db18be403743'; -- Studio Mood
