-- v139 · Marca de que a dona JÁ FOI AVISADA que o sinal está pra vencer.
--
-- Até aqui o prazo do sinal estourava em silêncio absoluto: o horário voltava
-- pra agenda pública e o card seguia na agenda dela com o mesmo selo "a
-- confirmar" de quem acabou de marcar. Ela só descobria por acaso — a Wanessa
-- descobriu porque uma cliente reclamou (26/08/2026).
--
-- Pior: pode ser dinheiro que JÁ ENTROU. A cliente paga o PIX, manda o
-- comprovante no WhatsApp, a dona não marca "Recebi" a tempo, e o sistema
-- solta o horário por cima de uma venda feita. Foi exatamente o que quase
-- aconteceu com a Ariadne (pagou, e o agendamento foi cancelado sozinho).
--
-- Esta coluna existe pra duas coisas:
--   1. não avisar duas vezes o mesmo agendamento;
--   2. servir de condição pra trava seguinte — horário não é solto sem que o
--      aviso tenha saído antes.

alter table public.appointments
  add column if not exists sinal_aviso_enviado_at timestamptz;

comment on column public.appointments.sinal_aviso_enviado_at is
  'Quando a dona foi avisada de que o sinal está perto de vencer. NULL = ainda não avisamos — v139.';

-- A varredura roda de hora em hora e pergunta sempre a mesma coisa: quem está
-- pendente, sem pagamento e ainda não avisado. Sem índice isso vira varredura
-- de tabela inteira a cada hora, em toda a base.
create index if not exists idx_appointments_sinal_a_avisar
  on public.appointments (business_id, appointment_date)
  where status = 'pending'
    and sinal_valor is not null
    and sinal_pago_at is null
    and sinal_aviso_enviado_at is null;
