import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/admin-data'

/**
 * POST /api/sistema/cobranca  { businessId }
 *
 * "Enviar cobrança" — pega a cobrança PIX ABERTA do negócio no Asaas
 * (vencida ou pendente) e devolve um link de WhatsApp pronto, com a
 * mensagem + o link de pagamento, pra o operador conferir e enviar.
 *
 * Ação segura: NÃO cria cobrança nova nem mexe em dinheiro — só reusa a
 * cobrança que já existe. Se não houver cobrança aberta, avisa (opção 1).
 */

export const dynamic = 'force-dynamic'

const ALLOWED_EMAILS = ['edubchaves5@gmail.com']
const ASAAS_BASE = 'https://api.asaas.com/v3'

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function asaasGet(path: string) {
  const r = await fetch(`${ASAAS_BASE}${path}`, {
    headers: { access_token: process.env.ASAAS_API_KEY!, accept: 'application/json' },
  })
  return r.json().catch(() => ({}))
}

function waPhone(phone: string | null): string | null {
  if (!phone) return null
  let d = phone.replace(/\D/g, '')
  if (!d) return null
  if (d.length <= 11) d = '55' + d
  return d
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user?.email || !ALLOWED_EMAILS.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({} as { businessId?: string }))
  const businessId = body.businessId
  if (!businessId) return NextResponse.json({ error: 'businessId obrigatório' }, { status: 400 })

  const admin = serviceClient()
  const { data: biz } = await admin
    .from('businesses')
    .select('id, name, phone')
    .eq('id', businessId)
    .maybeSingle()
  if (!biz) return NextResponse.json({ error: 'negócio não encontrado' }, { status: 404 })

  const { data: sub } = await admin
    .from('subscriptions')
    .select('asaas_customer_id, pix_link_atual, price_cents')
    .eq('business_id', businessId)
    .maybeSingle()

  // Procura a cobrança PIX aberta no Asaas: primeiro vencida, depois pendente.
  let invoiceUrl: string | null = null
  let value: number | null = null
  if (sub?.asaas_customer_id) {
    for (const status of ['OVERDUE', 'PENDING']) {
      const list = await asaasGet(`/payments?customer=${sub.asaas_customer_id}&status=${status}&limit=5`)
      const items: Array<{ billingType?: string; invoiceUrl?: string; value?: number }> = list?.data ?? []
      const p = items.find((x) => x.billingType === 'PIX' && x.invoiceUrl) ?? items[0]
      if (p?.invoiceUrl) {
        invoiceUrl = p.invoiceUrl
        value = p.value ?? null
        break
      }
    }
  }
  // fallback: link guardado no banco
  if (!invoiceUrl && sub?.pix_link_atual) {
    invoiceUrl = sub.pix_link_atual
    value = sub.price_cents != null ? sub.price_cents / 100 : null
  }

  if (!invoiceUrl) {
    return NextResponse.json({ error: 'sem cobrança aberta pra reenviar' }, { status: 404 })
  }

  const valStr = value != null ? `R$${value.toFixed(2).replace('.', ',')}` : 'o valor do teu plano'
  const message =
    `Oi! Aqui é o Eduardo, da Impulso Digital. Segue o link pra renovar teu AgendaPRO (${valStr}): ` +
    `${invoiceUrl} — é só abrir e pagar por PIX que teu acesso reativa na hora.`

  const wp = waPhone(biz.phone)
  const waUrl = wp ? `https://wa.me/${wp}?text=${encodeURIComponent(message)}` : null

  console.log(
    `[SISTEMA/cobranca] ${user.email} preparou cobrança de "${biz.name}" (${biz.id}) · ${invoiceUrl} · ${new Date().toISOString()}`
  )

  return NextResponse.json({ waUrl, invoiceUrl, value, hasPhone: !!wp, message })
}
