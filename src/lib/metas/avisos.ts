/* ═══════════════════════════════════════════════════════════════
   AVISOS DA ABA METAS · QUAL PUSH CABE HOJE (Eduardo aprovou 05/11/2026)

   No máximo 1 aviso de Metas por negócio por dia. Prioridade:
     bateu > fechamento > quase > reta > ritmo > sem_meta > semana

     bateu      · faturado ≥ meta (1x por mês, metas_mes.bateu_avisado_em;
                  meta redefinida zera e pode avisar de novo)
     fechamento · dia 1: "Outubro fechou em R$ X (92% da meta)" → definir
     quase      · 90% ≤ faturado < 100%: "Faltam só R$ 380… ~2 atendimentos"
     reta       · faltam ≤ 3 dias de trabalho e não bateu
     ritmo      · dia 15, faturado abaixo do proporcional aos dias de trabalho
                  já passados: ritmo por dia + a ação de hoje da tela
     sem_meta   · dia 3, negócio ativo sem meta no mês → definir
     semana     · segunda: "Semana passada: R$ X · faltam R$ Z"

   "1x por mês" (fechamento, quase, reta, ritmo, sem_meta) = já tem linha no
   metas_avisos_log com dia dentro do mês corrente (v187).

   Função pura com fontes preguiçosas: o cron só calcula agenda, mês anterior,
   semana e ação de hoje quando a regra precisa. Mesma régua da tela:
   faturado = faturadoDoMesSemCache (competência, igual Hub), ticket =
   metas_mes.ticket_medio, por dia = porDia, ação = escolherAcao.
   ═══════════════════════════════════════════════════════════════ */

import { addDaysBR, monthBoundsBR } from '@/lib/date-br'
import { brl, nomeMes, porDia } from '@/lib/metas/calculo'
import { atendimentosPara } from '@/lib/metas/traducao'
import type { AcaoDeHoje } from '@/lib/metas/acao'

export const PRIORIDADE = ['bateu', 'fechamento', 'quase', 'reta', 'ritmo', 'sem_meta', 'semana'] as const
export type TipoAviso = (typeof PRIORIDADE)[number]

export type Aviso = { tipo: TipoAviso; titulo: string; corpo: string; url: string }

/** Dias de trabalho do mês, com a mesma queda da tela: sem horário
 *  cadastrado (ou sem dia aberto restante) conta dias corridos. */
export type DiasDoMes = { restantes: number; passados: number; total: number }

export function diasDoMes(hoje: string, agenda: { diasAbertos: string[]; diasAbertosMes: number }): DiasDoMes {
  const { end } = monthBoundsBR(hoje.slice(0, 7))
  const diasNoMes = Number(end.slice(8, 10))
  const dia = Number(hoje.slice(8, 10))
  const corridosRestantes = diasNoMes - dia + 1
  if (agenda.diasAbertosMes > 0) {
    return {
      restantes: agenda.diasAbertos.length || corridosRestantes,
      passados: agenda.diasAbertosMes - agenda.diasAbertos.length,
      total: agenda.diasAbertosMes,
    }
  }
  return { restantes: corridosRestantes, passados: dia - 1, total: diasNoMes }
}

export type FontesAviso = {
  /** AAAA-MM-DD em Brasília */
  hoje: string
  /** diario = manhã (todas as regras) · bateu = 21h (só "bateu") */
  modo: 'diario' | 'bateu'
  /** meta do mês corrente (null = sem meta) */
  meta: { valor: number; ticket: number | null; bateuAvisado: boolean } | null
  /** tipos já enviados neste mês (log v187) */
  jaNoMes: ReadonlySet<TipoAviso>
  faturado: () => Promise<number>
  dias: () => Promise<DiasDoMes>
  /** meta e faturado do mês anterior (null = não tinha meta) */
  mesAnterior: () => Promise<{ valor: number; faturado: number } | null>
  /** recebido nos 7 dias antes de hoje (régua do Hub) */
  semana: () => Promise<number>
  /** a ação de hoje que a tela mostra (null = não deu pra calcular) */
  acao: () => Promise<AcaoDeHoje | null>
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const dias = (n: number) => `${n} ${n === 1 ? 'dia' : 'dias'}`

/** Frase da ação de hoje pro aviso de ritmo (sempre uma saída, nunca bronca). */
export function fraseDaAcao(a: AcaoDeHoje | null): string {
  if (!a) return ''
  if (a.tipo === 'horarios-livres') return ` Dá pra começar hoje: ${a.titulo}.`
  if (a.tipo === 'sumidos') return ` Dá pra começar hoje: ${a.titulo}, ${a.detalhe}.`
  if (a.tipo === 'nenhuma' && a.titulo === 'Agenda cheia') return ' Sua agenda está cheia: siga assim.'
  return ''
}

export async function decidirAviso(f: FontesAviso): Promise<Aviso | null> {
  const ym = f.hoje.slice(0, 7)
  const mes = nomeMes(ym)
  const dia = Number(f.hoje.slice(8, 10))
  const definir = `/admin/metas/definir?mes=${ym}`

  let fat: number | undefined
  const faturado = async () => (fat ??= await f.faturado())
  let dd: DiasDoMes | undefined
  const diasMes = async () => (dd ??= await f.dias())

  // 1. bateu
  if (f.meta && !f.meta.bateuAvisado && (await faturado()) >= f.meta.valor) {
    return { tipo: 'bateu', titulo: 'Bateu a meta!', corpo: `${cap(mes)}: ${brl(await faturado())} de ${brl(f.meta.valor)}`, url: '/admin/metas' }
  }
  if (f.modo === 'bateu') return null

  // 2. fechamento (dia 1)
  if (dia === 1 && !f.jaNoMes.has('fechamento')) {
    const ant = await f.mesAnterior()
    if (ant) {
      const mesAnt = cap(nomeMes(addDaysBR(f.hoje, -1).slice(0, 7)))
      const pct = Math.floor((ant.faturado / ant.valor) * 100)
      const fim = f.meta ? ` Meta de ${mes}: ${brl(f.meta.valor)}.` : ` Qual a meta de ${mes}?`
      return {
        tipo: 'fechamento',
        titulo: `${mesAnt} fechou`,
        corpo: `${mesAnt} fechou em ${brl(ant.faturado)} (${pct}% da meta).${ant.faturado >= ant.valor ? ' Meta batida!' : ''}${fim}`,
        url: f.meta ? '/admin/metas' : definir,
      }
    }
  }

  if (f.meta) {
    const meta = f.meta.valor
    const v = await faturado()
    const faltam = meta - v
    if (faltam > 0) {
      // 3. quase lá
      if (v >= meta * 0.9 && !f.jaNoMes.has('quase')) {
        const n = atendimentosPara(faltam, f.meta.ticket)
        const atend = n ? ` ~${n} ${n === 1 ? 'atendimento resolve' : 'atendimentos resolvem'}.` : ''
        return { tipo: 'quase', titulo: 'Quase lá!', corpo: `Faltam só ${brl(faltam)} pra bater a meta de ${mes}.${atend}`, url: '/admin/metas' }
      }
      // 4. reta final
      if (!f.jaNoMes.has('reta')) {
        const d = await diasMes()
        if (d.restantes >= 1 && d.restantes <= 3) {
          return {
            tipo: 'reta',
            titulo: `Reta final de ${mes}`,
            corpo: d.restantes === 1
              ? `Faltam ${brl(faltam)} e hoje é o último dia de trabalho de ${mes}.`
              : `Faltam ${brl(faltam)} em ${dias(d.restantes)}, dá ${brl(porDia(faltam, d.restantes))} por dia.`,
            url: '/admin/metas',
          }
        }
      }
      // 5. ritmo (dia 15)
      if (dia === 15 && !f.jaNoMes.has('ritmo')) {
        const d = await diasMes()
        const esperado = d.total > 0 ? (meta * d.passados) / d.total : 0
        if (v < esperado) {
          return {
            tipo: 'ritmo',
            titulo: `Meta de ${mes}: metade do mês`,
            corpo: `Pra chegar nos ${brl(meta)}, o ritmo agora é ${brl(porDia(faltam, d.restantes))} por dia.${fraseDaAcao(await f.acao())}`,
            url: '/admin/metas',
          }
        }
      }
    }
  } else if (dia === 3 && !f.jaNoMes.has('sem_meta')) {
    // 6. sem meta
    return { tipo: 'sem_meta', titulo: `Meta de ${mes}`, corpo: `Defina sua meta de ${mes} em 2 passos.`, url: definir }
  }

  // 7. semana (segunda)
  if (f.meta && new Date(f.hoje + 'T12:00:00Z').getUTCDay() === 1) {
    const semana = await f.semana()
    const faltam = Math.max(0, f.meta.valor - (await faturado()))
    return {
      tipo: 'semana',
      titulo: 'Sua meta do mês',
      corpo: faltam > 0
        ? `Semana passada: ${brl(semana)} · faltam ${brl(faltam)} pra ${mes}`
        : `Semana passada: ${brl(semana)} · meta de ${mes} batida`,
      url: '/admin/metas',
    }
  }
  return null
}
