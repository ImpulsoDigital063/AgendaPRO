-- Migration V9: Proteção contra double-booking (overbooking)
-- Rodar no Supabase SQL Editor

-- Função que verifica se já existe agendamento ativo no mesmo horário
CREATE OR REPLACE FUNCTION check_appointment_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM appointments
    WHERE professional_id = NEW.professional_id
      AND appointment_date = NEW.appointment_date
      AND status IN ('pending', 'confirmed')
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
      AND (
        (NEW.start_time >= start_time AND NEW.start_time < end_time)
        OR (NEW.end_time > start_time AND NEW.end_time <= end_time)
        OR (NEW.start_time <= start_time AND NEW.end_time >= end_time)
      )
  ) THEN
    RAISE EXCEPTION 'Já existe um agendamento nesse horário para este profissional.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que roda ANTES de cada INSERT ou UPDATE em appointments
DROP TRIGGER IF EXISTS trg_check_appointment_overlap ON appointments;
CREATE TRIGGER trg_check_appointment_overlap
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW
  WHEN (NEW.status IN ('pending', 'confirmed'))
  EXECUTE FUNCTION check_appointment_overlap();
