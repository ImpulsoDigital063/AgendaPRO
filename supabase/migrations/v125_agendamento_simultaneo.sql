-- v125 · agendamento simultâneo por negócio (20/08/2026)
--
-- Pedido do Gustavo (CAF): na fisioterapia ele atende dois pacientes no mesmo
-- horário com o mesmo profissional. Hoje o banco proíbe em DUAS camadas:
--
--   1. trigger trg_check_appointment_overlap (v9) → RAISE EXCEPTION (P0001)
--   2. constraint EXCLUDE no_overlap_appointments (v40) → 23P01
--
-- A constraint já sabe abrir exceção: o WHERE dela é
--   status IN ('pending','confirmed','completed') AND manual_overlap_accepted = false
-- ou seja, linha marcada com manual_overlap_accepted = true passa batido. Então
-- não preciso mexer nela — mexo em quem marca a linha.
--
-- A trigger passa a fazer duas coisas quando o negócio tem a chave ligada:
-- marca a linha como sobreposição aceita (o que desarma a constraint) e sai
-- sem checar. Para todo mundo que NÃO tem a chave, o comportamento é
-- byte a byte o mesmo de antes.
--
-- ⚠️ Detalhe que quase passou: a trigger antiga só disparava com
-- WHEN (NEW.status IN ('pending','confirmed')). Só que a CONSTRAINT também
-- pega 'completed' — e o fluxo "já atendi" grava direto como completed. Se eu
-- mantivesse o WHEN, a linha nunca seria marcada nesse caminho e o Gustavo
-- levaria 23P01 ao lançar dois atendimentos já realizados no mesmo horário.
-- Por isso a trigger agora dispara sempre, e o filtro de status foi pra dentro
-- da função.

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

-- Sem o WHEN: a função precisa rodar também em 'completed' pra marcar a linha
-- antes da constraint olhar.
drop trigger if exists trg_check_appointment_overlap on appointments;
create trigger trg_check_appointment_overlap
  before insert or update on appointments
  for each row
  execute function check_appointment_overlap();

comment on function check_appointment_overlap() is
  'Anti-overbooking. Negócio com businesses.agendamento_simultaneo=true fica isento: a linha é marcada com manual_overlap_accepted=true (o que também desarma a constraint no_overlap_appointments) e a checagem é pulada. Demais negócios: comportamento da v9.';
