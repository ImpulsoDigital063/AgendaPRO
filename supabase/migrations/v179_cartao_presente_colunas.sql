-- v179 · CARTÃO PRESENTE: colunas que o código usa e nunca foram criadas (03/11/2026)
--
-- Auditoria 02/11: /api/admin/gift-cards/issue e /admin/cartao-presente
-- gravam e leem 6 colunas que não existem em produção (nenhuma migration as
-- criou). Emitir vale respondia 500 e a lista de envios agendados vinha vazia.
-- Só a Studio Isis Melo tem a função ligada; gift_cards está VAZIA, então é
-- só acréscimo, sem tocar em dado existente.
alter table public.gift_cards
  add column if not exists recipient_phone text,
  add column if not exists gift_message text,
  add column if not exists send_on date,
  add column if not exists sent_at timestamptz,
  add column if not exists sold_by_professional_id uuid references public.professionals(id) on delete set null,
  add column if not exists sold_by_role text check (sold_by_role in ('admin', 'reception'));

notify pgrst, 'reload schema';
