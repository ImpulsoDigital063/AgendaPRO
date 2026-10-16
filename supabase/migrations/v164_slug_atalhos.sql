-- v164 — atalhos de link (link curto) por negócio
--
-- POR QUE (Eduardo, 16/10/2026 · Ivna Loyola)
-- O link dela é agendapro.net.br/ivna-loyola-beauty-clinic — longo pra falar e
-- pra pôr na bio. Trocar o slug quebraria o QR Code que ela já divulgou
-- (qr_code_compartilhado = true) e todo link já mandado. O atalho só ACRESCENTA
-- um endereço: agendapro.net.br/ivnaloyola leva pro slug de sempre.
--
-- Quem resolve: src/lib/atalho-slug.ts, chamado pelas páginas /[slug] quando o
-- slug não existe. O cadastro (check-slug e /api/cadastro) recusa slug novo que
-- já seja atalho de alguém.

alter table businesses
  add column if not exists slug_atalhos text[] not null default '{}';

create index if not exists businesses_slug_atalhos_idx on businesses using gin (slug_atalhos);
