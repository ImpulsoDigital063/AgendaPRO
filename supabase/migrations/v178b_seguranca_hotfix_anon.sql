-- v178b · HOTFIX da v178 (03/11/2026)
-- A v178 tirou do anon as colunas de professionals que não são públicas. Só que
-- policies ANTIGAS com papel `public` em services, working_hours,
-- working_hours_dates, rewards e business_blocks fazem subconsulta em
-- professionals.auth_user_id / is_receptionist. Sem privilégio nessas colunas,
-- a consulta anon inteira falha e /[slug]/agendar mostrou ZERO serviços.
-- Essas duas colunas não são dado pessoal (uuid de login e flag de papel).
grant select (auth_user_id, is_receptionist) on public.professionals to anon;
notify pgrst, 'reload schema';
