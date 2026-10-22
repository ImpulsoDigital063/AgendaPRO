import type { AreaGerente } from '@/lib/permissoes-gerente'
import type { Grupo } from './catalogo'

/** Área do gerente que cada grupo de pergunta revela (v156). Agenda é de todos. */
export const AREA_DO_GRUPO: Record<Grupo, AreaGerente | null> = {
  faturamento: 'financeiro',
  despesas: 'financeiro',
  equipe: 'equipe',
  clientes: 'clientes',
  agenda: null,
}
