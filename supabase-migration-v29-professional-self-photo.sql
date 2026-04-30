-- =================================================================
-- V29 — PROFISSIONAL PODE FAZER UPLOAD DA PRÓPRIA FOTO
-- =================================================================
--
-- Antes (v5): apenas o owner do business (admin) podia fazer upload em
-- professional-photos. Profissional contratado tentava subir foto pelo
-- /profissional/conta e tomava erro RLS silencioso.
--
-- Em uso em massa: 100 barbearias x 5 profissionais = 500 profissionais
-- bloqueados. 500 chamados de suporte.
--
-- Esta migration ADICIONA policies (não remove as do owner) permitindo
-- profissional autenticado fazer insert/update/delete da PRÓPRIA foto.
-- O path canônico continua sendo "<business_id>/<professional_id>.<ext>"
-- — a policy compara o segundo segmento (sem extensão) com o id do
-- profissional logado.
--
-- IDEMPOTENTE.
-- =================================================================

-- Drop antigas (caso rerunning)
drop policy if exists "pp_self_insert" on storage.objects;
drop policy if exists "pp_self_update" on storage.objects;
drop policy if exists "pp_self_delete" on storage.objects;

-- INSERT: profissional logado pode adicionar foto se o path bate com
-- business_id dele E filename (sem ext) bate com prof_id dele
create policy "pp_self_insert"
on storage.objects for insert
with check (
  bucket_id = 'professional-photos'
  and exists (
    select 1 from public.professionals p
    where p.auth_user_id = auth.uid()
      and p.business_id::text = (storage.foldername(name))[1]
      and regexp_replace(split_part(name, '/', 2), '\.[^.]+$', '') = p.id::text
  )
);

-- UPDATE: idem (re-upload da própria foto)
create policy "pp_self_update"
on storage.objects for update
using (
  bucket_id = 'professional-photos'
  and exists (
    select 1 from public.professionals p
    where p.auth_user_id = auth.uid()
      and p.business_id::text = (storage.foldername(name))[1]
      and regexp_replace(split_part(name, '/', 2), '\.[^.]+$', '') = p.id::text
  )
);

-- DELETE: idem (remover foto)
create policy "pp_self_delete"
on storage.objects for delete
using (
  bucket_id = 'professional-photos'
  and exists (
    select 1 from public.professionals p
    where p.auth_user_id = auth.uid()
      and p.business_id::text = (storage.foldername(name))[1]
      and regexp_replace(split_part(name, '/', 2), '\.[^.]+$', '') = p.id::text
  )
);

-- =================================================================
-- NOTA: a tabela `professionals` NÃO ganha policy de UPDATE genérica
-- pro profissional. Updates de photo_url passam pela rota
-- /api/profissional/update-photo que valida auth + usa service_role
-- pra setar APENAS o campo photo_url. Isso evita escalada de
-- privilégio (profissional alterar a própria comissão, role, etc).
-- =================================================================
