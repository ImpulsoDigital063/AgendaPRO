/* ═══════════════════════════════════════════════════════════════
   A AÇÃO DE HOJE · UMA só, escolhida por regra simples (04/11/2026)

   Eduardo: agenda vazia e clientes sumidas viram AÇÃO, nunca meta. Uma por
   vez, com botão. Ordem:
     0. bateu a meta e o mês que vem não tem meta → "Definir a meta de <mês>"
     1. 2+ horários livres no próximo dia de trabalho → mostra os horários;
        botão "Chamar clientes" (Sumidos) se tem gente sumida, senão "Ver a
        agenda" daquele dia
     2. gente sem voltar há mais do prazo do nicho → "Ver quem sumiu"
     3. nada disso → sem botão ("agenda cheia, siga assim")
   Função pura: a página junta os dados e chama esta.
   ═══════════════════════════════════════════════════════════════ */

import type { NichoMetas } from './nichos'
import { pessoas } from './nichos'

export type AcaoDeHoje = {
  tipo: 'definir-proximo' | 'horarios-livres' | 'sumidos' | 'nenhuma'
  titulo: string
  detalhe: string
  botao: { rotulo: string; href: string } | null
}

const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

/** "amanhã" ou "sábado, 07/11" */
export function quandoDia(ymd: string, amanha: string): string {
  if (ymd === amanha) return 'amanhã'
  const dow = new Date(ymd + 'T12:00:00Z').getUTCDay()
  return `${DIAS_SEMANA[dow]}, ${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`
}

export function escolherAcao(e: {
  amanha: string
  bateu: boolean
  proximoMesSemMeta: { ym: string; nome: string } | null
  proximoDia: { ymd: string; livres: string[] } | null
  /** null = não consultado / sem acesso a Clientes */
  sumidos: number | null
  nicho: NichoMetas
}): AcaoDeHoje {
  const { nicho } = e
  if (e.bateu && e.proximoMesSemMeta) {
    return {
      tipo: 'definir-proximo',
      titulo: `Definir a meta de ${e.proximoMesSemMeta.nome}`,
      detalhe: 'leva 30 segundos',
      botao: { rotulo: 'Definir', href: `/admin/metas/definir?mes=${e.proximoMesSemMeta.ym}` },
    }
  }
  const livres = e.proximoDia?.livres ?? []
  if (e.proximoDia && livres.length >= 2) {
    const quando = quandoDia(e.proximoDia.ymd, e.amanha)
    const mostrar = livres.slice(0, 5).join(' · ') + (livres.length > 5 ? ' …' : '')
    const temQuemChamar = (e.sumidos ?? 0) > 0
    return {
      tipo: 'horarios-livres',
      titulo: `${livres.length} horários livres ${quando}`,
      detalhe: mostrar,
      botao: temQuemChamar
        ? { rotulo: nicho.botaoChamar, href: '/admin/sumidos' }
        : { rotulo: 'Ver a agenda', href: `/admin?date=${e.proximoDia.ymd}` },
    }
  }
  if ((e.sumidos ?? 0) > 0) {
    const n = e.sumidos as number
    return {
      tipo: 'sumidos',
      titulo: `${pessoas(n, nicho.pessoa)} sem voltar há mais de ${nicho.diasSumido} dias`,
      detalhe: 'uma mensagem pode trazer de volta',
      botao: { rotulo: 'Ver quem sumiu', href: '/admin/sumidos' },
    }
  }
  return {
    tipo: 'nenhuma',
    titulo: e.proximoDia ? 'Agenda cheia' : 'Nada pendente hoje',
    detalhe: 'siga assim',
    botao: null,
  }
}

/* ═══════════════════════════════════════════════════════════════
   AÇÕES DE HOJE · até 3 (05/11/2026)

   Eduardo escolheu "mais ações de hoje": horários livres, gente sumida e
   aniversariantes da semana, cada uma com botão. Só entra ação que tem dado.
   Bateu e o mês que vem não tem meta → "Definir a meta" vem primeiro.
   Nada disso → 1 linha "Agenda cheia · siga assim".
   ═══════════════════════════════════════════════════════════════ */

export type AcaoItem = {
  tipo: 'definir-proximo' | 'horarios-livres' | 'sumidos' | 'aniversario' | 'nenhuma'
  /** número grande à esquerda (null = só ícone) */
  numero: number | null
  titulo: string
  detalhe: string
  botao: { rotulo: string; href: string } | null
}

export function escolherAcoes(e: {
  amanha: string
  bateu: boolean
  proximoMesSemMeta: { ym: string; nome: string } | null
  proximoDia: { ymd: string; livres: string[] } | null
  sumidos: number | null
  /** aniversariantes nos próximos 7 dias (null = sem acesso a Clientes) */
  aniversariantes: number | null
  nicho: NichoMetas
}): AcaoItem[] {
  const { nicho } = e
  const out: AcaoItem[] = []
  if (e.bateu && e.proximoMesSemMeta) {
    out.push({
      tipo: 'definir-proximo',
      numero: null,
      titulo: `Definir a meta de ${e.proximoMesSemMeta.nome}`,
      detalhe: 'leva 30 segundos',
      botao: { rotulo: 'Definir', href: `/admin/metas/definir?mes=${e.proximoMesSemMeta.ym}` },
    })
  }
  const livres = e.proximoDia?.livres ?? []
  if (e.proximoDia && livres.length >= 2) {
    out.push({
      tipo: 'horarios-livres',
      numero: livres.length,
      titulo: `horários livres ${quandoDia(e.proximoDia.ymd, e.amanha)}`,
      detalhe: livres.slice(0, 4).join(' · ') + (livres.length > 4 ? ' …' : ''),
      botao: { rotulo: 'Ver a agenda', href: `/admin?date=${e.proximoDia.ymd}` },
    })
  }
  const n = e.sumidos ?? 0
  if (n > 0) {
    out.push({
      tipo: 'sumidos',
      numero: n,
      titulo: `${pessoas(n, nicho.pessoa).replace(/^\d+\s*/, '')} sem voltar`,
      detalhe: `há mais de ${nicho.diasSumido} dias`,
      botao: { rotulo: nicho.botaoChamar, href: '/admin/sumidos' },
    })
  }
  const a = e.aniversariantes ?? 0
  if (a > 0) {
    out.push({
      tipo: 'aniversario',
      numero: a,
      titulo: a === 1 ? 'aniversário nesta semana' : 'aniversários nesta semana',
      detalhe: 'um parabéns traz de volta',
      botao: { rotulo: 'Dar parabéns', href: '/admin/clientes/campanhas?tab=aniversariantes' },
    })
  }
  if (out.length === 0) {
    out.push({ tipo: 'nenhuma', numero: null, titulo: e.proximoDia ? 'Agenda cheia' : 'Nada pendente hoje', detalhe: 'siga assim', botao: null })
  }
  return out.slice(0, 3)
}
