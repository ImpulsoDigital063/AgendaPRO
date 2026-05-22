-- ============================================================
-- v62 · Recorrência de agendamentos
-- ============================================================
-- Adiciona vínculo entre agendamentos da mesma série (cliente que marca
-- toda quarta-feira, mensal etc). O modal AgendarModal gera N appointments
-- de uma vez com mesmo recurring_group_id.
--
-- Decisão arquitetural: materializa N rows (em vez de RRULE on-the-fly).
-- Mais simples · query/edit funciona igual aos outros · suporta cancelamento
-- individual ou da série inteira via group_id.
-- ============================================================

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS recurring_group_id uuid,
  ADD COLUMN IF NOT EXISTS recurring_index integer; -- 1, 2, 3, ..., N (qual posição na série)

-- Index pra query "todos os agendamentos da série X"
CREATE INDEX IF NOT EXISTS idx_appointments_recurring_group
  ON public.appointments (recurring_group_id)
  WHERE recurring_group_id IS NOT NULL;
