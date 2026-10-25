-- v176 — GOOGLE AGENDA, A VOLTA (adicional da Ivna, 24/10/2026): compromisso
-- marcado no Google da dona vira BLOQUEIO de horário no AgendaPRO, só na
-- agenda dela (não fecha a clínica). Não vira agendamento: evento do Google
-- não tem cliente, serviço nem preço (decisão do Eduardo).
--
-- Bloqueio vindo do Google = linha comum em business_blocks com
-- google_event_id preenchido. Assim link público, grade, recepção e remarcar
-- respeitam sem mudar nada (todos já leem business_blocks). As listas de
-- "Bloqueios" escondem essas linhas: quem manda nelas é o Google.

alter table business_blocks add column if not exists google_event_id text;
create unique index if not exists business_blocks_google_evento_uidx
  on business_blocks (business_id, google_event_id) where google_event_id is not null;

-- bloqueio_professional_id: de quem é a agenda do Google (null = volta desligada)
-- puxado_em: última leitura do Google (trava de 2 min entre leituras)
alter table google_agenda_conexoes add column if not exists bloqueio_professional_id uuid
  references professionals(id) on delete set null;
alter table google_agenda_conexoes add column if not exists puxado_em timestamptz;
