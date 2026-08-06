-- v114 · Notificação de agendamento novo deixa de depender do navegador
--
-- Achado da auditoria 05/08 (agendamentos por link):
-- quem avisava a dona era o NAVEGADOR DA CLIENTE. A rota /api/booking/submit
-- gravava o agendamento e devolvia ok; só então o BookingFlow disparava
-- /api/notify. Se o 4G caísse nesse intervalo, ou ela fechasse a aba, o
-- agendamento existia e ninguém era avisado — a dona só descobria abrindo a
-- agenda. Em salão isso é horário perdido.
--
-- A trava contra aviso repetido era "agendamento criado há menos de 10 min",
-- que não é idempotência: dois POSTs dentro da janela mandavam dois emails.
-- Por isso o servidor não podia simplesmente passar a avisar também.
--
-- Esta coluna resolve as duas coisas: o servidor passa a disparar o aviso
-- (garantia) e a chamada do navegador continua existindo (rede lenta), mas a
-- segunda vira no-op — quem chegar primeiro marca notified_at e avisa, o outro
-- só devolve o link de cancelamento.

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notified_at timestamptz;

COMMENT ON COLUMN appointments.notified_at IS
  'Quando o aviso de agendamento novo foi enviado (dona + cliente). Preenchido por /api/notify; segunda chamada não reenvia. v114.';

-- Agendamentos que já existem nunca serão notificados de novo (a janela de 10
-- min já passou faz tempo), então marcar os antigos evita qualquer disparo
-- retroativo se alguém chamar a rota com um id velho.
UPDATE appointments
   SET notified_at = created_at
 WHERE notified_at IS NULL
   AND created_at < now() - interval '10 minutes';
