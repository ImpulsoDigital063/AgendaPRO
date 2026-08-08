/**
 * Fichas dedicadas por nicho (cílios · barbearia · nail · estética…).
 *
 * Arquitetura "layout fixo, conteúdo editável": a ESTRUTURA (ordem das seções,
 * o visual de página) é cravada no componente da ficha — é o que dá o look de
 * papel que o form-builder genérico não faz. O CONTEÚDO (perguntas de saúde,
 * opções de técnica, texto do termo) vem desta config, e por nicho — e no
 * futuro pode ser sobrescrito por negócio sem quebrar o layout.
 *
 * Cada nicho é uma instância de NicheFicha. Cílios é a primeira (ver cilios.ts).
 */

export type FichaParam = {
  name: string
  label: string
  type: 'select' | 'text' | 'textarea'
  options?: string[]
}

export type FichaSection =
  // Bloco de saúde em grade compacta (2 colunas · marcar o que se aplica)
  | { kind: 'health'; title: string; items: string[]; detailLabel?: string }
  // Mapeamento: 2 olhos pra desenhar + parâmetros ao lado
  /* `background` escolhe o desenho de fundo do mapeamento. Sem ele, TODA ficha
     herdava os dois olhos do design de cilios — e a ficha de toxina abria com
     desenho de extensao de cilios na frente da clinica (visto em 08/08). */
  | { kind: 'mapping'; title: string; drawName: string; params: FichaParam[]; background?: 'blank' | 'eyes' | 'rosto' }
  // Campos livres extras (ex.: cola/lote, observações)
  | { kind: 'fields'; title: string; fields: FichaParam[] }
  // Termo de responsabilidade + aceites (checkbox)
  | { kind: 'term'; title: string; text: string; consents: { name: string; label: string; required?: boolean }[] }
  // Assinatura (desenho)
  | { kind: 'signature'; name: string; label: string }

export type NicheFicha = {
  slug: string
  name: string
  /** Categorias de negócio onde a ficha aparece (match case-insensitive contra
   *  businesses.description). Vazio/ausente = aparece em todos. */
  segments?: string[]
  sections: FichaSection[]
}
