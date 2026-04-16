import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const HEX = /^#[0-9A-Fa-f]{6}$/
const MODE = new Set(['dark', 'light'])

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const primary = typeof body.brand_primary === 'string' ? body.brand_primary : null
  const secondary = typeof body.brand_secondary === 'string' ? body.brand_secondary : null
  const mode = typeof body.brand_mode === 'string' ? body.brand_mode : null

  if (primary && !HEX.test(primary)) return NextResponse.json({ error: 'brand_primary inválido' }, { status: 400 })
  if (secondary && !HEX.test(secondary)) return NextResponse.json({ error: 'brand_secondary inválido' }, { status: 400 })
  if (mode && !MODE.has(mode)) return NextResponse.json({ error: 'brand_mode inválido' }, { status: 400 })

  const update: Record<string, string> = {}
  if (primary) update.brand_primary = primary
  if (secondary) update.brand_secondary = secondary
  if (mode) update.brand_mode = mode

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
