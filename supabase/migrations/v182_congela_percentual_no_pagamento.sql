-- v182 · PERCENTUAL DE COMISSÃO CONGELADO NO PAGAMENTO (03/11/2026, decisão Eduardo)
--
-- A comissão usava o % de HOJE da profissional: mudou de 40% para 50%, os
-- meses passados recalculavam e o Pendente antigo reabria. Agora, quando o
-- atendimento fica pago, grava-se em appointments.commission_percent o % da
-- hora — a mesma coluna que as telas já respeitam (v134, Studio Isis).
--
-- Regras, iguais às da tela de Remunerações:
--   · % = professionals.commission_percentage, ou 40 quando vazio;
--   · negócio de VALOR FIXO (comissao_valor_fixo) fica de fora: lá manda
--     commission_amount (CAF), pela trigger da v134;
--   · negócio POR SERVIÇO: a v134 já fotografa o % do serviço; aqui só cobre
--     o que ficou vazio (serviço sem % → vale o da pessoa, congelado).
-- Nome com "zz" de propósito: triggers BEFORE rodam em ordem alfabética, e
-- esta precisa rodar DEPOIS da trg_snapshot_commission_amount.

create or replace function public.congela_percentual_no_pagamento()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_fixo boolean;
  v_pct  numeric(5,2);
  trocou_prof boolean;
begin
  if NEW.paid_at is null or NEW.commission_amount is not null or NEW.professional_id is null then
    return NEW;
  end if;

  trocou_prof := TG_OP = 'UPDATE' and NEW.professional_id is distinct from OLD.professional_id;

  -- já tem % e não trocou de profissional: está congelado, não mexe
  if NEW.commission_percent is not null and not trocou_prof then
    return NEW;
  end if;
  -- trocou de profissional mas o % veio do serviço (v134): mantém
  if NEW.commission_percent is not null and trocou_prof
     and NEW.commission_percent is distinct from OLD.commission_percent then
    return NEW;
  end if;

  select coalesce(b.comissao_valor_fixo, false) into v_fixo from businesses b where b.id = NEW.business_id;
  if v_fixo then
    return NEW;
  end if;

  select coalesce(p.commission_percentage, 40) into v_pct from professionals p where p.id = NEW.professional_id;
  NEW.commission_percent := coalesce(v_pct, 40);
  return NEW;
end;
$$;

drop trigger if exists trg_zz_congela_percentual on public.appointments;
create trigger trg_zz_congela_percentual
  before insert or update on public.appointments
  for each row execute function public.congela_percentual_no_pagamento();

-- PASSADO: congela o % que as telas mostram HOJE (nenhum número muda).
update public.appointments a
   set commission_percent = coalesce(p.commission_percentage, 40)
  from public.professionals p, public.businesses b
 where p.id = a.professional_id
   and b.id = a.business_id
   and a.paid_at is not null
   and a.commission_amount is null
   and a.commission_percent is null
   and not coalesce(b.comissao_valor_fixo, false);
