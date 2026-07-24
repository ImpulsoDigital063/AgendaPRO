-- v97 · Marca de qual COMBO um atendimento veio (pro selo "COMBO" na agenda)
--
-- Hoje, aplicar um combo no agendamento cria um atendimento normal, sem guardar
-- que ele veio de um combo — por isso o card só mostra o serviço, sem diferenciar.
-- Esta coluna guarda o combo de origem (packages.id) pra a agenda mostrar o selo
-- "COMBO · <nome>" (Eduardo 24/07).
--
-- Seguro: coluna NOVA, opcional (null pra atendimento comum), FK com ON DELETE
-- SET NULL (apagar o combo não quebra o atendimento). Não mexe em nada existente.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS combo_package_id uuid REFERENCES packages(id) ON DELETE SET NULL;

-- Índice pra a agenda buscar em lote os combos dos atendimentos do dia
CREATE INDEX IF NOT EXISTS idx_appointments_combo_package
  ON appointments (combo_package_id) WHERE combo_package_id IS NOT NULL;
