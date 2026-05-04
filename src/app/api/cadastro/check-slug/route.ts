import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit-api'

const RESERVED = new Set([
  'admin', 'api', 'cadastro', 'login', 'profissional', 'agendar',
  'about', 'sobre', 'contato', 'home', 'index', 'app', 'www',
  'agendapro', 'support', 'help', 'docs', 'blog', 'privacidade',
  'termos', 'auth', 'public', 'static', 'assets',
])

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'check-slug', limit: 60, windowSeconds: 60 })
  if (rl) return rl

  const slug = req.nextUrl.searchParams.get('slug')?.trim().toLowerCase() || ''

  if (!slug) {
    return NextResponse.json({ ok: false, reason: 'empty' })
  }
  if (slug.length < 3) {
    return NextResponse.json({ ok: false, reason: 'short' })
  }
  if (slug.length > 50) {
    return NextResponse.json({ ok: false, reason: 'long' })
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ ok: false, reason: 'invalid' })
  }
  if (RESERVED.has(slug)) {
    return NextResponse.json({ ok: false, reason: 'reserved' })
  }

  const supabase = getAdminClient()
  const { data } = await supabase
    .from('businesses')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (data) {
    return NextResponse.json({ ok: false, reason: 'taken' })
  }

  return NextResponse.json({ ok: true })
}
