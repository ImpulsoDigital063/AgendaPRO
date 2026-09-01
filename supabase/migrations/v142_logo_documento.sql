-- v142 · Logo específica de documento (01/09/2026)
--
-- Pedido do Gustavo (CAF), depois de falar com o contador: o extrato/fatura
-- saía com marca e nome do CAF e o CNPJ da G.M.E. Saúde Ltda. "CAF é nome
-- fantasia; lá vai aparecer a imagem do CAF com o CNPJ da GME." Papel que
-- circula entre PJ com marca de um e documento de outro trava no financeiro do
-- outro lado.
--
-- Por que coluna nova e não trocar `logo_url`: aquela é a marca que o paciente
-- vê — no app, na página pública, no WhatsApp. Trocar ali renomearia o negócio
-- inteiro. O que muda é só o que sai impresso pra terceiro.
--
-- Nulo = documento usa a logo normal do negócio, como sempre fez. Só quem tem
-- razão social diferente do nome fantasia precisa preencher.

alter table businesses
  add column if not exists logo_documento_url text;

comment on column businesses.logo_documento_url is
  'Logo impressa no extrato/fatura de convênio, quando a razão social tem marca própria diferente do nome fantasia (ex: CAF no app, GME Saúde no documento). Nulo = usa logo_url.';
