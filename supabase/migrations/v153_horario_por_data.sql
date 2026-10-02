-- =================================================================
-- V153 — Horário especial por data (abrir um dia avulso)
-- =================================================================
--
-- ORIGEM: Wanessa Silva (30/09/2026): "não quero atender toda sexta, mas
-- quero que na sexta 09/10 tenha atendimento, porque na quinta não vou
-- poder atender. Como tá, se eu abrir sexta abre horário todas as sextas."
--
-- working_hours é só por dia da semana. Fechar uma data já existia
-- (business_blocks, block_type='specific'); ABRIR uma data, não.
--
-- REGRA (Eduardo, 02/10): numa data com linha aqui, o horário dessa data
-- SUBSTITUI o horário semanal daquele dia — não soma. Serve pra abrir um
-- dia que é fechado (sexta 09/10) e pra mudar o horário de um dia que já
-- abre (segunda 13h–20h em vez de 9h–17h). Mais de uma linha na mesma
-- data = mais de um período (pausa no meio), igual working_hours (v31).
-- Bloqueio continua valendo POR CIMA (business_blocks tira horário).
--
-- Só cria tabela nova. Nenhuma tabela existente é alterada.
-- =================================================================

CREATE TABLE IF NOT EXISTS public.working_hours_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_duration integer NOT NULL DEFAULT 30,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  CONSTRAINT working_hours_dates_periodo_valido CHECK (end_time > start_time),
  CONSTRAINT working_hours_dates_slot_valido CHECK (slot_duration BETWEEN 5 AND 480),
  CONSTRAINT working_hours_dates_unico UNIQUE (professional_id, date, start_time)
);

CREATE INDEX IF NOT EXISTS idx_working_hours_dates_business_date
  ON public.working_hours_dates (business_id, date);
CREATE INDEX IF NOT EXISTS idx_working_hours_dates_prof_date
  ON public.working_hours_dates (professional_id, date);

ALTER TABLE public.working_hours_dates ENABLE ROW LEVEL SECURITY;

-- Dono gerencia tudo do negócio dele
DROP POLICY IF EXISTS "dono gerencia horario por data" ON public.working_hours_dates;
CREATE POLICY "dono gerencia horario por data" ON public.working_hours_dates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = working_hours_dates.business_id AND b.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = working_hours_dates.business_id AND b.owner_id = auth.uid())
  );

-- Recepção gerencia o do negócio onde trabalha (ela já edita os horários)
DROP POLICY IF EXISTS "recep gerencia horario por data" ON public.working_hours_dates;
CREATE POLICY "recep gerencia horario por data" ON public.working_hours_dates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.professionals p WHERE p.business_id = working_hours_dates.business_id AND p.auth_user_id = auth.uid() AND p.is_receptionist = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.professionals p WHERE p.business_id = working_hours_dates.business_id AND p.auth_user_id = auth.uid() AND p.is_receptionist = true)
  );

-- Profissional gerencia só os PRÓPRIOS dias (mesma regra do v19 em working_hours)
DROP POLICY IF EXISTS "prof gerencia seu horario por data" ON public.working_hours_dates;
CREATE POLICY "prof gerencia seu horario por data" ON public.working_hours_dates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = working_hours_dates.professional_id AND p.auth_user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = working_hours_dates.professional_id AND p.auth_user_id = auth.uid())
  );

-- Público lê (link de agendamento, sem login) — só horário, nenhum dado pessoal.
-- Mesmo caso de working_hours e de business_blocks (v62).
DROP POLICY IF EXISTS "public ve horario por data" ON public.working_hours_dates;
CREATE POLICY "public ve horario por data" ON public.working_hours_dates
  FOR SELECT USING (true);

-- Conferência depois de rodar:
--   SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'public.working_hours_dates'::regclass;
--   → 4 linhas: dono (*), recep (*), prof (*), public (r)
