import { PERGUNTAS, PERGUNTA_POR_ID, type Pergunta, type PeriodoId } from './catalogo'
import { ATALHOS, VERBO_DE_ACAO, type Atalho } from './atalhos'

/* Entende a pergunta digitada SEM IA (21/10/2026): palavras-chave do
   catálogo + período, profissional e dias reconhecidos no texto.
   Não achou nada? Devolve as 3 mais parecidas pra pessoa tocar. */

export const normalizar = (s: string) =>
  ' ' + s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' '

const MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** Período citado no texto, ou null. `hoje` = AAAA-MM-DD (dia BR). */
export function periodoDoTexto(t: string, hoje: string): PeriodoId | null {
  if (/ mes passado | ultimo mes | mes anterior /.test(t)) return 'mes_passado'
  if (/ ontem /.test(t)) return 'ontem'
  if (/ hoje /.test(t)) return 'hoje'
  if (/ (30|trinta) dias /.test(t)) return '30dias'
  if (/ (7|sete) dias | semana /.test(t)) return 'semana'
  if (/ (esse|este|nesse|neste) ano | no ano | do ano /.test(t)) return 'ano'
  for (let i = 0; i < 12; i++) {
    if (t.includes(` ${MESES[i]} `)) {
      // O mês citado mais recente que não está no futuro.
      const ano = Number(hoje.slice(0, 4))
      const mesHoje = Number(hoje.slice(5, 7))
      const a = i + 1 > mesHoje ? ano - 1 : ano
      return `m:${a}-${String(i + 1).padStart(2, '0')}`
    }
  }
  if (/ (esse|este|nesse|neste|no|do) mes | mes /.test(t)) return 'mes'
  return null
}

export function diasDoTexto(t: string): number | null {
  const m = t.match(/ (\d{1,3}) dias /)
  if (m) return Number(m[1])
  if (/ (tres|3) meses /.test(t)) return 90
  if (/ (dois|2) meses /.test(t)) return 60
  if (/ (um|1) mes /.test(t)) return 30
  return null
}

export type Profissional = { id: string; name: string }

export function profissionalDoTexto(t: string, profs: Profissional[]): Profissional | null {
  for (const p of profs) {
    const nome = normalizar(p.name)
    const primeiro = nome.trim().split(' ')[0]
    if (t.includes(nome) || (primeiro.length >= 3 && t.includes(` ${primeiro} `))) return p
  }
  return null
}

export type Entendimento = {
  pergunta: Pergunta | null
  /** Pedido de ação ("como faço", "quero mudar"): leva pra tela certa. */
  atalho: Atalho | null
  periodo: PeriodoId | null
  profissional: Profissional | null
  dias: number | null
  /** Quando não entendeu: as mais parecidas. */
  sugestoes: Pergunta[]
}

export function entender(texto: string, profs: Profissional[], hoje: string): Entendimento {
  const t = normalizar(texto)
  const periodo = periodoDoTexto(t, hoje)
  const profissional = profissionalDoTexto(t, profs)
  const dias = diasDoTexto(t)

  // Pontua cada pergunta: trecho achado vale pelo tamanho (trecho longo e
  // específico ganha de palavra solta).
  const pontuar = (palavras: string[]) => {
    let s = 0
    for (const w of palavras) {
      const k = normalizar(w)
      if (t.includes(k)) s += k.trim().split(' ').length * 2 + k.length / 20
    }
    return s
  }
  const pontos = PERGUNTAS.map((p) => ({ p, s: pontuar(p.palavras) })).sort((a, b) => b.s - a.s)

  // Atalho só ganha da pergunta com verbo de ação ("quero mudar", "como
  // faço") ou quando nenhuma pergunta casou. "Comissão da colaboradora"
  // continua sendo pergunta de número. Sem verbo, só trecho de 2+ palavras
  // ("meu link" sim, "serviço" solto não).
  const melhorAtalho = ATALHOS.map((a) => ({ a, s: pontuar(a.palavras) })).sort((x, y) => y.s - x.s)[0]
  if (melhorAtalho.s > 0 && (VERBO_DE_ACAO.test(t) || (pontos[0].s === 0 && !profissional && melhorAtalho.s >= 4))) {
    return { pergunta: null, atalho: melhorAtalho.a, periodo, profissional, dias, sugestoes: [] }
  }

  let pergunta = pontos[0].s > 0 ? pontos[0].p : null
  // Nome de profissional sem outra pista = quanto ela faturou.
  if (!pergunta && profissional) pergunta = PERGUNTA_POR_ID.faturei
  // "comissão" com nome continua sendo comissão (já pontua); "quem sumiu há
  // 90 dias" pega os dias acima.

  const sugestoes = pergunta ? [] : sugerir(t)
  return { pergunta, atalho: null, periodo, profissional, dias, sugestoes }
}

/** As 3 perguntas com mais palavras em comum com o texto. */
function sugerir(t: string): Pergunta[] {
  const palavras = new Set(t.trim().split(' ').filter((w) => w.length >= 4))
  const pontos = PERGUNTAS.map((p) => {
    const alvo = normalizar(p.texto + ' ' + p.palavras.join(' ')).trim().split(' ')
    let s = 0
    for (const w of palavras) if (alvo.some((a) => a.startsWith(w.slice(0, 5)))) s++
    return { p, s }
  }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s)
  const lista = pontos.slice(0, 3).map((x) => x.p)
  // Sem nada em comum: as três mais usadas por dono.
  return lista.length > 0 ? lista : ['faturei', 'sumidas', 'prof_top'].map((id) => PERGUNTA_POR_ID[id])
}
