-- v183 · AGENDADOR DAS MENSAGENS DENTRO DO BANCO (pg_cron) — 03/11/2026
--
-- Até aqui quem chamava /api/mensagens/varrer e /api/cron/sinal-vencendo era
-- o workflow do GitHub (.github/workflows/mensagens.yml, "de hora em hora").
-- O GitHub trata o horário como sugestão: medido em 500 rodadas, 6,7 por dia,
-- com buracos de 4 a 7 horas (03/11: 04:35 e mais nada até depois do meio-dia).
-- Sem rodada, nenhum lembrete sai.
--
-- Agora o próprio Postgres chama as rotas (pg_cron + pg_net), no horário.
-- As rotas não mudam. O GitHub fica de reserva: chamar duas vezes não duplica
-- mensagem, porque cada uma tem chave UNIQUE no message_log.
--
-- SEGREDO: não está neste arquivo. Vive no Vault com o nome
-- 'agendapro_cron_secret' (criado à parte, fora do git):
--   select vault.create_secret('<CRON_SECRET da Vercel>', 'agendapro_cron_secret');
--
-- Horários em UTC (Brasília = UTC-3):
--   · varredura: de hora em hora, 07:00 às 20:00 BRT (14 chamadas/dia) —
--     fora disso ela não manda nada pra cliente (HORA_INICIO 7 / HORA_FIM 21);
--   · sinal pra vencer: de hora em hora, no minuto 30, o dia todo (24/dia; o
--     aviso à dona sai a qualquer hora).
-- De hora em hora é o ritmo para o qual as rotas foram desenhadas: lembrete
-- de 3h sai entre 3h e 2h antes; aviso de sinal com JANELA_MIN 120 garante
-- pelo menos 1h. Eduardo (03/11) escolheu 1h para poupar CPU da Vercel
-- (Hobby). Se a fila não zerar numa chamada, sobra para a hora seguinte.

create extension if not exists pg_cron;

select cron.unschedule(jobid)
  from cron.job
 where jobname in ('agendapro-mensagens-varrer', 'agendapro-sinal-vencendo');

select cron.schedule(
  'agendapro-mensagens-varrer',
  '0 10-23 * * *',
  $job$
  select net.http_get(
    url := 'https://www.agendapro.net.br/api/mensagens/varrer',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'agendapro_cron_secret')
    ),
    timeout_milliseconds := 60000
  );
  $job$
);

select cron.schedule(
  'agendapro-sinal-vencendo',
  '30 * * * *',
  $job$
  select net.http_get(
    url := 'https://www.agendapro.net.br/api/cron/sinal-vencendo',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'agendapro_cron_secret')
    ),
    timeout_milliseconds := 60000
  );
  $job$
);
