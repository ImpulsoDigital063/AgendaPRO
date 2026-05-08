import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit-api'

/**
 * POST /api/admin/onboarding/mark
 *
 * Marca uma das 4 flags de onboarding como true.
 * Idempotente — se já tá true, não dá erro.
 *
 * Body: { field: ALLOWED_FIELDS }
 *
 * Auth: usuário autenticado dono do business.
 */

const ALLOWED_FIELDS = new Set([
  'welcome_modal_seen',
  'onboarding_horarios_revisado',
  'qr_code_compartilhado',
  'fidelidade_dica_lida',
])

export async function POST(req: NextRequest) {
  // Rate limit leve — operação só seta boolean, não destrutivo
  const rl = checkRateLimit(req, { key: 'onboarding-mark', limit: 30, windowSeconds: 60 })
  if (rl) return rl

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  let body: { field?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const field = body.field?.trim()
  if (!field || !ALLOWED_FIELDS.has(field)) {
    return NextResponse.json({ error: 'Campo inválido.' }, { status: 400 })
  }

  // Update via supabase client (RLS já filtra: owner_id = user.id na policy)
  const { error } = await supabase
    .from('businesses')
    .update({ [field]: true })
    .eq('owner_id', user.id)

  if (error) {
    console.error('[onboarding/mark] erro:', error.message)
    return NextResponse.json({ error: 'Erro ao salvar.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
