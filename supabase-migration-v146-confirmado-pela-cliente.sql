-- v146 · o sistema sabia que avisou, mas não sabia o que ela respondeu
--
-- Eduardo, 01/09, sobre o botão "Confirmar presença": "nós criamos um selo
-- para o sistema colocar no agendamento como confirmado pela cliente".
--
-- Hoje o toque no botão grava `status = 'confirmed'`. O problema é que o
-- agendamento JÁ NASCE confirmado — em todos os caminhos:
--
--   status: valorSinal ? 'pending' : 'confirmed'
--
-- Então escrever 'confirmed' por cima de 'confirmed' não muda nada, e a dona
-- não tem como distinguir "a cliente disse que vem" de "foi criado assim".
-- A agenda tem `reminded_1d`, `reminded_1h` e `reminded_3h`: ela sabe que
-- AVISOU, e não sabe o que voltou.
--
-- É a informação que justifica o lembrete existir. Sem ela a dona manda a
-- mensagem e continua sem saber quem vem — que é o problema que ela queria
-- resolver contratando o pacote.
--
-- Timestamp e não booleano de propósito: "confirmou ontem às 17h" e
-- "confirmou agora" valem coisas diferentes pra quem decide se libera a
-- cadeira. Um booleano jogaria essa diferença fora.

alter table public.appointments
  add column if not exists confirmado_em timestamptz;

comment on column public.appointments.confirmado_em is
  'Quando a cliente tocou em "Confirmar presença" no WhatsApp. NULL = ela não respondeu — não confunda com o status, que já nasce confirmed.';

-- A agenda do dia filtra por negócio e data e agora lê esta coluna junto.
-- Índice parcial: só as confirmadas entram, que é a minoria das linhas.
create index if not exists idx_appointments_confirmado_em
  on public.appointments (business_id, appointment_date)
  where confirmado_em is not null;
