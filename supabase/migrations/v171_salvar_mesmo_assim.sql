-- v171 · "Salvar mesmo assim" passa a valer (Wanessa, 22/10/2026)
--
-- A edição do atendimento avisa o conflito de horário e oferece "salvar mesmo
-- assim" (force=true → manual_overlap_accepted=true). A constraint
-- no_overlap_appointments já ignora linha marcada, mas a trigger (parte v9)
-- checava de qualquer jeito e recusava. Resultado: o botão nunca funcionava
-- em negócio sem agendamento_simultaneo, e a rota deixava a lista de serviços
-- trocada com o agendamento antigo (Ana Caroline: Intensiva com preço de
-- Manutenção).
--
-- Agora a linha marcada como sobreposição aceita pula a checagem. Quem marca
-- é só a rota de edição (quando a pessoa confirma) e a própria trigger nos
-- negócios de atendimento simultâneo.

create or replace function check_appointment_overlap()
returns trigger as $$
declare
  permite_simultaneo boolean;
begin
  select b.agendamento_simultaneo into permite_simultaneo
  from businesses b
  where b.id = NEW.business_id;

  -- Negócio que trabalha com atendimento simultâneo (fisioterapia, aula em
  -- grupo, day-use): marca a linha e não checa nada.
  if coalesce(permite_simultaneo, false) then
    NEW.manual_overlap_accepted := true;
    return NEW;
  end if;

  -- A pessoa viu o conflito e confirmou "salvar mesmo assim".
  if coalesce(NEW.manual_overlap_accepted, false) then
    return NEW;
  end if;

  -- Daqui pra baixo é a v9 original, intacta.
  if NEW.status in ('pending', 'confirmed') then
    if exists (
      select 1 from appointments
      where professional_id = NEW.professional_id
        and appointment_date = NEW.appointment_date
        and status in ('pending', 'confirmed')
        and id != coalesce(NEW.id, '00000000-0000-0000-0000-000000000000')
        and (
          (NEW.start_time >= start_time and NEW.start_time < end_time)
          or (NEW.end_time > start_time and NEW.end_time <= end_time)
          or (NEW.start_time <= start_time and NEW.end_time >= end_time)
        )
    ) then
      raise exception 'Já existe um agendamento nesse horário para este profissional.';
    end if;
  end if;

  return NEW;
end;
$$ language plpgsql;
