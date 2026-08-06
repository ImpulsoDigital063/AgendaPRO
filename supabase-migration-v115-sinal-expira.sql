-- v115 · Prazo pra pagar o sinal — cada dona escolhe o dela
--
-- Buraco que a v112/v113 deixaram: nada solta o horário de quem não paga.
-- O atendimento nasce 'pending' e fica assim pra sempre; o slot continua
-- bloqueado (a checagem de conflito e a constraint no_overlap contam pending
-- como ocupado). Do jeito que estava, o sinal virava uma forma de travar a
-- agenda de graça — o oposto do que a Wanessa pediu quando falou de faltas.
--
-- O prazo é por negócio porque a operação de cada uma é diferente: agenda
-- disputada quer 30 min, quem atende com hora marcada folgada prefere o dia
-- todo. Padrão 120 min: tempo de ver a mensagem e pagar, sem segurar a agenda.
--
-- Não existe cron de hora em hora (o plano da Vercel só permite uma vez por
-- dia), então a limpeza é sob demanda: acontece quando alguém tenta marcar
-- naquele horário e quando a dona abre a aba Sinal. Na prática o horário
-- volta a ficar livre no exato momento em que alguém precisa dele.

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS sinal_expira_minutos integer NOT NULL DEFAULT 120;

COMMENT ON COLUMN businesses.sinal_expira_minutos IS
  'Minutos que o horário fica reservado esperando o PIX do sinal. Vencido sem pagar, o atendimento é cancelado e o horário volta a ficar livre. Padrão 120. v115.';

-- Trava de sanidade: 5 minutos não dá tempo de ninguém pagar, e mais de uma
-- semana não é reserva, é a agenda parada.
ALTER TABLE businesses
  DROP CONSTRAINT IF EXISTS businesses_sinal_expira_minutos_check;
ALTER TABLE businesses
  ADD CONSTRAINT businesses_sinal_expira_minutos_check
  CHECK (sinal_expira_minutos BETWEEN 5 AND 10080);
