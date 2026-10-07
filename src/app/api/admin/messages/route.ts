/**
 * GET  /api/admin/messages  → modelos atuais do negócio (ou padrões)
 * PATCH /api/admin/messages → salva os modelos (confirmação, lembrete e, desde
 *   v154, aniversário / sumidos / sumidos com cupom)
 *
 * Só o DONO edita. Read-after-write no PATCH (λ.prova-na-fonte).
 * Body PATCH: { confirmation?, reminder?, birthday?, sumidos?, sumidosCupom? } (string|null)
 *   string vazia / null → volta pro padrão (grava NULL).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit-api'
import {
  DEFAULT_CONFIRMATION_TEMPLATE,
  DEFAULT_REMINDER_TEMPLATE,
} from '@/lib/message-templates'
import { DEFAULT_SUMIDOS_TEMPLATE, padraoAniversario, padraoSumidosCupom } from '@/lib/textos-manuais'

type Linha = {
  whatsapp_confirmation_template?: string | null
  whatsapp_reminder_template?: string | null
  whatsapp_birthday_template?: string | null
  whatsapp_sumidos_template?: string | null
  whatsapp_sumidos_cupom_template?: string | null
} | null

/* '' = usa o padrão. Mesmo formato no GET e no retorno do PATCH. */
function textos(b: Linha) {
  return {
    confirmation: b?.whatsapp_confirmation_template ?? '',
    reminder: b?.whatsapp_reminder_template ?? '',
    birthday: b?.whatsapp_birthday_template ?? '',
    sumidos: b?.whatsapp_sumidos_template ?? '',
    sumidosCupom: b?.whatsapp_sumidos_cupom_template ?? '',
  }
}

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

async function resolveOwnerBusiness(userId: string) {
  const admin = getAdminClient()
  const { data } = await admin
    .from('businesses')
    .select('id, description, whatsapp_confirmation_template, whatsapp_reminder_template, whatsapp_birthday_template, whatsapp_sumidos_template, whatsapp_sumidos_cupom_template')
    .eq('owner_id', userId)
    .maybeSingle()
  return { admin, business: data }
}

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'admin-messages-get', limit: 60, windowSeconds: 60 })
  if (rl) return rl

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { business } = await resolveOwnerBusiness(user.id)
  if (!business) return NextResponse.json({ error: 'Negócio não encontrado.' }, { status: 404 })

  return NextResponse.json({
    ...textos(business),
    defaults: {
      confirmation: DEFAULT_CONFIRMATION_TEMPLATE,
      reminder: DEFAULT_REMINDER_TEMPLATE,
      birthday: padraoAniversario(business.description),
      sumidos: DEFAULT_SUMIDOS_TEMPLATE,
      sumidosCupom: padraoSumidosCupom(business.description),
    },
  })
}

export async function PATCH(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'admin-messages-patch', limit: 30, windowSeconds: 60 })
  if (rl) return rl

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { admin, business } = await resolveOwnerBusiness(user.id)
  if (!business) return NextResponse.json({ error: 'Negócio não encontrado.' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const norm = (v: unknown): string | null => {
    if (typeof v !== 'string') return null
    const t = v.trim()
    return t.length > 0 ? t.slice(0, 1000) : null
  }

  const payload: Record<string, string | null> = {}
  if ('confirmation' in body) payload.whatsapp_confirmation_template = norm(body.confirmation)
  if ('reminder' in body) payload.whatsapp_reminder_template = norm(body.reminder)
  if ('birthday' in body) payload.whatsapp_birthday_template = norm(body.birthday)
  if ('sumidos' in body) payload.whatsapp_sumidos_template = norm(body.sumidos)
  if ('sumidosCupom' in body) payload.whatsapp_sumidos_cupom_template = norm(body.sumidosCupom)
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'Nada pra salvar.' }, { status: 400 })
  }

  const { error: updErr } = await admin
    .from('businesses')
    .update(payload)
    .eq('id', business.id)
  if (updErr) {
    return NextResponse.json({ error: `Erro ao salvar: ${updErr.message}` }, { status: 500 })
  }

  // λ.prova-na-fonte · relê e devolve o que ficou gravado
  const { data: after } = await admin
    .from('businesses')
    .select('whatsapp_confirmation_template, whatsapp_reminder_template, whatsapp_birthday_template, whatsapp_sumidos_template, whatsapp_sumidos_cupom_template')
    .eq('id', business.id)
    .maybeSingle()

  return NextResponse.json({ ok: true, ...textos(after) })
}
