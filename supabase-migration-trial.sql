-- Migration: trial_ends_at
-- Adiciona coluna de expiração do período de trial

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- Contas existentes ficam sem restrição (NULL = sem trial ativo = acesso livre)
-- Novas contas receberão trial_ends_at = now() + 14 days via API de cadastro
