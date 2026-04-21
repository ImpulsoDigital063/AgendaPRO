-- V17 Adiciona service_ids no waitlist pra deep link da fila pular tambem o passo de servico

ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS service_ids uuid[];
