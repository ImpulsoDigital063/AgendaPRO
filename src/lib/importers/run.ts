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
  ImportAcao,
  ImportConflito,
  ImportDecisao,
  ImportReport,
  ImportSource,
  ImportWarning,
} from './canonical'
import { telefoneCanonico } from '@/lib/phone-variants'

export type RunOptions = {
  supabase: SupabaseClient
  businessId: string
  source: ImportSource
  dedupe: DedupeStrategy
  /** Se true, NÃO grava — só calcula o ImportReport. */
  dryRun: boolean
  /** Decisão da dona por linha (idx), pros conflitos de telefone. */
  decisoes?: Record<number, ImportDecisao>
}

export async function runImport(
  canonical: CanonicalImport,
  opts: RunOptions,
): Promise<ImportReport> {
  const start = Date.now()
  const warnings: ImportWarning[] = [...canonical.warnings]

  const { report: clientReport, conflitos, pendentes } = await importClients(canonical.clients, opts, warnings)

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
    conflitos,
    pendentes,
    durationMs: Date.now() - start,
  }
}

async function importClients(
  clients: CanonicalClient[],
  opts: RunOptions,
  warnings: ImportWarning[],
): Promise<{ report: ImportReport['clients']; conflitos: ImportConflito[]; pendentes: number }> {
  const report = {
    parsed: clients.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    invalid: 0,
  }
  if (clients.length === 0) return { report, conflitos: [], pendentes: 0 }

  // Carrega existentes do business em UMA query — match em memória é mais
  // rápido que N queries individuais. Limite prático: ~50k clientes/business.
  const { data: existing, error: loadErr } = await opts.supabase
    .from('customers')
    .select('id, name, phone, import_source, import_external_id')
    .eq('business_id', opts.businessId)

  if (loadErr) {
    warnings.push({
      level: 'skip',
      message: `Falha ao carregar customers existentes: ${loadErr.message}`,
    })
    report.invalid = clients.length
    return { report, conflitos: [], pendentes: 0 }
  }

  // Chave do mapa é o telefone CANÔNICO, nunca a string gravada: o painel
  // grava "(91) 98338-0203" e o importador manda "+5591983380203". Comparando
  // texto puro nada casava, e o import criava cliente novo pra quem já existia
  // (17 duplicados na base da Wanessa, 08/09/2026). Ver src/lib/phone-variants.ts.
  type Existente = { id: string; name: string; phone: string }
  const byPhone = new Map<string, Existente>()
  const byExternal = new Map<string, { id: string }>()
  for (const c of existing ?? []) {
    const k = telefoneCanonico(c.phone ?? '')
    if (k) byPhone.set(k, { id: c.id, name: c.name ?? '', phone: c.phone ?? '' })
    if (c.import_source === opts.source && c.import_external_id) {
      byExternal.set(c.import_external_id, { id: c.id })
    }
  }
  const existentesPorTamanho = new Map<number, string[]>()
  for (const k of byPhone.keys()) {
    const l = existentesPorTamanho.get(k.length) ?? []
    l.push(k)
    existentesPorTamanho.set(k.length, l)
  }

  const decisoes = opts.decisoes ?? {}

  /* 1 · Telefone efetivo de cada linha: o da planilha ou o corrigido pela
     dona. Corrigido inválido não cai em silêncio — vira problema no conflito. */
  type Linha = { idx: number; c: CanonicalClient; tel: string; chave: string; problema?: string }
  const linhas: Linha[] = clients.map((c, idx) => {
    const corrigido = decisoes[idx]?.telefone?.trim()
    if (corrigido) {
      const k = telefoneCanonico(corrigido)
      if (k.length < 10 || k.length > 11) {
        const kOrig = telefoneCanonico(c.phone) || c.phone
        return { idx, c, tel: c.phone, chave: kOrig, problema: `Telefone corrigido "${corrigido}" não é válido (DDD + número).` }
      }
      return { idx, c: { ...c, phone: `+55${k}` }, tel: `+55${k}`, chave: k }
    }
    return { idx, c, tel: c.phone, chave: telefoneCanonico(c.phone) || c.phone }
  })

  const porChave = new Map<string, Linha[]>()
  for (const l of linhas) {
    const g = porChave.get(l.chave) ?? []
    g.push(l)
    porChave.set(l.chave, g)
  }

  const conflitos: ImportConflito[] = []
  const toInsert: Array<Record<string, unknown>> = []
  const toUpdate: Array<{ id: string; patch: Record<string, unknown> }> = []
  let pendentes = 0

  /* 2 · Classifica cada linha. external-id bate primeiro e não é conflito:
     é a mesma ficha do sistema de origem, reimportada. */
  const resolvidos = new Map<number, { acao: ImportAcao; existenteId?: string }>()
  for (const l of linhas) {
    const d = decisoes[l.idx]
    if (opts.dedupe === 'external-id-then-phone' && l.c.externalId) {
      const ext = byExternal.get(l.c.externalId)
      if (ext) {
        resolvidos.set(l.idx, { acao: 'atualizar', existenteId: ext.id })
        continue
      }
    }

    const existente = byPhone.get(l.chave)
    const grupo = porChave.get(l.chave) ?? [l]
    const base = {
      idx: l.idx,
      linha: { name: l.c.name, phone: l.tel },
      decisao: d,
      problema: l.problema,
    }

    if (grupo.length > 1) {
      // O mesmo telefone em várias linhas: no máximo UMA pode entrar.
      conflitos.push({
        ...base,
        tipo: 'repetida',
        existente: existente ?? undefined,
        outras: grupo.filter((o) => o.idx !== l.idx).map((o) => ({ idx: o.idx, name: o.c.name })),
        nomeParecido: existente ? nomeParecido(l.c.name, existente.name) : false,
        acoes: existente ? ['atualizar', 'pular'] : ['criar', 'pular'],
      })
      continue
    }

    if (existente) {
      conflitos.push({
        ...base,
        tipo: 'cadastrada',
        existente,
        nomeParecido: nomeParecido(l.c.name, existente.name),
        acoes: ['atualizar', 'pular'],
      })
      continue
    }

    const vizinho = (existentesPorTamanho.get(l.chave.length) ?? []).find((k) => difereUmDigito(k, l.chave))
    if (vizinho) {
      const ex = byPhone.get(vizinho)!
      conflitos.push({
        ...base,
        tipo: 'parecida',
        existente: ex,
        nomeParecido: nomeParecido(l.c.name, ex.name),
        acoes: ['criar', 'pular'],
      })
      continue
    }

    if (l.problema) {
      conflitos.push({ ...base, tipo: 'cadastrada', nomeParecido: false, acoes: ['criar', 'pular'] })
      continue
    }
    resolvidos.set(l.idx, { acao: 'criar' })
  }

  /* 3 · Valida as decisões. Grupo de repetidas: no máximo uma linha fora de
     "pular" — senão o banco recusaria (unique business_id + phone). */
  for (const cf of conflitos) {
    let ok = !cf.problema && !!cf.decisao && cf.acoes.includes(cf.decisao.acao)
    if (ok && cf.tipo === 'repetida' && cf.decisao!.acao !== 'pular') {
      const entram = [cf.idx, ...(cf.outras ?? []).map((o) => o.idx)].filter(
        (i) => decisoes[i] && decisoes[i].acao !== 'pular' && !decisoes[i].telefone,
      )
      if (entram.length > 1) {
        ok = false
        cf.problema = 'Só uma dessas linhas pode ficar com esse telefone. Escolha qual entra ou corrija o telefone das outras.'
      }
    }
    if (!ok) {
      pendentes++
      continue
    }
    const acao = cf.decisao!.acao
    resolvidos.set(cf.idx, { acao, existenteId: acao === 'atualizar' ? cf.existente?.id : undefined })
  }

  for (const l of linhas) {
    const r = resolvidos.get(l.idx)
    if (!r) continue
    if (r.acao === 'pular') {
      report.skipped++
    } else if (r.acao === 'atualizar' && r.existenteId) {
      toUpdate.push({ id: r.existenteId, patch: buildCustomerPatch(l.c, opts.source) })
      report.updated++
    } else if (r.acao === 'criar') {
      toInsert.push(buildCustomerInsert(l.c, opts.businessId, opts.source))
      report.inserted++
    }
  }

  // Commit com conflito sem decisão não grava NADA: meia importação confunde
  // mais do que nenhuma.
  if (opts.dryRun || pendentes > 0) return { report, conflitos, pendentes }

  // INSERT em batches de 500 — Supabase aceita até ~1000, deixar margem.
  // Se o lote falhar, NÃO descarta os 500: repete linha a linha pra que só a
  // linha problemática caia. Cliente prefere 499 importados a 0.
  for (let i = 0; i < toInsert.length; i += 500) {
    const batch = toInsert.slice(i, i + 500)
    const { error } = await opts.supabase.from('customers').insert(batch)
    if (!error) continue

    report.inserted -= batch.length
    for (const row of batch) {
      const { error: rowErr } = await opts.supabase.from('customers').insert(row)
      if (rowErr) {
        warnings.push({
          level: 'skip',
          message: `"${row.name}" não entrou: ${rowErr.message}`,
        })
        report.invalid++
      } else {
        report.inserted++
      }
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

  return { report, conflitos, pendentes }
}

function semAcento(n: string): string {
  return n
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .replace(/\b(da|de|do|das|dos|e)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Mesmo primeiro nome E (um só tem o primeiro nome, ou dividem outro nome).
 *  "Daiane Andrade" × "Daiane Joselle Silva Andrade" = parecido;
 *  "Gabriela Veras Moraes" × "Lucca Veras Martins" = diferente. */
export function nomeParecido(a: string, b: string): boolean {
  const ta = semAcento(a).split(' ').filter(Boolean)
  const tb = semAcento(b).split(' ').filter(Boolean)
  if (!ta.length || !tb.length || ta[0] !== tb[0]) return false
  if (ta.length === 1 || tb.length === 1) return true
  return ta.slice(1).some((t) => t.length > 1 && tb.slice(1).includes(t))
}

function difereUmDigito(a: string, b: string): boolean {
  if (a.length !== b.length || a === b) return false
  let d = 0
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && ++d > 1) return false
  return d === 1
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
