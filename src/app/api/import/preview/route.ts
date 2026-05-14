/**
 * POST /api/import/preview
 *
 * Recebe FormData:
 *  - source: ImportSource (string)
 *  - businessId: UUID do business destino
 *  - dedupe: DedupeStrategy (default 'external-id-then-phone')
 *  - clientsCsv: File (texto CSV)
 *  - appointmentsCsv: File (opcional)
 *
 * Retorna ImportReport sem gravar nada (dryRun=true).
 *
 * Segurança:
 *  - Auth obrigatório (user logado).
 *  - businessId tem que pertencer ao user logado (RLS amarra, mas valida-
 *    mos explicitamente pra retornar 403 mais claro que 500).
 *  - SSR client (respeita RLS). Não usa service role.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CONNECTORS, parseBySource, runImport, type ImportSource, type DedupeStrategy } from '@/lib/importers'
import { parseCsv, parseXlsxBuffer, type SheetRow } from '@/lib/importers/normalize'

async function fileToRows(file: File | null): Promise<SheetRow[] | undefined> {
  if (!file) return undefined
  const name = file.name.toLowerCase()
  const isXlsx = name.endsWith('.xlsx') || file.type.includes('spreadsheetml')
  if (isXlsx) {
    return await parseXlsxBuffer(await file.arrayBuffer())
  }
  // Default: trata como CSV (texto). Coverage: .csv · sem extensão · text/plain.
  return parseCsv(await file.text())
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'FormData inválido.' }, { status: 400 })
  }

  const source = form.get('source')?.toString() as ImportSource | undefined
  const businessId = form.get('businessId')?.toString()
  const dedupe = (form.get('dedupe')?.toString() ?? 'external-id-then-phone') as DedupeStrategy

  if (!source || !CONNECTORS[source]) {
    return NextResponse.json({ error: `Sistema fonte inválido: "${source}".` }, { status: 400 })
  }
  if (!businessId) {
    return NextResponse.json({ error: 'businessId obrigatório.' }, { status: 400 })
  }

  // Valida ownership: business existe E pertence ao user logado.
  const { data: business, error: bizErr } = await supabase
    .from('businesses')
    .select('id, owner_id')
    .eq('id', businessId)
    .maybeSingle()
  if (bizErr) {
    return NextResponse.json({ error: 'Erro ao validar negócio.' }, { status: 500 })
  }
  if (!business || business.owner_id !== user.id) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  const clientsFile = form.get('clientsCsv')
  const appointmentsFile = form.get('appointmentsCsv')

  let clientsRows: SheetRow[] | undefined
  let appointmentsRows: SheetRow[] | undefined
  try {
    clientsRows = await fileToRows(clientsFile instanceof File ? clientsFile : null)
    appointmentsRows = await fileToRows(appointmentsFile instanceof File ? appointmentsFile : null)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `Erro ao ler arquivo: ${msg}` }, { status: 400 })
  }

  if (!clientsRows || clientsRows.length === 0) {
    return NextResponse.json({ error: 'Arquivo de clientes obrigatório (vazio ou ilegível).' }, { status: 400 })
  }

  let canonical
  try {
    canonical = parseBySource(source, { clientsRows, appointmentsRows })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const report = await runImport(canonical, {
    supabase,
    businessId,
    source,
    dedupe,
    dryRun: true,
  })

  return NextResponse.json({ report })
}
