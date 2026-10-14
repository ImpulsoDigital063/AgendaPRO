import type { MarcaPdf } from '@/components/admin/clientes/useFichaPdf'

/** Colunas de `businesses` que a marca do PDF da ficha usa. */
export const MARCA_COLS = 'name, phone, address, brand_primary, brand_logo_url, ficha_rodape'

export type FichaRodape = { linha?: string; nota?: string; logo?: string; cor?: string } | null

export type MarcaRow = {
  name: string | null
  phone: string | null
  address: string | null
  brand_primary: string | null
  brand_logo_url: string | null
  ficha_rodape: FichaRodape
}

/**
 * Marca do negócio no PDF/impressão da ficha. Fonte única: a ficha da cliente
 * e a prévia em Configurações → Fichas Modelo montam igual, senão a prévia
 * mostraria um cabeçalho que o documento real não tem.
 *
 * Logo/cor DO IMPRESSO vencem as da marca digital: o material de papel do
 * negócio pode usar outra versão da logo e outro tom, que é o caso da clínica
 * (painel #6B6C55, kit impresso #8A957F).
 *
 * Logo do impresso SEM cor escolhida (14/10/2026, upload pelo próprio dono):
 * a faixa nasce do fundo da logo, não da cor do painel. Logo de fundo branco
 * numa faixa dourada vira um retângulo colado — a borda da logo é a faixa que
 * o dono desenhou.
 */
export function marcaDoNegocio(biz: MarcaRow | null | undefined): MarcaPdf {
  const rodape = biz?.ficha_rodape ?? null
  const logoDoImpresso = Boolean(rodape?.logo)
  return {
    nome: biz?.name ?? null,
    logoUrl: rodape?.logo ?? biz?.brand_logo_url ?? null,
    corPrimaria: logoDoImpresso && !rodape?.cor ? null : biz?.brand_primary ?? null,
    corFaixa: rodape?.cor ?? null,
    telefone: biz?.phone ?? null,
    endereco: biz?.address ?? null,
    rodapeLinha: rodape?.linha ?? null,
    rodapeNota: rodape?.nota ?? null,
  }
}
