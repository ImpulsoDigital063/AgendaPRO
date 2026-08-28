-- v144 · Grade de agenda por PROFISSIONAL + recepção que também atende
--        (pedidos da Isis, 28/08/2026)
--
-- ── 1. ve_agenda ────────────────────────────────────────────────
-- A Isis quer que a Madu e a Fernanda, que entraram agora, vejam só o
-- financeiro delas — sem grade de agenda. As outras continuam com tudo.
--
-- No Palace isso foi resolvido apagando a grade no código (Luana, 07/08), mas
-- lá é fork de um salão só. Aqui a mesma linha vale pros 28 negócios, então a
-- decisão precisa ser POR PESSOA. Default true: ninguém perde nada.
--
-- ── 2. recepção que atende ──────────────────────────────────────
-- A Josi atende (penteado, alisamento, spa) E vai operar o balcão: marcar,
-- cancelar, receber pagamento e ver a agenda de todas.
--
-- Não criei papel novo de propósito. `is_receptionist` já carrega as policies
-- de RLS, as telas e as permissões de recepção — o que impedia o acúmulo era
-- só o layout do painel do profissional, que expulsava QUALQUER recepção pra
-- /recepcao. Agora ele só expulsa quem é recepção PURA (não atende), e quem
-- faz as duas coisas fica com os dois painéis no mesmo login.
--
-- Efeito colateral aceito: o trigger de limite conta `is_receptionist = false`,
-- então quem acumula os dois papéis não ocupa vaga de profissional. Na prática
-- o negócio ganha uma vaga — a favor da cliente, e some se ela deixar de ser
-- recepção.
--
-- Idempotente.

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS ve_agenda boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.professionals.ve_agenda IS
  'true (padrao) = ve a grade de agenda no painel dela. false = so financeiro e conta (pedido da Isis pra quem entrou agora).';
