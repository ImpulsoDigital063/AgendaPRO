import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

async function getBusinessId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: owner } = await supabase.from('businesses').select('id').eq('owner_id', user.id).maybeSingle()
  if (owner) return owner.id
  const { data: prof } = await supabase
    .from('professionals')
    .select('business_id')
    .eq('auth_user_id', user.id)
    .eq('active', true)
    .eq('is_receptionist', true)
    .maybeSingle()
  return prof?.business_id ?? null
}

/**
 * Só LEITURA: dono, recepção OU profissional ativa (v98 · 30/07/2026).
 *
 * A profissional precisa LER o template pra conseguir preencher a ficha da
 * cliente dela — sem isso, abrir a ficha estoura 401 no meio do atendimento.
 * Mas CRIAR / EDITAR / APAGAR template é configuração do negócio e continua
 * exclusivo de dono e recepção (getBusinessId acima, inalterado).
 */
async function getBusinessIdParaLeitura(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: owner } = await supabase.from('businesses').select('id').eq('owner_id', user.id).maybeSingle()
  if (owner) return owner.id
  const { data: prof } = await supabase
    .from('professionals')
    .select('business_id')
    .eq('auth_user_id', user.id)
    .eq('active', true)
    .maybeSingle()
  return prof?.business_id ?? null
}

function getAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

// freetext = folha em branco · draw = mapeamento/assinatura (canvas → PNG)
// checklist = bloco de vários Sim/Não numa grade (saúde) · options = itens
const ALLOWED_TYPES = ['text', 'textarea', 'freetext', 'number', 'date', 'select', 'checkbox', 'checklist', 'draw']

type FieldDef = {
  name: string
  label: string
  type: string
  required?: boolean
  options?: string[]
}

function validateFields(raw: unknown): FieldDef[] | null {
  if (!Array.isArray(raw)) return null
  const out: FieldDef[] = []
  for (const f of raw) {
    if (!f || typeof f !== 'object') return null
    const ff = f as Record<string, unknown>
    if (typeof ff.label !== 'string' || !ff.label.trim()) return null
    if (typeof ff.type !== 'string' || !ALLOWED_TYPES.includes(ff.type)) return null
    const name = typeof ff.name === 'string' && ff.name.trim()
      ? ff.name.trim()
      : ff.label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    out.push({
      name,
      label: ff.label.trim().slice(0, 200),
      type: ff.type,
      required: !!ff.required,
      options: Array.isArray(ff.options) ? ff.options.filter((o) => typeof o === 'string').map((o) => (o as string).slice(0, 100)) : undefined,
    })
  }
  return out
}

// GET · lista templates do business
export async function GET() {
  const supabase = await createClient()
  const businessId = await getBusinessIdParaLeitura(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const admin = getAdmin()
  const { data } = await admin
    .from('client_form_templates')
    .select('*')
    .eq('business_id', businessId)
    .eq('active', true)
    .order('created_at', { ascending: false })
  return NextResponse.json({ templates: data ?? [] })
}

// POST · cria template
export async function POST(request: Request) {
  const supabase = await createClient()
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  const fields = validateFields(body.fields)
  if (!fields || fields.length === 0) {
    return NextResponse.json({ error: 'invalid_fields' }, { status: 400 })
  }
  const admin = getAdmin()
  const { data, error } = await admin
    .from('client_form_templates')
    .insert({
      business_id: businessId,
      name: body.name.trim().slice(0, 200),
      description: typeof body.description === 'string' ? body.description.trim().slice(0, 500) : null,
      fields,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, template: data })
}

// PATCH ?templateId=... · edita template existente (faltava — editor chamava e dava 405)
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const url = new URL(request.url)
  const templateId = url.searchParams.get('templateId')
  if (!templateId) return NextResponse.json({ error: 'template_id_required' }, { status: 400 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  const fields = validateFields(body.fields)
  if (!fields || fields.length === 0) {
    return NextResponse.json({ error: 'invalid_fields' }, { status: 400 })
  }
  const admin = getAdmin()
  const { data: t } = await admin.from('client_form_templates').select('id, business_id').eq('id', templateId).maybeSingle()
  if (!t || t.business_id !== businessId) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const { data, error } = await admin
    .from('client_form_templates')
    .update({
      name: body.name.trim().slice(0, 200),
      description: typeof body.description === 'string' ? body.description.trim().slice(0, 500) : null,
      fields,
    })
    .eq('id', templateId)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, template: data })
}

// DELETE ?templateId=...
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const businessId = await getBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const url = new URL(request.url)
  const templateId = url.searchParams.get('templateId')
  if (!templateId) return NextResponse.json({ error: 'template_id_required' }, { status: 400 })
  const admin = getAdmin()
  const { data: t } = await admin.from('client_form_templates').select('id, business_id').eq('id', templateId).maybeSingle()
  if (!t || t.business_id !== businessId) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  // Soft delete (mantém respostas)
  await admin.from('client_form_templates').update({ active: false }).eq('id', templateId)
  return NextResponse.json({ ok: true })
}
