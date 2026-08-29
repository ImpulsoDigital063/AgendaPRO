-- v144 · cada negócio pode ter o texto dele, aprovado pela Meta
--
-- Fora da janela de 24h só sai template aprovado, e template mora na conta
-- do WhatsApp — que é uma só, da AgendaPRO. Se a dona editasse o texto
-- direto, mudaria para TODOS os negócios.
--
-- A saída é uma variante por negócio dentro da mesma conta: o CAF ganha um
-- `agendapro_lembrete_vespera_caf` com o texto dele, e o motor usa a
-- variante quando ela existe e está aprovada. Fica isolado sem precisar de
-- conta separada por cliente.
--
-- `nome_meta` é UNIQUE porque é o identificador do lado da Meta: dois
-- negócios apontando pro mesmo template seria justamente o vazamento que
-- esta tabela existe pra impedir.

create table if not exists public.message_templates_negocio (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  tipo        text not null,
  -- Nome registrado na Meta. Só [a-z0-9_], limite dela.
  nome_meta   text not null unique,
  corpo       text not null,
  -- PENDING | APPROVED | REJECTED | PAUSED | DISABLED — espelha a Meta.
  -- Só APPROVED é usado no envio; o resto cai no texto padrão.
  status      text not null default 'PENDING',
  -- Motivo da reprovação, pra dona ler em português em vez de código.
  motivo      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Um texto próprio por tipo, por negócio. Editar substitui.
  unique (business_id, tipo)
);

create index if not exists mtn_business_status_idx
  on public.message_templates_negocio (business_id, status);

-- Sem policy nenhuma: só o service role entra, pelas rotas que já conferem
-- dono. Texto de mensagem de um negócio não pode ser lido por outro.
alter table public.message_templates_negocio enable row level security;

comment on table public.message_templates_negocio is
  'Texto próprio de cada negócio para os avisos, aprovado pela Meta. Só status=APPROVED é usado no envio.';
