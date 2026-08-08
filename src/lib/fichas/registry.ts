import type { NicheFicha } from './types'
import { CILIOS_FICHA } from './cilios'
import { ESTETICA_FACIAL_FICHA } from './estetica-facial'
import { CAPILAR_FICHA } from './capilar'
import { HISTORICO_CLINICO_FICHA } from './historico-clinico'
import { TOXINA_BOTULINICA_FICHA } from './toxina-botulinica'
import { PREENCHIMENTO_FACIAL_FICHA } from './preenchimento-facial'
import { BIOESTIMULADOR_COLAGENO_FICHA } from './bioestimulador-colageno'
import { FIOS_PDO_FICHA } from './fios-pdo'
import { LOBULOPLASTIA_FICHA } from './lobuloplastia'

/**
 * Registro de todas as fichas de nicho. Pra adicionar um nicho novo: cria a
 * config em src/lib/fichas/<nicho>.ts e registra aqui. O componente e o fluxo
 * (picker filtrado por segmento, salvar, PDF) não mudam.
 */
export const NICHE_FICHAS: Record<string, NicheFicha> = {
  cilios: CILIOS_FICHA,
  'estetica-facial': ESTETICA_FACIAL_FICHA,
  capilar: CAPILAR_FICHA,
  /* Pacote de clinica de estetica (08/08). Escrito generico a partir das
     fichas de papel da Dra Elaine Rebolo: serve qualquer clinica, e a marca
     de cada uma entra pelo PDF, que ja e por negocio. */
  'historico-clinico': HISTORICO_CLINICO_FICHA,
  'toxina-botulinica': TOXINA_BOTULINICA_FICHA,
  'preenchimento-facial': PREENCHIMENTO_FACIAL_FICHA,
  'bioestimulador-colageno': BIOESTIMULADOR_COLAGENO_FICHA,
  'fios-pdo': FIOS_PDO_FICHA,
  lobuloplastia: LOBULOPLASTIA_FICHA,
}
