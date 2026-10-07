-- v154 · textos do WhatsApp manual de aniversário e sumidos, editáveis.
--
-- Nasceu em 07/10/2026 com a página "Avisos manuais": a Rosy queria editar a
-- mensagem que já sai pronta e o Eduardo pediu o mesmo pra aniversário e
-- sumidos. Até aqui esses textos não moravam em lugar nenhum: o "Chamar" dos
-- Sumidos era frase fixa no código e as campanhas de cupom escolhiam um modelo
-- de nicho a cada vez, sem guardar.
--
--   whatsapp_birthday_template       aniversário · campanha com cupom e
--                                     parabéns da recepção
--   whatsapp_sumidos_template        sumidos · botão "Chamar" (sem cupom)
--   whatsapp_sumidos_cupom_template  sumidos · campanha com cupom
--
-- NULL = usa o texto padrão do código (o de hoje). Aditiva e nullable: nenhum
-- negócio muda de comportamento até editar.

alter table public.businesses
  add column if not exists whatsapp_birthday_template text,
  add column if not exists whatsapp_sumidos_template text,
  add column if not exists whatsapp_sumidos_cupom_template text;
