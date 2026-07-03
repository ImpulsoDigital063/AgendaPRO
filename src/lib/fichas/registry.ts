import type { NicheFicha } from './types'
import { CILIOS_FICHA } from './cilios'
import { ESTETICA_FACIAL_FICHA } from './estetica-facial'
import { CAPILAR_FICHA } from './capilar'

/**
 * Registro de todas as fichas de nicho. Pra adicionar um nicho novo: cria a
 * config em src/lib/fichas/<nicho>.ts e registra aqui. O componente e o fluxo
 * (picker filtrado por segmento, salvar, PDF) não mudam.
 */
export const NICHE_FICHAS: Record<string, NicheFicha> = {
  cilios: CILIOS_FICHA,
  'estetica-facial': ESTETICA_FACIAL_FICHA,
  capilar: CAPILAR_FICHA,
}
