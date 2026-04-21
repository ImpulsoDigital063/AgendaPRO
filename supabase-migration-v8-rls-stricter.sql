-- Migration V8: RLS mais restritivo para clients e waitlist
-- Rodar no Supabase SQL Editor

-- ============================================================
-- CLIENTS — tabela global (sem business_id)
-- Público insere/consulta (booking flow), admin vê (via join)
-- ============================================================

DROP POLICY IF EXISTS "clients_select" ON clients;
DROP POLICY IF EXISTS "clients_insert" ON clients;
DROP POLICY IF EXISTS "clients_update" ON clients;
DROP POLICY IF EXISTS "clients_select_owner" ON clients;
DROP POLICY IF EXISTS "clients_insert_owner" ON clients;
DROP POLICY IF EXISTS "clients_update_owner" ON clients;
DROP POLICY IF EXISTS "clients_insert_public" ON clients;
DROP POLICY IF EXISTS "clients_select_public" ON clients;
DROP POLICY IF EXISTS "Dono vê clientes do negócio" ON clients;
DROP POLICY IF EXISTS "Dono insere clientes" ON clients;
DROP POLICY IF EXISTS "Público insere clientes" ON clients;

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode inserir (agendamento público)
CREATE POLICY "clients_insert" ON clients
  FOR INSERT WITH CHECK (true);

-- Qualquer um pode consultar (booking flow verifica por phone)
CREATE POLICY "clients_select" ON clients
  FOR SELECT USING (true);

-- Qualquer um pode atualizar (booking flow atualiza nome/email)
CREATE POLICY "clients_update" ON clients
  FOR UPDATE USING (true);

-- ============================================================
-- WAITLIST — dono vê/gerencia, público pode se inscrever
-- ============================================================

DROP POLICY IF EXISTS "waitlist_select_owner" ON waitlist;
DROP POLICY IF EXISTS "waitlist_insert_public" ON waitlist;
DROP POLICY IF EXISTS "waitlist_update_owner" ON waitlist;
DROP POLICY IF EXISTS "Dono vê waitlist" ON waitlist;

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Dono vê apenas waitlist do próprio negócio
CREATE POLICY "waitlist_select_owner" ON waitlist
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Público pode se inscrever na fila de espera
CREATE POLICY "waitlist_insert_public" ON waitlist
  FOR INSERT WITH CHECK (true);

-- Dono pode atualizar (marcar notified_at, etc.)
CREATE POLICY "waitlist_update_owner" ON waitlist
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );
