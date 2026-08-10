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
  | {
      kind: 'mapping'
      title: string
      drawName: string
      params: FichaParam[]
      background?: 'blank' | 'eyes' | 'rosto' | 'corpo'
      /* Chave em businesses.ficha_imagens: se o negocio tiver um diagrama
         proprio cadastrado nessa chave, ele vira o fundo e vence o desenho
         embutido. A funcionalidade e do sistema; a arte e de quem comprou. */
      imagemChave?: string
    }
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
   *  businesses.category, com fallback em description). Vazio/ausente =
   *  aparece em todos. */
  segments?: string[]
  /**
   * EXCLUSIVIDADE POR NEGÓCIO. Lista de slugs onde esta ficha aparece — e
   * SOMENTE neles. Ausente = vale a regra de segmento acima.
   *
   * Existe porque cliente pede mudança no padrão DELE, não no do sistema
   * (regra cravada por Eduardo em 09/08/2026). Sem isso, ajustar a ficha de
   * uma clínica ajustava a de todas as clínicas.
   *
   * A variante do cliente vive como ARQUIVO DE CÓDIGO, não como JSON no
   * banco: assim ela é versionada, revisável e comentada igual ao resto. E
   * quando a gente concluir que uma mudança serve pra todo mundo, o caminho é
   * levar a mudança pra ficha base e apagar a variante — não manter duas
   * verdades.
   */
  businessSlugs?: string[]
  sections: FichaSection[]
}
