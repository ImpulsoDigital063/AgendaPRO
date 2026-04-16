-- AgendaPRO — Migration V6b
-- Feature: Flag de senha temporária do profissional convidado
-- (já rodada no Supabase — arquivo apenas para documentação)

alter table professionals add column if not exists password_changed boolean default false;
