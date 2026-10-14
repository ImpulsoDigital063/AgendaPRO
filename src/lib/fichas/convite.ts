import { createHash, randomBytes } from 'crypto'
import type { NicheFicha } from './types'

/**
 * LINK PRA CLIENTE PREENCHER A FICHA (v157, 14/10/2026).
 *
 * Pedido da Wanessa: a cliente agenda e já preenche a anamnese no celular,
 * antes de chegar. O link carrega um token aleatório de 32 bytes; o banco
 * guarda só o sha256 dele (ficha_convites.token_hash). Quem tem o banco não
 * tem o link — é o mesmo cuidado de senha.
 *
 * Só no servidor (usa `crypto` do Node).
 */

/** 7 dias: cobre "agendou pra semana que vem" sem deixar link de ficha de saúde vivo pra sempre. */
export const VALIDADE_DIAS = 7

export function gerarToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Formato do token que a rota pública aceita — barra lixo antes de ir ao banco. */
export function tokenValido(token: string): boolean {
  return /^[A-Za-z0-9_-]{40,60}$/.test(token)
}

/**
 * O que falta pra ficha poder ser ENVIADA pela cliente: aceites obrigatórios
 * e a assinatura. Mesma regra do "Assinar e fechar" do painel
 * (FichaDedicada.onAssinar) — aqui conferida no servidor, porque a página é
 * pública e o navegador não é confiável.
 */
export function faltaParaAssinar(ficha: NicheFicha, values: Record<string, unknown>): string[] {
  const falta: string[] = []
  for (const s of ficha.sections) {
    if (s.kind === 'term') for (const c of s.consents) if (c.required && values[c.name] !== true) falta.push(c.label)
    if (s.kind === 'signature') {
      const v = values[s.name]
      if (typeof v !== 'string' || !v.trim()) falta.push(s.label)
    }
  }
  return falta
}

/** Só campos que a ficha declara entram no banco — o resto do payload é descartado. */
export function soCamposDaFicha(ficha: NicheFicha, values: Record<string, unknown>): Record<string, unknown> {
  const nomes = new Set<string>()
  for (const s of ficha.sections) {
    if (s.kind === 'fields') s.fields.forEach((f) => { nomes.add(f.name) })
    if (s.kind === 'mapping') { nomes.add(s.drawName); s.params.forEach((f) => { nomes.add(f.name) }) }
    // FichaDedicada grava os marcados em values[title] e o detalhe em 'saude_detalhe'
    if (s.kind === 'health') { nomes.add(s.title); nomes.add('saude_detalhe') }
    if (s.kind === 'term') s.consents.forEach((c) => { nomes.add(c.name) })
    if (s.kind === 'signature') nomes.add(s.name)
  }
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(values)) {
    if (!nomes.has(k)) continue
    if (typeof v === 'string') out[k] = v.slice(0, v.startsWith('data:image') ? 2_000_000 : 5000)
    else if (typeof v === 'boolean') out[k] = v
    else if (Array.isArray(v)) out[k] = v.filter((x) => typeof x === 'string').map((x) => (x as string).slice(0, 300)).slice(0, 100)
  }
  return out
}
