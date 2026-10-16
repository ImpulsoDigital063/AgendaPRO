import type { FichaSection, NicheFicha } from './types'

/**
 * Onde cada seção de saúde ('health') guarda o "detalhe os itens marcados".
 *
 * Até 15/10/2026 TODAS gravavam em 'saude_detalhe': no Histórico Clínico (3
 * seções) e no Bioestimulador (3), o que a profissional escrevia num campo
 * aparecia nos outros e o último sobrescrevia os demais (achado na
 * auditoria visual das fichas). A 1ª seção continua em 'saude_detalhe' —
 * ficha antiga e ficha de uma seção só não mudam nada.
 */
export function chaveDetalheSaude(ficha: NicheFicha, section: FichaSection): string {
  let n = 0
  for (const s of ficha.sections) {
    if (s === section) return n === 0 ? 'saude_detalhe' : `saude_detalhe_${n + 1}`
    if (s.kind === 'health') n++
  }
  return 'saude_detalhe'
}
