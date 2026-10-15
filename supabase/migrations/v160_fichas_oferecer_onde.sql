-- v160 · onde a ficha é oferecida, escolhido pela dona (15/10/2026)
--
-- A v159 ligava os três lugares juntos. O Eduardo pediu que a dona decida
-- numa área própria ("Ficha antes do atendimento", em Fichas Modelo) qual
-- ficha vai e ONDE:
--   'link'        tela de confirmação do agendamento pelo link público
--   'cadastro'    cartão depois de cadastrar a cliente no painel
--   'agendamento' tela de sucesso do agendamento feito pelo painel
--
-- Default com os três: quem já tinha marcado ficha em fichas_oferecer na
-- v159 (ninguém, hoje) continua igual. Sem ficha escolhida nada aparece.

alter table public.businesses
  add column if not exists fichas_oferecer_onde text[] not null default '{link,cadastro,agendamento}';
