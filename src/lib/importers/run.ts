/**
 * Importer central — recebe CanonicalImport + businessId e grava no Supabase.
 *
 * Usado tanto no preview (dryRun=true) quanto no commit. No preview, gera
 * o ImportReport sem tocar no banco — útil pra mostrar o "vai importar X,
 * atualizar Y, pular Z" antes do user clicar confirmar.
 *
 * Estratégia de dedupe (DedupeStrategy):
 *  - external-id-then-phone (recomendado): se tem externalId, bate por
 *    (business_id, import_source, external_id); senão bate por
 *    (business_id, phone). UPSERT correspondente.
 *  - update: bate só por telefone. Substitui campos não-nulos.
 *  - skip: bate só por telefone. Mantém o que existe.
 *
 * Idempotência: rodar 2x o mesmo CSV com strategy 'external-id-then-phone'
 * resulta em 0 novos inserts na 2ª execução (todos updates ou skips).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CanonicalClient,
  CanonicalImport,
  DedupeStrategy,
  ImportReport,
  ImportSource,
  ImportWarning,
} from './canonical'

export type RunOptions = {
  supabase: SupabaseClient
  businessId: string
  source: ImportSource
  dedupe: DedupeStrategy
  /** Se true, NÃO grava — só calcula o ImportReport. */
  dryRun: boolean
}

export async function runImport(
  canonical: CanonicalImport,
  opts: RunOptions,
): Promise<ImportReport> {
  const start = Date.now()
  const warnings: ImportWarning[] = [...canonical.warnings]

  const clientReport = await importClients(canonical.clients, opts, warnings)

  // Agendamentos ficam pra fase 2 — quando os connectors entregarem
  // CanonicalAppointment[]. Ainda assim conta como "parsed: 0" pra
  // estrutura do report ficar estável.
  const apptReport = {
    parsed: canonical.appointments.length,
    inserted: 0,
    skipped: 0,
    invalid: 0,
  }
  if (canonical.appointments.length > 0) {
    warnings.push({
      level: 'info',
      message: `${canonical.appointments.length} agendamentos detectados mas ainda não importáveis (fase 2).`,
    })
  }

  return {
    source: opts.source,
    clients: clientReport,
    appointments: apptReport,
    warnings,
    durationMs: Date.now() - start,
  }
}

async function importClients(
  clients: CanonicalClient[],
  opts: RunOptions,
  warnings: ImportWarning[],
): Promise<ImportReport['clients']> {
  const report = {
    parsed: clients.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    invalid: 0,
  }
  if (clients.length === 0) return report

  // Carrega existentes do business em UMA query — match em memória é mais
  // rápido que N queries individuais. Limite prático: ~50k clientes/business.
  const { data: existing, error: loadErr } = await opts.supabase
    .from('customers')
    .select('id, phone, import_source, import_external_id')
    .eq('business_id', opts.businessId)

  if (loadErr) {
    warnings.push({
      level: 'skip',
      message: `Falha ao carregar customers existentes: ${loadErr.message}`,
    })
    report.invalid = clients.length
    return report
  }

  const byPhone = new Map<string, { id: string }>()
  const byExternal = new Map<string, { id: string }>()
  for (const c of existing ?? []) {
    if (c.phone) byPhone.set(c.phone, { id: c.id })
    if (c.import_source === opts.source && c.import_external_id) {
      byExternal.set(c.import_external_id, { id: c.id })
    }
  }

  const toInsert: Array<Record<string, unknown>> = []
  const toUpdate: Array<{ id: string; patch: Record<string, unknown> }> = []

  for (const c of clients) {
    // Decide se é update, skip ou insert
    let matchId: string | null = null

    if (opts.dedupe === 'external-id-then-phone') {
      if (c.externalId) matchId = byExternal.get(c.externalId)?.id ?? null
      if (!matchId) matchId = byPhone.get(c.phone)?.id ?? null
    } else {
      matchId = byPhone.get(c.phone)?.id ?? null
    }

    if (matchId) {
      if (opts.dedupe === 'skip') {
        report.skipped++
        continue
      }
      toUpdate.push({
        id: matchId,
        patch: buildCustomerPatch(c, opts.source),
      })
      report.updated++
    } else {
      toInsert.push(buildCustomerInsert(c, opts.businessId, opts.source))
      report.inserted++
    }
  }

  if (opts.dryRun) return report

  // INSERT em batches de 500 — Supabase aceita até ~1000, deixar margem.
  for (let i = 0; i < toInsert.length; i += 500) {
    const batch = toInsert.slice(i, i + 500)
    const { error } = await opts.supabase.from('customers').insert(batch)
    if (error) {
      warnings.push({
        level: 'skip',
        message: `Erro no batch de INSERT (registros ${i}-${i + batch.length}): ${error.message}`,
      })
      report.invalid += batch.length
      report.inserted -= batch.length
    }
  }

  // UPDATE: por ID, um a um (Supabase não tem bulk update — usar PostgREST
  // não vale o esforço pra escala de salão).
  for (const u of toUpdate) {
    const { error } = await opts.supabase
      .from('customers')
      .update(u.patch)
      .eq('id', u.id)
    if (error) {
      warnings.push({
        level: 'skip',
        message: `Erro no UPDATE id=${u.id}: ${error.message}`,
      })
      report.invalid++
      report.updated--
    }
  }

  return report
}

function buildCustomerInsert(
  c: CanonicalClient,
  businessId: string,
  source: ImportSource,
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    business_id: businessId,
    name: c.name,
    phone: c.phone,
    import_source: source,
    imported_at: new Date().toISOString(),
  }
  if (c.email) row.email = c.email
  if (c.birthday) row.birthday = c.birthday
  if (c.notes) row.notes = c.notes
  if (c.externalId) row.import_external_id = c.externalId
  return row
}

function buildCustomerPatch(c: CanonicalClient, source: ImportSource): Record<string, unknown> {
  // Patch só atualiza campos PRESENTES — não sobrescreve dado bom com null.
  const patch: Record<string, unknown> = {
    name: c.name,
    import_source: source,
    imported_at: new Date().toISOString(),
  }
  if (c.email) patch.email = c.email
  if (c.birthday) patch.birthday = c.birthday
  if (c.notes) patch.notes = c.notes
  if (c.externalId) patch.import_external_id = c.externalId
  return patch
}
