-- AgendaPRO — Migration V7
-- Feature: Controle de lembretes enviados (evita duplicidade)

-- Flag: lembrete D-1 (1 dia antes) ja enviado
alter table appointments add column if not exists reminded_1d boolean default false;

-- Flag: lembrete H-1 (1 hora antes) ja enviado
alter table appointments add column if not exists reminded_1h boolean default false;

-- Indice pra query dos crons
create index if not exists appointments_reminder_idx
  on appointments(appointment_date, status) where reminded_1d = false or reminded_1h = false;
