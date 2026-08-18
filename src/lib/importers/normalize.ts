/**
 * Helpers de normalização compartilhados entre connectors.
 *
 * Todos puros — testáveis sem mock.
 */

/**
 * Normaliza telefone brasileiro para E.164 (+55...).
 *
 * Entrada aceita:
 *   "(63) 99292-0080"
 *   "63 99292-0080"
 *   "63992920080"
 *   "+55 63 99292-0080"
 *   "5563992920080"
 *
 * Retorna null se não conseguir validar (sem DDD ou número curto demais).
 *
 * Regras BR:
 *  - Celular = 11 dígitos (DDD + 9 + 8 dígitos)
 *  - Fixo    = 10 dígitos (DDD + 8 dígitos)
 *  - DDD válido = 11 a 99 (rejeita 00-10 que não existem)
 */
export function normalizePhoneBR(raw: string | null | undefined): string | null {
  if (!raw) return null

  // Só dígitos
  let digits = raw.replace(/\D/g, '')
  if (!digits) return null

  // Tira prefixo 55 se já vier com país
  if (digits.length === 13 && digits.startsWith('55')) {
    digits = digits.slice(2)
  } else if (digits.length === 12 && digits.startsWith('55')) {
    digits = digits.slice(2)
  }

  // Aceita celular (11) ou fixo (10) — rejeita resto
  if (digits.length !== 11 && digits.length !== 10) return null

  const ddd = digits.slice(0, 2)
  if (parseInt(ddd, 10) < 11) return null

  return `+55${digits}`
}

/**
 * Normaliza email pra lowercase trim — null se vazio ou inválido.
 * Regex simples: presença de @ e pelo menos 1 ponto após.
 */
export function normalizeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null
  const v = raw.trim().toLowerCase()
  if (!v) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return null
  return v
}

/**
 * Parse de data flexível. Aceita:
 *   "2024-05-13"
 *   "13/05/2024"
 *   "13-05-2024"
 *   "05/13/2024" (assumido US só quando o 2º número não pode ser mês)
 *
 * Retorna ISO 8601 (YYYY-MM-DD) ou null.
 *
 * Default BR (DD/MM/YYYY) — sistemas brasileiros priorizam esse formato.
 * Bug corrigido em 18/08/2026: a heurística invertia BR e derrubava TODA data
 * com dia > 12 ("20/05/1994" virava mês 20 → null). 73 dos 127 aniversários
 * do arquivo real da Wanessa caíam nisso.
 *
 * Ano fora de 1900–2100 = null (typo de digitação, ex "18/03/0984") — melhor
 * avisar do que gravar data absurda no cadastro.
 */
export function parseDateFlexible(raw: string | null | undefined): string | null {
  if (!raw) return null
  const v = raw.trim()
  if (!v) return null

  // ISO já
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
    return v.slice(0, 10)
  }

  // DD/MM/YYYY ou DD-MM-YYYY
  const m = v.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/)
  if (m) {
    let [, p1, p2, p3] = m
    let day = parseInt(p1, 10)
    let month = parseInt(p2, 10)
    let year = parseInt(p3, 10)

    // BR (DD/MM) é o default. Só troca quando o 2º número NÃO pode ser mês —
    // aí o arquivo só pode estar em MM/DD (ex "05/13/2024").
    if (month > 12 && day <= 12) {
      ;[day, month] = [month, day]
    }
    if (year < 100) year += year < 50 ? 2000 : 1900

    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    if (year < 1900 || year > 2100) return null

    return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
  }

  return null
}

/**
 * Parse de valor monetário BR.
 *
 * Aceita: "R$ 80,00", "80,00", "80.00", "80", "1.234,56"
 * Retorna number em reais (com decimais) ou null.
 */
export function parseMoneyBR(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null
  const v = String(raw).trim().replace(/^R\$\s*/i, '')
  if (!v) return null

  let cleaned = v
  // Formato BR: 1.234,56 → 1234.56
  if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  }
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

/**
 * Linha tabular já parseada (de CSV ou XLSX). Connectors recebem isso —
 * não precisam saber de qual formato veio.
 */
export type SheetRow = Record<string, string>

/**
 * Parse CSV simples — suporta:
 *  - Separador , ou ; (auto-detect pela primeira linha)
 *  - Quoting com aspas duplas (escape de aspas via "")
 *  - CRLF e LF
 *  - Header obrigatório (primeira linha)
 *
 * NÃO suporta: linhas multi-line dentro de quoting (raro em export de
 * sistemas SaaS de salão — se aparecer, parser pula a linha e gera warning
 * na camada do connector).
 *
 * Retorna array de objetos { [header]: cellValue }.
 */
export function parseCsv(text: string): SheetRow[] {
  if (!text) return []

  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.length > 0)
  if (lines.length === 0) return []

  const sep = detectSeparator(lines[0])
  const headers = splitCsvLine(lines[0], sep).map((h) => h.trim())

  const rows: SheetRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i], sep)
    const row: SheetRow = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (cells[j] ?? '').trim()
    }
    rows.push(row)
  }
  return rows
}

/**
 * Parse de planilha XLSX (Excel · Google Sheets exportado · LibreOffice).
 *
 * Estratégia: lê a primeira aba via SheetJS (xlsx). Converte tudo pra
 * string — o connector já trata vazio/inválido depois (mesmo caminho do
 * parseCsv).
 *
 * Datas em Excel são serial numbers (45000.5). Não converte aqui — deixa
 * pro parseDateFlexible no connector lidar com o formato visível (a opção
 * `raw: false` do sheet_to_json devolve a string formatada como o user vê).
 */
export async function parseXlsxBuffer(buffer: ArrayBuffer): Promise<SheetRow[]> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(buffer, { type: 'array' })
  const firstSheetName = wb.SheetNames[0]
  if (!firstSheetName) return []
  const sheet = wb.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  })
  return rows.map((r) => {
    const out: SheetRow = {}
    for (const k of Object.keys(r)) {
      out[k.trim()] = String(r[k] ?? '').trim()
    }
    return out
  })
}

function detectSeparator(headerLine: string): ',' | ';' {
  const commas = (headerLine.match(/,/g) ?? []).length
  const semis = (headerLine.match(/;/g) ?? []).length
  return semis > commas ? ';' : ','
}

function splitCsvLine(line: string, sep: ',' | ';'): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (c === '"') {
        inQuotes = false
      } else {
        cur += c
      }
    } else {
      if (c === '"') {
        inQuotes = true
      } else if (c === sep) {
        out.push(cur)
        cur = ''
      } else {
        cur += c
      }
    }
  }
  out.push(cur)
  return out
}

/**
 * Match flexível de header de CSV — encontra qual coluna do CSV
 * corresponde a um conceito canônico (ex: "name" → "Nome", "Nome Completo",
 * "Cliente").
 *
 * Compara em lowercase, sem acento, ignorando espaços/pontuação.
 */
export function findHeader(
  headers: string[],
  candidates: string[],
): string | null {
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')

  const normalizedHeaders = headers.map((h) => ({ original: h, norm: norm(h) }))
  for (const cand of candidates) {
    const target = norm(cand)
    const hit = normalizedHeaders.find((h) => h.norm === target)
    if (hit) return hit.original
  }
  // Fallback: prefix match (header começa com candidato)
  for (const cand of candidates) {
    const target = norm(cand)
    const hit = normalizedHeaders.find((h) => h.norm.startsWith(target))
    if (hit) return hit.original
  }
  return null
}
