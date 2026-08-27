-- v141 · Bônus na remuneração (item 3 · Studio Isis Melo)
--
-- Backport do Palace, onde nasceu em 16/06 a pedido do Marko: premiar a
-- profissional sem precisar de comissão pendente. A Isis pediu a mesma coisa.
--
-- Aditivo: não precisa de chave de isolamento porque não TIRA nada de ninguém.
-- Negócio que nunca lançar bônus fica com 0 em toda linha e nenhuma tela muda.
--
-- Duas formas de uso, as duas cobertas pelas colunas abaixo:
--   · bônus junto de um pagamento de comissão (paid_amount > 0 e bonus > 0)
--   · bônus avulso (appointmentIds vazio → paid_amount 0, só o bônus)
--
-- Idempotente.

ALTER TABLE public.commission_payments
  ADD COLUMN IF NOT EXISTS bonus_amount numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_reason text NULL;

COMMENT ON COLUMN public.commission_payments.bonus_amount IS
  'Valor extra pago a profissional alem da comissao. 0 = sem bonus (padrao). Bonus avulso vem com paid_amount 0 e nenhum appointment vinculado.';

COMMENT ON COLUMN public.commission_payments.bonus_reason IS
  'Motivo do bonus, escrito pela dona (ex: "meta do mes", "sabado cheio"). Null quando nao informado.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'commission_payments_bonus_amount_nao_negativo'
  ) THEN
    ALTER TABLE public.commission_payments
      ADD CONSTRAINT commission_payments_bonus_amount_nao_negativo
      CHECK (bonus_amount >= 0);
  END IF;
END $$;
