-- Migration v23: descrição opcional do serviço
-- Texto livre que o adm pode adicionar pra ajudar o cliente a escolher
-- (ex: "Inclui hidratação e finalização", "Recomendado para pele sensível").
-- Renderizado abaixo do nome no card da página pública /[slug]/agendar.

alter table public.services
  add column if not exists description text;

comment on column public.services.description is 'Descrição opcional do serviço (até ~400 caracteres). Aparece no card de seleção da página pública.';
