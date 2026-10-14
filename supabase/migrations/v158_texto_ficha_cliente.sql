-- v158 · texto do WhatsApp que leva a ficha pra cliente preencher, editável.
--
-- Pedido do Eduardo (14/10/2026), logo depois da v157: cada negócio escreve a
-- mensagem do "Mandar pra cliente preencher" do jeito dele, igual aos textos
-- de aniversário e sumidos da v154. Editado em Avisos manuais → Ficha.
--
-- NULL = usa o padrão do código (lib/textos-manuais.ts). Aditiva e nullable.

alter table public.businesses
  add column if not exists whatsapp_ficha_template text;
