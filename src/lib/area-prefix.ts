/**
 * Detecta a área (admin · recepcao · profissional) a partir do pathname e
 * devolve o prefixo que componentes compartilhados devem usar pra montar links.
 *
 * Motivação: o mesmo modal/drawer roda em mais de uma área. Hardcoding
 * "/admin/clientes" quebra pra quem não é dono — cai em /cadastro.
 *
 * 30/07/2026: aconteceu de novo, agora com a profissional. Ela recebeu o
 * pagamento da comanda e a tela seguinte foi "CADASTRE SEU NEGÓCIO EM 2
 * MINUTOS", porque o push ia pra `/admin/comandas/[id]` e o layout do admin
 * manda quem não é dono pra /cadastro. O pagamento tinha gravado — o susto foi
 * de navegação, não de dado.
 *
 * ⚠️ A área `/profissional` NÃO tem as telas internas que /admin e /recepcao
 * têm (comandas, clientes, produtos, financeiro do negócio). Antes de mandar
 * alguém pra `${prefix}/algumacoisa`, confirme que a rota existe naquela área.
 * Quando não existir, fique onde está (`router.refresh()`) — use o helper
 * `areaSemTelasInternas` abaixo pra decidir.
 */
export type AreaPrefix = '/admin' | '/recepcao' | '/profissional'

export function getAreaPrefix(pathname: string | null | undefined): AreaPrefix {
  if (!pathname) return '/admin'
  if (pathname.startsWith('/recepcao')) return '/recepcao'
  if (pathname.startsWith('/profissional')) return '/profissional'
  return '/admin'
}

/** true quando a área não tem telas internas de gestão (comandas, clientes…). */
export function areaSemTelasInternas(prefix: AreaPrefix): boolean {
  return prefix === '/profissional'
}
