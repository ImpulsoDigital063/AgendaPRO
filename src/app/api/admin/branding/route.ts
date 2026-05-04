import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit-api'

const HEX = /^#[0-9A-Fa-f]{6}$/
const MODE = new Set(['dark', 'light'])

export async function PATCH(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'admin-branding', limit: 30, windowSeconds: 60 })
  if (rl) return rl

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const primary = typeof body.brand_primary === 'string' ? body.brand_primary : null
  const secondary = typeof body.brand_secondary === 'string' ? body.brand_secondary : null
  const mode = typeof body.brand_mode === 'string' ? body.brand_mode : null
  // cover_url pode ser string (URL nova) OU null (remover capa).
  // Detecta presença explícita do campo no body.
  const coverUrlProvided = 'cover_url' in body
  const coverUrl: string | null =
    body.cover_url === null
      ? null
      : typeof body.cover_url === 'string'
        ? body.cover_url
        : null

  if (primary && !HEX.test(primary)) return NextResponse.json({ error: 'brand_primary inválido' }, { status: 400 })
  if (secondary && !HEX.test(secondary)) return NextResponse.json({ error: 'brand_secondary inválido' }, { status: 400 })
  if (mode && !MODE.has(mode)) return NextResponse.json({ error: 'brand_mode inválido' }, { status: 400 })

  // Anti-injection: se cover_url for string, valida que aponta pro
  // bucket business-covers do projeto Supabase
  if (coverUrlProvided && coverUrl !== null) {
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
    const expectedPrefix = `${supabaseUrl}/storage/v1/object/public/business-covers/`
    if (!coverUrl.startsWith(expectedPrefix)) {
      return NextResponse.json(
        { error: 'cover_url precisa apontar pro bucket business-covers' },
        { status: 400 }
      )
    }
  }

  const update: Record<string, string | null> = {}
  if (primary) update.brand_primary = primary
  if (secondary) update.brand_secondary = secondary
  if (mode) update.brand_mode = mode
  if (coverUrlProvided) update.cover_url = coverUrl

  const { error } = await supabase
    .from('businesses')
    .update(update)
    .eq('owner_id', user.id)

  if (error) {
    console.error('Branding update error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar branding.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
