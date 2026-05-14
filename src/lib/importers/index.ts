/**
 * Registry de connectors + entrypoint da camada de import.
 *
 * Cada connector exposto aqui registra:
 *  - id (ImportSource)
 *  - label (UI)
 *  - parse(input) → CanonicalImport
 *  - hint (instrução pro user de como obter o arquivo no sistema fonte)
 */

import type { CanonicalImport, ImportSource } from './canonical'
import { parseSalao365, type Salao365ParseInput } from './salao365'

export type ConnectorDef = {
  id: ImportSource
  label: string
  hint: string
  /** Hint específico de UX — formatos aceitos, exemplo de fluxo. */
  inputFields: Array<{
    key: 'clientsCsv' | 'appointmentsCsv'
    label: string
    required: boolean
    accept: string
  }>
}

export const CONNECTORS: Record<ImportSource, ConnectorDef> = {
  salao365: {
    id: 'salao365',
    label: 'Salão 365',
    hint:
      'No Salão 365: Configurações → Exportar dados → baixar CSV de Clientes. Cole o arquivo aqui.',
    inputFields: [
      { key: 'clientsCsv', label: 'CSV de clientes', required: true, accept: '.csv,text/csv' },
      { key: 'appointmentsCsv', label: 'CSV de agendamentos (opcional)', required: false, accept: '.csv,text/csv' },
    ],
  },
  trinks: {
    id: 'trinks',
    label: 'Trinks',
    hint: 'Connector ainda não implementado — em planejamento.',
    inputFields: [],
  },
  booksy: {
    id: 'booksy',
    label: 'Booksy',
    hint: 'Connector ainda não implementado — em planejamento.',
    inputFields: [],
  },
  'csv-manual': {
    id: 'csv-manual',
    label: 'CSV genérico',
    hint:
      'Use se seu sistema não tem connector dedicado. Colunas mínimas: nome, telefone. Opcionais: email, aniversário (DD/MM/AAAA), observações.',
    inputFields: [
      { key: 'clientsCsv', label: 'CSV de clientes', required: true, accept: '.csv,text/csv' },
    ],
  },
}

/**
 * Dispatch — recebe source + arquivos brutos e devolve canonical.
 *
 * Throw se source não tem connector implementado.
 */
export function parseBySource(
  source: ImportSource,
  input: Salao365ParseInput,
): CanonicalImport {
  switch (source) {
    case 'salao365':
      return parseSalao365(input)
    case 'csv-manual':
      // CSV genérico usa o mesmo parser do Salão 365 (header detection
      // tolera variações). Diferença é só o hint na UI.
      return parseSalao365(input)
    case 'trinks':
    case 'booksy':
      throw new Error(`Connector "${source}" ainda não implementado.`)
    default: {
      const exhaustive: never = source
      throw new Error(`Source desconhecido: ${exhaustive}`)
    }
  }
}

export { runImport } from './run'
export type {
  CanonicalImport,
  CanonicalClient,
  CanonicalAppointment,
  DedupeStrategy,
  ImportReport,
  ImportSource,
  ImportWarning,
} from './canonical'
