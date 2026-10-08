/**
 * Tipos canônicos da camada de importação.
 *
 * Cada connector (salao365, trinks, booksy, csv genérico) parse o arquivo
 * de origem e devolve estes tipos. O importer central (run.ts) só conhece
 * o formato canônico — independente do sistema fonte.
 *
 * Decisão de design: connectors NÃO falam com Supabase. São funções puras
 * (arquivo → canonical). Isso permite preview sem gravar nada.
 */

export type CanonicalClient = {
  /** ID original do sistema fonte. Usado pra reimport idempotente. */
  externalId?: string
  name: string
  /** Telefone normalizado pra E.164 BR (ex: +5563999999999). null se inválido. */
  phone: string
  email?: string
  /** ISO 8601 (YYYY-MM-DD). */
  birthday?: string
  notes?: string
  /** Data da última visita registrada no sistema fonte (ISO 8601). */
  lastVisitAt?: string
}

export type CanonicalAppointment = {
  externalId?: string
  /** externalId do cliente — para linkar após criar/encontrar customer. */
  customerExternalId?: string
  /** Nome do profissional no sistema fonte — matched por similaridade no destino. */
  professionalName?: string
  /** Nome do serviço (texto livre — sistema destino tenta achar match em services). */
  serviceName?: string
  /** Data do agendamento (ISO 8601 YYYY-MM-DD). */
  date: string
  /** Hora de início (HH:MM). */
  startTime: string
  endTime?: string
  totalPrice?: number
  /** completed | cancelled | no_show. Default: completed (histórico). */
  status?: 'completed' | 'cancelled' | 'no_show' | 'pending' | 'confirmed'
  paid?: boolean
  paymentMethod?: 'pix' | 'cash' | 'card' | 'courtesy'
  /** Quando o pagamento entrou. */
  paidAt?: string
}

export type CanonicalImport = {
  clients: CanonicalClient[]
  appointments: CanonicalAppointment[]
  /** Avisos de parse (linhas ignoradas, formatos suspeitos, etc). */
  warnings: ImportWarning[]
}

export type ImportWarning = {
  /** Linha do arquivo (1-indexed, considerando header). */
  row?: number
  field?: string
  message: string
  /** Severidade: skip = linha ignorada · fix = corrigido automaticamente · info = só aviso. */
  level: 'skip' | 'fix' | 'info'
}

export type ImportSource = 'salao365' | 'trinks' | 'booksy' | 'csv-manual'

export type DedupeStrategy =
  /** Se telefone bate, atualiza nome/email/birthday/notes do existente. */
  | 'update'
  /** Se telefone bate, pula. */
  | 'skip'
  /** Bate por external_id quando presente, fallback pra telefone. */
  | 'external-id-then-phone'

/* ── CONFLITOS DE TELEFONE (08/10/2026) ──────────────────────────────
   O telefone é o que identifica a cliente no sistema todo (link público,
   pontos, sinal, mensagens), então nunca existem duas no mesmo número. Antes
   a importação decidia sozinha: mesmo telefone = atualizava o cadastro
   existente com o nome da planilha. Na Wanessa isso transformou a "Gabriela
   Veras Moraes" em "Lucca Veras Martins" (mãe e filho no mesmo número) sem
   ninguém ver. Agora cada conflito volta pra tela e a dona decide. */

/** cadastrada = telefone já existe no sistema · repetida = o mesmo telefone
 *  em mais de uma linha da planilha · parecida = telefone com 1 dígito de
 *  diferença de uma cliente existente (provável erro de digitação). */
export type ConflitoTipo = 'cadastrada' | 'repetida' | 'parecida'

/** atualizar = é a mesma pessoa, grava os dados da planilha no cadastro
 *  existente · criar = cadastra como nova · pular = não importa a linha. */
export type ImportAcao = 'atualizar' | 'criar' | 'pular'

export type ImportDecisao = {
  acao: ImportAcao
  /** Telefone corrigido pela dona. Quando vem, a linha é reavaliada com ele. */
  telefone?: string
}

export type ImportConflito = {
  /** Posição da linha entre as clientes lidas (estável: o arquivo é relido igual no commit). */
  idx: number
  tipo: ConflitoTipo
  linha: { name: string; phone: string }
  existente?: { id: string; name: string; phone: string }
  /** repetida: as outras linhas com o mesmo telefone. */
  outras?: { idx: number; name: string }[]
  /** Nome da planilha parecido com o do cadastro (mesmo primeiro nome e algo em comum). */
  nomeParecido: boolean
  /** Ações que valem pra esse conflito. */
  acoes: ImportAcao[]
  /** Decisão recebida, se já tem. */
  decisao?: ImportDecisao
  /** Motivo de a decisão recebida não valer (ex.: telefone corrigido inválido). */
  problema?: string
}

export type ImportReport = {
  source: ImportSource
  /** Cliente: o que aconteceu na importação. */
  clients: {
    parsed: number
    inserted: number
    updated: number
    skipped: number
    invalid: number
  }
  appointments: {
    parsed: number
    inserted: number
    skipped: number
    invalid: number
  }
  warnings: ImportWarning[]
  /** Conflitos de telefone (preview e commit). */
  conflitos?: ImportConflito[]
  /** Quantos conflitos ainda sem decisão válida. > 0 no commit = nada foi gravado. */
  pendentes?: number
  /** Tempo total em ms. */
  durationMs: number
}
