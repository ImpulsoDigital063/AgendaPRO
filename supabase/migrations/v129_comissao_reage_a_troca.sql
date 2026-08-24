-- v129 · comissão fixa acompanha a troca de serviço (24/08/2026)
--
-- Achado na auditoria: o snapshot só rodava no INSERT. Se o dono editava o
-- atendimento e trocava o serviço — de Sessão (comissão R$25) pra Avaliação
-- (R$35) — a comissão gravada continuava a antiga. O profissional recebia
-- menos e ninguém via, porque a tela mostra o número gravado sem dizer de onde
-- veio. Erro de dinheiro silencioso é o pior tipo.
--
-- Agora a foto é refeita quando MUDA o serviço ou MUDA o convênio (particular
-- ↔ empresa trocam o valor da comissão). Correção manual do valor continua
-- valendo: se o próprio update mexeu em commission_amount, é intenção humana e
-- a trigger não sobrescreve.

create or replace function snapshot_commission_amount()
returns trigger as $$
declare
  usa_valor_fixo boolean;
  v_comissao numeric(10,2);
  precisa_recalcular boolean;
begin
  if TG_OP = 'INSERT' then
    -- Valor mandado explicitamente (import, correção) manda.
    precisa_recalcular := NEW.commission_amount is null;
  else
    -- Mexeu no valor na mão? Respeita e sai.
    if NEW.commission_amount is distinct from OLD.commission_amount then
      return NEW;
    end if;
    precisa_recalcular :=
      (NEW.service_id is distinct from OLD.service_id)
      or (NEW.company_id is distinct from OLD.company_id);
  end if;

  if not precisa_recalcular then
    return NEW;
  end if;

  select b.comissao_valor_fixo into usa_valor_fixo
  from businesses b where b.id = NEW.business_id;

  if not coalesce(usa_valor_fixo, false) then
    return NEW;
  end if;

  if NEW.service_id is null then
    -- Sem serviço não há valor de onde tirar. Zera pra cair na porcentagem,
    -- em vez de manter a comissão de um serviço que não é mais esse.
    NEW.commission_amount := null;
    return NEW;
  end if;

  select case
           when NEW.company_id is null then s.commission_amount
           else coalesce(s.convenio_commission_amount, s.commission_amount)
         end
    into v_comissao
  from services s where s.id = NEW.service_id;

  NEW.commission_amount := v_comissao;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_snapshot_commission_amount on appointments;
create trigger trg_snapshot_commission_amount
  before insert or update on appointments
  for each row
  execute function snapshot_commission_amount();
