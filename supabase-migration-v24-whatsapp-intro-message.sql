-- v24: mensagem pre-escrita do WhatsApp QR (editavel pelo dono)
alter table public.businesses
  add column if not exists whatsapp_intro_message text;

comment on column public.businesses.whatsapp_intro_message is
  'Mensagem pre-escrita que cai no WhatsApp do dono quando cliente escaneia o QR. Quando null, usa fallback "Ola! Quero agendar um horario na {nome}."';
