/**
 * Connector Salão 365.
 *
 * STATUS (14/05/2026): STUB calibrado por dedução. O CSV real do export
 * ainda não chegou — a Leticia (Viva Cacheada) vai mandar. Quando chegar,
 * ajustar os candidatos de header em CLIENT_HEADER_MAP / APPT_HEADER_MAP.
 *
 * Estratégia:
 *  - Detecção por header (com normalização sem acento) — robusto a variações
 *    de capitalização e acentuação do export brasileiro.
 *  - Sem campo encontrado = warning, mas não derruba o import.
 *  - Telefone obrigatório (sem ele não há dedupe possível).
 *  - Linha sem nome OU sem telefone = skip + warning.
 *
 * O export do Salão 365 (segundo info pública da plataforma) gera CSV com
 * campos típicos: Nome, Telefone, Email, Aniversário, Observações. Esse
 * connector cobre esse caso e tolera variações.
 */

import type { CanonicalClient, CanonicalImport, ImportWarning } from './canonical'
import { findHeader, normalizeEmail, normalizePhoneBR, parseDateFlexible, type SheetRow } from './normalize'

const CLIENT_HEADER_MAP = {
  // Candidatos em ordem de prioridade. Primeiro match vence.
  name: ['nome', 'nome completo', 'cliente', 'nomeCliente'],
  phone: ['telefone', 'celular', 'whatsapp', 'fone', 'telefoneCelular'],
  email: ['email', 'e-mail', 'emailCliente'],
  birthday: ['aniversario', 'aniversário', 'data de nascimento', 'dataNascimento', 'nascimento'],
  notes: ['observacoes', 'observações', 'observacao', 'notas', 'anotacoes', 'ficha', 'anamnese'],
  externalId: ['id', 'idCliente', 'codigo', 'código'],
  lastVisitAt: ['ultimaVisita', 'última visita', 'ultimoAtendimento', 'último atendimento'],
} as const

export type ConnectorInput = {
  /** Linhas já parseadas (CSV ou XLSX detectado e convertido na API route). */
  clientsRows?: SheetRow[]
  appointmentsRows?: SheetRow[]
}

export function parseSalao365(input: ConnectorInput): CanonicalImport {
  const warnings: ImportWarning[] = []
  const clients: CanonicalClient[] = []

  if (input.clientsRows) {
    const rows = input.clientsRows
    if (rows.length === 0) {
      warnings.push({ level: 'info', message: 'Arquivo de clientes vazio ou sem linhas válidas.' })
    } else {
      const headers = Object.keys(rows[0])
      const nameCol = findHeader(headers, [...CLIENT_HEADER_MAP.name])
      const phoneCol = findHeader(headers, [...CLIENT_HEADER_MAP.phone])
      const emailCol = findHeader(headers, [...CLIENT_HEADER_MAP.email])
      const bdayCol = findHeader(headers, [...CLIENT_HEADER_MAP.birthday])
      const notesCol = findHeader(headers, [...CLIENT_HEADER_MAP.notes])
      const idCol = findHeader(headers, [...CLIENT_HEADER_MAP.externalId])
      const lastVisitCol = findHeader(headers, [...CLIENT_HEADER_MAP.lastVisitAt])

      if (!nameCol) {
        warnings.push({
          level: 'skip',
          message: 'Coluna de nome não encontrada no CSV. Headers detectados: ' + headers.join(', '),
        })
      }
      if (!phoneCol) {
        warnings.push({
          level: 'skip',
          message: 'Coluna de telefone não encontrada no CSV. Headers detectados: ' + headers.join(', '),
        })
      }

      if (nameCol && phoneCol) {
        rows.forEach((row, idx) => {
          const rowNum = idx + 2 // +1 pra header, +1 pra 1-indexed
          const rawName = row[nameCol]
          const rawPhone = row[phoneCol]

          if (!rawName?.trim()) {
            warnings.push({ row: rowNum, field: 'name', level: 'skip', message: 'Nome vazio.' })
            return
          }
          const phone = normalizePhoneBR(rawPhone)
          if (!phone) {
            warnings.push({
              row: rowNum,
              field: 'phone',
              level: 'skip',
              message: `Telefone inválido: "${rawPhone}"`,
            })
            return
          }

          const client: CanonicalClient = {
            name: rawName.trim(),
            phone,
          }
          if (idCol && row[idCol]?.trim()) client.externalId = row[idCol].trim()
          if (emailCol) {
            const email = normalizeEmail(row[emailCol])
            if (email) client.email = email
          }
          if (bdayCol) {
            const bday = parseDateFlexible(row[bdayCol])
            if (bday) client.birthday = bday
            else if (row[bdayCol]?.trim()) {
              warnings.push({
                row: rowNum,
                field: 'birthday',
                level: 'fix',
                message: `Aniversário ilegível ignorado: "${row[bdayCol]}"`,
              })
            }
          }
          if (notesCol && row[notesCol]?.trim()) client.notes = row[notesCol].trim()
          if (lastVisitCol) {
            const lv = parseDateFlexible(row[lastVisitCol])
            if (lv) client.lastVisitAt = lv
          }

          clients.push(client)
        })
      }
    }
  }

  // Agendamentos: implementação pendente até arquivo real chegar — o formato
  // do export de agendamentos do Salão 365 não é público e varia por plano.
  if (input.appointmentsRows && input.appointmentsRows.length > 0) {
    warnings.push({
      level: 'info',
      message:
        'Connector de agendamentos do Salão 365 ainda não calibrado (aguardando arquivo real). Importando apenas clientes nesta versão.',
    })
  }

  return {
    clients,
    appointments: [],
    warnings,
  }
}
