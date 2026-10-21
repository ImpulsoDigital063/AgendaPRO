-- v166 · Um número, uma ficha (Eduardo autorizou a junção no chat, 21/10)
--
-- Junta as fichas que têm o mesmo `fone` no mesmo negócio (14 grupos em
-- 21/10) e trava o banco pra nunca mais existir duas.
--
-- Fica a ficha com mais agendamentos; empate, a que não é "Cliente
-- (avaliação)"; empate, a mais antiga. Tudo o que aponta pra ficha que sai
-- passa pra que fica, os pontos se somam e os dados vazios (email,
-- aniversário, CPF...) são completados com os da outra. Nome diferente
-- fica registrado na observação. Tudo numa transação: deu erro, nada muda.

do $$
declare
  g record;
  k uuid;      -- ficha que fica
  d record;    -- ficha que sai
begin
  for g in
    select business_id, fone from public.customers
    where fone is not null group by 1, 2 having count(*) > 1
  loop
    select c.id into k
    from public.customers c
    where c.business_id = g.business_id and c.fone = g.fone
    order by (select count(*) from public.appointments a where a.customer_id = c.id) desc,
             (c.name ilike 'Cliente (%') asc,
             c.created_at asc
    limit 1;

    for d in
      select * from public.customers
      where business_id = g.business_id and fone = g.fone and id <> k
    loop
      update public.appointments          set customer_id = k where customer_id = d.id;
      update public.points_transactions   set customer_id = k where customer_id = d.id;
      update public.review_claims         set customer_id = k where customer_id = d.id;
      update public.coupons               set customer_id = k where customer_id = d.id;
      update public.coupon_redemptions    set customer_id = k where customer_id = d.id;
      update public.invoices              set customer_id = k where customer_id = d.id;
      update public.customer_credits      set customer_id = k where customer_id = d.id;
      update public.customer_photos       set customer_id = k where customer_id = d.id;
      update public.client_form_responses set customer_id = k where customer_id = d.id;
      update public.sales                 set customer_id = k where customer_id = d.id;
      update public.customer_packages     set customer_id = k where customer_id = d.id;
      update public.message_log           set customer_id = k where customer_id = d.id;
      update public.ficha_convites        set customer_id = k where customer_id = d.id;
      update public.gift_cards            set recipient_customer_id = k where recipient_customer_id = d.id;
      update public.customers             set referred_by = k where referred_by = d.id and id <> k;

      update public.customers c set
        total_points         = coalesce(c.total_points, 0) + coalesce(d.total_points, 0),
        name                 = case when c.name ilike 'Cliente (%' and d.name not ilike 'Cliente (%' then d.name else c.name end,
        email                = coalesce(c.email, d.email),
        birthday             = coalesce(c.birthday, d.birthday),
        cpf                  = coalesce(c.cpf, d.cpf),
        rg                   = coalesce(c.rg, d.rg),
        instagram            = coalesce(c.instagram, d.instagram),
        profession           = coalesce(c.profession, d.profession),
        address              = coalesce(c.address, d.address),
        city                 = coalesce(c.city, d.city),
        referred_by          = coalesce(c.referred_by, d.referred_by),
        referral_credited_at = coalesce(c.referral_credited_at, d.referral_credited_at),
        notes = case
          when d.name ilike 'Cliente (%' or d.name = c.name then c.notes
          else concat_ws(E'\n', c.notes, 'Ficha juntada em 21/10/2026: este número também estava cadastrado como "' || d.name || '".')
        end
      where c.id = k;

      delete from public.customers where id = d.id;
    end loop;
  end loop;
end $$;

-- A trava: no mesmo negócio, um número só existe em uma ficha.
create unique index if not exists customers_um_numero_uma_ficha
  on public.customers (business_id, fone) where fone is not null;
