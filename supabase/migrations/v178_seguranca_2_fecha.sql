-- v178 · SEGURANÇA, PASSO 2 de 2 (03/11/2026) — FECHA O QUE ESTAVA ABERTO
--
-- Rodar SÓ DEPOIS de: (a) v177 aplicada e (b) deploy do código que usa
-- resolver_cliente / cupom pelo servidor / página /agendar como anon.
-- Rollback: v178_seguranca_2_fecha_ROLLBACK.sql
begin;

-- 1. businesses / professionals: o público é só o visitante (anon), e só com
--    as colunas que as páginas públicas leem. Login de outro negócio deixa de
--    ver qualquer coisa (a equipe usa a policy de v177).
alter policy "publico ver negocio" on public.businesses to anon;
alter policy "publico ver profissionais" on public.professionals to anon;

revoke select, insert, update, delete on public.businesses from anon;
grant select (
  id, name, slug, description, phone, address, logo_url, cover_url, owner_id, created_at,
  brand_primary, brand_secondary, brand_mode, brand_accent, brand_neutral, brand_logo_url,
  category, google_place_id, google_rating, google_reviews_count,
  points_for_review, points_for_referral, points_mode, loyalty_enabled,
  instagram_url, facebook_url, tiktok_url, website_url, cta_usa_marca, slug_atalhos,
  slot_interval_minutes, max_daily_appointments, booking_days_with_service,
  servico_longo_atravessa_intervalo,
  no_show_punishment_enabled, no_show_penalty_mode, no_show_fixed_points,
  sinal_enabled, sinal_percent, sinal_modo, sinal_valor_fixo, sinal_faixa_acima,
  sinal_faixa_valor, sinal_cancel_horas, sinal_credito_dias
) on public.businesses to anon;
-- Fora do anon de propósito: pix_key, pix_receiver_name, pix_city, cnpj,
-- razao_social, email, whatsapp_*/wapp_* (tokens), templates, avisos, comissão.

revoke select, insert, update, delete on public.professionals from anon;
grant select (id, business_id, name, photo_url, active, created_at, does_appointments)
  on public.professionals to anon;

-- 2. clients: some a policy aberta. Ficam as de v177 (ver/editar quem atende).
--    Criar só por resolver_cliente (SECURITY DEFINER). Ninguém apaga pela API.
drop policy if exists "clients_authenticated_all" on public.clients;
revoke insert, delete on public.clients from authenticated;
revoke select, insert, update, delete on public.clients from anon;

-- 3. Cupons: sem leitura pública (rotas públicas consultam pelo servidor).
drop policy if exists "coupons_public_read" on public.coupons;
drop policy if exists "coupon_redemptions_public_read" on public.coupon_redemptions;
revoke select, insert, update, delete on public.coupons from anon;
revoke select, insert, update, delete on public.coupon_redemptions from anon;

-- 4. replace_professional_hours: o `<>` com auth_user_id NULO deixava passar
--    qualquer login para profissional sem acesso (9 em produção). Agora a regra
--    é explícita: dono, gerente ativo, a própria profissional, ou recepção
--    ativa quando o negócio liberou `recep_edita_horario`.
create or replace function public.replace_professional_hours(
  p_professional_id uuid,
  p_hours jsonb,
  p_updated_by_name text default null
) returns setof public.working_hours
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller   uuid := auth.uid();
  v_business uuid;
  v_owner    uuid;
  v_prof_uid uuid;
  v_recep_ok boolean;
begin
  if v_caller is null then
    raise exception 'Não autenticado' using errcode = 'P0001';
  end if;

  select p.business_id, b.owner_id, p.auth_user_id, coalesce(b.recep_edita_horario, false)
    into v_business, v_owner, v_prof_uid, v_recep_ok
    from public.professionals p
    join public.businesses b on b.id = p.business_id
   where p.id = p_professional_id;

  if v_business is null then
    raise exception 'Profissional não encontrado' using errcode = 'P0002';
  end if;

  if not (
       v_caller = v_owner
    or public.eh_gerente_do_negocio(v_business)
    or (v_prof_uid is not null and v_caller = v_prof_uid)
    or (v_recep_ok and exists (
          select 1 from public.professionals r
           where r.business_id = v_business and r.auth_user_id = v_caller
             and r.active and r.is_receptionist))
  ) then
    raise exception 'Sem permissão pra editar horários deste profissional' using errcode = '42501';
  end if;

  delete from public.working_hours where professional_id = p_professional_id;

  if jsonb_array_length(p_hours) > 0 then
    return query
    insert into public.working_hours (
      professional_id, day_of_week, start_time, end_time, slot_duration, updated_by_name, updated_at
    )
    select p_professional_id,
           (h->>'day_of_week')::int,
           (h->>'start_time')::time,
           (h->>'end_time')::time,
           (h->>'slot_duration')::int,
           p_updated_by_name,
           now()
      from jsonb_array_elements(p_hours) h
    returning *;
  end if;
end;
$$;
revoke all on function public.replace_professional_hours(uuid, jsonb, text) from public, anon;
grant execute on function public.replace_professional_hours(uuid, jsonb, text) to authenticated;

-- 5. Ex-funcionária: profissional DESATIVADA deixa de ter acesso ao negócio.
create or replace function public.tem_acesso_ao_negocio(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from businesses b
     where b.id = p_business_id and b.owner_id = auth.uid()
  ) or exists (
    select 1 from professionals p
     where p.business_id = p_business_id and p.auth_user_id = auth.uid() and p.active
  );
$$;

-- 6. services: `p.business_id = p.business_id` era sempre verdadeiro — toda
--    profissional logada via serviços de todos os negócios.
alter policy "profissional ve servicos do negocio" on public.services
  using (exists (
    select 1 from public.professionals p
     where p.business_id = services.business_id and p.auth_user_id = auth.uid()
  ));

-- 7. activity_log: qualquer um inseria linha (with check true).
alter policy "inserir log" on public.activity_log
  to authenticated
  with check (public.tem_acesso_ao_negocio(business_id));

-- 8. Storage: qualquer login apagava/trocava foto de outro negócio.
alter policy "pp_auth_insert" on storage.objects
  with check (bucket_id = 'professional-photos' and public.tem_acesso_pasta((storage.foldername(name))[1]));
alter policy "pp_auth_update" on storage.objects
  using (bucket_id = 'professional-photos' and public.tem_acesso_pasta((storage.foldername(name))[1]))
  with check (bucket_id = 'professional-photos' and public.tem_acesso_pasta((storage.foldername(name))[1]));
alter policy "pp_auth_delete" on storage.objects
  using (bucket_id = 'professional-photos' and public.tem_acesso_pasta((storage.foldername(name))[1]));
alter policy "product-photos · auth upload" on storage.objects
  with check (bucket_id = 'product-photos' and public.tem_acesso_pasta((storage.foldername(name))[1]));
alter policy "product-photos · auth update" on storage.objects
  using (bucket_id = 'product-photos' and public.tem_acesso_pasta((storage.foldername(name))[1]));
alter policy "product-photos · auth delete" on storage.objects
  using (bucket_id = 'product-photos' and public.tem_acesso_pasta((storage.foldername(name))[1]));

-- 9. Funções que não precisam de anon (login e servidor continuam).
revoke execute on function public.next_invoice_number(uuid) from public, anon;
grant execute on function public.next_invoice_number(uuid) to authenticated, service_role;
revoke execute on function public.salvar_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.salvar_push_subscription(text, text, text, text) to authenticated, service_role;
revoke execute on function public.remover_push_subscription(text) from public, anon;
grant execute on function public.remover_push_subscription(text) to authenticated, service_role;
grant execute on function public.replace_professional_hours(uuid, jsonb, text) to service_role;

commit;
notify pgrst, 'reload schema';
