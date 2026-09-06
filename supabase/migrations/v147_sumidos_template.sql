-- v147 · Texto do WhatsApp da aba Sumidos, editavel pela dona.
--
-- Pedido do Eduardo (06/09/2026): a lista de sumidos tem que trazer o editor
-- de texto junto, nao mandar pra outra tela. Segue a convencao que ja existe
-- em businesses (whatsapp_confirmation_template, whatsapp_reminder_template):
-- coluna de texto dedicada, NULL = usa o padrao do codigo.
--
-- Placeholders: {nome} (primeiro nome), {dias}, {negocio}.
-- Aditiva e nullable: nenhuma linha existente muda de comportamento.

alter table public.businesses
  add column if not exists sumidos_template text;

comment on column public.businesses.sumidos_template is
  'Texto pre-preenchido no botao WhatsApp da aba Sumidos. NULL = padrao do codigo. Placeholders: {nome} {dias} {negocio}';
