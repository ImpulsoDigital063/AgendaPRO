-- v97 — WEB PUSH: notificação de agendamento novo pro DONO (apita no celular).
-- Portado do appdelyvery (lib/push.ts + 0045_web_push.sql), SIMPLIFICADO:
-- o AgendaPRO NÃO usa trigger/pg_net — a rota /api/notify (que já roda com
-- service_role e já é chamada após o booking público) lê estas assinaturas e
-- empurra o push direto, do lado do e-mail. Por isso aqui só entram a tabela
-- e as RPCs de salvar/remover assinatura. Limpeza de assinatura morta (404/410)
-- é feita pela rota via service_role (DELETE direto), sem RPC.

-- Assinaturas de push — UMA por device/navegador do dono (ou profissional).
-- user_id = auth.uid() de quem clicou "Ativar" logado no painel.
-- A rota resolve o destinatário por professionals.auth_user_id → businesses.owner_id,
-- que batem com esse user_id (dono loga em /admin, profissional em /profissional).
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  business_id uuid references businesses(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz default now()
);
create index if not exists push_subs_user_ix on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;
drop policy if exists push_subs_own on push_subscriptions;
create policy push_subs_own on push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Cliente (logado no painel) registra/atualiza a própria assinatura.
-- business_id é resolvido pelo dono; se quem assina não é dono (ex.: profissional
-- convidado), fica null — não atrapalha o envio, que casa por user_id.
create or replace function salvar_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_business uuid;
begin
  select id into v_business from businesses where owner_id = auth.uid() limit 1;
  insert into push_subscriptions (user_id, business_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), v_business, p_endpoint, p_p256dh, p_auth, p_user_agent)
  on conflict (endpoint) do update
    set user_id    = excluded.user_id,
        business_id = excluded.business_id,
        p256dh     = excluded.p256dh,
        auth       = excluded.auth,
        user_agent = excluded.user_agent;
end; $$;

create or replace function remover_push_subscription(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;

grant execute on function salvar_push_subscription(text, text, text, text) to authenticated;
grant execute on function remover_push_subscription(text) to authenticated;
