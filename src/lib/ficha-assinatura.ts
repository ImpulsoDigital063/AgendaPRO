/* ═══════════════════════════════════════════════════════════════
   PROVA DE INTEGRIDADE DA FICHA ASSINADA

   Assinatura eletrônica sem certificado ICP-Brasil VALE entre as partes
   (MP 2.200-2/2001, art. 10 §2º; Lei 14.063/2020). O que decide numa
   discussão não é a validade — é conseguir provar DUAS coisas:

     · quem assinou   → nome, CPF, IP, dispositivo, data e hora do servidor
     · que nada mudou → impressão digital (SHA-256) do conteúdo no ato

   O hash é o que responde "como o senhor prova que não foi alterado
   depois?". Ele é calculado sobre o conteúdo em forma canônica (chaves em
   ordem), então recalcular hoje e comparar com o gravado prova que o
   documento é o mesmo — ou denuncia que não é.

   A trava contra alteração vive no BANCO (gatilho da v120), não aqui:
   regra que mora só na rota some no dia em que alguém escreve por outro
   caminho. Aqui fica só o cálculo.
   ═══════════════════════════════════════════════════════════════ */

import { createHash } from 'crypto'

/* O instante entra no hash SEMPRE no mesmo formato.
   Descoberto no teste de 08/08: gravamos "2026-08-08T20:15:33.123Z" e o
   Postgres devolve "2026-08-08T20:15:33.123+00:00". Mesma data, texto
   diferente, hash diferente - e TODA ficha legitima passava a ser acusada
   de adulterada. Alarme que dispara sempre e pior que alarme nenhum:
   ninguem confia nele quando importa. */
function instante(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toISOString()
}

/** Ordena chaves recursivamente: JSON.stringify sem isso muda o hash à toa. */
function canonico(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonico)
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    return Object.keys(o).sort().reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = canonico(o[k])
      return acc
    }, {})
  }
  return v
}

export type CarimboAssinatura = {
  assinado_em: string
  assinatura_hash: string
  assinatura_ip: string | null
  assinatura_dispositivo: string | null
  assinante_nome: string | null
  assinante_cpf: string | null
}

/**
 * Monta o carimbo do ato. O hash cobre conteúdo + quem + quando: trocar
 * qualquer um dos três quebra a conferência.
 */
export function carimbar(params: {
  conteudo: Record<string, unknown>
  businessId: string
  customerId: string
  assinanteNome?: string | null
  assinanteCpf?: string | null
  ip?: string | null
  dispositivo?: string | null
}): CarimboAssinatura {
  const agora = new Date().toISOString()
  const cpf = (params.assinanteCpf ?? '').replace(/\D/g, '') || null

  const base = JSON.stringify({
    conteudo: canonico(params.conteudo),
    negocio: params.businessId,
    paciente: params.customerId,
    assinante: params.assinanteNome ?? null,
    cpf,
    em: instante(agora),
  })

  return {
    assinado_em: agora,
    assinatura_hash: createHash('sha256').update(base).digest('hex'),
    assinatura_ip: params.ip ?? null,
    assinatura_dispositivo: (params.dispositivo ?? '').slice(0, 300) || null,
    assinante_nome: params.assinanteNome ?? null,
    assinante_cpf: cpf,
  }
}

/** Confere se a ficha guardada bate com o hash gravado no ato. */
export function conferir(linha: {
  data: Record<string, unknown>
  business_id: string
  customer_id: string
  assinado_em: string | null
  assinatura_hash: string | null
  assinante_nome: string | null
  assinante_cpf: string | null
}): { integra: boolean; motivo?: string } {
  if (!linha.assinado_em || !linha.assinatura_hash) {
    return { integra: false, motivo: 'nao_assinada' }
  }
  const base = JSON.stringify({
    conteudo: canonico(linha.data),
    negocio: linha.business_id,
    paciente: linha.customer_id,
    assinante: linha.assinante_nome ?? null,
    cpf: linha.assinante_cpf ?? null,
    em: instante(linha.assinado_em),
  })
  const recalculado = createHash('sha256').update(base).digest('hex')
  return recalculado === linha.assinatura_hash
    ? { integra: true }
    : { integra: false, motivo: 'hash_divergente' }
}

/**
 * Como o hash aparece pra gente ler — no rodapé do PDF e na tela.
 * 64 caracteres não se confere a olho; os 16 primeiros bastam pra bater
 * documento impresso contra registro, e o completo fica no PDF.
 */
export function hashCurto(hash: string): string {
  return hash.slice(0, 16).replace(/(.{4})/g, '$1 ').trim().toUpperCase()
}

/** Campos onde o CPF do paciente costuma estar nas fichas. */
export function acharCpf(conteudo: Record<string, unknown>): string | null {
  for (const [k, v] of Object.entries(conteudo)) {
    if (!/cpf/i.test(k) || typeof v !== 'string') continue
    const d = v.replace(/\D/g, '')
    if (d.length === 11) return d
  }
  return null
}

/** Idem pro nome de quem assinou. */
export function acharNome(conteudo: Record<string, unknown>): string | null {
  const chaves = ['assinatura_nome', 'nome_paciente', 'paciente', 'nome_completo', 'nome']
  for (const c of chaves) {
    const v = conteudo[c]
    if (typeof v === 'string' && v.trim().length > 2) return v.trim().slice(0, 120)
  }
  return null
}
