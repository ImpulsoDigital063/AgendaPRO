-- V21 — Nome usado na avaliacao do Google
-- Cliente informa qual nome usou ao postar review no Google.
-- Dono confere visualmente no perfil (Ctrl+F com o nome) antes de aprovar.
-- Idempotente.

ALTER TABLE review_claims
  ADD COLUMN IF NOT EXISTS google_review_name text;
