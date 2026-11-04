-- QUEM ESTÁ DESATUALIZADO (depende da v185 · app_presenca) — 04/11/2026
-- Rodar no SQL editor do projeto aazvqjhebfcoruyipoaw (só leitura).
--
-- A versão no ar sai de: curl -s https://www.agendapro.net.br/api/versao
-- Colar o campo "versao" abaixo. Se ficar vazio, usa a versão mais vista no
-- www nas últimas 2h (bom o bastante logo depois de um deploy).

with no_ar as (
  select coalesce(
    nullif('', ''),   -- ← colar aqui a versão de /api/versao
    (select versao
       from app_presenca
      where origem = 'https://www.agendapro.net.br'
        and ultima_vez > now() - interval '2 hours'
      group by versao
      order by max(ultima_vez) desc, count(*) desc
      limit 1)
  ) as versao
)
select
  b.name                                         as negocio,
  coalesce(u.email, p.user_id::text)             as usuario,
  p.area,
  p.instalado,
  p.origem,
  p.versao,
  p.sw_versao,
  p.veio_de,
  to_char(p.ultima_vez at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') as ultima_vez_br,
  case
    when p.origem not in ('https://www.agendapro.net.br', 'https://agendapro.net.br',
                          'https://agenda-pro-seven.vercel.app')
      then 'ENDERECO FORA DO OFICIAL'
    when p.versao <> (select versao from no_ar)
      then 'VERSAO VELHA'
    else 'em dia'
  end                                            as situacao,
  left(p.user_agent, 120)                        as aparelho
from app_presenca p
left join businesses b on b.id = p.business_id
left join auth.users u on u.id = p.user_id
where p.ultima_vez > now() - interval '30 days'
order by (p.versao = (select versao from no_ar)) asc, p.ultima_vez desc;

-- Quem SUMIU (abriu nos últimos 30 dias mas não desde o último deploy): o
-- app pode estar preso num código que nem conta presença ainda (anterior à
-- v185) — esses não aparecem acima com versão nova. Compare com o horário
-- do deploy:
-- select b.name, p.area, p.origem, p.versao, p.ultima_vez
--   from app_presenca p left join businesses b on b.id = p.business_id
--  where p.ultima_vez < '<hora do deploy>'::timestamptz
--  order by p.ultima_vez desc;
