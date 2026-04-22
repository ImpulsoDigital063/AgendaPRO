-- Migration v22: redes sociais do negócio
-- Adiciona Instagram, Facebook, TikTok e site na tabela businesses.
-- Os campos são todos opcionais (text nullable). Renderizados como ícones
-- na página pública /[slug] e configurados em Configurações → Negócio.

alter table public.businesses
  add column if not exists instagram_url text,
  add column if not exists facebook_url text,
  add column if not exists tiktok_url text,
  add column if not exists website_url text;

comment on column public.businesses.instagram_url is 'URL completa do perfil no Instagram (https://instagram.com/...)';
comment on column public.businesses.facebook_url is 'URL completa da página no Facebook (https://facebook.com/...)';
comment on column public.businesses.tiktok_url is 'URL completa do perfil no TikTok (https://tiktok.com/@...)';
comment on column public.businesses.website_url is 'URL completa do site oficial do negócio';
