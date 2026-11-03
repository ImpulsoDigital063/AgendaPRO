-- v181 · ATENDIMENTO EM ACERTO NÃO MUDA CALADO (03/11/2026, decisão Eduardo: bloquear com aviso)
--
-- Auditoria 02/11: dava para cancelar, trocar a profissional, mudar o valor ou
-- desmarcar o pagamento de um atendimento que já estava num acerto de comissão
-- pago. O acerto ficava com o valor antigo e a diferença sumia (caso real:
-- Ivna, atendimento cancelado de R$80 dentro de acerto quitado).
--
-- Trava no banco porque são muitos caminhos (rotas, link público, update
-- direto do navegador). Para mudar, o dono desfaz o acerto (DELETE
-- /api/admin/commission-payments), o que zera commission_payment_id — e mudar
-- o próprio commission_payment_id na mesma gravação continua permitido.
create or replace function public.trava_atendimento_acertado()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_nome text;
  v_data text;
begin
  if old.commission_payment_id is null then
    return new;
  end if;
  if new.commission_payment_id is distinct from old.commission_payment_id then
    return new; -- desfazendo/refazendo o acerto
  end if;
  if (new.status in ('cancelled', 'no_show') and new.status is distinct from old.status)
     or new.professional_id is distinct from old.professional_id
     or new.total_price is distinct from old.total_price
     or (old.paid_at is not null and new.paid_at is null) then
    select p.name, to_char(cp.paid_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY')
      into v_nome, v_data
      from commission_payments cp
      left join professionals p on p.id = cp.professional_id
     where cp.id = old.commission_payment_id;
    raise exception 'Este atendimento já entrou no acerto de comissão de % (pago em %). Desfaça o acerto em Financeiro › Remunerações › Histórico antes de mudar.',
      coalesce(v_nome, 'profissional'), coalesce(v_data, '?')
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_trava_atendimento_acertado on public.appointments;
create trigger trg_trava_atendimento_acertado
  before update on public.appointments
  for each row execute function public.trava_atendimento_acertado();
